/**
 * QMS Sync Job Routes - QAssure Platform
 * /api/v1/qms/sync-jobs/*
 */
const express = require('express');
const qmssyncjobController = require('../controllers/qms_sync_job_controller');
const { 
  CreateQmssyncjobSchema, 
  UpdateQmssyncjobSchema,
  QmssyncjobParamsSchema 
} = require('../validation/qms_sync_job.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess, requireFeature } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateQmssyncjobSchema);
const validateUpdate = validate(UpdateQmssyncjobSchema);
const validateParams = validate(QmssyncjobParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);
router.use(requireFeature('qms_integration'));
// Platform service guard — blocks access if 'qms' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('qms'));

/**
 * GET /api/v1/qms/sync-jobs
 * Get all sync jobs
 */
router.get('/', 
  authorize('qms_sync_jobs', 'read'),
  qmssyncjobController.findAll.bind(qmssyncjobController)
);

/**
 * GET /api/v1/qms/sync-jobs/:id
 * Get sync job by ID
 */
router.get('/:id', 
  validateParams,
  authorize('qms_sync_jobs', 'read'),
  qmssyncjobController.findById.bind(qmssyncjobController)
);

/**
 * POST /api/v1/qms/sync-jobs
 * Create new sync job
 */
router.post('/', 
  validateCreate,
  authorize('qms_sync_jobs', 'create'),
  qmssyncjobController.create.bind(qmssyncjobController)
);

/**
 * PUT /api/v1/qms/sync-jobs/:id
 * Update sync job
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('qms_sync_jobs', 'update'),
  qmssyncjobController.update.bind(qmssyncjobController)
);

/**
 * DELETE /api/v1/qms/sync-jobs/:id
 * Delete sync job
 */
router.delete('/:id', 
  validateParams,
  authorize('qms_sync_jobs', 'delete'),
  qmssyncjobController.delete.bind(qmssyncjobController)
);

module.exports = router;
