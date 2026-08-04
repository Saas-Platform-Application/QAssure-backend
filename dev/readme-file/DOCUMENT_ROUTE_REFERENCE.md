# Document Management API Reference

The `/documents` route (registered as `/api/v1/documents`) is responsible for the formal management of Quality Documents (SOPs, Work Instructions, etc.). Unlike the raw `/files` API, this route enforces version control, approvals, and regulatory compliance.

## Base URL
`{{API_BASE_URL}}/api/v1/documents`

---

## 1. Document CRUD & Metadata

### Create Document
`POST /`
Initializes a new document record. 
- **Permissions**: `document:write`
- **Body**: `title`, `document_number`, `category_id`, `type_id`, `description`.

### List Documents
`GET /`
- **Permissions**: `document:read`
- **Filters**: Category, Status, Type, and Search.

### Get Document Details
`GET /:id`
- **Permissions**: `document:read`
- **Returns**: Metadata, current version, and history.

### Update Metadata
`PUT /:id`
- **Permissions**: `document:write`
- **Note**: Only updates metadata (title, tags); does not create a new version of the file content.

---

## 2. Version & Revision Control

### Get Version History
`GET /:id/versions`
- **Permissions**: `document:read`
- **Returns**: A list of every version (v1, v2, etc.) ever created for this document.

### Create New Version
`POST /:id/versions`
- **Permissions**: `document:write`
- **Use Case**: Formally increment a document from v1.0 to v2.0 after a major change.

---

## 3. Collaboration (Checkout/Checkin)

### Checkout Document
`POST /:id/checkout`
- **Effect**: Locks the document so only you can edit it. Others can still "read" the last approved version, but cannot save changes.

### Checkin Document
`POST /:id/checkin`
- **Effect**: Unlocks the document and saves your drafts as a new minor revision.

---

## 4. Lifecycle & Compliance

### Submit for Review
`POST /:id/submit`
- **Action**: Triggers the approval workflow. Moves document from `Draft` to `Under Review`.

### Due for Review
`GET /due-for-review`
- **Action**: Lists documents that have reached their periodic review date (e.g., must be reviewed every 2 years).

### Metadata Helpers
*   `GET /categories`: List available document categories (e.g., Quality, Engineering).
*   `GET /types`: List document types (SOP, Policy, Form).
*   `GET /statuses`: List possible lifecycle states (Draft, Approved, Retired).

---

## 5. Regulatory Notes (FDA 21 CFR Part 11)

- **Audit Trail**: Every change to a document record is automatically logged.
- **Electronic Signatures**: Moving a document to "Approved" status usually requires a call to the `/electronic-signatures` API to link a digital signature to the document ID.
- **Obsolete Documents**: When a new version is approved, the old version is automatically marked as "Obsolete" to prevent accidental use of outdated instructions.
