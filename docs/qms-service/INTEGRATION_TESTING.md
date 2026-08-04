# QAssure QMS Service — Integration Testing Document

---

## 1. Integration Scope & Boundaries

The QMS Service coordinates external system connections and local platform data:
1.  **Veeva/TrackWise API Clients**: Simulates REST endpoints, verifying that connectivity, payload retrieval, and authentication token renewals work as expected.
2.  **Audit Service Integration**: Tracks modifications to mappings, connection setups, and conflict resolution choices.
3.  **Notification System Alerts**: Notifies Quality Managers when manual conflict resolutions require review.

---

## 2. Integration Scenarios

### 2.1 Incremental Inbound Sync Job
*   **Goal**: Confirm that running an incremental sync job imports new records correctly.
*   **Steps**:
    1.  Configure a Veeva connection with valid credentials.
    2.  Set up field mappings for the CAPA entity.
    3.  Manually create a new CAPA record in the mocked external system.
    4.  Call the sync endpoint `POST /api/v1/qms/connections/{id}/sync`.
    5.  Poll the status endpoint until the job status is `completed`.
    6.  Verify the new CAPA is imported locally with the correct mapped fields.

---

### 2.2 Active Connection Failure and Retries
*   **Goal**: Ensure network timeouts are handled gracefully.
*   **Steps**:
    1.  Configure a connection with a mock external API that simulates a network timeout.
    2.  Trigger a sync job.
    3.  Confirm the job transitions to `failed` and records the error details in the error log.
    4.  Verify that `qms_connections` updates its status to `failed` and records the error message.

---

### 2.3 Conflict Notification Dispatch
*   **Goal**: Verify that detected conflicts trigger system notifications.
*   **Steps**:
    1.  Create a conflict scenario during a sync run.
    2.  Confirm the record is saved to the `qms_sync_conflicts` table.
    3.  Verify the system triggers a notification alert to Quality Managers.

---

## 3. Integration Endpoints Map

The integration scenarios execute against the following specific route files and endpoints:
*   **QMS Connection Configuration**: Tested via `POST /api/v1/qms/connections` (in `qms_connection_routes.js`).
*   **Entity Mapping Settings**: Configured via `POST /api/v1/qms/entity-mappings` (in `qms_entity_mapping_routes.js`).
*   **Job Triggering & Cancellation**: Handled via `POST /api/v1/qms/connections/:id/sync` and `POST /api/v1/qms/sync/jobs/:jobId/cancel` (in `qms.routes.js`).
*   **Active Job Status**: Polled via `GET /api/v1/qms/connections/:id/sync/status` (in `qms.routes.js`) and job logs queried via `GET /api/v1/qms/sync-jobs/:id` (in `qms_sync_job_routes.js`).
*   **Conflict Resolving**: Handled via `POST /api/v1/qms/conflicts/:conflictId/resolve` (in `qms.routes.js`) and conflict log retrieved via `GET /api/v1/qms/sync-conflicts/:id` (in `qms_sync_conflict_routes.js`).
