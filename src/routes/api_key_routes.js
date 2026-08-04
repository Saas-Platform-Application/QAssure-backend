/**
 * API Key Routes - QAssure Platform
 * /api/v1/api-keys/*
 */
const express = require('express');
const router = express.Router();
const apiKeyController = require('../controllers/api_key.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  CreateApiKeySchema,
  UpdateApiKeySchema,
  ValidateApiKeySchema,
  ApiKeyParamsSchema,
} = require('../validation/api_key.schema');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

// Validation middleware helpers
const validateCreate = validate(CreateApiKeySchema);
const validateUpdate = validate(UpdateApiKeySchema);
const validateParams = validate(ApiKeyParamsSchema, 'params');
const validateKey = validate(ValidateApiKeySchema);

/**
 * POST /api/v1/api-keys
 * Create new API key
 */
router.post('/',
  validateCreate,
  authorize('api_keys', 'create'),
  apiKeyController.create
);

/**
 * GET /api/v1/api-keys
 * List API keys
 */
router.get('/',
  authorize('api_keys', 'read'),
  apiKeyController.list
);

/**
 * POST /api/v1/api-keys/validate
 * Validate an API key (must be before :id route)
 */
router.post('/validate',
  validateKey,
  authorize('api_keys', 'read'),
  apiKeyController.validate
);

/**
 * GET /api/v1/api-keys/:id
 * Get API key by ID
 */
router.get('/:id',
  validateParams,
  authorize('api_keys', 'read'),
  apiKeyController.getById
);

/**
 * PUT /api/v1/api-keys/:id
 * Update API key
 */
router.put('/:id',
  validateParams,
  validateUpdate,
  authorize('api_keys', 'update'),
  apiKeyController.update
);

/**
 * POST /api/v1/api-keys/:id/revoke
 * Revoke API key
 */
router.post('/:id/revoke',
  validateParams,
  authorize('api_keys', 'delete'),
  apiKeyController.revoke
);

/**
 * POST /api/v1/api-keys/:id/regenerate
 * Regenerate API key
 */
router.post('/:id/regenerate',
  validateParams,
  authorize('api_keys', 'update'),
  apiKeyController.regenerate
);

/**
 * DELETE /api/v1/api-keys/:id
 * Delete API key permanently
 */
router.delete('/:id',
  validateParams,
  authorize('api_keys', 'delete'),
  apiKeyController.delete
);

module.exports = router;
