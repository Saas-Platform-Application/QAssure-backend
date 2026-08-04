/**
 * File Attachment Service
 * Centralized file management with cloud-ready architecture
 *
 * Folder Hierarchy:
 *   uploads/{tenant_id}/{entity_type}/{YYYY}/{MM}/{uuid}_{sanitized_name}.ext
 *
 * S3/MinIO Ready:
 *   s3://bucket/{tenant_id}/{entity_type}/{YYYY}/{MM}/{uuid}_{sanitized_name}.ext
 */

const { pool } = require("../config/database");
const fs = require("fs");
const path = require("path");
const config = require("../config/config");
const crypto = require("crypto");
if (!global.crypto) {
  global.crypto = crypto;
}
const { v4: uuidv4 } = require("uuid");
const { getAuditService } = require("./audit.service");
const { getNotificationService } = require("./notification.service");
const { getTenantStorageBucketService } = require("./tenant-storage-bucket.service");

// ============================================================================
// STORAGE PROVIDER ABSTRACTION
// ============================================================================

class LocalStorageProvider {
  constructor(baseDir) {
    this.baseDir = baseDir;
    this.type = "local";
  }

  async save(relativePath, buffer) {
    const fullPath = path.join(this.baseDir, relativePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, buffer);
    return relativePath;
  }

  async delete(relativePath) {
    const fullPath = path.join(this.baseDir, relativePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async exists(relativePath) {
    return fs.existsSync(path.join(this.baseDir, relativePath));
  }

  getFullPath(relativePath) {
    return path.join(this.baseDir, relativePath);
  }

  async read(relativePath) {
    const fullPath = this.getFullPath(relativePath);
    return fs.readFileSync(fullPath);
  }

  getStream(relativePath) {
    const fullPath = this.getFullPath(relativePath);
    return fs.createReadStream(fullPath);
  }
}

// ============================================================================
// AMAZON S3 STORAGE PROVIDER
// ============================================================================

class S3StorageProvider {
  constructor(s3Config) {
    const { S3Client } = require("@aws-sdk/client-s3");
    this.type = "s3";
    this.bucketName = s3Config.bucket;
    this.region = s3Config.region;
    this.client = new S3Client({
      region: this.region,
      credentials: {
        accessKeyId: s3Config.accessKeyId,
        secretAccessKey: s3Config.secretAccessKey,
      },
    });
  }

  _normalizePath(relativePath) {
    return relativePath.replace(/\\/g, "/");
  }

  async save(relativePath, buffer) {
    const { PutObjectCommand } = require("@aws-sdk/client-s3");
    const normalizedPath = this._normalizePath(relativePath);
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucketName,
        Key: normalizedPath,
        Body: buffer,
      })
    );
    return normalizedPath;
  }

  async delete(relativePath) {
    const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
    const normalizedPath = this._normalizePath(relativePath);
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: normalizedPath,
      })
    );
  }

  async exists(relativePath) {
    const { HeadObjectCommand } = require("@aws-sdk/client-s3");
    const normalizedPath = this._normalizePath(relativePath);
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: normalizedPath,
        })
      );
      return true;
    } catch (e) {
      if (e.name === "NotFound" || e.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw e;
    }
  }

  getFullPath(relativePath) {
    return this._normalizePath(relativePath);
  }

  async getSignedUrl(relativePath) {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
    const normalizedPath = this._normalizePath(relativePath);
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: normalizedPath,
    });
    return await getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  async read(relativePath) {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const normalizedPath = this._normalizePath(relativePath);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: normalizedPath,
      })
    );
    return await this._streamToBuffer(response.Body);
  }

  async getStream(relativePath) {
    const { GetObjectCommand } = require("@aws-sdk/client-s3");
    const normalizedPath = this._normalizePath(relativePath);
    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: this.bucketName,
        Key: normalizedPath,
      })
    );
    return response.Body;
  }

  _streamToBuffer(stream) {
    return new Promise((resolve, reject) => {
      const chunks = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  }
}

// ============================================================================
// GOOGLE CLOUD STORAGE PROVIDER
// ============================================================================

class GCSStorageProvider {
  constructor(gcsConfig) {
    const { Storage } = require("@google-cloud/storage");
    this.type = "gcp";
    this.bucketName = gcsConfig.bucket;

    let credentials = gcsConfig.serviceAccountKey;
    if (typeof credentials === "string") {
      try {
        credentials = JSON.parse(credentials);
      } catch (e) {
        // String fallback (might be a file path or config)
      }
    }

    this.storage = new Storage({
      projectId: gcsConfig.projectId,
      credentials,
    });
    this.bucket = this.storage.bucket(this.bucketName);
  }

  _normalizePath(relativePath) {
    return relativePath.replace(/\\/g, "/");
  }

  async save(relativePath, buffer) {
    const normalizedPath = this._normalizePath(relativePath);
    const file = this.bucket.file(normalizedPath);
    await file.save(buffer);
    return normalizedPath;
  }

  async delete(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const file = this.bucket.file(normalizedPath);
    await file.delete({ ignoreNotFound: true });
  }

  async exists(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const file = this.bucket.file(normalizedPath);
    const [exists] = await file.exists();
    return exists;
  }

  getFullPath(relativePath) {
    return this._normalizePath(relativePath);
  }

  async getSignedUrl(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const file = this.bucket.file(normalizedPath);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });
    return url;
  }

  async read(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const file = this.bucket.file(normalizedPath);
    const [contents] = await file.download();
    return contents;
  }

  async getStream(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const file = this.bucket.file(normalizedPath);
    return file.createReadStream();
  }
}

// ============================================================================
// AZURE STORAGE PROVIDER
// ============================================================================

class AzureStorageProvider {
  constructor(azureConfig) {
    const {
      ContainerClient,
      AnonymousCredential,
    } = require("@azure/storage-blob");
    this.type = "azure";
    this.containerName = azureConfig.container;
    this.sasToken = azureConfig.sasToken.startsWith("?")
      ? azureConfig.sasToken
      : `?${azureConfig.sasToken}`;
    this.baseUrl = azureConfig.url.split("?")[0]; // Remove existing SAS if any

    // Construct the container URL with SAS
    const containerUrl = `${this.baseUrl}${this.sasToken}`;
    // Since we have a container-level SAS, we use ContainerClient directly
    this.containerClient = new ContainerClient(
      containerUrl,
      new AnonymousCredential(),
    );
  }

  _normalizePath(relativePath) {
    // Azure Blob Storage always uses forward slashes
    return relativePath.replace(/\\/g, "/");
  }

  async save(relativePath, buffer) {
    const normalizedPath = this._normalizePath(relativePath);
    const blockBlobClient =
      this.containerClient.getBlockBlobClient(normalizedPath);
    await blockBlobClient.uploadData(buffer);
    return normalizedPath;
  }

  async delete(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const blockBlobClient =
      this.containerClient.getBlockBlobClient(normalizedPath);
    await blockBlobClient.deleteIfExists();
  }

  async exists(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const blockBlobClient =
      this.containerClient.getBlockBlobClient(normalizedPath);
    return await blockBlobClient.exists();
  }

  getFullPath(relativePath) {
    return this._normalizePath(relativePath);
  }

  getSignedUrl(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    return `${this.baseUrl}/${normalizedPath}${this.sasToken}`;
  }

  async read(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const blockBlobClient =
      this.containerClient.getBlockBlobClient(normalizedPath);
    return await blockBlobClient.downloadToBuffer();
  }

  async getStream(relativePath) {
    const normalizedPath = this._normalizePath(relativePath);
    const blockBlobClient =
      this.containerClient.getBlockBlobClient(normalizedPath);
    const downloadResponse = await blockBlobClient.download();
    return downloadResponse.readableStreamBody;
  }
}

// ============================================================================
// REDIS CACHE HELPER
// ============================================================================

let redisService = null;
function getRedis() {
  if (redisService === null) {
    try {
      redisService = require("../infrastructure/cache/redis.service");
    } catch (e) {
      console.warn("[FileAttachment] Redis not available, caching disabled");
      redisService = false;
    }
  }
  return redisService || null;
}

const CACHE_KEYS = {
  file: (tenantId, fileId) => `file:${tenantId}:${fileId}`,
  quota: (tenantId) => `quota:${tenantId}`,
  share: (token) => `share:${token}`,
  entityFiles: (tenantId, entityType, entityId) =>
    `files:${tenantId}:${entityType}:${entityId}`,
};

const CACHE_TTL = {
  file: 300, // 5 minutes
  quota: 60, // 1 minute
  share: 3600, // 1 hour (or match expiry)
  entityFiles: 120, // 2 minutes
};

// ============================================================================
// ELASTICSEARCH HELPER
// ============================================================================

let esService = null;
function getElasticsearch() {
  if (esService === null) {
    try {
      const {
        getElasticsearchService,
      } = require("../infrastructure/search/elasticsearch.service");
      esService = getElasticsearchService();
    } catch (e) {
      console.warn(
        "[FileAttachment] Elasticsearch not available, indexing disabled",
      );
      esService = false;
    }
  }
  return esService || null;
}

const ES_INDEX = "qassure-files";

async function indexFileToES(attachment) {
  const es = getElasticsearch();
  if (!es) return;
  try {
    await es.indexDocument(
      ES_INDEX,
      attachment.id,
      {
        original_name: attachment.original_name,
        entity_type: attachment.entity_type,
        entity_id: attachment.entity_id,
        category: attachment.category,
        tags: attachment.tags || [],
        mime_type: attachment.mime_type,
        file_size: attachment.file_size,
        source_module: attachment.source_module,
        source_module_id: attachment.source_module_id,
        uploaded_by: attachment.uploaded_by,
        uploaded_by_email: attachment.uploaded_by_email || null,
        tenant_id: attachment.tenant_id,
        version: attachment.version,
        is_current_version: attachment.is_current_version,
        description: attachment.description,
        created_at: attachment.created_at,
      },
      attachment.tenant_id,
    );
  } catch (e) {
    console.error("[FileAttachment] ES indexing failed:", e.message);
  }
}

async function removeFileFromES(fileId) {
  const es = getElasticsearch();
  if (!es) return;
  try {
    await es.deleteDocument(ES_INDEX, fileId);
  } catch (e) {
    console.error("[FileAttachment] ES removal failed:", e.message);
  }
}

// ============================================================================
// FILE ATTACHMENT SERVICE
// ============================================================================

class FileAttachmentService {
  constructor() {
    this.pool = pool;
    this.uploadDir =
      config.upload.uploadDir || path.join(process.cwd(), "uploads");

    // Initialize all available providers
    this.providers = {
      local: new LocalStorageProvider(this.uploadDir),
    };

    if (config.upload.azure && config.upload.azure.sasToken) {
      this.providers.azure = new AzureStorageProvider(config.upload.azure);
    }

    // Default provider for NEW uploads
    this.defaultProviderType = config.upload.storageType || "local";
    this.storageProvider =
      this.providers[this.defaultProviderType] || this.providers.local;

    console.log(
      `[FileAttachment] Hybrid storage initialized. Default: ${this.defaultProviderType}`,
    );

    // Ensure local base dir exists if local provider is present
    if (this.providers.local) {
      this._ensureBaseDir();
    }
  }

  _getProvider(type) {
    const provider = this.providers[type] || this.providers.local;
    return provider;
  }

  _buildProviderFromBucketRow(bucketRow) {
    if (!bucketRow) return this.storageProvider;
    if (bucketRow.storage_type === 'azure') {
      const bucketService = getTenantStorageBucketService();
      const sasToken = bucketService.decryptSasToken(bucketRow);
      if (!sasToken) {
        console.error('[FileAttachment] Failed to decrypt SAS token for bucket', bucketRow.id);
        return this.storageProvider; // fallback
      }
      return new AzureStorageProvider({
        container: bucketRow.azure_container,
        sasToken,
        url: bucketRow.azure_url,
      });
    }
    if (bucketRow.storage_type === 's3') {
      let secretAccessKey = null;
      if (bucketRow.s3_secret_access_key) {
        try {
          const { decrypt } = require('../utils/encryption');
          secretAccessKey = decrypt(bucketRow.s3_secret_access_key);
        } catch (e) {
          console.error('[FileAttachment] Failed to decrypt S3 secret for bucket', bucketRow.id);
          return this.storageProvider;
        }
      }
      return new S3StorageProvider({
        bucket: bucketRow.s3_bucket,
        region: bucketRow.s3_region,
        accessKeyId: bucketRow.s3_access_key_id,
        secretAccessKey,
      });
    }
    if (bucketRow.storage_type === 'gcp') {
      let serviceAccountKey = null;
      if (bucketRow.gcs_service_account_key) {
        try {
          const { decrypt } = require('../utils/encryption');
          serviceAccountKey = decrypt(bucketRow.gcs_service_account_key);
        } catch (e) {
          console.error('[FileAttachment] Failed to decrypt GCS key for bucket', bucketRow.id);
          return this.storageProvider;
        }
      }
      return new GCSStorageProvider({
        bucket: bucketRow.gcs_bucket,
        projectId: bucketRow.gcs_project_id,
        serviceAccountKey,
      });
    }
    if (bucketRow.storage_type === 'local') {
      return this.providers.local;
    }
    return this.storageProvider;
  }

  /**
   * Resolve the storage provider for a blob.
   * If the blob has a bucket_config_id (new blobs), use that bucket's config.
   * If not (legacy blobs), fall back to the attachment's storage_provider field.
   */
  async _resolveProviderForBlob(blobId, fallbackStorageProvider) {
    if (blobId) {
      try {
        const blobRow = await this.pool.query(
          `SELECT fb.*, tsb.storage_type, tsb.azure_account, tsb.azure_container,
                  tsb.azure_sas_token, tsb.azure_url,
                  tsb.s3_bucket, tsb.s3_region, tsb.s3_access_key_id, tsb.s3_secret_access_key,
                  tsb.gcs_bucket, tsb.gcs_project_id, tsb.gcs_service_account_key
           FROM file_blobs fb
           LEFT JOIN tenant_storage_buckets tsb ON tsb.id = fb.bucket_config_id
           WHERE fb.id = $1`,
          [blobId]
        );
        if (blobRow.rows.length > 0 && blobRow.rows[0].bucket_config_id) {
          return this._buildProviderFromBucketRow(blobRow.rows[0]);
        }
      } catch (e) {
        console.warn('[FileAttachment] Could not resolve bucket for blob, using fallback:', e.message);
      }
    }
    return this._getProvider(fallbackStorageProvider);
  }

  _ensureBaseDir() {
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  // ============================================================================
  // PATH GENERATION — Tenant-Scoped Hierarchy
  // ============================================================================

  /**
   * Generates: {tenant_id}/{entity_type}/{YYYY}/{MM}/{uuid}_{sanitized_name}.ext
   * Maps directly to S3 object keys when migrating.
   */
  _generateStoragePath(tenantId, entityType, originalName) {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const ext = path.extname(originalName).toLowerCase();
    const sanitized = this._sanitizeFilename(path.basename(originalName, ext));
    const uuid = uuidv4();
    const storedName = `${uuid}_${sanitized}${ext}`;

    const relativePath = path.join(
      tenantId,
      entityType,
      year,
      month,
      storedName,
    );

    return { storedName, relativePath };
  }

  _sanitizeFilename(name) {
    return name
      .replace(/[^a-zA-Z0-9_\-\.]/g, "_")
      .replace(/_+/g, "_")
      .substring(0, 100)
      .toLowerCase();
  }

  // ============================================================================
  // VALIDATION
  // ============================================================================

  async _validateQuotaAndType(tenantId, file) {
    const quota = await this.getQuota(tenantId);

    // 1. Total Storage check
    if (
      parseInt(quota.used_storage_bytes) + file.size >
      parseInt(quota.max_storage_bytes)
    ) {
      throw new Error("Storage quota exceeded");
    }

    // 2. Max File Size check
    if (file.size > parseInt(quota.max_file_size_bytes)) {
      throw new Error(
        `File size exceeds maximum allowed (${Math.round(quota.max_file_size_bytes / 1024 / 1024)}MB)`,
      );
    }

    // 3. Blocked extensions check
    const ext = path.extname(file.originalname).toLowerCase();
    if (quota.blocked_extensions && quota.blocked_extensions.includes(ext)) {
      throw new Error(`File type ${ext} is not allowed`);
    }

    // 4. Allowed MIME types check
    if (quota.allowed_mime_types && quota.allowed_mime_types.length > 0) {
      if (!quota.allowed_mime_types.includes(file.mimetype)) {
        throw new Error(`MIME type ${file.mimetype} is not allowed`);
      }
    }

    return quota;
  }

  // ============================================================================
  // UPLOAD
  // ============================================================================

  async upload(
    tenantId,
    file,
    entityType,
    entityId,
    options = {},
    uploadedBy,
    req = null,
  ) {
    if (!tenantId) throw new Error("tenant_id is required");
    if (!entityType) throw new Error("entity_type is required");
    if (!entityId) throw new Error("entity_id is required");

    // module_id: UUID of the calling module (null for platform/UI uploads).
    const sourceModule =
      req && req.module && req.module.code
        ? req.module.code
        : req && req.user
          ? req.user.isApiKey
            ? req.user.moduleCode || "api_key"
            : "platform"
          : "platform";

    // module_id is the UUID for dedup + audit. Kept separately from the string code.
    const moduleId =
      req && req.module && req.module.id
        ? req.module.id
        : req && req.user && req.user.moduleId
          ? req.user.moduleId
          : null;

    // Resolve tenant's active storage bucket — REQUIRED before upload
    const bucketService = getTenantStorageBucketService();
    const bucketRow = await bucketService.getActiveBucketForTenant(tenantId);
    if (!bucketRow) {
      throw new Error(
        'No storage bucket configured for this tenant. Please contact your administrator to set up file storage before uploading.'
      );
    }
    const tenantProvider = this._buildProviderFromBucketRow(bucketRow);

    // Validate quota + types (unchanged helper).
    const quota = await this._validateQuotaAndType(tenantId, file);

    const categoryName = options.category || "other";
    const categoryId = options.category_id || null;

    // Compute checksum from the uploaded bytes.
    const fileBuffer = file.buffer || fs.readFileSync(file.path);
    const checksum = this._calculateChecksum(fileBuffer);

    const client = await this.pool.connect();
    let savedRelativePath = null; // set only if WE physically wrote a new file
    let weWrotePhysicalFile = false;

    try {
      await client.query("BEGIN");

      // 1. Resolve supplier_id from the uploading user's record.
      //    users.supplier_id is a nullable FK to the suppliers table.
      //    We look this up server-side inside the transaction so callers
      //    cannot inject an arbitrary supplier UUID.
      let supplierId = null;
      if (uploadedBy) {
        const userRow = await client.query(
          `SELECT supplier_id FROM users WHERE id = $1`,
          [uploadedBy],
        );
        supplierId = userRow.rows[0]?.supplier_id || null;
      }

      // 2. Look for an existing blob in the dedup scope:
      //    tenant + module_id + supplier_id + checksum.
      //    IS NOT DISTINCT FROM handles NULL == NULL correctly.
      const existingBlob = await client.query(
        `SELECT * FROM file_blobs
         WHERE tenant_id   = $1
           AND module_id   IS NOT DISTINCT FROM $2
           AND supplier_id IS NOT DISTINCT FROM $3
           AND checksum    = $4
         FOR UPDATE`,
        [tenantId, moduleId, supplierId, checksum],
      );

      let blob;
      let isDeduplicated = false;

      if (existingBlob.rows.length > 0) {
        const potentialBlob = existingBlob.rows[0];
        let physicalExists = false;
        try {
          const checkProvider = await this._resolveProviderForBlob(potentialBlob.id, potentialBlob.storage_provider);
          physicalExists = await checkProvider.exists(potentialBlob.storage_path);
        } catch (e) {
          console.warn('[FileAttachment] Error checking physical file existence:', e.message);
        }

        if (physicalExists) {
          blob = potentialBlob;
          isDeduplicated = true;

          // Revive if previously soft-deleted.
          if (blob.is_soft_deleted) {
            await client.query(
              `UPDATE file_blobs SET is_soft_deleted = FALSE, soft_deleted_at = NULL, updated_at = NOW()
               WHERE id = $1`,
              [blob.id],
            );
          }

          // Increment reference count.
          await client.query(
            `UPDATE file_blobs SET reference_count = reference_count + 1, updated_at = NOW()
             WHERE id = $1`,
            [blob.id],
          );
        }
      }

      if (existingBlob.rows.length > 0 && !isDeduplicated) {
        // Blob exists in database, but is physically missing from the storage bucket.
        // Self-heal: Upload the file buffer to the existing storage path, and update reference count.
        const potentialBlob = existingBlob.rows[0];

        await tenantProvider.save(potentialBlob.storage_path, fileBuffer);
        savedRelativePath = potentialBlob.storage_path;
        weWrotePhysicalFile = true;

        const blobUpdate = await client.query(
          `UPDATE file_blobs 
           SET reference_count = reference_count + 1,
               is_soft_deleted = FALSE,
               soft_deleted_at = NULL,
               storage_provider = $2,
               bucket_config_id = $3,
               updated_at = NOW()
           WHERE id = $1
           RETURNING *`,
          [potentialBlob.id, tenantProvider.type, bucketRow.id]
        );
        blob = blobUpdate.rows[0];
      } else if (existingBlob.rows.length === 0) {
        // 3b. New file — write the binary then create the blob row (reference_count = 1).
        const { storedName, relativePath } = this._generateStoragePath(
          tenantId,
          entityType,
          file.originalname,
        );

        await tenantProvider.save(relativePath, fileBuffer);
        savedRelativePath = relativePath;
        weWrotePhysicalFile = true;

        const blobInsert = await client.query(
          `INSERT INTO file_blobs (
             tenant_id, checksum, module_id, supplier_id,
             storage_provider, storage_path, stored_name, mime_type, file_size,
             bucket_config_id, reference_count
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,1)
           RETURNING *`,
          [
            tenantId,
            checksum,
            moduleId,
            supplierId,
            tenantProvider.type,
            relativePath,
            storedName,
            file.mimetype,
            file.size,
            bucketRow.id,
          ],
        );
        blob = blobInsert.rows[0];
      }

      // 4. Always create a NEW reference row in file_attachments pointing at the blob.
      //    file_path mirrors blob path so legacy reads keep working without changes.
      const refInsert = await client.query(
        `INSERT INTO file_attachments (
           tenant_id, original_name, stored_name, file_path, mime_type, file_size,
           checksum, entity_type, entity_id, category, category_id, description, tags,
           storage_provider, uploaded_by, metadata, source_module, source_module_id, blob_id
         ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
         RETURNING *`,
        [
          tenantId,
          file.originalname,
          blob.stored_name,
          blob.storage_path,
          blob.mime_type,
          blob.file_size,
          checksum,
          entityType,
          entityId,
          categoryName,
          categoryId,
          options.description,
          options.tags || [],
          blob.storage_provider,
          uploadedBy,
          JSON.stringify(options.metadata || {}),
          sourceModule,
          moduleId,
          blob.id,
        ],
      );

      await client.query("COMMIT");

      // Clean up multer temp file AFTER commit succeeds.
      if (file.path && fs.existsSync(file.path)) {
        try {
          fs.unlinkSync(file.path);
        } catch (e) {}
      }

      const attachment = await this.getById(refInsert.rows[0].id, tenantId);

      await this._logAccess(tenantId, attachment.id, uploadedBy, "upload", req);
      await this._invalidateCache(
        CACHE_KEYS.entityFiles(tenantId, entityType, entityId),
      );
      await this._invalidateCache(CACHE_KEYS.quota(tenantId));
      await indexFileToES(attachment);
      await this._invalidateBlobSiblingsCache(blob.id);

      setImmediate(async () => {
        try {
          await getAuditService().log({
            action: "CREATE",
            user_id: uploadedBy,
            tenant_id: tenantId,
            resource_type: "file_attachment",
            resource_id: attachment.id,
            response_status: 201,
            metadata: {
              original_name: file.originalname,
              entity_type: entityType,
              entity_id: entityId,
              file_size: file.size,
              source_module: sourceModule,
              module_id: moduleId,
              supplier_id: supplierId,
              deduplicated: !weWrotePhysicalFile,
              blob_id: blob.id,
            },
          });
        } catch (e) {}
      });

      console.log(
        `[FileAttachment] Uploaded: ${file.originalname} -> blob ${blob.id} [module:${moduleId || "none"} supplier:${supplierId || "none"}] ${weWrotePhysicalFile ? "(new binary)" : "(deduplicated)"}`,
      );
      return attachment;
    } catch (err) {
      await client.query("ROLLBACK");
      // If we wrote a new physical file but the transaction failed, clean up the orphan.
      if (weWrotePhysicalFile && savedRelativePath) {
        try {
          await tenantProvider.delete(savedRelativePath);
        } catch (cleanupErr) {
          console.error(
            `[FileAttachment] Failed to clean orphan after rollback: ${savedRelativePath}`,
            cleanupErr.message,
          );
        }
      }
      throw err;
    } finally {
      client.release();
    }
  }

  async uploadMultiple(
    tenantId,
    files,
    entityType,
    entityId,
    options = {},
    uploadedBy,
    req = null,
  ) {
    if (!tenantId) throw new Error("tenant_id is required");
    if (!entityId) throw new Error("entity_id is required");

    const results = [];
    const errors = [];

    // Parallel uploads with individual error handling.
    // supplierId flows through via options spread automatically.
    const uploadPromises = files.map((file) =>
      this.upload(
        tenantId,
        file,
        entityType,
        entityId,
        { ...options },
        uploadedBy,
        req,
      )
        .then((attachment) => ({ status: "success", attachment }))
        .catch((error) => ({
          status: "error",
          error: error.message,
          file: file.originalname,
        })),
    );

    const settled = await Promise.all(uploadPromises);

    for (const result of settled) {
      if (result.status === "success") {
        results.push(result.attachment);
      } else {
        errors.push({ file: result.file, error: result.error });
      }
    }

    return {
      uploaded: results,
      errors,
      total: files.length,
      success_count: results.length,
      error_count: errors.length,
    };
  }

  // ============================================================================
  // FILE VERSIONING
  // ============================================================================

  /**
   * Upload a new version of an existing file.
   * Marks previous version as not current, links via previous_version_id.
   */
  async uploadVersion(
    tenantId,
    fileId,
    file,
    options = {},
    uploadedBy,
    req = null,
  ) {
    // 1. Basic existence check
    const current = await this.getById(fileId, tenantId);
    if (!current) throw new Error("File not found");

    // 2. Validate quota and file types for the new version
    await this._validateQuotaAndType(tenantId, file);

    const sourceModule =
      req && req.module && req.module.code
        ? req.module.code
        : req && req.user
          ? req.user.isApiKey
            ? req.user.moduleCode || "api_key"
            : "platform"
          : "platform";

    const sourceModuleId =
      req && req.module && req.module.id
        ? req.module.id
        : req && req.user && req.user.moduleId
          ? req.user.moduleId
          : null;

    // category and category_id are stored as-is (plain strings, no FK lookup)
    const categoryName = options.category || current.category;
    const categoryId = options.category_id || current.category_id;

    // Mark current as not current
    await this.pool.query(
      `UPDATE file_attachments SET is_current_version = FALSE
       WHERE id = $1 AND tenant_id = $2`,
      [fileId, tenantId],
    );

    // Generate new path
    const { storedName, relativePath } = this._generateStoragePath(
      tenantId,
      current.entity_type,
      file.originalname,
    );

    const fileBuffer = file.buffer || fs.readFileSync(file.path);
    const checksum = this._calculateChecksum(fileBuffer);

    await this.storageProvider.save(relativePath, fileBuffer);

    if (file.path && fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }

    // DB insert — clean up file AND restore previous version flag on failure
    let result;
    try {
      result = await this.pool.query(
        `INSERT INTO file_attachments (
          tenant_id, original_name, stored_name, file_path, mime_type, file_size,
          checksum, entity_type, entity_id, category, category_id, description, tags,
          storage_provider, uploaded_by, metadata, source_module, source_module_id,
          version, is_current_version, previous_version_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)
        RETURNING *`,
        [
          tenantId,
          file.originalname,
          storedName,
          relativePath,
          file.mimetype,
          file.size,
          checksum,
          current.entity_type,
          options.entity_id || current.entity_id,
          categoryName,
          categoryId,
          options.description || current.description,
          options.tags || current.tags,
          this.storageProvider.type,
          uploadedBy,
          JSON.stringify(options.metadata || {}),
          sourceModule,
          sourceModuleId,
          (current.version || 1) + 1,
          true,
          fileId,
        ],
      );
    } catch (dbError) {
      // Rollback: restore previous version as current
      try {
        await this.pool.query(
          `UPDATE file_attachments SET is_current_version = TRUE WHERE id = $1 AND tenant_id = $2`,
          [fileId, tenantId],
        );
      } catch (rollbackErr) {
        console.error(
          `[FileAttachment] CRITICAL: Failed to restore previous version flag for ${fileId}`,
          rollbackErr.message,
        );
      }
      // Rollback: remove orphaned file
      try {
        await this.storageProvider.delete(relativePath);
        console.error(
          `[FileAttachment] Cleaned up orphaned version file after DB failure: ${relativePath}`,
        );
      } catch (cleanupErr) {
        console.error(
          `[FileAttachment] CRITICAL: Failed to clean up orphaned version file: ${relativePath}`,
          cleanupErr.message,
        );
      }
      throw dbError;
    }

    const attachment = await this.getById(result.rows[0].id, tenantId);

    await this._logAccess(
      tenantId,
      attachment.id,
      uploadedBy,
      "upload_version",
      req,
    );
    await this._invalidateCache(CACHE_KEYS.file(tenantId, fileId));
    await this._invalidateCache(
      CACHE_KEYS.entityFiles(tenantId, current.entity_type, current.entity_id),
    );
    if (options.entity_id && options.entity_id !== current.entity_id) {
      await this._invalidateCache(
        CACHE_KEYS.entityFiles(
          tenantId,
          current.entity_type,
          options.entity_id,
        ),
      );
    }
    await this._invalidateCache(CACHE_KEYS.quota(tenantId));
    await indexFileToES(attachment);
    setImmediate(async () => {
      try {
        await getAuditService().log({
          action: "UPDATE",
          user_id: uploadedBy,
          tenant_id: tenantId,
          resource_type: "file_attachment",
          resource_id: attachment.id,
          response_status: 200,
          metadata: {
            original_name: file.originalname,
            version: attachment.version,
            previous_version_id: fileId,
          },
        });
      } catch (e) {}
    });

    console.log(
      `[FileAttachment] New version ${attachment.version}: ${file.originalname} -> ${relativePath}`,
    );
    //setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: uploadedBy, tenant_id: tenantId, resource_type: 'file_attachment', resource_id: attachment.id, response_status: 200, metadata: { original_name: file.originalname, version: attachment.version, previous_version_id: fileId } }); } catch(e){} });
    return attachment;
  }

  /**
   * Get all versions of a file
   */
  async getVersionHistory(fileId, tenantId = null) {
    let whereClause = `fa.id = $1 AND fa.deleted_at IS NULL`;
    const params = [fileId];
    if (tenantId) {
      params.push(tenantId);
      whereClause = `fa.id = $1 AND fa.tenant_id = $2 AND fa.deleted_at IS NULL`;
    }

    const result = await this.pool.query(
      `WITH RECURSIVE chain_back AS (
        SELECT fa.*, u.email as uploaded_by_email, u.supplier_id AS uploaded_by_supplier_id, fb.reference_count, 0 as depth 
        FROM file_attachments fa
        LEFT JOIN users u ON fa.uploaded_by = u.id
        LEFT JOIN file_blobs fb ON fa.blob_id = fb.id
        WHERE ${whereClause}

        UNION ALL

        SELECT fa.*, u.email as uploaded_by_email, u.supplier_id AS uploaded_by_supplier_id, fb.reference_count, cb.depth + 1 
        FROM chain_back cb
        JOIN file_attachments fa ON cb.previous_version_id = fa.id
        LEFT JOIN users u ON fa.uploaded_by = u.id
        LEFT JOIN file_blobs fb ON fa.blob_id = fb.id
        WHERE fa.deleted_at IS NULL ${tenantId ? "AND fa.tenant_id = $2" : ""}
      ),
      chain_forward AS (
        SELECT fa.*, u.email as uploaded_by_email, u.supplier_id AS uploaded_by_supplier_id, fb.reference_count, 0 as depth 
        FROM file_attachments fa
        LEFT JOIN users u ON fa.uploaded_by = u.id
        LEFT JOIN file_blobs fb ON fa.blob_id = fb.id
        WHERE fa.previous_version_id = $1 AND fa.deleted_at IS NULL ${tenantId ? "AND fa.tenant_id = $2" : ""}

        UNION ALL

        SELECT fa.*, u.email as uploaded_by_email, u.supplier_id AS uploaded_by_supplier_id, fb.reference_count, cf.depth + 1 
        FROM chain_forward cf
        JOIN file_attachments fa ON cf.id = fa.previous_version_id
        LEFT JOIN users u ON fa.uploaded_by = u.id
        LEFT JOIN file_blobs fb ON fa.blob_id = fb.id
        WHERE fa.deleted_at IS NULL ${tenantId ? "AND fa.tenant_id = $2" : ""}
      )
      SELECT * FROM chain_back
      UNION
      SELECT * FROM chain_forward
      ORDER BY version ASC`,
      params,
    );

    return result.rows.map((r) => this._formatAttachment(r));
  }

  // ============================================================================
  // RETRIEVE
  // ============================================================================

  async getById(id, tenantId = null) {
    // Check cache first
    const redis = getRedis();
    if (redis && tenantId) {
      const cached = await redis.get(CACHE_KEYS.file(tenantId, id));
      if (cached) return cached;
    }

    let query = `SELECT fa.*, u.email as uploaded_by_email, u.supplier_id AS uploaded_by_supplier_id, fb.reference_count
       FROM file_attachments fa
       LEFT JOIN users u ON fa.uploaded_by = u.id
       LEFT JOIN file_blobs fb ON fa.blob_id = fb.id
       WHERE fa.id = $1 AND fa.deleted_at IS NULL`;
    const params = [id];

    if (tenantId) {
      query += ` AND fa.tenant_id = $2`;
      params.push(tenantId);
    }

    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) return null;

    const attachment = this._formatAttachment(result.rows[0]);

    // Cache it (only if tenantId was provided)
    if (redis && tenantId) {
      await redis.set(
        CACHE_KEYS.file(tenantId, id),
        attachment,
        CACHE_TTL.file,
      );
    }

    return attachment;
  }

  async getByEntity(entityType, entityId, tenantId, options = {}) {
    const { category, limit = 100, offset = 0, current_only = true } = options;

    // Build WHERE parts — shared between count and data queries
    const whereParts = [
      "fa.entity_type = $1",
      "fa.entity_id = $2",
      "fa.tenant_id = $3",
      "fa.deleted_at IS NULL",
    ];
    const params = [entityType, entityId, tenantId];

    if (current_only) {
      whereParts.push("fa.is_current_version = TRUE");
    }

    if (category) {
      params.push(category);
      whereParts.push(`fa.category = $${params.length}`);
    }

    const whereClause = whereParts.join(" AND ");

    // Count query — clean, no string manipulation
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM file_attachments fa WHERE ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].total);

    // Data query with pagination
    params.push(limit, offset);
    const result = await this.pool.query(
      `
      SELECT fa.*, u.email as uploaded_by_email, u.supplier_id AS uploaded_by_supplier_id, fb.reference_count
      FROM file_attachments fa
      LEFT JOIN users u ON fa.uploaded_by = u.id
      LEFT JOIN file_blobs fb ON fa.blob_id = fb.id
      WHERE ${whereClause}
      ORDER BY fa.created_at DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params,
    );

    return {
      data: result.rows.map((r) => this._formatAttachment(r)),
      pagination: { total, limit, offset },
    };
  }

  async list(tenantId = null, options = {}) {
    const {
      entity_type,
      entity_id,
      mime_type,
      category,
      category_id,
      source_module,
      search,
      tags,
      metadata,
      metadata_filters,
      sort_by = "created_at",
      sort_order = "DESC",
      uploaded_by,
      limit = 50,
      offset = 0,
    } = options;

    let whereClause = `WHERE fa.deleted_at IS NULL AND fa.is_current_version = TRUE`;
    const params = [];

    if (tenantId) {
      params.push(tenantId);
      whereClause += ` AND fa.tenant_id = $${params.length}`;
    }

    if (entity_type) {
      params.push(entity_type);
      whereClause += ` AND fa.entity_type = $${params.length}`;
    }
    if (entity_id) {
      params.push(entity_id);
      whereClause += ` AND fa.entity_id = $${params.length}`;
    }
    if (mime_type) {
      params.push(`${mime_type}%`);
      whereClause += ` AND fa.mime_type LIKE $${params.length}`;
    }
    if (category) {
      params.push(category);
      whereClause += ` AND fa.category = $${params.length}`;
    }
    if (category_id) {
      params.push(category_id);
      whereClause += ` AND fa.category_id = $${params.length}`;
    }
    if (source_module) {
      params.push(source_module);
      whereClause += ` AND fa.source_module = $${params.length}`;
    }
    if (options.source_module_id) {
      params.push(options.source_module_id);
      whereClause += ` AND fa.source_module_id = $${params.length}`;
    }
    if (uploaded_by) {
      params.push(uploaded_by);
      whereClause += ` AND fa.uploaded_by = $${params.length}`;
    }
    if (tags) {
      let tagsArray = [];
      if (Array.isArray(tags)) {
        tagsArray = tags;
      } else if (typeof tags === "string") {
        const trimmed = tags.trim();
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
          try {
            tagsArray = JSON.parse(trimmed);
          } catch (e) {
            tagsArray = trimmed.split(",").map((t) => t.trim());
          }
        } else {
          tagsArray = trimmed.split(",").map((t) => t.trim());
        }
      }

      const cleanTags = tagsArray.filter(Boolean);
      if (cleanTags.length > 0) {
        params.push(cleanTags);
        // Using OVERLAP (&&) for ANY match. Use @> for ALL match if preferred.
        whereClause += ` AND fa.tags && $${params.length}::text[]`;
      }
    }

    if (metadata) {
      let metaObj = metadata;
      if (typeof metadata === "string") {
        try {
          metaObj = JSON.parse(metadata);
        } catch (e) {
          metaObj = null;
        }
      }
      if (
        metaObj &&
        typeof metaObj === "object" &&
        Object.keys(metaObj).length > 0
      ) {
        params.push(JSON.stringify(metaObj));
        whereClause += ` AND fa.metadata @> $${params.length}::jsonb`;
      }
    }

    if (metadata_filters && typeof metadata_filters === "object") {
      for (const [key, value] of Object.entries(metadata_filters)) {
        if (
          value !== undefined &&
          value !== null &&
          value !== "" &&
          !["sort_by", "sort_order", "limit", "offset"].includes(key)
        ) {
          // Check if value is a string that looks like a number or boolean and avoid double-quoting if necessary,
          // but @> {"key": "value"} works best with JSON-stringified object.
          params.push(JSON.stringify({ [key]: value }));
          whereClause += ` AND fa.metadata @> $${params.length}::jsonb`;
        }
      }
    }
    if (search) {
      params.push(`%${search}%`);
      whereClause += ` AND (fa.original_name ILIKE $${params.length} OR fa.description ILIKE $${params.length})`;
    }

    // Count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) as total FROM file_attachments fa ${whereClause}`,
      params,
    );
    const total = parseInt(countResult.rows[0].total);

    // Data
    const allowedSortColumns = [
      "created_at",
      "original_name",
      "file_size",
      "version",
      "category",
      "source_module",
    ];
    const finalSortBy = allowedSortColumns.includes(sort_by)
      ? sort_by
      : "created_at";
    const finalSortOrder = ["ASC", "DESC"].includes(
      String(sort_order).toUpperCase(),
    )
      ? sort_order.toUpperCase()
      : "DESC";

    const dataResult = await this.pool.query(
      `SELECT fa.*, u.email as uploaded_by_email, u.supplier_id AS uploaded_by_supplier_id, fb.reference_count
       FROM file_attachments fa
       LEFT JOIN users u ON fa.uploaded_by = u.id
       LEFT JOIN file_blobs fb ON fa.blob_id = fb.id
       ${whereClause}
       ORDER BY fa.${finalSortBy} ${finalSortOrder}
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset],
    );

    return {
      data: dataResult.rows.map((r) => this._formatAttachment(r)),
      pagination: { total, limit, offset },
    };
  }

  async listForDropdown(tenantId = null) {
    let query = `SELECT fa.id, fa.original_name, fa.file_path, fa.file_size, fa.mime_type, fa.checksum 
                 FROM file_attachments fa
                 WHERE fa.deleted_at IS NULL AND fa.is_current_version = TRUE`;
    const params = [];
    if (tenantId) {
      params.push(tenantId);
      query += ` AND fa.tenant_id = $1`;
    }
    query += ` ORDER BY fa.created_at DESC`;
    const result = await this.pool.query(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      original_name: row.original_name,
      file_path: row.file_path,
      file_size: parseInt(row.file_size) || 0,
      mime_type: row.mime_type,
      checksum: row.checksum,
      file_size_formatted: this._formatFileSize(row.file_size),
    }));
  }

  /**
   * Get unique filter options for the list dropdown — returns:
   *   - tags: flat unique array of all tag values
   *   - metadata_keys: unique top-level keys present across metadata JSONB
   */
  async getFilterOptions(
    tenantId = null,
    sourceModule = null,
    uploaded_by = null,
  ) {
    let baseWhere = `WHERE fa.deleted_at IS NULL AND fa.is_current_version = TRUE`;
    const params = [];

    if (tenantId) {
      params.push(tenantId);
      baseWhere += ` AND fa.tenant_id = $${params.length}`;
    }

    if (sourceModule) {
      params.push(sourceModule);
      baseWhere += ` AND fa.source_module = $${params.length}`;
    }

    if (uploaded_by) {
      params.push(uploaded_by);
      baseWhere += ` AND fa.uploaded_by = $${params.length}`;
    }

    // Distinct category + category_id pairs
    // const catResult = await this.pool.query(
    //   `SELECT DISTINCT category, category_id
    //    FROM file_attachments fa
    //    ${baseWhere}
    //      AND category IS NOT NULL
    //    ORDER BY category ASC`,
    //   params,
    // );

    // Unique tag values (unnest the tags array, deduplicate)
    const tagsResult = await this.pool.query(
      `SELECT DISTINCT UNNEST(fa.tags) as tag
       FROM file_attachments fa
       ${baseWhere}
         AND fa.tags IS NOT NULL AND cardinality(fa.tags) > 0
       ORDER BY tag ASC`,
      params,
    );

    // Unique top-level metadata values aggregated by key
    const metaResult = await this.pool.query(
      `SELECT 
          key, 
          jsonb_agg(DISTINCT value ORDER BY value) as values
       FROM (
          SELECT (jsonb_each(fa.metadata)).key, (jsonb_each(fa.metadata)).value
          FROM file_attachments fa
          ${baseWhere}
            AND fa.metadata IS NOT NULL AND fa.metadata != '{}'::jsonb
       ) sub
       GROUP BY key
       ORDER BY key ASC`,
      params,
    );

    const metadata_options = {};
    metaResult.rows.forEach((r) => {
      // Cast values to strings and filter out nulls/empties
      metadata_options[r.key] = r.values
        .map((v) => (v === null ? null : String(v).replace(/^"|"$/g, "")))
        .filter((v) => v !== null && v !== "");
    });

    return {
      // categories: catResult.rows,
      tags: tagsResult.rows.map((r) => r.tag),
      metadata: metadata_options,
    };
  }

  /**
   * Get unique filter options for the list dropdown — returns:
   *   - categories: distinct {category, category_id} pairs
   */
  async getCategoriesFilterOptions(
    tenantId = null,
    sourceModule = null,
    uploaded_by = null,
  ) {
    let baseWhere = `WHERE fa.deleted_at IS NULL AND fa.is_current_version = TRUE`;
    const params = [];

    if (tenantId) {
      params.push(tenantId);
      baseWhere += ` AND fa.tenant_id = $${params.length}`;
    }

    if (sourceModule) {
      params.push(sourceModule);
      baseWhere += ` AND fa.source_module = $${params.length}`;
    }

    if (uploaded_by) {
      params.push(uploaded_by);
      baseWhere += ` AND fa.uploaded_by = $${params.length}`;
    }

    // Distinct category + category_id pairs
    const catResult = await this.pool.query(
      `SELECT DISTINCT category, category_id
       FROM file_attachments fa
       ${baseWhere}
         AND category IS NOT NULL
       ORDER BY category ASC`,
      params,
    );

    return {
      categories: catResult.rows,
    };
  }

  // ============================================================================
  // UPDATE METADATA
  // ============================================================================

  async updateMetadata(id, tenantId, data) {
    const file = await this.getById(id, tenantId);
    if (!file) throw new Error("File not found");

    // Allowed fields — category_id is now a plain string; no FK lookup needed
    const allowed = [
      "description",
      "category",
      "category_id",
      "tags",
      "metadata",
    ];

    let whereClause = `id = $1 AND deleted_at IS NULL`;
    const queryParams = [id];
    let idx_override = 2;

    if (tenantId) {
      whereClause += ` AND tenant_id = $2`;
      queryParams.push(tenantId);
      idx_override = 3;
    }

    const setClauses = [];
    let currentIdx = idx_override;

    for (const field of allowed) {
      if (data[field] !== undefined) {
        if (field === "tags") {
          setClauses.push(`${field} = $${currentIdx}::text[]`);
        } else if (field === "metadata") {
          setClauses.push(`${field} = $${currentIdx}::jsonb`);
          data[field] = JSON.stringify(data[field]);
        } else {
          setClauses.push(`${field} = $${currentIdx}`);
        }
        queryParams.push(data[field]);
        currentIdx++;
      }
    }

    if (setClauses.length === 0) throw new Error("No valid fields to update");

    const result = await this.pool.query(
      `UPDATE file_attachments SET ${setClauses.join(", ")}
       WHERE ${whereClause}
       RETURNING *`,
      queryParams,
    );

    if (result.rows.length === 0) throw new Error("File not found");

    await this._invalidateCache(CACHE_KEYS.file(tenantId, id));

    const attachment = await this.getById(result.rows[0].id, tenantId);

    await indexFileToES(attachment);

    return attachment;
  }

  // ============================================================================
  // CONTENT EXTRACTION
  // ============================================================================

  /**
   * Extract text/HTML content from a stored file.
   * Supports: .docx (mammoth), .pdf (pdf-parse), plain text fallback.
   */
  async extractContent(id, tenantId) {
    const attachment = await this.getById(id, tenantId);
    if (!attachment) throw new Error("File not found");

    // 1. Check Redis Cache First
    const redis = getRedis();
    const cacheKey = `file_content:${id}:${attachment.checksum}`;
    if (redis) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          console.log(
            `[FileAttachment] Serving cached content for: ${attachment.original_name}`,
          );
          return cached;
        }
      } catch (e) {
        console.warn("[FileAttachment] Cache lookup failed:", e.message);
      }
    }

    const provider = this._getProvider(attachment.storage_provider);
    if (!(await provider.exists(attachment.file_path))) {
      throw new Error("File not found in storage");
    }

    const mimeType = attachment.mime_type || "";
    let html = "";
    let text = "";

    // Read file content into buffer
    const buffer = await provider.read(attachment.file_path);

    // 2. Extract based on MIME type
    if (
      mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const mammoth = require("mammoth");
      const htmlResult = await mammoth.convertToHtml({ buffer });
      html = htmlResult.value || "";
      const textResult = await mammoth.extractRawText({ buffer });
      text = textResult.value || "";
    } else if (mimeType === "application/pdf") {
      // Polyfill browser globals for pdf-parse
      this._polyfillPdfParser();
      const { PDFParse } = require("pdf-parse");
      const parser = new PDFParse({ data: buffer });
      const result = await parser.getText();
      text = result.text || "";
      await parser.destroy();
      html = text
        .split("\n")
        .filter((l) => l.trim())
        .map((l) => `<p>${l}</p>`)
        .join("");
    } else if (
      mimeType.startsWith("text/") ||
      mimeType === "application/json" ||
      mimeType === "application/xml"
    ) {
      text = buffer.toString("utf-8");
      html = `<pre>${text}</pre>`;
    } else {
      throw new Error(`Content extraction not supported for: ${mimeType}`);
    }

    const result = {
      html,
      text,
      file: attachment,
    };

    // 4. Store in Cache (1 hour TTL)
    if (redis) {
      try {
        await redis.set(cacheKey, result, 3600);
      } catch (e) {
        console.warn("[FileAttachment] Cache storage failed:", e.message);
      }
    }

    return result;
  }

  _polyfillPdfParser() {
    if (typeof globalThis.DOMMatrix === "undefined") {
      globalThis.DOMMatrix = class DOMMatrix {
        constructor(init) {
          const m = new Float64Array(16);
          m[0] = m[5] = m[10] = m[15] = 1;
          if (Array.isArray(init)) init.forEach((v, i) => (m[i] = v));
          this._m = m;
        }
        get a() {
          return this._m[0];
        }
        set a(v) {
          this._m[0] = v;
        }
        get b() {
          return this._m[1];
        }
        set b(v) {
          this._m[1] = v;
        }
        get c() {
          return this._m[4];
        }
        set c(v) {
          this._m[4] = v;
        }
        get d() {
          return this._m[5];
        }
        set d(v) {
          this._m[5] = v;
        }
        get e() {
          return this._m[12];
        }
        set e(v) {
          this._m[12] = v;
        }
        get f() {
          return this._m[13];
        }
        set f(v) {
          this._m[13] = v;
        }
        get is2D() {
          return true;
        }
        inverse() {
          return new DOMMatrix();
        }
        multiply() {
          return new DOMMatrix();
        }
        transformPoint(p) {
          return { x: p?.x || 0, y: p?.y || 0, z: p?.z || 0, w: p?.w || 1 };
        }
        toString() {
          return `matrix(${this.a}, ${this.b}, ${this.c}, ${this.d}, ${this.e}, ${this.f})`;
        }
      };
    }
    if (typeof globalThis.Path2D === "undefined") {
      globalThis.Path2D = class Path2D {
        constructor() {}
        addPath() {}
        closePath() {}
        moveTo() {}
        lineTo() {}
        bezierCurveTo() {}
        quadraticCurveTo() {}
        arc() {}
        arcTo() {}
        rect() {}
      };
    }
  }

  // ============================================================================
  // DOWNLOAD
  // ============================================================================

  async getFilePath(id, tenantId, userId = null, req = null) {
    const attachment = await this.getById(id, tenantId);
    if (!attachment) throw new Error("File not found");

    // Resolve provider from the blob's own bucket_config_id snapshot.
    // This ensures previously uploaded files always work even if the tenant's
    // active bucket has been changed since the file was uploaded.
    const provider = await this._resolveProviderForBlob(attachment.blob_id, attachment.storage_provider);
    let fullPath = provider.getFullPath(attachment.file_path);

    if (provider.type === "local") {
      if (!(await provider.exists(attachment.file_path))) {
        throw new Error("File not found on disk");
      }
      fullPath = path.resolve(fullPath);
    } else if (provider.type === "azure" || provider.type === "s3" || provider.type === "gcp") {
      // For cloud providers, we return the signed URL (awaited since S3/GCP signed URL generation is async)
      fullPath = await provider.getSignedUrl(attachment.file_path);
    }

    // Log access with IP and user-agent — use file's ACTUAL tenant_id for audit
    await this._logAccess(attachment.tenant_id, id, userId, "download", req);

    // Update download count
    await this.pool.query(
      "UPDATE file_attachments SET download_count = download_count + 1 WHERE id = $1",
      [id],
    );

    return { path: fullPath, attachment, storageType: provider.type };
  }

  async getFileStream(id, tenantId, userId = null, req = null) {
    const attachment = await this.getById(id, tenantId);
    if (!attachment) throw new Error("File not found");

    // Resolve provider from blob's own bucket_config_id — safe against bucket reassignment
    const provider = await this._resolveProviderForBlob(attachment.blob_id, attachment.storage_provider);
    const stream = await provider.getStream(attachment.file_path);

    // Log access
    await this._logAccess(attachment.tenant_id, id, userId, "download", req);

    return { stream, attachment };
  }

  // ============================================================================
  // DELETE
  // ============================================================================

  /**
   * Delete a reference. Decrements the blob reference count.
   * - hardDelete = false (default): soft-delete the reference rows (deleted_at = NOW()).
   *   The blob ref-count is decremented. If it reaches 0 the BLOB is purged
   *   UNLESS keepBlob is true (Layer 3 explicit soft delete).
   * - hardDelete = true: same, but also force the reference rows to be removed
   *   from the DB entirely when the blob is purged.
   *
   * @param {boolean} hardDelete  remove the DB rows too when the blob is purged
   * @param {boolean} keepBlob    Layer 3: keep the physical binary even at count 0
   */
  async delete(
    id,
    tenantId,
    hardDelete = false,
    userId = null,
    keepBlob = false,
  ) {
    // Gather the version chain so we delete the whole logical file (same as before).
    const versions = await this.getVersionHistory(id, tenantId);
    if (versions.length === 0) {
      const single = await this.getById(id, tenantId);
      if (!single) return false;
      versions.push(single);
    }
    const primary = versions.find((v) => v.id === id) || versions[0];
    const versionIds = versions.map((v) => v.id);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // For each reference being removed, decrement its blob's count.
      // Group by blob_id so multiple versions sharing a blob are handled once each.
      for (const v of versions) {
        if (!v.blob_id) continue; // legacy rows without a blob: skip ref-count math

        const dec = await client.query(
          `UPDATE file_blobs
             SET reference_count = GREATEST(reference_count - 1, 0), updated_at = NOW()
           WHERE id = $1
           RETURNING id, reference_count, storage_provider, storage_path, is_soft_deleted`,
          [v.blob_id],
        );
        if (dec.rows.length === 0) continue;
        const blob = dec.rows[0];

        // If no references remain, decide what to do with the binary.
        if (blob.reference_count === 0) {
          if (keepBlob || !hardDelete) {
            // Layer 3 / Soft Delete: mark soft-deleted, KEEP the binary for background services or restore.
            await client.query(
              `UPDATE file_blobs SET is_soft_deleted = TRUE, soft_deleted_at = NOW(), updated_at = NOW()
               WHERE id = $1`,
              [blob.id],
            );
          } else {
            // Purge the physical binary and the blob row (Only for hard deletes!).
            const provider = await this._resolveProviderForBlob(blob.id, blob.storage_provider);
            try {
              await provider.delete(blob.storage_path);
            } catch (e) {
              console.warn(
                `[FileAttachment] Failed to delete storage: ${blob.storage_path}`,
                e.message,
              );
            }
            // Unlink all attachments pointing to this blob to satisfy foreign key constraint!
            await client.query(
              `UPDATE file_attachments SET blob_id = NULL WHERE blob_id = $1`,
              [blob.id],
            );
            await client.query(`DELETE FROM file_blobs WHERE id = $1`, [
              blob.id,
            ]);
          }
        }
      }

      // Now handle the reference rows themselves.
      if (hardDelete) {
        await client.query(`DELETE FROM file_attachments WHERE id = ANY($1)`, [
          versionIds,
        ]);
      } else {
        await client.query(
          `UPDATE file_attachments SET deleted_at = NOW() WHERE id = ANY($1)`,
          [versionIds],
        );
      }

      await client.query("COMMIT");
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }

    // Cache + ES cleanup (outside the transaction).
    const uniqueBlobIds = new Set();
    for (const v of versions) {
      await this._invalidateCache(CACHE_KEYS.file(tenantId, v.id));
      await removeFileFromES(v.id);
      if (v.blob_id) {
        uniqueBlobIds.add(v.blob_id);
      }
    }
    for (const blobId of uniqueBlobIds) {
      await this._invalidateBlobSiblingsCache(blobId);
    }
    await this._invalidateCache(
      CACHE_KEYS.entityFiles(tenantId, primary.entity_type, primary.entity_id),
    );
    await this._invalidateCache(CACHE_KEYS.quota(tenantId));

    console.log(
      `[FileAttachment] Deleted ${versions.length} reference(s) of: ${primary.original_name} (keepBlob=${keepBlob}, hard=${hardDelete})`,
    );

    setImmediate(async () => {
      try {
        await getAuditService().log({
          action: "DELETE",
          user_id: userId,
          tenant_id: tenantId,
          resource_type: "file_attachment",
          resource_id: id,
          response_status: 200,
          metadata: {
            original_name: primary.original_name,
            hard_delete: hardDelete,
            keep_blob: keepBlob,
            versions_deleted: versions.length,
            deleted_by: userId,
          },
        });
      } catch (e) {}
    });

    return true;
  }

  async deleteByEntity(entityType, entityId, tenantId, hardDelete = false) {
    // Use a transaction for consistency
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      const attachments = await client.query(
        `SELECT id, file_path, thumbnail_path, original_name, blob_id, storage_provider
         FROM file_attachments
         WHERE entity_type = $1 AND entity_id = $2 AND tenant_id = $3 AND deleted_at IS NULL`,
        [entityType, entityId, tenantId],
      );

      for (const att of attachments.rows) {
        if (hardDelete) {
          const provider = await this._resolveProviderForBlob(att.blob_id, att.storage_provider);
          await provider.delete(att.file_path);
          if (att.thumbnail_path)
            await provider.delete(att.thumbnail_path);
          await client.query("DELETE FROM file_attachments WHERE id = $1", [
            att.id,
          ]);
        } else {
          await client.query(
            "UPDATE file_attachments SET deleted_at = NOW() WHERE id = $1",
            [att.id],
          );
        }
        await this._invalidateCache(CACHE_KEYS.file(tenantId, att.id));
        await removeFileFromES(att.id);
      }

      await client.query("COMMIT");

      await this._invalidateCache(
        CACHE_KEYS.entityFiles(tenantId, entityType, entityId),
      );
      await this._invalidateCache(CACHE_KEYS.quota(tenantId));

      return attachments.rows.length;
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
  // ============================================================================
  // BLOB CLEANUP (Layer 3)
  // ============================================================================

  /**
   * Purge blobs that are soft-deleted and have no references.
   * Call from an admin endpoint or a scheduled job once background processing is done.
   */
  async purgeSoftDeletedBlobs(tenantId, olderThanHours = 0) {
    const cutoff = new Date(
      Date.now() - olderThanHours * 3600000,
    ).toISOString();
    const blobs = await this.pool.query(
      `SELECT id, storage_provider, storage_path FROM file_blobs
       WHERE tenant_id = $1 AND is_soft_deleted = TRUE AND reference_count = 0
         AND soft_deleted_at <= $2`,
      [tenantId, cutoff],
    );
    let purged = 0;
    for (const blob of blobs.rows) {
      const provider = await this._resolveProviderForBlob(blob.id, blob.storage_provider);
      try {
        await provider.delete(blob.storage_path);
      } catch (e) {
        console.warn(
          `[FileAttachment] purge: storage delete failed ${blob.storage_path}`,
          e.message,
        );
      }
      // Unlink all attachments pointing to this blob to satisfy foreign key constraint!
      await this.pool.query(
        `UPDATE file_attachments SET blob_id = NULL WHERE blob_id = $1`,
        [blob.id],
      );
      await this.pool.query(`DELETE FROM file_blobs WHERE id = $1`, [blob.id]);
      purged++;
    }
    await this._invalidateCache(CACHE_KEYS.quota(tenantId));
    return { purged };
  }

  // ============================================================================
  // SHARING
  // ============================================================================

  async createShare(fileId, tenantId, options = {}, createdBy) {
    // Verify file exists
    const file = await this.getById(fileId, tenantId);
    if (!file) throw new Error("File not found");

    // Use file's own tenantId if none provided (super admin case)
    const effectiveTenantId = tenantId || file.tenant_id;
    const shareToken = crypto.randomBytes(32).toString("hex");

    const result = await this.pool.query(
      `INSERT INTO file_shares (
        tenant_id, file_id, share_token, share_type, shared_with_user_id,
        shared_with_email, permissions, expires_at, max_downloads, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        effectiveTenantId,
        fileId,
        shareToken,
        options.share_type || "link",
        options.shared_with_user_id || null,
        options.shared_with_email || null,
        options.permissions || "view",
        options.expires_at ||
          (options.expires_in_hours
            ? new Date(
                Date.now() + options.expires_in_hours * 3600000,
              ).toISOString()
            : null),
        options.max_downloads || null,
        createdBy,
      ],
    );

    const share = {
      ...result.rows[0],
      share_url: `/api/v1/files/shared/${shareToken}`,
    };
    setImmediate(async () => {
      try {
        await getAuditService().log({
          action: "CREATE",
          user_id: createdBy,
          tenant_id: effectiveTenantId,
          resource_type: "file_attachment",
          resource_id: fileId,
          response_status: 201,
          metadata: {
            action: "share_created",
            share_type: options.share_type || "link",
            shared_with_email: options.shared_with_email || null,
          },
        });
      } catch (e) {}
    });
    // Notify user if shared directly with a specific user
    if (
      options.shared_with_user_id &&
      options.shared_with_user_id !== createdBy
    ) {
      setImmediate(async () => {
        try {
          await getNotificationService().sendFromTemplate(
            effectiveTenantId,
            options.shared_with_user_id,
            "file_shared",
            {
              file_name: file.original_name,
            },
            {
              entityType: "file_attachment",
              entityId: fileId,
              entityName: file.original_name,
              actionUrl: `/api/v1/files/shared/${shareToken}`,
              createdBy: createdBy,
            },
          );
        } catch (e) {
          console.warn(
            "[FileAttachmentService] Notification failed:",
            e.message,
          );
        }
      });
    }

    // Cache share token
    const redis = getRedis();
    if (redis) {
      const ttl = options.expires_at
        ? Math.max(
            Math.floor((new Date(options.expires_at) - Date.now()) / 1000),
            60,
          )
        : CACHE_TTL.share;
      await redis.set(CACHE_KEYS.share(shareToken), share, ttl);
    }

    return share;
  }

  async getByShareToken(token) {
    // Check cache first
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(CACHE_KEYS.share(token));
      if (cached && cached.file_path) return cached;
    }

    const result = await this.pool.query(
      `SELECT fs.*, fa.original_name, fa.file_path, fa.mime_type, fa.file_size, fa.tenant_id as file_tenant_id, fa.storage_provider
       FROM file_shares fs
       JOIN file_attachments fa ON fs.file_id = fa.id
       WHERE fs.share_token = $1 AND fs.is_active = TRUE
       AND fa.deleted_at IS NULL
       AND (fs.expires_at IS NULL OR fs.expires_at > NOW())
       AND (fs.max_downloads IS NULL OR fs.current_downloads < fs.max_downloads)`,
      [token],
    );

    if (result.rows.length === 0) return null;

    // Only increment download count for 'download' permission, not 'view'
    if (result.rows[0].permissions === "download") {
      await this.pool.query(
        `UPDATE file_shares SET current_downloads = current_downloads + 1, last_accessed_at = NOW() WHERE id = $1`,
        [result.rows[0].id],
      );
    } else {
      await this.pool.query(
        `UPDATE file_shares SET last_accessed_at = NOW() WHERE id = $1`,
        [result.rows[0].id],
      );
    }

    return result.rows[0];
  }

  async revokeShare(shareId, tenantId) {
    let whereClause = `id = $1`;
    const params = [shareId];
    if (tenantId) {
      params.push(tenantId);
      whereClause += ` AND tenant_id = $2`;
    }

    const result = await this.pool.query(
      `UPDATE file_shares SET is_active = FALSE
       WHERE ${whereClause} RETURNING share_token`,
      params,
    );

    if (result.rowCount > 0 && result.rows[0].share_token) {
      await this._invalidateCache(CACHE_KEYS.share(result.rows[0].share_token));
    }

    setImmediate(async () => {
      try {
        await getAuditService().log({
          action: "DELETE",
          user_id: null,
          tenant_id: tenantId,
          resource_type: "file_attachment",
          resource_id: shareId,
          response_status: 200,
          metadata: { action: "share_revoked" },
        });
      } catch (e) {}
    });

    return result.rowCount > 0;
  }

  // ============================================================================
  // QUOTA
  // ============================================================================

  async getQuota(tenantId) {
    // Check cache
    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(CACHE_KEYS.quota(tenantId));
      if (cached) return cached;
    }

    const result = await this.pool.query(
      "SELECT * FROM storage_quotas WHERE tenant_id = $1",
      [tenantId],
    );

    let quota;
    if (result.rows.length === 0) {
      const newQuota = await this.pool.query(
        `INSERT INTO storage_quotas (tenant_id) VALUES ($1) RETURNING *`,
        [tenantId],
      );
      quota = this._formatQuota(newQuota.rows[0]);
    } else {
      quota = this._formatQuota(result.rows[0]);
    }

    // Cache it
    if (redis) {
      await redis.set(CACHE_KEYS.quota(tenantId), quota, CACHE_TTL.quota);
    }

    return quota;
  }

  async updateQuota(tenantId, data) {
    const setClauses = [];
    const params = [tenantId];
    let idx = 2;

    const fields = [
      "max_storage_bytes",
      "max_file_size_bytes",
      "allowed_mime_types",
      "blocked_extensions",
    ];
    for (const field of fields) {
      if (data[field] !== undefined) {
        setClauses.push(`${field} = $${idx}`);
        params.push(data[field]);
        idx++;
      }
    }

    if (setClauses.length === 0) return this.getQuota(tenantId);

    setClauses.push("updated_at = NOW()");

    await this.pool.query(
      `UPDATE storage_quotas SET ${setClauses.join(", ")} WHERE tenant_id = $1`,
      params,
    );

    await this._invalidateCache(CACHE_KEYS.quota(tenantId));

    return this.getQuota(tenantId);
  }

  async getStorageStats(tenantId) {
    const quota = await this.getQuota(tenantId);

    const stats = await this.pool.query(
      `SELECT
         COUNT(*) as total_files,
         COALESCE(SUM(file_size), 0) as total_size,
         COUNT(*) FILTER (WHERE mime_type LIKE 'image/%') as image_count,
         COUNT(*) FILTER (WHERE mime_type = 'application/pdf') as pdf_count,
         COUNT(*) FILTER (WHERE mime_type LIKE 'application/%') as document_count
       FROM file_attachments
       WHERE tenant_id = $1 AND deleted_at IS NULL`,
      [tenantId],
    );

    const byEntity = await this.pool.query(
      `SELECT entity_type, COUNT(*) as count, COALESCE(SUM(file_size), 0) as size
       FROM file_attachments WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY entity_type`,
      [tenantId],
    );

    const byModule = await this.pool.query(
      `SELECT source_module, COUNT(*) as count, COALESCE(SUM(file_size), 0) as size
       FROM file_attachments WHERE tenant_id = $1 AND deleted_at IS NULL
       GROUP BY source_module`,
      [tenantId],
    );

    return {
      quota: {
        max_storage: quota.max_storage_bytes,
        used_storage: parseInt(stats.rows[0].total_size) || 0,
        available:
          quota.max_storage_bytes - (parseInt(stats.rows[0].total_size) || 0),
        usage_percent:
          quota.max_storage_bytes > 0
            ? Math.round(
                ((parseInt(stats.rows[0].total_size) || 0) /
                  quota.max_storage_bytes) *
                  100,
              )
            : 0,
      },
      files: {
        total: parseInt(stats.rows[0].total_files) || 0,
        images: parseInt(stats.rows[0].image_count) || 0,
        pdfs: parseInt(stats.rows[0].pdf_count) || 0,
        documents: parseInt(stats.rows[0].document_count) || 0,
      },
      by_entity: byEntity.rows.reduce((acc, row) => {
        acc[row.entity_type] = {
          count: parseInt(row.count),
          size: parseInt(row.size),
        };
        return acc;
      }, {}),
      by_module: byModule.rows.reduce((acc, row) => {
        acc[row.source_module] = {
          count: parseInt(row.count),
          size: parseInt(row.size),
        };
        return acc;
      }, {}),
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  _calculateChecksum(buffer) {
    return crypto.createHash("sha256").update(buffer).digest("hex");
  }

  async _logAccess(tenantId, fileId, userId, action, req = null) {
    try {
      await this.pool.query(
        `INSERT INTO file_access_logs (tenant_id, file_id, user_id, action, ip_address, user_agent)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          tenantId,
          fileId,
          userId,
          action,
          req
            ? req.ip ||
              req.headers?.["x-forwarded-for"] ||
              req.connection?.remoteAddress ||
              null
            : null,
          req ? req.headers?.["user-agent"] || null : null,
        ],
      );
    } catch (e) {
      console.error("[FileAttachment] Access log failed:", e.message);
    }
  }

  async _invalidateCache(key) {
    const redis = getRedis();
    if (redis) {
      try {
        await redis.delete(key);
      } catch (e) {
        /* silent */
      }
    }
  }

  async _invalidateBlobSiblingsCache(blobId) {
    if (!blobId) return;
    try {
      const result = await this.pool.query(
        `SELECT id, tenant_id FROM file_attachments WHERE blob_id = $1 AND deleted_at IS NULL`,
        [blobId]
      );
      for (const row of result.rows) {
        await this._invalidateCache(CACHE_KEYS.file(row.tenant_id, row.id));
      }
    } catch (e) {
      console.error("[FileAttachment] Sibling cache invalidation failed:", e.message);
    }
  }

  /**
   * _validateCategoryRules — removed (file_categories table no longer exists).
   * Kept as a stub returning null to avoid breaking any legacy callers.
   * @deprecated
   */
  async _validateCategoryRules(_tenantId, _categoryId, _file) {
    return null;
  }

  _formatAttachment(row) {
    if (!row) return null;
    return {
      ...row,
      file_size: parseInt(row.file_size) || 0,
      download_count: parseInt(row.download_count) || 0,
      metadata:
        typeof row.metadata === "string"
          ? JSON.parse(row.metadata)
          : row.metadata || {},
      file_size_formatted: this._formatFileSize(row.file_size),
      fileDuplication: !!(row.reference_count && parseInt(row.reference_count) > 1),
    };
  }

  _formatQuota(row) {
    return {
      ...row,
      max_storage_formatted: this._formatFileSize(row.max_storage_bytes),
      used_storage_formatted: this._formatFileSize(row.used_storage_bytes),
      max_file_size_formatted: this._formatFileSize(row.max_file_size_bytes),
    };
  }

  _formatFileSize(bytes) {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }
}

let instance = null;
const getFileAttachmentService = () => {
  if (!instance) instance = new FileAttachmentService();
  return instance;
};

module.exports = { FileAttachmentService, getFileAttachmentService };
