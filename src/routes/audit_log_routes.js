/**
 * Audit Log Routes - QAssure Platform
 * /api/v1/audit-logs/*
 */
const express = require('express');
const auditlogController = require('../controllers/audit_log_controller');
const { 
  CreateAuditlogSchema, 
  AuditlogParamsSchema 
} = require('../validation/audit_log.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext, verifyTenantAccess } = require('../middleware/tenant.middleware');

const router = express.Router();

// Validation middleware helper
const validateCreate = validate(CreateAuditlogSchema);
const validateParams = validate(AuditlogParamsSchema, 'params');

// Apply authentication to all routes
router.use(authenticate);
router.use(tenantContext);
router.use(verifyTenantAccess);


/**
 * GET /api/v1/audit-logs/my-logs
 * Get current user's own audit logs (any authenticated user)
 */
router.get('/my-logs',
  auditlogController.getMyLogs.bind(auditlogController)
);


/**
 * GET /api/v1/audit-logs/stats
 * Get audit log statistics
 */
router.get('/stats',
  authorize('audit_logs', 'read'),
  auditlogController.getStats.bind(auditlogController)
);

/**
 * GET /api/v1/audit-logs/export
 * Export audit logs
 */
router.get('/export',
  authorize('audit_logs', 'read'),
  auditlogController.export.bind(auditlogController)
);

/**
 * GET /api/v1/audit-logs
 * Get all audit logs (read-only for most users)
 */
router.get('/', 
  authorize('audit_logs', 'read'),
  auditlogController.findAll.bind(auditlogController)
);

/**
 * GET /api/v1/audit-logs/:id
 * Get audit log by ID
 */
router.get('/:id', 
  validateParams,
  authorize('audit_logs', 'read'),
  auditlogController.findById.bind(auditlogController)
);

/**
 * POST /api/v1/audit-logs
 * Create new audit log (system only - super_admin)
 */
router.post('/', 
  validateCreate,
  authorize('audit_logs', 'create'),
  auditlogController.create.bind(auditlogController)
);



/**
 * DELETE /api/v1/audit-logs/:id
 * Delete audit log (super_admin only - compliance may restrict)
 */
router.delete('/:id', 
  validateParams,
  authorize('audit_logs', 'delete'),
  auditlogController.delete.bind(auditlogController)
);

module.exports = router;
