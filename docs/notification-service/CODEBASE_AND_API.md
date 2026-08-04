# Notification Service Codebase & API Reference

## 1. Directory Structure

The Notification Service components are organized across the backend codebase as follows:

```
src/
├── routes/
│   └── notification.routes.js            # Express router mapping routes to controllers
├── controllers/
│   ├── notification.controller.js        # Express controller for user actions & templates
│   └── notification_category.controller.js # Express controller for categories & codes
├── services/
│   ├── notification.service.js           # Core notification delivery & templates business logic
│   └── notification_category.service.js  # Category & event code management, preference syncing
└── infrastructure/
    └── websocket/
        ├── index.js                      # Service instantiator exporter
        └── socket.service.js             # Socket.io server connection & emission wrappers
```

---

## 2. Database Schema Reference

### `notification_categories`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique category identifier |
| `name` | VARCHAR | Human-readable name (e.g. `'CAPA'`) |
| `code` | VARCHAR (UQ) | Unique shortcode identifier (e.g. `'capa'`) |
| `description`| TEXT | Description of category scope |
| `module_id` | UUID (FK) | Link to licensed system module |
| `is_active` | BOOLEAN | Activation status |

### `notification_codes`
| Column | Type | Description |
| :--- | :--- | :--- |
| `id` | UUID (PK) | Unique event identifier |
| `category_id`| UUID (FK) | Parent category association |
| `code` | VARCHAR (UQ) | Unique event code identifier (e.g. `'capa_overdue'`) |
| `name` | VARCHAR | Event code name |
| `description`| TEXT | Trigger reason explanation |
| `default_channels` | VARCHAR[] | Target channels list (default: `['in_app', 'email']`) |
| `default_priority` | VARCHAR | Default priority (default: `'normal'`) |
| `variables` | JSONB | List of accepted variables (e.g. `["capa_number"]`) |
| `is_active` | BOOLEAN | Activation status |

---

## 3. API Reference

All requests must be authenticated. Headers must contain a valid Bearer JWT token.

### 3.1 User Notifications & Preferences

#### Get My Notifications
- **Endpoint**: `GET /api/v1/notifications/me`
- **Query Params**:
  - `is_read` (boolean, optional) - Filter by read status.
  - `category` (string, optional) - Filter by category.
  - `limit` (int, default 50) - Result limit.
  - `offset` (int, default 0) - Pagination offset.
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": [
      {
        "id": "c162629b-bcfa-4a6c-9419-72c0c7a52e0a",
        "title": "New Task: Manager Review",
        "message": "A new workflow task is available: Manager Review",
        "is_read": false,
        "category": "workflow",
        "priority": "high",
        "action_url": "/workflows/tasks/123",
        "created_at": "2026-06-22T12:00:00Z"
      }
    ]
  }
  ```

#### Get Unread Count
- **Endpoint**: `GET /api/v1/notifications/me/unread-count`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "unread_count": 5
    }
  }
  ```

#### Mark Specific Notification as Read
- **Endpoint**: `PUT /api/v1/notifications/:id/read`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "c162629b-bcfa-4a6c-9419-72c0c7a52e0a",
      "is_read": true,
      "read_at": "2026-06-22T12:05:00Z"
    }
  }
  ```

#### Get Preferences
- **Endpoint**: `GET /api/v1/notifications/preferences`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "category_preferences": {
        "capa": { "in_app": true, "email": true },
        "document": { "in_app": true, "email": false }
      },
      "quiet_hours_enabled": true,
      "quiet_hours_start": "22:00:00",
      "quiet_hours_end": "06:00:00",
      "timezone": "America/New_York"
    }
  }
  ```

---

### 3.2 Templates & Custom Overrides

#### Upsert Tenant Override Template
- **Endpoint**: `PUT /api/v1/notifications/templates/:code/override`
- **Body**:
  ```json
  {
    "title_template": "Urgent CAPA Action Required: {{title}}",
    "message_template": "Please review the CAPA {{capa_number}} as soon as possible.",
    "email_subject_template": "[URGENT] QAssure CAPA Assigned - {{title}}",
    "email_body_template": "<html><body><p>You have been assigned a CAPA. Details below...</p></body></html>",
    "channels": ["in_app", "email"]
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "id": "22ab5919-f8fd-4dc1-a730-604b07e0b47c",
      "tenant_id": "8480a200-c983-49c2-b86b-aae64c2ca585",
      "code": "capa_assigned",
      "title_template": "Urgent CAPA Action Required: {{title}}",
      "is_active": true
    }
  }
  ```

#### Reset Tenant Template
- **Endpoint**: `DELETE /api/v1/notifications/templates/:code/reset`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Tenant template override removed. Reset to global default."
  }
  ```

---

### 3.3 System Utilities

#### Socket Connection Stats
- **Endpoint**: `GET /api/v1/notifications/socket/status`
- **Permission**: `notifications:read`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "data": {
      "totalConnections": 3,
      "onlineUsers": 2,
      "userIds": ["user-uuid-1", "user-uuid-2"]
    }
  }
  ```
