const Auditlog = require('../sequelize-models/audit_log');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class AuditlogService {
  /**
   * Get all auditlogs
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy, include = [] } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Auditlog.findAndCountAll({
        where,
        limit: take,
        offset: skip,
        order: order,
        include: include,
      });

      return {
        data: rows,
        total: count,
        skip,
        take,
        hasMore: skip + take < count
      };
    } catch (error) {
      throw new Error(`Failed to fetch auditlogs: ${error.message}`);
    }
  }

  /**
   * Get auditlog by ID
   */
  async findById(id) {
    // First check existence before wrapping in generic error
    const auditlog = await Auditlog.findByPk(id, {
      include: [
        {
          association: 'user',
          attributes: ['id', 'email', 'first_name', 'last_name']
        },
        {
          association: 'tenant',
          attributes: ['id', 'name']
        },
        {
          association: 'module',
          attributes: ['id', 'name']
        }
      ]
    });

    if (!auditlog) {
      // Typed so controllers can distinguish 404 from 500
      const err = new Error('Audit log not found');
      err.statusCode = 404;
      err.code = 'NOT_FOUND';
      throw err;
    }

    return auditlog;
  }

  /**
   * Create new auditlog
   */
  async create(data) {
    try {
      // Validate correlation_id (required business rule — also enforced by Zod schema)
      this.hasCorrelationId(data, null);

      // NOTE: validateAction(), validateResourceType(), validateMethod(), validateStatus()
      // are intentionally NOT called here. Production data contains free-form values
      // (e.g. APPROVE, REJECT, ai.completion) that pre-date and extend the allowed lists.
      // Resource type validation is handled correctly in the controller via a DB lookup.
      // These helper functions have been removed to prevent false security and crashes.

      // NOTE: getPartitionName() removed — partition_name column does not exist in the
      // Sequelize model or the database table. Was silently discarded on every insert.

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const auditlog = await Auditlog.create(data);

      return auditlog;
    } catch (error) {
      // Re-throw typed errors (e.g. correlation_id missing) as-is
      if (error.statusCode) throw error;
      throw new Error(`Failed to create auditlog: ${error.message}`);
    }
  }

  /**
   * Update auditlog
   */
  async update(id, data) {
    try {
      // findById now throws a typed 404 error if not found
      const auditlog = await this.findById(id);

      await auditlog.update(data);
      await auditlog.reload();

      return auditlog;
    } catch (error) {
      if (error.statusCode) throw error;
      throw new Error(`Failed to update auditlog: ${error.message}`);
    }
  }

  /**
   * Delete auditlog
   */
  async delete(id) {
    try {
      // findById throws typed 404 if not found
      const auditlog = await this.findById(id);

      // Enforce 7-year retention policy before deletion
      this.shouldRetain(auditlog);

      await auditlog.destroy();

      return { message: 'Auditlog deleted successfully' };
    } catch (error) {
      if (error.statusCode) throw error;
      throw new Error(`Failed to delete auditlog: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Audit logs must have correlation ID
   * Kept active — called in create().
   */
  hasCorrelationId(data, existing) {
    const auditlog = existing ? Object.assign({}, existing, data) : data;
    if (auditlog.correlation_id == null || auditlog.correlation_id.length === 0) {
      const err = new Error('Correlation ID is required for audit logs');
      err.statusCode = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
  }

  /**
   * Enforce 7-year retention policy before deletion.
   * Uses calendar-accurate date arithmetic to handle leap years.
   * Guards against null created_at gracefully.
   */
  shouldRetain(auditlog) {
    if (!auditlog.created_at) {
      // Cannot determine retention without a creation date — allow deletion
      return;
    }

    const createdDate = new Date(auditlog.created_at);
    if (isNaN(createdDate.getTime())) {
      // Unparseable date — allow deletion rather than crashing
      return;
    }

    // Calendar-accurate 7-year threshold (handles leap years)
    const retentionThreshold = new Date(createdDate);
    retentionThreshold.setFullYear(retentionThreshold.getFullYear() + 7);

    if (new Date() < retentionThreshold) {
      throw new Error('Audit log cannot be deleted before the 7-year retention period has elapsed');
    }
  }

  // NOTE: validateAction(), validateResourceType(), validateMethod(), validateStatus()
  // have been removed (Issue 5 + Issue 12).
  //
  // Reason: These functions were never called (dead code) and wiring them in would
  // immediately break the existing system:
  //   - Production data contains actions like APPROVE, REJECT, ai.completion,
  //     module.launch_token_verification_failed — none of which are in the old
  //     hardcoded allowed list ['CREATE','READ','UPDATE','DELETE','LOGIN','LOGOUT','API_CALL'].
  //   - validateResourceType() used a hardcoded list out of sync with the dynamic
  //     audit_log_resource_types DB table. The controller already validates resource_type
  //     correctly via a live DB lookup.
  // Decision (per client findings document): Remove functions; document fields as
  // intentionally free-form for action/method/status with DB-driven validation for resource_type.
  //
  // NOTE: getPartitionName() has also been removed (Issue 6).
  // The partition_name column does not exist in the Sequelize model or the database table.
  // The value was silently discarded on every insert.

  // =========== Custom Service Methods ===========
  /**
   * Get audit log details
   * GET /api/v1/audit/logs/:logId
   */
  async findOne(logId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Auditlog;
      const entityName = 'Auditlog';
      const entityNameCamel = 'auditlog';
      // Find entity by first parameter (e.g., moduleId, userId, etc.)
      // Try to find using query method if available (e.g., findByModuleId)
      // Fallback: Find by field using findAll
      const results = await EntityModel.findAll({
        where: {
          logId: logId
        }
      });
      if (!results || results.length === 0) {
        throw new Error(`${entityName} not found`);
      }
      return results[0];
    } catch (error) {
      throw new Error(`Failed to execute findOne: ${error.message}`);
    }
  }
  /**
   * Export audit logs
   * GET /api/v1/audit/logs/export
   */
  async export(queryParams) {
    try {
      const { getAuditService } = require('./audit.service');
      const auditService = getAuditService();
      const filters = {
        tenant_id:  queryParams.tenantId,
        start_date: queryParams.startDate,
        end_date:   queryParams.endDate,
      };

      const EXPORT_LIMIT = 10000;
      const result = await auditService.query(filters, { limit: EXPORT_LIMIT, page: 1 });
      const total = result.pagination.total;
      const truncated = total > EXPORT_LIMIT;

      return {
        format:    queryParams.format || 'json',
        total,
        exported:  result.data.length,
        truncated,
        ...(truncated && {
          warning: `Results limited to ${EXPORT_LIMIT.toLocaleString()} records. Use date filters to narrow the export and retrieve all data.`
        }),
        records: result.data
      };
    } catch (error) {
      throw new Error(`Failed to execute export: ${error.message}`);
    }
  }
  /**
   * Get audit statistics
   * GET /api/v1/audit/stats
   */
  async getStats(params) {
    try {
      const { tenantId, startDate, endDate } = params || {};
      const days = (startDate && endDate)
        ? Math.max(1, Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)))
        : 30;

      // If no tenantId (super admin cross-tenant) — query directly without tenant filter
      if (!tenantId) {
        const database = require('../config/database');
        const startDate2 = new Date();
        startDate2.setDate(startDate2.getDate() - days);
        const query = `
          SELECT 
            COUNT(*) as total,
            action,
            DATE(created_at) as day
          FROM audit_logs
          WHERE created_at >= $1
          GROUP BY action, DATE(created_at)
          ORDER BY day DESC
        `;
        const result = await database.query(query, [startDate2]);
        //const total = result.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
        const total = result.rows.reduce((sum, r) => sum + parseInt(r.total), 0);
        const by_action = {};
        const by_day = {};
        result.rows.forEach(r => {
          by_action[r.action] = (by_action[r.action] || 0) + parseInt(r.total);
          const day = r.day.toISOString().split('T')[0];
          by_day[day] = (by_day[day] || 0) + parseInt(r.total);
        });
        return { total, by_action, by_day };
      }

      const { getAuditService } = require('./audit.service');
      const auditService = getAuditService();
      return await auditService.getStats(tenantId, days);
    } catch (error) {
      throw new Error(`Failed to execute getStats: ${error.message}`);
    }
  }

  // =========== Query Methods (findBy*) ===========
  /**
   * Find auditlogs by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Auditlog.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by user_id
   */
  async findByUserId(user_id) {
    try {
      const results = await Auditlog.findAll({
        where: {
          user_id: user_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by user_id: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by action
   */
  async findByAction(action) {
    try {
      const results = await Auditlog.findAll({
        where: {
          action: action
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by action: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by resource_type
   */
  async findByResourceType(resource_type) {
    try {
      const results = await Auditlog.findAll({
        where: {
          resource_type: resource_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by resource_type: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by resource_id
   */
  async findByResourceId(resource_id) {
    try {
      const results = await Auditlog.findAll({
        where: {
          resource_id: resource_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by resource_id: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by request_method
   */
  async findByRequestMethod(request_method) {
    try {
      const results = await Auditlog.findAll({
        where: {
          request_method: request_method
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by request_method: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by request_path
   */
  async findByRequestPath(request_path) {
    try {
      const results = await Auditlog.findAll({
        where: {
          request_path: request_path
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by request_path: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by request_body
   */
  async findByRequestBody(request_body) {
    try {
      const results = await Auditlog.findAll({
        where: {
          request_body: request_body
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by request_body: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by response_status
   */
  async findByResponseStatus(response_status) {
    try {
      const results = await Auditlog.findAll({
        where: {
          response_status: response_status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by response_status: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by response_body
   */
  async findByResponseBody(response_body) {
    try {
      const results = await Auditlog.findAll({
        where: {
          response_body: response_body
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by response_body: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by ip_address
   */
  async findByIpAddress(ip_address) {
    try {
      const results = await Auditlog.findAll({
        where: {
          ip_address: ip_address
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by ip_address: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by user_agent
   */
  async findByUserAgent(user_agent) {
    try {
      const results = await Auditlog.findAll({
        where: {
          user_agent: user_agent
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by user_agent: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by correlation_id
   */
  async findByCorrelationId(correlation_id) {
    try {
      const results = await Auditlog.findAll({
        where: {
          correlation_id: correlation_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by correlation_id: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by changes
   */
  async findByChanges(changes) {
    try {
      const results = await Auditlog.findAll({
        where: {
          changes: changes
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by changes: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by metadata
   */
  async findByMetadata(metadata) {
    try {
      const results = await Auditlog.findAll({
        where: {
          metadata: metadata
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by metadata: ${error.message}`);
    }
  }
  /**
   * Find auditlogs by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Auditlog.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find auditlogs by created_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the user for this auditlog
   */
  async getUser(id) {
    try {
      const auditlog = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (auditlog.user_id) {
        const result = await userService.findById(auditlog.user_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for auditlog: ${error.message}`);
    }
  }
  /**
   * Get the tenant for this auditlog
   */
  async getTenant(id) {
    try {
      const auditlog = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (auditlog.tenant_id) {
        const result = await tenantService.findById(auditlog.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for auditlog: ${error.message}`);
    }
  }

}

module.exports = new AuditlogService();

