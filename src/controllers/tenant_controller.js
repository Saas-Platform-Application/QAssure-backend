const tenantService = require('../services/tenant_service');
const userService = require('../services/user_service');
const {
  UpdateTenantSchema
} = require('../validation/tenant.schema');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');
const { Op } = require('sequelize');

class TenantController {
  /**
   * Get all tenants
   * GET /api/v1/tenants
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, orderBy = ['created_at', 'DESC'], search, ...filters } = req.query;
      const skip = (page - 1) * limit;

      // Exclude current tenant from the list
      const whereClause = {
        ...filters,
        ...(req.user?.tenantId && { id: { [Op.ne]: req.user.tenantId } })
      };

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { slug: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const result = await tenantService.findAll({
        skip: parseInt(skip),
        take: parseInt(limit),
        where: whereClause,
        orderBy: [orderBy]
      });

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
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
   * Get tenant by ID
   * GET /api/v1/tenants/:id
   */
  async findById(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware

      const tenant = await tenantService.findById(id);

      res.json({
        success: true,
        data: tenant
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
   * Create new tenant
   * POST /api/v1/tenants
   */
  async create(req, res) {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      const tenant = await tenantService.create(req.body, req.user);

      res.status(201).json({
        success: true,
        data: tenant,
        message: 'Tenant created successfully'
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
   * Update tenant
   * PUT /api/v1/tenants/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      // req.body is already validated and transformed by validateUpdate middleware

      const tenant = await tenantService.update(id, req.body, req.user?.id);

      res.json({
        success: true,
        data: tenant,
        message: 'Tenant updated successfully'
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
   * Delete tenant
   * DELETE /api/v1/tenants/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware

      await tenantService.delete(id);

      res.json({
        success: true,
        message: 'Tenant deleted successfully'
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
   * Get tenant details
   * GET /api/v1/tenants/:tenantId
   */
  async findOne(req, res) {
    try {
      // Extract path parameters
      const tenantId = req.params.tenantId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await tenantService.findOne(tenantId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
        ...(error.errors && { details: error.errors })
      });
    }
  }

  /**
   * Update tenant status
   * PUT /api/v1/tenants/:tenantId/status
   */
  async updateStatus(req, res) {
    try {
      // Extract path parameters
      const tenantId = req.params.tenantId;

      // Validate request body
      const bodySchema = UpdateTenantSchema;
      const validatedData = bodySchema.parse(req.body);

      // Custom endpoint handler
      // Build service method call with parameters in correct order
      const result = await tenantService.updateStatus(tenantId, validatedData);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      const errorResponse = formatError(error);
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
        ...(error.errors && { details: error.errors })
      });
    }
  }

  /**
   * Get tenant theme by domain
   * GET /api/v1/tenants/theme?domain=example.com
   * Public endpoint - no authentication required
   */
  async getThemeByDomain(req, res) {
    try {
      const { domain } = req.query;

      if (!domain) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Domain parameter is required'
          }
        });
      }

      const theme = await tenantService.getThemeByDomain(domain);

      res.json({
        success: true,
        data: theme
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
   * Get tenant theme by tenant ID
   * GET /api/v1/tenants/theme
   */
  async getThemeOftenant(req, res) {
    try {
      const tenantId = req.user.tenantId;

      const theme = await tenantService.getThemeOftenant(tenantId);

      res.json({
        success: true,
        data: theme
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
   * GET /api/v1/tenants/current/users/dropdown
   */
  async listCurrentTenantUsersDropdown(req, res) {
    try {
      const tenantId = req.user?.tenantId;
      const { search } = req.query;
      
      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: { code: 'INVALID_CONTEXT', message: 'Tenant context is required' }
        });
      }

      const data = await userService.listUsersDropdownForTenant(tenantId, search);

      res.json({
        success: true,
        data
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

module.exports = new TenantController();
