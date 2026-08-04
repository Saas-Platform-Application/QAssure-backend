/**
 * Module Routes - QAssure Platform
 * /api/v1/modules/*
 */
const express = require('express');
const router = express.Router();
const moduleController = require('../controllers/module.controller');
const { 
  CreateModuleSchema, 
  UpdateModuleSchema,
  ModuleParamsSchema,
  UpdateStatusSchema,
  UpdateVersionSchema
} = require('../validation/module.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize, requireSuperAdmin, requireTenantAdmin } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

// Validation middleware helpers
const validateCreate = validate(CreateModuleSchema);
const validateUpdate = validate(UpdateModuleSchema);
const validateParams = validate(ModuleParamsSchema, 'params');
const validateStatus = validate(UpdateStatusSchema);
const validateVersion = validate(UpdateVersionSchema);

// ==================== PUBLIC ROUTES (API Key Auth) ====================

/**
 * POST /api/v1/modules/verify-launch-token
 * Verify launch token (called by module using API Key)
 * Auth: Module API Key (X-API-Key header)
 */
router.post('/verify-launch-token',
  authenticate,  // This handles both JWT and API Key
  moduleController.verifyLaunchToken
);

// ==================== AUTHENTICATED ROUTES ====================

// Apply authentication to remaining routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

// ==================== USER MODULE ACCESS ====================

/**
 * GET /api/v1/modules/my
 * Get modules accessible by current user
 * For Super Admin: requires ?tenant_id query param
 * Auth: JWT (any authenticated user)
 */
router.get('/my',
  moduleController.getMyModules
);

// ==================== List & Stats ====================

/**
 * GET /api/v1/modules/available
 * Get available modules for role assignment (only enabled modules for tenant)
 * Auth: Tenant Admin or authorized user
 * NOTE: This must be defined BEFORE /:id route to avoid route matching conflicts
 */
router.get('/available',
  // authorize('tenants', 'read'),
  moduleController.getAvailableModules
);

/**
 * GET /api/v1/modules
 * List all modules
 */
router.get('/',
  authorize('modules', 'read'),
  moduleController.list
);

/**
 * GET /api/v1/modules/stats
 * Get module statistics
 */
router.get('/stats',
  authorize('modules', 'read'),
  moduleController.getStats
);

/**
 * GET /api/v1/modules/states
 * Get available states and transitions
 */
router.get('/states',
  authorize('modules', 'read'),
  moduleController.getStates
);

/**
 * GET /api/v1/modules/dropdown
 * Get module dropdown options (super_admin only)
 */
router.get('/dropdown',
  requireSuperAdmin('modules', 'read'),
  moduleController.getDropdown
);

// ==================== CRUD ====================

/**
 * POST /api/v1/modules
 * Register new module
 */
router.post('/',
  validateCreate,
  authorize('modules', 'create'),
  moduleController.register
);

/**
 * GET /api/v1/modules/:id
 * Get module by ID
 */
router.get('/:id',
  validateParams,
  authorize('modules', 'read'),
  moduleController.getById
);

/**
 * PUT /api/v1/modules/:id
 * Update module configuration
 */
router.put('/:id',
  validateParams,
  validateUpdate,
  authorize('modules', 'update'),
  moduleController.update
);

/**
 * DELETE /api/v1/modules/:id
 * Delete module permanently
 */
router.delete('/:id',
  validateParams,
  authorize('modules', 'delete'),
  moduleController.delete
);

// ==================== Module Launch (SSO) ====================

/**
 * POST /api/v1/modules/:id/launch
 * Generate launch token for module SSO
 * For Super Admin: requires ?tenant_id query param
 * Auth: JWT (user must have access to the module)
 */
router.post('/:id/launch',
  moduleController.launchModule
);

// ==================== Lifecycle ====================

/**
 * PATCH /api/v1/modules/:id/status
 * Update module status
 */
router.patch('/:id/status',
  validateParams,
  validateStatus,
  authorize('modules', 'update'),
  moduleController.updateStatus
);

/**
 * POST /api/v1/modules/:id/start
 * Start module
 */
router.post('/:id/start',
  validateParams,
  authorize('modules', 'update'),
  moduleController.start
);

/**
 * POST /api/v1/modules/:id/stop
 * Stop module
 */
router.post('/:id/stop',
  validateParams,
  authorize('modules', 'update'),
  moduleController.stop
);

/**
 * POST /api/v1/modules/:id/restart
 * Restart module
 */
router.post('/:id/restart',
  validateParams,
  authorize('modules', 'update'),
  moduleController.restart
);

/**
 * POST /api/v1/modules/:id/maintenance
 * Set module to maintenance mode
 */
router.post('/:id/maintenance',
  validateParams,
  authorize('modules', 'update'),
  moduleController.setMaintenance
);

/**
 * POST /api/v1/modules/:id/deprecate
 * Deprecate module
 */
router.post('/:id/deprecate',
  validateParams,
  authorize('modules', 'update'),
  moduleController.deprecate
);

/**
 * POST /api/v1/modules/:id/deregister
 * Deregister module (soft delete)
 */
router.post('/:id/deregister',
  validateParams,
  authorize('modules', 'delete'),
  moduleController.deregister
);

// ==================== Version ====================

/**
 * PATCH /api/v1/modules/:id/version
 * Update module version
 */
router.patch('/:id/version',
  validateParams,
  validateVersion,
  authorize('modules', 'update'),
  moduleController.updateVersion
);

// ==================== Health ====================

/**
 * POST /api/v1/modules/:id/health-check
 * Perform health check
 */
router.post('/:id/health-check',
  validateParams,
  authorize('modules', 'read'),
  moduleController.checkHealth
);

/**
 * GET /api/v1/modules/:id/health-history
 * Get health check history
 */
router.get('/:id/health-history',
  validateParams,
  authorize('modules', 'read'),
  moduleController.getHealthHistory
);

// ==================== Module Tenants (Super Admin) ====================

/**
 * GET /api/v1/modules/:id/tenants
 * Get all tenants for a module with enabled/disabled status
 * Auth: Super Admin only
 */
router.get('/:id/tenants',
  requireSuperAdmin('modules', 'read'),
  moduleController.getTenantsForModule
);

// ==================== Module Webhook Sync (Super Admin) ====================

/**
 * POST /api/v1/modules/:id/webhook-sync
 * Sync identity data to module's webhook
 * Auth: Super Admin only
 */
router.post('/:id/webhook-sync',
  requireSuperAdmin('modules', 'update'),
  moduleController.syncWebhookData
);

/**
 * POST /api/v1/modules/:id/reissue-key
 * Reissue API key for a module
 * Auth: Super Admin only
 */
router.post('/:id/reissue-key',
  requireSuperAdmin('modules', 'update'),
  moduleController.reissueApiKey
);

// ==================== User Module Access (Tenant Admin) ====================

/**
 * GET /api/v1/modules/:id/users
 * Get all users assigned to a module
 * Auth: Tenant Admin only
 */
router.get('/:id/users',
  requireTenantAdmin('modules', 'read'),
  moduleController.getUsersForModule
);

/**
 * POST /api/v1/modules/:id/users/bulk
 * Bulk assign users to a module
 * Auth: Tenant Admin only
 */
router.post('/:id/users/bulk',
  requireTenantAdmin('modules', 'update'),
  moduleController.bulkAssignUsersToModule
);

/**
 * DELETE /api/v1/modules/:id/users/bulk
 * Bulk remove users from a module
 * Auth: Tenant Admin only
 */
router.delete('/:id/users/bulk',
  requireTenantAdmin('modules', 'update'),
  moduleController.bulkRemoveUsersFromModule
);

/**
 * POST /api/v1/modules/:id/users/:userId
 * Assign a user to a module
 * Auth: Tenant Admin only
 */
router.post('/:id/users/:userId',
  requireTenantAdmin('modules', 'update'),
  moduleController.assignUserToModule
);

/**
 * DELETE /api/v1/modules/:id/users/:userId
 * Remove a user from a module
 * Auth: Tenant Admin only
 */
router.delete('/:id/users/:userId',
  requireTenantAdmin('modules', 'update'),
  moduleController.removeUserFromModule
);

module.exports = router;

