/**
 * File Attachment Controller
 * Handles file upload, download, and management endpoints
 */

const {
  getFileAttachmentService,
  isCloudProviderType,
} = require("../services/file-attachment.service");
const path = require("path");

// Error sanitizer — prevents leaking PostgreSQL internals to API consumers
function sanitizeErrorResponse(error, defaultCode = "INTERNAL_ERROR") {
  const clientPatterns = [
    { pattern: /quota/i, code: "QUOTA_ERROR", status: 400 },
    { pattern: /duplicate/i, code: "DUPLICATE_ERROR", status: 409 },
    { pattern: /not found/i, code: "NOT_FOUND", status: 404 },
    { pattern: /not allowed/i, code: "NOT_ALLOWED", status: 403 },
    { pattern: /required/i, code: "VALIDATION_ERROR", status: 400 },
    { pattern: /invalid.*format/i, code: "VALIDATION_ERROR", status: 400 },
    { pattern: /file type/i, code: "INVALID_FILE_TYPE", status: 400 },
    { pattern: /too large/i, code: "FILE_TOO_LARGE", status: 400 },
    { pattern: /No valid/i, code: "VALIDATION_ERROR", status: 400 },
    { pattern: /expired/i, code: "EXPIRED", status: 410 },
    { pattern: /max.*download/i, code: "MAX_DOWNLOADS_REACHED", status: 410 },
    { pattern: /category/i, code: "CATEGORY_ERROR", status: 400 },
    { pattern: /No storage bucket/i, code: "NO_BUCKET_CONFIGURED", status: 400 },
  ];

  for (const { pattern, code, status } of clientPatterns) {
    if (pattern.test(error.message)) {
      return { status, code, message: error.message };
    }
  }

  console.error(`[FileAttachment] Internal error:`, error.message, error.stack);

  // In development, expose the real error so it's easier to debug
  if (process.env.NODE_ENV === "development") {
    return {
      status: 500,
      code: defaultCode,
      message: error.message,
    };
  }

  return {
    status: 500,
    code: defaultCode,
    message: "An internal error occurred. Please try again or contact support.",
  };
}

class FileAttachmentController {
  // ============================================================================
  // UPLOAD
  // ============================================================================

  async upload(req, res) {
    try {
      const service = getFileAttachmentService();
      let tenantId = req.user.tenantId;
      if (req.tenantId) {
        tenantId = req.tenantId;
      }
      const uploadedBy = req.user.id;
      const {
        entity_type,
        entity_id,
        category,
        category_id,
        description,
        tags,
        metadata,
      } = req.body;

      if (!req.file) {
        return res
          .status(400)
          .json({
            success: false,
            error: { code: "NO_FILE", message: "No file uploaded" },
          });
      }

      if (!entity_type || !entity_id) {
        return res
          .status(400)
          .json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "entity_type and entity_id are required",
            },
          });
      }

      // Parse metadata if it's a string (common in multipart)
      let parsedMetadata = {};
      if (metadata) {
        try {
          parsedMetadata =
            typeof metadata === "string" ? JSON.parse(metadata) : metadata;
        } catch (e) {
          console.warn(
            "[FileAttachment] Failed to parse metadata string:",
            e.message,
          );
        }
      }

      // Parse tags (handles array or comma-separated string or JSON array string)
      let parsedTags = [];
      if (tags) {
        if (Array.isArray(tags)) {
          parsedTags = tags;
        } else if (typeof tags === "string") {
          if (tags.trim().startsWith("[") && tags.trim().endsWith("]")) {
            try {
              parsedTags = JSON.parse(tags);
            } catch (e) {
              parsedTags = tags.split(",").map((t) => t.trim());
            }
          } else {
            parsedTags = tags.split(",").map((t) => t.trim());
          }
        }
      }

      const attachment = await service.upload(
        tenantId,
        req.file,
        entity_type,
        entity_id,
        {
          category,
          category_id,
          description,
          tags: parsedTags,
          metadata: parsedMetadata,
        },
        uploadedBy,
        req,
      );

      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "UPLOAD_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async uploadMultiple(req, res) {
    try {
      const service = getFileAttachmentService();
      let tenantId = req.user.tenantId;
      if (req.tenantId) {
        tenantId = req.tenantId;
      }
      const uploadedBy = req.user.id;
      const {
        entity_type,
        entity_id,
        category,
        category_id,
        description,
        tags,
        metadata,
      } = req.body;

      if (!req.files || req.files.length === 0) {
        return res
          .status(400)
          .json({
            success: false,
            error: { code: "NO_FILES", message: "No files uploaded" },
          });
      }

      if (!entity_type || !entity_id) {
        return res
          .status(400)
          .json({
            success: false,
            error: {
              code: "VALIDATION_ERROR",
              message: "entity_type and entity_id are required",
            },
          });
      }

      // Parse metadata and tags
      let parsedMetadata = {};
      if (metadata) {
        try {
          parsedMetadata =
            typeof metadata === "string" ? JSON.parse(metadata) : metadata;
        } catch (e) {}
      }
      let parsedTags = [];
      if (tags) {
        if (Array.isArray(tags)) {
          parsedTags = tags;
        } else if (typeof tags === "string") {
          if (tags.trim().startsWith("[") && tags.trim().endsWith("]")) {
            try {
              parsedTags = JSON.parse(tags);
            } catch (e) {
              parsedTags = tags.split(",").map((t) => t.trim());
            }
          } else {
            parsedTags = tags.split(",").map((t) => t.trim());
          }
        }
      }

      const result = await service.uploadMultiple(
        tenantId,
        req.files,
        entity_type,
        entity_id,
        {
          category,
          category_id,
          description,
          tags: parsedTags,
          metadata: parsedMetadata,
        },
        uploadedBy,
        req,
      );

      res.status(201).json({ success: true, data: result });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "MULTI_UPLOAD_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  // ============================================================================
  // VERSIONING
  // ============================================================================

  async uploadVersion(req, res) {
    try {
      const service = getFileAttachmentService();
      let tenantId = req.user.tenantId;
      if (req.tenantId) {
        tenantId = req.tenantId;
      }
      const uploadedBy = req.user.id;
      const { id } = req.params;

      if (!req.file) {
        return res
          .status(400)
          .json({
            success: false,
            error: { code: "NO_FILE", message: "No file uploaded" },
          });
      }

      const { entity_id, category, category_id, description, tags, metadata } = req.body;

      // Parse metadata and tags
      let parsedMetadata = {};
      if (metadata) {
        try {
          parsedMetadata =
            typeof metadata === "string" ? JSON.parse(metadata) : metadata;
        } catch (e) {}
      }
      let parsedTags = [];
      if (tags) {
        if (Array.isArray(tags)) {
          parsedTags = tags;
        } else if (typeof tags === "string") {
          if (tags.trim().startsWith("[") && tags.trim().endsWith("]")) {
            try {
              parsedTags = JSON.parse(tags);
            } catch (e) {
              parsedTags = tags.split(",").map((t) => t.trim());
            }
          } else {
            parsedTags = tags.split(",").map((t) => t.trim());
          }
        }
      }

      const attachment = await service.uploadVersion(
        tenantId,
        id,
        req.file,
        {
          entity_id,
          category,
          category_id,
          description,
          tags: parsedTags,
          metadata: parsedMetadata,
        },
        uploadedBy,
        req,
      );

      res.status(201).json({ success: true, data: attachment });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "VERSION_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async getVersionHistory(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { id } = req.params;

      const versions = await service.getVersionHistory(id, tenantId);
      res.json({ success: true, data: versions });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "VERSION_HISTORY_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  // ============================================================================
  // RETRIEVE
  // ============================================================================

  async getById(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { id } = req.params;

      const attachment = await service.getById(id, tenantId);
      if (!attachment) {
        return res
          .status(404)
          .json({
            success: false,
            error: { code: "NOT_FOUND", message: "File not found" },
          });
      }

      res.json({ success: true, data: attachment });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "FETCH_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async getByEntity(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { entity_type, entity_id } = req.params;
      const { category, limit, offset, current_only } = req.query;

      const result = await service.getByEntity(
        entity_type,
        entity_id,
        tenantId,
        {
          category,
          limit: parseInt(limit) || 100,
          offset: parseInt(offset) || 0,
          current_only: current_only !== "false",
        },
      );

      res.json({ success: true, ...result });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "ENTITY_FETCH_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async list(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;

      const {
        entity_type,
        entity_id,
        mime_type,
        category,
        category_id,
        source_module,
        source_module_id,
        search,
        tags,
        metadata,
        sort_by,
        sort_order,
        uploaded_by,
        limit,
        offset,
        ...rest
      } = req.query;

      // rest contains potential metadata filters. Restrict to specific keys as per requirements.
      const allowedMetadataKeys = ["department", "priority"];
      const metadata_filters = {};
      Object.keys(rest).forEach((key) => {
        if (allowedMetadataKeys.includes(key)) {
          metadata_filters[key] = rest[key];
        }
      });

      const result = await service.list(tenantId, {
        entity_type,
        entity_id,
        mime_type,
        category,
        category_id,
        source_module,
        source_module_id,
        search,
        tags,
        metadata,
        metadata_filters,
        sort_by,
        sort_order,
        uploaded_by,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });

      res.json({ success: true, ...result });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "LIST_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async getFilterOptions(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { uploaded_by } = req.query;

      // Capture source_module (especially  for API Key calls)
      const sourceModule =
        req.module && req.module.code
          ? req.module.code
          : req.user && req.user.isApiKey
            ? req.user.moduleCode
            : req.query.source_module || null;
      // if uploaded_by is given in params take uploaded_by to filter and get related data( to be implement today 12 mar )
      const options = await service.getFilterOptions(
        tenantId,
        sourceModule,
        uploaded_by,
      );
      res.json({ success: true, data: options });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "FILTER_OPTIONS_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async getCategoriesFilterOptions(req,res){
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { uploaded_by } = req.query;

      // Capture source_module (especially  for API Key calls)
      const sourceModule =
        req.module && req.module.code
          ? req.module.code
          : req.user && req.user.isApiKey
            ? req.user.moduleCode
            : req.query.source_module || null;
      // if uploaded_by is given in params take uploaded_by to filter and get related data( to be implement today 12 mar )
      const options = await service.getCategoriesFilterOptions(
        tenantId,
        sourceModule,
        uploaded_by,
      );
      res.json({ success: true, data: options });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "FILTER_OPTIONS_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  // ============================================================================
  // UPDATE METADATA
  // ============================================================================

  async updateMetadata(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { id } = req.params;

      const attachment = await service.updateMetadata(id, tenantId, req.body);
      res.json({ success: true, data: attachment });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "UPDATE_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  // ============================================================================
  // DOWNLOAD
  // ============================================================================

  async download(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;

      const { path: filePath, attachment, storageType } = await service.getFilePath(
        id,
        tenantId,
        userId,
        req,
      );

      res.setHeader("Content-Type", attachment.mime_type);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(attachment.original_name)}"`,
      );
      res.setHeader("Content-Length", attachment.file_size);

      // For cloud providers getFilePath() returns a signed URL, not a local
      // path — stream the object instead of handing sendFile a URL.
      if (isCloudProviderType(storageType)) {
        const { stream } = await service.getFileStream(id, tenantId, userId, req);
        return stream.pipe(res);
      }

      res.sendFile(filePath);
    } catch (error) {
      const err = sanitizeErrorResponse(error, "DOWNLOAD_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async preview(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;

      const { path: filePath, attachment, storageType } = await service.getFilePath(
        id,
        tenantId,
        userId,
        req,
      );

      res.setHeader("Content-Type", attachment.mime_type);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${encodeURIComponent(attachment.original_name)}"`,
      );

      // Signed URL rather than a local path for cloud providers — stream it.
      if (isCloudProviderType(storageType)) {
        const { stream } = await service.getFileStream(id, tenantId, userId, req);
        return stream.pipe(res);
      }

      res.sendFile(filePath);
    } catch (error) {
      const err = sanitizeErrorResponse(error, "PREVIEW_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  // ============================================================================
  // DELETE
  // ============================================================================

  async delete(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { id } = req.params;
      const { hard, keep_blob } = req.query;   // keep_blob: Layer 3

      const deleted = await service.delete(
        id,
        tenantId,
        hard === "true",
        req.user.id,
        keep_blob === "true",   // keepBlob: Layer 3
      );
      if (!deleted) {
        return res
          .status(404)
          .json({
            success: false,
            error: { code: "NOT_FOUND", message: "File not found" },
          });
      }

      res.json({ success: true, data: { message: "File deleted" } });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "DELETE_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  // ============================================================================
  // SHARING
  // ============================================================================

  async createShare(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const createdBy = req.user.id;
      const { id } = req.params;

      const share = await service.createShare(
        id,
        tenantId,
        req.body,
        createdBy,
      );
      res.status(201).json({ success: true, data: share });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "SHARE_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async accessSharedFile(req, res) {
    try {
      const service = getFileAttachmentService();
      const { token } = req.params;

      const share = await service.getByShareToken(token);
      if (!share) {
        return res
          .status(404)
          .json({
            success: false,
            error: {
              code: "NOT_FOUND",
              message: "Share link not found or expired",
            },
          });
      }

      // Resolve the provider from the blob's own bucket snapshot so shared
      // files keep working after the tenant's active bucket is reassigned.
      const provider = await service._resolveProviderForBlob(
        share.blob_id,
        share.storage_provider,
      );
      const filePath = provider.getFullPath(share.file_path);

      res.setHeader("Content-Type", share.mime_type);
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${encodeURIComponent(share.original_name)}"`,
      );
      res.setHeader("Content-Length", share.file_size);

      // Cloud providers (Azure, S3, E2E EOS, GCS) have no on-disk path — stream
      // the object through instead of handing sendFile an object key.
      if (isCloudProviderType(provider.type)) {
        const stream = await provider.getStream(share.file_path);
        return stream.pipe(res);
      }

      res.sendFile(path.resolve(filePath));
    } catch (error) {
      const err = sanitizeErrorResponse(error, "SHARE_ACCESS_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async revokeShare(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { shareId } = req.params;

      const revoked = await service.revokeShare(shareId, tenantId);
      if (!revoked) {
        return res
          .status(404)
          .json({
            success: false,
            error: { code: "NOT_FOUND", message: "Share not found" },
          });
      }

      res.json({ success: true, data: { message: "Share revoked" } });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "REVOKE_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  // ============================================================================
  // STORAGE & QUOTA
  // ============================================================================

  async getStorageStats(req, res) {
    try {
      const service = getFileAttachmentService();
      let tenantId = req.user.tenantId;
      if (req.tenantId) {
        tenantId = req.tenantId;
      }

      const stats = await service.getStorageStats(tenantId);
      res.json({ success: true, data: stats });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "STATS_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async getQuota(req, res) {
    try {
      const service = getFileAttachmentService();
      let tenantId = req.user.tenantId;
      if (req.tenantId) {
        tenantId = req.tenantId;
      }

      const quota = await service.getQuota(tenantId);
      res.json({ success: true, data: quota });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "QUOTA_FETCH_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async updateQuota(req, res) {
    try {
      const service = getFileAttachmentService();
      let tenantId = req.user.tenantId;
      if (req.tenantId) {
        tenantId = req.tenantId;
      }

      const quota = await service.updateQuota(tenantId, req.body);
      res.json({ success: true, data: quota });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "QUOTA_UPDATE_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  async listForDropdown(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const result = await service.listForDropdown(tenantId);
      res.json({ success: true, data: result });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "LIST_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }

  // ============================================================================
  // CONTENT EXTRACTION
  // ============================================================================

  async extractContent(req, res) {
    try {
      const service = getFileAttachmentService();
      const tenantId = req.user.isSuperAdmin ? null : req.user.tenantId;
      const { id } = req.params;

      const result = await service.extractContent(id, tenantId);
      res.json({
        success: true,
        data: {
          html: result.html,
          text: result.text,
          original_name: result.file.original_name,
          file_path: result.file.file_path,
          file_size: result.file.file_size,
          mime_type: result.file.mime_type,
          checksum: result.file.checksum,
        },
      });
    } catch (error) {
      const err = sanitizeErrorResponse(error, "CONTENT_EXTRACTION_ERROR");
      res
        .status(err.status)
        .json({
          success: false,
          error: { code: err.code, message: err.message },
        });
    }
  }
}

module.exports = new FileAttachmentController();
