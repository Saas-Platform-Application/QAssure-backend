# QAssure QMS Service — Codebase & API Documentation

---

## 1. Directory Structure

The files managing external Quality Management Systems (QMS) connections, entity mappings, sync jobs, and sync conflicts are organized as follows:

```
src/
├── routes/
│   ├── qms.routes.js                  # Custom/operations endpoints (test, trigger sync, schema retrieval)
│   ├── qms_connection_routes.js       # Connections CRUD routing (/qms/connections)
│   ├── qms_entity_mapping_routes.js   # Entity mapping configurations CRUD routing (/qms/entity-mappings)
│   ├── qms_sync_job_routes.js         # Sync job history and status CRUD routing (/qms/sync-jobs)
│   └── qms_sync_conflict_routes.js    # Data conflict resolution CRUD routing (/qms/sync-conflicts)
├── controllers/
│   ├── qms.controller.js              # Handles QMS adapter lookup, test, config mapping actions
│   ├── qms_connection_controller.js   # Connection CRUD controller
│   ├── qms_entity_mapping_controller.js# Mappings CRUD controller
│   ├── qms_sync_job_controller.js     # Jobs CRUD controller
│   └── qms_sync_conflict_controller.js# Conflicts CRUD controller
├── services/
│   ├── qms-connection.service.js      # Adapter connection orchestration & testing
│   ├── qms-sync.service.js            # Asynchronous synchronization executor engine
│   ├── qms_connection_service.js      # Base connections database CRUD operations
│   ├── qms_entity_mapping_service.js  # Field translation database operations
│   ├── qms_sync_job_service.js        # Sync execution logs database operations
│   └── qms_sync_conflict_service.js   # Conflicts resolution logging database operations
├── validation/
│   ├── qms_connection.schema.js       # Zod schemas for connections validation
│   ├── qms_entity_mapping.schema.js   # Zod schemas for entity mapping validation
│   ├── qms_sync_job.schema.js         # Zod schemas for sync job status validation
│   └── qms_sync_conflict.schema.js    # Zod schemas for conflict log validation
```

---

## 2. Express Route Registry

The integration service routes are distributed across 5 controller-specific route files:

### 2.1 Connection CRUD (`/api/v1/qms/connections`)
*   **Route File**: `src/routes/qms_connection_routes.js`
*   **Route Prefix / Mount**: `/api/v1/qms/connections`
*   **Router-level Middlewares**:
    *   `authenticate` (Verify JWT / API Key)
    *   `tenantContext` (Bind tenant namespace)
    *   `verifyTenantAccess` (Check user tenant match)
    *   `requireFeature('qms_integration')` (Verify active QMS tier license)

| Method | Endpoint | Action | Controller Method | RBAC Permission / Authorization |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | List connections | `qmsConnectionController.findAll` | `authorize('qms_connections', 'read')` |
| **GET** | `/:id` | Fetch connection by ID | `qmsConnectionController.findById` | `authorize('qms_connections', 'read')` |
| **POST** | `/` | Create new connection | `qmsConnectionController.create` | `authorize('qms_connections', 'create')` |
| **PUT** | `/:id` | Update connection details | `qmsConnectionController.update` | `authorize('qms_connections', 'update')` |
| **DELETE**| `/:id` | Delete connection configuration | `qmsConnectionController.delete` | `authorize('qms_connections', 'delete')` |

---

### 2.2 Entity Mappings CRUD (`/api/v1/qms/entity-mappings`)
*   **Route File**: `src/routes/qms_entity_mapping_routes.js`
*   **Route Prefix / Mount**: `/api/v1/qms/entity-mappings`
*   **Router-level Middlewares**:
    *   `authenticate`
    *   `tenantContext`
    *   `verifyTenantAccess`
    *   `requireFeature('qms_integration')`

| Method | Endpoint | Action | Controller Method | Input Validation Schema | RBAC Permission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | List mapping configurations | `qmsentitymappingController.findAll` | *None* | `authorize('qms_entity_mappings', 'read')` |
| **GET** | `/:id` | Fetch specific mapping configuration | `qmsentitymappingController.findById` | `QmsentitymappingParamsSchema` (params) | `authorize('qms_entity_mappings', 'read')` |
| **POST** | `/` | Define new entity field mapping | `qmsentitymappingController.create` | *None* (Schema commented out in route) | `authorize('qms_entity_mappings', 'create')` |
| **PUT** | `/:id` | Update entity mapping properties | `qmsentitymappingController.update` | `QmsentitymappingParamsSchema` (params), `UpdateQmsentitymappingSchema` (body) | `authorize('qms_entity_mappings', 'update')` |
| **DELETE**| `/:id` | Remove entity mapping configuration | `qmsentitymappingController.delete` | `QmsentitymappingParamsSchema` (params) | `authorize('qms_entity_mappings', 'delete')` |

---

### 2.3 Sync Jobs CRUD (`/api/v1/qms/sync-jobs`)
*   **Route File**: `src/routes/qms_sync_job_routes.js`
*   **Route Prefix / Mount**: `/api/v1/qms/sync-jobs`
*   **Router-level Middlewares**:
    *   `authenticate`
    *   `tenantContext`
    *   `verifyTenantAccess`
    *   `requireFeature('qms_integration')`

| Method | Endpoint | Action | Controller Method | Input Validation Schema | RBAC Permission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | List synchronization job runs | `qmssyncjobController.findAll` | *None* | `authorize('qms_sync_jobs', 'read')` |
| **GET** | `/:id` | Fetch job run metadata | `qmssyncjobController.findById` | `QmssyncjobParamsSchema` (params) | `authorize('qms_sync_jobs', 'read')` |
| **POST** | `/` | Log/initialize manual sync job run | `qmssyncjobController.create` | `CreateQmssyncjobSchema` (body) | `authorize('qms_sync_jobs', 'create')` |
| **PUT** | `/:id` | Update job progress/status | `qmssyncjobController.update` | `QmssyncjobParamsSchema` (params), `UpdateQmssyncjobSchema` (body) | `authorize('qms_sync_jobs', 'update')` |
| **DELETE**| `/:id` | Delete job tracking history | `qmssyncjobController.delete` | `QmssyncjobParamsSchema` (params) | `authorize('qms_sync_jobs', 'delete')` |

---

### 2.4 Sync Conflicts CRUD (`/api/v1/qms/sync-conflicts`)
*   **Route File**: `src/routes/qms_sync_conflict_routes.js`
*   **Route Prefix / Mount**: `/api/v1/qms/sync-conflicts`
*   **Router-level Middlewares**:
    *   `authenticate`
    *   `tenantContext`
    *   `verifyTenantAccess`
    *   `requireFeature('qms_integration')`

| Method | Endpoint | Action | Controller Method | Input Validation Schema | RBAC Permission |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/` | List sync conflicts ledger | `qmssyncconflictController.findAll` | *None* | `authorize('qms_sync_conflicts', 'read')` |
| **GET** | `/:id` | Fetch conflict details | `qmssyncconflictController.findById` | `QmssyncconflictParamsSchema` (params) | `authorize('qms_sync_conflicts', 'read')` |
| **POST** | `/` | Create/log detected data conflict | `qmssyncconflictController.create` | *None* (Schema not directly validated in route) | `authorize('qms_sync_conflicts', 'create')` |
| **PUT** | `/:id` | Update/manually resolve conflict details | `qmssyncconflictController.update` | `QmssyncconflictParamsSchema` (params), `UpdateQmssyncconflictSchema` (body) | `authorize('qms_sync_conflicts', 'update')` |
| **DELETE**| `/:id` | Remove conflict log from ledger | `qmssyncconflictController.delete` | `QmssyncconflictParamsSchema` (params) | `authorize('qms_sync_conflicts', 'delete')` |

---

### 2.5 Core Operations (`/api/v1/qms`)
*   **Route File**: `src/routes/qms.routes.js`
*   **Route Prefix / Mount**: `/api/v1/qms`
*   **Router-level Middlewares**:
    *   `authenticate` (User identity JWT verification)

| Method | Endpoint | Action | Controller Method | RBAC Permission / Authorization |
| :--- | :--- | :--- | :--- | :--- |
| **GET** | `/supported` | List supported adapters | `qmsController.getSupportedSystems` | `authorize('qms:read')` |
| **GET** | `/supported/:systemName` | Fetch details of supported adapter | `qmsController.getSystemDetails` | `authorize('qms:read')` |
| **POST** | `/connections/:id/test` | Test connection to external QMS | `qmsController.testConnection` | `authorize('qms:update')` |
| **GET** | `/connections/:id/fields/:entityType`| Fetch schema fields from external platform | `qmsController.getEntityFields` | `authorize('qms:read')` |
| **GET** | `/connections/:id/mappings` | List active mappings under connection context | `qmsController.getMappings` | `authorize('qms:read')` |
| **PUT** | `/connections/:id/mappings/:entityType`| Overwrite mappings for single entity | `qmsController.updateMappings` | `authorize('qms:update')` |
| **GET** | `/connections/:id/sync-config` | Fetch connection sync timers & scope | `qmsController.getSyncConfig` | `authorize('qms:read')` |
| **PUT** | `/connections/:id/sync-config` | Update connection sync scheduling criteria | `qmsController.updateSyncConfig` | `authorize('qms:update')` |
| **POST** | `/connections/:id/sync` | Trigger async background sync job | `qmsController.triggerSync` | `authorize('qms:create')` |
| **GET** | `/connections/:id/sync/status` | Get current running job status | `qmsController.getSyncStatus` | `authorize('qms:read')` |
| **GET** | `/connections/:id/sync/history` | Get connection sync history list | `qmsController.getSyncHistory` | `authorize('qms:read')` |
| **GET** | `/connections/:id/sync/errors` | Fetch connection sync failure logs | `qmsController.getSyncErrors` | `authorize('qms:read')` |
| **GET** | `/sync/jobs/:jobId` | Fetch single sync job details (operations wrapper) | `qmsController.getSyncJob` | `authorize('qms:read')` |
| **POST** | `/sync/jobs/:jobId/cancel` | Cancel active synchronization job | `qmsController.cancelSync` | `authorize('qms:update')` |
| **POST** | `/conflicts/:conflictId/resolve`| Resolve a detected sync conflict | `qmsController.resolveConflict` | `authorize('qms:update')` |

---

## 3. Zod Validation Schema Breakdown

### 3.1 Connection Validation (`qms_connection.schema.js`)
Defined schemas: `CreateQmsconnectionSchema`, `UpdateQmsconnectionSchema` (partial of Create), and `QmsconnectionParamsSchema`.

*   `tenant_id`: UUID format (Required)
*   `name`: String, 3 to 100 characters (Required)
*   `qms_type`: Enum `["VEEVA_VAULT", "MASTERCONTROL", "ARENA_PLM", "TRACKWISE", "ETQ_RELIANCE"]` (Required)
*   `base_url`: Valid URL format, max 255 chars (Required)
*   `auth_type`: Enum `["OAUTH2", "API_KEY", "BASIC_AUTH", "SAML"]` (Required)
*   `auth_config`: Object/Any (Required)
*   `sync_mode`: Enum `["QMS_TO_QASSURE", "QASSURE_TO_QMS", "BIDIRECTIONAL"]` (Required)
*   `entity_mappings`: Any (Optional, Nullable)
*   `field_mappings`: Any (Optional, Nullable)
*   `webhook_url`: URL, max 255 characters (Optional, Nullable)
*   `webhook_secret`: String, max 255 characters (Optional, Nullable)
*   `status`: Enum `["ACTIVE", "SUSPENDED", "ERROR"]` (Required)
*   `last_sync_at`: Date (Optional, Nullable)
*   `last_error`: String, max 1000 characters (Optional, Nullable)
*   `created_by`: UUID format (Required)

### 3.2 Entity Mapping Validation (`qms_entity_mapping.schema.js`)
Defined schemas: `CreateQmsentitymappingSchema`, `UpdateQmsentitymappingSchema` (partial of Create), and `QmsentitymappingParamsSchema`.

*   `tenant_id`: UUID format (Required)
*   `qms_connection_id`: UUID format (Required)
*   `qms_entity_type`: String, 1 to 100 characters (Required)
*   `qassure_entity_type`: String, 1 to 100 characters (Required)
*   `mapping_direction`: Enum `["QMS_TO_QASSURE", "QASSURE_TO_QMS", "BIDIRECTIONAL"]` (Required)
*   `field_mappings`: Any (Required)
*   `transformation_rules`: Any (Optional, Nullable)
*   `validation_rules`: Any (Optional, Nullable)
*   `conflict_resolution_strategy`: Enum `["QMS_WINS", "QASSURE_WINS", "MERGE", "MANUAL", "SKIP", "LATEST_TIMESTAMP"]` (Required)
*   `sync_enabled`: Boolean (Required)
*   `sync_frequency`: Enum `["REAL_TIME", "HOURLY", "DAILY", "WEEKLY", "MANUAL"]` (Optional, Nullable)
*   `filter_criteria`: Any (Optional, Nullable)
*   `last_sync_at`: Date (Optional, Nullable)
*   `records_synced`: Integer (Required)
*   `created_by`: UUID format (Required)
*   `updated_by`: UUID format (Optional, Nullable)

### 3.3 Sync Job Validation (`qms_sync_job.schema.js`)
Defined schemas: `CreateQmssyncjobSchema`, `UpdateQmssyncjobSchema` (partial of Create), and `QmssyncjobParamsSchema`.

*   `connection_id`: UUID format (Required)
*   `job_type`: Enum `["FULL", "INCREMENTAL", "RECONCILIATION"]` (Required)
*   `direction`: Enum `["QMS_TO_QASSURE", "QASSURE_TO_QMS", "BIDIRECTIONAL"]` (Required)
*   `status`: Enum `["PENDING", "RUNNING", "COMPLETED", "FAILED", "CANCELLED"]` (Required)
*   `entity_type`: String, max 100 characters (Optional, Nullable)
*   `records_total`: Integer (Optional, Nullable)
*   `records_processed`: Integer (Optional, Nullable)
*   `records_created`: Integer (Optional, Nullable)
*   `records_updated`: Integer (Optional, Nullable)
*   `records_failed`: Integer (Optional, Nullable)
*   `conflicts_detected`: Integer (Optional, Nullable)
*   `conflicts_resolved`: Integer (Optional, Nullable)
*   `error_message`: String, max 2000 characters (Optional, Nullable)
*   `error_details`: Any (Optional, Nullable)
*   `started_at`: Date (Optional, Nullable)
*   `completed_at`: Date (Optional, Nullable)
*   `triggered_by`: UUID format (Optional, Nullable)
*   `metadata`: Any (Optional, Nullable)

### 3.4 Sync Conflict Validation (`qms_sync_conflict.schema.js`)
Defined schemas: `CreateQmssyncconflictSchema`, `UpdateQmssyncconflictSchema` (partial of Create), and `QmssyncconflictParamsSchema`.

*   `tenant_id`: UUID format (Required)
*   `sync_job_id`: UUID format (Required)
*   `qms_connection_id`: UUID format (Required)
*   `entity_type`: String, 1 to 100 characters (Required)
*   `entity_id`: String, 1 to 255 characters (Required)
*   `qms_record_id`: String, 1 to 255 characters (Required)
*   `qassure_record_id`: String, max 255 characters (Optional, Nullable)
*   `conflict_type`: Enum `["FIELD_MISMATCH", "DUPLICATE_RECORD", "MISSING_DEPENDENCY", "VALIDATION_ERROR", "CONCURRENT_MODIFICATION", "DELETE_CONFLICT"]` (Required)
*   `conflict_field`: String, max 255 characters (Optional, Nullable)
*   `qms_value`: Any (Optional, Nullable)
*   `qassure_value`: Any (Optional, Nullable)
*   `conflict_details`: Any (Optional, Nullable)
*   `status`: Enum `["PENDING", "RESOLVED", "AUTO_RESOLVED", "MANUAL_RESOLVED", "IGNORED", "FAILED"]` (Required)
*   `resolution_strategy`: Enum `["QMS_WINS", "QASSURE_WINS", "MERGE", "MANUAL", "SKIP"]` (Optional, Nullable)
*   `resolved_value`: Any (Optional, Nullable)
*   `resolved_by`: UUID format (Optional, Nullable)
*   `resolved_at`: Date (Optional, Nullable)
*   `resolution_notes`: String, max 10000 characters (Optional, Nullable)
*   `retry_count`: Integer, max 100 (Required)
*   `last_retry_at`: Date (Optional, Nullable)
*   `error_message`: String, max 5000 characters (Optional, Nullable)

---

## 4. API Request & Response Examples

### 4.1 Create Connection (`POST /api/v1/qms/connections`)
**Request Body**:
```json
{
  "tenant_id": "e0000000-1111-2222-3333-444444444444",
  "name": "Veeva Vault Quality Integration",
  "qms_type": "VEEVA_VAULT",
  "base_url": "https://pharmacorp-vault.veevavault.com",
  "auth_type": "BASIC_AUTH",
  "auth_config": {
    "username": "api_user",
    "password": "Password123"
  },
  "sync_mode": "BIDIRECTIONAL",
  "status": "ACTIVE",
  "created_by": "u0000000-1111-2222-3333-444444444444"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "c0000000-1111-2222-3333-444444444444",
    "tenant_id": "e0000000-1111-2222-3333-444444444444",
    "name": "Veeva Vault Quality Integration",
    "qms_type": "VEEVA_VAULT",
    "base_url": "https://pharmacorp-vault.veevavault.com",
    "auth_type": "BASIC_AUTH",
    "status": "ACTIVE",
    "created_by": "u0000000-1111-2222-3333-444444444444",
    "created_at": "2026-06-30T10:00:00.000Z",
    "updated_at": "2026-06-30T10:00:00.000Z"
  },
  "message": "Qmsconnection created successfully"
}
```

### 4.2 Define Entity Mapping (`POST /api/v1/qms/entity-mappings`)
**Request Body**:
```json
{
  "tenant_id": "e0000000-1111-2222-3333-444444444444",
  "qms_connection_id": "c0000000-1111-2222-3333-444444444444",
  "qms_entity_type": "document",
  "qassure_entity_type": "document",
  "mapping_direction": "BIDIRECTIONAL",
  "field_mappings": [
    {
      "source_field": "external_title",
      "target_field": "title",
      "type": "string"
    }
  ],
  "conflict_resolution_strategy": "MANUAL",
  "sync_enabled": true,
  "sync_frequency": "HOURLY",
  "records_synced": 0,
  "created_by": "u0000000-1111-2222-3333-444444444444"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "m0000000-1111-2222-3333-444444444444",
    "qms_connection_id": "c0000000-1111-2222-3333-444444444444",
    "qms_entity_type": "document",
    "qassure_entity_type": "document",
    "mapping_direction": "BIDIRECTIONAL",
    "conflict_resolution_strategy": "MANUAL",
    "sync_enabled": true,
    "created_at": "2026-06-30T10:05:00.000Z"
  },
  "message": "Qmsentitymapping created successfully"
}
```

### 4.3 Log Sync Conflict (`POST /api/v1/qms/sync-conflicts`)
**Request Body**:
```json
{
  "tenant_id": "e0000000-1111-2222-3333-444444444444",
  "sync_job_id": "j0000000-1111-2222-3333-444444444444",
  "qms_connection_id": "c0000000-1111-2222-3333-444444444444",
  "entity_type": "document",
  "entity_id": "doc-999",
  "qms_record_id": "ext-doc-123",
  "conflict_type": "FIELD_MISMATCH",
  "conflict_field": "title",
  "qms_value": "Veeva Document Title v2",
  "qassure_value": "QAssure Document Title v1",
  "status": "PENDING",
  "retry_count": 0
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "cf000000-1111-2222-3333-444444444444",
    "conflict_type": "FIELD_MISMATCH",
    "status": "PENDING",
    "created_at": "2026-06-30T10:10:00.000Z"
  },
  "message": "Qmssyncconflict created successfully"
}
```
