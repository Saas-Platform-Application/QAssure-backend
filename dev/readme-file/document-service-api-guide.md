# QAssure — Document Service API Integration Guide
> **Audience:** Module Developers integrating external/internal modules with QAssure's Document Management Service.  
> **Base URL:** `http://localhost:3000/api/v1` (dev) | `https://backendqassure.tech4bizsolutions.com/api/v1` (prod)  
> **Last Verified:** 28-Feb-2026 against live system (all 17 endpoints)

---

## 📌 Table of Contents
1. [What is the Document Service?](#1-what-is-the-document-service)
2. [Authentication Modes](#2-authentication-modes)
3. [SSO / Module Launch Flow (Recommended)](#3-sso--module-launch-flow-recommended)
4. [Permissions Required](#4-permissions-required)
5. [API Reference](#5-api-reference)
   - [5.1 Reference Data APIs](#51-reference-data-apis)
   - [5.2 Document CRUD APIs](#52-document-crud-apis)
   - [5.3 Version Management APIs](#53-version-management-apis)
   - [5.4 Checkout / Checkin APIs](#54-checkout--checkin-apis)
   - [5.5 Lifecycle Workflow APIs](#55-lifecycle-workflow-apis)
6. [Document Lifecycle State Machine](#6-document-lifecycle-state-machine)
7. [Response Schemas](#7-response-schemas)
8. [Error Reference](#8-error-reference)
9. [Module Integration Patterns](#9-module-integration-patterns)
10. [Complete Workflow Example](#10-complete-workflow-example)

---

## 1. What is the Document Service?

The **QAssure Document Service** provides a centralized, controlled document management system for quality-regulated environments (e.g., Pharma, Manufacturing). It allows modules to:

- **Create and manage controlled documents** (SOPs, Policies, Forms, Work Instructions, etc.)
- **Version-control document content** with major/minor versioning (e.g., `0.1 → 0.2 → 1.0`)
- **Drive a full document lifecycle** from `draft → in_review → approved → effective → obsolete`
- **Lock documents for editing** via a Checkout/Checkin mechanism (prevents concurrent edits)
- **Auto-number documents** by type and year (e.g., `SOP-2026-0001`)
- **Trigger periodic review alerts** based on category-defined review frequencies
- **Maintain a complete audit trail** with workflow history, access logs, and user attribution

---

## 2. Authentication Modes

The Document Service supports **three authentication modes**. Choose based on your module's use case:

### Mode A — JWT Only (QAssure UI Users)
Standard user login via the QAssure UI. Best for direct user-driven operations.

```
Authorization: Bearer <jwt_token>
```

### Mode B — JWT + API Key (Combined / Recommended for Modules)
Your module launches via SSO, obtains a `module_jwt`, and sends **both** the JWT and your module's API Key. This is the **recommended mode** for user-context operations.

```
Authorization: Bearer <module_jwt>
X-API-Key: <your_module_api_key>
```

> ✅ **Advantages of Mode B:**
> - Audit trail records the **real user identity** (not a service account)
> - User's actual role-based permissions are enforced
> - Module identity is tracked for source attribution
> - `X-Tenant-ID` is **not needed** — tenant is derived from the JWT

### Mode C — API Key + Tenant ID (System / Cron Operations)
For background module operations with no user context (automated jobs, cron tasks).

```
X-API-Key: <your_module_api_key>
X-Tenant-ID: <tenant_uuid>
```

> ⚠️ Requires `document:read` and `document:write` permissions configured in `api_key_permissions` table.

---

## 3. SSO / Module Launch Flow (Recommended)

Follow these 3 steps to obtain a `module_jwt` for **Mode B** (JWT + API Key):

### Step 1 — User Logs into QAssure

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@yourcompany.com",
  "password": "YourPassword"
}
```

**Response:** Save `data.access_token` as `jwt_token`.

---

### Step 2 — Launch Your Module

```http
POST /api/v1/modules/<your_module_id>/launch
Authorization: Bearer <jwt_token>
```

**Response:** The response contains `data.launch_url` with a `?token=<launch_token>` parameter. Extract and save the `launch_token`.

---

### Step 3 — Verify Launch Token (Exchange for Module Session JWT)

```http
POST /api/v1/modules/verify-launch-token
X-API-Key: <your_module_api_key>
Content-Type: application/json

{
  "token": "<launch_token>"
}
```

**Response Fields:**
| Field | Description |
|-------|-------------|
| `data.token` | **Module session JWT** — use as `Bearer` token for all subsequent API calls |
| `data.user` | Full user object (id, email, name, department, designation) |
| `data.tenant` | Tenant details (id, name, slug, company_name, logo) |
| `data.permissions` | Array of permission strings granted to this user |
| `data.module` | Module identity info |
| `data.expires_in` | `86400` (24 hours) |
| `data.expires_at` | ISO timestamp of expiry |

Save `data.token` as your `module_jwt`. Use it with `Authorization: Bearer <module_jwt>` + `X-API-Key: <your_api_key>` for all subsequent document API calls.

---

## 4. Permissions Required

| Permission | Description |
|---|---|
| `document:read` | View documents, categories, versions, due-for-review list |
| `document:write` | Create, update, version, checkout/checkin, and all lifecycle actions |

**Who gets these permissions automatically:**
- **Tenant Admin** — has both `document:read` and `document:write` (seeded)
- **Super Admin** — bypasses all permission checks
- **Custom Roles** — when a Tenant Admin grants document permissions
- **API Key (Mode C)** — requires explicit `document:read`/`document:write` in `api_key_permissions` table
- **JWT + API Key (Mode B)** — user's actual role-based permissions are enforced

---

## 5. API Reference

### 5.1 Reference Data APIs

These are the first APIs to call. They return static/seeded data your module needs to build dropdowns, filter options, and validate inputs.

---

#### `GET /api/v1/documents/categories`
Returns tenant-scoped document categories.

**Permissions:** `document:read`  
**Auth Modes:** A, B, C

**Query Parameters:** None

**Example Request (Mode B):**
```http
GET /api/v1/documents/categories
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
```

**Example Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "6f418ad8-c345-4003-98dd-033ab989b3a5",
      "name": "Standard Operating Procedures",
      "code": "SOP",
      "description": "SOPs for regulated operations",
      "parent_id": null,
      "requires_training": true,
      "retention_years": 10,
      "review_frequency_months": 12
    },
    {
      "id": "...",
      "name": "Forms",
      "code": "FRM",
      "review_frequency_months": 24
    }
  ]
}
```

**Category List (Pharma Corp tenant):**
| Code | Name | Review Frequency |
|------|------|-----------------|
| `FRM` | Forms | 24 months |
| `POL` | Policies | 12 months |
| `QM` | Quality Manual | 12 months |
| `SPEC` | Specifications | 12 months |
| `SOP` | Standard Operating Procedures | 12 months |
| `WI` | Work Instructions | 24 months |

> 💡 **Developer Tip:** Save `category.id` from this response — you will need it in `category_id` when creating documents. The `review_frequency_months` field is used to auto-calculate `next_review_date` when a document becomes effective.

---

#### `GET /api/v1/documents/types`
Returns all available document type codes. **No `document:read` permission required** — only authentication.

**Permissions:** Authenticated only  
**Auth Modes:** A, B, C

**Example Response:**
```json
{
  "success": true,
  "data": [
    { "code": "SOP",   "name": "Standard Operating Procedure" },
    { "code": "WI",    "name": "Work Instruction" },
    { "code": "POL",   "name": "Policy" },
    { "code": "FRM",   "name": "Form" },
    { "code": "SPEC",  "name": "Specification" },
    { "code": "QM",    "name": "Quality Manual" },
    { "code": "PROC",  "name": "Procedure" },
    { "code": "GUIDE", "name": "Guideline" },
    { "code": "REF",   "name": "Reference Document" }
  ]
}
```

> 💡 The `code` value from this list is what you pass as `document_type` when creating a document. The auto-number prefix is derived from this code (e.g., `SOP-2026-0001`).

---

#### `GET /api/v1/documents/statuses`
Returns all possible document lifecycle statuses. **No `document:read` permission required.**

**Permissions:** Authenticated only  
**Auth Modes:** A, B, C

**Example Response:**
```json
{
  "success": true,
  "data": [
    { "code": "draft",     "name": "Draft",     "description": "Document is being created or edited" },
    { "code": "in_review", "name": "In Review", "description": "Document is under review" },
    { "code": "approved",  "name": "Approved",  "description": "Document has been approved" },
    { "code": "effective", "name": "Effective", "description": "Document is currently in effect" },
    { "code": "obsolete",  "name": "Obsolete",  "description": "Document has been superseded" },
    { "code": "archived",  "name": "Archived",  "description": "Document is archived for historical purposes" }
  ]
}
```

---

#### `GET /api/v1/documents/due-for-review`
Returns `effective` documents whose `next_review_date` falls within the specified window. Useful for building compliance dashboards or sending review reminders.

**Permissions:** `document:read`  
**Auth Modes:** A, B, C

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `days_ahead` | integer | `30` | Number of days ahead to check |

**Example Request:**
```http
GET /api/v1/documents/due-for-review?days_ahead=90
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
```

**Notes:**
- Only returns documents with a non-null `next_review_date` (i.e., documents that are linked to a category)
- Documents without a category will never appear here (their `next_review_date` is `null`)

---

### 5.2 Document CRUD APIs

---

#### `POST /api/v1/documents`
Creates a new controlled document. An initial version `0.1` is auto-created. Document number is auto-generated.

**Permissions:** `document:write`  
**Auth Modes:** A, B, C

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | ✅ **Required** | Document title (max 500 chars) |
| `document_type` | string | ✅ **Required** | Type code from GET /types (e.g., `"SOP"`) |
| `description` | string | Optional | Short description |
| `content` | string | Optional | Plain-text document body (stored in version `0.1`) |
| `content_html` | string | Optional | HTML version of the content |
| `department` | string | Optional | Owning department name |
| `category_id` | UUID | Optional | Category UUID from GET /categories |
| `owner_id` | UUID | Optional | User UUID; defaults to the authenticated user |
| `tags` | string[] | Optional | Array of tag strings |
| `custom_fields` | object | Optional | Any additional JSONB metadata |

**Example Request (Mode B):**
```http
POST /api/v1/documents
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
Content-Type: application/json

{
  "title": "Sterile Manufacturing SOP",
  "document_type": "SOP",
  "description": "Standard operating procedure for sterile manufacturing",
  "content": "1. Purpose\n2. Scope\n3. Procedure\n3.1 Gowning\n3.2 Aseptic Processing",
  "department": "Manufacturing",
  "category_id": "6f418ad8-c345-4003-98dd-033ab989b3a5",
  "tags": ["sterile", "gmp", "gowning"]
}
```

**Example Request (Mode C — API Key only):**
```http
POST /api/v1/documents
X-API-Key: <your_module_api_key>
X-Tenant-ID: <tenant_uuid>
Content-Type: application/json

{
  "title": "Module-Created SOP",
  "document_type": "SOP",
  "content": "1. Purpose\n2. Scope\n3. Procedure"
}
```

**Response (HTTP 201):**
Returns full **19-field** document object. See [Document Object Schema](#document-object-full-19-fields).

**Auto-behaviors:**
- `document_number` auto-generated: `<TYPE>-<YEAR>-<NNNN>` (e.g., `SOP-2026-0001`)
- `status` defaults to `"draft"`
- Initial version `0.1` is auto-created in `document_versions` table
- `IndexingHooks.indexDocument()` is triggered for search indexing

**Validation Error (HTTP 400):**
```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "title and document_type are required" }
}
```

---

#### `GET /api/v1/documents`
Lists documents for the tenant with pagination and filtering.

**Permissions:** `document:read`  
**Auth Modes:** A, B, C

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `limit` | integer | Results per page (default: `50`) |
| `offset` | integer | Pagination offset (default: `0`) |
| `status` | string | Filter by status code (e.g., `draft`, `effective`) |
| `category_id` | UUID | Filter by category UUID |
| `document_type` | string | Filter by type code (e.g., `SOP`) |
| `owner_id` | UUID | Filter by owner UUID |
| `search` | string | Full-text ILIKE search on `title`, `document_number`, `description` |

**Example Request:**
```http
GET /api/v1/documents?status=effective&document_type=SOP&limit=20&offset=0
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
```

**Response:**
```json
{
  "success": true,
  "data": [ /* array of Document Summary objects */ ],
  "pagination": {
    "total": 47,
    "limit": 20,
    "offset": 0
  }
}
```

Results are ordered by `updated_at DESC`. Each item is a **10-field summary object** (see [Document Summary Schema](#document-summary-10-fields)).

---

#### `GET /api/v1/documents/:id`
Returns full details for a single document by its UUID.

**Permissions:** `document:read`  
**Auth Modes:** A, B, C

**Path Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `id` | UUID | Document UUID |

**Example Request:**
```http
GET /api/v1/documents/d1234567-abcd-ef01-2345-6789abcdef01
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
```

**Response:** Returns full **19-field** document object.

**Not Found (HTTP 404):**
```json
{
  "success": false,
  "error": { "code": "NOT_FOUND", "message": "Document not found" }
}
```

> ⚠️ **Note:** Checkout status is NOT included in this response. It is tracked separately in the `document_checkouts` table.

---

#### `PUT /api/v1/documents/:id`
Updates document **metadata only**. Content changes must go through versioning (POST /versions).

**Permissions:** `document:write`  
**Auth Modes:** A, B, C

**Updatable Fields:**
| Field | Type | Description |
|-------|------|-------------|
| `title` | string | Document title |
| `description` | string | Description |
| `category_id` | UUID | Change category |
| `owner_id` | UUID | Reassign owner |
| `department` | string | Department |
| `tags` | string[] | Replace tags array |
| `custom_fields` | object | Replace custom JSONB metadata |

**Example Request:**
```http
PUT /api/v1/documents/d1234567-abcd-ef01-2345-6789abcdef01
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
Content-Type: application/json

{
  "title": "Sterile Manufacturing SOP - Revised",
  "department": "Quality Assurance",
  "tags": ["sterile", "gmp", "updated"]
}
```

**Response:** Returns full **19-field** updated document object.

---

### 5.3 Version Management APIs

Documents use **major.minor versioning**. Each new version resets the document to `draft` status.

| Version Type | Example Transition | `is_major_version` |
|---|---|---|
| Minor edit | `0.1 → 0.2` | `false` (default) |
| Major revision | `0.2 → 1.0`, `1.3 → 2.0` | `true` |

---

#### `GET /api/v1/documents/:id/versions`
Returns all versions for a document, ordered from newest to oldest.

**Permissions:** `document:read`  
**Auth Modes:** A, B, C

**Example Request:**
```http
GET /api/v1/documents/<document_id>/versions
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
```

**Response:** Array of **13-field** version objects (see [Version Object Schema](#version-object-13-fields)).

> ⚠️ **Note:** `content` is **not included** in the version list response — only metadata is returned.

---

#### `POST /api/v1/documents/:id/versions`
Creates a new version of a document. The document status is reset to `draft` — it must go through the review process again.

**Permissions:** `document:write`  
**Auth Modes:** A, B, C

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `content` | string | Optional | New plain-text content body |
| `content_html` | string | Optional | HTML version of content |
| `change_summary` | string | Optional | Brief description of what changed |
| `change_reason` | string | Optional | Reason category (e.g., `minor_edit`, `regulatory_update`) |
| `is_major_version` | boolean | Optional | `true` for major version bump (default: `false`) |
| `file_name` | string | Optional | Attached file name |
| `file_path` | string | Optional | Attached file path/URL |
| `file_size` | integer | Optional | File size in bytes |
| `mime_type` | string | Optional | MIME type of attached file |

**Minor Version Example:**
```http
POST /api/v1/documents/<document_id>/versions
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
Content-Type: application/json

{
  "content": "1. Purpose\n2. Scope\n3. Procedure\n4. References\nISO 14644, EU GMP Annex 1",
  "change_summary": "Added references section",
  "change_reason": "minor_edit"
}
```

**Major Version Example:**
```http
POST /api/v1/documents/<document_id>/versions
Content-Type: application/json

{
  "content": "Complete rewrite per new regulatory requirements.",
  "change_summary": "Major revision per EU GMP Annex 1 update",
  "change_reason": "regulatory_update",
  "is_major_version": true
}
```

**Response (HTTP 201):** Returns the new **13-field** version object.

**Key Behavior:**
- SHA-256 hash is auto-calculated from `content` for integrity verification
- Document `current_version_id` is updated to the new version
- Document `status` is reset to `"draft"`

---

### 5.4 Checkout / Checkin APIs

The checkout/checkin mechanism prevents concurrent editing by granting an **exclusive 24-hour lock** on a document.

---

#### `POST /api/v1/documents/:id/checkout`
Locks the document for exclusive editing by the current user.

**Permissions:** `document:write`  
**Auth Modes:** A, B, C

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | Optional | Why the document is being checked out |

**Example Request:**
```http
POST /api/v1/documents/<document_id>/checkout
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
Content-Type: application/json

{
  "reason": "Adding new section on environmental monitoring"
}
```

**Possible Responses:**

| Scenario | Response |
|----------|----------|
| Successful new checkout | `{ "checked_out": true, "expires_at": "<ISO timestamp +24h>" }` |
| Same user re-checking out | `{ "already_checked_out": true, "by_current_user": true }` |
| Different user has it checked out | HTTP 500 with `"Document is already checked out by another user"` |

**Notes:**
- Checkout expires automatically after **24 hours**
- Checkout status is logged in `document_access_log`
- Checkout status is **not visible** in the GET /documents/:id response

---

#### `POST /api/v1/documents/:id/checkin`
Releases the exclusive lock. Only the user who performed the checkout can check in.

**Permissions:** `document:write`  
**Auth Modes:** A, B, C

**Request Body:** Empty `{}` or no body required.

**Example Request:**
```http
POST /api/v1/documents/<document_id>/checkin
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
Content-Type: application/json

{}
```

**Success Response:** `{ "checked_in": true }`

**Error Response (wrong user):** `"Document is not checked out by you"`

---

### 5.5 Lifecycle Workflow APIs

These endpoints drive the document through its full lifecycle. Always run them **in the correct order**.

> **Lifecycle Flow:**  
> `draft` → **[Submit]** → `in_review` → **[Approve]** → `approved` → **[Make Effective]** → `effective` → **[Obsolete]** → `obsolete`  
> OR: `in_review` / `approved` → **[Reject]** → `draft` (re-submit to restart)

All lifecycle endpoints return the full **19-field** document object.

---

#### `POST /api/v1/documents/:id/submit`
Submits a draft document for review. Starts a `document_approval` workflow instance.

**Permissions:** `document:write`  
**Allowed From:** `draft` status only

**Request Body:** Empty `{}` required.

**Example:**
```http
POST /api/v1/documents/<document_id>/submit
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
Content-Type: application/json

{}
```

**What happens internally:**
1. Validates document is in `draft` status
2. Calls `workflowEngine.startWorkflow({ workflowCode: 'document_approval', ... })`
3. Sets document `status = 'in_review'`
4. Saves `workflow_instance_id` on the document
5. Updates current version's status to `in_review`

**Validation Error:** `"Only draft documents can be submitted for review"`

---

#### `POST /api/v1/documents/:id/approve`
Approves a document that is under review. Logs in workflow history.

**Permissions:** `document:write`  
**Allowed From:** `in_review` status only

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `comments` | string | Optional | Approval comments |

**Example:**
```http
POST /api/v1/documents/<document_id>/approve
Content-Type: application/json

{
  "comments": "Reviewed and approved per QA checklist"
}
```

**Validation Error:** `"Only documents in review can be approved"`

---

#### `POST /api/v1/documents/:id/reject`
Rejects a document and returns it to `draft`. Logs in workflow history.

**Permissions:** `document:write`  
**Allowed From:** `in_review` or `approved` status

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | ✅ **Required** | Must provide a rejection reason |

**Example:**
```http
POST /api/v1/documents/<document_id>/reject
Content-Type: application/json

{
  "reason": "Needs additional safety section per regulatory requirement"
}
```

**Validation Error (missing reason):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "reason is required when rejecting a document"
  }
}
```

---

#### `POST /api/v1/documents/:id/make-effective`
Marks an approved document as effective. Auto-calculates the next review date.

**Permissions:** `document:write`  
**Allowed From:** `approved` status only

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `effective_date` | string (ISO date) | ✅ **Required** | e.g., `"2026-03-01"` or `"2026-03-01T00:00:00Z"` |
| `signature_id` | UUID | Optional | e-Signature UUID if applicable |

**Example:**
```http
POST /api/v1/documents/<document_id>/make-effective
Content-Type: application/json

{
  "effective_date": "2026-03-01T00:00:00Z"
}
```

**Auto-calculation of `next_review_date`:**
- If document has a `category_id`, `next_review_date = effective_date + category.review_frequency_months`
- If no category → `next_review_date = null`
- Example: SOP category has 12-month review → `next_review_date` = effective + 12 months

**Validation Error:** `"Only approved documents can be made effective"`

> ⚠️ **Does NOT insert workflow history** — this is by design in the current implementation.

---

#### `POST /api/v1/documents/:id/obsolete`
Marks an effective document as obsolete (superseded).

**Permissions:** `document:write`  
**Allowed From:** `effective` status only

**Request Body:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `reason` | string | ✅ **Required** | Why this document is being obsoleted |

**Example:**
```http
POST /api/v1/documents/<document_id>/obsolete
Content-Type: application/json

{
  "reason": "Superseded by new revision SOP-2026-0010"
}
```

**Validation Error (missing reason):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "reason is required when making a document obsolete"
  }
}
```

**What happens internally:**
- Sets `obsolete_date = NOW()`
- Inserts into `workflow_history` (action = `'obsolete'`, comments = reason) if `workflow_instance_id` exists

---

## 6. Document Lifecycle State Machine

```
                ┌───────────────────────────────────────────┐
                │                                           │
                ▼                                           │ REJECT
           ┌─────────┐    SUBMIT       ┌───────────┐        │
           │  draft  │ ─────────────► │ in_review  │ ───────┘
           └─────────┘                └───────────┘
                ▲                          │
                │      REJECT              │ APPROVE
                │ ◄────────────────────────┤
                                           ▼
                                      ┌──────────┐
                                      │ approved │
                                      └──────────┘
                                           │
                                           │ MAKE EFFECTIVE
                                           ▼
                                      ┌───────────┐
                                      │ effective │
                                      └───────────┘
                                           │
                                           │ OBSOLETE
                                           ▼
                                      ┌──────────┐
                                      │ obsolete │
                                      └──────────┘
```

**Valid Transitions Summary:**

| From Status | Action | To Status | Required Fields |
|---|---|---|---|
| `draft` | Submit | `in_review` | — |
| `in_review` | Approve | `approved` | `comments` (optional) |
| `in_review` | Reject | `draft` | `reason` (**required**) |
| `approved` | Make Effective | `effective` | `effective_date` (**required**) |
| `approved` | Reject | `draft` | `reason` (**required**) |
| `effective` | Obsolete | `obsolete` | `reason` (**required**) |

> ⚠️ **Creating a new version (POST /versions) from any status always resets the document to `draft`.**

---

## 7. Response Schemas

### Document Object (Full — 19 fields)
Returned by: `POST /documents`, `GET /documents/:id`, `PUT /documents/:id`, and all lifecycle endpoints.

```json
{
  "id": "uuid",
  "document_number": "SOP-2026-0001",
  "title": "Sterile Manufacturing SOP",
  "description": "Description text",
  "document_type": "SOP",
  "category": {
    "id": "uuid",
    "name": "Standard Operating Procedures",
    "code": "SOP"
  },
  "status": "draft",
  "current_version": "0.1",
  "version_status": "draft",
  "owner": {
    "id": "uuid",
    "email": "admin@company.com",
    "name": "Jane Doe"
  },
  "department": "Manufacturing",
  "effective_date": "2026-03-01",
  "next_review_date": "2027-03-01",
  "tags": ["sterile", "gmp"],
  "custom_fields": {},
  "workflow_instance_id": "uuid or null",
  "created_by": "admin@company.com",
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-02-28T10:00:00Z"
}
```

### Document Summary (10 fields)
Returned by: `GET /documents` (list) and `GET /documents/due-for-review`.

```json
{
  "id": "uuid",
  "document_number": "SOP-2026-0001",
  "title": "Sterile Manufacturing SOP",
  "document_type": "SOP",
  "category": "Standard Operating Procedures",
  "status": "effective",
  "current_version": "1.0",
  "owner": "admin@company.com",
  "next_review_date": "2027-03-01",
  "updated_at": "2026-02-28T10:00:00Z"
}
```

### Version Object (13 fields)
Returned by: `GET /documents/:id/versions` and `POST /documents/:id/versions`.

```json
{
  "id": "uuid",
  "version_number": "0.2",
  "major_version": 0,
  "minor_version": 2,
  "status": "draft",
  "file": {
    "name": "document.pdf",
    "path": "/uploads/document.pdf",
    "size": 204800,
    "mime_type": "application/pdf",
    "hash": "sha256-hex-string"
  },
  "change_summary": "Added references section",
  "change_reason": "minor_edit",
  "approved_by": "approver@company.com",
  "approved_at": "2026-02-28T11:00:00Z",
  "signature_id": "uuid or null",
  "created_by": "author@company.com",
  "created_at": "2026-02-28T10:30:00Z"
}
```

> **Note:** `file` is `null` if no file attachment exists. `content` field is **not included** in the version list response.

---

## 8. Error Reference

All errors follow a consistent format:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

| HTTP Status | Code | Message | When |
|---|---|---|---|
| `400` | `VALIDATION_ERROR` | `"title and document_type are required"` | Creating without required fields |
| `400` | `VALIDATION_ERROR` | `"reason is required when rejecting a document"` | Reject without reason |
| `400` | `VALIDATION_ERROR` | `"effective_date is required"` | Make Effective without date |
| `400` | `VALIDATION_ERROR` | `"reason is required when making a document obsolete"` | Obsolete without reason |
| `404` | `NOT_FOUND` | `"Document not found"` | Document not found or wrong tenant |
| `500` | `CREATE_ERROR` | error detail | DB or internal error on create |
| `500` | `CHECKOUT_ERROR` | `"Document is already checked out by another user"` | Concurrent checkout |
| `500` | `CHECKIN_ERROR` | `"Document is not checked out by you"` | Wrong user trying to checkin |
| `500` | `SUBMIT_ERROR` | `"Only draft documents can be submitted for review"` | Wrong status |
| `500` | `APPROVE_ERROR` | `"Only documents in review can be approved"` | Wrong status |
| `500` | `REJECT_ERROR` | `"Only documents in review or approved can be rejected"` | Wrong status |
| `500` | `MAKE_EFFECTIVE_ERROR` | `"Only approved documents can be made effective"` | Wrong status |
| `500` | `OBSOLETE_ERROR` | `"Only effective documents can be made obsolete"` | Wrong status |

---

## 9. Module Integration Patterns

### Pattern 1: Module Creates a Document on Behalf of a User (Most Common)

Use **Mode B (JWT + API Key)**. The audit trail will show the real user.

```
1. User logs in to QAssure → get jwt_token
2. User launches your module → get launch_token
3. Module backend calls verify-launch-token → get module_jwt
4. Module calls POST /documents with:
   Authorization: Bearer <module_jwt>
   X-API-Key: <your_api_key>
5. Document owner/created_by = real user (not your module)
```

### Pattern 2: Module Does Background/Automated Document Operations

Use **Mode C (API Key + Tenant ID)**. No user context needed.

```
1. Configure document:read + document:write in api_key_permissions for your API key
2. All requests include:
   X-API-Key: <your_api_key>
   X-Tenant-ID: <tenant_uuid>
3. No user JWT needed
4. Audit trail shows module identity (no user)
```

### Pattern 3: Module Shows a Document Compliance Dashboard

1. Call `GET /documents/due-for-review?days_ahead=30` to get documents needing attention
2. Call `GET /documents?status=effective` to list currently active documents
3. Call `GET /documents?status=draft` to list documents pending submission
4. Call `GET /documents/categories` to build category filter dropdowns

### Pattern 4: Module Manages Full Document Authoring Workflow

```
1. Create document → POST /documents
2. Checkout for editing → POST /documents/:id/checkout
3. Create new version with edits → POST /documents/:id/versions
4. Checkin → POST /documents/:id/checkin
5. Submit for review → POST /documents/:id/submit
6. Approve (by QA) → POST /documents/:id/approve
7. Make effective (by admin) → POST /documents/:id/make-effective
8. (Later) Obsolete when superseded → POST /documents/:id/obsolete
```

---

## 10. Complete Workflow Example

Below is a complete, annotated request/response sequence for creating and publishing a document via **Combined Auth (Mode B)**.

### Step 1 — Get Categories (to find SOP category ID)
```http
GET /api/v1/documents/categories
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
```
→ Note the `id` for the SOP category (e.g., `6f418ad8-c345-4003-98dd-033ab989b3a5`)

---

### Step 2 — Create Document
```http
POST /api/v1/documents
Authorization: Bearer <module_jwt>
X-API-Key: <your_api_key>
Content-Type: application/json

{
  "title": "Equipment Calibration SOP",
  "document_type": "SOP",
  "description": "Procedure for equipment calibration in production areas",
  "content": "1. Purpose\n2. Scope\n3. Procedure\n3.1 Calibration Steps",
  "department": "Engineering",
  "category_id": "6f418ad8-c345-4003-98dd-033ab989b3a5",
  "tags": ["calibration", "equipment", "gmp"]
}
```
→ Status: `draft`, Version: `0.1`, `document_number`: `SOP-2026-0002`  
→ **Save the `data.id` as `document_id`**

---

### Step 3 — Checkout for Editing
```http
POST /api/v1/documents/<document_id>/checkout
Content-Type: application/json

{ "reason": "Adding section 4 - Frequency of Calibration" }
```
→ Response: `{ "checked_out": true, "expires_at": "..." }`

---

### Step 4 — Create a New Version (Minor Edit)
```http
POST /api/v1/documents/<document_id>/versions
Content-Type: application/json

{
  "content": "1. Purpose\n2. Scope\n3. Procedure\n3.1 Calibration Steps\n4. Frequency\n4.1 Monthly for critical equipment",
  "change_summary": "Added frequency section",
  "change_reason": "minor_edit"
}
```
→ Version bumped to `0.2`, document status reset to `draft`

---

### Step 5 — Checkin
```http
POST /api/v1/documents/<document_id>/checkin
Content-Type: application/json

{}
```
→ Response: `{ "checked_in": true }`

---

### Step 6 — Submit for Review
```http
POST /api/v1/documents/<document_id>/submit
Content-Type: application/json

{}
```
→ Status: `in_review`, `workflow_instance_id` is now populated

---

### Step 7 — Approve
```http
POST /api/v1/documents/<document_id>/approve
Content-Type: application/json

{ "comments": "Reviewed and approved - meets regulatory standards" }
```
→ Status: `approved`

---

### Step 8 — Make Effective
```http
POST /api/v1/documents/<document_id>/make-effective
Content-Type: application/json

{ "effective_date": "2026-03-17T00:00:00Z" }
```
→ Status: `effective`  
→ `next_review_date` auto-calculated: `2027-03-17` (SOP category = 12 months)

---

### Step 9 — (Future) Obsolete When Superseded
```http
POST /api/v1/documents/<document_id>/obsolete
Content-Type: application/json

{ "reason": "Superseded by Equipment Calibration SOP v2.0 (SOP-2026-0015)" }
```
→ Status: `obsolete`, `obsolete_date` = NOW()

---

## Quick Reference Card

| API | Method | Endpoint | Permission | Required Body Fields |
|-----|--------|----------|------------|---------------------|
| Get Categories | `GET` | `/documents/categories` | `document:read` | — |
| Get Types | `GET` | `/documents/types` | Auth only | — |
| Get Statuses | `GET` | `/documents/statuses` | Auth only | — |
| Due for Review | `GET` | `/documents/due-for-review` | `document:read` | — |
| List Documents | `GET` | `/documents` | `document:read` | — |
| Get Document | `GET` | `/documents/:id` | `document:read` | — |
| Create Document | `POST` | `/documents` | `document:write` | `title`, `document_type` |
| Update Document | `PUT` | `/documents/:id` | `document:write` | at least one field |
| Get Versions | `GET` | `/documents/:id/versions` | `document:read` | — |
| Create Version | `POST` | `/documents/:id/versions` | `document:write` | — |
| Checkout | `POST` | `/documents/:id/checkout` | `document:write` | — |
| Checkin | `POST` | `/documents/:id/checkin` | `document:write` | — |
| Submit for Review | `POST` | `/documents/:id/submit` | `document:write` | `{}` |
| Approve | `POST` | `/documents/:id/approve` | `document:write` | — |
| Reject | `POST` | `/documents/:id/reject` | `document:write` | `reason` (**mandatory**) |
| Make Effective | `POST` | `/documents/:id/make-effective` | `document:write` | `effective_date` (**mandatory**) |
| Obsolete | `POST` | `/documents/:id/obsolete` | `document:write` | `reason` (**mandatory**) |
