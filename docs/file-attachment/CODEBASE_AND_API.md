# File Attachment Service - Codebase & API Documentation

This document provides a detailed mapping of the codebase structure and exhaustive technical documentation for all **22 API endpoints** of the QAssure File Attachment Service.

---

## 1. Codebase Layout & File Mapping

### 1.1 Routing Layer
*   **Path**: [file-attachment.routes.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/routes/file-attachment.routes.js)
    *   *Purpose*: Configures Express routes for file ingestion, downloads, previews, sharing, versions management, quota configuration, and cleaning operations.
    *   *Middlewares*:
        *   `authenticate`: Verifies the bearer JWT token and populates `req.user`.
        *   `tenantContext`: extracts and maps the header `x-tenant-id` to the context to enforce database security boundaries.
        *   `upload`: A Multer middleware configured for in-memory file streaming. It strictly enforces a **100MB maximum file size limit** and filters file uploads based on tenant-scoped quota configurations.
        *   `authorize(<permission>)`: Gates request execution based on granular user authorization claims.
*   **Path**: [tenant-storage-bucket.routes.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/routes/tenant-storage-bucket.routes.js)
    *   *Purpose*: Configures Express routes for SuperAdmin storage bucket CRUD, tenant bucket assignment, assignment history, and unassignment operations.

### 1.2 Validation Layer
*   **Path**: [file-attachment.schema.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/validation/file-attachment.schema.js)
    *   *Purpose*: Enforces request payloads using Zod schemas for file uploads, metadata updates, and sharing.

### 1.3 Controller Layer
*   **Path**: [file-attachment.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/file-attachment.controller.js)
    *   *Purpose*: Maps network input payload variables to the service controller, performs structural inputs validation (e.g. validating required fields, enum boundaries), and handles error response structures.
*   **Path**: [tenant-storage-bucket.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/tenant-storage-bucket.controller.js)
    *   *Purpose*: Handles request mappings and response formatting for tenant storage bucket CRUD and allocation actions.

### 1.4 Service Layer
*   **Path**: [file-attachment.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/file-attachment.service.js)
    *   *Purpose*: Coordinates business logic execution, database operations, paragraph segment chunking, dynamic index creation, vector generation requests, BM25 scoring, and RAG compilation. Implements dynamic provider resolution based on tenant active bucket assignments.
*   **Path**: [tenant-storage-bucket.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/tenant-storage-bucket.service.js)
    *   *Purpose*: Manages tenant storage bucket records, validations, SAS token credentials encryption (AES-256-GCM), assignments, and histories.

### 1.5 Database Models
*   **Paths**:
    *   [file_attachment.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/sequelize-models/file_attachment.js): Represents the logical file pointer database table.
    *   [file_blob.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/sequelize-models/file_blob.js): Represents the physical file details database table. Contains `bucket_config_id` to link a blob to its snapshotted bucket.
    *   [file_share.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/sequelize-models/file_share.js): Represents the external sharing token database table.
    *   [storage_quota.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/sequelize-models/storage_quota.js): Represents the tenant storage quota database table.
    *   [file_access_log.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/sequelize-models/file_access_log.js): Represents the audit trail database table.
    *   `tenant_storage_buckets.js`: Contains Azure/Local bucket configuration templates.
    *   `tenant_bucket_assignments.js`: Maps current active and historic bucket allocations per tenant.

---

## 2. Global Headers & Security Context
Every endpoint (except public share retrievals) requires the following headers:
```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
x-tenant-id: <TENANT_UUID>
Content-Type: application/json (unless uploading files with multipart/form-data)
```

---

## 3. Exhaustive API Reference

### 3.1 Upload & File Ingestion

#### 3.1.1 Upload Single File
*   **Endpoint**: `POST /api/v1/files/upload`
*   **Permission Required**: `files:create`
*   **Headers**: Content-Type must be `multipart/form-data`
*   **Form-Data parameters**:
    *   `file` (Binary File Upload, Required): The file to upload. Max size 100MB.
    *   `entity_type` (String, Required): Associated business entity class (e.g. `capa`, `training`).
    *   `entity_id` (UUID, Required): ID of the associated entity.
    *   `category` (String, Optional): Category name.
    *   `description` (String, Optional): Optional text description.
    *   `tags` (JSON String Array, Optional): Array of filtering tags (e.g., `["evidence", "audit"]`).
    *   `metadata` (JSON String, Optional): Custom metadata key-values.
*   **Responses**:
    *   **201 Created**:
        ```json
        {
          "success": true,
          "data": {
            "id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2",
            "original_name": "sop-001.pdf",
            "stored_name": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2_sop-001.pdf",
            "file_path": "uploads/tenant-uuid/capa/2026/06/a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2_sop-001.pdf",
            "mime_type": "application/pdf",
            "file_size": 204850,
            "file_size_formatted": "200.05 KB",
            "entity_type": "capa",
            "entity_id": "b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "version": 1,
            "is_current_version": true,
            "fileDuplication": false,
            "created_at": "2026-06-19T10:00:00Z"
          }
        }
        ```
    *   **400 Bad Request**: (Quota limit exceeded, blocked extension, or invalid Zod schema)
        ```json
        {
          "success": false,
          "error": { "code": "VALIDATION_ERROR", "message": "File size exceeds remaining storage quota limit." }
        }
        ```

#### 3.1.2 Upload Multiple Files
*   **Endpoint**: `POST /api/v1/files/upload/multiple`
*   **Permission Required**: `files:create`
*   **Headers**: Content-Type must be `multipart/form-data`
*   **Form-Data parameters**:
    *   `files` (Array of Binary File Uploads, Required): Up to 10 files.
    *   `entity_type` (String, Required)
    *   `entity_id` (UUID, Required)
    *   `category` (String, Optional)
    *   `tags` (JSON String Array, Optional)
*   **Responses**:
    *   **201 Created**:
        ```json
        {
          "success": true,
          "data": [
            {
              "id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2",
              "original_name": "sop-001.pdf",
              "file_size_formatted": "200.05 KB"
            },
            {
              "id": "e8d97c39-301a-4d7a-8f5b-9b48f5e71bc2",
              "original_name": "sop-002.pdf",
              "file_size_formatted": "150.12 KB"
            }
          ]
        }
        ```

#### 3.1.3 Upload New Version
*   **Endpoint**: `POST /api/v1/files/:id/versions`
*   **Permission Required**: `files:create`
*   **URL Parameters**:
    *   `id` (UUID, Required): ID of the existing file attachment.
*   **Form-Data parameters**:
    *   `file` (Binary File Upload, Required): The new version file.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "id": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d",
            "original_name": "sop-001_v2.pdf",
            "version": 2,
            "is_current_version": true,
            "previous_version_id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2"
          }
        }
        ```

---

### 3.2 List, Filter & Details

#### 3.2.1 List Files
*   **Endpoint**: `GET /api/v1/files/`
*   **Permission Required**: `files:read`
*   **Query Parameters**:
    *   `page` (Integer, Optional): Defaults to `1`.
    *   `limit` (Integer, Optional): Defaults to `20`.
    *   `entity_type` (String, Optional)
    *   `entity_id` (UUID, Optional)
    *   `category` (String, Optional)
    *   `tags` (String/Array, Optional)
    *   `search` (String, Optional): Search in description or file name.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": [
            {
              "id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2",
              "original_name": "sop-001.pdf",
              "version": 1,
              "is_current_version": true
            }
          ],
          "pagination": { "total": 1, "page": 1, "pages": 1, "limit": 20 }
        }
        ```

#### 3.2.2 Dropdown Options Catalog
*   **Endpoint**: `GET /api/v1/files/dropdown-options`
*   **Permission Required**: `files:read` or `document:read`
*   **Description**: Lightweight catalog listings for form selectors.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": [
            {
              "id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2",
              "original_name": "sop-001.pdf"
            }
          ]
        }
        ```

#### 3.2.3 Filter Metadata Keys Options
*   **Endpoint**: `GET /api/v1/files/filter-options`
*   **Permission Required**: `files:read`
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "tags": ["evidence", "audit", "compliance"],
            "mime_types": ["application/pdf", "image/png"]
          }
        }
        ```

#### 3.2.4 Categories Filter Options
*   **Endpoint**: `GET /api/v1/files/categories-filter-options`
*   **Permission Required**: `files:read`
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": [
            { "category": "Evidence", "category_id": "cat_evidence" }
          ]
        }
        ```

#### 3.2.5 Get Attachment by ID
*   **Endpoint**: `GET /api/v1/files/:id`
*   **Permission Required**: `files:read`
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2",
            "original_name": "sop-001.pdf",
            "is_current_version": true,
            "version": 1
          }
        }
        ```

#### 3.2.6 List Entity Attachments
*   **Endpoint**: `GET /api/v1/files/entity/:entity_type/:entity_id`
*   **Permission Required**: `files:read`
*   **URL Parameters**:
    *   `entity_type` (String, Required)
    *   `entity_id` (UUID, Required)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": [
            {
              "id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2",
              "original_name": "sop-001.pdf",
              "version": 1
            }
          ]
        }
        ```

#### 3.2.7 List Version History
*   **Endpoint**: `GET /api/v1/files/:id/versions`
*   **Permission Required**: `files:read`
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": [
            { "id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2", "version": 1 },
            { "id": "c1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d", "version": 2 }
          ]
        }
        ```

---

### 3.3 Mutation, Deletion & Share

#### 3.3.1 Update File Metadata
*   **Endpoint**: `PUT /api/v1/files/:id`
*   **Permission Required**: `files:update`
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Request Body**:
    ```json
    {
      "description": "Updated corrective action report.",
      "category": "Evidence-CAPA",
      "tags": ["capa-2026", "audit-finding"],
      "metadata": { "findings": 3 }
    }
    ```
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "id": "a5d898a3-2d2f-474d-a2f0-9b48f5e71bc2",
            "description": "Updated corrective action report.",
            "category": "Evidence-CAPA",
            "tags": ["capa-2026", "audit-finding"]
          }
        }
        ```

#### 3.3.2 Delete File
*   **Endpoint**: `DELETE /api/v1/files/:id`
*   **Permission Required**: `files:delete`
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Query Parameters**:
    *   `hard` (Boolean, Optional): Perform physical deletion. Defaults to `false` (soft delete).
    *   `keep_blob` (Boolean, Optional): Retain blob records when reference drops to 0. Defaults to `false`.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "message": "File deleted successfully"
        }
        ```

#### 3.3.3 Create Share Link
*   **Endpoint**: `POST /api/v1/files/:id/share`
*   **Permission Required**: `files:create`
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Request Body**:
    ```json
    {
      "share_type": "link",
      "permissions": "download",
      "expires_in_hours": 24,
      "max_downloads": 5
    }
    ```
*   **Responses**:
    *   **201 Created**:
        ```json
        {
          "success": true,
          "data": {
            "id": "f8d97c39-301a-4d7a-8f5b-9b48f5e71bc2",
            "share_token": "a1b2c3d4e5f67a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
            "share_url": "/api/v1/files/shared/a1b2c3d4e5f67a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b",
            "expires_at": "2026-06-20T10:00:00.000Z",
            "max_downloads": 5
          }
        }
        ```

#### 3.3.4 Access Shared File
*   **Endpoint**: `GET /api/v1/files/shared/:token`
*   **Permission Required**: None (Public)
*   **URL Parameters**:
    *   `token` (String, Required): Share token.
*   **Responses**:
    *   **200 OK**: (Pipes the file stream directly)

#### 3.3.5 Revoke Share Link
*   **Endpoint**: `DELETE /api/v1/files/shares/:shareId`
*   **Permission Required**: `files:delete`
*   **URL Parameters**:
    *   `shareId` (UUID, Required)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "message": "Share revoked successfully"
        }
        ```

---

### 3.4 Download, Preview & Content Extraction

#### 3.4.1 Download File
*   **Endpoint**: `GET /api/v1/files/:id/download`
*   **Permission Required**: `files:read`
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Responses**:
    *   **200 OK**: Streams the binary file to the browser with headers configured to prompt saving (`Content-Disposition: attachment`).

#### 3.4.2 Preview File
*   **Endpoint**: `GET /api/v1/files/:id/preview`
*   **Permission Required**: None (Bypasses RBAC checking)
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Responses**:
    *   **200 OK**: Streams the file binary with inline disposition (`Content-Disposition: inline`) for browser rendering (PDFs/Images).

#### 3.4.3 Extract Content Text
*   **Endpoint**: `GET /api/v1/files/:id/content`
*   **Permission Required**: `files:read`
*   **URL Parameters**:
    *   `id` (UUID, Required)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "text": "SOP-101: Corrective and Preventive Actions Procedure...",
            "html": "<p>SOP-101: Corrective and Preventive Actions Procedure</p>..."
          }
        }
        ```

---

### 3.5 Quotas & Diagnostics

#### 3.5.1 Get Stats
*   **Endpoint**: `GET /api/v1/files/stats`
*   **Permission Required**: `files:read`
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "quota": { "max_storage": 10737418240, "used_storage": 354960, "available": 10737063280, "usage_percent": 0 },
            "files": { "total": 2, "images": 0, "pdfs": 2, "documents": 2 },
            "by_entity": { "capa": { "count": 2, "size": 354960 } }
          }
        }
        ```

#### 3.5.2 Get Quota Configuration
*   **Endpoint**: `GET /api/v1/files/quota`
*   **Permission Required**: `files:read`
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": {
            "max_storage_bytes": 10737418240,
            "max_file_size_bytes": 104857600,
            "allowed_mime_types": null,
            "blocked_extensions": [".exe", ".bat", ".cmd", ".sh", ".ps1"]
          }
        }
        ```

#### 3.5.3 Update Tenant Quota Config
*   **Endpoint**: `PUT /api/v1/files/quota`
*   **Permission Required**: `files:admin`
*   **Request Body**:
    ```json
    {
      "max_storage_bytes": 53687091200,
      "max_file_size_bytes": 524288000
    }
    ```
*   **Responses**:
    *   **200 OK**: (Returns the updated storage quota config object)

#### 3.5.4 Purge Soft Deleted Blobs
*   **Endpoint**: `POST /api/v1/files/blobs/purge-soft-deleted`
*   **Permission Required**: `files:admin`
*   **Query Parameters**:
    *   `older_than_hours` (Integer, Optional): Cleanup cutoff.
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": { "purged": 3 }
        }
        ```

---

### 3.6 Tenant Storage Bucket Configurations

These administrative endpoints are mapped at `/api/v1/storage-buckets` for configuring and allocating tenant-specific cloud storage environments.

#### 3.6.1 List Storage Buckets
*   **Endpoint**: `GET /api/v1/storage-buckets`
*   **Permission Required**: `storage_buckets:read` (enforced via `requireSuperAdmin`)
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "data": [
            {
              "id": "e0a123bc-1234-5678-abcd-ef1234567890",
              "name": "Standard Azure Bucket",
              "storage_type": "azure",
              "azure_account": "qassureprod",
              "azure_container": "company-a-files",
              "azure_url": "https://qassureprod.blob.core.windows.net",
              "created_at": "2026-06-22T08:00:00.000Z"
            }
          ]
        }
        ```

#### 3.6.2 Create Storage Bucket
*   **Endpoint**: `POST /api/v1/storage-buckets`
*   **Permission Required**: `storage_buckets:write` (enforced via `requireSuperAdmin`)
*   **Request Body (Azure)**:
    ```json
    {
      "name": "Enterprise Azure Container",
      "description": "Production container for Pharma Corp",
      "storage_type": "azure",
      "azure_account": "pharmacorpstorage",
      "azure_container": "uploads",
      "azure_sas_token": "sv=2021-08-06&ss=b&srt=co&sp=rwdl&se=2030...",
      "azure_url": "https://pharmacorpstorage.blob.core.windows.net"
    }
    ```
*   **Request Body (Local)**:
    ```json
    {
      "name": "Local Storage Area",
      "description": "On-premise uploads directory",
      "storage_type": "local",
      "local_path": "./uploads/enterprise-local"
    }
    ```
*   **Responses**:
    *   **201 Created**: Returns the created bucket metadata record. Plaintext SAS tokens are encrypted before saving, and the API response returns them obfuscated.

#### 3.6.3 Get Storage Bucket by ID
*   **Endpoint**: `GET /api/v1/storage-buckets/:id`
*   **Permission Required**: `storage_buckets:read` (enforced via `requireSuperAdmin`)
*   **Responses**:
    *   **200 OK**: Returns bucket details.

#### 3.6.4 Update Storage Bucket
*   **Endpoint**: `PUT /api/v1/storage-buckets/:id`
*   **Permission Required**: `storage_buckets:write` (enforced via `requireSuperAdmin`)
*   **Request Body**:
    ```json
    {
      "name": "Pharma Corp Main Container",
      "description": "Updated description"
    }
    ```
*   **Responses**:
    *   **200 OK**: Returns updated bucket details.

#### 3.6.5 Soft Delete Storage Bucket
*   **Endpoint**: `DELETE /api/v1/storage-buckets/:id`
*   **Permission Required**: SuperAdmin role check
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "message": "Storage bucket deleted successfully"
        }
        ```

#### 3.6.6 Assign Bucket to Tenant
*   **Endpoint**: `POST /api/v1/storage-buckets/:id/assign`
*   **Permission Required**: SuperAdmin role check
*   **Request Body**:
    ```json
    {
      "tenant_id": "c0000000-0000-0000-0000-000000000001"
    }
    ```
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "message": "Storage bucket successfully assigned to tenant",
          "data": {
            "id": "b0000000-0000-0000-0000-000000000001",
            "tenant_id": "c0000000-0000-0000-0000-000000000001",
            "bucket_config_id": "e0a123bc-1234-5678-abcd-ef1234567890",
            "is_active": true
          }
        }
        ```

#### 3.6.7 Share SuperAdmin Bucket with Tenant
*   **Endpoint**: `POST /api/v1/storage-buckets/:id/assign-self`
*   **Permission Required**: SuperAdmin role check
*   **Request Body**:
    ```json
    {
      "tenant_id": "c0000000-0000-0000-0000-000000000001"
    }
    ```
*   **Responses**:
    *   **200 OK**: Shares the SuperAdmin's default bucket with the tenant.

#### 3.6.8 Get Active Bucket for Tenant
*   **Endpoint**: `GET /api/v1/storage-buckets/tenant/:tenantId/active`
*   **Permission Required**: Authenticated session (tenant context matched)
*   **Responses**:
    *   **200 OK**: Returns active bucket configurations.

#### 3.6.9 Get Tenant Bucket Assignment History
*   **Endpoint**: `GET /api/v1/storage-buckets/tenant/:tenantId/history`
*   **Permission Required**: SuperAdmin role check
*   **Responses**:
    *   **200 OK**: Returns history array.

#### 3.6.10 Unassign Bucket from Tenant
*   **Endpoint**: `DELETE /api/v1/storage-buckets/tenant/:tenantId/unassign`
*   **Permission Required**: SuperAdmin role check
*   **Responses**:
    *   **200 OK**:
        ```json
        {
          "success": true,
          "message": "Active storage bucket assignment removed"
        }
        ```
