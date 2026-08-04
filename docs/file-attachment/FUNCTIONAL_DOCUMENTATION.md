# File Attachment Service - Functional & Module-Level Documentation

---

## 1. Functional Scope & Goals
The QAssure File Attachment Service coordinates physical and logical file storage. It handles multi-tenant boundary isolation, deduplicates uploaded files to optimize storage usage, performs full-text parsing, manages sharing access levels, and enforces quota limits.

---

## 2. Key Modules & Features

### 2.1 Checksum-Based Deduplication Engine
Storing identical physical documents (such as SOPs, manuals, or standard certificates) multiple times wastes disk space and slows down backups.
- **Checksum Calculation**: Generates a SHA-256 hash using the raw file buffer:
  ```javascript
  crypto.createHash("sha256").update(buffer).digest("hex")
  ```
- **Context Boundaries**: To preserve supplier privacy and data integrity, deduplication only applies to files with the same checksum within the same **tenant**, **module**, and **supplier scope**:
  - `tenant_id`
  - `module_id` (Ingress application API context)
  - `supplier_id` (Uploader company association)
- **Reference Counting**: The system updates the reference counter inside a transaction:
  - When a matching checksum is uploaded, the service increments `reference_count` by `1` and returns the existing blob.
  - When an attachment reference is deleted, `reference_count` is decremented. When `reference_count` reaches `0`, the physical file is purged from the physical storage provider (Local, Azure, S3, or GCP) (unless soft-deletion is configured).

### 2.2 Dynamic Hybrid Storage Provider Abstraction
The service supports pluggable backend storage options via the `StorageProvider` interface, dynamically resolved on a per-request basis:
- **Database-Driven Resolution**: Instead of static environment variables, the system queries the active storage assignment for the requesting tenant. If an active cloud storage bucket (Azure, S3, GCP, or E2E Networks Object Storage) is assigned, the system dynamically instantiates the appropriate provider and decrypts the credentials (such as SAS tokens, S3 secret keys, GCP service account keys, and EOS secret keys) using AES-256-GCM in-memory.
- **Local Storage Provider**: Saves files locally to disk (either configured per-bucket or using the system fallback directory):
  ```
  uploads/{tenant_id}/{entity_type}/{YYYY}/{MM}/{uuid}_{sanitized_name}.ext
  ```
- **Azure Storage Provider**: Interfaces with Azure Blob Storage. It uploads file streams, generates SAS signed URLs for downloads, and handles file deletion commands.
- **S3 Storage Provider**: Interfaces with Amazon S3. It uploads file streams using `@aws-sdk/client-s3`, generates presigned download URLs, and handles object deletions.
- **GCP Storage Provider**: Interfaces with Google Cloud Storage. It uploads file streams using `@google-cloud/storage`, generates signed download URLs, and handles bucket deletions.
- **E2E Networks Object Storage (EOS) Provider**: Interfaces with E2E Networks Object Storage, an S3-compatible service. It shares the S3-compatible base class (`@aws-sdk/client-s3`) and differs only by pointing at an EOS endpoint (for example `https://objectstore.e2enetworks.net`) with path-style bucket addressing. See [E2E_OBJECT_STORAGE.md](./E2E_OBJECT_STORAGE.md).

### 2.3 Storage Quota and Guardrails
Before writing file data to physical storage, the system checks quota restrictions:
1.  **Extension Blocklist**: Denies files with executable extensions:
    `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.msi`, `.dll`, `.com`, `.scr`, `.vbs`, `.js`.
2.  **MIME Type Allowlist**: Validates file types against `allowed_mime_types` (if configured by the administrator).
3.  **Storage Cap Enforcements**: Calculates the file size against the tenant's remaining quota capacity:
    ```
    file.size + used_storage_bytes > max_storage_bytes
    ```

### 2.4 Document Full-Text Extraction Pipeline
To make document contents searchable in Elasticsearch, the service extracts raw text:
- **PDF Documents**: Uses `pdf-parse` to convert vector coordinate outputs into semantic paragraph text blocks.
- **Word Documents (`.docx`)**: Uses `mammoth` to extract headings, paragraphs, and lists into HTML markup.
- **Redis Caching**: Caches extracted text to improve retrieval speeds:
  `CACHE_KEYS.content(tenantId, fileId)` (TTL: 24 hours).

---

## 3. Workflow States & Rules

### 3.1 File Upload State Diagram

```
                 [Client Upload Request]
                            │
                            ▼
              [Extension & Size Validation]
                            │
                            ▼
            [Calculate SHA-256 Checksum]
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
      [Duplicate Found]           [No Duplicate Found]
              │                           │
              │                      [Upload to Local/Azure/S3/GCP]
              │                           │
              │                      [Insert file_blobs Record]
              │                           │
              └─────────────┬─────────────┘
                            │
                            ▼
           [UPDATE reference_count = count + 1]
                            │
                            ▼
            [Insert file_attachments Reference]
                            │
                            ▼
            [Index Document in Elasticsearch]
                            │
                            ▼
             [Insert upload access_log entry]
```

### 3.2 Security Rules for File Sharing
- **Link Shares**: Generates a 64-character token (`crypto.randomBytes(32)`).
- **Time Constraints**: If `expires_at` is set, access is denied once the timestamp is exceeded.
- **Download Thresholds**: Compares `current_downloads` against `max_downloads`. Once reached, the token is deactivated.
- **Access Logs**: The system records an access log entry (`action = 'shared_download'`) each time a shared file is accessed.
- **Cache Eviction**: Revoking a share immediately invalidates the cached token:
  `CACHE_KEYS.share(token)`.

---

## 4. Multi-Tenant Storage Buckets & Assignment Logic

The storage bucket allocation engine governs how physical files map to storage targets.

### 4.1 Bucket Assignment Operations
- **Registration**: SuperAdmins register bucket definitions (Local paths, Azure containers, Amazon S3 buckets, or Google Cloud Storage buckets with encrypted credentials) in the system.
- **Tenant Assignment**: A bucket configuration is assigned to a tenant via the `/assign` route. This changes the tenant's active configuration and saves historic logs in the assignment registry.
- **Platform Bucket Delegation**: To support scenarios where a tenant utilizes the SuperAdmin's default bucket, the SuperAdmin can invoke `/assign-self`. Under the hood, this sets up an assignment referencing the SuperAdmin's default bucket config ID.
- **Unassignment**: Removing a tenant's active assignment reverts their file ingestion behavior to the system default Local filesystem path.

### 4.2 Ingestion Snapshotting (Non-Repudiation & Reliability)
When a file is uploaded:
1. The active storage assignment is resolved for the tenant.
2. The file is uploaded to the resolved storage provider.
3. A record is created in `file_blobs` with `bucket_config_id` pointing to the storage bucket configuration template used.
4. If a tenant's storage bucket is changed later, downloads and deletions for this file still resolve through the snapshotted `bucket_config_id`, preventing file loss or invalid URLs.
