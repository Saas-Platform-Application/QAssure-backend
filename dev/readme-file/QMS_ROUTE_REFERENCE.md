# QMS Integration API Reference

The `/qms` route (registered as `/api/v1/qms`) acts as a middleware bridge, enabling synchronization between the QAssure platform and external enterprise Quality Management Systems (e.g., Veeva, SAP, MasterControl).

## Base URL
`{{API_BASE_URL}}/api/v1/qms`

---

## 1. Connector Discovery

### List Supported Systems
`GET /supported`
- **Permissions**: `qms:read`
- **Description**: Returns a list of all external platforms that QAssure has built-in connectors for.

### Get System Details
`GET /supported/:systemName`
- **Permissions**: `qms:read`
- **Description**: Returns the specific schema and authentication requirements for a chosen system (e.g., API version, endpoint requirements).

---

## 2. Connection Management

### Test Connection
`POST /connections/:id/test`
- **Permissions**: `qms:update`
- **Action**: Verifies if the credentials provided (OAuth/API Keys) for a specific connection ID are still valid and the external system is reachable.

### Get Entity Fields
`GET /connections/:id/fields/:entityType`
- **Permissions**: `qms:read`
- **Use Case**: Fetches the field list (e.g., "OwnerID", "Doc_Status") directly from the external system to help with mapping.

---

## 3. Data Mapping & Configuration

### Get Field Mappings
`GET /connections/:id/mappings`
- **Description**: Shows how external fields are translated into QAssure fields.

### Update Mappings
`PUT /connections/:id/mappings/:entityType`
- **Permissions**: `qms:update`
- **Description**: Configures which external data column matches which internal QAssure field.

---

## 4. Synchronization Engine

### Trigger Manual Sync
`POST /connections/:id/sync`
- **Permissions**: `qms:create`
- **Action**: Manually triggers a data pull or push.

### Get Sync Status & History
- `GET /connections/:id/sync/status`: Real-time progress of a running job.
- `GET /connections/:id/sync/history`: Historical log of all past sync attempts.
- `GET /connections/:id/sync/errors`: List of records that failed to sync due to validation errors.

---

## 5. Conflict Resolution

### Resolve Sync Conflict
`POST /conflicts/:conflictId/resolve`
- **Permissions**: `qms:update`
- **Action**: When data in both systems has changed simultaneously, this allows a user to choose which system's data is the "source of truth."

---

## 6. Business Use Case
- **Hybrid Environments**: Use this API when your organization uses a legacy ERP system but wants QAssure to handle the modern quality workflows.
- **Audit Trails**: Syncing ensures that your compliance logs remain consistent across all corporate platforms.
