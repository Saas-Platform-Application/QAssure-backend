/**
 * Notification Category Service
 * Manages notification_categories and notification_codes master tables (Super Admin)
 *
 * Architecture:
 *   Category (e.g. "CAPA") → Codes (e.g. "capa_assigned", "capa_overdue", "capa_closed")
 */

const { pool } = require('../config/database');

class NotificationCategoryService {
  constructor() {
    this.pool = pool;
  }

  // ============================================================================
  // CATEGORIES
  // ============================================================================

  async getAllCategories({ 
    includeInactive = false, 
    limit = 10, 
    offset = 0, 
    search = '',
    module_id = null
  } = {}) {
    let where = includeInactive ? 'WHERE 1=1' : 'WHERE nc.is_active = TRUE';
    const params = [];

    if (search) {
      params.push(`%${search}%`);
      where += ` AND (nc.name ILIKE $${params.length} OR nc.code ILIKE $${params.length})`;
    }

    if (module_id) {
      params.push(module_id);
      where += ` AND nc.module_id = $${params.length}`;
    }

    // Get total count
    const countResult = await this.pool.query(`
      SELECT COUNT(*) FROM notification_categories nc ${where}
    `, params);
    const total = parseInt(countResult.rows[0].count);

    // Get paginated data
    params.push(limit);
    params.push(offset);
    const result = await this.pool.query(`
      SELECT
        nc.*,
        m.name         AS module_name,
        m.module_id    AS module_code,
        u.email        AS created_by_email,
        COUNT(nco.id)  AS code_count
      FROM notification_categories nc
      LEFT JOIN modules m    ON nc.module_id  = m.id
      LEFT JOIN users   u    ON nc.created_by = u.id
      LEFT JOIN notification_codes nco ON nco.category_id = nc.id
      ${where}
      GROUP BY nc.id, m.name, m.module_id, u.email
      ORDER BY nc.module_id NULLS FIRST, nc.name
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `, params);

    return {
      data: result.rows,
      pagination: {
        total,
        limit,
        offset,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getCategoryById(id) {
    const result = await this.pool.query(`
      SELECT nc.*, m.name AS module_name, u.email AS created_by_email
      FROM notification_categories nc
      LEFT JOIN modules m ON nc.module_id  = m.id
      LEFT JOIN users   u ON nc.created_by = u.id
      WHERE nc.id = $1
    `, [id]);
    return result.rows[0] || null;
  }

  async getCategoryByCode(code) {
    const result = await this.pool.query(
      'SELECT * FROM notification_categories WHERE code = $1', [code]
    );
    return result.rows[0] || null;
  }

  async createCategory(data, createdBy) {
    const code = data.code.toLowerCase().trim();

    const existing = await this.getCategoryByCode(code);
    if (existing) throw new Error(`Category code '${code}' already exists`);

    const result = await this.pool.query(`
      INSERT INTO notification_categories
        (name, code, description, module_id, is_active, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [data.name, code, data.description || null,
        data.module_id || null, data.is_active !== false, createdBy]);

    const category = result.rows[0];

    // Auto-seed category into every existing user's preferences
    await this._seedCategoryIntoPreferences(code);

    return this.getCategoryById(category.id);
  }

  async updateCategory(id, data, updatedBy) {
    const category = await this.getCategoryById(id);
    if (!category) throw new Error('Category not found');

    if (data.code && data.code !== category.code) {
      const existing = await this.getCategoryByCode(data.code.toLowerCase().trim());
      if (existing) throw new Error(`Category code '${data.code}' already exists`);
    }

    const setClauses = [];
    const params = [];
    let idx = 1;

    const updatable = ['name', 'code', 'description', 'module_id', 'is_active'];
    for (const field of updatable) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${idx++}`);
        params.push(field === 'code' ? data[field].toLowerCase().trim() : data[field]);
      }
    }
    if (!setClauses.length) return category;

    setClauses.push('updated_at = NOW()');
    params.push(id);

    await this.pool.query(
      `UPDATE notification_categories SET ${setClauses.join(', ')} WHERE id = $${idx}`,
      params
    );
    return this.getCategoryById(id);
  }

  async deleteCategory(id) {
    const category = await this.getCategoryById(id);
    if (!category) throw new Error('Category not found');

    const codesUsed = await this.pool.query(
      `SELECT COUNT(*) AS cnt FROM notification_templates WHERE category = $1`,
      [category.code]
    );
    if (parseInt(codesUsed.rows[0].cnt) > 0) {
      throw new Error('Cannot delete: existing templates use this category. Deactivate it instead.');
    }

    await this.pool.query('DELETE FROM notification_categories WHERE id = $1', [id]);
    return { success: true };
  }

  // ============================================================================
  // CODES
  // ============================================================================

  async getCodesByCategory(categoryId, { limit = 10, offset = 0 } = {}) {
    // Total count
    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM notification_codes WHERE category_id = $1', [categoryId]
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await this.pool.query(`
      SELECT nco.*, nc.name AS category_name, nc.code AS category_code,
             COALESCE(nco.variables, '[]'::jsonb) AS variables,
             (SELECT COUNT(*) FROM notification_templates nt
              WHERE nt.code = nco.code AND nt.tenant_id IS NULL) AS has_global_template
      FROM notification_codes nco
      JOIN notification_categories nc ON nco.category_id = nc.id
      WHERE nco.category_id = $1
      ORDER BY nco.name
      LIMIT $2 OFFSET $3
    `, [categoryId, limit, offset]);

    return {
      data: result.rows,
      pagination: { total, limit, offset, pages: Math.ceil(total / limit) }
    };
  }

  async getCodesByCategoryCode(categoryCode) {
    const result = await this.pool.query(`
      SELECT nco.*, nc.name AS category_name, nc.code AS category_code,
             COALESCE(nco.variables, '[]'::jsonb) AS variables
      FROM notification_codes nco
      JOIN notification_categories nc ON nco.category_id = nc.id
      WHERE nc.code = $1 AND nco.is_active = TRUE
      ORDER BY nco.name
    `, [categoryCode]);
    return result.rows;
  }

  async getCodeByCode(code) {
    const result = await this.pool.query(
      `SELECT nco.*, nc.name AS category_name, nc.code AS category_code, nc.module_id,
              COALESCE(nco.variables, '[]'::jsonb) AS variables
       FROM notification_codes nco
       JOIN notification_categories nc ON nco.category_id = nc.id
       WHERE nco.code = $1`,
      [code]
    );
    return result.rows[0] || null;
  }

  async createCode(categoryId, data, createdBy) {
    const code = data.code.toLowerCase().trim();

    // Code must be globally unique
    const existing = await this.pool.query(
      'SELECT id FROM notification_codes WHERE code = $1', [code]
    );
    if (existing.rows.length > 0) throw new Error(`Code '${code}' already exists`);

    // Verify category exists
    const category = await this.getCategoryById(categoryId);
    if (!category) throw new Error('Category not found');

    // Normalise variables: ensure it is a plain string-array
    const variables = Array.isArray(data.variables)
      ? data.variables.filter(v => typeof v === 'string' && v.trim())
      : [];

    const result = await this.pool.query(`
      INSERT INTO notification_codes
        (category_id, code, name, description, default_channels, default_priority,
         is_active, variables, created_by, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      RETURNING *
    `, [
      categoryId, code, data.name, data.description || null,
      data.default_channels || ['in_app', 'email'],
      data.default_priority || 'normal',
      data.is_active !== false,
      JSON.stringify(variables),
      createdBy
    ]);

    return result.rows[0];
  }

  async updateCode(id, data) {
    const setClauses = [];
    const params = [];
    let idx = 1;

    const updatable = ['name', 'description', 'default_channels', 'default_priority', 'is_active'];
    for (const field of updatable) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${idx++}`);
        params.push(data[field]);
      }
    }

    // Handle variables separately as JSONB
    if (data.variables !== undefined) {
      const variables = Array.isArray(data.variables)
        ? data.variables.filter(v => typeof v === 'string' && v.trim())
        : [];
      setClauses.push(`variables = $${idx++}`);
      params.push(JSON.stringify(variables));
    }

    if (!setClauses.length) throw new Error('No fields to update');

    setClauses.push('updated_at = NOW()');
    params.push(id);

    const result = await this.pool.query(
      `UPDATE notification_codes SET ${setClauses.join(', ')} WHERE id = $${idx} RETURNING *`,
      params
    );
    if (!result.rows.length) throw new Error('Code not found');
    return result.rows[0];
  }

  async deleteCode(id) {
    // Check templates
    const code = await this.pool.query(
      'SELECT code FROM notification_codes WHERE id = $1', [id]
    );
    if (!code.rows.length) throw new Error('Code not found');

    const used = await this.pool.query(
      'SELECT COUNT(*) AS cnt FROM notification_templates WHERE code = $1',
      [code.rows[0].code]
    );
    if (parseInt(used.rows[0].cnt) > 0) {
      throw new Error('Cannot delete: templates exist for this code. Delete templates first.');
    }

    await this.pool.query('DELETE FROM notification_codes WHERE id = $1', [id]);
    return { success: true };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  /**
   * Called when a new category is created — seeds it into all users' preferences
   * with default in_app=true, email=true
   */
  async _seedCategoryIntoPreferences(categoryCode) {
    try {
      await this.pool.query(`
        UPDATE notification_preferences
        SET   category_preferences = category_preferences || $1::jsonb,
              updated_at           = NOW()
        WHERE NOT (category_preferences ? $2)
      `, [
        JSON.stringify({ [categoryCode]: { in_app: true, email: true } }),
        categoryCode
      ]);
    } catch (err) {
      console.warn('[NotificationCategory] Preference seed failed:', err.message);
    }
  }

  /**
   * Returns all categories that a specific user should see
   * (platform categories + categories whose module the user has access to)
   */
  async getCategoriesForTenant(tenantId, userId, moduleId = null) {
    // 1. Check if user is tenant_admin or super_admin
    const userRoles = await this.pool.query(`
      SELECT r.code FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      WHERE ur.user_id = $1 AND (ur.tenant_id = $2 OR ur.tenant_id IS NULL)
        AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
    `, [userId, tenantId]);

    const isAdmin = userRoles.rows.some(r => r.code === 'tenant_admin' || r.code === 'super_admin');

    const params = [tenantId];
    let query;

    if (isAdmin) {
      // Admins see all modules the tenant has active
      query = `
        SELECT nc.*
        FROM notification_categories nc
        WHERE nc.is_active = TRUE
          AND (
            nc.module_id IS NULL
            OR nc.module_id IN (
              SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND is_active = TRUE
            )
          )
      `;
      if (moduleId) {
        query += ` AND nc.module_id = $2`;
        params.push(moduleId);
      }
      query += ` ORDER BY nc.module_id NULLS FIRST, nc.name`;
    } else {
      // Regular users only see modules they are assigned to
      params.push(userId);
      query = `
        SELECT DISTINCT nc.*
        FROM notification_categories nc
        JOIN user_roles ur ON (ur.module_id = nc.module_id OR nc.module_id IS NULL)
        WHERE nc.is_active = TRUE
          AND ur.user_id = $2
          AND (ur.tenant_id = $1 OR ur.tenant_id IS NULL)
          AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
          AND (
            nc.module_id IS NULL
            OR nc.module_id IN (
              SELECT module_id FROM tenant_modules WHERE tenant_id = $1 AND is_active = TRUE
            )
          )
      `;
      if (moduleId) {
        query += ` AND nc.module_id = $3`;
        params.push(moduleId);
      }
      query += ` ORDER BY nc.module_id NULLS FIRST, nc.name`;
    }

    const result = await this.pool.query(query, params);
    return result.rows;
  }
}

// Singleton
let instance = null;
const getNotificationCategoryService = () => {
  if (!instance) instance = new NotificationCategoryService();
  return instance;
};

module.exports = { NotificationCategoryService, getNotificationCategoryService };
