# QAssure Project Service
## Design Document

**Document ID:** QASSURE-PRJ-DES-001  
**Service:** Project Management Service  
**Phase:** Phase 23 — Platform Project Orchestration  
**Status:** Active  
**Version:** 1.0  
**Last Updated:** 2026-06-29  

---

## 1. Purpose & Scope

The **Project Service** is a platform-level container service that organizes regulatory work across all QAssure modules. A project is the top-level entity that groups:

- Team members (with roles and permissions)
- Milestones and key delivery dates
- Enabled QAssure modules (e.g., DHF, SQM, AICE)
- Related documents, workflows, CAPAs, and training assignments
- A chronological activity log

This service supports regulatory frameworks requiring structured project governance: **ISO 13485**, **FDA 21 CFR Part 820**, **EU MDR/IVDR**, and **ISO 9001**.

---

## 2. Architectural Overview

### 2.1 Layer Map

| Layer | File | Responsibility |
|---|---|---|
| **Route** | `src/routes/project.routes.js` | Express endpoints; `authenticate` + `authorize` guards |
| **Controller** | `src/controllers/project.controller.js` | HTTP parsing; error mapping; singleton export pattern |
| **Service** | `src/services/project.service.js` | Business logic; transactional DB writes; activity logging |
| **Database** | `phase23_project_service.sql` | 5 tables + FK extensions to 5 other domain tables |

### 2.2 Component Interaction

```
HTTP Request
    │
    ▼
[auth.middleware.js]     ← authenticate() — JWT / API Key
    │
    ▼
[project.routes.js]      ← authorize('projects:read' | 'projects:create' | 'projects:delete')
    │
    ▼
[project.controller.js]  ← parse params; call service; shape response
    │
    ▼
[project.service.js]     ← pool queries; transactions; activity log; audit; notifications
    │           │
    ▼           ▼
[PostgreSQL]  [audit.service / notification.service]
```

### 2.3 External Dependencies

| Service | Usage | Pattern |
|---|---|---|
| `audit.service` | CREATE/UPDATE/DELETE events | `setImmediate` (fire-and-forget) |
| `notification.service` | `project_assigned` on member add | `setImmediate` (fire-and-forget) |
| `workflow_instances` | Stats query for linked workflows | Read-only JOIN |
| `documents` | Stats query for linked documents | Read-only COUNT |

---

## 3. Database Design

### 3.1 Entity Relationship

```
tenants (1) ──────────────────────── (many) projects
projects (1) ─────────────────────── (many) project_members
projects (1) ─────────────────────── (many) project_milestones
projects (1) ─────────────────────── (many) project_modules
projects (1) ─────────────────────── (many) project_activity_log
projects (1) ─────────────────────── (many) workflow_instances  [via project_id FK added in Phase 23]
projects (1) ─────────────────────── (many) documents           [via project_id FK added in Phase 23]
projects (1) ─────────────────────── (many) capas               [via project_id FK added in Phase 23]
projects (1) ─────────────────────── (many) training_assignments [via project_id FK added in Phase 23]
projects (1) ─────────────────────── (many) suppliers           [via project_id FK added in Phase 23]
```

### 3.2 Table Definitions

#### `projects`
The primary container table. Every project is tenant-scoped.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID PK | NOT NULL | Auto-generated |
| `tenant_id` | UUID FK → tenants | NOT NULL | Tenant isolation |
| `name` | VARCHAR(255) | NOT NULL | Human-readable project name |
| `code` | VARCHAR(100) | NOT NULL | Short unique identifier per tenant |
| `description` | TEXT | NULL | — |
| `project_type` | VARCHAR(100) | NOT NULL | `cer_submission`, `dhf`, `complaint_investigation`, `supplier_qualification`, `pms_report`, `regulatory_submission`, `audit_preparation`, `custom` |
| `status` | VARCHAR(50) | Default: `planning` | `planning`, `active`, `on_hold`, `completed`, `cancelled`, `archived` |
| `priority` | VARCHAR(20) | Default: `medium` | `critical`, `high`, `medium`, `low` |
| `start_date` | DATE | NULL | Planned start |
| `target_end_date` | DATE | NULL | Planned completion |
| `actual_end_date` | DATE | NULL | Actual completion date |
| `product_name` | VARCHAR(255) | NULL | Product/device this project covers |
| `product_code` | VARCHAR(100) | NULL | Internal product code |
| `device_class` | VARCHAR(50) | NULL | `Class I`, `Class II`, `Class III`, `IVD` |
| `regulatory_pathway` | VARCHAR(100) | NULL | `510k`, `PMA`, `De Novo`, `MDR`, `IVDR` |
| `submission_type` | VARCHAR(100) | NULL | `initial`, `amendment`, `renewal`, `response` |
| `regulatory_body` | VARCHAR(100) | NULL | `FDA`, `EU`, `Health Canada`, `TGA`, `PMDA` |
| `submission_number` | VARCHAR(100) | NULL | External tracking number |
| `settings` | JSONB | Default: `{}` | Project-level configuration |
| `metadata` | JSONB | Default: `{}` | Additional context |
| `owner_id` | UUID FK → users | NULL | Project owner |
| `created_by`, `updated_by` | UUID FK → users | NULL | Audit trail |

**Unique constraint:** `unique_project_code_per_tenant (tenant_id, code)`  
**Indexes:** `tenant_id`, `(tenant_id, status)`, `(tenant_id, project_type)`, `owner_id`, `(tenant_id, start_date, target_end_date)`

---

#### `project_members`
Tracks who belongs to each project with their role and fine-grained permissions.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK | — |
| `project_id` | UUID FK → projects | ON DELETE CASCADE |
| `user_id` | UUID FK → users | — |
| `role` | VARCHAR(100) | `project_manager`, `lead`, `contributor`, `reviewer`, `approver`, `viewer` |
| `permissions` | JSONB | Array: `["read", "write", "delete", "approve", "manage_members"]` |
| `status` | VARCHAR(50) | `active`, `inactive`, `pending_invitation` |
| `joined_at` | TIMESTAMPTZ | — |
| `left_at` | TIMESTAMPTZ | Set on removal |
| `invited_by` | UUID FK | — |
| `invited_at` | TIMESTAMPTZ | — |

**Unique:** `unique_project_member (project_id, user_id)` — upsert via `ON CONFLICT`  
**Indexes:** `project_id`, `user_id`, `tenant_id`, `(project_id, role)`

---

#### `project_milestones`
Key dates and deliverables within a project.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | — |
| `tenant_id`, `project_id` | UUID FKs | — |
| `name` | VARCHAR(255) | NOT NULL |
| `description` | TEXT | — |
| `milestone_type` | VARCHAR(100) | `phase_gate`, `deliverable`, `review`, `submission`, `approval`, `custom` |
| `planned_date` | DATE | NOT NULL |
| `actual_date` | DATE | Set when completed |
| `status` | VARCHAR(50) | `pending`, `in_progress`, `completed`, `missed`, `cancelled` |
| `sequence` | INTEGER | Display order |
| `depends_on` | UUID FK → project_milestones | Self-referential dependency |
| `owner_id` | UUID FK → users | Responsible person |
| `completed_by` | UUID FK → users | Auto-set when `status = completed` |
| `notes` | TEXT | — |

**Indexes:** `project_id`, `tenant_id`, `(project_id, status)`, `(project_id, planned_date)`

---

#### `project_modules`
Which QAssure modules are active for a given project.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | — |
| `project_id` | UUID FK | ON DELETE CASCADE |
| `module_code` | VARCHAR(100) | e.g., `aice`, `dhf`, `sqm`, `aich`, `pms` |
| `is_enabled` | BOOLEAN | Default: TRUE |
| `config` | JSONB | Module-specific overrides |
| `enabled_at`, `disabled_at` | TIMESTAMPTZ | Lifecycle timestamps |
| `enabled_by` | UUID FK | — |

**Unique:** `unique_project_module (project_id, module_code)` — upsert via `ON CONFLICT`

---

#### `project_activity_log`
Chronological audit trail of all changes within a project.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | — |
| `project_id` | UUID FK | — |
| `activity_type` | VARCHAR(100) | `created`, `updated`, `member_added`, `member_removed`, `milestone_completed`, `status_changed` |
| `description` | TEXT | — |
| `entity_type` | VARCHAR(100) | `project`, `member`, `milestone`, `module`, `document`, `workflow` |
| `entity_id` | UUID | Affected entity |
| `old_value` | JSONB | Previous state |
| `new_value` | JSONB | New state |
| `performed_by` | UUID FK | — |
| `performed_at` | TIMESTAMPTZ | Auto |
| `metadata` | JSONB | Additional context |

**Indexes:** `project_id`, `tenant_id`, `(project_id, activity_type)`, `(project_id, performed_at DESC)`

---

## 4. Project Lifecycle

```
planning ──────────────────────────────────> active
    │                                           │
    │ (on_hold)                                 │ (on_hold)
    ▼                                           ▼
on_hold ◄──────────────────────────────── on_hold
    │                                           │
    ▼                                           ▼
cancelled                                  completed
                                               │
                                           archived  ← soft-delete via DELETE /projects/:id
```

**Delete = Soft Archive:** `DELETE /projects/:id` sets `status = 'archived'` — never hard-deletes.

---

## 5. Member Role Hierarchy

| Role | Default Permissions | Description |
|---|---|---|
| `project_manager` | `read, write, delete, approve, manage_members` | Full control; auto-assigned to creator |
| `lead` | `read, write, approve` | Technical lead |
| `contributor` | `read, write` | Default for added members |
| `reviewer` | `read, write` | Review-focused |
| `approver` | `read, approve` | Approval authority |
| `viewer` | `read` | Read-only access |

---

## 6. Create Project — Transaction Flow

```
BEGIN
  1. INSERT INTO projects (20 fields)
  2. INSERT INTO project_members (creator as 'project_manager')
  3. [if modules provided] INSERT INTO project_modules per module_code
  4. [if milestones provided] INSERT INTO project_milestones per milestone
  5. INSERT INTO project_activity_log (type: 'created')
COMMIT

setImmediate → audit.log(CREATE)
return getById(project.id, tenantId)  ← full hydrated response
```

---

## 7. `getById` — Hydrated Response

`getById()` executes **4 separate queries** and merges results:
1. `SELECT projects JOIN users` (owner + creator emails)
2. `SELECT project_members JOIN users` (active members only)
3. `SELECT project_modules WHERE is_enabled = true`
4. `SELECT project_milestones JOIN users` (ordered by sequence, planned_date)

---

## 8. Activity Logging (`_logActivity`)

All mutations call the internal `_logActivity(client, ...)` within the same transaction. This ensures activity log entries are atomic with the mutation — they roll back together on failure.

```javascript
await this._logActivity(
  client, tenantId, projectId,
  'member_added',    // activity_type
  'member',          // entity_type
  memberId,          // entity_id
  null,              // old_value
  memberRow,         // new_value
  addedBy            // performed_by
);
```

Activity types triggered automatically:
- `create` → `created`
- `update` → `updated`
- `addMember` → `member_added`
- `removeMember` → `member_removed`

---

## 9. Cross-Domain FK Extensions

Phase 23 adds `project_id` FK columns to 5 existing tables:

| Table | Column Added | Purpose |
|---|---|---|
| `workflow_instances` | `project_id` | Workflows scoped to a project |
| `documents` | `project_id` | Documents scoped to a project |
| `capas` | `project_id` | CAPAs scoped to a project |
| `training_assignments` | `project_id` | Training scoped to a project |
| `suppliers` | `project_id` | Supplier qualification scoped to a project |

These are **nullable FKs** — all existing records remain unaffected.

---

## 10. Permission Model

| Permission | Routes |
|---|---|
| `projects:read` | GET list, GET /:id, GET stats, GET members, GET milestones, GET modules, GET activity |
| `projects:create` | POST /, PUT /:id, POST members, PUT members/:id, DELETE members/:id, POST milestones, PUT milestones/:id, POST modules/enable, POST modules/disable |
| `projects:delete` | DELETE /:id (archive) |

---

## 11. Design Decisions

| Decision | Rationale |
|---|---|
| Direct `pg` pool (no ORM) | Complex dynamic WHERE building; join performance |
| Soft-delete (archive) | Compliance — projects must remain traceable |
| `_logActivity` in same transaction | Activity log atomicity; no orphan log entries |
| `ON CONFLICT` for members + modules | Safe upsert; re-adding a removed member updates instead of duplicating |
| Creator auto-added as `project_manager` | Ensures every project always has at least one manager |
| `getById` runs 4 queries | Clean separation; avoids mega-join; trades latency for readability |
| `settings` + `metadata` JSONB | Extensible without schema changes for project-type-specific fields |
