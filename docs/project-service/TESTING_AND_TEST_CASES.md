# QAssure Project Service
## Testing & Test Cases

**Document ID:** QASSURE-PRJ-TST-001  
**Last Updated:** 2026-06-29  

---

## 1. Coverage Map

| Endpoint / Method | Unit | Integration | Manual |
|---|---|---|---|
| `create` / `POST /projects` | ✅ | ✅ | ✅ |
| `list` / `GET /projects` | ✅ | ✅ | ✅ |
| `getById` / `GET /projects/:id` | ✅ | ✅ | ✅ |
| `update` / `PUT /projects/:id` | ✅ | ✅ | ✅ |
| `delete` / `DELETE /projects/:id` | ✅ | ✅ | ✅ |
| `getStats` / `GET /projects/:id/stats` | ✅ | ✅ | ✅ |
| `getMembers` / `GET /projects/:id/members` | ✅ | ✅ | ✅ |
| `addMember` / `POST /projects/:id/members` | ✅ | ✅ | ✅ |
| `updateMember` / `PUT /projects/:id/members/:id` | ✅ | ✅ | ✅ |
| `removeMember` / `DELETE /projects/:id/members/:id` | ✅ | ✅ | ✅ |
| `getMilestones` / `GET /projects/:id/milestones` | ✅ | ✅ | ✅ |
| `addMilestone` / `POST /projects/:id/milestones` | ✅ | ✅ | ✅ |
| `updateMilestone` / `PUT /projects/:id/milestones/:id` | ✅ | ✅ | ✅ |
| `getModules` / `GET /projects/:id/modules` | ✅ | ✅ | ✅ |
| `enableModule` / `POST /projects/:id/modules/:code/enable` | ✅ | ✅ | ✅ |
| `disableModule` / `POST /projects/:id/modules/:code/disable` | ✅ | ✅ | ✅ |
| `getActivity` / `GET /projects/:id/activity` | ✅ | ✅ | ✅ |

---

## 2. Project CRUD Test Cases

### TC-PRJ-001: Create Project — Minimal Valid
- **Input:** `{ name: "CER 2026", code: "CER-001", project_type: "cer_submission" }`
- **Expected:** `201`; `data.status = "planning"`; `data.priority = "medium"`; `data.members` has creator as `project_manager`

### TC-PRJ-002: Create Project — Full Fields
- **Input:** All fields including `modules: ["aice"]`, `milestones: [{name:"M1", planned_date:"2026-12"}]`
- **Expected:** `201`; `data.modules = ["aice"]`; `data.milestones` has 1 entry

### TC-PRJ-003: Create Project — Duplicate Code
- **Setup:** Create project with `code = "CER-001"`
- **Action:** Create another with same `code`
- **Expected:** `409`; `error.code = "DUPLICATE_CODE"`

### TC-PRJ-004: List Projects — All
- **Expected:** `200`; array of projects; `pagination.total` populated

### TC-PRJ-005: List Projects — Filter by Status
- **Input:** `GET /projects?status=active`
- **Expected:** All returned projects have `status = "active"`

### TC-PRJ-006: List Projects — Filter by Type
- **Input:** `GET /projects?project_type=dhf`
- **Expected:** Only `project_type = "dhf"` projects

### TC-PRJ-007: List Projects — Search
- **Input:** `GET /projects?search=CER`
- **Expected:** Projects matching `name ILIKE '%CER%'` OR `code ILIKE '%CER%'`

### TC-PRJ-008: List Projects — My Projects
- **Input:** `GET /projects?my_projects=true`
- **Expected:** Only projects where current user is an active member

### TC-PRJ-009: List Projects — Sort by Priority
- **Input:** `GET /projects?sort_by=priority&sort_order=ASC`
- **Expected:** Valid response (sorted by `priority ASC`)

### TC-PRJ-010: List Projects — Invalid sort_by (Injection Guard)
- **Input:** `GET /projects?sort_by='; DROP TABLE projects; --`
- **Expected:** `200`; defaults to `sort_by = created_at` (whitelist guard)

### TC-PRJ-011: Get Project by ID — Found
- **Expected:** `200`; includes `members`, `modules`, `milestones` arrays

### TC-PRJ-012: Get Project by ID — Not Found
- **Input:** Random UUID
- **Expected:** `404`; `error.code = "NOT_FOUND"`

### TC-PRJ-013: Update Project — Valid Fields
- **Input:** `{ name: "Updated Name", status: "active", priority: "high" }`
- **Expected:** `200`; returned project reflects changes

### TC-PRJ-014: Update Project — Restricted Fields Ignored
- **Input:** `{ code: "HACKED", project_type: "custom" }`
- **Expected:** `200`; `code` and `project_type` unchanged

### TC-PRJ-015: Update Project — Not Found
- **Expected:** `404`; `error.code = "NOT_FOUND"`

### TC-PRJ-016: Delete (Archive) Project
- **Expected:** `200`; `message = "Project archived successfully"`
- **Verify:** `GET /projects/:id` returns project with `status = "archived"`

### TC-PRJ-017: Delete Project — Not Found
- **Expected:** `404`; `error.code = "NOT_FOUND"`

---

## 3. Stats Test Cases

### TC-PRJ-020: Get Stats — Returns All Metrics
- **Expected:** `200`; has `members`, `milestones`, `workflows`, `documents` keys

### TC-PRJ-021: Get Stats — Member Count
- **Setup:** Project with 3 active members + 1 inactive
- **Expected:** `data.members = 3` (only active counted)

### TC-PRJ-022: Get Stats — Overdue Milestones
- **Setup:** Milestone with `planned_date = yesterday`, `status = "pending"`
- **Expected:** `data.milestones.overdue = "1"`

---

## 4. Member Test Cases

### TC-PRJ-030: Add Member — Default Role
- **Input:** `{ user_id: "..." }` (no role)
- **Expected:** `201`; `data.role = "contributor"`; `data.permissions = ["read","write"]`

### TC-PRJ-031: Add Member — Custom Role
- **Input:** `{ user_id: "...", role: "approver", permissions: ["read","approve"] }`
- **Expected:** `201`; correct role and permissions stored

### TC-PRJ-032: Add Member — Re-add Existing (Upsert)
- **Setup:** Member already exists with `role = "contributor"`
- **Input:** `{ user_id: "...", role: "lead" }`
- **Expected:** `201`; role updated to `lead`; no duplicate row

### TC-PRJ-033: Update Member Role
- **Input:** `PUT /members/:memberId { role: "reviewer" }`
- **Expected:** `200`; `data.role = "reviewer"`

### TC-PRJ-034: Update Member — Not Found
- **Input:** Random memberId
- **Expected:** `404`; `error.code = "NOT_FOUND"`

### TC-PRJ-035: Remove Member (Soft)
- **Expected:** `200`; `message = "Member removed from project"`
- **Verify:** `GET /members` no longer returns the user (status = inactive)

### TC-PRJ-036: Remove Member — Not Found
- **Expected:** `404`; `error.code = "NOT_FOUND"`

---

## 5. Milestone Test Cases

### TC-PRJ-040: Add Milestone — Minimal
- **Input:** `{ name: "Phase Gate 1", planned_date: "2026-09-01" }`
- **Expected:** `201`; `data.milestone_type = "deliverable"` (default); `data.status = "pending"`

### TC-PRJ-041: Add Milestone — Full Fields
- **Input:** `{ name: "Regulatory Submission", milestone_type: "submission", planned_date: "2026-12-01", sequence: 3, owner_id: "..." }`
- **Expected:** `201`; all fields stored

### TC-PRJ-042: Update Milestone — Status to Completed
- **Input:** `{ status: "completed", actual_date: "2026-09-01" }`
- **Expected:** `200`; `data.status = "completed"`; `data.completed_by = <requesting user>`

### TC-PRJ-043: Update Milestone — Not Found
- **Expected:** `404`; `error.code = "NOT_FOUND"`

---

## 6. Module Test Cases

### TC-PRJ-050: Enable Module
- **Input:** `POST /modules/aice/enable`
- **Expected:** `200`; `data.module_code = "aice"`; `data.is_enabled = true`

### TC-PRJ-051: Enable Module — Idempotent (Re-enable)
- **Setup:** Module already enabled
- **Input:** `POST /modules/aice/enable` again
- **Expected:** `200`; no duplicate; `is_enabled` remains `true`

### TC-PRJ-052: Disable Module
- **Input:** `POST /modules/aice/disable`
- **Expected:** `200`; `data.is_enabled = false`; `data.disabled_at` set

### TC-PRJ-053: Get Modules — Only Enabled Returned
- **Setup:** aice enabled, dhf disabled
- **Expected:** Only `aice` in response

---

## 7. Activity Log Test Cases

### TC-PRJ-060: Get Activity — Default (All Types)
- **Expected:** `200`; array with `performed_by_email`, `first_name`

### TC-PRJ-061: Get Activity — Filter by Type
- **Input:** `GET /activity?activity_type=member_added`
- **Expected:** Only entries with `activity_type = "member_added"`

### TC-PRJ-062: Activity Created on Project Creation
- **Setup:** Create a new project
- **Expected:** `GET /activity` includes entry with `activity_type = "created"`

### TC-PRJ-063: Activity Created on Member Add
- **Setup:** Add a member
- **Expected:** Activity log has `member_added` entry with `entity_type = "member"`

---

## 8. Auth & Permission Test Cases

### TC-PRJ-070: No Token
- **Expected:** `401`; `error.code = "MISSING_TOKEN"`

### TC-PRJ-071: Missing projects:create for POST
- **Setup:** User with only `projects:read`
- **Input:** `POST /projects`
- **Expected:** `403`; `error.code = "FORBIDDEN"`

### TC-PRJ-072: Missing projects:delete for DELETE
- **Setup:** User with `projects:create` but not `projects:delete`
- **Input:** `DELETE /projects/:id`
- **Expected:** `403`

### TC-PRJ-073: Cross-Tenant Isolation
- **Setup:** Project in Tenant A
- **Action:** Tenant B user requests `GET /projects/:id` (correct UUID, wrong tenant)
- **Expected:** `404` — tenant_id filter blocks access

---

## 9. Edge Cases

| Scenario | Expected |
|---|---|
| `update()` with empty body (no valid fields) | Returns current project unchanged (no DB write) |
| `delete` already-archived project | `404` (already archived → status update finds no `active` row) |
| `my_projects=true` with no memberships | `200`; empty `data: []` |
| `addMilestone` with `sequence` not provided | Defaults to `0`; no error |
| `enableModule` with unknown `module_code` | Stored as-is (no validation on module_code) |
| `updateMember` with no body | Both `role` and `permissions` use `COALESCE` — unchanged |
