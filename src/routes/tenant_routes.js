/**
 * Tenant Routes - QAssure Platform
 * /api/v1/tenants/*
 */
const express = require("express");
const tenantController = require("../controllers/tenant_controller");
const moduleController = require("../controllers/module.controller");
const {
  CreateTenantSchema,
  UpdateTenantSchema,
  TenantParamsSchema,
} = require("../validation/tenant.schema");
const { validate } = require("../middleware/validationMiddleware");
const {
  authenticate,
  authorize,
  // authorizeAny,
  requireSuperAdmin,
} = require("../middleware/auth.middleware");
// const { optionalTenantContext } = require('../middleware/tenant.middleware');
const router = express.Router();

// Validation middleware helpers
const validateCreate = validate(CreateTenantSchema);
const validateUpdate = validate(UpdateTenantSchema);
const validateParams = validate(TenantParamsSchema, "params");

/**
 * GET /api/v1/tenants/theme?domain=example.com
 * Get tenant theme by domain (public endpoint - no auth required)
 */
router.get("/theme", tenantController.getThemeByDomain.bind(tenantController));

// Apply authentication to all routes below
router.use(authenticate);

router.get(
  "/tenant-theme",
  tenantController.getThemeOftenant.bind(tenantController),
);

/**
 * GET /api/v1/tenants
 * Get all tenants (super admin or platform user with tenants:read)
 */
router.get(
  "/",
  requireSuperAdmin('tenants', 'read'),
  tenantController.findAll.bind(tenantController),
);

/**
 * GET /api/v1/tenants/current/users/dropdown
 * Active users in the JWT tenant for filter dropdowns (name + role)
 */
router.get(
  "/current/users/dropdown",
  // authorizeAny([
  //   { resource: 'users', action: 'read' },
  //   { resource: 'ai', action: 'read' }
  // ]),
  tenantController.listCurrentTenantUsersDropdown.bind(tenantController),
);

/**
 * GET /api/v1/tenants/:id
 * Get tenant by ID
 */
router.get(
  "/:id",
  validateParams,
  authorize("tenants", "read"),
  tenantController.findById.bind(tenantController),
);

/**
 * POST /api/v1/tenants
 * Create new tenant (super admin only)
 * Note: Logo and favicon uploads are commented out during tenant creation
 * because the storage bucket (file attachment/S3 bucket) can only be set up
 * after the tenant has been created.
 */
router.post(
  "/",
  validateCreate,
  requireSuperAdmin('tenants', 'create'),
  tenantController.create.bind(tenantController),
);

/**
 * PUT /api/v1/tenants/:id
 * Update tenant
 */
router.put(
  "/:id",
  validateParams,
  validateUpdate,
  authorize("tenants", "update"),
  tenantController.update.bind(tenantController),
);

/**
 * DELETE /api/v1/tenants/:id
 * Delete tenant (super admin only)
 */
router.delete(
  "/:id",
  validateParams,
  requireSuperAdmin('tenants', 'delete'),
  tenantController.delete.bind(tenantController),
);

// ==================== TENANT MODULE ACCESS (Super Admin) ====================

/**
 * GET /api/v1/tenants/:tenantId/modules
 * Get all modules for a tenant with enabled/disabled status
 * Auth: Super Admin only
 */
router.get("/:tenantId/modules", moduleController.getModulesForTenant);

/**
 * POST /api/v1/tenants/:tenantId/modules/:moduleId/enable
 * Enable a module for a tenant
 * Auth: Super Admin only
 */
router.post(
  "/:tenantId/modules/:moduleId/enable",
  requireSuperAdmin('tenants', 'update'),
  moduleController.enableModuleForTenant,
);

/**
 * DELETE /api/v1/tenants/:tenantId/modules/:moduleId
 * Disable a module for a tenant
 * Auth: Super Admin only
 */
router.delete(
  "/:tenantId/modules/:moduleId",
  requireSuperAdmin('tenants', 'update'),
  moduleController.disableModuleForTenant,
);

/**
 * PATCH /api/v1/tenants/:tenantId/modules/:moduleId/settings
 * Update tenant-specific module settings
 * Auth: Super Admin only
 */
router.patch(
  "/:tenantId/modules/:moduleId/settings",
  requireSuperAdmin('tenants', 'update'),
  moduleController.updateTenantModuleSettings,
);

module.exports = router;
