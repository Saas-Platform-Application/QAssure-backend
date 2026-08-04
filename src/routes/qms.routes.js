/**
 * QMS Routes - QAssure Platform
 * Extended routes for QMS integration (adds to existing qms_connection_routes.js)
 */
const express = require('express');
const router = express.Router();
const qmsController = require('../controllers/qms.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);
// Platform service guard — blocks access if 'qms' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('qms'));

// ==================== Supported Systems (NEW) ====================

// List supported QMS systems
router.get('/supported',
  authorize('qms:read'),
  qmsController.getSupportedSystems
);

// Get system details
router.get('/supported/:systemName',
  authorize('qms:read'),
  qmsController.getSystemDetails
);

// ==================== Connection Extensions ====================

// Test connection
router.post('/connections/:id/test',
  authorize('qms:update'),
  qmsController.testConnection
);

// Get entity fields/schema
router.get('/connections/:id/fields/:entityType',
  authorize('qms:read'),
  qmsController.getEntityFields
);

// ==================== Field Mappings ====================

// Get all mappings
router.get('/connections/:id/mappings',
  authorize('qms:read'),
  qmsController.getMappings
);

// Update mappings for entity type
router.put('/connections/:id/mappings/:entityType',
  authorize('qms:update'),
  qmsController.updateMappings
);

// ==================== Sync Configuration ====================

// Get sync config
router.get('/connections/:id/sync-config',
  authorize('qms:read'),
  qmsController.getSyncConfig
);

// Update sync config
router.put('/connections/:id/sync-config',
  authorize('qms:update'),
  qmsController.updateSyncConfig
);

// ==================== Sync Operations ====================

// Trigger sync
router.post('/connections/:id/sync',
  authorize('qms:create'),
  qmsController.triggerSync
);

// Get sync status
router.get('/connections/:id/sync/status',
  authorize('qms:read'),
  qmsController.getSyncStatus
);

// Get sync history
router.get('/connections/:id/sync/history',
  authorize('qms:read'),
  qmsController.getSyncHistory
);

// Get sync errors
router.get('/connections/:id/sync/errors',
  authorize('qms:read'),
  qmsController.getSyncErrors
);

// ==================== Sync Jobs ====================

// Get sync job by ID
router.get('/sync/jobs/:jobId',
  authorize('qms:read'),
  qmsController.getSyncJob
);

// Cancel sync job
router.post('/sync/jobs/:jobId/cancel',
  authorize('qms:update'),
  qmsController.cancelSync
);

// ==================== Conflicts ====================

// Resolve conflict
router.post('/conflicts/:conflictId/resolve',
  authorize('qms:update'),
  qmsController.resolveConflict
);

module.exports = router;
