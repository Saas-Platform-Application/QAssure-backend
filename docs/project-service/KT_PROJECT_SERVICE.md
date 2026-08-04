# QAssure Project Service
## KT (Knowledge Transfer) Guide

**Document ID:** QASSURE-PRJ-KT-001  
**Audience:** New Backend Developers, Onboarding Engineers  
**Last Updated:** 2026-06-29  

---

## Welcome

This guide is your fast-track to understanding the **Project Service** in the QAssure backend. After reading this you should be able to:

- Confidently trace any API call from route → controller → service → DB
- Understand the transaction patterns and activity logging
- Know how projects link to other domain tables
- Make safe changes without breaking tenant isolation or audit trails

---

## 1. Component Map

```
src/routes/project.routes.js          ← HTTP entry point; auth middleware
src/controllers/project.controller.js ← HTTP layer; 17 bound methods
src/services/project.service.js       ← Business logic; 800 lines; direct SQL
src/migrations/phase23_project_service.sql  ← 5 new tables + FK extensions
```

---

## 2. Request Lifecycle — Trace Example

**Scenario:** A PM creates a new CER project.

```
POST /api/v1/projects
Authorization: Bearer <jwt>
Body: { name: "CER-2026", code: "CER-2026-001", project_type: "cer_submission", modules: ["aice"] }

Step 1: auth.middleware → authenticate()
  → Verifies JWT; validates Redis session
  → req.user = { id, email, tenantId, permissions }

Step 2: project.routes.js
  → router.post('/', authorize('projects:create'), controller.create)
  → authorize() checks 'projects:create' permission

Step 3: project.controller.js → create(req, res)
  → tenantId = req.user.tenantId
  → createdBy = req.user.id
  → service.create(tenantId, req.body, createdBy)

Step 4: project.service.js → create()
  → BEGIN transaction
  → INSERT INTO projects (20 fields) → project row
  → INSERT INTO project_members (creator as 'project_manager')
  → INSERT INTO project_modules ('aice')
  → INSERT INTO project_activity_log (type: 'created')
  → COMMIT
  → setImmediate → audit.log(CREATE)
  → return getById(project.id, tenantId)   ← 4 separate SELECT queries

Step 5: controller → 201 response
  { success: true, data: <full hydrated project> }
```

---

## 3. System Interaction Diagrams

### 3.1 Project Creation Flow

```mermaid
sequenceDiagram
    autonumber
    actor PM as Project Manager
    participant Auth as auth.middleware
    participant Ctrl as project.controller
    participant Svc as project.service
    database DB as PostgreSQL

    PM->>Auth: POST /projects (JWT + body)
    Auth->>Ctrl: req.user set
    Ctrl->>Svc: create(tenantId, body, createdBy)
    Svc->>DB: BEGIN
    Svc->>DB: INSERT INTO projects
    Svc->>DB: INSERT project_members (creator = project_manager)
    Svc->>DB: INSERT project_modules (if modules provided)
    Svc->>DB: INSERT project_milestones (if milestones provided)
    Svc->>DB: INSERT project_activity_log (created)
    Svc->>DB: COMMIT
    Svc->>Svc: setImmediate → audit.log(CREATE)
    Svc->>DB: SELECT (getById — 4 queries)
    Svc-->>Ctrl: Full hydrated project
    Ctrl-->>PM: 201 { success: true, data: project }
```

---

### 3.2 Add Member Flow (with Notification)

```mermaid
sequenceDiagram
    autonumber
    actor Mgr as Project Manager
    actor Dev as New Member
    participant Svc as project.service
    participant Notif as notification.service
    database DB as PostgreSQL

    Mgr->>Svc: addMember(projectId, tenantId, { user_id, role }, addedBy)
    Svc->>DB: BEGIN
    Svc->>DB: INSERT INTO project_members ON CONFLICT DO UPDATE
    Svc->>DB: INSERT project_activity_log (member_added)
    Svc->>DB: COMMIT
    Svc->>Svc: setImmediate → audit.log(CREATE)
    Svc->>Notif: setImmediate → project_assigned notification to Dev
    Svc-->>Mgr: project_members row
```

---

### 3.3 getById — 4 Query Hydration

```mermaid
sequenceDiagram
    participant Svc as project.service.getById
    database DB as PostgreSQL

    Svc->>DB: SELECT projects JOIN users (owner + creator emails)
    DB-->>Svc: project row
    Svc->>DB: SELECT project_members JOIN users (active only)
    DB-->>Svc: members array
    Svc->>DB: SELECT project_modules WHERE is_enabled = true
    DB-->>Svc: modules array
    Svc->>DB: SELECT project_milestones JOIN users (ordered by sequence)
    DB-->>Svc: milestones array
    Svc-->>Ctrl: { ...project, members, modules: [codes], milestones }
```

---

## 4. Key Implementation Details

### 4.1 Singleton Pattern
Always use the factory:
```javascript
// ✅ Correct
const { getProjectService } = require('../services/project.service');
const service = getProjectService();

// ❌ Wrong — bypasses singleton
const { ProjectService } = require('../services/project.service');
const service = new ProjectService();
```

### 4.2 Transaction Pattern with Activity Log
```javascript
const client = await this.pool.connect();
try {
  await client.query('BEGIN');
  // ... mutations
  await this._logActivity(client, tenantId, projectId, 'updated', ...);
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release(); // Always release!
}
```
> ⚠️ `_logActivity` uses the **same client** — it's part of the transaction. If anything fails, the log rolls back too.

### 4.3 Dynamic Update Builder
`update()` and `updateMilestone()` use progressive field building:
```javascript
const allowedFields = ['name', 'description', 'status', ...];
const updateFields = [];
const updateValues = [];
let paramIndex = 1;

for (const field of allowedFields) {
  if (data[field] !== undefined) {
    updateFields.push(`${field} = $${paramIndex}`);
    updateValues.push(data[field]);
    paramIndex++;
  }
}
// Then: WHERE id = $N AND tenant_id = $N+1
updateValues.push(id, tenantId);
```

### 4.4 JSONB Serialization
`settings` and `metadata` must be explicitly serialized:
```javascript
JSON.stringify(data.settings || {})  // NOT just data.settings
```

### 4.5 Upsert Semantics
Both `addMember` and `enableModule` use `ON CONFLICT DO UPDATE` — safe to call multiple times:
```sql
-- Members
ON CONFLICT (project_id, user_id) DO UPDATE SET role = $4, ...

-- Modules
ON CONFLICT (project_id, module_code) DO UPDATE SET is_enabled = true, ...
```

### 4.6 getById Always Called After Mutations
All write operations return `this.getById(id, tenantId)` for consistency — client always gets the full hydrated object.

---

## 5. Developer Cheat Sheet: Common Tasks

### A. Add a New Project Type

1. Open `phase23_project_service.sql` — the types are stored in `system_settings` as JSONB.
2. Add a new entry to the `project_types` JSON array in the migration (or via a new migration):
   ```json
   { "code": "mdr_tech_file", "name": "MDR Technical File", "description": "...", "modules": ["dhf"] }
   ```
3. Update `FUNCTIONAL_DOCUMENTATION.md` with the new type.
4. No code change needed — `project_type` is stored as a free-form VARCHAR.

---

### B. Add a New Updatable Field to a Project

1. Open `project.service.js` → `update()`.
2. Add the field to `allowedFields`:
   ```javascript
   const allowedFields = ['name', 'description', ..., 'your_new_field'];
   ```
3. If it's JSONB (like `settings`/`metadata`), add the serialization check:
   ```javascript
   updateValues.push(field === 'your_new_field' ? JSON.stringify(data[field]) : data[field]);
   ```
4. Ensure the column exists in the DB (add a migration if not).

---

### C. Add a New Activity Type

1. In `project.service.js`, call `_logActivity` with the new type string:
   ```javascript
   await this._logActivity(client, tenantId, projectId, 'milestone_completed', 'milestone', milestoneId, oldRow, newRow, userId);
   ```
2. Update the `activity_type` column comment in the DB schema for documentation.
3. No schema change needed — `activity_type` is a free-form VARCHAR.

---

### D. Add a New Filterable Field to `list()`

1. Open `project.service.js` → `list()`.
2. Destructure the new field from `options`:
   ```javascript
   const { status, project_type, owner_id, search, member_user_id, regulatory_body, ... } = options;
   ```
3. Add the condition:
   ```javascript
   if (regulatory_body) {
     conditions.push(`p.regulatory_body = $${paramIndex}`);
     params.push(regulatory_body);
     paramIndex++;
   }
   ```
4. Expose it in the controller:
   ```javascript
   const { ..., regulatory_body } = req.query;
   result = await service.list(tenantId, { ..., regulatory_body });
   ```

---

### E. Add a New Notification for Project Events

1. In `project.service.js`, add a `setImmediate` notification block:
   ```javascript
   setImmediate(async () => {
     try {
       await getNotificationService().sendFromTemplate(
         tenantId, recipientId, 'project_milestone_missed',
         { project_name: project.name, milestone_name: milestone.name },
         { entityType: 'project', entityId: projectId, entityName: project.name,
           actionUrl: `/projects/${projectId}`, createdBy: userId }
       );
     } catch(e) { console.warn('[ProjectService] Notification failed:', e.message); }
   });
   ```
2. Seed the `project_milestone_missed` template code in `notification_categories`.

---

## 6. Permission Quick Reference

| Route | Permission |
|---|---|
| `GET /projects` | `projects:read` |
| `GET /projects?my_projects=true` | `projects:read` |
| `GET /projects/:id` | `projects:read` |
| `GET /projects/:id/stats` | `projects:read` |
| `GET /projects/:id/members` | `projects:read` |
| `GET /projects/:id/milestones` | `projects:read` |
| `GET /projects/:id/modules` | `projects:read` |
| `GET /projects/:id/activity` | `projects:read` |
| `POST /projects` | `projects:create` |
| `PUT /projects/:id` | `projects:create` |
| `POST /projects/:id/members` | `projects:create` |
| `PUT /projects/:id/members/:memberId` | `projects:create` |
| `DELETE /projects/:id/members/:memberId` | `projects:create` |
| `POST /projects/:id/milestones` | `projects:create` |
| `PUT /projects/:id/milestones/:milestoneId` | `projects:create` |
| `POST /projects/:id/modules/:code/enable` | `projects:create` |
| `POST /projects/:id/modules/:code/disable` | `projects:create` |
| `DELETE /projects/:id` | `projects:delete` |

---

## 7. Gotchas & Known Pitfalls

| Pitfall | Problem | Fix |
|---|---|---|
| Forgetting `client.release()` | Pool connection leak | Always use `try/catch/finally` |
| Using `new ProjectService()` | Multiple pool instances | Always use `getProjectService()` |
| Not serializing JSONB fields | `[object Object]` stored in DB | Always `JSON.stringify(data.settings)` |
| Passing `code` in update body | Silently ignored (not in allowedFields) | `code` is immutable by design |
| Calling `getById` after failed transaction | Returns stale data | Only called after COMMIT |
| Adding a filter without incrementing `paramIndex` | SQL parameter binding error | Increment consistently |
| `DELETE /projects/:id` is NOT a hard delete | Data remains in DB | Use `status = 'archived'` filter to hide |

---

## 8. Useful Debug Queries

```sql
-- All projects for a tenant
SELECT id, code, name, status, project_type, owner_id
FROM projects
WHERE tenant_id = '<tenant-uuid>'
ORDER BY created_at DESC;

-- Active members for a project
SELECT pm.role, pm.permissions, u.email, u.first_name
FROM project_members pm
JOIN users u ON pm.user_id = u.id
WHERE pm.project_id = '<project-uuid>'
  AND pm.status = 'active';

-- Overdue milestones
SELECT m.name, m.planned_date, m.status
FROM project_milestones m
WHERE m.project_id = '<project-uuid>'
  AND m.status = 'pending'
  AND m.planned_date < CURRENT_DATE;

-- Enabled modules for a project
SELECT module_code, enabled_at
FROM project_modules
WHERE project_id = '<project-uuid>'
  AND is_enabled = true;

-- Recent project activity
SELECT activity_type, entity_type, performed_at, performed_by
FROM project_activity_log
WHERE project_id = '<project-uuid>'
ORDER BY performed_at DESC
LIMIT 20;

-- Projects where a user is a member
SELECT p.code, p.name, pm.role
FROM projects p
JOIN project_members pm ON p.id = pm.project_id
WHERE pm.user_id = '<user-uuid>'
  AND pm.status = 'active';
```

---

## 9. Related Services

| Service | How It Connects |
|---|---|
| `document.service` | Documents optionally scoped to a project via `project_id` |
| `workflow-engine.service` | Workflows optionally scoped to a project via `project_id` |
| `capa.service` | CAPAs optionally scoped to a project via `project_id` |
| `training.service` | Training assignments optionally scoped to a project |
| `supplier.service` | Suppliers optionally scoped to a project |
| `audit.service` | All mutations generate audit events |
| `notification.service` | `project_assigned` sent when members are added |
