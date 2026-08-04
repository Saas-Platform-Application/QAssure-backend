/**
 * QMS Sync Conflict Routes - QAssure Platform
 * /api/v1/qms/sync-conflicts/*
 */
const express = require('express');
const qmssyncconflictController = require('../controllers/qms_sync_conflict_controller');
const {
  CreateQmssyncconflictSchema,
  UpdateQmssyncconflictSchema,
  QmssyncconflictParamsSchema
} = require('../validation/qms_sync_conflict.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess, requireFeature } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateQmssyncconflictSchema);
const validateUpdate = validate(UpdateQmssyncconflictSchema);
const validateParams = validate(QmssyncconflictParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);
router.use(requireFeature('qms_integration'));
// Platform service guard — blocks access if 'qms' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('qms'));

/**
 * GET /api/v1/qms/sync-conflicts
 * Get all sync conflicts
 */
router.get('/',
  authorize('qms_sync_conflicts', 'read'),
  qmssyncconflictController.findAll.bind(qmssyncconflictController)
);

/**
 * GET /api/v1/qms/sync-conflicts/:id
 * Get sync conflict by ID
 */
router.get('/:id',
  validateParams,
  authorize('qms_sync_conflicts', 'read'),
  qmssyncconflictController.findById.bind(qmssyncconflictController)
);

/**
 * POST /api/v1/qms/sync-conflicts
 * Create new sync conflict
 */
router.post('/',
  authorize('qms_sync_conflicts', 'create'),
  qmssyncconflictController.create.bind(qmssyncconflictController)
);

/**
 * PUT /api/v1/qms/sync-conflicts/:id
 * Update/resolve sync conflict
 */
router.put('/:id',
  validateParams,
  validateUpdate,
  authorize('qms_sync_conflicts', 'update'),
  qmssyncconflictController.update.bind(qmssyncconflictController)
);

/**
 * DELETE /api/v1/qms/sync-conflicts/:id
 * Delete sync conflict
 */
router.delete('/:id',
  validateParams,
  authorize('qms_sync_conflicts', 'delete'),
  qmssyncconflictController.delete.bind(qmssyncconflictController)
);

module.exports = router;
