# QAssure Document Management Service — Integration Testing Guide
**Cross-Service Workflows, API Integrations, Multi-Tenant Boundaries, and Verification Scripts**

---

## 1. Integration Scope & Boundaries

Integration testing for the Document Management Service focuses on validating security boundaries, database transaction rollbacks, and inter-service communication paths:

```
+--------------------------------------------------------------+
|                Integration Testing Boundaries                |
+--------------------------------------------------------------+
                               |
       +-----------------------+-----------------------+
       |                       |                       |
       v                       v                       v
+--------------+        +--------------+        +--------------+
| MULTI-TENANT |        |  API ACCESS  |        | END-TO-END   |
| - Tenant A   |        |  - API Keys  |        | - Submission |
| - Tenant B   |        |  - Scopes    |        | - Signature  |
| - Isolation  |        |  - Modules   |        | - Release    |
+--------------+        +--------------+        +--------------+
```

### 1.1 Key Integration Points
*   **Database Constraints**: Verifying foreign keys on `tenant_id`, `category_id`, and cascades on `document_id`.
*   **Tenant Isolation**: Verifying that API requests for Tenant A are blocked from reading or writing resources belonging to Tenant B.
*   **API Key & Scopes**: Testing that external modules (like CAPA or Training) can read/write documents using API keys with the `document:read` or `document:create` scopes.
*   **Workflow Engine**: Verifying that document changes trigger appropriate state updates and task creation within the Workflow Engine.

---

## 2. Integration Scenarios & E2E Workflows

### 2.1 Scenario A: Multi-Tenant Workspace Boundaries
*   **Objective**: Verify that resources are isolated between tenants.
*   **API Calls**:
    1. Tenant A (User A) creates a document category: `POST /api/v1/documents/categories` (Header: `Authorization: Bearer TenantA_JWT`).
    2. Tenant B (User B) attempts to read the created category: `GET /api/v1/documents/categories/:id` (Header: `Authorization: Bearer TenantB_JWT`).
*   **Verification**:
    *   Step 1 returns HTTP `211 Created` and saves the category.
    *   Step 2 returns HTTP `404 Not Found` (preferred for security to hide existence) or `403 Forbidden` (tenant boundary enforced).

### 2.2 Scenario B: API Key Scopes & Module Integrations
*   **Objective**: Verify that external modules can create and associate documents using API keys.
*   **API Calls**:
    1. Send a `POST /api/v1/documents` request using an API key (Header: `X-API-Key: CAPA_Module_API_Key`) with scopes including `document:create`.
    2. Attempt a deletion `DELETE /api/v1/documents/categories/:id` using the same API key.
*   **Verification**:
    *   Step 1 returns HTTP `211 Created`, automatically resolves the tenant from the API key context, and sets `source_module` to `capa`.
    *   Step 2 returns HTTP `403 Forbidden` (API key does not have deletion scopes).

### 2.3 Scenario C: E2E Collaboration & Release Flow
*   **Objective**: Verify the entire lifecycle of a document from creation to release.
*   **API Calls**:
    1. Create a document with sections: `POST /api/v1/documents`.
    2. Submit the document for review: `POST /api/v1/documents/:id/submit`.
    3. Update a section's review status to rework: `POST /api/v1/documents/:id/sections/:sectionId/review` (Payload: `{ "status": "rework" }`).
    4. Author updates the section content: `PATCH /api/v1/documents/:id/sections/:sectionId`.
    5. Reviewer marks the section as reviewed: `POST /api/v1/documents/:id/sections/:sectionId/review` (Payload: `{ "status": "reviewed" }`).
    6. Advance and complete the workflow in the engine.
    7. Approve the document: `POST /api/v1/documents/:id/approve`.
    8. Promote the document to effective with an electronic signature: `POST /api/v1/documents/:id/make-effective` (Payload: `{ "effective_date": "2026-06-25", "signature_id": "signature-uuid" }`).
*   **Verification**:
    *   The document status is updated to `effective`.
    *   The `current_version_id` is set to the newly released version.
    *   An audit entry is logged in `document_access_log`.
