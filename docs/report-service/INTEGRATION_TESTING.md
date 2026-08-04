# QAssure Reporting & Analytics Service — Integration Testing Document

---

## 1. Integration Scope & Boundaries

Integration testing checks the boundaries between the Reporting Service and surrounding components:

*   **Security & RBAC Enforcement**: Verifying that endpoints are protected by authentication guards and reject unauthorized roles (e.g. users without `reports:read` cannot view dashboards, and only users with `reports:write` can CRUD schedules).
*   **Multi-Tenant Database Isolation**: Ensuring that queries are scoped to the authenticated tenant context (`tenant_id = req.user.tenantId`), preventing data leaks between tenants.
*   **Elasticsearch Cluster Sync & Fallback**: Validating client connections, cluster health checks, reindexing operations, and the fallback to PostgreSQL when Elasticsearch is disconnected.
*   **Scheduler & Export Storage Integration**: Verifying that the scheduler triggers, export files are compiled, persisted in isolated folder structures, and registered in history.

---

## 2. Integration Scenarios

### 2.1 Multi-Tenant Boundary Isolation
*   **Goal**: Verify that tenant data and exports are strictly separated.
*   **Steps**:
    1.  Authenticate as User A under Tenant A (e.g. `tenant_id = 'tenant-uuid-aaaa'`).
    2.  Create a scheduled report definition or run an export. Verify the file is stored in `exports/tenant-uuid-aaaa/`.
    3.  Authenticate as User B under Tenant B (e.g. `tenant_id = 'tenant-uuid-bbbb'`).
    4.  Attempt to fetch lists of exports (`GET /api/v1/reporting/exports`) or scheduled reports (`GET /api/v1/reporting/scheduled`). Verify that User B cannot see any data or files created by Tenant A.
    5.  Attempt to download User A's export file using User B's token via `GET /api/v1/reporting/exports/download/file_from_a.pdf`. Verify the request returns a `404 Not Found` or `403 Forbidden` error.

---

### 2.2 Elasticsearch Search Fallback Integration
*   **Goal**: Verify the service handles Elasticsearch disconnects gracefully.
*   **Steps**:
    1.  Verify Elasticsearch is active and index a sample CAPA (e.g. `CAPA-202`).
    2.  Execute `GET /api/v1/reporting/search?q=CAPA-202`. Confirm Elasticsearch returns the document with highlights.
    3.  Simulate an Elasticsearch outage (e.g. stop the Elasticsearch Docker container or disconnect the client).
    4.  Verify that `GET /api/v1/reporting/search/health` returns `healthy: false` or status `error`.
    5.  Re-run `GET /api/v1/reporting/search?q=CAPA-202`. Verify that the controller catches the connection error, logs the fallback, queries PostgreSQL using `ILIKE`, and returns the results.

---

### 2.3 Module Reindexing Integration
*   **Goal**: Verify database rows can be reindexed into Elasticsearch.
*   **Steps**:
    1.  Create a new CAPA record directly in the PostgreSQL database.
    2.  Execute `POST /api/v1/reporting/search/reindex/capas` using a user token with `reports:write` permissions.
    3.  Confirm the endpoint returns a `200 OK` response showing `indexed_count` matching the database records.
    4.  Query `GET /api/v1/reporting/search?q=new_capa_title` to verify the search index is populated.

---

### 2.4 Scheduled Report Execution & Export Delivery
*   **Goal**: Verify that automated schedules run, generate export files, and update timing configs.
*   **Steps**:
    1.  Insert a scheduled report configuration with a target run date set in the past (`next_run_at <= NOW()`).
    2.  Trigger the scheduled execution handler (e.g. execute `ScheduledReportsService.processScheduledReports()`).
    3.  Verify the service:
        *   Retrieves the target report definition.
        *   Runs the database queries.
        *   Invokes `ExportService.exportAndTrack()` to compile the file.
        *   Saves the file in `exports/{tenant_id}/`.
        *   Writes a successful execution record to `report_history`.
        *   Updates the `last_run_at` and calculates the future `next_run_at` in the schedule.
