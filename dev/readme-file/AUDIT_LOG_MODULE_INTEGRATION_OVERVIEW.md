# QAssure — Audit Log & Resource Management Overview

This document summarizes the enhancements made to the QAssure platform to enable external modules to manage their own resource types and push audit logs securely using API keys.

---

## 1. Resource Type Management

### Overview
Resource types define what entities can be audited (e.g., `document`, `capa`, or module-specific entities like `batch_record`).

### Key Features
*   **Initial Migration**: Standard platform resource types are pre-populated via database migrations.
*   **Super Admin Controls**: Super Admins can create new resource types via the **Create Audit Resource Type** interface.
*   **Categorization**:
    *   **PLATFORM**: Global resource types available to all (e.g., `user`, `role`).
    *   **MODULE**: Specific to a module (e.g., `abc_record`). Requires a `module_id`.
*   **Audit Toggle (`is_audit_enabled`)**: A checkbox that determines if the system should actually capture logs for this resource. If unchecked, logs for this type are ignored.
*   **Ownership Validation**: When a module attempts to log an event, the system verifies that the `resource_type` exists and, if it's a `MODULE` type, that it belongs to the calling module.

---

## 2. Audit Logs Enhancement

### Database Changes
*   **`module_id` Column**: Added to the `audit_logs` table to establish a permanent link between a log entry and its originating module.
*   **Metadata Search**: The system now supports searching across the `metadata` JSONB field, allowing modules to store and discover custom data within their audit logs.

### Automatic Data Capture
When a module calls the Audit API using an `X-API-KEY`:
1.  **Module Identity**: The `module_id` is automatically extracted from the API Key context and saved.
2.  **IP & User Agent**: The system automatically captures the `ip_address` and `user_agent` of the calling service.
3.  **Role Bypass**: Trusted modules are granted a "Platform Bypass" in the authorization layer, allowing them to push logs even if the user context (if present in combined mode) doesn't have explicit permissions.

---

## 3. API Updates

### Listing, Filtering & Global Search
The following endpoints now support both a `module_id` filter and a global `search` capability:
*   `GET /api/v1/audit-logs` (Admin/Super Admin)
*   `GET /api/v1/audit-logs/my-logs` (User/Tenant Admin)

**Filter Usage**: `?module_id=uuid-of-module`
**Search Usage**: `?search=keyword`
*   The `search` parameter performs a case-insensitive match across `action`, `resource_type`, `resource_id`, `ip_address`, and the stringified content of the `metadata` JSONB field.
*   This enables powerful discovery (e.g., searching for a specific value inside a module's custom metadata blob).

### Creation API
*   **Endpoint**: `POST /api/v1/audit-logs`
*   **Authentication**: Supports `Authorization: Bearer <token>` and/or `X-API-KEY: <key>`.
*   **Payload Example**:
    ```json
    {
      "action": "CREATE",
      "resource_type": "your_module_resource",
      "resource_id": "entity-123",
      "description": "Created a new record in Module X"
    }
    ```

---

## 4. Integration Guide for Modules

1.  **Register Resource Type**: Ask the Super Admin to create your resource type and assign it to your `module_id`.
2.  **Get API Key**: Obtain your module's `X-API-KEY` from the Module Management screen.
3.  **Push Logs**: Send a `POST` request to the platform's audit endpoint. The platform handles the `tenant_id`, `module_id`, and `ip_address` automatically.

---
*Created: April 2026 | QAssure Platform Engineering*
