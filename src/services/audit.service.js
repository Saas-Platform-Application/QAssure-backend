/**
 * Audit Service - QAssure Platform
 * Records all security-relevant actions for compliance (FDA 21 CFR Part 11)
 */
const crypto = require('crypto');
const database = require('../config/database');

class AuditService {
  constructor() {
    this.RETENTION_YEARS = 7; // FDA Part 11 requirement
  }

  /**
   * Log an audit event
   */
  async log(event) {
    const { resource_type } = event;

    // Optional: Check if tracking is enabled for this resource type
    // We do a fast check against the resource_types table
    try {
      const trackingCheck = await database.query(
        'SELECT audit_log_tracking FROM audit_log_resource_types WHERE name = $1 LIMIT 1',
        [resource_type]
      );
      
      // If we found a record and tracking is disabled, return early
      if (trackingCheck.rows.length > 0 && trackingCheck.rows[0].audit_log_tracking === false) {
        return null;
      }
    } catch (err) {
      // If table doesn't exist yet or query fails, default to logging
      console.warn('[AuditService] Tracking check failed, defaulting to log:', err.message);
    }

    const {
      action,           // e.g., 'user.login', 'document.update', 'permission.change'
      user_id,          // User ID who performed the action
      tenant_id,        // Tenant context
      // resource_type extracted above
      resource_id,      // ID of the affected resource
      module_id,        // Module ID (top-level)
      request_method,   // HTTP method
      request_path,     // Request path
      request_body,     // Request payload (sanitized)
      response_status,  // HTTP response status
      response_body,    // Response payload (sanitized)
      changes,          // What changed (old/new values)
      metadata,         // Additional context
      ip_address,       // Client IP
      user_agent,       // Client user agent
      correlation_id    // Request correlation ID
    } = event;

    const auditId = crypto.randomUUID();

    // Ensure module_id is captured if present in metadata
    const finalModuleId = module_id || metadata?.module_id || null;

    const query = `
      INSERT INTO audit_logs (
        id, action, user_id, tenant_id,
        resource_type, resource_id, module_id,
        request_method, request_path, request_body,
        response_status, response_body,
        changes, metadata,
        ip_address, user_agent, correlation_id,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4,
        $5, $6, $7,
        $8, $9, $10,
        $11, $12,
        $13, $14,
        $15, $16, $17,
        NOW(), NOW()
      )
      RETURNING *
    `;

    const values = [
      auditId,
      action,
      user_id || null,
      tenant_id || null,
      resource_type,
      resource_id || null,
      finalModuleId,
      request_method || null,
      request_path || null,
      request_body ? JSON.stringify(this._sanitizeBody(request_body)) : null,
      response_status || null,
      response_body ? JSON.stringify(this._sanitizeBody(response_body)) : null,
      changes ? JSON.stringify(changes) : null,
      metadata ? JSON.stringify(metadata) : null,
      ip_address || null,
      user_agent || null,
      correlation_id || null
    ];

    try {
      const result = await database.query(query, values);
      const logEntry = result.rows[0];

      if (logEntry && tenant_id) {
        try {
          const { IndexingHooks } = require('../infrastructure/search/indexing.hooks');
          IndexingHooks.indexAuditLog(logEntry, tenant_id);
        } catch (esError) {
          console.error('[AuditService] Failed to index audit log in Elasticsearch:', esError.message);
        }
      }

      return logEntry;
    } catch (error) {
      // Audit logging should never fail silently
      console.error('[AuditService] Failed to log audit event:', error);
      console.error('[AuditService] Event data:', JSON.stringify(event));
      // Don't throw - audit failures shouldn't break the app
      return null;
    }
  }

  /**
   * Sanitize request/response bodies (remove sensitive data)
   */
  _sanitizeBody(body) {
    if (!body || typeof body !== 'object') return body;
    
    const sanitized = { ...body };
    const sensitiveFields = ['password', 'password_hash', 'token', 'secret', 'api_key', 'key'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Query audit logs with filters
   */
  async query(filters = {}, options = {}) {
    const {
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      module_id,
      start_date,
      end_date,
      search
    } = filters;

    const { page = 1, limit = 50, sort_by = 'created_at', sort_order = 'DESC' } = options;
    const offset = (page - 1) * limit;

    // 1. Build common WHERE clause
    let whereClause = ' WHERE 1=1';
    const params = [];
    let paramCount = 0;

    if (tenant_id) {
      paramCount++;
      whereClause += ` AND al.tenant_id = $${paramCount}`;
      params.push(tenant_id);
    }

    if (user_id) {
      paramCount++;
      whereClause += ` AND al.user_id = $${paramCount}`;
      params.push(user_id);
    }

    if (action) {
      paramCount++;
      whereClause += ` AND al.action LIKE $${paramCount}`;
      params.push(`%${action}%`);
    }

    if (resource_type) {
      paramCount++;
      whereClause += ` AND al.resource_type = $${paramCount}`;
      params.push(resource_type);
    }

    if (resource_id) {
      paramCount++;
      whereClause += ` AND al.resource_id = $${paramCount}`;
      params.push(resource_id);
    }

    if (module_id) {
      paramCount++;
      whereClause += ` AND al.module_id = $${paramCount}`;
      params.push(module_id);
    }
    
    if (start_date) {
      paramCount++;
      whereClause += ` AND al.created_at >= $${paramCount}`;
      params.push(new Date(start_date));
    }

    if (end_date) {
      paramCount++;
      whereClause += ` AND al.created_at <= $${paramCount}`;
      params.push(new Date(end_date));
    }

    if (search) {
      paramCount++;
      whereClause += ` AND (al.action ILIKE $${paramCount} OR al.resource_type ILIKE $${paramCount})`;
      params.push(`%${search}%`);
    }

    // 2. Sorting logic
    const validSortColumns = ['created_at', 'action', 'resource_type'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    // 3. Main Data Query
    const dataQuery = `
      SELECT 
        al.id, al.action, al.user_id, al.tenant_id,
        al.resource_type, al.resource_id, al.module_id,
        al.request_method, al.request_path,
        al.response_status, al.changes, al.metadata,
        al.ip_address, al.user_agent, al.correlation_id,
        al.created_at,
        u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      ${whereClause}
      ORDER BY al.${sortColumn} ${sortDir}
      LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
    `;

    const dataParams = [...params, limit, offset];
    const result = await database.query(dataQuery, dataParams);

    // 4. Count Query (using the same whereClause and params)
    const countQuery = `SELECT COUNT(*) FROM audit_logs al ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Get audit log by ID
   */
  async getById(id) {
    const query = `
      SELECT al.*, u.email as user_email
      FROM audit_logs al
      LEFT JOIN users u ON u.id = al.user_id
      WHERE al.id = $1
    `;
    const result = await database.query(query, [id]);
    
    if (result.rows.length === 0) {
      throw new Error('Audit log not found');
    }

    return result.rows[0];
  }

  /**
   * Get audit statistics
   */
  async getStats(tenantId, days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const query = `
      SELECT 
        action,
        COUNT(*) as count,
        DATE_TRUNC('day', created_at) as date
      FROM audit_logs
      WHERE tenant_id = $1 AND created_at >= $2
      GROUP BY action, DATE_TRUNC('day', created_at)
      ORDER BY date DESC
    `;

    const result = await database.query(query, [tenantId, startDate]);

    // Summarize
    const summary = {
      total: 0,
      by_action: {},
      by_day: {}
    };

    for (const row of result.rows) {
      summary.total += parseInt(row.count);
      
      if (!summary.by_action[row.action]) {
        summary.by_action[row.action] = 0;
      }
      summary.by_action[row.action] += parseInt(row.count);
      
      const dateKey = row.date.toISOString().split('T')[0];
      if (!summary.by_day[dateKey]) {
        summary.by_day[dateKey] = 0;
      }
      summary.by_day[dateKey] += parseInt(row.count);
    }

    return summary;
  }

  // ==================== Convenience Methods ====================

  /**
   * Log authentication event
   */
  async logAuth(type, userId, tenantId, success, req = {}) {
    return this.log({
      action: `auth.${type}`,
      user_id: userId,
      tenant_id: tenantId,
      resource_type: 'session',
      response_status: success ? 200 : 401,
      metadata: { success },
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers?.['user-agent'],
      correlation_id: req.correlationId
    });
  }

  /**
   * Log resource change
   */
  async logChange(action, userId, tenantId, resourceType, resourceId, changes, req = {}) {
    return this.log({
      action,
      user_id: userId,
      tenant_id: tenantId,
      resource_type: resourceType,
      resource_id: resourceId,
      request_method: req.method,
      request_path: req.path,
      changes,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers?.['user-agent'],
      correlation_id: req.correlationId
    });
  }

  /**
   * Log API request (for middleware)
   */
  async logRequest(req, res, responseBody = null) {
    return this.log({
      action: `api.${req.method.toLowerCase()}`,
      user_id: req.user?.id,
      tenant_id: req.user?.tenantId,
      resource_type: this._getResourceType(req.path),
      request_method: req.method,
      request_path: req.path,
      request_body: req.body,
      response_status: res.statusCode,
      response_body: responseBody,
      ip_address: req.ip || req.connection?.remoteAddress,
      user_agent: req.headers?.['user-agent'],
      correlation_id: req.correlationId
    });
  }

  /**
   * Extract resource type from path
   */
  _getResourceType(path) {
    if (!path) return 'unknown';
    const parts = path.split('/').filter(p => p && !p.match(/^v\d+$/));
    return parts[1] || parts[0] || 'unknown';
  }
}

// Singleton
let instance = null;
const getAuditService = () => {
  if (!instance) {
    instance = new AuditService();
  }
  return instance;
};

module.exports = { AuditService, getAuditService };
