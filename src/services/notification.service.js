/**
 * Notification Service — QAssure Platform
 * 
 * Key behaviours:
 *  - sendFromTemplate()  : primary method used everywhere
 *  - Email delivery       : if user prefs allow + template has email channel
 *  - Template fallback    : tenant template → global template → alert super admin
 *  - module_id tracking   : stored in notifications row (from template)
 *  - created_by tracking  : who triggered the notification (optional)
 */

const { pool } = require('../config/database');
const { getSocketService } = require('../infrastructure/websocket');
const { getEmailService } = require('../infrastructure/email/email.service');

class NotificationService {
  constructor() {
    this.pool = pool;
  }

  // ============================================================================
  // PRIMARY: SEND FROM TEMPLATE
  // ============================================================================

  /**
   * Resolve template → render → send in-app + email (if enabled)
   *
   * @param {string}  tenantId      - Tenant context
   * @param {string}  userId        - Recipient user ID
   * @param {string}  templateCode  - e.g. 'workflow_task_assigned'
   * @param {object}  variables     - Template variables  e.g. { task_name: 'Review' }
   * @param {object}  options        - { createdBy, entityType, entityId, entityName, actionUrl }
   */
  async sendFromTemplate(tenantId, userId, templateCode, variables = {}, options = {}) {
    // 1. Resolve template (tenant override → global)
    const template = await this.getTemplateByCode(templateCode, tenantId);

    if (!template) {
      // Alert super admins that this template is missing
      await this._alertMissingTemplate(templateCode, tenantId);
      console.warn(`[Notification] Template not found: ${templateCode}. Super admins alerted.`);
      return null;
    }

    // 2. Render content
    const title   = this._renderTemplate(template.title_template,   variables);
    const message = this._renderTemplate(template.message_template,  variables);

    // 3. Determine channels
    const channels = Array.isArray(template.channels) ? template.channels : ['in_app'];

    // 4. Send in-app
    const notification = await this._sendInApp(tenantId, userId, {
      title,
      message,
      notification_type: template.default_priority === 'urgent' ? 'alert' : 'info',
      category:          template.category,
      priority:          template.default_priority || 'normal',
      entity_type:       options.entityType   || variables.entity_type,
      entity_id:         options.entityId     || variables.entity_id,
      entity_name:       options.entityName   || variables.entity_name,
      action_url:        options.actionUrl    || variables.action_url,
      channels_sent:     channels,
      module_id:         template.module_id   || null,
      created_by:        options.createdBy    || null,
      template_id:       template.id
    });

    // 5. Send email (if channel enabled AND user prefs allow)
    if (channels.includes('email') && template.email_subject_template) {
      await this._sendEmailIfAllowed(tenantId, userId, template, variables, options, notification ? notification.id : null);
    }

    return notification;
  }

  /**
   * Send to multiple users from a template
   */
  async sendFromTemplateToMany(tenantId, userIds, templateCode, variables = {}, options = {}) {
    const results = [];
    for (const userId of userIds) {
      const n = await this.sendFromTemplate(tenantId, userId, templateCode, variables, options);
      results.push(n);
    }
    return results;
  }

  /**
   * Send to all users who have a specific role, from a template
   */
  async sendFromTemplateByRole(tenantId, role, templateCode, variables = {}, options = {}) {
    const users = await this.pool.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles      r  ON ur.role_id = r.id
       JOIN user_tenants ut ON ut.user_id = u.id
       WHERE LOWER(r.code) = LOWER($1) AND ut.tenant_id = $2
         AND LOWER(ut.status) = 'active' AND u.status = 'active'`,
      [role, tenantId]
    );
    console.log(`[NotificationService] Found ${users.rows.length} users with role: ${role}`);
    return this.sendFromTemplateToMany(tenantId, users.rows.map(u => u.id), templateCode, variables, options);
  }

  // ============================================================================
  // LEGACY / INTERNAL: raw send (still used for system-level events)
  // ============================================================================

  async send(tenantId, userId, data) {
    if (!data.category) {
      throw new Error('Category is required for notifications');
    }

    // Resolve category and module_id once per batch
    if (!data._category_resolved) {
      const { getNotificationCategoryService } = require('./notification_category.service');
      const categoryService = getNotificationCategoryService();
      const categoryResult = await categoryService.getCategoryByCode(data.category);
      
      if (!categoryResult) {
        throw new Error(`Invalid category: '${data.category}' does not exist`);
      }
      
      if (categoryResult.module_id && !data.module_id) {
        data.module_id = categoryResult.module_id;
      }
      data._category_resolved = true;
    }

    const notification = await this._sendInApp(tenantId, userId, data);

    const channels = Array.isArray(data.channels) ? data.channels : (Array.isArray(data.channels_sent) ? data.channels_sent : ['in_app']);

    if (channels.includes('email') && data.email_subject) {
      await this._sendManualEmailIfAllowed(tenantId, userId, data, notification ? notification.id : null);
    }

    return notification;
  }

  async sendToMultiple(tenantId, userIds, data) {
    const results = [];
    for (const uid of userIds) {
      const n = await this.send(tenantId, uid, data);
      results.push(n);
    }
    return results;
  }

  async sendByRole(tenantId, role, data) {
    const users = await this.pool.query(
      `SELECT DISTINCT u.id FROM users u
       JOIN user_roles ur ON u.id = ur.user_id
       JOIN roles      r  ON ur.role_id = r.id
       JOIN user_tenants ut ON ut.user_id = u.id
       WHERE LOWER(r.code) = LOWER($1) AND ut.tenant_id = $2
         AND LOWER(ut.status) = 'active' AND u.status = 'active'`,
      [role, tenantId]
    );
    return this.sendToMultiple(tenantId, users.rows.map(u => u.id), data);
  }

  // ============================================================================
  // USER NOTIFICATIONS
  // ============================================================================

  async getForUser(userId, tenantId, options = {}) {
    const { is_read, category, limit = 50, offset = 0, isSuperAdmin = false } = options;
    let query = `
      SELECT * FROM notifications
      WHERE user_id = $1
        AND (expires_at IS NULL OR expires_at > NOW())
        AND is_dismissed = FALSE
    `;
    const params = [userId];

    if (!isSuperAdmin) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }

    if (is_read !== undefined) {
      params.push(is_read);
      query += ` AND is_read = $${params.length}`;
    }
    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  async getUnreadCount(userId, tenantId, options = {}) {
    const isSuperAdmin = options.isSuperAdmin || false;
    let query = `
      SELECT COUNT(*) AS count FROM notifications
      WHERE user_id = $1 AND is_read = FALSE
        AND is_dismissed = FALSE AND (expires_at IS NULL OR expires_at > NOW())
    `;
    const params = [userId];

    if (!isSuperAdmin) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }

    const result = await this.pool.query(query, params);
    return parseInt(result.rows[0].count) || 0;
  }

  async markAsRead(id, userId) {
    const result = await this.pool.query(
      `UPDATE notifications SET is_read = TRUE, read_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return result.rows[0];
  }

  async markAllAsRead(userId, tenantId, options = {}) {
    const isSuperAdmin = options.isSuperAdmin || false;
    let query = `
      UPDATE notifications SET is_read = TRUE, read_at = NOW()
      WHERE user_id = $1 AND is_read = FALSE
    `;
    const params = [userId];

    if (!isSuperAdmin) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }

    query += ` RETURNING id`;
    const result = await this.pool.query(query, params);
    return result.rowCount;
  }

  async dismiss(id, userId) {
    const result = await this.pool.query(
      `UPDATE notifications SET is_dismissed = TRUE, dismissed_at = NOW()
       WHERE id = $1 AND user_id = $2 RETURNING *`,
      [id, userId]
    );
    return result.rows[0];
  }

  async dismissAll(userId, tenantId, options = {}) {
    const isSuperAdmin = options.isSuperAdmin || false;
    let query = `
      UPDATE notifications SET is_dismissed = TRUE, dismissed_at = NOW()
      WHERE user_id = $1 AND is_dismissed = FALSE
    `;
    const params = [userId];

    if (!isSuperAdmin) {
      query += ` AND tenant_id = $2`;
      params.push(tenantId);
    }

    query += ` RETURNING id`;
    const result = await this.pool.query(query, params);
    return result.rowCount;
  }

  // ============================================================================
  // USER PREFERENCES
  // ============================================================================

  async getPreferences(userId, tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );

    if (result.rows[0]) return this._formatPreferences(result.rows[0]);

    const newPrefs = await this.pool.query(
      `INSERT INTO notification_preferences (user_id, tenant_id) VALUES ($1, $2) RETURNING *`,
      [userId, tenantId]
    );
    return this._formatPreferences(newPrefs.rows[0]);
  }

  async updatePreferences(userId, tenantId, data) {
    const setClauses = [];
    const params = [userId, tenantId];
    let idx = 3;

    const allowed = [
      'in_app_enabled', 'email_enabled', 'email_digest',
      'category_preferences', 'quiet_hours_enabled',
      'quiet_hours_start', 'quiet_hours_end', 'timezone'
    ];

    for (const field of allowed) {
      if (data[field] !== undefined) {
        const value = field === 'category_preferences' ? JSON.stringify(data[field]) : data[field];
        setClauses.push(`${field} = $${idx++}`);
        params.push(value);
      }
    }

    setClauses.push('updated_at = NOW()');
    if (setClauses.length === 1) return this.getPreferences(userId, tenantId);

    await this.pool.query(
      `INSERT INTO notification_preferences (user_id, tenant_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, tenant_id) DO UPDATE SET ${setClauses.join(', ')}`,
      params
    );
    return this.getPreferences(userId, tenantId);
  }

  /**
   * Sync user's notification preferences with their current module assignments.
   * Ensures categories for assigned modules are present in category_preferences.
   */
  async syncUserPreferencesWithModules(userId, tenantId) {
    // 1. Determine if user is admin (who sees all tenant modules)
    const userRoles = await this.pool.query(`
      SELECT r.code FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    `, [userId, tenantId]);

    const isAdmin = userRoles.rows.some(r => r.code === 'tenant_admin' || r.code === 'super_admin');

    let query;
    const params = [tenantId];

    if (isAdmin) {
      query = `
        SELECT nc.code FROM notification_categories nc
        WHERE nc.is_active = TRUE
          AND (nc.module_id IS NULL OR nc.module_id IN (
            SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND is_active = TRUE
          ))
      `;
    } else {
      params.push(userId);
      query = `
        SELECT DISTINCT nc.code
        FROM notification_categories nc
        JOIN user_roles ur ON (ur.module_id = nc.module_id OR nc.module_id IS NULL)
        WHERE nc.is_active = TRUE
          AND ur.user_id = $2
          AND (ur.tenant_id = $1 OR ur.tenant_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND (nc.module_id IS NULL OR nc.module_id IN (
            SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND is_active = TRUE
          ))
      `;
    }

    const catResult = await this.pool.query(query, params);
    const requiredCategories = catResult.rows.map(r => r.code);
    if (!requiredCategories.length) return;

    // 2. Get existing preferences
    const prefs = await this.getPreferences(userId, tenantId);
    const categoryPrefs = prefs.category_preferences || {};
    let changed = false;

    // 3. Add missing categories with default true/true
    for (const code of requiredCategories) {
      if (!categoryPrefs[code]) {
        categoryPrefs[code] = { in_app: true, email: true };
        changed = true;
      }
    }

    if (changed) {
      await this.updatePreferences(userId, tenantId, { category_preferences: categoryPrefs });
    }
  }

  // ============================================================================
  // TEMPLATES
  // ============================================================================

  async getTemplates(tenantId, { limit = 50, offset = 0, module_id = null } = {}) {
    let where = '(nt.tenant_id IS NULL OR nt.tenant_id = $1)';
    const params = [tenantId];

    if (module_id) {
      params.push(module_id);
      where += ` AND nt.module_id = $${params.length}`;
    }

    // Total count
    const countResult = await this.pool.query(`
      SELECT COUNT(*) FROM notification_templates nt
      WHERE ${where}
    `, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await this.pool.query(`
      SELECT nt.*,
             nc.name  AS category_name,
             m.name   AS module_name,
             CASE WHEN nt.tenant_id IS NULL THEN 'global' ELSE 'tenant' END AS template_source,
             COALESCE(nco.variables, '[]'::jsonb) AS variables
      FROM notification_templates nt
      LEFT JOIN notification_categories nc ON nc.code = nt.category
      LEFT JOIN modules m ON m.id = nt.module_id
      LEFT JOIN notification_codes nco ON nco.code = nt.code
      WHERE ${where}
      ORDER BY nt.category, nt.code, nt.tenant_id NULLS FIRST
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return {
      data: result.rows,
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) }
    };
  }

  async getTemplatesForSuperAdmin({ limit = 10, offset = 0, search = '', module_id = null } = {}) {
    let where = 'WHERE nt.tenant_id IS NULL';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (nt.name ILIKE $${params.length} OR nt.code ILIKE $${params.length})`;
    }

    if (module_id) {
      params.push(module_id);
      where += ` AND nt.module_id = $${params.length}`;
    }

    const countResult = await this.pool.query(`
      SELECT COUNT(*) FROM notification_templates nt ${where}
    `, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit);
    params.push(offset);
    const result = await this.pool.query(`
      SELECT nt.*,
             nc.name  AS category_name,
             m.name   AS module_name,
             COALESCE(nco.variables, '[]'::jsonb) AS variables
      FROM notification_templates nt
      LEFT JOIN notification_categories nc ON nc.code = nt.category
      LEFT JOIN modules m ON m.id = nt.module_id
      LEFT JOIN notification_codes nco ON nco.code = nt.code
      ${where}
      ORDER BY nt.category, nt.code
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return {
      data: result.rows,
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) }
    };
  }

  /**
   * Tenant admin editing a template:
   *   - if a tenant-specific record exists → update it
   *   - if only global exists → create a new tenant-specific copy (override)
   */
  async upsertTenantTemplate(tenantId, code, data, updatedBy) {
    // Check if tenant-specific version exists
    const existing = await this.pool.query(
      'SELECT * FROM notification_templates WHERE code = $1 AND tenant_id = $2',
      [code, tenantId]
    );

    if (existing.rows.length > 0) {
      // UPDATE existing tenant override
      const id = existing.rows[0].id;
      const result = await this.pool.query(`
        UPDATE notification_templates
        SET  title_template         = COALESCE($1, title_template),
             message_template       = COALESCE($2, message_template),
             email_subject_template = COALESCE($3, email_subject_template),
             email_body_template    = COALESCE($4, email_body_template),
             default_priority       = COALESCE($5, default_priority),
             channels               = COALESCE($6, channels),
             is_active              = COALESCE($7, is_active),
             updated_at             = NOW(),
             updated_by             = $8
        WHERE id = $9
        RETURNING *
      `, [
        data.title_template, data.message_template,
        data.email_subject_template, data.email_body_template,
        data.default_priority, data.channels,
        data.is_active, updatedBy, id
      ]);
      return result.rows[0];
    } else {
      // CREATE tenant override by copying the global and applying changes
      const global = await this.pool.query(
        'SELECT * FROM notification_templates WHERE code = $1 AND tenant_id IS NULL',
        [code]
      );
      
      if (global.rows.length === 0) {
        throw new Error(`Cannot create override: Global template for code '${code}' does not exist. Tenant admins can only customize existing system notifications.`);
      }

      const base = global.rows[0];

      const result = await this.pool.query(`
        INSERT INTO notification_templates
          (tenant_id, code, name, description, category, module_id,
           title_template, message_template,
           email_subject_template, email_body_template,
           default_priority, channels, is_active, created_at, updated_at, updated_by)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW(), $14)
        RETURNING *
      `, [
        tenantId,
        code,
        data.name              || base.name,
        data.description       || base.description,
        data.category          || base.category,
        base.module_id,
        data.title_template    || base.title_template,
        data.message_template  || base.message_template,
        data.email_subject_template !== undefined ? data.email_subject_template : base.email_subject_template,
        data.email_body_template    !== undefined ? data.email_body_template    : base.email_body_template,
        data.default_priority  || base.default_priority || 'normal',
        data.channels          || base.channels || ['in_app', 'email'],
        data.is_active !== undefined ? data.is_active : true,
        updatedBy
      ]);
      return result.rows[0];
    }
  }

  /**
   * Reset a tenant's template override — deletes the tenant-specific record
   * so the global default is used again.
   */
  async resetTenantTemplate(tenantId, code) {
    const result = await this.pool.query(
      'DELETE FROM notification_templates WHERE code = $1 AND tenant_id = $2 RETURNING id',
      [code, tenantId]
    );
    if (!result.rowCount) throw new Error('No tenant override found for this template');
    return { success: true, message: 'Template reset to global default' };
  }

  async createTemplate(tenantId, data) {
    // 1. Validate category exists in master data
    const categoryResult = await this.pool.query(
      'SELECT id, module_id FROM notification_categories WHERE code = $1', [data.category]
    );
    if (categoryResult.rows.length === 0) {
      throw new Error(`Category '${data.category}' does not exist in master data. Please create the category first.`);
    }
    const category = categoryResult.rows[0];

    // 2. Validate event code exists in master notification_codes
    const codeResult = await this.pool.query(
      'SELECT id FROM notification_codes WHERE code = $1', [data.code]
    );
    if (codeResult.rows.length === 0) {
      throw new Error(`Event code '${data.code}' does not exist in master notification codes. Please define the code first.`);
    }

    // 3. For tenant admins, ensure they are only creating an override for an existing global template
    if (tenantId) {
      const globalExists = await this.pool.query(
        'SELECT id FROM notification_templates WHERE code = $1 AND tenant_id IS NULL',
        [data.code]
      );
      if (globalExists.rows.length === 0) {
        throw new Error(`Tenant admins can only create templates for existing global system notifications.`);
      }
    }

    // Resolve module_id
    const moduleId = data.module_id || category.module_id || null;

    const result = await this.pool.query(`
      INSERT INTO notification_templates
        (tenant_id, code, name, description, title_template, message_template,
         email_subject_template, email_body_template, category, module_id,
         default_priority, channels, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
      RETURNING *
    `, [
      tenantId, data.code, data.name, data.description,
      data.title_template, data.message_template,
      data.email_subject_template, data.email_body_template,
      data.category, moduleId,
      data.default_priority || 'normal',
      data.channels || ['in_app', 'email']
    ]);
    return result.rows[0];
  }

  async updateGlobalTemplate(id, data) {
    // 1. Resolve moduleId
    const categoryResult = await this.pool.query(
      'SELECT module_id FROM notification_categories WHERE code = $1', [data.category]
    );
    const categoryModuleId = categoryResult.rows[0]?.module_id || null;
    const moduleId = data.module_id || categoryModuleId;

    const result = await this.pool.query(`
      UPDATE notification_templates
      SET name = COALESCE($1, name),
          description = $2,
          title_template = COALESCE($3, title_template),
          message_template = COALESCE($4, message_template),
          email_subject_template = $5,
          email_body_template = $6,
          category = COALESCE($7, category),
          module_id = $8,
          default_priority = COALESCE($9, default_priority),
          channels = COALESCE($10, channels),
          is_active = COALESCE($11, is_active),
          updated_at = NOW()
      WHERE id = $12 AND tenant_id IS NULL
      RETURNING *
    `, [
      data.name, data.description,
      data.title_template, data.message_template,
      data.email_subject_template, data.email_body_template,
      data.category, moduleId,
      data.default_priority, data.channels,
      data.is_active, id
    ]);
    
    if (result.rows.length === 0) {
      throw new Error('Template not found or is not a global template');
    }
    return result.rows[0];
  }

  /**
   * Template resolution: tenant-specific → global (tenant_id IS NULL)
   */
  async getTemplateByCode(code, tenantId = null) {
    const result = await this.pool.query(`
      SELECT nt.*, m.id AS resolved_module_id
      FROM notification_templates nt
      LEFT JOIN notification_categories nc ON nc.code = nt.category
      LEFT JOIN modules m ON m.id = COALESCE(nt.module_id, nc.module_id)
      WHERE nt.code = $1
        AND (nt.tenant_id IS NULL OR nt.tenant_id = $2)
        AND nt.is_active = TRUE
      ORDER BY nt.tenant_id NULLS LAST
      LIMIT 1
    `, [code, tenantId]);
    return result.rows[0] || null;
  }

  // ============================================================================
  // ALERT RULES
  // ============================================================================

  async getAlertRules(tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM alert_rules WHERE tenant_id = $1 ORDER BY created_at',
      [tenantId]
    );
    return result.rows.map(r => this._formatAlertRule(r));
  }

  async createAlertRule(tenantId, data) {
    const result = await this.pool.query(`
      INSERT INTO alert_rules
        (tenant_id, name, description, trigger_event, trigger_conditions,
         notification_template_id, notify_roles, notify_user_ids, notify_owner, channels)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      tenantId, data.name, data.description, data.trigger_event,
      JSON.stringify(data.trigger_conditions || {}), data.notification_template_id,
      data.notify_roles, data.notify_user_ids, data.notify_owner !== false,
      data.channels || ['in_app']
    ]);
    return this._formatAlertRule(result.rows[0]);
  }

  async processAlertTrigger(tenantId, eventType, eventData) {
    const rules = await this.pool.query(
      'SELECT * FROM alert_rules WHERE tenant_id = $1 AND trigger_event = $2 AND is_active = TRUE',
      [tenantId, eventType]
    );
    for (const rule of rules.rows) {
      if (this._matchesConditions(rule.trigger_conditions, eventData)) {
        await this._executeAlertRule(tenantId, rule, eventData);
      }
    }
  }

  async _executeAlertRule(tenantId, rule, eventData) {
    const usersToNotify = new Set();

    if (rule.notify_owner && eventData.owner_id) usersToNotify.add(eventData.owner_id);

    if (rule.notify_roles?.length > 0) {
      for (const role of rule.notify_roles) {
        const users = await this.pool.query(
          `SELECT DISTINCT u.id FROM users u
           JOIN user_roles ur ON u.id = ur.user_id
           JOIN roles r ON ur.role_id = r.id
           JOIN user_tenants ut ON ut.user_id = u.id
           WHERE r.code = $1 AND ut.tenant_id = $2
             AND LOWER(ut.status) = 'active' AND u.status = 'active'`,
          [role, tenantId]
        );
        users.rows.forEach(u => usersToNotify.add(u.id));
      }
    }

    if (rule.notify_user_ids?.length > 0) {
      rule.notify_user_ids.forEach(id => usersToNotify.add(id));
    }

    // Get template code from template
    let templateCode = null;
    if (rule.notification_template_id) {
      const tmpl = await this.pool.query(
        'SELECT code FROM notification_templates WHERE id = $1', [rule.notification_template_id]
      );
      templateCode = tmpl.rows[0]?.code;
    }

    for (const userId of usersToNotify) {
      if (templateCode) {
        await this.sendFromTemplate(tenantId, userId, templateCode, eventData);
      } else {
        await this.send(tenantId, userId, {
          title: rule.name,
          message: `Alert triggered: ${rule.name}`,
          notification_type: 'alert',
          category: eventData.category || 'system',
          priority: 'high',
          entity_type: eventData.entity_type,
          entity_id: eventData.entity_id,
          entity_name: eventData.entity_name,
          action_url: eventData.action_url,
          channels: rule.channels
        });
      }
    }
  }

  // ============================================================================
  // ESCALATION
  // ============================================================================

  async getEscalationRules(tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM escalation_rules WHERE tenant_id = $1 ORDER BY entity_type, condition_value',
      [tenantId]
    );
    return result.rows;
  }

  async createEscalationRule(tenantId, data) {
    const result = await this.pool.query(`
      INSERT INTO escalation_rules
        (tenant_id, name, description, entity_type, condition_type, condition_value,
         escalate_to_role, escalate_to_user_id, notification_template_id, check_interval_hours)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `, [
      tenantId, data.name, data.description, data.entity_type, data.condition_type,
      data.condition_value, data.escalate_to_role, data.escalate_to_user_id,
      data.notification_template_id, data.check_interval_hours || 24
    ]);
    return result.rows[0];
  }

  async processEscalations(tenantId) {
    console.log('[Notification] Processing escalations...');
    const rules = await this.pool.query(`
      SELECT * FROM escalation_rules
      WHERE tenant_id = $1 AND is_active = TRUE
        AND (last_checked_at IS NULL OR last_checked_at < NOW() - (check_interval_hours || ' hours')::interval)
    `, [tenantId]);

    for (const rule of rules.rows) {
      await this._processEscalationRule(tenantId, rule);
    }
  }

  async _processEscalationRule(tenantId, rule) {
    let query;
    const params = [tenantId, rule.condition_value];

    switch (rule.entity_type) {
      case 'capa':
        query = `SELECT id, capa_number AS entity_name, owner_id
                 FROM capas WHERE tenant_id = $1
                 AND status NOT IN ('closed','cancelled')
                 AND target_date < NOW() - ($2 || ' days')::interval`;
        break;
      case 'training':
        query = `SELECT ta.id, tc.title AS entity_name, ta.user_id AS owner_id
                 FROM training_assignments ta
                 JOIN training_courses tc ON ta.course_id = tc.id
                 WHERE ta.tenant_id = $1
                   AND ta.status NOT IN ('completed','cancelled')
                   AND ta.due_date < NOW() - ($2 || ' days')::interval`;
        break;
      case 'workflow_task':
        query = `SELECT wt.id, ws.name AS entity_name, wt.assigned_to AS owner_id
                 FROM workflow_tasks wt
                 JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
                 WHERE wt.tenant_id = $1
                   AND wt.status = 'pending'
                   AND wt.due_at < NOW() - ($2 || ' days')::interval`;
        break;
      default:
        return;
    }

    const items = await this.pool.query(query, params);

    for (const item of items.rows) {
      const existing = await this.pool.query(
        `SELECT id FROM escalation_history
         WHERE escalation_rule_id = $1 AND entity_id = $2
           AND created_at > NOW() - INTERVAL '24 hours'`,
        [rule.id, item.id]
      );
      if (existing.rows.length > 0) continue;

      let targetUserId = rule.escalate_to_user_id;
      if (!targetUserId && rule.escalate_to_role) {
        const users = await this.pool.query(
          `SELECT u.id FROM users u
           JOIN user_roles ur ON u.id = ur.user_id
           JOIN roles r ON ur.role_id = r.id
           WHERE r.code = $1 AND ur.tenant_id = $2 LIMIT 1`,
          [rule.escalate_to_role, tenantId]
        );
        if (users.rows.length > 0) targetUserId = users.rows[0].id;
      }

      if (!targetUserId) continue;

      // Use template if set
      let notification;
      if (rule.notification_template_id) {
        const tmpl = await this.pool.query(
          'SELECT code FROM notification_templates WHERE id = $1', [rule.notification_template_id]
        );
        if (tmpl.rows[0]) {
          notification = await this.sendFromTemplate(tenantId, targetUserId, tmpl.rows[0].code, {
            entity_name: item.entity_name, entity_type: rule.entity_type,
            entity_id: item.id, days: rule.condition_value
          }, { entityType: rule.entity_type, entityId: item.id, entityName: item.entity_name });
        }
      }

      if (!notification) {
        notification = await this.send(tenantId, targetUserId, {
          title: `Escalation: ${rule.name}`,
          message: `${item.entity_name} has been escalated to you`,
          notification_type: 'escalation',
          category: rule.entity_type,
          priority: 'urgent',
          entity_type: rule.entity_type,
          entity_id: item.id,
          entity_name: item.entity_name
        });
      }

      if (notification) {
        await this.pool.query(`
          INSERT INTO escalation_history
            (tenant_id, escalation_rule_id, entity_type, entity_id, entity_name,
             escalated_to_user_id, escalated_to_role, notification_id, reason)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `, [
          tenantId, rule.id, rule.entity_type, item.id, item.entity_name,
          targetUserId, rule.escalate_to_role, notification.id,
          `${rule.condition_type}: ${rule.condition_value} days`
        ]);
      }
    }

    await this.pool.query(
      'UPDATE escalation_rules SET last_checked_at = NOW() WHERE id = $1', [rule.id]
    );
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /** Write notification row + push WebSocket */
  async _sendInApp(tenantId, userId, data) {
    const prefs = await this._getPrefs(userId, tenantId);

    if (prefs && prefs.in_app_enabled === false) return null;

    // Category preference check
    if (prefs && data.category && prefs.category_preferences) {
      const catPref = prefs.category_preferences[data.category];
      if (catPref && catPref.in_app === false) return null;
    }

    // Quiet hours check
    if (!this._isAllowedByQuietHours(prefs, data.priority)) return null;

    const result = await this.pool.query(`
      INSERT INTO notifications
        (tenant_id, user_id, title, message, notification_type, category,
         priority, entity_type, entity_id, entity_name, action_url,
         channels_sent, expires_at, module_id, created_by, template_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      RETURNING *
    `, [
      tenantId, userId, data.title, data.message,
      data.notification_type || 'info', data.category,
      data.priority || 'normal', data.entity_type, data.entity_id,
      data.entity_name, data.action_url,
      JSON.stringify(data.channels_sent || data.channels || ['in_app']),
      data.expires_at,
      data.module_id  || null,
      data.created_by || null,
      data.template_id|| null
    ]);

    const notification = result.rows[0];
    console.log(`[Notification] In-app sent to user ${userId}: ${data.title}`);

    const socketService = getSocketService();
    socketService.pushNotification(userId, notification);
    socketService.pushUnreadCount(userId, tenantId);

    return notification;
  }

  /** Send email if user preferences + global flag allow */
  async _sendEmailIfAllowed(tenantId, userId, template, variables, options = {}, notificationId = null) {
    let email = null;
    let subject = null;
    let body = null;

    try {
      const prefs = await this._getPrefs(userId, tenantId);

      // Global email switch
      if (prefs && prefs.email_enabled === false) return;

      // Category-level email toggle
      if (prefs && template.category && prefs.category_preferences) {
        const catPref = prefs.category_preferences[template.category];
        if (catPref && catPref.email === false) return;
      }

      // Fetch user email
      const userRes = await this.pool.query(
        'SELECT email, first_name FROM users WHERE id = $1', [userId]
      );
      if (!userRes.rows.length) return;
      email = userRes.rows[0].email;
      const first_name = userRes.rows[0].first_name;

      subject = this._renderTemplate(template.email_subject_template, { ...variables, user_name: first_name });
      body    = this._renderTemplate(
        template.email_body_template || `<p>${template.message_template}</p>`,
        { ...variables, user_name: first_name },
        true
      );

      const emailService = getEmailService();
      await emailService.send(email, subject, body, null, tenantId, { userId, notificationId });
      console.log(`[Notification] Email sent to ${email}: ${subject}`);
    } catch (err) {
      console.warn(`[Notification] Email send failed for user ${userId}:`, err.message);
    }
  }

  /** Handle manual emails without a template */
  async _sendManualEmailIfAllowed(tenantId, userId, data, notificationId = null) {
    let email = null;
    let subject = null;
    let body = null;

    try {
      const prefs = await this._getPrefs(userId, tenantId);

      // Global email switch
      if (prefs && prefs.email_enabled === false) return;

      // Category-level email toggle
      if (prefs && data.category && prefs.category_preferences) {
        const catPref = prefs.category_preferences[data.category];
        if (catPref && catPref.email === false) return;
      }

      // Fetch user email
      const userRes = await this.pool.query(
        'SELECT email, first_name FROM users WHERE id = $1', [userId]
      );
      if (!userRes.rows.length) return;
      email = userRes.rows[0].email;

      subject = data.email_subject;
      body    = data.email_body || `<p>${data.message || ''}</p>`;

      const emailService = getEmailService();
      await emailService.send(email, subject, body, null, tenantId, { userId, notificationId });
      console.log(`[Notification] Manual Email sent to ${email}: ${subject}`);
    } catch (err) {
      console.warn(`[Notification] Manual Email send failed for user ${userId}:`, err.message);
    }
  }

  /** Alert super admins when a template code is missing */
  async _alertMissingTemplate(code, tenantId) {
    try {
      const superAdmins = await this.pool.query(`
        SELECT DISTINCT u.id, u.email, ut.tenant_id
        FROM users u
        JOIN user_roles ur ON u.id = ur.user_id
        JOIN roles r ON ur.role_id = r.id
        LEFT JOIN user_tenants ut ON ut.user_id = u.id
        WHERE r.code = 'super_admin' AND u.status = 'active'
        LIMIT 10
      `);

      for (const admin of superAdmins.rows) {
        const adminTenantId = admin.tenant_id || tenantId;
        if (!adminTenantId) continue;
        await this._sendInApp(adminTenantId, admin.id, {
          title: '⚠️ Missing Notification Template',
          message: `Template code '${code}' is not configured. Notifications using this code will be skipped until a template is created.`,
          notification_type: 'warning',
          category: 'system',
          priority: 'high',
          action_url: '/settings/notification-templates'
        });
      }
    } catch (err) {
      console.warn('[Notification] Could not alert super admins:', err.message);
    }
  }

  async _getPrefs(userId, tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM notification_preferences WHERE user_id = $1 AND tenant_id = $2',
      [userId, tenantId]
    );
    return result.rows[0] || null;
  }

  _isAllowedByQuietHours(prefs, priority) {
    if (!prefs || !prefs.quiet_hours_enabled || !prefs.quiet_hours_start || !prefs.quiet_hours_end) return true;

    const now   = new Date();
    const tz    = prefs.timezone || 'UTC';
    const nowStr = now.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false });
    const start  = prefs.quiet_hours_start.substring(0, 5);
    const end    = prefs.quiet_hours_end.substring(0, 5);
    const inQH   = start < end
      ? (nowStr >= start && nowStr < end)
      : (nowStr >= start || nowStr < end);

    return !(inQH && priority !== 'urgent');
  }

  _renderTemplate(template, variables, isHtml = false) {
    if (!template) return '';
    let result = template;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value ?? '');
    }
    
    // If we're rendering for an HTML capable context, and the template doesn't seem to have HTML tags,
    // convert newlines to <br /> just to be safe.
    if (isHtml && !/<\/?[a-z][\s\S]*>/i.test(result)) {
      result = result.replace(/\n/g, '<br />');
    }
    return result;
  }

  _matchesConditions(conditions, data) {
    if (!conditions || Object.keys(conditions).length === 0) return true;
    for (const [key, value] of Object.entries(conditions)) {
      if (data[key] !== value) return false;
    }
    return true;
  }

  _formatPreferences(row) {
    return {
      ...row,
      category_preferences: typeof row.category_preferences === 'string'
        ? JSON.parse(row.category_preferences)
        : row.category_preferences
    };
  }

  _formatAlertRule(row) {
    return {
      ...row,
      trigger_conditions: typeof row.trigger_conditions === 'string'
        ? JSON.parse(row.trigger_conditions)
        : row.trigger_conditions
    };
  }
}

// Singleton
let instance = null;
const getNotificationService = () => {
  if (!instance) instance = new NotificationService();
  return instance;
};

module.exports = { NotificationService, getNotificationService };
