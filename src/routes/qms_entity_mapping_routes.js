/**
 * QMS Entity Mapping Routes - QAssure Platform
 * /api/v1/qms/entity-mappings/*
 */
const express = require('express');
const qmsentitymappingController = require('../controllers/qms_entity_mapping_controller');
const { 
  CreateQmsentitymappingSchema, 
  UpdateQmsentitymappingSchema,
  QmsentitymappingParamsSchema 
} = require('../validation/qms_entity_mapping.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess, requireFeature } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateQmsentitymappingSchema);
const validateUpdate = validate(UpdateQmsentitymappingSchema);
const validateParams = validate(QmsentitymappingParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);
router.use(requireFeature('qms_integration'));
// Platform service guard — blocks access if 'qms' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('qms'));

/**
 * GET /api/v1/qms/entity-mappings
 * Get all entity mappings
 */
router.get('/', 
  authorize('qms_entity_mappings', 'read'),
  qmsentitymappingController.findAll.bind(qmsentitymappingController)
);

/**
 * GET /api/v1/qms/entity-mappings/:id
 * Get entity mapping by ID
 */
router.get('/:id', 
  validateParams,
  authorize('qms_entity_mappings', 'read'),
  qmsentitymappingController.findById.bind(qmsentitymappingController)
);

/**
 * POST /api/v1/qms/entity-mappings
 * Create new entity mapping
 */
router.post('/', 
  // validateCreate,
  authorize('qms_entity_mappings', 'create'),
  qmsentitymappingController.create.bind(qmsentitymappingController)
);

/**
 * PUT /api/v1/qms/entity-mappings/:id
 * Update entity mapping
 */
router.put('/:id', 
  validateParams, 
  validateUpdate,
  authorize('qms_entity_mappings', 'update'),
  qmsentitymappingController.update.bind(qmsentitymappingController)
);

/**
 * DELETE /api/v1/qms/entity-mappings/:id
 * Delete entity mapping
 */
router.delete('/:id', 
  validateParams,
  authorize('qms_entity_mappings', 'delete'),
  qmsentitymappingController.delete.bind(qmsentitymappingController)
);

module.exports = router;
