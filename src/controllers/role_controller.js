const roleService = require('../services/role_service');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');
const { getPermissionService } = require('../infrastructure/auth/permission.service');

class RoleController {
  /**
   * Get all roles
   * GET /api/v1/roles
   */
  async findAll(req, res) {
    try {
      const { page = 1, limit = 100, orderBy = ['created_at', 'DESC'], search, ...filters } = req.query;
      const skip = (page - 1) * limit;
      
      // Check if user is super admin
      let isSuperAdmin = req.user?.isSuperAdmin;
      if (!isSuperAdmin && req.user?.id) {
        const permissionService = getPermissionService();
        isSuperAdmin = await permissionService.isSuperAdmin(req.user.id);
      }
      
      // Build where clause - if not super admin, filter by authenticated user's tenant_id
      const where = { ...filters };
      if (where.is_active !== undefined) {
        where.is_active = where.is_active === 'true';
      }
      if (search) {
        where.search = search;
      }
      if (!isSuperAdmin) {
        // Use the authenticated user's tenant_id from the token
        if (req.user?.tenantId) {
          where.tenant_id = req.user.tenantId;
        }
      }
      // Super admin can see all roles (no tenant_id filter)
      
      const result = await roleService.findAll({
        skip: parseInt(skip),
        take: parseInt(limit),
        where: where,
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
   * Get role by ID
   * GET /api/v1/roles/:id
   */
  async findById(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      const role = await roleService.findById(id);

      res.json({
        success: true,
        data: role
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
   * Create new role
   * POST /api/v1/roles
   */
  async create(req, res) {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      // Get tenant_id from authenticated user if not provided in body
      const tenantId = req.body.tenant_id || req.user?.tenantId;
      const role = await roleService.create(req.body, tenantId);

      res.status(201).json({
        success: true,
        data: role,
        message: 'Role created successfully'
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
   * Update role
   * PUT /api/v1/roles/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      // req.body is already validated and transformed by validateUpdate middleware
      // Only update tenant_id if explicitly provided in body
      const role = await roleService.update(id, req.body);

      res.json({
        success: true,
        data: role,
        message: 'Role updated successfully'
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
   * Delete role
   * DELETE /api/v1/roles/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      await roleService.delete(id);

      res.json({
        success: true,
        message: 'Role deleted successfully'
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
   * Get role details
   * GET /api/v1/roles/:roleId
   */
  async findOne(req, res) {
    try {
      // Extract path parameters
      const roleId = req.params.roleId;

      // Custom endpoint handler
      // Build service method call with parameters in correct order

      const result = await roleService.findOne(roleId);

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

}

module.exports = new RoleController();
