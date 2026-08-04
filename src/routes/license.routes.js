/**
 * License Routes
 * API routes for license management
 */

const express = require('express');
const router = express.Router();
const licenseController = require('../controllers/license.controller');
const { 
  CreateLicenseSchema,
  UpdateLicenseSchema,
  LicenseParamsSchema,
  TenantIdParamsSchema,
  ActivateLicenseSchema,
  ValidateLicenseSchema,
  CheckFeatureSchema,
  RevokeLicenseSchema
} = require('../validation/license.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Validation middleware helpers
const validateCreate = validate(CreateLicenseSchema);
const validateUpdate = validate(UpdateLicenseSchema);
const validateParams = validate(LicenseParamsSchema, 'params');
const validateTenantId = validate(TenantIdParamsSchema, 'params');
const validateActivate = validate(ActivateLicenseSchema);
const validateLicenseValidate = validate(ValidateLicenseSchema);
const validateCheckFeature = validate(CheckFeatureSchema);
const validateRevoke = validate(RevokeLicenseSchema);

// All routes require authentication
router.use(authenticate);
// Platform service guard — blocks access if 'billing' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('billing'));

// =====================================================
// REFERENCE DATA (All authenticated users)
// =====================================================

// Get license types
router.get('/types', licenseController.getTypes);

// Get license tiers
router.get('/tiers', licenseController.getTiers);

// Get licensable applications
router.get('/applications', licenseController.getApplications);

// =====================================================
// TENANT USER ROUTES
// =====================================================

// Get my tenant's licenses
router.get('/my', authorize('licenses', 'read'), licenseController.getMyLicenses);

// Activate license (Tenant Admin)
router.post('/activate', validateActivate, authorize('licenses', 'activate'), licenseController.activate);

// Validate license
router.post('/validate', validateLicenseValidate, authorize('licenses', 'read'), licenseController.validate);

// Check feature access
router.post('/check-feature', validateCheckFeature, authorize('licenses', 'read'), licenseController.checkFeature);

// =====================================================
// SUPER ADMIN ROUTES
// =====================================================

// Create license (Super Admin only)
router.post('/', validateCreate, authorize('licenses', 'write'), licenseController.create);

// List all licenses (Super Admin only)
router.get('/', authorize('licenses', 'read'), licenseController.list);

// Get licenses by tenant (Super Admin only)
router.get('/tenant/:tenantId', validateTenantId, authorize('licenses', 'read'), licenseController.getByTenant);

// Get license by ID
router.get('/:id', validateParams, authorize('licenses', 'read'), licenseController.getById);

// Update license (Super Admin only)
router.put('/:id', validateParams, validateUpdate, authorize('licenses', 'write'), licenseController.update);

// Revoke license (Super Admin only)
router.post('/:id/revoke', validateParams, validateRevoke, authorize('licenses', 'revoke'), licenseController.revoke);

// Get license usage
router.get('/:id/usage', validateParams, authorize('usage', 'read'), licenseController.getUsage);

// Get license audit log (Super Admin only)
router.get('/:id/audit', validateParams, authorize('licenses', 'read'), licenseController.getAuditLog);

module.exports = router;
