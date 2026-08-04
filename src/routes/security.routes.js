/**
 * Security Routes
 * Password policies, access reviews, and security settings
 * FDA 21 CFR Part 11 Compliance
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/security.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);
// Platform service guard — blocks access if 'security' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('security'));

// ============================================================================
// PASSWORD POLICY ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/security/password-policy
 * @desc    Get password policy for current tenant
 * @access  Authenticated users
 */
router.get('/password-policy', controller.getPasswordPolicy);

/**
 * @route   PUT /api/v1/security/password-policy
 * @desc    Update password policy
 * @access  tenant_admin or super_admin
 */
router.put('/password-policy', authorize('security:create'), controller.updatePasswordPolicy);

/**
 * @route   GET /api/v1/security/password-policy/requirements
 * @desc    Get password requirements for UI display
 * @access  Authenticated users
 */
router.get('/password-policy/requirements', controller.getPasswordRequirements);

/**
 * @route   POST /api/v1/security/password-policy/validate
 * @desc    Validate a password against policy
 * @access  Authenticated users
 */
router.post('/password-policy/validate', controller.validatePassword);

/**
 * @route   GET /api/v1/security/password-expiry
 * @desc    Check password expiry status for current user
 * @access  Authenticated users
 */
router.get('/password-expiry', controller.checkPasswordExpiry);

// ============================================================================
// ACCESS REVIEW ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/security/access-reviews/compliance-report
 * @desc    Get compliance report for access reviews
 * @access  Requires audit:read permission
 * @note    This route must come before /:id to avoid conflict
 */
router.get('/access-reviews/compliance-report', authorize('audit:read'), controller.getAccessReviewReport);

/**
 * @route   GET /api/v1/security/decision-types
 * @desc    Get available access review decision types
 * @access  Authenticated users
 */
router.get('/decision-types', controller.getDecisionTypes);

/**
 * @route   GET /api/v1/security/review-statuses
 * @desc    Get access review status types
 * @access  Authenticated users
 */
router.get('/review-statuses', controller.getReviewStatuses);

/**
 * @route   POST /api/v1/security/access-reviews
 * @desc    Create a new access review campaign
 * @access  tenant_admin or super_admin
 */
router.post('/access-reviews', authorize('security:create'), controller.createAccessReview);

/**
 * @route   GET /api/v1/security/access-reviews
 * @desc    List access reviews
 * @access  Requires security:read permission
 */
router.get('/access-reviews', authorize('security:read'), controller.listAccessReviews);

/**
 * @route   GET /api/v1/security/access-reviews/:id
 * @desc    Get access review details
 * @access  Requires security:read permission
 */
router.get('/access-reviews/:id', authorize('security:read'), controller.getAccessReview);

/**
 * @route   GET /api/v1/security/access-reviews/:id/items
 * @desc    Get users to review in an access review
 * @access  Requires security:read permission
 */
router.get('/access-reviews/:id/items', authorize('security:read'), controller.getAccessReviewItems);

/**
 * @route   POST /api/v1/security/access-reviews/:id/start
 * @desc    Start an access review
 * @access  Requires security:create permission
 */
router.post('/access-reviews/:id/start', authorize('security:create'), controller.startAccessReview);

/**
 * @route   POST /api/v1/security/access-reviews/:id/populate-items
 * @desc    Populate review items for an existing review
 * @access  Requires security:create permission
 */
router.post('/access-reviews/:id/populate-items', authorize('security:create'), controller.populateReviewItems);

/**
 * @route   POST /api/v1/security/access-reviews/:id/items/:itemId/decide
 * @desc    Make a decision on a user's access
 * @access  Requires security:create permission
 */
router.post('/access-reviews/:id/items/:itemId/decide', authorize('security:create'), controller.makeAccessDecision);

/**
 * @route   POST /api/v1/security/access-reviews/:id/bulk-certify
 * @desc    Certify all pending users at once
 * @access  Requires security:create permission
 */
router.post('/access-reviews/:id/bulk-certify', authorize('security:create'), controller.bulkCertify);

/**
 * @route   POST /api/v1/security/access-reviews/:id/execute
 * @desc    Execute review decisions (actually revoke/modify access)
 * @access  super_admin only
 */
router.post('/access-reviews/:id/execute', authorize('*:*'), controller.executeAccessReview);

/**
 * @route   POST /api/v1/security/access-reviews/:id/cancel
 * @desc    Cancel an access review
 * @access  Requires security:create permission
 */
router.post('/access-reviews/:id/cancel', authorize('security:create'), controller.cancelAccessReview);

// ============================================================================
// SECURITY SETTINGS ROUTES
// ============================================================================

/**
 * @route   GET /api/v1/security/settings
 * @desc    Get security settings for current tenant
 * @access  Requires security:read permission
 */
router.get('/settings', authorize('security:read'), controller.getSecuritySettings);

/**
 * @route   PUT /api/v1/security/settings
 * @desc    Update security settings
 * @access  tenant_admin or super_admin
 */
router.put('/settings', authorize('security:create'), controller.updateSecuritySettings);

/**
 * @route   POST /api/v1/security/settings/compliance-mode
 * @desc    Apply a compliance mode preset
 * @access  super_admin only
 */
router.post('/settings/compliance-mode', authorize('*:*'), controller.applyComplianceMode);

/**
 * @route   GET /api/v1/security/settings/compliance-modes
 * @desc    Get available compliance modes
 * @access  Authenticated users
 */
router.get('/settings/compliance-modes', controller.getComplianceModes);

/**
 * @route   GET /api/v1/security/settings/compliance-summary
 * @desc    Get compliance summary and recommendations
 * @access  Requires security:read permission
 */
router.get('/settings/compliance-summary', authorize('security:read'), controller.getComplianceSummary);

/**
 * @route   GET /api/v1/security/settings/export
 * @desc    Export security settings for backup/audit
 * @access  super_admin only
 */
router.get('/settings/export', authorize('*:*'), controller.exportSettings);

module.exports = router;
