# Audit Log Service - Codebase & API Documentation

---

## 1. Codebase Layout & File Mapping

*   **Routes**: 
    *   `src/routes/audit_log_routes.js`: Maps routes for listing, creating, deleting, exporting, and retrieving audit stats.
    *   `src/routes/audit_log_resource_type_routes.js`: Maps routes for managing tracked resource types and populating UI dropdown selectors.
*   **Controllers**:
    *   `src/controllers/audit_log_controller.js`: Unpacks audit log request parameters, applies tenancy rules, and calls the service layer.
    *   `src/controllers/audit_log_resource_type_controller.js`: Exposes REST endpoints to query and manage tracked resource types.
*   **Service Layers**:
    *   `src/services/audit.service.js`: Singleton service providing low-level database insertions, sanitization, and manual/middleware logging interfaces.
    *   `src/services/audit_log_service.js`: CRUD manager layer containing business validators (e.g. 7-year retention).
    *   `src/services/audit_log_resource_type_service.js`: Dynamic filter dropdown resolution and resource type management.
*   **Validation**: `src/validation/audit_log.schema.js`
    *   Zod input validation rules.
*   **Middleware**: `src/middleware/audit.middleware.js`
    *   Generic HTTP request/response interception for platform-wide auditing.

---

## 2. API Endpoint Reference

### 2.1 Audit Logs (`/api/v1/audit-logs`)

#### 2.1.1 Get All Audit Logs
*   **Endpoint**: `GET /api/v1/audit-logs`
*   **Access**: Requires `audit_logs:read` permission.
*   **Query Parameters**:
    *   `page` (Optional, Default: 1): Current page index.
    *   `limit` (Optional, Default: 100): Page size.
    *   `search` (Optional): Query matching `action`, `resource_type`, `resource_id`, `ip_address`, or `metadata`.
    *   `method` (Optional): Filter by HTTP request method (e.g. `'POST'`).
    *   `action` (Optional): Filter by action (e.g. `'LOGIN'`).
    *   `resource_type` (Optional): Filter by resource classification.
    *   `startDate` / `endDate` (Optional): ISO strings filtering the time range.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        {
          "id": "2e887625-118f-468e-8133-3b1bc47f911c",
          "action": "CREATE",
          "resource_type": "Module",
          "user_id": "3a163c94-c4d5-4c9f-b58b-45b8f8d6b0b8",
          "tenant_id": "f2e03ddb-e16d-44cd-b4d0-040b1569bce9",
          "response_status": 201,
          "ip_address": "127.0.0.1",
          "created_at": "2026-06-22T04:53:35.964Z",
          "user": {
            "email": "user@company.com",
            "first_name": "John",
            "last_name": "Doe"
          }
        }
      ],
      "pagination": {
        "page": 1,
        "limit": 100,
        "total": 1,
        "totalPages": 1,
        "hasMore": false
      }
    }
    ```

#### 2.1.2 Get My Logs
*   **Endpoint**: `GET /api/v1/audit-logs/my-logs`
*   **Access**: Authenticated users (returns owned logs only).
*   **Query Parameters**:
    *   `page`, `limit`, `search` (Optional).
*   **Response (200 OK)**: Returns paginated user-specific audit entries.

#### 2.1.3 Get Audit Log by ID
*   **Endpoint**: `GET /api/v1/audit-logs/:id`
*   **Access**: Requires `audit_logs:read` permission.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "id": "2e887625-118f-468e-8133-3b1bc47f911c",
        "action": "CREATE",
        "resource_type": "Module",
        "request_body": { "name": "New Module" },
        "user": {
          "email": "user@company.com"
        }
      }
    }
    ```

#### 2.1.4 Get Audit Statistics
*   **Endpoint**: `GET /api/v1/audit-logs/stats`
*   **Access**: Requires `audit_logs:read` permission.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "total": 150,
        "by_action": {
          "CREATE": 45,
          "LOGIN": 90,
          "UPDATE": 15
        },
        "by_day": {
          "2026-06-22": 150
        }
      }
    }
    ```

#### 2.1.5 Export Audit Logs
*   **Endpoint**: `GET /api/v1/audit-logs/export`
*   **Access**: Requires `audit_logs:read` permission.
*   **Query Parameters**:
    *   `format` (Optional): `'json'` or other export options.
    *   `startDate` / `endDate` (Optional).
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": {
        "format": "json",
        "total": 500,
        "records": [...]
      }
    }
    ```

#### 2.1.6 Create Audit Log
*   **Endpoint**: `POST /api/v1/audit-logs`
*   **Access**: Requires `audit_logs:create` permission.
*   **Request Body**:
    ```json
    {
      "action": "CREATE",
      "resource_type": "Module",
      "resource_id": "8601d785-6bfd-4a59-8977-da68e3ea9b7c",
      "correlation_id": "c1a2b3d4-e5f6-7a8b-9c0d",
      "metadata": { "detail": "Superadmin manual insert" }
    }
    ```

#### 2.1.7 Delete Audit Log
*   **Endpoint**: `DELETE /api/v1/audit-logs/:id`
*   **Access**: Requires `audit_logs:delete` permission.
*   **Validation Rules**: System will reject deletions if `created_at` timestamp is within the last 7 years.

---

### 2.2 Audit Resource Types (`/api/v1/audit-resource-types`)

#### 2.2.1 Get Dropdown Options
*   **Endpoint**: `GET /api/v1/audit-resource-types/dropdown`
*   **Access**: Authenticated users.
*   **Query Parameters**:
    *   `tenant_id` (Optional): Used by super-admins to retrieve module filters.
*   **Response (200 OK)**:
    ```json
    {
      "success": true,
      "data": [
        { "value": "ApiKey", "label": "ApiKey" },
        { "value": "Module", "label": "Module" },
        { "value": "User", "label": "User" }
      ]
    }
    ```
