# Workflow Engine Service - Integration Testing Document

---

## 1. Integration Scope & Boundaries
Integration testing checks boundary exchanges between the Workflow Engine and surrounding subsystems:
*   **Authentication & RBAC**: Verifying routes are gated behind roles and permissions (e.g. `workflow:create`, `workflow:admin`).
*   **Multi-Tenant Gateway Scoping**: Verifying tenant identifier headers (`X-Tenant-ID`) correctly partition definitions, tasks, and instances.
*   **Electronic Signature Verification Gating**: Verifying electronic signature check callbacks during task transitions.
*   **Notification Engine / Kafka Pipeline**: Ensuring events like `workflow.started`, `task.escalated`, and `workflow.completed` publish messages to brokers.

---

## 2. Integration Scenarios

### 2.1 Multi-Tenancy Boundary Isolation
*   **Goal**: Confirm that operations are scoped to the authenticated tenant.
*   **Steps**:
    1.  Authenticate as User A under Tenant A. Create workflow definition `doc-approval-A`.
    2.  Authenticate as User B under Tenant B. Fetch all workflow definitions.
    3.  Confirm definition `doc-approval-A` is not returned.
    4.  Attempt to fetch definition `doc-approval-A` directly using its UUID with User B's token.
    5.  Verify the response returns a `404 Not Found` or `403 Forbidden` error.

### 2.2 Transition Integration Gating with Electronic Signatures
*   **Goal**: Ensure transition blocks if compliance conditions aren't satisfied.
*   **Steps**:
    1.  Retrieve a task ID that points to a step requiring signature validation.
    2.  Post a transition request to `/instances/:id/transition` without providing password or PIN fields.
    3.  Verify the engine rejects the request with a `400 Bad Request` or validation error.
    4.  Call `/api/v1/electronic-signatures/sign` with valid credentials to simulate signature creation.
    5.  Retry the transition request including valid password and PIN fields.
    6.  Verify the transition succeeds, task status is updated to `completed`, and a link to `signature_id` is saved.

### 2.3 SLA Breach & Escalation Job Integration
*   **Goal**: Verify the background cron job detects SLA violations and reassigns tasks.
*   **Steps**:
    1.  Insert a task with `due_at` set in the past and a defined `escalation_user_id`.
    2.  Execute the SLA escalation worker script.
    3.  Verify the task's assignee is updated to the escalation user.
    4.  Verify an escalation log is written to `workflow_history`.
    5.  Verify an email alert event is dispatched to the notification queue.
