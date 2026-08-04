/**
 * Role Routes - QAssure Platform
 * /api/v1/roles/*
 */
const express = require('express');
const roleController = require('../controllers/role_controller');
const { 
  CreateRoleSchema, 
  UpdateRoleSchema,
  RoleParamsSchema 
} = require('../validation/role.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize, requireTenantAdmin } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helpers
const validateCreate = validate(CreateRoleSchema);
const validateUpdate = validate(UpdateRoleSchema);
const validateParams = validate(RoleParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/roles
 * Get all roles in tenant
 */
router.get('/', 
  authorize('roles', 'read'),
  roleController.findAll.bind(roleController)
);

/**
 * GET /api/v1/roles/:id
 * Get role by ID
 */
router.get('/:id', 
  validateParams,
  authorize('roles', 'read'),
  roleController.findById.bind(roleController)
);

/**
 * POST /api/v1/roles
 * Create new role (super admin, platform user with roles:create, or tenant admin)
 */
router.post('/', 
  validateCreate,
  requireTenantAdmin('roles', 'create'),
  roleController.create.bind(roleController)
);

/**
 * PUT /api/v1/roles/:id
 * Update role (super admin, platform user with roles:update, or tenant admin)
 */
router.put('/:id', 
  validateParams,
  validateUpdate,
  requireTenantAdmin('roles', 'update'),
  roleController.update.bind(roleController)
);

/**
 * DELETE /api/v1/roles/:id
 * Delete role (super admin, platform user with roles:delete, or tenant admin)
 */
router.delete('/:id', 
  validateParams,
  requireTenantAdmin('roles', 'delete'),
  roleController.delete.bind(roleController)
);

module.exports = router;
