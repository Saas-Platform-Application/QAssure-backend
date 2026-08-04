# QAssure CAPA Service — Integration Testing Document

---

## 1. Integration Scope & Boundaries

Integration testing for the CAPA service verifies that it interacts correctly with surrounding system modules:

*   **Security & RBAC Enforcement**: Validating that Express endpoints require valid JWT authentication, parse tenant contexts correctly, and restrict operations to users with matching permissions (`capa:read` and `capa:write`).
*   **Workflow Engine Orchestration**: Ensuring starting a CAPA workflow creates a workflow instance, maps context variables, and propagates state updates back to the CAPA table.
*   **Audit Trail Integration**: Validating that creating, updating, or closing a CAPA or action item writes structured records to the `AuditService` log in the background.
*   **Notification Engine Routing**: Checking that assigning a CAPA or action triggers the `NotificationService` to send emails/in-app notifications using templates (e.g. `capa_assigned`, `capa_closed`).
*   **Search Engine Synchronization**: Checking that updates trigger indexing hooks to index CAPA items to Elasticsearch.

---

## 2. Integration Scenarios

### 2.1 Multi-Tenant Separation Scenarios
*   **Goal**: Verify that Tenant B users cannot access Tenant A CAPAs.
*   **Steps**:
    1.  Authenticate as Tenant A admin. Create a CAPA; record the generated UUID (e.g. `capa-uuid-a`).
    2.  Authenticate as Tenant B admin.
    3.  Attempt to fetch details of Tenant A's CAPA (`GET /api/v1/capas/capa-uuid-a`).
    4.  Verify the server returns a `404 Not Found` or `403 Forbidden` response, preventing unauthorized access.
    5.  Attempt to fetch actions or update the 8D sections. Verify those attempts are also blocked.

---

### 2.2 Workflow Engine State Mapping
*   **Goal**: Verify the flow of state transitions triggered by the workflow engine.
*   **Steps**:
    1.  Create a CAPA in Tenant A. Verify status is `'draft'`.
    2.  Call the submit endpoint `POST /api/v1/capas/{id}/submit`.
    3.  Verify the controller starts a workflow instance of definition code `'capa_workflow'`.
    4.  Check that the CAPA status is updated to `'open'` and the `workflow_instance_id` is successfully mapped.
    5.  Verify that subsequent workflow steps trigger status transitions to `'investigation'`, `'action'`, etc., and that these update the CAPA record.

---

### 2.3 Audit Log Integration Scenarios
*   **Goal**: Verify that GxP-required audit events are written to the database.
*   **Steps**:
    1.  Create a new CAPA action item using `POST /api/v1/capas/{id}/actions`.
    2.  Verify the action successfully saves in the database.
    3.  Query the system audit log database table (or ES audit log) for the latest entries.
    4.  Verify an audit log entry is recorded with action type `'CREATE'`, `resource_type` set to `'capa'`, and metadata detailing the action details.
    5.  Repeat by updating an action item, verifying that the audit log captures the changed fields.

---

### 2.4 Notification Engine Scenario
*   **Goal**: Verify that notifications are sent when owners or tasks are assigned.
*   **Steps**:
    1.  Create a CAPA assigning a different user (e.g. User B) as the owner.
    2.  Verify that the `NotificationService.sendFromTemplate` is invoked with template `'capa_assigned'`.
    3.  Confirm that an email or notification record is successfully inserted into the notification queue for User B.
    4.  Update a CAPA status to `'closed'`. Confirm that User B receives a notification with template `'capa_closed'`.
