/**
 * Permission Routes - QAssure Platform
 * /api/v1/permissions/*
 */
const express = require('express');
const permissionController = require('../controllers/permission_controller');
const { 
  CreatePermissionSchema, 
  UpdatePermissionSchema,
  PermissionParamsSchema 
} = require('../validation/permission.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize, requireTenantAdmin } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helpers
const validateCreate = validate(CreatePermissionSchema);
const validateUpdate = validate(UpdatePermissionSchema);
const validateParams = validate(PermissionParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);

/**
 * GET /api/v1/permissions
 * Get all permissions
 */
router.get('/', 
  authorize('permissions', 'read'),
  permissionController.findAll.bind(permissionController)
);

/**
 * GET /api/v1/permissions/:id
 * Get permission by ID
 */
router.get('/:id', 
  validateParams,
  authorize('permissions', 'read'),
  permissionController.findById.bind(permissionController)
);

/**
 * POST /api/v1/permissions
 * Create new permission (super admin, platform user with permissions:create, or tenant admin)
 */
router.post('/', 
  validateCreate,
  requireTenantAdmin('permissions', 'create'),
  permissionController.create.bind(permissionController)
);

/**
 * PUT /api/v1/permissions/:id
 * Update permission (super admin, platform user with permissions:update, or tenant admin)
 */
router.put('/:id', 
  validateParams,
  validateUpdate,
  requireTenantAdmin('permissions', 'update'),
  permissionController.update.bind(permissionController)
);

/**
 * DELETE /api/v1/permissions/:id
 * Delete permission (super admin, platform user with permissions:delete, or tenant admin)
 */
router.delete('/:id', 
  validateParams,
  requireTenantAdmin('permissions', 'delete'),
  permissionController.delete.bind(permissionController)
);

module.exports = router;
