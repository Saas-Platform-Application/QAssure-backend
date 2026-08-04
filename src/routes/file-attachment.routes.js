/**
 * File Attachment Routes
 * Secured, auditable file management with versioning support
 */

const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const controller = require("../controllers/file-attachment.controller");
const {
  authenticate,
  authorize,
  authorizeAny,
} = require("../middleware/auth.middleware");
const {
  tenantContext,
  optionalTenantContext,
} = require("../middleware/tenant.middleware");
const { validateUUID } = require("../middleware/validate-uuid.middleware");
const { validate } = require("../middleware/validationMiddleware");
const {
  UploadFileSchema,
  UpdateFileMetadataSchema,
  CreateShareSchema,
} = require("../validation/file-attachment.schema");
// Multer configuration
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const blockedExtensions = [
    ".exe",
    ".bat",
    ".cmd",
    ".sh",
    ".ps1",
    ".msi",
    ".dll",
    ".com",
    ".scr",
    ".vbs",
    ".js",
  ];
  const ext = path.extname(file.originalname).toLowerCase();

  if (blockedExtensions.includes(ext)) {
    return cb(new Error(`File type ${ext} is not allowed`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max
  },
});

// Multer error handler
const handleMulterError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        error: {
          code: "FILE_TOO_LARGE",
          message: "File size exceeds 100MB limit",
        },
      });
    }
    return res.status(400).json({
      success: false,
      error: { code: "UPLOAD_ERROR", message: err.message },
    });
  }
  if (err) {
    return res.status(400).json({
      success: false,
      error: { code: "UPLOAD_ERROR", message: err.message },
    });
  }
  next();
};

// ============================================================================
// PUBLIC ROUTES (Shared file access — no auth required)
// ============================================================================

router.get("/shared/:token", controller.accessSharedFile);

// ============================================================================
// AUTHENTICATED ROUTES (JWT + API Key both supported via authenticate)
// ============================================================================

router.use(authenticate);
router.use(tenantContext);
// Platform service guard — blocks access if 'file_attachment' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('file_attachment'));

// Upload
router.post(
  "/upload",
  authorize("files:create"),
  upload.single("file"),
  handleMulterError,
  validate(UploadFileSchema),
  controller.upload,
);
router.post(
  "/upload/multiple",
  authorize("files:create"),
  upload.array("files", 10),
  handleMulterError,
  validate(UploadFileSchema),
  controller.uploadMultiple,
);

// List & filter options (BEFORE /:id to avoid route conflicts)
router.get("/", authorize("files:read"), controller.list);
router.get(
  "/dropdown-options",
  authorizeAny([
    { resource: "files", action: "read" },
    { resource: "document", action: "read" },
  ]),
  controller.listForDropdown,
);
router.get(
  "/filter-options",
  authorize("files:read"),
  controller.getFilterOptions,
);
router.get(
  "/categories-filter-options",
  authorize("files:read"),
  controller.getCategoriesFilterOptions,
);
router.get("/stats", authorize("files:read"), controller.getStorageStats);
router.get("/quota", authorize("files:read"), controller.getQuota);
router.put("/quota", authorize("files:admin"), controller.updateQuota);

// By Entity
router.get(
  "/entity/:entity_type/:entity_id",
  authorize("files:read"),
  validateUUID("entity_id"),
  controller.getByEntity,
);

// Single file operations (AFTER static routes)
router.get(
  "/:id",
  authorize("files:read"),
  validateUUID("id"),
  controller.getById,
);
router.put(
  "/:id",
  authorize("files:update"),
  validateUUID("id"),
  validate(UpdateFileMetadataSchema),
  controller.updateMetadata,
);
router.delete(
  "/:id",
  authorize("files:delete"),
  validateUUID("id"),
  controller.delete,
);
router.get(
  "/:id/download",
  authorize("files:read"),
  validateUUID("id"),
  controller.download,
);
router.get(
  "/:id/preview",
  // authorize("files:read"),
  validateUUID("id"),
  controller.preview,
);
router.get(
  "/:id/content",
  authorize("files:read"),
  validateUUID("id"),
  controller.extractContent,
);

// Versioning
router.post(
  "/:id/versions",
  authorize("files:create"),
  validateUUID("id"),
  upload.single("file"),
  handleMulterError,
  controller.uploadVersion,
);
router.get(
  "/:id/versions",
  authorize("files:read"),
  validateUUID("id"),
  controller.getVersionHistory,
);

// Sharing
router.post(
  "/:id/share",
  authorize("files:create"),
  validateUUID("id"),
  validate(CreateShareSchema),
  controller.createShare,
);
router.delete(
  "/shares/:shareId",
  authorize("files:delete"),
  validateUUID("shareId"),
  controller.revokeShare,
);

// ============================================================================
// ADMIN — Blob cleanup (Layer 3)
// ============================================================================

router.post(
  "/blobs/purge-soft-deleted",
  authorize("files:admin"),
  async (req, res) => {
    try {
      const service =
        require("../services/file-attachment.service").getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin
        ? req.tenantId || req.user.tenantId
        : req.user.tenantId;
      const olderThanHours = parseInt(req.query.older_than_hours) || 0;
      const result = await service.purgeSoftDeletedBlobs(
        tenantId,
        olderThanHours,
      );
      res.json({ success: true, data: result });
    } catch (e) {
      res
        .status(500)
        .json({
          success: false,
          error: { code: "PURGE_ERROR", message: e.message },
        });
    }
  },
);

module.exports = router;
