# Notification Service Design Document

## 1. Architectural Vision

The QAssure Notification Service is designed as a centralized, decoupleable system to manage alerts, real-time events, and email messages for all tenants and modules on the QAssure platform. By centralizing template overrides, preferences, and notifications, the platform guarantees:
- **Tenant Isolation**: Custom notification templates and tenant boundaries.
- **Preference Controls**: User-level timezone-aware quiet hours and channel configurations.
- **Real-time Delivery**: Immediate delivery via WebSocket (Socket.io) to online users, with persistent fallback to the database.
- **Decoupled Calling**: External services interact with the notification engine asynchronously (via `setImmediate` or task queues) without blocking parent workflows.

---

## 2. Core Components

```
+-------------------------------------------------------------+
|                     External Callers                        |
|   (Workflow, Document, CAPA, Training, AI Gateway, etc.)   |
+-------------------------------------------------------------+
                              |
                              v
                [ getNotificationService() ]
                              |
                              v
            +-----------------------------------+
            |        NotificationService        |
            +-----------------------------------+
             /        |               |        \
            v         v               v         v
      +-----------+ +------------+ +---------+ +------------+
      | Template  | | Preference | | In-App  | |   Email    |
      | Resolver  | | Evaluator  | | Engine  | | Dispatch |
      +-----------+ +------------+ +---------+ +------------+
            |             |            |              |
            |             |            v              v
            |             |      +-----------+ +------------+
            |             |      | Socket.io | |  SMTP /    |
            |             |      | Broadcast | | SendGrid   |
            |             |      +-----------+ +------------+
            v             v            v
      +--------------------------------------+
      |             PostgreSQL               |
      +--------------------------------------+
```

### 2.1 Router & Controller Layer
- **`notification.routes.js`**: Enforces user authentication and attaches the `tenantContext` middleware.
- **`notification.controller.js`**: Handles incoming HTTP requests for fetching read/unread notifications, managing preferences, and templates.
- **`notification_category.controller.js`**: Manages master entries for categories and individual event codes.

### 2.2 Service Layer
- **`NotificationService`**: Orchestrates the delivery pipeline, compiles mustache-formatted templates, matches user preferences, and runs quiet-hour validation.
- **`NotificationCategoryService`**: Manages event categories and codes, and coordinates sync between licensed tenant modules and user preference objects.

### 2.3 Infrastructure Layer
- **`SocketService`**: Houses the Socket.io server integration. Manages active client socket sockets, registers users in tenant and user-specific rooms, and pushes updates asynchronously.

---

## 3. Data Flows

### 3.1 Template Resolution Flow
1. An event is triggered with a `template_code` (e.g. `'capa_assigned'`).
2. The service queries for a tenant-specific custom template (`tenant_id = targetTenantId`).
3. If no override template is found, the query falls back to the system-level global default (`tenant_id IS NULL`).
4. If neither is found, the system registers a critical fallback alert notifying Super Admins about the missing template code config.

### 3.2 Delivery Pipeline & Preference Check
1. The service checks the target user's preference record:
   - If the user is inactive, delivery is aborted.
   - If quiet hours are active, email dispatch is delayed, but in-app notifications are still saved and pushed.
   - If category-specific flags (e.g., `email: false`) are toggled off, that channel is bypassed.
2. If allowed, the notification is committed to the database and pushed via WebSocket.
3. If email delivery is active, the email service transmits the compiled template markup.

---

## 4. Master Table Management

Master configuration consists of:
- **`notification_categories`**: Global functional categories (e.g. `capa`, `document`).
- **`notification_codes`**: Event-level metadata declaring the trigger codes and their required variable lists.
- **Seeding & Syncing**: When new user permissions are modified, the system queries the active category pool and inserts missing preference settings for the user, ensuring default-on delivery for all licensed categories.
