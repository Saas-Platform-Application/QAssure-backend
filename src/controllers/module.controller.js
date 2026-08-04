/**
 * Module Controller - QAssure Platform
 * Handles module management HTTP requests
 */
const { getModuleService } = require('../services/module.service');
const { formatError, getErrorStatusCode } = require('../utils/errorFormatter');
const { getModuleLaunchService } = require('../services/module_launch.service');
const { getTenantModuleService } = require('../services/tenant_module.service');
const { getUserModuleService } = require('../services/user_module.service');
const ModuleModel = require('../sequelize-models/module');

class ModuleController {
  constructor() {
    this.moduleService = getModuleService();
    this.moduleLaunchService = getModuleLaunchService();
    this.tenantModuleService = getTenantModuleService();
    this.userModuleService = getUserModuleService();
  }

  // ==================== EXISTING CRUD OPERATIONS ====================

  /**
   * POST /api/v1/modules
   * Register new module
   */
  register = async (req, res) => {
    try {
      const module = await this.moduleService.register(
        req.body,
        req.user.id,
        req.user.tenantId
      );

      res.status(201).json({
        success: true,
        data: module,
        message: 'Module registered successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules/available
   * Get available modules for role assignment (only enabled modules for tenant)
   * Returns only modules that are enabled for the current tenant
   * 
   * Query Parameters:
   * - page: Page number (default: 1)
   * - limit: Items per page (default: 100)
   * - orderBy: Sort order as "column,direction" (default: "name,ASC")
   * - status: Filter by module status (e.g., "running", "pending")
   * - health_status: Filter by health status (e.g., "healthy", "unhealthy")
   * - runtime_language: Filter by runtime language (e.g., "nodejs", "python")
   * - framework: Filter by framework (e.g., "express", "django")
   * - search: Search in name, module_id, or description
   */
  getAvailableModules = async (req, res) => {
    try {
      // Get pagination parameters
      const { page = 1, limit = 100, orderBy = 'name,ASC', ...filters } = req.query;
      const skip = (page - 1) * limit;

      // Parse orderBy (format: "column,direction" or ["column", "direction"])
      let parsedOrderBy = ['name', 'ASC'];
      if (orderBy) {
        if (Array.isArray(orderBy)) {
          parsedOrderBy = orderBy;
        } else if (typeof orderBy === 'string') {
          const parts = orderBy.split(',');
          if (parts.length === 2) {
            parsedOrderBy = [parts[0].trim(), parts[1].trim().toUpperCase()];
          }
        }
      }

      // Get tenant ID from authenticated user
      const tenantId = req.query.tenant_id || req.user?.tenantId;

      if (!tenantId) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Tenant ID is required' }
        });
      }

      const result = await this.tenantModuleService.getEnabledModulesForTenant(tenantId, {
        skip: parseInt(skip),
        take: parseInt(limit),
        orderBy: parsedOrderBy,
        filters: filters
      });

      res.json({
        success: true,
        data: result.data,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: skip + parseInt(limit) < result.total
        },
        meta: result.meta
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules
   * List modules
   */
  list = async (req, res) => {
    try {
      const { status, health_status, runtime_language, search, page, limit, sort_by, sort_order } = req.query;

      const result = await this.moduleService.list(
        {
          tenant_id: req.user.tenantId,
          status,
          health_status,
          runtime_language,
          search
        },
        {
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 20,
          sort_by,
          sort_order
        }
      );

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules/stats
   * Get module statistics
   */
  getStats = async (req, res) => {
    try {
      const stats = await this.moduleService.getStats();

      res.status(200).json({
        success: true,
        data: stats
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules/states
   * Get available states and transitions
   */
  getStates = async (req, res) => {
    try {
      const transitions = this.moduleService.getStateTransitions();

      res.status(200).json({
        success: true,
        data: transitions
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules/dropdown
   * Super-admin dropdown options for modules
   */
  getDropdown = async (req, res) => {
    try {
      const modules = await ModuleModel.findAll({
        attributes: ['id', 'name'],
        order: [['name', 'ASC']]
      });

      res.status(200).json({
        success: true,
        data: modules.map((module) => ({
          id: module.id,
          name: module.name
        }))
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules/:id
   * Get module by ID
   */
  getById = async (req, res) => {
    try {
      const module = await this.moduleService.getById(req.params.id);

      res.status(200).json({
        success: true,
        data: module
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * PUT /api/v1/modules/:id
   * Update module configuration
   */
  update = async (req, res) => {
    try {
      const module = await this.moduleService.update(
        req.params.id,
        req.body,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: module,
        message: 'Module updated successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * PATCH /api/v1/modules/:id/status
   * Update module status
   */
  updateStatus = async (req, res) => {
    try {
      const { status, reason } = req.body;

      const module = await this.moduleService.updateStatus(
        req.params.id,
        status,
        req.user.id,
        reason
      );

      res.status(200).json({
        success: true,
        data: module,
        message: `Module status updated to '${status}'`
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/start
   * Start a module
   */
  start = async (req, res) => {
    try {
      const module = await this.moduleService.start(req.params.id, req.user.id);

      res.status(200).json({
        success: true,
        data: module,
        message: 'Module started successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/stop
   * Stop a module
   */
  stop = async (req, res) => {
    try {
      const { reason } = req.body;
      const module = await this.moduleService.stop(req.params.id, req.user.id, reason);

      res.status(200).json({
        success: true,
        data: module,
        message: 'Module stopped successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/restart
   * Restart a module
   */
  restart = async (req, res) => {
    try {
      const { reason } = req.body;
      const module = await this.moduleService.restart(req.params.id, req.user.id, reason);

      res.status(200).json({
        success: true,
        data: module,
        message: 'Module restarted successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/maintenance
   * Put module in maintenance mode
   */
  setMaintenance = async (req, res) => {
    try {
      const { reason } = req.body;
      const module = await this.moduleService.setMaintenance(req.params.id, req.user.id, reason);

      res.status(200).json({
        success: true,
        data: module,
        message: 'Module set to maintenance mode'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/deprecate
   * Mark module as deprecated
   */
  deprecate = async (req, res) => {
    try {
      const { reason } = req.body;
      const module = await this.moduleService.deprecate(req.params.id, req.user.id, reason);

      res.status(200).json({
        success: true,
        data: module,
        message: 'Module marked as deprecated'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * PATCH /api/v1/modules/:id/version
   * Update module version
   */
  updateVersion = async (req, res) => {
    try {
      const { version, changelog } = req.body;

      const module = await this.moduleService.updateVersion(
        req.params.id,
        version,
        req.user.id,
        changelog
      );

      res.status(200).json({
        success: true,
        data: module,
        message: `Module version updated to '${version}'`
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/health-check
   * Perform health check
   */
  checkHealth = async (req, res) => {
    try {
      const result = await this.moduleService.checkHealth(req.params.id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules/:id/health-history
   * Get health check history
   */
  getHealthHistory = async (req, res) => {
    try {
      const limit = parseInt(req.query.limit) || 100;
      const history = await this.moduleService.getHealthHistory(req.params.id, limit);

      res.status(200).json({
        success: true,
        data: history
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/deregister
   * Deregister module (soft delete)
   */
  deregister = async (req, res) => {
    try {
      const result = await this.moduleService.deregister(req.params.id, req.user.id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * DELETE /api/v1/modules/:id
   * Delete module permanently
   */
  delete = async (req, res) => {
    try {
      const result = await this.moduleService.delete(req.params.id, req.user.id);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  // ==================== MODULE LAUNCH & SSO ====================

  /**
   * GET /api/v1/my/modules
   * Get modules accessible by current user
   * For Super Admin: requires ?tenant_id query param
   */
  getMyModules = async (req, res) => {
    try {
      const { tenant_id } = req.query;

      const result = await this.moduleLaunchService.getAccessibleModules(
        req.user,
        tenant_id
      );

      if (!result.success) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: result.error }
        });
      }

      res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta,
        message: result.message
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/launch
   * Generate launch token for module SSO
   * For Super Admin: requires ?tenant_id query param
   */
  launchModule = async (req, res) => {
    try {
      const { tenant_id } = req.query;
      const moduleId = req.params.id;

      const requestInfo = {
        ip: req.ip || req.connection?.remoteAddress,
        userAgent: req.headers['user-agent']
      };

      const result = await this.moduleLaunchService.generateLaunchToken(
        req.user,
        moduleId,
        tenant_id,
        requestInfo
      );

      if (!result.success) {
        return res.status(403).json({
          success: false,
          error: { code: 'LAUNCH_DENIED', message: result.error }
        });
      }

      res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/verify-launch-token
   * Verify launch token (called by module using API Key)
   * Requires: X-API-Key header (module's API key)
   */
  verifyLaunchToken = async (req, res) => {
    try {
      let { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Token is required in request body' }
        });
      }

      // Trim token to handle any whitespace issues
      if (typeof token === 'string') {
        token = token.trim();
      }

      // Ensure request is authenticated with API Key
      if (!req.user.isApiKey) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'API_KEY_REQUIRED',
            message: 'This endpoint requires module API Key authentication (X-API-Key header)'
          }
        });
      }

      // Ensure API Key is linked to a module
      if (!req.user.moduleId) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'INVALID_API_KEY',
            message: 'API Key is not associated with a module'
          }
        });
      }

      const apiKey = {
        id: req.user.apiKeyId,
        moduleId: req.user.moduleId
      };

      const requestInfo = {
        ip: req.ip || req.connection?.remoteAddress
      };

      const result = await this.moduleLaunchService.verifyLaunchToken(
        token,
        apiKey,
        requestInfo
      );

      if (!result.success) {
        return res.status(401).json({
          success: false,
          error: { code: 'TOKEN_INVALID', message: result.error }
        });
      }

      res.status(200).json({
        success: true,
        data: result.data
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  // ==================== TENANT MODULE ACCESS (Super Admin) ====================

  /**
   * POST /api/v1/tenants/:tenantId/modules/:moduleId/enable
   * Enable a module for a tenant (Super Admin only)
   */
  enableModuleForTenant = async (req, res) => {
    try {
      const { tenantId, moduleId } = req.params;
      const { settings } = req.body;

      const result = await this.tenantModuleService.enableModuleForTenant(
        tenantId,
        moduleId,
        req.user.id,
        settings
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * DELETE /api/v1/tenants/:tenantId/modules/:moduleId
   * Disable a module for a tenant (Super Admin only)
   */
  disableModuleForTenant = async (req, res) => {
    try {
      const { tenantId, moduleId } = req.params;

      const result = await this.tenantModuleService.disableModuleForTenant(
        tenantId,
        moduleId,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/tenants/:tenantId/modules
   * Get all modules for a tenant with enabled/disabled status (Super Admin only)
   */
  getModulesForTenant = async (req, res) => {
    try {
      const { tenantId } = req.params;

      const result = await this.moduleLaunchService.getAccessibleModules(
        req.user,
        tenantId
      );

      if (!result.success) {
        return res.status(403).json({
          success: false,
          error: { code: 'ACCESS_DENIED', message: result.error }
        });
      }

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules/:id/tenants
   * Get all tenants for a module with enabled/disabled status (Super Admin only)
   */
  getTenantsForModule = async (req, res) => {
    try {
      const moduleId = req.params.id;

      const result = await this.tenantModuleService.getTenantsForModule(moduleId);

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * PATCH /api/v1/tenants/:tenantId/modules/:moduleId/settings
   * Update tenant-specific module settings (Super Admin only)
   */
  updateTenantModuleSettings = async (req, res) => {
    try {
      const { tenantId, moduleId } = req.params;
      const { settings } = req.body;

      if (!settings) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Settings object is required' }
        });
      }

      const result = await this.tenantModuleService.updateTenantModuleSettings(
        tenantId,
        moduleId,
        settings,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  // ==================== USER MODULE ACCESS (Tenant Admin) ====================

  /**
   * POST /api/v1/modules/:id/users/:userId
   * Assign a user to a module (Tenant Admin only)
   */
  assignUserToModule = async (req, res) => {
    try {
      const moduleId = req.params.id;
      const { userId } = req.params;
      const { role_id } = req.body;

      const result = await this.userModuleService.assignUserToModule(
        userId,
        moduleId,
        req.user.tenantId,
        req.user.id,
        role_id
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * DELETE /api/v1/modules/:id/users/:userId
   * Remove a user from a module (Tenant Admin only)
   */
  removeUserFromModule = async (req, res) => {
    try {
      const moduleId = req.params.id;
      const { userId } = req.params;

      const result = await this.userModuleService.removeUserFromModule(
        userId,
        moduleId,
        req.user.tenantId,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/modules/:id/users
   * Get all users assigned to a module (Tenant Admin only)
   */
  getUsersForModule = async (req, res) => {
    try {
      const moduleId = req.params.id;
      const { page, limit } = req.query;

      const result = await this.userModuleService.getUsersForModule(
        moduleId,
        req.user.tenantId,
        { page: parseInt(page) || 1, limit: parseInt(limit) || 50 }
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * GET /api/v1/users/:userId/modules
   * Get all modules assigned to a user (Tenant Admin only)
   */
  getModulesForUser = async (req, res) => {
    try {
      const { userId } = req.params;

      const result = await this.userModuleService.getModulesForUser(
        userId,
        req.user.tenantId
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/users/bulk
   * Bulk assign users to a module (Tenant Admin only)
   */
  bulkAssignUsersToModule = async (req, res) => {
    try {
      const moduleId = req.params.id;
      const { user_ids, role_id } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'user_ids array is required' }
        });
      }

      const result = await this.userModuleService.bulkAssignUsersToModule(
        user_ids,
        moduleId,
        req.user.tenantId,
        req.user.id,
        role_id
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * DELETE /api/v1/modules/:id/users/bulk
   * Bulk remove users from a module (Tenant Admin only)
   */
  bulkRemoveUsersFromModule = async (req, res) => {
    try {
      const moduleId = req.params.id;
      const { user_ids } = req.body;

      if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'user_ids array is required' }
        });
      }

      const result = await this.userModuleService.bulkRemoveUsersFromModule(
        user_ids,
        moduleId,
        req.user.tenantId,
        req.user.id
      );

      res.status(200).json(result);
    } catch (error) {
      this._handleError(res, error);
    }
  };

  // ==================== WEBHOOK DATA SYNC (Super Admin) ====================

  /**
   * POST /api/v1/modules/:id/webhook-sync
   * Sync identity data to module's webhook
   */
  syncWebhookData = async (req, res) => {
    try {
      const { sync_webhook_url } = req.body;
      const moduleId = req.params.id;

      const result = await this.moduleService.syncIdentityDataToWebhook(
        moduleId,
        sync_webhook_url,
        req.user.id
      );

      res.status(200).json({
        success: true,
        data: result,
        message: 'Identity data sync triggered successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  /**
   * POST /api/v1/modules/:id/reissue-key
   * Reissue API key for a module
   */
  reissueApiKey = async (req, res) => {
    try {
      const { id } = req.params;
      const { webhookurl } = req.body;
      const result = await this.moduleService.reissueApiKey(id, webhookurl, req.user.id);
      
      res.status(200).json({
        success: true,
        data: result,
        message: 'API key reissue triggered successfully'
      });
    } catch (error) {
      this._handleError(res, error);
    }
  };

  // ==================== ERROR HANDLING ====================

  /**
   * Handle errors
   */
  _handleError(res, error) {
    console.error('[ModuleController] Error:', error.message);

    // Handle specific error cases first
    if (error.message.includes('not found')) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(409).json({
        success: false,
        error: { code: 'CONFLICT', message: error.message }
      });
    }

    if (error.message.includes('Invalid state transition') || error.message.includes('Invalid status')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_TRANSITION', message: error.message }
      });
    }

    if (error.message.includes('Access denied') || error.message.includes('not enabled') || error.message.includes('do not have access')) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error.message }
      });
    }

    if (error.message.includes('not a member')) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_USER', message: error.message }
      });
    }

    // Fallback to formatError for other errors
    const errorResponse = formatError(error);
    res.status(getErrorStatusCode(errorResponse)).json({
      success: false,
      error: errorResponse,
      ...(error.errors && { details: error.errors }),
      ...(error.issues && { details: error.issues })
    });
  }
}

module.exports = new ModuleController();
