# QAssure QMS Service — Testing & Test Cases

---

## 1. Test Strategy Overview

The testing strategy for the QMS Integration Service ensures reliable data synchronization and connection security:
1.  **Connectivity Checks**: Verifying credentials and testing connections against mocked EQMS responses.
2.  **Transformation Gating**: Validating that custom mapping translations process field values correctly.
3.  **Conflict Triggers**: Simulating concurrent edits to confirm conflicts are flagged and held for manual resolution.
4.  **Job Cancellation**: Testing that cancellation requests immediately terminate running sync processes.

---

## 2. Test Case Matrix

| ID | Module | Target Case Description | Input Data / Params | Target Route File / Endpoint | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **QMS-TC-01** | Connect | List Supported Systems | GET `/supported` | `qms.routes.js` -> `GET /supported` | Returns array containing `veeva`, `trackwise`, `etq`. |
| **QMS-TC-02** | Connect | Test connection success | Valid credentials payload | `qms.routes.js` -> `POST /connections/:id/test` | Returns `connected: true` and API latency metrics. |
| **QMS-TC-03** | Connect | Test connection failure | Invalid API Token credentials | `qms.routes.js` -> `POST /connections/:id/test` | Returns `connected: false` and logs auth error. |
| **QMS-TC-04** | Mapping | Update Entity Mappings | Mapping translation array | `qms_entity_mapping_routes.js` -> `PUT /:id` | Mappings saved; subsequent syncs use new schema rules. |
| **QMS-TC-05** | Sync | Trigger Inbound Sync | Inbound Incremental Job parameters | `qms.routes.js` -> `POST /connections/:id/sync` | Sync job created in `running` status; background queue starts importing. |
| **QMS-TC-06** | Sync | Check Sync Progress | GET `/sync-jobs/{id}` | `qms_sync_job_routes.js` -> `GET /:id` | Returns progress details (e.g. `synced_records`). |
| **QMS-TC-07** | Conflict| Detect Conflict | Incoming modified date <= local | `qms_sync_conflict_routes.js` -> `GET /` | record not imported; entry added to `qms_sync_conflicts`. |
| **QMS-TC-08** | Conflict| Resolve Conflict - Source | POST `/resolve` with `source_wins` | `qms.routes.js` -> `POST /conflicts/:conflictId/resolve` | local data updated; conflict status changed to `resolved`. |
| **QMS-TC-09** | Sync | Cancel Sync Job | POST `/sync/jobs/{id}/cancel` | `qms.routes.js` -> `POST /sync/jobs/:jobId/cancel` | Job status changed to `cancelled`. |
| **QMS-TC-10** | Security | Non-admin config update | Normal user session | Any write endpoint in QMS route files | Request blocked with `403 Forbidden`. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Connection Configuration & Test
1.  **Action**: Log in as a Tenant Admin.
2.  **Action**: Register a Veeva connection (`POST /api/v1/qms/connections`).
3.  **Action**: Trigger a connection test (`POST /api/v1/qms/connections/{id}/test`).
    *   *Check*: Confirm the API returns a success message with connection status details.

### Scenario B: Schema Mapping & Sync Execution
1.  **Action**: Put custom field translations for CAPA schema mapping.
2.  **Action**: Trigger an incremental inbound sync (`POST /api/v1/qms/connections/{id}/sync`).
3.  **Action**: Periodically query job status (`GET /api/v1/qms/sync/jobs/{jobId}`).
    *   *Check*: Verify the progress percentage increments and the job eventually completes.
    *   *Check*: Confirm imported CAPAs populate the local database with mapped fields correctly.

### Scenario C: Conflict Trigger & Resolution
1.  **Action**: Edit a CAPA description locally.
2.  **Action**: Simulate an incoming update for the same CAPA from Veeva with a different description.
3.  **Action**: Run the incremental sync task.
    *   *Check*: Confirm that the local description is not overwritten, and a conflict entry is created.
4.  **Action**: Call the resolution endpoint with `source_wins` (`POST /api/v1/qms/conflicts/{id}/resolve`).
    *   *Check*: Verify that the local description is updated to the Veeva version and the conflict is resolved.
