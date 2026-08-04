/**
 * Module Service - QAssure Platform
 * Manages module registration, lifecycle, and health monitoring
 */
const crypto = require('crypto');
const database = require('../config/database');
const { getAuditService } = require('./audit.service');
const { getApiKeyService } = require('./api_key.service');

// Module lifecycle states
const MODULE_STATES = {
  PENDING: 'pending',           // Just registered, not yet deployed
  STARTING: 'starting',         // Deployment in progress
  RUNNING: 'running',           // Healthy and serving traffic
  STOPPING: 'stopping',         // Graceful shutdown in progress
  STOPPED: 'stopped',           // Manually stopped
  FAILED: 'failed',             // Crashed or unhealthy
  DEPRECATED: 'deprecated',     // Marked for removal
  MAINTENANCE: 'maintenance'    // Temporarily offline for updates
};

// Valid state transitions
const STATE_TRANSITIONS = {
  [MODULE_STATES.PENDING]: [MODULE_STATES.STARTING, MODULE_STATES.FAILED],
  [MODULE_STATES.STARTING]: [MODULE_STATES.RUNNING, MODULE_STATES.FAILED, MODULE_STATES.STOPPED],
  [MODULE_STATES.RUNNING]: [MODULE_STATES.STOPPING, MODULE_STATES.FAILED, MODULE_STATES.MAINTENANCE, MODULE_STATES.DEPRECATED],
  [MODULE_STATES.STOPPING]: [MODULE_STATES.STOPPED, MODULE_STATES.FAILED],
  [MODULE_STATES.STOPPED]: [MODULE_STATES.STARTING, MODULE_STATES.DEPRECATED],
  [MODULE_STATES.FAILED]: [MODULE_STATES.STARTING, MODULE_STATES.STOPPED, MODULE_STATES.DEPRECATED],
  [MODULE_STATES.DEPRECATED]: [MODULE_STATES.STOPPED],
  [MODULE_STATES.MAINTENANCE]: [MODULE_STATES.STARTING, MODULE_STATES.RUNNING, MODULE_STATES.STOPPED, MODULE_STATES.FAILED]
};

class ModuleService {
  constructor() {
    this.auditService = getAuditService();
    this.healthCheckInterval = null;
    this.STATES = MODULE_STATES;
  }

  /**
   * Validate state transition
   */
  isValidTransition(currentState, newState) {
    const allowedTransitions = STATE_TRANSITIONS[currentState];
    if (!allowedTransitions) return false;
    return allowedTransitions.includes(newState);
  }

  /**
   * Register a new module
   */
  // async register(data, userId, tenantId = null) {
  //   const {
  //     module_id,
  //     name,
  //     description,
  //     version,
  //     runtime_language,
  //     framework,
  //     base_url,
  //     health_endpoint,
  //     endpoints,
  //     kafka_topics,
  //     cpu_request,
  //     cpu_limit,
  //     memory_request,
  //     memory_limit,
  //     min_replicas,
  //     max_replicas,
  //     metadata
  //   } = data;

  //   // Check if module_id already exists
  //   const existing = await database.query(
  //     'SELECT id FROM modules WHERE module_id = $1',
  //     [module_id]
  //   );

  //   if (existing.rows.length > 0) {
  //     throw new Error(`Module with ID '${module_id}' already exists`);
  //   }

  //   const id = crypto.randomUUID();

  //   const query = `
  //     INSERT INTO modules (
  //       id, module_id, name, description, version, status,
  //       runtime_language, framework, base_url, health_endpoint,
  //       endpoints, kafka_topics,
  //       cpu_request, cpu_limit, memory_request, memory_limit,
  //       min_replicas, max_replicas,
  //       registered_by, tenant_id, metadata,
  //       created_at, updated_at
  //     ) VALUES (
  //       $1, $2, $3, $4, $5, $6,
  //       $7, $8, $9, $10,
  //       $11, $12,
  //       $13, $14, $15, $16,
  //       $17, $18,
  //       $19, $20, $21,
  //       NOW(), NOW()
  //     )
  //     RETURNING *
  //   `;

  //   const values = [
  //     id,
  //     module_id,
  //     name,
  //     description || null,
  //     version,
  //     MODULE_STATES.PENDING, // Initial status
  //     runtime_language,
  //     framework || null,
  //     base_url,
  //     health_endpoint,
  //     endpoints ? JSON.stringify(endpoints) : null,
  //     kafka_topics ? JSON.stringify(kafka_topics) : null,
  //     cpu_request || '100m',
  //     cpu_limit || '500m',
  //     memory_request || '128Mi',
  //     memory_limit || '512Mi',
  //     min_replicas || 2,
  //     max_replicas || 10,
  //     userId,
  //     tenantId,
  //     metadata ? JSON.stringify(metadata) : null
  //   ];

  //   const result = await database.query(query, values);
  //   const module = result.rows[0];

  //   // Log audit event
  //   await this.auditService.log({
  //     action: 'module.register',
  //     user_id: userId,
  //     tenant_id: tenantId,
  //     resource_type: 'module',
  //     resource_id: module.id,
  //     metadata: { module_id, name, version, initial_status: MODULE_STATES.PENDING }
  //   });

  //   return module;
  // }

  async register(data, userId, tenantId = null) {
    const {
      module_id,
      name,
      description,
      version,
      runtime_language,
      framework,
      frontend_base_url,
      backend_base_url,
      health_endpoint,
      webhookurl,
      sync_webhook_url,
      endpoints,
      kafka_topics,
      cpu_request,
      cpu_limit,
      memory_request,
      memory_limit,
      min_replicas,
      max_replicas,
      metadata,health_status,status,
    } = data;
  
    // Check if module_id already exists
    const existing = await database.query(
      'SELECT id FROM modules WHERE module_id = $1',
      [module_id]
    );
  
    if (existing.rows.length > 0) {
      throw new Error(`Module with ID '${module_id}' already exists`);
    }
  
    const id = crypto.randomUUID();
  
    const query = `
      INSERT INTO modules (
        id, module_id, name, description, version, status,
        runtime_language, framework, frontend_base_url, backend_base_url, health_endpoint, webhookurl, sync_webhook_url,
        endpoints, kafka_topics,
        cpu_request, cpu_limit, memory_request, memory_limit,
        min_replicas, max_replicas,
        registered_by, tenant_id, metadata,health_status,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6,
        $7, $8, $9, $10, $11, $12, $13,
        $14, $15,
        $16, $17, $18, $19,
        $20, $21,
        $22, $23, $24, $25,
        NOW(), NOW()
      )
      RETURNING *
    `;
  
    const values = [
      id,
      module_id,
      name,
      description || null,
      version,
      status || MODULE_STATES.PENDING,
      runtime_language,
      framework || null,
      frontend_base_url,
      backend_base_url,
      health_endpoint,
      webhookurl || null,
      sync_webhook_url || null,
      endpoints ? JSON.stringify(endpoints) : null,
      kafka_topics ? JSON.stringify(kafka_topics) : null,
      cpu_request || '100m',
      cpu_limit || '500m',
      memory_request || '128Mi',
      memory_limit || '512Mi',
      min_replicas || 2,
      max_replicas || 10,
      userId,
      tenantId,
      metadata ? JSON.stringify(metadata) : null,
      health_status || 'healthy',

    ];
  
    const result = await database.query(query, values);
    const module = result.rows[0];
  
    // ============================================================
    // NEW: Auto-generate API key for the module
    // ============================================================
    let apiKeyData = null;
    try {
      const apiKeyService = getApiKeyService();
      
      const modulePermissions = [
        // AI Services
        'ai:read',
        'ai:create',
        'ai:update',
        'ai:delete',
        // Workflow Engine
        'workflow:read',
        'workflow:write',
        'workflow:admin',
        // Document Management
        'document:read',
        'document:write',
        // CAPA Management
        'capa:read',
        'capa:write',
        // Training Management
        'training:read',
        'training:write',
        // Supplier Quality
        'supplier:read',
        'supplier:write',
        // Notifications
        'notifications:read',
        'notifications:write',
        // File Attachments
        'files:read',
        'files:write',
        // Events & Webhooks
        'event_logs:read',
        'event_logs:create',
        'event_logs:update',
        'event_logs:delete',
        'webhooks:read',
        'webhooks:create',
        'webhooks:update',
        'webhooks:delete',
        // QMS Integration
        'qms:read',
        'qms:create',
        'qms:update',
        // Reporting
        'reports:read',
        'reports:write',
        // Projects
        'projects:read',
        'projects:write',
        // Audit Logs
        'audit_logs:read'
      ];
  
      apiKeyData = await apiKeyService.create({
        name: `Module: ${module_id}`,
        description: `Auto-generated API key for module ${name} (${module_id})`,
        permissions: modulePermissions,
        module_id: id,  // Link API key to module
        expires_at: null  // No expiration for module keys
      }, userId, null);
  
      console.log(`[ModuleService] API key generated for module ${module_id}: ${apiKeyData.key_prefix}...`);
      
      // ============================================================
      // Send webhook notification if webhookurl is provided
      // ============================================================
      if (webhookurl && apiKeyData) {
        try {
          const webhookPayload = {
            module_id: module_id,
            uuid: module.id,
            api_key: apiKeyData.key,
            qassure_api_url: process.env.QASSURE_API_URL || `http://localhost:${process.env.PORT}/api/v1`,
            // api_key: {
            //   key: apiKeyData.key,
            //   permissions: apiKeyData.permissions
            // },
            // module: {
            //   id: module.id,
            //   name: module.name
            // },
            message: {
              warning: "Save this key securely. It will not be shown again."
            }
          };

          console.log(`[ModuleService] Sending webhook notification to ${webhookurl} for module ${module_id}`);
          
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout
          
          const webhookResponse = await fetch(webhookurl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(webhookPayload),
            signal: controller.signal
          });

          clearTimeout(timeout);

          const responseData = {
            status: webhookResponse.status,
            statusText: webhookResponse.statusText,
            headers: Object.fromEntries(webhookResponse.headers.entries())
          };

          // Try to parse response body if available
          try {
            const contentType = webhookResponse.headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              responseData.body = await webhookResponse.json();
            } else {
              responseData.body = await webhookResponse.text();
            }
          } catch (parseError) {
            responseData.body = 'Unable to parse response body';
            responseData.parseError = parseError.message;
          }

          if (webhookResponse.ok) {
            console.log(`[ModuleService] Webhook notification sent successfully for module ${module_id}:`, JSON.stringify(responseData, null, 2));
          } else {
            console.warn(`[ModuleService] Webhook notification returned non-OK status for module ${module_id}:`, JSON.stringify(responseData, null, 2));
          }
        } catch (webhookError) {
          // Log error but don't fail the registration
          console.error(`[ModuleService] Failed to send webhook notification to ${webhookurl} for module ${module_id}:`, {
            error: webhookError.message,
            stack: webhookError.stack,
            name: webhookError.name
          });
        }
      }
    } catch (apiKeyError) {
      console.error(`[ModuleService] Failed to generate API key for module ${module_id}:`, apiKeyError.message);
    }

    // ============================================================
    // NEW: Trigger initial identity data sync if sync_webhook_url provided
    // ============================================================
    if (sync_webhook_url) {
      console.log(`[ModuleService] Triggering initial identity sync for module ${module_id}`);
      this.syncIdentityDataToWebhook(id, null, userId).catch(err => {
        console.error(`[ModuleService] Initial identity sync failed for module ${module_id}:`, err.message);
      });
    }
  
    // Log audit event
    await this.auditService.log({
      action: 'module.register',
      user_id: userId,
      tenant_id: tenantId,
      resource_type: 'module',
      resource_id: module.id,
      metadata: { 
        module_id, 
        name, 
        version, 
        initial_status: MODULE_STATES.PENDING,
        api_key_generated: !!apiKeyData
      }
    });
  
    // Return module with API key (key only shown once!)
    const createdModule = {
      ...module,
      api_key: apiKeyData ? {
        id: apiKeyData.id,
        key: apiKeyData.key,  // Plain key - only shown once!
        key_prefix: apiKeyData.key_prefix,
        permissions: apiKeyData.permissions,
        warning: apiKeyData.warning
      } : null
    };

    try {
      this.sendIdentityUpdate('create', 'module', module.id, userId);
    } catch (e) {
      console.error('Failed to send identity update for module register', e);
    }

    return createdModule;
  }

  /**
   * Update module status with transition validation
   */
  async updateStatus(id, newStatus, userId, reason = null) {
    const normalizedStatus = newStatus.toLowerCase();
    
    // Validate status value
    if (!Object.values(MODULE_STATES).includes(normalizedStatus)) {
      throw new Error(`Invalid status '${newStatus}'. Valid states: ${Object.values(MODULE_STATES).join(', ')}`);
    }

    // Get current module state
    const module = await this.getById(id);
    const currentStatus = module.status;

    // Validate transition (skip validation for super_admin force updates)
    if (!this.isValidTransition(currentStatus, normalizedStatus)) {
      throw new Error(
        `Invalid state transition from '${currentStatus}' to '${normalizedStatus}'. ` +
        `Allowed transitions: ${STATE_TRANSITIONS[currentStatus]?.join(', ') || 'none'}`
      );
    }

    const result = await database.query(`
      UPDATE modules 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [normalizedStatus, id]);

    const updatedModule = result.rows[0];

    // Log audit event with state transition details
    await this.auditService.log({
      action: 'module.status_change',
      user_id: userId,
      tenant_id: module.tenant_id,
      resource_type: 'module',
      resource_id: id,
      changes: { 
        previous_status: currentStatus,
        new_status: normalizedStatus,
        reason 
      }
    });

    return updatedModule;
  }

  /**
   * Force update status (super_admin only, bypasses transition validation)
   */
  async forceUpdateStatus(id, newStatus, userId, reason) {
    const normalizedStatus = newStatus.toLowerCase();
    
    if (!Object.values(MODULE_STATES).includes(normalizedStatus)) {
      throw new Error(`Invalid status '${newStatus}'. Valid states: ${Object.values(MODULE_STATES).join(', ')}`);
    }

    const module = await this.getById(id);
    const currentStatus = module.status;

    const result = await database.query(`
      UPDATE modules 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [normalizedStatus, id]);

    const updatedModule = result.rows[0];

    // Log audit event with force flag
    await this.auditService.log({
      action: 'module.status_force_change',
      user_id: userId,
      tenant_id: module.tenant_id,
      resource_type: 'module',
      resource_id: id,
      changes: { 
        previous_status: currentStatus,
        new_status: normalizedStatus,
        reason,
        forced: true
      }
    });

    return updatedModule;
  }

  /**
   * Start a module (pending/stopped -> starting -> running)
   */
  async start(id, userId) {
    const module = await this.getById(id);
    
    // First transition to starting
    await this.updateStatus(id, MODULE_STATES.STARTING, userId, 'Module start requested');

    // In a real system, this would trigger K8s deployment
    // For now, we'll just set it to running
    // TODO: Integrate with actual orchestration system

    // Simulate startup (in production, this would be async with callbacks)
    await this.updateStatus(id, MODULE_STATES.RUNNING, userId, 'Module started successfully');

    return await this.getById(id);
  }

  /**
   * Stop a module gracefully
   */
  async stop(id, userId, reason = 'Manual stop requested') {
    const module = await this.getById(id);
    
    // First transition to stopping
    await this.updateStatus(id, MODULE_STATES.STOPPING, userId, reason);

    // In a real system, this would trigger graceful shutdown
    // TODO: Integrate with actual orchestration system

    // Simulate shutdown
    await this.updateStatus(id, MODULE_STATES.STOPPED, userId, 'Module stopped successfully');

    return await this.getById(id);
  }

  /**
   * Restart a module
   */
  async restart(id, userId, reason = 'Restart requested') {
    await this.stop(id, userId, reason);
    return await this.start(id, userId);
  }

  /**
   * Put module in maintenance mode
   */
  async setMaintenance(id, userId, reason = 'Scheduled maintenance') {
    return await this.updateStatus(id, MODULE_STATES.MAINTENANCE, userId, reason);
  }

  /**
   * Mark module as deprecated
   */
  async deprecate(id, userId, reason = 'Module deprecated') {
    return await this.updateStatus(id, MODULE_STATES.DEPRECATED, userId, reason);
  }

  /**
   * Mark module as failed
   */
  async markFailed(id, userId, error) {
    const module = await this.getById(id);

    const result = await database.query(`
      UPDATE modules 
      SET status = $1, consecutive_failures = consecutive_failures + 1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [MODULE_STATES.FAILED, id]);

    // Log audit event
    await this.auditService.log({
      action: 'module.failed',
      user_id: userId,
      tenant_id: module.tenant_id,
      resource_type: 'module',
      resource_id: id,
      changes: { 
        previous_status: module.status,
        new_status: MODULE_STATES.FAILED,
        error 
      }
    });

    return result.rows[0];
  }

  /**
   * Update module version (deployment)
   */
  async updateVersion(id, version, userId, changelog = null) {
    const current = await this.getById(id);

    const result = await database.query(`
      UPDATE modules 
      SET version = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING *
    `, [version, id]);

    if (result.rows.length === 0) {
      throw new Error('Module not found');
    }

    const module = result.rows[0];

    // Log audit event
    await this.auditService.log({
      action: 'module.version_update',
      user_id: userId,
      tenant_id: module.tenant_id,
      resource_type: 'module',
      resource_id: id,
      changes: {
        old_version: current.version,
        new_version: version,
        changelog
      }
    });

    return module;
  }

  /**
   * Get module by ID
   */
  async getById(id) {
    const result = await database.query(`
      SELECT m.*, u.email as registered_by_email
      FROM modules m
      LEFT JOIN users u ON u.id = m.registered_by
      WHERE m.id = $1
    `, [id]);

    if (result.rows.length === 0) {
      throw new Error('Module not found');
    }

    return result.rows[0];
  }

  /**
   * Get module by module_id
   */
  async getByModuleId(moduleId) {
    const result = await database.query(`
      SELECT m.*, u.email as registered_by_email
      FROM modules m
      LEFT JOIN users u ON u.id = m.registered_by
      WHERE m.module_id = $1
    `, [moduleId]);

    if (result.rows.length === 0) {
      throw new Error('Module not found');
    }

    return result.rows[0];
  }

  /**
   * List modules with filters
   */
  async list(filters = {}, options = {}) {
    const { tenant_id, status, health_status, runtime_language, search } = filters;
    const { page = 1, limit = 20, sort_by = 'created_at', sort_order = 'DESC' } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT m.*, u.email as registered_by_email
      FROM modules m
      LEFT JOIN users u ON u.id = m.registered_by
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 0;

    if (tenant_id) {
      paramCount++;
      query += ` AND m.tenant_id = $${paramCount}`;
      params.push(tenant_id);
    }

    if (status) {
      paramCount++;
      query += ` AND m.status = $${paramCount}`;
      params.push(status.toLowerCase());
    }

    if (health_status) {
      paramCount++;
      query += ` AND m.health_status = $${paramCount}`;
      params.push(health_status.toLowerCase());
    }

    if (runtime_language) {
      paramCount++;
      query += ` AND m.runtime_language = $${paramCount}`;
      params.push(runtime_language);
    }

    if (search) {
      paramCount++;
      query += ` AND (m.name ILIKE $${paramCount} OR m.module_id ILIKE $${paramCount} OR m.description ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // Sorting
    const validSortColumns = ['created_at', 'updated_at', 'name', 'module_id', 'status', 'version', 'health_status'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = (sort_order && sort_order.toUpperCase() === 'ASC') ? 'ASC' : 'DESC';
    
    const useNumericCollation = await database.checkNumericCollation();
    if (['name', 'module_id', 'status', 'version', 'health_status'].includes(sortColumn)) {
      if (useNumericCollation) {
        query += ` ORDER BY TRIM(m.${sortColumn}) COLLATE "numeric" ${sortDir}`;
      } else {
        query += ` ORDER BY LOWER(TRIM(m.${sortColumn})) ${sortDir}`;
      }
    } else {
      query += ` ORDER BY m.${sortColumn} ${sortDir}`;
    }
    
    paramCount++;
    query += ` LIMIT $${paramCount}`;
    params.push(limit);
    
    paramCount++;
    query += ` OFFSET $${paramCount}`;
    params.push(offset);

    const result = await database.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM modules WHERE 1=1`;
    const countParams = [];
    let countIdx = 0;

    if (tenant_id) {
      countIdx++;
      countQuery += ` AND tenant_id = $${countIdx}`;
      countParams.push(tenant_id);
    }
    if (status) {
      countIdx++;
      countQuery += ` AND status = $${countIdx}`;
      countParams.push(status.toLowerCase());
    }

    if (health_status) {
      countIdx++;
      countQuery += ` AND health_status = $${countIdx}`;
      countParams.push(health_status.toLowerCase());
    }

    if (runtime_language) {
      countIdx++;
      countQuery += ` AND runtime_language = $${countIdx}`;
      countParams.push(runtime_language);
    }

    if (search) {
      countIdx++;
      countQuery += ` AND (name ILIKE $${countIdx} OR module_id ILIKE $${countIdx} OR description ILIKE $${countIdx})`;
      countParams.push(`%${search}%`);
    }

    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Update module configuration
   */
  async update(id, data, userId) {
    const {
      name,
      description,
      frontend_base_url,
      backend_base_url,
      health_endpoint,
      webhookurl,
      endpoints,
      kafka_topics,
      cpu_request,
      cpu_limit,
      memory_request,
      memory_limit,
      min_replicas,
      max_replicas,
      metadata,
      sync_webhook_url
    } = data;

    const updates = [];
    const params = [];
    let paramCount = 0;

    const addUpdate = (field, value) => {
      if (value !== undefined) {
        paramCount++;
        updates.push(`${field} = $${paramCount}`);
        params.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    };

    addUpdate('name', name);
    addUpdate('description', description);
    addUpdate('frontend_base_url', frontend_base_url);
    addUpdate('backend_base_url', backend_base_url);
    addUpdate('health_endpoint', health_endpoint);
    addUpdate('webhookurl', webhookurl);
    addUpdate('sync_webhook_url', sync_webhook_url);
    addUpdate('endpoints', endpoints);
    addUpdate('kafka_topics', kafka_topics);
    addUpdate('cpu_request', cpu_request);
    addUpdate('cpu_limit', cpu_limit);
    addUpdate('memory_request', memory_request);
    addUpdate('memory_limit', memory_limit);
    addUpdate('min_replicas', min_replicas);
    addUpdate('max_replicas', max_replicas);
    addUpdate('metadata', metadata);

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push('updated_at = NOW()');

    paramCount++;
    params.push(id);

    // Get old module state to check for changes (e.g., webhookurl)
    const oldModule = await this.getById(id);

    const query = `
      UPDATE modules 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount}
      RETURNING *
    `;

    const result = await database.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('Module not found');
    }

    const module = result.rows[0];


    // Log audit event
    await this.auditService.log({
      action: 'module.update',
      user_id: userId,
      tenant_id: module.tenant_id,
      resource_type: 'module',
      resource_id: id,
      changes: data
    });

    try {
      this.sendIdentityUpdate('update', 'module', id, userId);
    } catch (e) {
      console.error('Failed to send identity update for module update', e);
    }

    return module;
  }

  /**
   * Perform health check on a module
   */
  async checkHealth(id) {
    const module = await this.getById(id);
    
    const healthUrl = `${module.backend_base_url}${module.health_endpoint}`;
    let healthStatus = 'unknown';
    let responseTime = null;
    let error = null;

    try {
      const startTime = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(healthUrl, {
        method: 'GET',
        signal: controller.signal
      });

      clearTimeout(timeout);
      responseTime = Date.now() - startTime;

      if (response.ok) {
        healthStatus = 'healthy';
      } else {
        healthStatus = 'unhealthy';
        error = `HTTP ${response.status}`;
      }
    } catch (err) {
      healthStatus = 'unhealthy';
      error = err.message;
    }

    // Update module health status
    const consecutiveFailures = healthStatus === 'healthy' 
      ? 0 
      : (module.consecutive_failures || 0) + 1;

    // Auto-transition to failed if too many consecutive failures
    let newStatus = module.status;
    if (consecutiveFailures >= 3 && module.status === MODULE_STATES.RUNNING) {
      newStatus = MODULE_STATES.FAILED;
    }

    await database.query(`
      UPDATE modules 
      SET 
        last_health_check = NOW(),
        health_status = $1,
        consecutive_failures = $2,
        status = $3,
        updated_at = NOW()
      WHERE id = $4
    `, [healthStatus, consecutiveFailures, newStatus, id]);

    // Record in health_checks table
    await database.query(`
      INSERT INTO health_checks (
        id, module_id, status, response_time_ms, error_message, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    `, [
      crypto.randomUUID(),
      id,
      healthStatus,
      responseTime,
      error
    ]);

    return {
      module_id: module.module_id,
      status: healthStatus,
      module_status: newStatus,
      response_time: responseTime,
      error,
      consecutive_failures: consecutiveFailures
    };
  }

  /**
   * Get health history for a module
   */
  async getHealthHistory(id, limit = 100) {
    const result = await database.query(`
      SELECT * FROM health_checks
      WHERE module_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [id, limit]);

    return result.rows;
  }

  /**
   * Deregister (soft delete) a module
   */
  async deregister(id, userId) {
    const module = await this.getById(id);

    // Must stop before deregistering
    if (module.status === MODULE_STATES.RUNNING) {
      await this.stop(id, userId, 'Stopping for deregistration');
    }

    await database.query(`
      UPDATE modules 
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `, [MODULE_STATES.DEPRECATED, id]);

    // Log audit event
    await this.auditService.log({
      action: 'module.deregister',
      user_id: userId,
      tenant_id: module.tenant_id,
      resource_type: 'module',
      resource_id: id,
      metadata: { module_id: module.module_id }
    });

    return { success: true, message: 'Module deregistered successfully' };
  }

  /**
   * Delete module permanently (admin only)
   */
  async delete(id, userId) {
    const module = await this.getById(id);

    // Log audit event
    await this.auditService.log({
      action: 'module.delete',
      user_id: userId,
      tenant_id: module.tenant_id,
      resource_type: 'module',
      resource_id: id,
      metadata: { module_id: module.module_id, name: module.name }
    });

    // Delete module
    // CASCADE will automatically delete:
    // - health_history (via foreign key CASCADE)
    // - health_checks (via foreign key CASCADE)
    // - api_keys (via foreign key CASCADE)
    await database.query('DELETE FROM modules WHERE id = $1', [id]);

    try {
      this.sendIdentityUpdate('delete', 'module', { id }, userId);
    } catch (e) {
      console.error('Failed to send identity update for module delete', e);
    }

    return { success: true, message: 'Module deleted permanently' };
  }

  /**
   * Get module statistics
   */
  async getStats() {
    const result = await database.query(`
      SELECT 
        status,
        health_status,
        COUNT(*) as count
      FROM modules
      GROUP BY status, health_status
    `);

    const stats = {
      total: 0,
      by_status: {},
      by_health: {},
      states: MODULE_STATES,
      transitions: STATE_TRANSITIONS
    };

    for (const row of result.rows) {
      const count = parseInt(row.count);
      stats.total += count;
      
      stats.by_status[row.status] = (stats.by_status[row.status] || 0) + count;
      
      if (row.health_status) {
        stats.by_health[row.health_status] = (stats.by_health[row.health_status] || 0) + count;
      }
    }

    return stats;
  }

  /**
   * Get state transition diagram
   */
  getStateTransitions() {
    return {
      states: MODULE_STATES,
      transitions: STATE_TRANSITIONS
    };
  }
  /**
   * Sync identity data to module's webhook (Super Admin only)
   */
  async syncIdentityDataToWebhook(moduleId, newWebhookUrl = null, userId) {
    // 1. Get module and verify webhook URL
    const module = await this.getById(moduleId);
    let webhookUrl = newWebhookUrl || module.sync_webhook_url || module.webhookurl;

    if (!webhookUrl) {
      throw new Error('Webhook URL is required');
    }

    // 2. Update webhook URL in database if changed
    if (newWebhookUrl && newWebhookUrl !== module.sync_webhook_url) {
      await database.query(
        'UPDATE modules SET sync_webhook_url = $1, updated_at = NOW() WHERE id = $2',
        [newWebhookUrl, moduleId]
      );
    }

    // 3. Fetch module-associated identity data
    // We filter all data to only send tenants, roles, users, and metadata associated with this specific module
    const modules = await database.query('SELECT * FROM modules WHERE id = $1', [moduleId]);
    
    const tenantModules = await database.query('SELECT * FROM tenant_modules WHERE module_id = $1', [moduleId]);
    const userModules = await database.query('SELECT * FROM user_modules WHERE module_id = $1', [moduleId]);
    const roleModules = await database.query('SELECT * FROM role_modules WHERE module_id = $1', [moduleId]);
    const tenantModuleAccess = await database.query('SELECT * FROM tenant_module_access WHERE module_id = $1', [moduleId]);

    const tenants = await database.query(
      'SELECT * FROM tenants WHERE id IN (SELECT tenant_id FROM tenant_modules WHERE module_id = $1)',
      [moduleId]
    );
    const roles = await database.query(
      'SELECT * FROM roles WHERE id IN (SELECT role_id FROM role_modules WHERE module_id = $1)',
      [moduleId]
    );
    const departments = await database.query(
      'SELECT * FROM departments WHERE tenant_id IN (SELECT tenant_id FROM tenant_modules WHERE module_id = $1)',
      [moduleId]
    );
    const designations = await database.query(
      'SELECT * FROM designations WHERE tenant_id IN (SELECT tenant_id FROM tenant_modules WHERE module_id = $1)',
      [moduleId]
    );
    const suppliers = await database.query(
      'SELECT * FROM suppliers WHERE tenant_id IN (SELECT tenant_id FROM tenant_modules WHERE module_id = $1)',
      [moduleId]
    );

    const users = await database.query(
      `SELECT id, email, first_name, last_name, status, department_id, designation_id, supplier_id, user_category_id, created_at 
       FROM users 
       WHERE id IN (SELECT user_id FROM user_modules WHERE module_id = $1)
          OR id IN (SELECT user_id FROM user_tenants WHERE tenant_id IN (SELECT tenant_id FROM tenant_modules WHERE module_id = $1))`,
      [moduleId]
    );

    const userCategories = [
      { id: 'tenant_user', name: 'Tenant User', code: 'tenant_user' },
      { id: 'supplier_user', name: 'Supplier User', code: 'supplier_user' }
    ];

    const userRoles = await database.query(
      `SELECT * FROM user_roles 
       WHERE role_id IN (SELECT role_id FROM role_modules WHERE module_id = $1)
         AND user_id IN (
           SELECT user_id FROM user_modules WHERE module_id = $1
           UNION
           SELECT user_id FROM user_tenants WHERE tenant_id IN (SELECT tenant_id FROM tenant_modules WHERE module_id = $1)
         )`,
      [moduleId]
    );

    const userTenants = await database.query(
      'SELECT * FROM user_tenants WHERE tenant_id IN (SELECT tenant_id FROM tenant_modules WHERE module_id = $1)',
      [moduleId]
    );

    const permissions = await database.query(
      `SELECT * FROM permissions 
       WHERE role_id IN (SELECT role_id FROM role_modules WHERE module_id = $1)`,
      [moduleId]
    );

    // Ensure tenant_admin is included and granted full access dynamically
    const tenantAdminRoleQuery = await database.query("SELECT * FROM roles WHERE code = 'tenant_admin' LIMIT 1");
    const tenantAdminRole = tenantAdminRoleQuery.rows[0];

    if (tenantAdminRole) {
      // 1. Ensure tenant_admin role is in roles
      const roleExists = roles.rows.some(r => r.id === tenantAdminRole.id);
      if (!roleExists) {
        roles.rows.push(tenantAdminRole);
      }

      // 2. Ensure role_modules has tenant_admin mapped to the target module
      const roleModuleExists = roleModules.rows.some(rm => rm.role_id === tenantAdminRole.id && rm.module_id === moduleId);
      if (!roleModuleExists) {
        roleModules.rows.push({
          role_id: tenantAdminRole.id,
          module_id: moduleId,
          created_at: new Date().toISOString()
        });
      }

      // 3. Find all tenant admins for the tenants assigned to this module
      const tenantAdminsQuery = await database.query(
        `SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.department_id, u.designation_id, u.supplier_id, u.user_category_id, u.created_at, ut.tenant_id
         FROM users u
         JOIN user_roles ur ON ur.user_id = u.id
         JOIN user_tenants ut ON ut.user_id = u.id
         WHERE ur.role_id = $1 AND ut.tenant_id IN (SELECT tenant_id FROM tenant_modules WHERE module_id = $2)`,
        [tenantAdminRole.id, moduleId]
      );

      if (tenantAdminsQuery.rows.length > 0) {
        // 4. Ensure these tenant admin users are in the users list
        tenantAdminsQuery.rows.forEach(adminUser => {
          const userExists = users.rows.some(u => u.id === adminUser.id);
          if (!userExists) {
            users.rows.push(adminUser);
          }

          // 5. Ensure their user_modules entry exists
          const userModExists = userModules.rows.some(um => um.user_id === adminUser.id && um.module_id === moduleId);
          if (!userModExists) {
            userModules.rows.push({
              user_id: adminUser.id,
              module_id: moduleId,
              created_at: new Date().toISOString()
            });
          }

          // 6. Ensure their user_roles entry exists
          const userRoleExists = userRoles.rows.some(ur => ur.user_id === adminUser.id && ur.role_id === tenantAdminRole.id);
          if (!userRoleExists) {
            userRoles.rows.push({
              user_id: adminUser.id,
              role_id: tenantAdminRole.id,
              created_at: new Date().toISOString()
            });
          }
        });
      }
    }

    const payload = {
      sync_type: 'identity_full_sync',
      timestamp: new Date().toISOString(),
      source: 'QAssure Super Admin',
      data: {
        tenants: tenants.rows,
        roles: roles.rows,
        departments: departments.rows,
        designations: designations.rows,
        suppliers: suppliers.rows,
        users: users.rows,
        modules: modules.rows,
        user_categories: userCategories,
        user_roles: userRoles.rows,
        user_tenants: userTenants.rows,
        tenant_modules: tenantModules.rows,
        user_modules: userModules.rows,
        role_modules: roleModules.rows,
        permissions: permissions.rows,
        tenant_module_access: tenantModuleAccess.rows
      }
    };

    // 4. Send to webhook
    try {
      console.log(`[ModuleService] Triggering identity sync to ${webhookUrl} for module ${module.module_id}`);
      
      // Use background dispatch so we don't block the API response
      setImmediate(async () => {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 30000); // 30 second timeout for full sync

          const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Sync-Action': 'identity_full_sync'
            },
            body: JSON.stringify(payload),
            signal: controller.signal
          });

          if (timeout) clearTimeout(timeout);

          if (response.ok) {
            console.log(`[ModuleService] Identity sync successful for module ${module.module_id}`);
          } else {
            const errorText = await response.text();
            console.error(`[ModuleService] Identity sync failed for module ${module.module_id}: Status ${response.status}`, errorText);
          }
        } catch (error) {
          console.error(`[ModuleService] Error during background identity sync for module ${module.module_id}:`, error.message);
        }
      });

      // Log audit event
      await this.auditService.log({
        action: 'module.identity_sync_triggered',
        user_id: userId,
        tenant_id: null, // Global action
        resource_type: 'module',
        resource_id: moduleId,
        metadata: { 
          module_id: module.module_id,
          webhook_url: webhookUrl,
          data_counts: {
            tenants: tenants.rows.length,
            roles: roles.rows.length,
            departments: departments.rows.length,
            designations: designations.rows.length,
            suppliers: suppliers.rows.length,
            users: users.rows.length,
            modules: modules.rows.length,
            user_categories: userCategories.length,
            user_roles: userRoles.rows.length,
            user_tenants: userTenants.rows.length,
            tenant_modules: tenantModules.rows.length,
            user_modules: userModules.rows.length,
            role_modules: roleModules.rows.length,
            permissions: permissions.rows.length,
            tenant_module_access: tenantModuleAccess.rows.length
          }
        }
      });

      return {
        module_id: module.module_id,
        webhook_url: webhookUrl,
        counts: {
          tenants: tenants.rows.length,
          roles: roles.rows.length,
          departments: departments.rows.length,
          designations: designations.rows.length,
          suppliers: suppliers.rows.length,
          users: users.rows.length,
          modules: modules.rows.length,
          user_categories: userCategories.length,
          user_roles: userRoles.rows.length,
          user_tenants: userTenants.rows.length,
          tenant_modules: tenantModules.rows.length,
          user_modules: userModules.rows.length,
          role_modules: roleModules.rows.length,
          permissions: permissions.rows.length,
          tenant_module_access: tenantModuleAccess.rows.length
        }
      };

    } catch (error) {
      console.error(`[ModuleService] Failed to trigger identity sync:`, error.message);
      throw error;
    }
  }

  /**
   * Reissue API key for a module and optionally update webhook URL
   */
  async reissueApiKey(id, newWebhookUrl, userId) {
    const module = await this.getById(id);
    const webhookUrl = newWebhookUrl || module.webhookurl;

    if (!webhookUrl) {
      throw new Error('No webhook URL configured for this module. Please provide one.');
    }

    // 1. Update webhook URL in database if changed
    if (newWebhookUrl && newWebhookUrl !== module.webhookurl) {
      await database.query(
        'UPDATE modules SET webhookurl = $1, updated_at = NOW() WHERE id = $2',
        [newWebhookUrl, id]
      );
    }

    // 2. Regenerate API key
    const apiKeyService = getApiKeyService();
    const modulePermissions = [
      'ai:read', 'ai:create', 'ai:update', 'ai:delete',
      'workflow:read', 'workflow:write', 'workflow:admin',
      'document:read', 'document:write',
      'capa:read', 'capa:write',
      'training:read', 'training:write',
      'supplier:read', 'supplier:write',
      'notifications:read', 'notifications:write',
      'files:read', 'files:write',
      'event_logs:read', 'event_logs:create', 'event_logs:update', 'event_logs:delete',
      'webhooks:read', 'webhooks:create', 'webhooks:update', 'webhooks:delete',
      'qms:read', 'qms:create', 'qms:update',
      'reports:read', 'reports:write',
      'projects:read', 'projects:write',
      'audit_logs:read'
    ];

    const apiKeyData = await apiKeyService.create({
      name: `Module Reissue: ${module.module_id}`,
      description: `Reissued API key for module ${module.name}`,
      permissions: modulePermissions,
      module_id: id,
      expires_at: null
    }, userId, null);

    // 3. Send to the webhook URL
    const webhookPayload = {
      module_id: module.module_id,
      uuid: module.id,
      api_key: apiKeyData.key,
      qassure_api_url: process.env.QASSURE_API_URL || `http://localhost:${process.env.PORT}/api/v1`,
      message: {
        info: "API key was reissued. This is your new API key.",
        warning: "Save this key securely. It will not be shown again."
      }
    };

    console.log(`[ModuleService] Sending reissued API key to ${webhookUrl}`);
    
    // Background dispatch
    setImmediate(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);
        
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookPayload),
          signal: controller.signal
        });
        
        clearTimeout(timeout);
      } catch (err) {
        console.error(`[ModuleService] Failed to send reissued API key to ${webhookUrl}:`, err.message);
      }
    });

    // 4. Log audit event
    await this.auditService.log({
      action: 'module.reissue_api_key',
      user_id: userId,
      tenant_id: module.tenant_id,
      resource_type: 'module',
      resource_id: id,
      metadata: { webhook_url: webhookUrl }
    });

    return {
      success: true,
      api_key: {
        id: apiKeyData.id,
        key: apiKeyData.key,
        key_prefix: apiKeyData.key_prefix
      }
    };
  }
  /**
   * Broadcast an identity update to all modules that have a sync webhook configured
   * @param {string} action - 'create', 'update', or 'delete'
   * @param {string} entityType - e.g., 'user', 'role', 'tenant', 'user_role'
   * @param {object} data - The updated data record
   * @param {string} userId - ID of the user performing the action
   */
  async sendIdentityUpdate(action, entityType, data, userId) {
    try {
      const id = Array.isArray(data) ? (data[0]?.id || data[0]) : (data?.id || data);
      const tenantId = data?.tenant_id || data?.[0]?.tenant_id;
      const roleId = data?.role_id || data?.[0]?.role_id;
      const moduleIdField = data?.module_id || data?.[0]?.module_id;

      // Find associated module IDs based on the entity type and the updated data
      let targetModuleIds = [];

      if (entityType === 'module') {
        if (id) targetModuleIds = [id];
      } else if (entityType === 'tenant_module' || entityType === 'user_module' || entityType === 'role_module' || entityType === 'tenant_module_access') {
        if (moduleIdField) {
          targetModuleIds = [moduleIdField];
        }
      } else if (entityType === 'tenant') {
        if (id) {
          const tmResult = await database.query('SELECT module_id FROM tenant_modules WHERE tenant_id = $1', [id]);
          targetModuleIds = tmResult.rows.map(r => r.module_id);
        }
      } else if (entityType === 'role') {
        if (id) {
          const rmResult = await database.query('SELECT module_id FROM role_modules WHERE role_id = $1', [id]);
          targetModuleIds = rmResult.rows.map(r => r.module_id);
        }
      } else if (entityType === 'permission') {
        if (roleId) {
          const rmResult = await database.query('SELECT module_id FROM role_modules WHERE role_id = $1', [roleId]);
          targetModuleIds = rmResult.rows.map(r => r.module_id);
        }
      } else if (entityType === 'department' || entityType === 'designation' || entityType === 'supplier') {
        if (tenantId) {
          const tmResult = await database.query('SELECT module_id FROM tenant_modules WHERE tenant_id = $1', [tenantId]);
          targetModuleIds = tmResult.rows.map(r => r.module_id);
        }
      } else if (entityType === 'user') {
        if (id) {
          const umResult = await database.query('SELECT module_id FROM user_modules WHERE user_id = $1', [id]);
          const utmResult = await database.query(
            'SELECT module_id FROM tenant_modules WHERE tenant_id IN (SELECT tenant_id FROM user_tenants WHERE user_id = $1)',
            [id]
          );
          targetModuleIds = [...new Set([...umResult.rows.map(r => r.module_id), ...utmResult.rows.map(r => r.module_id)])];
        }
      } else if (entityType === 'user_role') {
        if (roleId) {
          const rmResult = await database.query('SELECT module_id FROM role_modules WHERE role_id = $1', [roleId]);
          targetModuleIds = rmResult.rows.map(r => r.module_id);
        }
      } else if (entityType === 'user_tenant') {
        if (tenantId) {
          const tmResult = await database.query('SELECT module_id FROM tenant_modules WHERE tenant_id = $1', [tenantId]);
          targetModuleIds = tmResult.rows.map(r => r.module_id);
        }
      }

      if (targetModuleIds.length === 0) {
        return; // No associated modules to notify
      }

      // Find modules from targetModuleIds that have a sync_webhook_url defined
      const result = await database.query(
        "SELECT id, module_id, sync_webhook_url FROM modules WHERE sync_webhook_url IS NOT NULL AND sync_webhook_url != '' AND id = ANY($1::uuid[])",
        [targetModuleIds]
      );
      const modulesWithWebhooks = result.rows;

      if (modulesWithWebhooks.length === 0) {
        return; // No modules to notify
      }

      let tableName = entityType;
      if (entityType === 'tenant') tableName = 'tenants';
      else if (entityType === 'role') tableName = 'roles';
      else if (entityType === 'department') tableName = 'departments';
      else if (entityType === 'designation') tableName = 'designations';
      else if (entityType === 'supplier') tableName = 'suppliers';
      else if (entityType === 'user') tableName = 'users';
      else if (entityType === 'module') tableName = 'modules';
      else if (entityType === 'user_category') tableName = 'user_categories';
      else if (entityType === 'user_role') tableName = 'user_roles';
      else if (entityType === 'user_tenant') tableName = 'user_tenants';
      else if (entityType === 'tenant_module') tableName = 'tenant_modules';
      else if (entityType === 'user_module') tableName = 'user_modules';
      else if (entityType === 'role_module') tableName = 'role_modules';
      else if (entityType === 'permission') tableName = 'permissions';
      else if (entityType === 'tenant_module_access') tableName = 'tenant_module_access';
      else if (!tableName.endsWith('s') && tableName !== 'tenant_module_access') tableName += 's';

      let dataKey = tableName;
      let finalData = [];

      // Logic to fetch raw data based on action and entity type
      if (action === 'delete') {
        finalData = Array.isArray(data) ? data : [data];
      } else {
        try {
          const ids = Array.isArray(data) ? (typeof data[0] === 'string' ? data : data.map(d => d.id)) : [(typeof data === 'string' ? data : data.id)];
          
          if (ids.length > 0 && ids[0]) {
            let query = `SELECT * FROM ${tableName} WHERE id IN ($1)`;
            if (tableName === 'users') {
              query = `SELECT id, email, first_name, last_name, status, department_id, designation_id, supplier_id, user_category_id, created_at FROM users WHERE id IN ($1)`;
            }
            
            const dbResult = await database.query(query.replace('$1', ids.map((_, i) => `$${i + 1}`).join(', ')), ids);
            finalData = dbResult.rows;
          } else if (data && typeof data === 'object') {
            finalData = [data];
          }
        } catch (err) {
          console.warn(`[ModuleService] Could not fetch raw data for ${entityType}:`, err.message);
          finalData = Array.isArray(data) ? data : [data];
        }
      }

      const payload = {
        sync_type: 'identity_partial_update',
        action: action,
        entity_type: entityType,
        timestamp: new Date().toISOString(),
        source: 'QAssure Super Admin',
        data: {
          [dataKey]: finalData
        }
      };

      // Fetch related data if needed
      if (action !== 'delete' && finalData.length > 0) {
        const recordIds = finalData.map(d => d.id).filter(Boolean);
        
        if (entityType === 'user') {
          const urResult = await database.query('SELECT * FROM user_roles WHERE user_id = ANY($1::uuid[])', [recordIds]);
          const utResult = await database.query('SELECT * FROM user_tenants WHERE user_id = ANY($1::uuid[])', [recordIds]);
          const umResult = await database.query('SELECT * FROM user_modules WHERE user_id = ANY($1::uuid[])', [recordIds]);
          
          payload.data.user_roles = urResult.rows;
          payload.data.user_tenants = utResult.rows;
          payload.data.user_modules = umResult.rows;

          const deptIds = [...new Set(finalData.map(d => d.department_id).filter(Boolean))];
          const desigIds = [...new Set(finalData.map(d => d.designation_id).filter(Boolean))];
          const suppIds = [...new Set(finalData.map(d => d.supplier_id).filter(Boolean))];

          if (deptIds.length > 0) {
            const deptResult = await database.query('SELECT * FROM departments WHERE id = ANY($1::uuid[])', [deptIds]);
            payload.data.departments = deptResult.rows;
          }
          if (desigIds.length > 0) {
            const desigResult = await database.query('SELECT * FROM designations WHERE id = ANY($1::uuid[])', [desigIds]);
            payload.data.designations = desigResult.rows;
          }
          if (suppIds.length > 0) {
            const suppResult = await database.query('SELECT * FROM suppliers WHERE id = ANY($1::uuid[])', [suppIds]);
            payload.data.suppliers = suppResult.rows;
          }
        } 
        else if (entityType === 'role') {
          const permResult = await database.query('SELECT * FROM permissions WHERE role_id = ANY($1::uuid[])', [recordIds]);
          const rmResult = await database.query('SELECT * FROM role_modules WHERE role_id = ANY($1::uuid[])', [recordIds]);
          
          payload.data.permissions = permResult.rows;
          payload.data.role_modules = rmResult.rows;
        } 
        else if (entityType === 'tenant') {
          const tmResult = await database.query('SELECT * FROM tenant_modules WHERE tenant_id = ANY($1::uuid[])', [recordIds]);
          const deptResult = await database.query('SELECT * FROM departments WHERE tenant_id = ANY($1::uuid[])', [recordIds]);
          const desigResult = await database.query('SELECT * FROM designations WHERE tenant_id = ANY($1::uuid[])', [recordIds]);
          const suppResult = await database.query('SELECT * FROM suppliers WHERE tenant_id = ANY($1::uuid[])', [recordIds]);
          
          payload.data.tenant_modules = tmResult.rows;
          payload.data.departments = deptResult.rows;
          payload.data.designations = desigResult.rows;
          payload.data.suppliers = suppResult.rows;
        }
        else if (entityType === 'user_role') {
          const userIds = [...new Set(finalData.map(d => d.user_id).filter(Boolean))];
          const roleIds = [...new Set(finalData.map(d => d.role_id).filter(Boolean))];

          if (userIds.length > 0) {
            const uResult = await database.query(
              'SELECT id, email, first_name, last_name, status, department_id, designation_id, supplier_id, user_category_id, created_at FROM users WHERE id = ANY($1::uuid[])',
              [userIds]
            );
            payload.data.users = uResult.rows;
          }
          if (roleIds.length > 0) {
            const rResult = await database.query('SELECT * FROM roles WHERE id = ANY($1::uuid[])', [roleIds]);
            payload.data.roles = rResult.rows;
          }
        }
        else if (entityType === 'user_tenant') {
          const userIds = [...new Set(finalData.map(d => d.user_id).filter(Boolean))];
          const tenantIds = [...new Set(finalData.map(d => d.tenant_id).filter(Boolean))];

          if (userIds.length > 0) {
            const uResult = await database.query(
              'SELECT id, email, first_name, last_name, status, department_id, designation_id, supplier_id, user_category_id, created_at FROM users WHERE id = ANY($1::uuid[])',
              [userIds]
            );
            payload.data.users = uResult.rows;
          }
          if (tenantIds.length > 0) {
            const tResult = await database.query('SELECT * FROM tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
            payload.data.tenants = tResult.rows;
          }
        }
        else if (entityType === 'tenant_module' || entityType === 'user_module' || entityType === 'role_module' || entityType === 'tenant_module_access') {
          const moduleIds = [...new Set(finalData.map(d => d.module_id).filter(Boolean))];
          if (moduleIds.length > 0) {
            const mResult = await database.query('SELECT * FROM modules WHERE id = ANY($1::uuid[])', [moduleIds]);
            payload.data.modules = mResult.rows;
          }

          if (entityType === 'user_module') {
            const userIds = [...new Set(finalData.map(d => d.user_id).filter(Boolean))];
            if (userIds.length > 0) {
              const uResult = await database.query(
                'SELECT id, email, first_name, last_name, status, department_id, designation_id, supplier_id, user_category_id, created_at FROM users WHERE id = ANY($1::uuid[])',
                [userIds]
              );
              payload.data.users = uResult.rows;
            }
          } else if (entityType === 'tenant_module' || entityType === 'tenant_module_access') {
            const tenantIds = [...new Set(finalData.map(d => d.tenant_id).filter(Boolean))];
            if (tenantIds.length > 0) {
              const tResult = await database.query('SELECT * FROM tenants WHERE id = ANY($1::uuid[])', [tenantIds]);
              payload.data.tenants = tResult.rows;
            }
          } else if (entityType === 'role_module') {
            const roleIds = [...new Set(finalData.map(d => d.role_id).filter(Boolean))];
            if (roleIds.length > 0) {
              const rResult = await database.query('SELECT * FROM roles WHERE id = ANY($1::uuid[])', [roleIds]);
              payload.data.roles = rResult.rows;
            }
          }
        }

      // =======================================================================
      // Dynamic Tenant Admin Access Sync Post-Processing
      // =======================================================================
      // Ensure that if a tenant admin exists, they are automatically granted
      // full module and role permissions/assignments for their tenant.
      
      // Ensure payload.data arrays exist if we need to add to them
      if (!payload.data.users) payload.data.users = [];
      if (!payload.data.user_roles) payload.data.user_roles = [];
      if (!payload.data.user_modules) payload.data.user_modules = [];
      if (!payload.data.roles) payload.data.roles = [];
      if (!payload.data.role_modules) payload.data.role_modules = [];

      // Find tenant_admin role from DB to have its exact details
      const tenantAdminRoleQuery = await database.query("SELECT * FROM roles WHERE code = 'tenant_admin' LIMIT 1");
      const tenantAdminRole = tenantAdminRoleQuery.rows[0];

      if (tenantAdminRole) {
        // Ensure tenant_admin role is in roles array if any roles are present
        const roleExists = payload.data.roles.some(r => r.id === tenantAdminRole.id);
        if (!roleExists) {
          payload.data.roles.push(tenantAdminRole);
        }

        // 1. If we are creating/updating a user, check if they are tenant_admin
        const allUserIds = [
          ...(entityType === 'user' ? finalData.map(d => d.id) : []),
          ...(payload.data.users ? payload.data.users.map(u => u.id) : [])
        ].filter(Boolean);

        if (allUserIds.length > 0) {
          // Fetch any tenant admins among these users
          const adminUsersQuery = await database.query(
            `SELECT u.id, ut.tenant_id
             FROM users u
             JOIN user_roles ur ON ur.user_id = u.id
             JOIN user_tenants ut ON ut.user_id = u.id
             WHERE ur.role_id = $1 AND u.id = ANY($2::uuid[])`,
            [tenantAdminRole.id, allUserIds]
          );
          
          const adminUserIds = adminUsersQuery.rows.map(u => u.id);
          const adminUserTenantIds = [...new Set(adminUsersQuery.rows.map(u => u.tenant_id))];

          if (adminUserIds.length > 0) {
            // Synthesize user_roles entries
            adminUserIds.forEach(uId => {
              const roleExists = payload.data.user_roles.some(ur => ur.user_id === uId && ur.role_id === tenantAdminRole.id);
              if (!roleExists) {
                payload.data.user_roles.push({
                  user_id: uId,
                  role_id: tenantAdminRole.id,
                  created_at: new Date().toISOString()
                });
              }
            });

            // Fetch tenant assigned modules
            const tenantModsQuery = await database.query(
              'SELECT tenant_id, module_id FROM tenant_modules WHERE tenant_id = ANY($1::uuid[])',
              [adminUserTenantIds]
            );

            // Synthesize user_modules entries
            adminUsersQuery.rows.forEach(adminUser => {
              const adminMods = tenantModsQuery.rows.filter(tm => tm.tenant_id === adminUser.tenant_id);
              adminMods.forEach(tm => {
                const modExists = payload.data.user_modules.some(um => um.user_id === adminUser.id && um.module_id === tm.module_id);
                if (!modExists) {
                  payload.data.user_modules.push({
                    user_id: adminUser.id,
                    module_id: tm.module_id,
                    created_at: new Date().toISOString()
                  });
                }
              });
            });
          }
        }

        // 2. If a tenant_module or tenant is created/updated, add all the tenant's admins
        const affectedTenantIds = [
          ...(entityType === 'tenant' ? finalData.map(d => d.id) : []),
          ...(entityType === 'tenant_module' ? finalData.map(d => d.tenant_id) : []),
          ...(payload.data.tenants ? payload.data.tenants.map(t => t.id) : [])
        ].filter(Boolean);

        if (affectedTenantIds.length > 0) {
          // Find all tenant admins for these tenants
          const tenantAdminsQuery = await database.query(
            `SELECT u.id, u.email, u.first_name, u.last_name, u.status, u.department_id, u.designation_id, u.supplier_id, u.user_category_id, ut.tenant_id, u.created_at
             FROM users u
             JOIN user_roles ur ON ur.user_id = u.id
             JOIN user_tenants ut ON ut.user_id = u.id
             WHERE ur.role_id = $1 AND ut.tenant_id = ANY($2::uuid[])`,
            [tenantAdminRole.id, affectedTenantIds]
          );

          if (tenantAdminsQuery.rows.length > 0) {
            // Append tenant admin users to payload
            tenantAdminsQuery.rows.forEach(adminUser => {
              const userExists = payload.data.users.some(u => u.id === adminUser.id);
              if (!userExists) {
                payload.data.users.push(adminUser);
              }

              // Ensure their user_role links to tenant_admin
              const roleExists = payload.data.user_roles.some(ur => ur.user_id === adminUser.id && ur.role_id === tenantAdminRole.id);
              if (!roleExists) {
                payload.data.user_roles.push({
                  user_id: adminUser.id,
                  role_id: tenantAdminRole.id,
                  created_at: new Date().toISOString()
                });
              }
            });

            // Fetch modules for these tenants
            const tenantModsQuery = await database.query(
              'SELECT tenant_id, module_id FROM tenant_modules WHERE tenant_id = ANY($1::uuid[])',
              [affectedTenantIds]
            );

            // Synthesize user_modules entries
            tenantAdminsQuery.rows.forEach(adminUser => {
              const adminMods = tenantModsQuery.rows.filter(tm => tm.tenant_id === adminUser.tenant_id);
              adminMods.forEach(tm => {
                const modExists = payload.data.user_modules.some(um => um.user_id === adminUser.id && um.module_id === tm.module_id);
                if (!modExists) {
                  payload.data.user_modules.push({
                    user_id: adminUser.id,
                    module_id: tm.module_id,
                    created_at: new Date().toISOString()
                  });
                }
              });
            });
          }
        }
      }

      // Cleanup empty payload arrays to keep the broadcast neat
      if (payload.data.users && payload.data.users.length === 0) delete payload.data.users;
      if (payload.data.user_roles && payload.data.user_roles.length === 0) delete payload.data.user_roles;
      if (payload.data.user_modules && payload.data.user_modules.length === 0) delete payload.data.user_modules;
      if (payload.data.roles && payload.data.roles.length === 0) delete payload.data.roles;
      if (payload.data.role_modules && payload.data.role_modules.length === 0) delete payload.data.role_modules;
      }

      // Broadcast to associated endpoints
      const promises = modulesWithWebhooks.map(module => {
        return new Promise(resolve => {
          setImmediate(async () => {
            try {
              const controller = new AbortController();
              const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

              const response = await fetch(module.sync_webhook_url, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'X-Sync-Action': 'identity_partial_update'
                },
                body: JSON.stringify(payload),
                signal: controller.signal
              });

              if (timeout) clearTimeout(timeout);

              if (!response.ok) {
                console.error(`[ModuleService] Partial identity sync failed for module ${module.module_id}: Status ${response.status}`);
              }
            } catch (error) {
              console.error(`[ModuleService] Error during partial identity sync for module ${module.module_id}:`, error.message);
            }
            resolve();
          });
        });
      });

      Promise.all(promises).catch(err => {
        console.error('[ModuleService] Error broadcasting identity update:', err);
      });

    } catch (error) {
      console.error(`[ModuleService] Failed to initialize identity update broadcast:`, error.message);
    }
  }
}

// Singleton
let instance = null;
const getModuleService = () => {
  if (!instance) {
    instance = new ModuleService();
  }
  return instance;
};

module.exports = { ModuleService, getModuleService, MODULE_STATES, STATE_TRANSITIONS };
