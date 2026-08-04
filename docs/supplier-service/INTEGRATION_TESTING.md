# QAssure Supplier Service — Integration Testing Document

---

## 1. Integration Scope & Boundaries

Integration testing for the Supplier Service verifies that it interacts correctly with surrounding system modules:

*   **Security & RBAC Enforcement**: Validating that Express endpoints require valid JWT authentication, parse tenant contexts correctly, and restrict operations to users with matching permissions (`supplier:read`, `supplier:create`, `supplier:update`).
*   **Workflow Engine Orchestration**: Ensuring that submitting a pending supplier creates a `supplier_approval` workflow instance, maps context variables (`category`, `risk_level`), stores the `workflow_instance_id`, and updates the supplier status to `'qualified'`.
*   **Audit Trail Integration**: Validating that `CREATE` and `UPDATE` operations write structured records to the `AuditService` log in the background via `setImmediate`.
*   **Notification Engine Routing**: Verifying that `NotificationService.sendByRole()` is invoked with correct payloads on supplier creation and status changes.
*   **Search Engine Synchronization**: Checking that `IndexingHooks.indexSupplier()` is called on supplier creation, making records searchable in Elasticsearch.
*   **Module Identity Sync**: Confirming that `ModuleService.sendIdentityUpdate()` fires on create and update to keep cross-module supplier references consistent.

---

## 2. Integration Scenarios

### 2.1 Multi-Tenant Separation Scenarios
*   **Goal**: Verify that Tenant B users cannot access Tenant A supplier records.
*   **Steps**:
    1.  Authenticate as Tenant A admin. Create a supplier; record the generated UUID (e.g., `supplier-uuid-a`).
    2.  Authenticate as Tenant B admin.
    3.  Attempt to fetch Tenant A's supplier: `GET /api/v1/suppliers/supplier-uuid-a`.
    4.  Verify the server returns `404 Not Found` (service returns `null` due to tenant_id mismatch in `WHERE` clause).
    5.  Attempt to add a contact, create an audit, or create a scorecard for Tenant A's supplier.
    6.  Verify all attempts return `404` or empty results, preventing cross-tenant data exposure.

---

### 2.2 Qualification Workflow Integration
*   **Goal**: Verify the complete flow from supplier registration to workflow activation.
*   **Steps**:
    1.  Create a supplier in `pending` status for Tenant A.
    2.  Confirm the `workflow_instance_id` is `null` and status is `'pending'`.
    3.  Call `POST /api/v1/suppliers/{id}/submit`.
    4.  Verify the Workflow Engine (`workflow-engine.service.js`) is called with `workflowCode: 'supplier_approval'`, `entityType: 'supplier'`, `entityId`, `category`, and `risk_level` in the context.
    5.  Check that the supplier status is updated to `'qualified'` and `workflow_instance_id` is stored.
    6.  Attempt to submit the same supplier again.
    7.  Verify that the `'Only pending suppliers can be submitted'` error is thrown.

---

### 2.3 Audit Log Integration
*   **Goal**: Verify that GxP-required audit events are written to the AuditService.
*   **Steps**:
    1.  Create a new supplier via `POST /api/v1/suppliers`.
    2.  Verify the supplier is saved in the database.
    3.  Wait for the `setImmediate` background call to complete.
    4.  Query the `audit_logs` table for the latest entry.
    5.  Verify an entry exists with:
        *   `action: 'CREATE'`
        *   `resource_type: 'supplier'`
        *   `resource_id: <supplier_uuid>`
        *   `metadata.supplier_code: 'SUP-XXXXX'`
        *   `metadata.name: <supplier_name>`
    6.  Update the supplier and repeat: verify `action: 'UPDATE'` with `metadata.updated_fields` listing the changed fields.
    7.  Complete an audit and verify `action: 'UPDATE'` with `metadata.action: 'supplier_audit_completed'`.

---

### 2.4 Notification Engine Integration
*   **Goal**: Verify that quality managers receive notifications on key supplier events.
*   **Steps**:
    1.  Create a new supplier.
    2.  Verify `NotificationService.sendByRole(tenantId, 'quality_manager', ...)` is invoked with:
        *   `title` containing the supplier name.
        *   `notification_type: 'info'`
        *   `category: 'supplier'`
        *   `entity_type: 'supplier'`, `entity_id: <supplier_uuid>`
    3.  Update supplier status to `'approved'` via `PATCH /:id/status`.
    4.  Verify notification is sent with `notification_type: 'success'`, `priority: 'normal'`.
    5.  Update supplier status to `'suspended'`.
    6.  Verify notification with `notification_type: 'warning'`, `priority: 'high'`.
    7.  Update supplier status to `'disqualified'`.
    8.  Verify notification with `notification_type: 'warning'`, `priority: 'high'`.

---

### 2.5 Approval Expiry Integration
*   **Goal**: Verify the approval date and expiry date are correctly set on status transition.
*   **Steps**:
    1.  Create and submit a supplier; then approve it via `PATCH /:id/status`.
    2.  Fetch the supplier by ID.
    3.  Verify `dates.approved` equals today's date.
    4.  Verify `dates.expiry` equals today's date + 365 days (approximately 1 year).
    5.  Query the dashboard: `GET /api/v1/suppliers/dashboard`.
    6.  Set the expiry date in the database to 10 days from now and re-query dashboard.
    7.  Verify `summary.expiring_soon` count increases by 1.

---

### 2.6 Scorecard & Supplier Profile Sync Integration
*   **Goal**: Verify that creating a scorecard updates the supplier's profile score.
*   **Steps**:
    1.  Fetch supplier by ID; confirm `score.current` is `null` and `score.grade` is `null`.
    2.  Create a scorecard with `quality_score: 88`, `delivery_score: 92`, `service_score: 85`, `cost_score: 78`.
    3.  Fetch supplier by ID again.
    4.  Verify `score.current` = 87.6 (calculated: `88×0.4 + 92×0.3 + 85×0.2 + 78×0.1`).
    5.  Verify `score.grade` = `'B'`.

---

### 2.7 Audit Completion & Last Audit Date Sync
*   **Goal**: Verify that completing an audit updates the parent supplier's audit dates.
*   **Steps**:
    1.  Fetch supplier; confirm `dates.last_audit` and `dates.next_audit` are `null`.
    2.  Create an audit for the supplier.
    3.  Complete the audit with `actual_date: '2026-08-16'` and `next_audit_date: '2027-02-15'`.
    4.  Fetch the supplier by ID.
    5.  Verify `dates.last_audit` = `2026-08-16`.
    6.  Verify `dates.next_audit` = `2027-02-15`.

---

### 2.8 RBAC Permission Enforcement
*   **Goal**: Verify that permission checks prevent unauthorized access.
*   **Steps**:
    1.  Attempt `POST /api/v1/suppliers` with a user who only has `supplier:read` permission.
    2.  Verify the server returns `403 Forbidden` (RBAC middleware blocks the request before the controller is reached).
    3.  Attempt `PATCH /api/v1/suppliers/{id}/status` with a read-only user.
    4.  Verify `403 Forbidden`.
    5.  Attempt `GET /api/v1/suppliers/dashboard` with an unauthenticated request (no JWT token).
    6.  Verify `401 Unauthorized` (authentication middleware blocks the request).
