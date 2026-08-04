/**
 * QMS Connection Routes - QAssure Platform
 * /api/v1/qms/connections/*
 */
const express = require('express');
const qmsConnectionController = require('../controllers/qms_connection_controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess, requireFeature } = require('../middleware/tenant.middleware');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);
router.use(requireFeature('qms_integration'));
// Platform service guard — blocks access if 'qms' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('qms'));

/**
 * GET /api/v1/qms/connections
 */
router.get('/', 
  authorize('qms_connections', 'read'),
  qmsConnectionController.findAll.bind(qmsConnectionController)
);

/**
 * GET /api/v1/qms/connections/:id
 */
router.get('/:id', 
  authorize('qms_connections', 'read'),
  qmsConnectionController.findById.bind(qmsConnectionController)
);

/**
 * POST /api/v1/qms/connections
 */
router.post('/', 
  authorize('qms_connections', 'create'),
  qmsConnectionController.create.bind(qmsConnectionController)
);

/**
 * PUT /api/v1/qms/connections/:id
 */
router.put('/:id', 
  authorize('qms_connections', 'update'),
  qmsConnectionController.update.bind(qmsConnectionController)
);

/**
 * DELETE /api/v1/qms/connections/:id
 */
router.delete('/:id', 
  authorize('qms_connections', 'delete'),
  qmsConnectionController.delete.bind(qmsConnectionController)
);

module.exports = router;
