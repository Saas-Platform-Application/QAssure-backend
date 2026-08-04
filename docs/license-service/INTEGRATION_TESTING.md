# QAssure License Service — Integration Testing Document

---

## 1. Integration Scope & Boundaries

The License Service acts as a security gatekeeper for other platform services:
1.  **Identity Service Gating**: Blocks new user creations inside `identity-service` if the active license's `max_users` limit is exceeded.
2.  **File/Storage Service Gating**: Prevents new uploads inside `file-attachment` if `max_storage_gb` is reached.
3.  **Cron Scheduler Integration**: Coordinates with a daily cron worker to evaluate license expiration dates, update statuses, and dispatch reminders.
4.  **Audit Service Logging**: Commits structural changes to the central database logs for compliance verification.

---

## 2. Integration Scenarios

### 2.1 Identity Service Integration
*   **Goal**: Ensure the user management controller enforces active license limits.
*   **Steps**:
    1.  Create a license for Tenant A with `limits: { max_users: 2 }`.
    2.  Register two active users for Tenant A.
    3.  Attempt to register a third user via the registration endpoint (`POST /api/v1/users`).
    4.  Verify the request is blocked with status `400 Bad Request` and error message `LICENSE_LIMIT_EXCEEDED`.
    5.  Deactivate one of the original users, and retry creating the new user. Verify it now succeeds.

---

### 2.2 Storage Upload Quota Gating
*   **Goal**: Ensure file attachments are blocked when storage allocations are full.
*   **Steps**:
    1.  Create a license with `limits: { max_storage_gb: 1 }` (1 Gigabyte).
    2.  Seed mock files in the database totaling 1.05 GB.
    3.  Attempt to upload a new file via the attachment endpoint (`POST /api/v1/attachments`).
    4.  Confirm the file service calls `LicenseService.checkLimits()`, detects the breach, and blocks the upload with a storage limit warning.

---

### 2.3 Expiry Cron Worker Scenario
*   **Goal**: Verify daily license status evaluations.
*   **Steps**:
    1.  Configure a test license key set to expire tomorrow.
    2.  Trigger the daily evaluation cron task manually.
    3.  Confirm that:
        *   The license status transitions from `active` to `warning`.
        *   An email notification is dispatched to the tenant's admin list.
        *   A reminder record is inserted into `renewal_notifications`.

---

### 2.4 GxP Audit Verification Scenario
*   **Goal**: Ensure changes to license configurations write immutable logs.
*   **Steps**:
    1.  Perform a license limit update (e.g. increase storage space).
    2.  Query the `license_audit_log` table.
    3.  Verify a record exists detailing the updated limit fields, along with the modifier's user details.
