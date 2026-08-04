# QAssure Project Service
## Codebase & API Reference

**Document ID:** QASSURE-PRJ-API-001  
**Base URL:** `/api/v1/projects`  
**Authentication:** All routes require `Authorization: Bearer <JWT>` or `X-API-Key: <key>`  

---

## 1. File Map

```
src/
├── routes/
│   └── project.routes.js          # Express router; 17 route definitions
├── controllers/
│   └── project.controller.js      # 17 async handlers; singleton export pattern
├── services/
│   └── project.service.js         # Business logic; 800 lines; singleton
└── migrations/
    └── phase23_project_service.sql # 5 tables + FK extensions to 5 domain tables
```

---

## 2. Middleware Chain

```javascript
router.use(authenticate);                    // All routes — JWT or API Key
authorize('projects:read')                   // GET endpoints
authorize('projects:create')                 // POST + PUT endpoints
authorize('projects:delete')                 // DELETE /:id (archive)
```

---

## 3. Complete API Reference

### 3.1 Project CRUD

---

#### `POST /projects`
Creates a new project with optional initial members, modules, and milestones.

**Permission:** `projects:create`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** | Project name |
| `code` | string | **Yes** | Short unique code per tenant (e.g., `CER-2026-001`) |
| `project_type` | string | **Yes** | See Project Types below |
| `description` | string | No | — |
| `status` | string | No | Default: `planning` |
| `priority` | string | No | Default: `medium` — `critical`, `high`, `medium`, `low` |
| `start_date` | date | No | ISO 8601 date |
| `target_end_date` | date | No | ISO 8601 date |
| `product_name` | string | No | Device/product name |
| `product_code` | string | No | Internal product reference |
| `device_class` | string | No | `Class I`, `Class II`, `Class III`, `IVD` |
| `regulatory_pathway` | string | No | `510k`, `PMA`, `De Novo`, `MDR`, `IVDR` |
| `submission_type` | string | No | `initial`, `amendment`, `renewal`, `response` |
| `regulatory_body` | string | No | `FDA`, `EU`, `Health Canada`, `TGA`, `PMDA` |
| `submission_number` | string | No | External submission tracking number |
| `owner_id` | UUID | No | Defaults to `createdBy` if omitted |
| `modules` | string[] | No | Module codes to enable (e.g., `["aice", "dhf"]`) |
| `milestones` | object[] | No | Initial milestone objects (see Milestone schema) |
| `settings` | object | No | JSONB project settings |
| `metadata` | object | No | Additional JSONB metadata |

**Project Types:**

| Code | Name |
|---|---|
| `cer_submission` | Clinical Evaluation Report |
| `dhf` | Design History File |
| `complaint_investigation` | Complaint Investigation |
| `supplier_qualification` | Supplier Qualification |
| `pms_report` | Post-Market Surveillance |
| `regulatory_submission` | General Regulatory Submission |
| `audit_preparation` | Audit Preparation |
| `custom` | Custom Project |

**Transaction Steps (atomic):**
1. INSERT project row
2. INSERT creator as `project_manager` member
3. INSERT each `modules[]` entry into `project_modules`
4. INSERT each `milestones[]` entry into `project_milestones`
5. INSERT activity log `created` entry

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My CER Project",
    "code": "CER-2026-001",
    "project_type": "cer_submission",
    "status": "planning",
    "priority": "medium",
    "start_date": "2026-07-01",
    "target_end_date": "2026-12-31",
    "product_name": "Device X",
    "device_class": "Class IIa",
    "regulatory_pathway": "MDR",
    "regulatory_body": "EU",
    "owner_id": "uuid",
    "owner_email": "pm@example.com",
    "owner_first_name": "Jane",
    "owner_last_name": "Smith",
    "created_by_email": "pm@example.com",
    "members": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "role": "project_manager",
        "permissions": ["read","write","delete","approve","manage_members"],
        "status": "active",
        "email": "pm@example.com",
        "first_name": "Jane",
        "last_name": "Smith"
      }
    ],
    "modules": ["aice", "dhf"],
    "milestones": [],
    "settings": {},
    "metadata": {},
    "created_at": "2026-06-29T...",
    "updated_at": "2026-06-29T..."
  }
}
```

**Error Responses:**

| Code | Error Code | Condition |
|---|---|---|
| 409 | `DUPLICATE_CODE` | `code` already exists in tenant |
| 500 | `CREATE_ERROR` | DB error |

---

#### `GET /projects`
Lists all projects with filtering, sorting, and pagination.

**Permission:** `projects:read`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter: `planning`, `active`, `on_hold`, `completed`, `cancelled`, `archived` |
| `project_type` | string | Filter by type code |
| `owner_id` | UUID | Filter by project owner |
| `search` | string | ILIKE on `name`, `code`, `description` |
| `my_projects` | boolean | If `true`, returns only projects where the current user is a member |
| `sort_by` | string | One of: `created_at`, `updated_at`, `name`, `start_date`, `target_end_date`, `status`, `priority` |
| `sort_order` | string | `ASC` or `DESC` (default: `DESC`) |
| `limit` | integer | Default: `50` |
| `offset` | integer | Default: `0` |

**Notes:**
- `my_projects=true` internally calls `getMyProjects(userId, tenantId)` which filters by `project_members.user_id = currentUser`
- Invalid `sort_by` values are silently defaulted to `created_at`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "My CER Project",
      "code": "CER-2026-001",
      "status": "active",
      "priority": "high",
      "project_type": "cer_submission",
      "owner_email": "pm@example.com",
      "member_count": "3",
      "completed_milestones": "2",
      "total_milestones": "5",
      ...
    }
  ],
  "pagination": { "total": 42, "limit": 50, "offset": 0 }
}
```

> **Note:** List response uses `DISTINCT` + subquery counts for `member_count`, `completed_milestones`, `total_milestones`. These are returned as strings (PostgreSQL COUNT) — parse with `parseInt()` on the client.

---

#### `GET /projects/:id`
Returns a single project with full hydrated relations (members, modules, milestones).

**Permission:** `projects:read`

**Path Parameters:** `id` — project UUID

**Response `200`:** Full project object (same as `POST /projects` response shape).

**Error:**
- `404` `NOT_FOUND` — project not found or belongs to another tenant

---

#### `PUT /projects/:id`
Updates project fields. Only `allowedFields` are accepted.

**Permission:** `projects:create`

**Allowed Update Fields:**
`name`, `description`, `status`, `priority`, `start_date`, `target_end_date`, `actual_end_date`, `product_name`, `product_code`, `device_class`, `regulatory_pathway`, `submission_type`, `regulatory_body`, `submission_number`, `settings`, `metadata`, `owner_id`

> ⚠️ `code`, `project_type`, `tenant_id` cannot be changed after creation.

**Transaction:** Fetches current state → applies diff → logs `updated` activity → returns hydrated `getById`.

**Response `200`:** Updated full project object.

**Errors:**
- `404` `NOT_FOUND` — project not found
- `500` `UPDATE_ERROR` — DB error

---

#### `DELETE /projects/:id`
Soft-archives a project by setting `status = 'archived'`.

**Permission:** `projects:delete`

**Path Parameters:** `id` — project UUID

> **This is not a hard delete.** The record stays in the database with `status = 'archived'`.

**Response `200`:**
```json
{ "success": true, "message": "Project archived successfully" }
```

**Error:**
- `404` `NOT_FOUND` — project not found

---

#### `GET /projects/:id/stats`
Returns aggregated statistics for a project.

**Permission:** `projects:read`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "members": 4,
    "milestones": {
      "total": "8",
      "completed": "3",
      "missed": "1",
      "overdue": "1"
    },
    "workflows": {
      "total": "5",
      "active": "2",
      "completed": "3"
    },
    "documents": 12
  }
}
```

**Stats source queries:**
- `members` — COUNT from `project_members WHERE status = 'active'`
- `milestones` — Filtered COUNT from `project_milestones`
- `workflows` — COUNT from `workflow_instances WHERE project_id = ?`
- `documents` — COUNT from `documents WHERE project_id = ?`

---

### 3.2 Project Members

---

#### `GET /projects/:id/members`
Returns all active members of a project with user details.

**Permission:** `projects:read`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "user_id": "uuid",
      "role": "contributor",
      "permissions": ["read", "write"],
      "status": "active",
      "joined_at": "2026-06-01T...",
      "email": "dev@example.com",
      "first_name": "John",
      "last_name": "Doe"
    }
  ]
}
```

---

#### `POST /projects/:id/members`
Adds a user to the project or updates their role if already a member (upsert).

**Permission:** `projects:create`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `user_id` | UUID | **Yes** | User to add |
| `role` | string | No | Default: `contributor` |
| `permissions` | string[] | No | Default: `["read", "write"]` |

**Business Logic:**
- Uses `ON CONFLICT (project_id, user_id) DO UPDATE` — safe re-add
- Sends `project_assigned` notification if `addedBy ≠ user_id`
- Logs `member_added` to `project_activity_log`

**Response `201`:** Raw `project_members` row.

---

#### `PUT /projects/:id/members/:memberId`
Updates a member's role and/or permissions.

**Permission:** `projects:create`

**Path Parameters:** `memberId` — `project_members.id` (not `user_id`)

**Request Body:**

| Field | Type | Description |
|---|---|---|
| `role` | string | New role (`project_manager`, `lead`, `contributor`, `reviewer`, `approver`, `viewer`) |
| `permissions` | string[] | New permissions array |

Uses `COALESCE` — unset fields are not changed.

**Error:** `404` `NOT_FOUND` if memberId not found in project

---

#### `DELETE /projects/:id/members/:memberId`
Soft-removes a member by setting `status = 'inactive'` and `left_at = NOW()`.

**Permission:** `projects:create`

**Response `200`:**
```json
{ "success": true, "message": "Member removed from project" }
```

---

### 3.3 Project Milestones

---

#### `GET /projects/:id/milestones`
Returns all milestones for a project, ordered by `sequence` then `planned_date`.

**Permission:** `projects:read`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "name": "Clinical Evaluation Plan Approved",
      "description": "CEP signed off by QA team",
      "milestone_type": "review",
      "planned_date": "2026-08-15",
      "actual_date": null,
      "status": "pending",
      "sequence": 1,
      "depends_on": null,
      "owner_id": "uuid",
      "owner_email": "qm@example.com",
      "owner_first_name": "Alice",
      "notes": null,
      "created_at": "2026-06-29T..."
    }
  ]
}
```

---

#### `POST /projects/:id/milestones`
Adds a milestone to an existing project.

**Permission:** `projects:create`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** | Milestone name |
| `planned_date` | date | **Yes** | Target date (ISO 8601) |
| `description` | string | No | — |
| `milestone_type` | string | No | Default: `deliverable` — `phase_gate`, `deliverable`, `review`, `submission`, `approval`, `custom` |
| `sequence` | integer | No | Default: `0` |
| `owner_id` | UUID | No | Responsible user |

**Response `201`:** Raw `project_milestones` row.

---

#### `PUT /projects/:id/milestones/:milestoneId`
Updates a milestone. Setting `status = 'completed'` automatically sets `completed_by = current user`.

**Permission:** `projects:create`

**Allowed Fields:** `name`, `description`, `milestone_type`, `planned_date`, `actual_date`, `status`, `sequence`, `owner_id`, `notes`

**Business Rules:**
- If `data.status === 'completed'` and `data.completed_by` not provided → `completed_by` is auto-set to `updatedBy`

**Error:** `404` `NOT_FOUND` if milestoneId not found in this project

---

### 3.4 Project Modules

---

#### `GET /projects/:id/modules`
Returns all enabled modules for a project.

**Permission:** `projects:read`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "module_code": "aice",
      "is_enabled": true,
      "config": {},
      "enabled_at": "2026-06-29T...",
      "disabled_at": null,
      "enabled_by": "uuid"
    }
  ]
}
```

---

#### `POST /projects/:id/modules/:moduleCode/enable`
Enables a module for a project (upsert).

**Permission:** `projects:create`

**Path Parameters:** `moduleCode` — e.g., `aice`, `dhf`, `sqm`, `aich`, `pms`

**Logic:** `ON CONFLICT (project_id, module_code) DO UPDATE SET is_enabled = true, ...`

**Response `200`:** Raw `project_modules` row.

---

#### `POST /projects/:id/modules/:moduleCode/disable`
Disables a module. Sets `is_enabled = false`, `disabled_at = NOW()`.

**Permission:** `projects:create`

**Response `200`:** Raw `project_modules` row with `is_enabled = false`.

---

### 3.5 Project Activity

---

#### `GET /projects/:id/activity`
Returns the project's chronological activity log.

**Permission:** `projects:read`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `activity_type` | string | Filter: `created`, `updated`, `member_added`, `member_removed`, etc. |
| `limit` | integer | Default: `50` |
| `offset` | integer | Default: `0` |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "project_id": "uuid",
      "activity_type": "member_added",
      "description": null,
      "entity_type": "member",
      "entity_id": "uuid",
      "old_value": null,
      "new_value": { "user_id": "...", "role": "contributor", ... },
      "performed_by": "uuid",
      "performed_at": "2026-06-29T...",
      "performed_by_email": "pm@example.com",
      "first_name": "Jane",
      "last_name": "Smith"
    }
  ]
}
```

---

## 4. Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

| HTTP | Code | Meaning |
|---|---|---|
| 401 | `MISSING_TOKEN` | No auth credentials |
| 403 | `FORBIDDEN` | Missing permission |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `DUPLICATE_CODE` | Project code already exists in tenant |
| 500 | `CREATE_ERROR` | Insert failed |
| 500 | `UPDATE_ERROR` | Update failed |
| 500 | `DELETE_ERROR` | Archive failed |
| 500 | `FETCH_ERROR` | Read failed |
| 500 | `ADD_MEMBER_ERROR` | Member insert failed |
| 500 | `UPDATE_MEMBER_ERROR` | Member update failed |
| 500 | `REMOVE_MEMBER_ERROR` | Member removal failed |
| 500 | `ADD_MILESTONE_ERROR` | Milestone insert failed |
| 500 | `UPDATE_MILESTONE_ERROR` | Milestone update failed |
| 500 | `ENABLE_MODULE_ERROR` | Module enable failed |
| 500 | `DISABLE_MODULE_ERROR` | Module disable failed |

---

## 5. Controller Export Pattern

The controller is exported as a bound-method map (not as the class itself):

```javascript
const projectController = new ProjectController();
module.exports = {
  create: projectController.create.bind(projectController),
  list: projectController.list.bind(projectController),
  // ...17 total methods
};
```

This ensures `this` context is preserved when Express calls the methods directly.
