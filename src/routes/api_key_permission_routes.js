/**
 * API Key Permission Routes - QAssure Platform
 * /api/v1/api-key-permissions/*
 */
const express = require('express');
const apikeypermissionController = require('../controllers/api_key_permission_controller');
const { 
  CreateApikeypermissionSchema, 
  UpdateApikeypermissionSchema,
  ApikeypermissionParamsSchema 
} = require('../validation/api_key_permission.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateApikeypermissionSchema);
const validateUpdate = validate(UpdateApikeypermissionSchema);
const validateParams = validate(ApikeypermissionParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/api-key-permissions
 * Get all API key permissions
 */
router.get('/', 
  authorize('api_key_permissions', 'read'),
  apikeypermissionController.findAll.bind(apikeypermissionController)
);

/**
 * GET /api/v1/api-key-permissions/:id
 * Get API key permission by ID
 */
router.get('/:id', 
  validateParams,
  authorize('api_key_permissions', 'read'),
  apikeypermissionController.findById.bind(apikeypermissionController)
);

/**
 * POST /api/v1/api-key-permissions
 * Create new API key permission
 */
router.post('/', 
  validateCreate,
  authorize('api_key_permissions', 'create'),
  apikeypermissionController.create.bind(apikeypermissionController)
);

/**
 * PUT /api/v1/api-key-permissions/:id
 * Update API key permission
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('api_key_permissions', 'update'),
  apikeypermissionController.update.bind(apikeypermissionController)
);

/**
 * DELETE /api/v1/api-key-permissions/:id
 * Delete API key permission
 */
router.delete('/:id', 
  validateParams,
  authorize('api_key_permissions', 'delete'),
  apikeypermissionController.delete.bind(apikeypermissionController)
);

module.exports = router;
