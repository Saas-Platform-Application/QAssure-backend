const express = require('express');
const healthcheckController = require('../controllers/health_check_controller');
const { 
  CreateHealthcheckSchema, 
  UpdateHealthcheckSchema,
  HealthcheckParamsSchema 
} = require('../validation/health_check.schema');
const { validate } = require('../middleware/validationMiddleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateHealthcheckSchema);
const validateUpdate = validate(UpdateHealthcheckSchema);
const validateParams = validate(HealthcheckParamsSchema, 'params');

/**
 * GET /api/v1/healthchecks
 * Get all healthchecks
 */
router.get('/', healthcheckController.findAll.bind(healthcheckController));

/**
 * GET /api/v1/healthchecks/:id
 * Get healthcheck by ID
 */
router.get('/:id', validateParams, healthcheckController.findById.bind(healthcheckController));

/**
 * POST /api/v1/healthchecks
 * Create new healthcheck
 */
router.post('/', validateCreate, healthcheckController.create.bind(healthcheckController));

/**
 * PUT /api/v1/healthchecks/:id
 * Update healthcheck
 */
router.put('/:id', validateParams, validateUpdate, healthcheckController.update.bind(healthcheckController));

/**
 * DELETE /api/v1/healthchecks/:id
 * Delete healthcheck
 */
router.delete('/:id', validateParams, healthcheckController.delete.bind(healthcheckController));

module.exports = router;

