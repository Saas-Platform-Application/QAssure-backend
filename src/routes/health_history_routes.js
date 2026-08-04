/**
 * Health History Routes - QAssure Platform
 * /api/v1/health-history/*
 */
const express = require('express');
const healthhistoryController = require('../controllers/health_history_controller');
const { 
  CreateHealthhistorySchema, 
  UpdateHealthhistorySchema,
  HealthhistoryParamsSchema 
} = require('../validation/health_history.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateHealthhistorySchema);
const validateUpdate = validate(UpdateHealthhistorySchema);
const validateParams = validate(HealthhistoryParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/health-history
 * Get all health history records
 */
router.get('/', 
  authorize('health_history', 'read'),
  healthhistoryController.findAll.bind(healthhistoryController)
);

/**
 * GET /api/v1/health-history/:id
 * Get health history by ID
 */
router.get('/:id', 
  validateParams,
  authorize('health_history', 'read'),
  healthhistoryController.findById.bind(healthhistoryController)
);

/**
 * POST /api/v1/health-history
 * Create new health history record
 */
router.post('/', 
  validateCreate,
  authorize('health_history', 'create'),
  healthhistoryController.create.bind(healthhistoryController)
);

/**
 * PUT /api/v1/health-history/:id
 * Update health history record
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('health_history', 'update'),
  healthhistoryController.update.bind(healthhistoryController)
);

/**
 * DELETE /api/v1/health-history/:id
 * Delete health history record
 */
router.delete('/:id', 
  validateParams,
  authorize('health_history', 'delete'),
  healthhistoryController.delete.bind(healthhistoryController)
);

module.exports = router;
