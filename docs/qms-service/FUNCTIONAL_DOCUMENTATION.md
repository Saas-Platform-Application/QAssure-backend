# QAssure QMS Service — Functional Documentation

---

## 1. Schema Mapping and Transformation Engine

The connection between QAssure and an external EQMS requires schema field translation.

### 1.1 Field Mapping Logic
Users configure mapping rules via `qms_entity_mappings`:
*   **Direct mapping**: Transfers the value directly from source to target.
*   **Transformation Castings**:
    *   `to_date`: Parses ISO/epoch strings into timestamps.
    *   `uppercase` / `lowercase`: Standardizes text strings.
    *   `map_priority`: Converts external values (e.g. `1`, `2`, `3`) to QAssure priority levels (`critical`, `medium`, `low`).
    *   `map_status`: Translates external state labels into corresponding QAssure states.

### 1.2 Default Value Allocations
If a required field is missing in the source payload, the mapper assigns the configured `default_value` (e.g., assigning a default `owner_id` or `department`).

---

## 2. Synchronization Job Cycles

The background sync engine runs in two modes:

### 2.1 Full Synchronization
*   **Behavior**: Scans all history in the external system.
*   **Scope**: Typically run during the initial setup. The system processes records in pages, inserting new entries and overwriting existing local files.

### 2.2 Incremental Synchronization
*   **Behavior**: Retrieves only records modified since the connection's `last_sync_at` timestamp.
*   **Schedule**: Configurable via the connection's `sync_config` parameters (e.g., hourly, nightly).

---

## 3. Conflict Resolution Engine

Conflicts arise when a record is modified on both the external EQMS and local QAssure platform between sync intervals.

### 3.1 Detection Rules
During sync, if the incoming record's modification date matches or is older than the local record's updated date, and field values differ, the system:
1.  Suspends auto-updates for that record.
2.  Creates an entry in `qms_sync_conflicts` with `status = 'pending'`.
3.  Preserves both `source_data` and `target_data` in the database.

### 3.2 Resolution Actions
Quality managers resolve conflicts using one of three options:
*   **Source Wins (`source_wins`)**: Overwrites local QAssure fields with external EQMS data.
*   **Target Wins (`target_wins`)**: Retains local QAssure data and rejects external updates.
*   **Manual Merge (`manual_merge`)**: Combines fields manually, creating a clean record state that updates both systems.

---

## 4. Functional Endpoint Map

The functional operations of the QMS Service map directly to the five API routing files:

1. **Connection Setup & Credential Storage**:
   *   Configurations (CRUD): Managed via `qms_connection_routes.js`.
   *   Health checks (Test connection): Managed via the `/connections/:id/test` endpoint in `qms.routes.js`.

2. **Schema Field Mappings & Transformations**:
   *   Configuration (CRUD): Managed via `qms_entity_mapping_routes.js`.
   *   Field Schema Retrieval: Managed via `/connections/:id/fields/:entityType` in `qms.routes.js`.
   *   Mapping Overwrites: Managed via `/connections/:id/mappings/:entityType` in `qms.routes.js`.

3. **Sync Lifecycle & Status Monitoring**:
   *   Manual Execution (Trigger): Managed via `/connections/:id/sync` in `qms.routes.js`.
   *   Active Status & History: Polled via `/connections/:id/sync/status` and `/connections/:id/sync/history` in `qms.routes.js`.
   *   Job Cancellation: Cancelled via `/sync/jobs/:jobId/cancel` in `qms.routes.js`.
   *   Job Log Management (CRUD): Log entries are fetched or deleted via `qms_sync_job_routes.js`.

4. **Collision Handling & Conflict Resolution**:
   *   Conflict Ledger (CRUD): Checked and tracked via `qms_sync_conflict_routes.js`.
   *   Resolution Action: Triggered via the `/conflicts/:conflictId/resolve` endpoint in `qms.routes.js`.
