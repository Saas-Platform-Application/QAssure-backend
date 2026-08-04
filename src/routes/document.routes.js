/**
 * Document Routes
 * Document management endpoints
 */

const express = require("express");
const router = express.Router();
const controller = require("../controllers/document.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const { tenantContext } = require("../middleware/tenant.middleware");
const { authenticateAny } = require("../middleware/apikey.middleware");
const { validate } = require("../middleware/validationMiddleware");
const {
  CreateDocumentCategorySchema,
  UpdateDocumentCategorySchema,
  CreateDocumentSchema,
  UpdateDocumentSchema,
  DocumentIdParamsSchema,
  SubmitForReviewSchema,
  ListDocumentQuerySchema,
} = require("../validation/document.schema");

// All routes require authentication
//router.use(authenticate);
router.use(authenticateAny);
router.use(tenantContext);
// Platform service guard — blocks access if 'document' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('document'));

// ============================================================================
// STATIC ROUTES (must come before parameterized routes)
// ============================================================================

/**
 * @route   GET /api/v1/documents/categories
 * @desc    Get document categories
 * @access  document:read
 */
router.get("/categories", authorize("document:read"), controller.getCategories);

/**
 * @route   POST /api/v1/documents/categories
 * @desc    Create document category
 * @access  document:create
 */
router.post(
  "/categories",
  authorize("document:create"),
  validate(CreateDocumentCategorySchema),
  controller.createCategory,
);

/**
 * @route   PUT /api/v1/documents/categories/:id
 * @desc    Update document category
 * @access  document:create
 */
router.put(
  "/categories/:id",
  authorize("document:create"),
  validate(DocumentIdParamsSchema, "params"),
  validate(UpdateDocumentCategorySchema),
  controller.updateCategory,
);

/**
 * @route   DELETE /api/v1/documents/categories/:id
 * @desc    Delete document category
 * @access  document:create
 */
router.delete(
  "/categories/:id",
  authorize("document:create"),
  validate(DocumentIdParamsSchema, "params"),
  controller.deleteCategory,
);

/**
 * @route   GET /api/v1/documents/types
 * @desc    Get available document types
 * @access  Authenticated users
 */
router.get("/types", controller.getDocumentTypes);

/**
 * @route   GET /api/v1/documents/statuses
 * @desc    Get document statuses
 * @access  Authenticated users
 */
router.get("/statuses", controller.getStatuses);

/**
 * @route   GET /api/v1/documents/due-for-review
 * @desc    Get documents due for periodic review
 * @access  document:read
 */
router.get(
  "/due-for-review",
  authorize("document:read"),
  controller.getDueForReview,
);

// ============================================================================
// DOCUMENT CRUD
// ============================================================================

/**
 * @route   POST /api/v1/documents
 * @desc    Create a new document
 * @access  document:create
 */
router.post(
  "/",
  authorize("document:create"),
  validate(CreateDocumentSchema),
  controller.create,
);

/**
 * @route   GET /api/v1/documents
 * @desc    List documents
 * @access  document:read
 */
router.get(
  "/",
  authorize("document:read"),
  validate(ListDocumentQuerySchema, "query"),
  controller.list,
);

/**
 * @route   GET /api/v1/documents/:id
 * @desc    Get document by ID
 * @access  document:read
 */
router.get(
  "/:id",
  authorize("document:read"),
  validate(DocumentIdParamsSchema, "params"),
  controller.getById,
);

/**
 * @route   PUT /api/v1/documents/:id
 * @desc    Update document metadata
 * @access  document:create
 */
router.put(
  "/:id",
  authorize("document:create"),
  validate(DocumentIdParamsSchema, "params"),
  validate(UpdateDocumentSchema),
  controller.update,
);

// ============================================================================
// VERSION MANAGEMENT
// ============================================================================

/**
 * @route   GET /api/v1/documents/:id/versions
 * @desc    Get all versions of a document
 * @access  document:read
 */
router.get("/:id/versions", authorize("document:read"), controller.getVersions);

/**
 * @route   POST /api/v1/documents/:id/versions
 * @desc    Create a new version
 * @access  document:create
 */
router.post(
  "/:id/versions",
  authorize("document:create"),
  controller.createVersion,
);

// ============================================================================
// WORKFLOW ACTIONS
// ============================================================================

router.post(
  "/:id/submit",
  authorize("document:create"),
  validate(DocumentIdParamsSchema, "params"),
  validate(SubmitForReviewSchema),
  controller.submitForReview,
);
router.post("/:id/approve", authorize("document:create"), controller.approve);
router.post("/:id/reject", authorize("document:create"), controller.reject);
router.post(
  "/:id/make-effective",
  authorize("document:create"),
  controller.makeEffective,
);
router.post(
  "/:id/obsolete",
  authorize("document:create"),
  controller.makeObsolete,
);

// ============================================================================
// CHECKOUT/CHECKIN
// ============================================================================

/**
 * @route   POST /api/v1/documents/:id/checkout
 * @desc    Checkout document for editing
 * @access  document:create
 */
router.post("/:id/checkout", authorize("document:create"), controller.checkout);

/**
 * @route   POST /api/v1/documents/:id/checkin
 * @desc    Checkin document after editing
 * @access  document:create
 */
router.post("/:id/checkin", authorize("document:create"), controller.checkin);

// ============================================================================
// SECTIONS (structured review)
// ============================================================================

/**
 * @route   GET /api/v1/documents/:id/sections
 * @desc    List all sections of a document
 * @access  document:read
 */
router.get("/:id/sections", authorize("document:read"), controller.getSections);

/**
 * @route   PATCH /api/v1/documents/:id/sections/:sectionId
 * @desc    Update section content (assignee only)
 * @access  document:read
 */
router.patch(
  "/:id/sections/:sectionId",
  authorize("document:read"),
  controller.updateSection,
);

/**
 * @route   POST /api/v1/documents/:id/sections/:sectionId/review
 * @desc    Mark section as reviewed | rework | pending (assignee only)
 * @access  document:read
 */
router.post(
  "/:id/sections/:sectionId/review",
  authorize("document:read"),
  controller.markSectionStatus,
);

// ============================================================================
// COMMENTS
// ============================================================================

/**
 * @route   GET /api/v1/documents/:id/comments
 * @desc    List comments for a document (optionally filtered by ?section_id=)
 * @access  document:read
 */
router.get("/:id/comments", authorize("document:read"), controller.listComments);

/**
 * @route   POST /api/v1/documents/:id/comments
 * @desc    Add a comment (document or section level)
 * @access  document:read
 */
router.post("/:id/comments", authorize("document:read"), controller.addComment);

/**
 * @route   PATCH /api/v1/documents/:id/comments/:commentId/resolve
 * @desc    Resolve a comment
 * @access  document:read
 */
router.patch(
  "/:id/comments/:commentId/resolve",
  authorize("document:read"),
  controller.resolveComment,
);

module.exports = router;
