/**
 * User Routes - QAssure Platform
 * /api/v1/users/*
 */
const express = require('express');
const userController = require('../controllers/user_controller');
const moduleController = require('../controllers/module.controller');
const { 
  CreateUserSchema, 
  UpdateUserSchema,
  UserParamsSchema,
  TenantIdParamsSchema,
  SupplierIdParamsSchema,
} = require('../validation/user.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');
const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateUserSchema);
const validateUpdate = validate(UpdateUserSchema);
const validateParams = validate(UserParamsSchema, 'params');
const validateTenantIdParams = validate(TenantIdParamsSchema, 'params');
const validateSupplierIdParams = validate(SupplierIdParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/users
 * Get all users in tenant
 */
router.get('/', 
  authorize('users', 'read'),
  userController.findAll.bind(userController)
);

/**
 * GET /api/v1/users/tenant/:tenant_id
 * Get all users registered for a specific tenant
 */
// router.get('/tenant/:tenant_id', 
//   validateTenantIdParams,
//   authorize('users', 'read'),
//   userController.findByTenantId.bind(userController)
// );

/**
 * GET /api/v1/users/supplier/:supplier_id
 * Get all users linked to a specific supplier
 */
router.get('/supplier/:supplier_id',
  validateSupplierIdParams,
  authorize('users', 'read'),
  userController.findBySupplierId.bind(userController)
);



/**
 * GET /api/v1/users/:id/supplier-details
 * Get supplier details linked to a specific user
 */
router.get('/:id/supplier-details',
  validateParams,
  authorize('users', 'read'),
  userController.findSupplierDetailsByUserId.bind(userController)
);

/**
 * GET /api/v1/users/:id
 * Get user by ID
 */
router.get('/:id', 
  validateParams,
  authorize('users', 'read'),
  userController.findById.bind(userController)
);

/**
 * POST /api/v1/users
 * Create new user with tenant and role assignment (tenant admin only)
 * Body must include: tenant_id, role_id (or role_ids array)
 */
router.post('/', 
  validateCreate,
  authorize('users', 'create'),
  userController.create.bind(userController)
);

/**
 * PUT /api/v1/users/:id
 * Update user
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('users', 'update'),
  userController.update.bind(userController)
);

/**
 * DELETE /api/v1/users/:id
 * Delete user (tenant admin only)
 */
router.delete('/:id', 
  validateParams,
  authorize('users', 'delete'),
  userController.delete.bind(userController)
);

// ==================== USER MODULE ACCESS ====================

/**
 * GET /api/v1/users/:userId/modules
 * Get all modules assigned to a user
 * Auth: Tenant Admin only
 */
// router.get('/:userId/modules',
//   requireTenantAdmin,
//   moduleController.getModulesForUser
// );

module.exports = router;
