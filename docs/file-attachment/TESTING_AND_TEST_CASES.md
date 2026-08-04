# File Attachment Service - Testing & Test Cases Document

---

## 1. Test Strategy Overview
The File Attachment Service must be validated to ensure multi-tenant data isolation, correct quota enforcement, file deduplication accuracy, and secure sharing token lifecycles. 

Key test scopes include:
1.  **Multi-Tenancy Isolation**: Confirming that Tenant A cannot download, preview, update, delete, or list file attachments belonging to Tenant B.
2.  **File Deduplication**: Verifying that uploading duplicate files increments `reference_count` without writing new binaries to disk.
3.  **Quota & Extension Guardrails**: Confirming that blocked extensions and storage limits are correctly rejected.
4.  **Sharing Boundaries**: Validating expiration thresholds, download caps, and access token validation.

---

## 2. Comprehensive Test Case Matrix

| ID | API Endpoint | Feature / Scope | Target Case Description | Input Data | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FAT-TC-01** | `POST /upload` | Upload | Ingest valid PDF document | PDF File, Entity details | 201 Created. Attachment record returned. |
| **FAT-TC-02** | `POST /upload` | Upload | Ingest blocked extension | `.exe` File, Entity details | 400 Bad Request. Blocked extension error. |
| **FAT-TC-03** | `POST /upload` | Upload | Ingest file exceeding 100MB limit | 120MB file buffer | 400 Bad Request. Multer payload too large. |
| **FAT-TC-04** | `POST /upload` | Deduplication | Upload identical file (matching checksum) | Same PDF File, same metadata | 201 Created. Matches existing `blob_id`. reference count = 2. |
| **FAT-TC-05** | `POST /upload` | Deduplication | Same checksum uploaded by different supplier | Same file, different supplier ID | 201 Created. Creates a new `file_blobs` record due to supplier boundary. |
| **FAT-TC-06** | `POST /upload/multiple` | Upload | Upload 3 valid files concurrently | Multi-part array of files | 201 Created. Returns array of metadata. |
| **FAT-TC-07** | `POST /upload/multiple` | Upload | Upload 12 files concurrently | Array of 12 files | 400 Bad Request. Max upload limit exceeded (limit 10). |
| **FAT-TC-08** | `GET /` | Query | List attachments with paginated query | Page=1, limit=5 | 200 OK. Returns 5 files with total count metrics. |
| **FAT-TC-09** | `GET /` | Query | List attachments filtered by tag | tag="audit" | 200 OK. Returns files containing designated tag. |
| **FAT-TC-10** | `GET /dropdown-options` | Query | Fetch options catalog | None | 200 OK. Returns compact array of IDs and original names. |
| **FAT-TC-11** | `GET /filter-options` | Query | Fetch unique filter keys | None | 200 OK. Returns unique list of tags and MIME types. |
| **FAT-TC-12** | `GET /entity/:type/:id` | Query | Fetch attachments linked to specific CAPA | Entity Type & ID | 200 OK. Returns mapped attachment array. |
| **FAT-TC-13** | `GET /:id` | Query | Fetch metadata of single file | File UUID | 200 OK. Returns metadata object. |
| **FAT-TC-14** | `PUT /:id` | Update | Update tags and description fields | File UUID, updated JSON body | 200 OK. Metadata fields updated. |
| **FAT-TC-15** | `DELETE /:id` | Deletion | Soft delete attachment reference | File UUID, `hard=false` | 200 OK. `deleted_at` timestamp populated. |
| **FAT-TC-16** | `DELETE /:id` | Deletion | Hard delete unreferenced file | File UUID, `hard=true`, reference count = 1 | 200 OK. File deleted from DB and storage provider. |
| **FAT-TC-17** | `DELETE /:id` | Deletion | Hard delete reference (blob reference count > 1) | File UUID, `hard=true`, reference count = 2 | 200 OK. Reference count decremented. Binary retained. |
| **FAT-TC-18** | `GET /:id/download` | Download | Download file binary | File UUID | 200 OK. Streams file content. |
| **FAT-TC-19** | `GET /:id/preview` | Preview | View inline image preview | File UUID (PNG image) | 200 OK. Serves binary with Content-Disposition inline header. |
| **FAT-TC-20** | `GET /:id/content` | Content | Extract text from docx file | File UUID | 200 OK. Returns extracted plain text and HTML. |
| **FAT-TC-21** | `POST /:id/versions` | Versions | Ingest new file version | File UUID, new PDF file | 200 OK. Creates version 2, updates parent version links. |
| **FAT-TC-22** | `POST /:id/share` | Sharing | Create share link with download limit | Max downloads = 2 | 201 Created. Returns token and share path. |
| **FAT-TC-23** | `GET /shared/:token` | Sharing | Download file using valid share token | Share token | 200 OK. Streams file binary. |
| **FAT-TC-24** | `GET /shared/:token` | Sharing | Download file using expired share token | Expired share token | 404 Not Found or Access Denied. |
| **FAT-TC-25** | `DELETE /shares/:id` | Sharing | Revoke active sharing link | Share ID | 200 OK. Share link deactivated. |
| **FAT-TC-26** | *Cross-Cutting* | Security | Access download endpoint without token | None | 401 Unauthorized. |
| **FAT-TC-27** | *Cross-Cutting* | Isolation | Download Tenant B file using Tenant A token | Tenant A token, Tenant B File ID | 404 Not Found. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Ingestion, Deduplication, and Hard Purge Flow
1.  **Initial Ingestion**:
    -   Call `POST /api/v1/files/upload` with Tenant A's token.
    -   Parameters: `entity_type="capa"`, `entity_id="<uuid>"`, and attach `evidence_doc.pdf`.
    -   *Verification*: Status is `201 Created`. The database now contains `file_blobs` and `file_attachments` records (reference count = 1).
2.  **Duplicate Ingestion**:
    -   Call `POST /api/v1/files/upload` again using the exact same file buffer under the same tenant.
    -   *Verification*: Status is `201 Created`. The backend maps the new attachment to the existing `blob_id`. Check the database to confirm `file_blobs.reference_count` is now `2`.
3.  **Perform Deletion (Step 1)**:
    -   Call `DELETE /api/v1/files/:id` on the first attachment reference ID with `hard=true`.
    -   *Verification*: Status is `200 OK`. The first `file_attachments` row is deleted. In `file_blobs`, the reference count is decremented to `1`. The physical file remains on disk or Azure.
4.  **Perform Deletion (Step 2)**:
    -   Call `DELETE /api/v1/files/:id` on the second attachment reference ID with `hard=true`.
    -   *Verification*: Status is `200 OK`. The second `file_attachments` row is deleted. The reference count in `file_blobs` drops to `0`. The physical binary is purged from disk or Azure Blob Storage.

### Scenario B: Share Token Restrictions Validation
1.  **Generate Share Link**:
    -   Call `POST /api/v1/files/:id/share` with:
        ```json
        { "share_type": "link", "max_downloads": 2, "expires_in_hours": 1 }
        ```
    -   *Verification*: Returns `201 Created` with a 64-character `share_token`.
2.  **Verify First Access**:
    -   Call `GET /api/v1/files/shared/:token` using the share token.
    -   *Verification*: Returns `200 OK` and streams the file correctly.
3.  **Verify Second Access**:
    -   Call `GET /api/v1/files/shared/:token` again.
    -   *Verification*: Returns `200 OK` and streams the file. The download limit of 2 is now reached.
4.  **Verify Third Access (Blocked)**:
    -   Call `GET /api/v1/files/shared/:token` a third time.
    -   *Verification*: Returns `404 Not Found` or `410 Gone`. Access is blocked because the download quota has been exhausted.
