/**
 * Supplier Routes
 * Supplier quality management endpoints
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/supplier.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validationMiddleware');
const { 
  CreateSupplierSchema, 
  UpdateSupplierSchema, 
  SupplierIdParamSchema, 
  AddContactSchema,
  CreateScorecardSchema
} = require('../validation/supplier.schema');
const { tenantContext } = require('../middleware/tenant.middleware');

router.use(authenticate);
router.use(tenantContext);
// Platform service guard — blocks access if 'supplier' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('supplier'));

// ============================================================================
// LOOKUP / REFERENCE DATA
// ============================================================================

router.get('/types', controller.getTypes);
router.get('/categories', controller.getCategories);
router.get('/statuses', controller.getStatuses);
router.get('/audit-types', controller.getAuditTypes);
router.get('/dashboard', authorize('supplier:read'), controller.getDashboard);

// ============================================================================
// APPROVED SUPPLIER LIST
// ============================================================================

router.get('/asl', authorize('supplier:read'), controller.getASL);

// ============================================================================
// SUPPLIER CRUD
// ============================================================================

router.post('/', authorize('supplier:create'), validate(CreateSupplierSchema), controller.create);
router.get('/', authorize('supplier:read'), controller.list);
router.get('/:id', authorize('supplier:read'), controller.getById);
router.put('/:id', authorize('supplier:update'), validate(UpdateSupplierSchema), controller.update);

// ============================================================================
// WORKFLOW
// ============================================================================

router.post('/:id/submit', authorize('supplier:create'), controller.submit);
router.patch('/:id/status', authorize('supplier:update'), controller.updateStatus);

// ============================================================================
// CONTACTS
// ============================================================================

router.get('/:id/contacts', authorize('supplier:read'), validate(SupplierIdParamSchema, 'params'), controller.getContacts);
router.post('/:id/contacts', authorize('supplier:create'), validate(SupplierIdParamSchema, 'params'), validate(AddContactSchema), controller.addContact);

// ============================================================================
// AUDITS
// ============================================================================

router.get('/:id/audits', authorize('supplier:read'), controller.getAudits);
router.post('/:id/audits', authorize('supplier:create'), controller.createAudit);
router.put('/:id/audits/:auditId/complete', authorize('supplier:update'), controller.completeAudit);

// ============================================================================
// SCORECARDS
// ============================================================================

router.get('/:id/scorecards', authorize('supplier:read'), validate(SupplierIdParamSchema, 'params'), controller.getScorecards);
router.post('/:id/scorecards', authorize('supplier:create'), validate(SupplierIdParamSchema, 'params'), validate(CreateScorecardSchema), controller.createScorecard);

// ============================================================================
// ASL (per supplier)
// ============================================================================

router.post('/:id/asl', authorize('supplier:create'), controller.addToASL);

module.exports = router;
