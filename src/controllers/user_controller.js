const userService = require('../services/user_service');
const { 
  CreateUserSchema,
  TenantIdParamsSchema,
  SupplierIdParamsSchema,
} = require('../validation/user.schema');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');
const { getPermissionService } = require('../infrastructure/auth/permission.service');

// Helper to remove sensitive fields from user data
const sanitizeUser = (user) => {
  if (!user) return user;
  const { password_hash, ...safeUser } = user.toJSON ? user.toJSON() : user;
  return safeUser;
};

const sanitizeUsers = (users) => {
  return users.map(sanitizeUser);
};

class UserController {
  /**
   * Get all users
   * GET /api/v1/users
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
      if (!isSuperAdmin) {
        // Use the authenticated user's tenant_id from the token
        if (req.user?.tenantId) {
          where.tenant_id = req.user.tenantId;
        }
      }
      where.isSuperAdmin = isSuperAdmin;
      // Super admin can see all users (no tenant_id filter)

      if (search) {
        where.search = search;
      }

      const result = await userService.findAll({
        skip: parseInt(skip),
        take: parseInt(limit),
        where: where,
        orderBy: [orderBy]
      });

      res.json({
        success: true,
        data: sanitizeUsers(result.data),
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
   * Get user by ID
   * GET /api/v1/users/:id
   */
  async findById(req, res) {
    try {
      const { id } = req.params; // Already validated by validateParams middleware
      
      const user = await userService.findById(id);

      res.json({
        success: true,
        data: sanitizeUser(user)
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
   * Get users by tenant_id
   * GET /api/v1/users/tenant/:tenant_id
   */
  async findByTenantId(req, res) {
    try {
      const { tenant_id } = req.params; // Already validated by validateParams middleware
      const { page = 1, limit = 100, orderBy = ['created_at', 'DESC'] } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await userService.findByTenantId(tenant_id, {
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: [orderBy]
      });

      res.json({
        success: true,
        data: sanitizeUsers(result.data),
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
   * Get users by supplier_id
   * GET /api/v1/users/supplier/:supplier_id
   */
  async findBySupplierId(req, res) {
    try {
      const { supplier_id } = req.params;
      const { page = 1, limit = 100, orderBy = ['created_at', 'DESC'] } = req.query;
      const skip = (page - 1) * limit;
      
      const result = await userService.findBySupplierId(supplier_id, {
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: [orderBy]
      });

      res.json({
        success: true,
        data: sanitizeUsers(result.data),
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
   * Get supplier details linked to a user
   * GET /api/v1/users/:id/supplier-details
   */
  async findSupplierDetailsByUserId(req, res) {
    try {
      const { id } = req.params;

      // Check if user is super admin
      let isSuperAdmin = req.user?.isSuperAdmin;
      if (!isSuperAdmin && req.user?.id) {
        const permissionService = getPermissionService();
        isSuperAdmin = await permissionService.isSuperAdmin(req.user.id);
      }

      const tenantId = isSuperAdmin ? null : req.user?.tenantId;
      const supplier = await userService.getSupplierDetailsByUserId(id, tenantId);

      res.json({
        success: true,
        data: supplier
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
   * Create new user with tenant and role assignment
   * POST /api/v1/users
   */
  async create(req, res) {
    try {
      // req.body is already validated and transformed by validateCreate middleware
      // Get tenant_id from authenticated user if not provided in body
      const tenantId = req.body.tenant_id || req.user?.tenantId;
      // Add assigned_by from the authenticated user
      const userData = {
        ...req.body,
        assigned_by: req.user?.id || null,
        tenant_id: tenantId
      };
      
      const user = await userService.create(userData, { requester: req.user });

      res.status(201).json({
        success: true,
        data: sanitizeUser(user),
        message: 'User created successfully with tenant and role assignment'
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
   * Update user
   * PUT /api/v1/users/:id
   */
  async update(req, res) {
    try {
      const { id } = req.params; 
      
      // Add assigned_by from authenticated user if not provided
      const updateData = {
        ...req.body,
        assigned_by: req.body.assigned_by || req.user?.id || null
      };
      
      const user = await userService.update(id, updateData);

      res.json({
        success: true,
        data: sanitizeUser(user),
        message: 'User updated successfully'
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
   * Delete user
   * DELETE /api/v1/users/:id
   */
  async delete(req, res) {
    try {
      const { id } = req.params; 
      
      await userService.delete(id);

      res.json({
        success: true,
        message: 'User deleted successfully'
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
   * Handle SAML assertion
   * POST /api/v1/auth/saml/callback
   */
  async samlCallback(req, res) {
    try {
      const bodySchema = CreateUserSchema;
      const validatedData = bodySchema.parse(req.body);
      
      const result = await userService.samlCallback(validatedData);
      
      res.status(201).json({
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
   * OAuth2 token endpoint
   * POST /api/v1/auth/token
   */
  async token(req, res) {
    try {
      const bodySchema = CreateUserSchema;
      const validatedData = bodySchema.parse(req.body);
      
      const result = await userService.token(validatedData);
      
      res.status(201).json({
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
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  async refresh(req, res) {
    try {
      const bodySchema = CreateUserSchema;
      const validatedData = bodySchema.parse(req.body);
      
      const result = await userService.refresh(validatedData);
      
      res.status(201).json({
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
   * Logout user
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    try {
      const result = await userService.logout();

      res.status(201).json({
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
   * Get current user profile
   * GET /api/v1/auth/me
   */
  async me(req, res) {
    try {
      const result = await userService.me();

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
   * Create API key
   * POST /api/v1/auth/api-keys
   */
  async createApiKey(req, res) {
    try {
      const bodySchema = CreateUserSchema;
      const validatedData = bodySchema.parse(req.body);
      
      const result = await userService.createApiKey(validatedData);
      
      res.status(201).json({
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
   * List API keys
   * GET /api/v1/auth/api-keys
   */
  async listApiKeys(req, res) {
    try {
      const queryParams = {
        page: req.query.page || undefined,
        limit: req.query.limit || undefined,
      };

      const result = await userService.listApiKeys(queryParams);

      res.status(200).json({
        success: true,
        data: Array.isArray(result) ? result : [result]
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
   * Revoke API key
   * DELETE /api/v1/auth/api-keys/:keyId
   */
  async revokeApiKey(req, res) {
    try {
      const keyId = req.params.keyId;

      const result = await userService.revokeApiKey(keyId);

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

module.exports = new UserController();
