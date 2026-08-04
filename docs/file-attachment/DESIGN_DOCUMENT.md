# File Attachment Service - Design Document
**Multi-Tenant Deduplicated File Attachment & Security Auditing Infrastructure**

---

## 1. Overview & Architecture
The File Attachment Service in QAssure provides secure, high-performance, multi-tenant file ingestion, indexing, and storage. It handles unstructured document types (PDFs, Word docs, images, checklists) and associates them with business entities (such as CAPAs, Training Curriculums, and Electronic Signatures). 

Key architecture and design guidelines addressed in this service include:
*   **Logical Multi-Tenancy**: All attachments, blobs, logs, and shares are scoped with a `tenant_id` database field. Files are physically separated on disk or in cloud storage buckets (Azure, S3, or GCP) using tenant-specific path hierarchies: `uploads/{tenant_id}/{entity_type}/{YYYY}/{MM}/{uuid}_{sanitized_name}`.
*   **Dynamic Database-Driven Storage Buckets**: Replaced static `.env`-based cloud storage configurations with a dynamic, database-driven multi-tenant bucket system. SuperAdmins can register storage buckets (`tenant_storage_buckets`) and assign them to specific tenants (`tenant_bucket_assignments`). Storage provider properties are resolved at runtime (supporting Local, Azure, S3, and GCP) on a per-request basis.
*   **Binary-Level Deduplication**: Saves physical storage space by computing a SHA-256 checksum on uploaded files. If a file with the same checksum exists within the scope of the tenant, module, and supplier, it is linked via a reference count inside the `file_blobs` table, preventing duplicate uploads.
*   **Electronic Signature and Audit Compliance (21 CFR Part 11)**: Every view, download, upload, update, and deletion is recorded in the `file_access_logs` and the `audit_logs` system to provide a complete, tamper-proof electronic ledger.
*   **Granular Sharing and Permissioning**: Users can share files externally or internally using temporary, time-bound tokens with download-limit restrictions.

---

## 2. Architecture & Data Flow

The diagram below details the system interaction during file ingestion (upload) and file removal (deletion).

```mermaid
sequenceDiagram
    autonumber
    actor Client as Frontend Client
    participant Router as Express Router
    participant Ctrl as File Controller
    participant Svc as File Attachment Service
    database DB as PostgreSQL DB
    participant Store as Storage Provider (Local/Azure/S3/GCP)
    participant ES as Elasticsearch (ES)

    rect rgb(240, 248, 255)
        Note over Client, ES: Ingestion & Deduplication Phase
        Client->>Router: POST /api/v1/files/upload (multipart form)
        Note over Router: Multer extracts file buffer & validates size/blacklist
        Router->>Ctrl: upload(req, res)
        Ctrl->>Svc: upload(tenantId, file, entityType, entityId, options, userId, req)
        Svc->>DB: Fetch storage quota configuration
        Svc->>Svc: Check remaining storage & allowed MIME types
        Svc->>Svc: Calculate SHA-256 file checksum
        Note over Svc: BEGIN TRANSACTION
        Svc->>DB: Query file_blobs matching checksum + module_id + supplier_id (FOR UPDATE)
        alt Checksum Match Found
            DB-->>Svc: Returns existing blob record
            Svc->>DB: UPDATE file_blobs SET reference_count = reference_count + 1
        else New Binary File
            Svc->>Store: save(storagePath, buffer)
            Store-->>Svc: returns write status
            Svc->>DB: INSERT INTO file_blobs (reference_count = 1)
        end
        Svc->>DB: INSERT INTO file_attachments (mapping metadata & blob_id)
        Svc->>DB: COMMIT TRANSACTION
        Svc->>Svc: Evict Redis Cache
        Svc->>ES: indexFileToES(attachment)
        Svc->>DB: INSERT INTO file_access_logs (action = 'upload')
        Svc-->>Ctrl: Returns saved attachment record
        Ctrl-->>Client: 201 Created (JSON metadata)
    end

    rect rgb(255, 240, 245)
        Note over Client, ES: Deletion & Dereferencing Phase
        Client->>Router: DELETE /api/v1/files/:id (hard=true)
        Router->>Ctrl: delete(req, res)
        Ctrl->>Svc: delete(id, tenantId, hardDelete, userId, keepBlob)
        Svc->>DB: Fetch versions chain for the attachment (FOR UPDATE)
        Note over Svc: BEGIN TRANSACTION
        loop For each version
            Svc->>DB: UPDATE file_blobs SET reference_count = reference_count - 1
            alt reference_count == 0 AND keepBlob == false
                Svc->>Store: delete(storagePath) (purges physical binary)
                Svc->>DB: UPDATE file_attachments SET blob_id = NULL
                Svc->>DB: DELETE FROM file_blobs WHERE id = blob_id
            else reference_count > 0 OR keepBlob == true
                Svc->>DB: UPDATE file_blobs SET is_soft_deleted = true, soft_deleted_at = NOW()
            end
        end
        alt hardDelete == true
            Svc->>DB: DELETE FROM file_attachments WHERE id = ANY(version_ids)
        else
            Svc->>DB: UPDATE file_attachments SET deleted_at = NOW() WHERE id = ANY(version_ids)
        end
        Svc->>DB: COMMIT TRANSACTION
        Svc->>Svc: Invalidate Redis Cache & remove from ES index
        Svc->>DB: INSERT INTO audit_logs (action = 'DELETE')
        Svc-->>Ctrl: returns success status
        Ctrl-->>Client: 200 OK Response
    end
```

---

## 3. Database Schema Mapping

The database schema consists of 5 main tables managed via Sequelize models:

| Table Name | Model Name | Fields | Description |
| :--- | :--- | :--- | :--- |
| `file_blobs` | `FileBlob` | `id` (UUID, PK), `tenant_id` (UUID, FK), `checksum` (VARCHAR(64)), `module_id` (UUID, Nullable), `supplier_id` (UUID, Nullable), `storage_provider` (VARCHAR(50)), `storage_path` (VARCHAR(1000)), `stored_name` (VARCHAR(500)), `mime_type` (VARCHAR(255)), `file_size` (BIGINT), `reference_count` (INT), `is_soft_deleted` (BOOL), `soft_deleted_at` (TIMESTAMP), `created_at`, `updated_at` | Represents physical file records, matching unique binaries within tenant scopes. |
| `file_attachments` | `FileAttachment` | `id` (UUID, PK), `tenant_id` (UUID, FK), `original_name` (VARCHAR(500)), `stored_name` (VARCHAR(500)), `file_path` (VARCHAR(1000)), `mime_type` (VARCHAR(255)), `file_size` (BIGINT), `checksum` (VARCHAR(64)), `storage_provider` (VARCHAR(50)), `entity_type` (VARCHAR(100)), `entity_id` (UUID), `category` (VARCHAR(255), Nullable), `category_id` (VARCHAR(255), Nullable), `source_module` (VARCHAR(100)), `source_module_id` (UUID, Nullable), `description` (TEXT), `tags` (VARCHAR[]), `version` (INT), `is_current_version` (BOOL), `previous_version_id` (UUID, FK), `blob_id` (UUID, FK), `download_count` (INT), `metadata` (JSONB), `uploaded_by` (UUID, FK), `deleted_at` (TIMESTAMP), `created_at`, `updated_at` | Represents logical pointers connecting files to specific entities. Tracks versioning chains. |
| `file_shares` | `FileShare` | `id` (UUID, PK), `tenant_id` (UUID, FK), `file_id` (UUID, FK), `share_token` (VARCHAR(100)), `share_type` (VARCHAR(50)), `shared_with_user_id` (UUID, FK, Nullable), `shared_with_email` (VARCHAR(255), Nullable), `permissions` (VARCHAR(50)), `password_hash` (VARCHAR(255), Nullable), `expires_at` (TIMESTAMP, Nullable), `max_downloads` (INT, Nullable), `current_downloads` (INT), `created_by` (UUID, FK), `last_accessed_at` (TIMESTAMP), `is_active` (BOOL), `created_at` | Stores security tokens and permissions for sharing files internally or externally. |
| `storage_quotas` | `StorageQuota` | `id` (UUID, PK), `tenant_id` (UUID, FK, Unique), `max_storage_bytes` (BIGINT), `max_file_size_bytes` (BIGINT), `used_storage_bytes` (BIGINT), `file_count` (INT), `allowed_mime_types` (TEXT[]), `blocked_extensions` (TEXT[]), `updated_at` | Tracks storage caps, file count thresholds, blacklists, and blocklist arrays for each tenant. |
| `file_access_logs` | `FileAccessLog` | `id` (UUID, PK), `tenant_id` (UUID, FK), `file_id` (UUID, FK), `user_id` (UUID, FK, Nullable), `action` (VARCHAR(50)), `ip_address` (VARCHAR(45)), `user_agent` (VARCHAR(500)), `created_at` | Stores detailed audit trails of every file access event for compliance validation. |
| `tenant_storage_buckets` | `TenantStorageBucket` | `id` (UUID, PK), `tenant_id` (UUID, FK), `name`, `description`, `storage_type` (local/azure/s3/gcp), `azure_account`, `azure_container`, `azure_sas_token` (Encrypted), `azure_url`, `local_path`, `s3_bucket`, `s3_region`, `s3_access_key`, `s3_secret_key` (Encrypted), `s3_endpoint`, `gcs_bucket`, `gcs_project_id`, `gcs_service_account_key` (Encrypted), `created_at`, `updated_at`, `deleted_at` | Stores Local, Azure, S3, or GCS configuration details. |
| `tenant_bucket_assignments` | `TenantBucketAssignment` | `id` (UUID, PK), `tenant_id` (UUID, FK), `bucket_config_id` (UUID, FK), `is_active` (BOOL), `assigned_at`, `assigned_by` (UUID), `unassigned_at`, `unassigned_by` (UUID) | Stores active and historic bucket allocations per tenant. |

---

## 4. Key Design Choices

### 4.1 Hybrid Checksum Deduplication
Deduplication is restricted within the logical scope of **tenant**, **ingress module**, and **supplier identity**:
*   *Scope isolation*: The system checks:
    ```sql
    SELECT * FROM file_blobs 
    WHERE tenant_id = $1 
      AND checksum = $2 
      AND module_id IS NOT DISTINCT FROM $3 
      AND supplier_id IS NOT DISTINCT FROM $4
    ```
    This prevents cross-tenant data leaks and ensures suppliers can only share deduplicated binaries within their scope.

### 4.2 Storage Abstraction Interface
The service encapsulates physical storage tasks into a provider interface:
- **Local Storage Provider**: Saves files using standard disk write commands, creating folder trees on the fly.
- **Azure Storage Provider**: Interfaces with Azure Blob Service. It handles SAS signed URL generations and streams readable binary bodies.
- **S3 Storage Provider**: Interfaces with Amazon S3. It handles object upload, delete, presence checks, and asynchronous presigned URL generation.
- **GCP Storage Provider**: Interfaces with Google Cloud Storage. It handles object upload, delete, presence checks, and signed URL generation.

### 4.3 21 CFR Part 11 Compliance Auditing
- **Access Logging**: Logs user details, action types (view, download, upload, delete), IP addresses, and user agents in the `file_access_logs` database table.
- **Versioning Chain**: Rather than overwriting existing records, uploading a new file version creates a new `file_attachments` record with an incremented `version` counter and links back to the prior version via `previous_version_id`.

### 4.4 Dynamic Multi-Tenant Storage Configuration & Isolation
- **Dynamic Provider Resolution**: The `FileAttachmentService` dynamically resolves the active storage provider configuration (Azure vs. Local vs. S3 vs. GCP) at runtime using the tenant's active bucket assignment. If no active bucket is assigned, the system falls back to default local storage.
- **Security & Credential Encryption**: To prevent credential leaks, sensitive cloud credentials (such as Azure SAS tokens, S3 secret access keys, and GCP service account keys) are encrypted using **AES-256-GCM** before persistence in `tenant_storage_buckets`. Decryption is performed in-memory during request processing; plain-text credentials are never exposed via APIs or in log streams.
- **Blob-Level Bucket Snapshotting**: To support bucket reassignments without breaking existing files, every physical blob record (`file_blobs`) contains a `bucket_config_id` pointer that snapshots the active bucket configuration at the moment of upload. This ensures that even if a tenant changes their active storage bucket, historic files remain downloadable from their original storage location.
- **Backward Compatibility Fallback**: Files uploaded prior to the DB-driven migration are resolved using default configuration settings (local uploads path or legacy environment variables), ensuring zero downtime and continuous data accessibility.
