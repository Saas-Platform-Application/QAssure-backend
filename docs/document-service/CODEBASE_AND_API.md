# QAssure Document Management Service — Codebase & API Specification
**Endpoints, Request/Response Payloads, Validation Schemas, and File Registry**

---

## 1. Codebase Structure & File Registry

The Document Management Service follows QAssure's standard multi-layered architectural pattern:

```
src/
├── routes/
│   └── document.routes.js             # API route registration and authorization bindings
├── controllers/
│   └── document.controller.js          # Express request/response controllers mapping endpoints to service logic
├── services/
│   └── document.service.js             # Core service managing DB transactions, workflow connections, and signatures
├── validation/
│   └── document.schema.js             # Zod validation schemas for requests validation
└── migrations/
    ├── 057_create_document_management.js # Core document management tables bootstrapper
    ├── 093_document_review_collaboration.js # Structured sections and threaded comments tables
    ├── 094_add_rework_traceability_to_sections.js # Traceability columns for rework states
    └── phase15_document_management.sql # SQL definitions for core document vault tables
```

---

## 2. API Endpoint Specification

### 2.1 Create a Document
Creates a new document draft in the vault. Can optionally accept initial sections.

*   **HTTP Method**: `POST`
*   **Path**: `/api/v1/documents`
*   **Headers**:
    *   `Authorization: Bearer <JWT>`
*   **Request Body**:
```json
{
  "title": "Standard Operating Procedure for Complaint Handling",
  "document_number": "SOP-QLTY-001",
  "document_type": "SOP",
  "category_id": "8fa8d39c-7221-4f10-ae40-e29ab34ef429",
  "owner_id": "4da7b89d-1102-4c28-98e3-b41398c8f001",
  "department": "Quality Assurance",
  "source_module": "capa",
  "source_module_id": "27e4d89a-0112-4fb8-8a2b-c82738ab8209",
  "sections": [
    {
      "section_number": "1.0",
      "title": "Purpose",
      "content": "This procedure outlines the steps required to receive, evaluate, and investigate customer complaints.",
      "order_index": 1,
      "is_mandatory": true
    }
  ]
}
```

*   **Success Response** (HTTP `211 Created`):
```json
{
  "success": true,
  "data": {
    "id": "e9fa823d-4720-4e1a-829d-b4b73cb8a209",
    "document_number": "SOP-QLTY-001",
    "title": "Standard Operating Procedure for Complaint Handling",
    "status": "draft",
    "current_version_id": null,
    "owner_id": "4da7b89d-1102-4c28-98e3-b41398c8f001",
    "created_at": "2026-06-23T12:00:00.000Z",
    "updated_at": "2026-06-23T12:00:00.000Z"
  }
}
```

---

### 2.2 Submit for Review
Starts a workflow review cycle for a document, pushing it to the `in_review` state.

*   **HTTP Method**: `POST`
*   **Path**: `/api/v1/documents/:id/submit`
*   **Request Body**:
```json
{
  "workflow_definition_id": "112d8a9c-29b1-4f81-9b3c-e29ab82cd73e"
}
```

*   **Success Response** (HTTP `200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "e9fa823d-4720-4e1a-829d-b4b73cb8a209",
    "status": "in_review",
    "workflow_instance_id": "fa839cd1-7c2d-4819-bbcc-d39cb28f0012"
  }
}
```

---

### 2.3 Mark Section Review Status
Marks a structured section of the document version as reviewed or flags it for rework during the review step.

*   **HTTP Method**: `POST`
*   **Path**: `/api/v1/documents/:id/sections/:sectionId/review`
*   **Request Body**:
```json
{
  "status": "rework"
}
```

*   **Success Response** (HTTP `200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "7fa8d39c-29b1-482d-88b1-d3928ac8390e",
    "document_id": "e9fa823d-4720-4e1a-829d-b4b73cb8a209",
    "review_status": "rework",
    "rework_requested_by": "3d9c8b21-4f11-488b-82c9-d2b3c4f5a6b7",
    "rework_requested_at": "2026-06-23T12:05:00.000Z",
    "rework_requested_step": "Drafting Team Review"
  }
}
```

---

### 2.4 Promote Approved Document (Make Effective)
Promotes an approved document draft to `effective` by verifying the user's electronic signature credentials.

*   **HTTP Method**: `POST`
*   **Path**: `/api/v1/documents/:id/make-effective`
*   **Request Body**:
```json
{
  "effective_date": "2026-06-25",
  "signature_id": "2fa8d93c-ef00-4b21-88fc-d28ca92cb89a"
}
```

*   **Success Response** (HTTP `200 OK`):
```json
{
  "success": true,
  "data": {
    "id": "e9fa823d-4720-4e1a-829d-b4b73cb8a209",
    "status": "effective",
    "effective_date": "2026-06-25T00:00:00.000Z",
    "next_review_date": "2027-06-25T00:00:00.000Z"
  }
}
```

---

## 3. Zod Schema Mapping (`document.schema.js`)

Below are the field-level constraints applied to API inputs:

### `CreateDocumentSchema`
*   `title`: String (Min: 1, Max: 500)
*   `document_number`: String (Max: 100, Optional)
*   `category_id`: UUID (Optional, Nullable)
*   `document_type`: Enum (`SOP`, `WI`, `POL`, `FRM`, `SPEC`, `QM`, `PROC`, `GUIDE`, `REF`)
*   `owner_id`: UUID (Optional, Nullable)
*   `department`: String (Max: 255, Optional, Nullable)
*   `tags`: Array of strings (Default: `[]`)
*   `source_module`: String (Optional, Nullable)
*   `source_module_id`: UUID (Optional, Nullable)
*   `workflow_definition_id`: UUID (Optional, Nullable)
*   `sections`: Array of section objects:
    *   `section_number`: String (Optional, Nullable)
    *   `title`: String (Optional, Nullable)
    *   `content`: String (Optional, Nullable)
    *   `order_index`: Number (Optional, Nullable)
    *   `is_mandatory`: Boolean (Default: `true`)

### `UpdateDocumentSchema`
Partial schema mapping of `CreateDocumentSchema`, allowing subset modifications.

### `ListDocumentQuerySchema`
*   `status`: String (Optional)
*   `category_id`: UUID (Optional)
*   `document_type`: String (Optional)
*   `owner_id`: UUID (Optional)
*   `search`: String (Optional)
*   `limit`: Integer (Min: 1, Max: 100, Default: 50)
*   `offset`: Integer (Min: 0, Default: 0)
