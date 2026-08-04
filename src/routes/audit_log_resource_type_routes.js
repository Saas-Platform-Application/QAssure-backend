const express = require('express');
const router = express.Router();
const AuditLogResourceTypeController = require('../controllers/audit_log_resource_type_controller');
const { authenticate, requireSuperAdmin } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validationMiddleware');
const {
  CreateAuditLogResourceTypeSchema,
  UpdateAuditLogResourceTypeSchema,
  AuditLogResourceTypeParamsSchema,
} = require('../validation/audit_log_resource_type.schema');

// Validation middleware
const validateCreate = validate(CreateAuditLogResourceTypeSchema);
const validateUpdate = validate(UpdateAuditLogResourceTypeSchema);
const validateParams = validate(AuditLogResourceTypeParamsSchema, 'params');

// Public/Authed: Get dropdown for filters
router.get('/dropdown', authenticate, AuditLogResourceTypeController.getDropdown);

// Super Admin Only: Management CRUD
router.get('/', authenticate, requireSuperAdmin('audit_resources', 'read'), AuditLogResourceTypeController.getAll);

// BE-9: validateCreate added — POST was previously fully unvalidated
router.post('/', authenticate, requireSuperAdmin('audit_resources', 'create'), validateCreate, AuditLogResourceTypeController.create);

// BE-9: validateParams (UUID check) + validateUpdate added
router.put('/:id', authenticate, requireSuperAdmin('audit_resources', 'update'), validateParams, validateUpdate, AuditLogResourceTypeController.update);

// BE-9: validateParams (UUID check) added — raw non-UUID strings went directly to Sequelize
router.delete('/:id', authenticate, requireSuperAdmin('audit_resources', 'delete'), validateParams, AuditLogResourceTypeController.delete);

module.exports = router;

