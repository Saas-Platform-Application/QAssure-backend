/**
 * User Tenant Routes - QAssure Platform
 * /api/v1/user-tenants/*
 */
const express = require('express');
const usertenantController = require('../controllers/user_tenant_controller');
const { 
  CreateUsertenantSchema, 
  UpdateUsertenantSchema,
  UsertenantParamsSchema 
} = require('../validation/user_tenant.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateUsertenantSchema);
const validateUpdate = validate(UpdateUsertenantSchema);
const validateParams = validate(UsertenantParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/user-tenants
 * Get all user-tenant assignments
 */
router.get('/', 
  authorize('user_tenants', 'read'),
  usertenantController.findAll.bind(usertenantController)
);

/**
 * GET /api/v1/user-tenants/:id
 * Get user-tenant by ID
 */
router.get('/:id', 
  validateParams,
  authorize('user_tenants', 'read'),
  usertenantController.findById.bind(usertenantController)
);

/**
 * POST /api/v1/user-tenants
 * Assign user to tenant
 */
router.post('/', 
  validateCreate,
  authorize('user_tenants', 'create'),
  usertenantController.create.bind(usertenantController)
);

/**
 * PUT /api/v1/user-tenants/:id
 * Update user-tenant assignment
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('user_tenants', 'update'),
  usertenantController.update.bind(usertenantController)
);

/**
 * DELETE /api/v1/user-tenants/:id
 * Remove user from tenant
 */
router.delete('/:id', 
  validateParams,
  authorize('user_tenants', 'delete'),
  usertenantController.delete.bind(usertenantController)
);

module.exports = router;
