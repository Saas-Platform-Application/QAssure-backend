/**
 * User Role Routes - QAssure Platform
 * /api/v1/user-roles/*
 */
const express = require('express');
const userroleController = require('../controllers/user_role_controller');
const { 
  CreateUserroleSchema, 
  UpdateUserroleSchema,
  UserroleParamsSchema 
} = require('../validation/user_role.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateUserroleSchema);
const validateUpdate = validate(UpdateUserroleSchema);
const validateParams = validate(UserroleParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/user-roles
 * Get all user-role assignments
 */
router.get('/', 
  authorize('user_roles', 'read'),
  userroleController.findAll.bind(userroleController)
);

/**
 * GET /api/v1/user-roles/:id
 * Get user-role by ID
 */
router.get('/:id', 
  validateParams,
  authorize('user_roles', 'read'),
  userroleController.findById.bind(userroleController)
);

/**
 * POST /api/v1/user-roles
 * Assign role to user (tenant admin)
 */
router.post('/', 
  validateCreate,
  authorize('user_roles', 'create'),
  userroleController.create.bind(userroleController)
);

/**
 * PUT /api/v1/user-roles/:id
 * Update user-role assignment
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('user_roles', 'update'),
  userroleController.update.bind(userroleController)
);

/**
 * DELETE /api/v1/user-roles/:id
 * Remove role from user
 */
router.delete('/:id', 
  validateParams,
  authorize('user_roles', 'delete'),
  userroleController.delete.bind(userroleController)
);

module.exports = router;
