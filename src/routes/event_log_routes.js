/**
 * Event Log Routes - QAssure Platform
 * /api/v1/event-logs/*
 */
const express = require('express');
const eventlogController = require('../controllers/event_log_controller');
const { 
  CreateEventlogSchema, 
  UpdateEventlogSchema,
  EventlogParamsSchema 
} = require('../validation/event_log.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateEventlogSchema);
const validateUpdate = validate(UpdateEventlogSchema);
const validateParams = validate(EventlogParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/event-logs
 * Get all event logs
 */
router.get('/', 
  authorize('event_logs', 'read'),
  eventlogController.findAll.bind(eventlogController)
);

/**
 * GET /api/v1/event-logs/:id
 * Get event log by ID
 */
router.get('/:id', 
  validateParams,
  authorize('event_logs', 'read'),
  eventlogController.findById.bind(eventlogController)
);

/**
 * POST /api/v1/event-logs
 * Create new event log
 */
router.post('/', 
  validateCreate,
  authorize('event_logs', 'create'),
  eventlogController.create.bind(eventlogController)
);

/**
 * PUT /api/v1/event-logs/:id
 * Update event log
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('event_logs', 'update'),
  eventlogController.update.bind(eventlogController)
);

/**
 * DELETE /api/v1/event-logs/:id
 * Delete event log
 */
router.delete('/:id', 
  validateParams,
  authorize('event_logs', 'delete'),
  eventlogController.delete.bind(eventlogController)
);

module.exports = router;
