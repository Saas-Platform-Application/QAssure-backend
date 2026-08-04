/**
 * Session Routes - QAssure Platform
 * /api/v1/sessions/*
 */
const express = require('express');
const sessionController = require('../controllers/session_controller');
const { 
  CreateSessionSchema, 
  UpdateSessionSchema,
  SessionParamsSchema 
} = require('../validation/session.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateSessionSchema);
const validateUpdate = validate(UpdateSessionSchema);
const validateParams = validate(SessionParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);

/**
 * GET /api/v1/sessions
 * Get all sessions (admin only)
 */
router.get('/', 
  authorize('sessions', 'read'),
  sessionController.findAll.bind(sessionController)
);

/**
 * GET /api/v1/sessions/:id
 * Get session by ID
 */
router.get('/:id', 
  validateParams,
  authorize('sessions', 'read'),
  sessionController.findById.bind(sessionController)
);

/**
 * POST /api/v1/sessions
 * Create new session (system use)
 */
router.post('/', 
  validateCreate,
  authorize('sessions', 'create'),
  sessionController.create.bind(sessionController)
);

/**
 * PUT /api/v1/sessions/:id
 * Update session
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('sessions', 'update'),
  sessionController.update.bind(sessionController)
);

/**
 * DELETE /api/v1/sessions/:id
 * Delete/revoke session
 */
router.delete('/:id', 
  validateParams,
  authorize('sessions', 'delete'),
  sessionController.delete.bind(sessionController)
);

module.exports = router;
