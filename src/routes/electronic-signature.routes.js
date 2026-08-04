/**
 * Electronic Signature Routes
 * FDA 21 CFR Part 11 Compliant Electronic Signatures
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/electronic-signature.controller");
const {
  authenticate,
  authorize,
  requireSuperAdmin,
} = require("../middleware/auth.middleware");
const {
  IdParamsSchema,
  WorkflowIdParamsSchema,
  ResourceParamsSchema,
  CreateSignatureSchema,
  VerifySignatureSchema,
  SetPinSchema,
  InvalidateSignatureSchema,
  GetUserHistoryQuerySchema,
  GetStatisticsQuerySchema,
} = require("../validation/electronic-signature.schema");
const { validate } = require("../middleware/validationMiddleware");

// Validation middleware helpers
const validateParams = validate(IdParamsSchema, "params");
const validateWorkflowIdParams = validate(WorkflowIdParamsSchema, "params");
const validateResourceParams = validate(ResourceParamsSchema, "params");
const validateCreateSignature = validate(CreateSignatureSchema);
const validateVerifySignature = validate(VerifySignatureSchema);
const validateSetPin = validate(SetPinSchema);
const validateInvalidate = validate(InvalidateSignatureSchema);
const validateHistoryQuery = validate(GetUserHistoryQuerySchema, "query");
const validateStatisticsQuery = validate(GetStatisticsQuerySchema, "query");

// All routes require authentication
router.use(authenticate);
// Platform service guard — blocks access if 'electronic_signature' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('electronic_signature'));

// ============================================================================
// SIGNATURE OPERATIONS
// ============================================================================

/**
 * @route   POST /api/v1/electronic-signatures/sign
 * @desc    Create an electronic signature
 * @access  Authenticated users
 */
router.post("/sign", validateCreateSignature, controller.sign);

/**
 * @route   POST /api/v1/electronic-signatures/verify
 * @desc    Verify a signature is valid
 * @access  Authenticated users
 */
router.post("/verify", validateVerifySignature, controller.verify);

/**
 * @route   POST /api/v1/electronic-signatures/pin
 * @desc    Set or update signature PIN
 * @access  Authenticated users (own PIN only)
 */
router.post("/pin", validateSetPin, controller.setPin);

// ============================================================================
// SIGNATURE QUERIES
// ============================================================================

/**
 * @route   GET /api/v1/electronic-signatures/actions
 * @desc    Get available signature actions
 * @access  Authenticated users
 */
router.get("/actions", controller.getActions);

/**
 * @route   GET /api/v1/electronic-signatures/statistics
 * @desc    Get signature statistics for compliance reporting
 * @access  Requires audit_logs:read permission
 */
router.get(
  "/statistics",
  validateStatisticsQuery,
  authorize("audit_logs:read"),
  controller.getStatistics,
);

/**
 * @route   GET /api/v1/electronic-signatures/history
 * @desc    Get current user's signature history
 * @access  Authenticated users (own history)
 */
router.get("/history", validateHistoryQuery, controller.getUserHistory);

/**
 * @route   GET /api/v1/electronic-signatures/resource/:resourceType/:resourceId
 * @desc    Get signatures for a specific resource
 * @access  Authenticated users
 */
router.get(
  "/resource/:resourceType/:resourceId",
  validateResourceParams,
  controller.getResourceSignatures,
);

/**
 * @route   GET /api/v1/electronic-signatures/workflow/:workflowId/status
 * @desc    Check workflow completion status
 * @access  Authenticated users
 */
router.get(
  "/workflow/:workflowId/status",
  validateWorkflowIdParams,
  controller.getWorkflowStatus,
);

/**
 * @route   GET /api/v1/electronic-signatures/:id
 * @desc    Get a specific signature
 * @access  Authenticated users
 */
router.get("/:id", validateParams, controller.getSignature);

// ============================================================================
// ADMIN OPERATIONS
// ============================================================================

/**
 * @route   POST /api/v1/electronic-signatures/:id/invalidate
 * @desc    Invalidate a signature (requires super_admin)
 * @access  super_admin only
 */
router.post(
  "/:id/invalidate",
  requireSuperAdmin('electronic_signature', 'delete'),
  validateParams,
  validateInvalidate,
  controller.invalidate,
);

module.exports = router;
