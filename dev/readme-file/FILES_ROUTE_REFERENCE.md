# File Management API Reference

The `/files` route (registered as `/api/v1/files`) provides a centralized service for managing file attachments, storage quotas, and secure file sharing across the QAssure platform.

## Base URL
`{{API_BASE_URL}}/api/v1/files`

---

## 1. Upload Endpoints

### Standard Upload
`POST /upload`
Uploads a file and links it to a specific system entity (e.g., a Document or CAPA).
- **Auth Required**: Yes
- **Permissions**: `files:write`
- **Body (Multipart/Form-Data)**:
  - `file`: The file to upload.
  - `entity_type`: String (e.g., 'documents', 'capa', 'training').
  - `entity_id`: UUID/ID of the record this file belongs to.
  - `category`: (Optional) String category.
  - `description`: (Optional) Text description.
  - `tags`: (Optional) Comma-separated string.

### Multiple Upload
`POST /upload/multiple`
Uploads up to 10 files at once for a single entity.
- **Auth Required**: Yes
- **Permissions**: `files:write`
- **Body (Multipart/Form-Data)**: Same as Standard Upload, but fields name is `files`.

### Simple Upload
`POST /upload/simple`
Quickly saves a file to the server and returns a URL. No database record is created.
- **Auth Required**: Yes
- **Permissions**: None (Authenticated users only)
- **Body (Multipart/Form-Data)**:
  - `file`: The file to upload.
  - `folder`: (Optional) Custom sub-folder name.

---

## 2. Retrieval & Download

### List Files
`GET /`
Lists all files for the current tenant with optional filters.
- **Auth Required**: Yes
- **Permissions**: `files:read`
- **Query Params**: `entity_type`, `mime_type`, `category`, `search`, `limit`, `offset`.

### Get by ID
`GET /:id`
Retrieves metadata for a specific file.
- **Auth Required**: Yes
- **Permissions**: `files:read`

### Download File
`GET /:id/download`
Downloads the actual file.
- **Auth Required**: Yes
- **Permissions**: `files:read`

### Preview File
`GET /:id/preview`
Returns the file with `inline` disposition for browser display.
- **Auth Required**: Yes
- **Permissions**: `files:read`

### Get by Entity
`GET /entity/:entity_type/:entity_id`
Retrieves all files attached to a specific record.
- **Auth Required**: Yes
- **Permissions**: `files:read`

---

## 3. Storage & Quotas

### Get Storage Stats
`GET /stats`
Detailed breakdown of storage usage, file counts, and entity distribution.
- **Permissions**: `files:read`

### Get Quota
`GET /quota`
Current storage limits and usage for the tenant.
- **Permissions**: `files:read`

### Update Quota
`PUT /quota`
Adjust limits (Max storage, Max file size, blocked extensions).
- **Permissions**: `files:admin`

---

## 4. Sharing

### Create Share Link
`POST /:id/share`
Generates a unique token for external or temporary access.
- **Permissions**: `files:write`
- **Body**:
  - `expires_at`: (Optional) Expiration date.
  - `max_downloads`: (Optional) Max access count.

### Access Shared File (Public)
`GET /shared/:token`
Publicly access a shared file using a token.
- **Auth Required**: No

---

## 5. Security & Constraints

- **Blocked Extensions**: `.exe`, `.bat`, `.cmd`, `.sh`, `.ps1`, `.msi`, `.dll` are rejected by default.
- **Size Limit**: 100MB per file (configurable via Quotas).
- **Isolation**: Tenant data is strictly isolated; users can only see/access files belonging to their `tenant_id`.
- **Integrity**: Every file is checksummed (SHA-256) upon upload to ensure data integrity.
- **Auditing**: All access and downloads are logged in the `file_access_logs` table.
