const auditlogService = require('../services/audit_log_service');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');
const { sequelize } = require('../config/database');
const { Op } = require('sequelize');

class AuditlogController {
  /**
   * Get all auditlogs
   * GET /api/v1/auditlogs
   */
  async findAll(req, res) {
    try {
      // BE-2: Validate page and limit as positive integers
      const rawPage = req.query.page;
      const rawLimit = req.query.limit;
      const parsedPage = parseInt(rawPage, 10);
      const parsedLimit = parseInt(rawLimit, 10);

      if (rawPage !== undefined && (isNaN(parsedPage) || parsedPage < 1)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAM', message: "'page' must be a positive integer" }
        });
      }
      if (rawLimit !== undefined && (isNaN(parsedLimit) || parsedLimit < 1)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAM', message: "'limit' must be a positive integer" }
        });
      }

      const page = parsedPage || 1;
      const limit = parsedLimit || 100;
      const { orderBy = ['created_at', 'DESC'], search, ...queryParams } = req.query;
      const skip = (page - 1) * limit;
      const filters = {};

      // Map query params to model fields
      if (queryParams.method) filters.request_method = queryParams.method;
      if (queryParams.action) filters.action = queryParams.action;
      if (queryParams.resource_type) filters.resource_type = queryParams.resource_type;
      if (queryParams.user_id) filters.user_id = queryParams.user_id;
      if (queryParams.response_status) filters.response_status = queryParams.response_status;
      if (queryParams.tenant_id) filters.tenant_id = queryParams.tenant_id;
      if (queryParams.module_id) filters.module_id = queryParams.module_id;

      // Implementation of global search
      if (search) {
        filters[Op.or] = [
          { action: { [Op.iLike]: `%${search}%` } },
          { resource_type: { [Op.iLike]: `%${search}%` } },
          { resource_id: { [Op.iLike]: `%${search}%` } },
          { ip_address: { [Op.iLike]: `%${search}%` } },
          // Search in JSONB metadata field by casting to text
          sequelize.where(
            sequelize.cast(
              sequelize.col('Auditlog.metadata'),
              'text'
            ),
            { [Op.iLike]: `%${search}%` }
          )
        ];
      }

      // Handle date range filters
      if (queryParams.startDate || queryParams.endDate) {
        filters.created_at = {};
        if (queryParams.startDate) {
          filters.created_at[Op.gte] = new Date(queryParams.startDate);
        }
        if (queryParams.endDate) {
          // Set to end of day
          const end = new Date(queryParams.endDate);
          end.setHours(23, 59, 59, 999);
          filters.created_at[Op.lte] = end;
        }
      }

      // Enforce tenant isolation — non-super-admins can only see their own tenant's logs
      if (!req.user?.isSuperAdmin) {
        filters.tenant_id = req.user?.tenantId || req.tenantId;
      }

      const result = await auditlogService.findAll({
        skip,
        take: limit,
        where: filters,
        orderBy: [orderBy],
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

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse
      });
    }
  }


  /**
   * Get current user's own audit logs
   * GET /api/v1/audit-logs/my-logs
   */
  async getMyLogs(req, res) {
    try {
      // BE-2: Validate page and limit as positive integers
      const rawPage = req.query.page;
      const rawLimit = req.query.limit;
      const parsedPage = parseInt(rawPage, 10);
      const parsedLimit = parseInt(rawLimit, 10);

      if (rawPage !== undefined && (isNaN(parsedPage) || parsedPage < 1)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAM', message: "'page' must be a positive integer" }
        });
      }
      if (rawLimit !== undefined && (isNaN(parsedLimit) || parsedLimit < 1)) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_PARAM', message: "'limit' must be a positive integer" }
        });
      }

      const page = parsedPage || 1;
      const limit = parsedLimit || 50;
      const { module_id, search } = req.query;
      const skip = (page - 1) * limit;

      const filters = { user_id: req.user.id };
      if (module_id) filters.module_id = module_id;

      // Implementation of global search
      if (search) {
        filters[Op.or] = [
          { action: { [Op.iLike]: `%${search}%` } },
          { resource_type: { [Op.iLike]: `%${search}%` } },
          { resource_id: { [Op.iLike]: `%${search}%` } },
          { ip_address: { [Op.iLike]: `%${search}%` } },
          // Search in JSONB metadata field by casting to text
          sequelize.where(
            sequelize.cast(
              sequelize.col('Auditlog.metadata'),
              'text'
            ),
            { [Op.iLike]: `%${search}%` }
          )
        ];
      }

      const result = await auditlogService.findAll({
        skip,
        take: limit,
        where: filters,
        orderBy: [['created_at', 'DESC']],
        include: [
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

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore
        }
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse
      });
    }
  }

  /**
   * Get auditlog by ID
   * GET /api/v1/auditlogs/:id
   */
  async findById(req, res) {
    try {
      const auditlog = await auditlogService.findById(req.params.id);

      res.json({
        success: true,
        data: auditlog
      });
    } catch (error) {
      // BE-1: Return 404 when the record simply doesn't exist
      const status = error.statusCode || getErrorStatusCode(formatError(error));
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Create new auditlog
   * POST /api/v1/auditlogs
   */
  async create(req, res) {
    try {
      // 1. Capture module_id from request context (set by X-API-Key or Combined Auth)
      const sourceModuleId =
        req && req.module && req.module.id
          ? req.module.id
          : req && req.user && req.user.moduleId
            ? req.user.moduleId
            : null;

      if (sourceModuleId) {
        req.body.module_id = sourceModuleId;
      }

      // 2. Auto-populate tenant_id and user_id if not provided
      if (!req.body.tenant_id) {
        req.body.tenant_id = req.user?.tenantId || req.tenantId || null;
      }
      if (!req.body.user_id) {
        req.body.user_id = req.user?.id || null;
      }

      // 3. Validate resource_type against database
      const { resource_type } = req.body;
      if (resource_type) {
        const AuditLogResourceType = require('../sequelize-models/audit_log_resource_type');
        const rt = await AuditLogResourceType.findOne({ where: { name: resource_type } });
        
        if (!rt) {
          return res.status(400).json({
            success: false,
            error: {
              code: 'INVALID_RESOURCE_TYPE',
              message: `Resource type '${resource_type}' is not registered in the system.`
            }
          });
        }

        // If it's a module-specific resource type, verify ownership
        // PLATFORM types are accessible by anyone with 'audit_logs:create' permission
        if (rt.type === 'MODULE' && sourceModuleId && rt.module_id !== sourceModuleId) {
          return res.status(403).json({
            success: false,
            error: {
              code: 'FORBIDDEN_RESOURCE_TYPE',
              message: `The resource type '${resource_type}' belongs to another module.`
            }
          });
        }
      }

      // 4. Auto-populate context-specific fields (IP, User Agent, Correlation ID)
      if (!req.body.ip_address) {
        req.body.ip_address = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress;
      }
      if (!req.body.user_agent) {
        req.body.user_agent = req.headers['user-agent'];
      }
      if (!req.body.correlation_id && req.correlationId) {
        req.body.correlation_id = req.correlationId;
      }

      const auditlog = await auditlogService.create(req.body);

      res.status(201).json({
        success: true,
        data: auditlog,
        message: 'Audit log created successfully'
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
        ...(error.errors && { details: error.errors }),
        ...(error.issues && { details: error.issues })
      });
    }
  }

  /**
   * Update auditlog
   * PUT /api/v1/auditlogs/:id
   */
  async update(req, res) {
    try {
      const auditlog = await auditlogService.update(req.params.id, req.body);

      res.json({
        success: true,
        data: auditlog,
        message: 'Auditlog updated successfully'
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
        ...(error.errors && { details: error.errors }),
        ...(error.issues && { details: error.issues })
      });
    }
  }

  /**
   * Delete auditlog
   * DELETE /api/v1/auditlogs/:id
   */
  async delete(req, res) {
    try {
      await auditlogService.delete(req.params.id);

      res.json({
        success: true,
        message: 'Auditlog deleted successfully'
      });
    } catch (error) {
      // BE-1: Return 404 when the record simply doesn't exist
      const status = error.statusCode || getErrorStatusCode(formatError(error));
      res.status(status).json({
        success: false,
        error: {
          code: error.code || 'ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * Get audit log details
   * GET /api/v1/audit/logs/:logId
   */
  async findOne(req, res) {
    try {
      const result = await auditlogService.findOne(req.params.logId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse
      });
    }
  }

  /**
   * Export audit logs
   * GET /api/v1/audit/logs/export
   */
  async export(req, res) {
    try {
      const queryParams = {
        format: req.query.format,
        tenantId: req.user?.isSuperAdmin ? (req.query.tenantId || undefined) : (req.user?.tenantId || req.tenantId),
        startDate: req.query.startDate,
        endDate: req.query.endDate,
      };

      const result = await auditlogService.export(queryParams);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse
      });
    }
  }

  /**
   * Get audit statistics
   * GET /api/v1/audit/stats
   */
  async getStats(req, res) {
    try {
      const queryParams = {
        tenantId: req.user?.isSuperAdmin ? (req.query.tenantId || undefined) : (req.user?.tenantId || req.tenantId),
        startDate: req.query.startDate || undefined,
        endDate: req.query.endDate || undefined,
      };

      const result = await auditlogService.getStats(queryParams);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse
      });
    }
  }

}

module.exports = new AuditlogController();
