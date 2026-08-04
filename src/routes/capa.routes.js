/**
 * CAPA Routes
 * CAPA management endpoints
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/capa.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
// Platform service guard — blocks access if 'capa' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('capa'));

// ============================================================================
// LOOKUP / REFERENCE DATA
// ============================================================================

router.get('/types', controller.getTypes);
router.get('/sources', controller.getSources);
router.get('/priorities', controller.getPriorities);
router.get('/statuses', controller.getStatuses);
router.get('/root-cause-methods', controller.getRootCauseMethods);
router.get('/dashboard', authorize('capa:read'), controller.getDashboard);

// ============================================================================
// CAPA CRUD
// ============================================================================

router.post('/', authorize('capa:write'), controller.create);
router.get('/', authorize('capa:read'), controller.list);
router.get('/:id', authorize('capa:read'), controller.getById);
router.put('/:id', authorize('capa:write'), controller.update);

// ============================================================================
// WORKFLOW ACTIONS
// ============================================================================

router.post('/:id/submit', authorize('capa:write'), controller.submit);
router.patch('/:id/status', authorize('capa:write'), controller.updateStatus);

// ============================================================================
// CAPA ACTIONS
// ============================================================================

router.get('/:id/actions', authorize('capa:read'), controller.getActions);
router.post('/:id/actions', authorize('capa:write'), controller.addAction);
router.put('/:id/actions/:actionId', authorize('capa:write'), controller.updateAction);

// ============================================================================
// 8D REPORT
// ============================================================================

router.get('/:id/8d', authorize('capa:read'), controller.get8DReport);
router.put('/:id/8d/:section', authorize('capa:write'), controller.update8DSection);

module.exports = router;
