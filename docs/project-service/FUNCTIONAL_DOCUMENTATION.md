# QAssure Project Service
## Functional Documentation

**Document ID:** QASSURE-PRJ-FUN-001  
**Audience:** Product Managers, QA Engineers, Business Analysts  
**Last Updated:** 2026-06-29  

---

## 1. Overview

The **Project Service** provides a unified workspace for managing regulatory and quality projects across the QAssure platform. A project is a container that organizes:

- **People** — team members with roles and fine-grained permissions
- **Milestones** — planned dates and deliverables
- **Modules** — the QAssure capabilities active for that project
- **Activity** — a complete audit trail of all project changes

Common regulatory use cases include Clinical Evaluation Reports (CER), Design History Files (DHF), Complaint Investigations, Supplier Qualifications, and Post-Market Surveillance reports.

---

## 2. User Roles & Access

| Action | `projects:read` | `projects:create` | `projects:delete` |
|---|---|---|---|
| List all projects | ✅ | ✅ | ✅ |
| View project details | ✅ | ✅ | ✅ |
| View project stats | ✅ | ✅ | ✅ |
| View members | ✅ | ✅ | ✅ |
| View milestones | ✅ | ✅ | ✅ |
| View modules | ✅ | ✅ | ✅ |
| View activity log | ✅ | ✅ | ✅ |
| Create project | — | ✅ | ✅ |
| Update project | — | ✅ | ✅ |
| Add / update / remove members | — | ✅ | ✅ |
| Add / update milestones | — | ✅ | ✅ |
| Enable / disable modules | — | ✅ | ✅ |
| Archive (delete) project | — | — | ✅ |

---

## 3. Feature Walkthroughs

### 3.1 Creating a Project

**Who:** Project Manager / Regulatory Affairs Lead  
**When:** A new regulatory submission, audit, or product review is initiated.

**Steps:**
1. Choose a **project type** based on the regulatory activity:
   - `cer_submission` — Clinical Evaluation Report / Performance Evaluation Report
   - `dhf` — Design History File compilation
   - `complaint_investigation` — Post-market complaint handling
   - `supplier_qualification` — Supplier audit and qualification
   - `pms_report` — Post-Market Surveillance / PSUR
   - `custom` — General purpose
2. Assign a unique **project code** (e.g., `CER-2026-001`)
3. Optionally:
   - Set product context: `product_name`, `device_class`, `regulatory_pathway`
   - Specify regulatory context: `regulatory_body`, `submission_type`
   - Enable **modules** (e.g., `["aice", "dhf"]`)
   - Add initial **milestones** inline

**What happens automatically:**
- Creator is added as `project_manager` with full permissions
- Activity log entry `created` is written
- Audit event logged

---

### 3.2 Managing Project Members

**Roles available:**

| Role | Typical User |
|---|---|
| `project_manager` | Regulatory Affairs Lead / QA Manager |
| `lead` | Technical Subject Matter Expert |
| `contributor` | Regulatory Writer / Engineer |
| `reviewer` | Internal Reviewer |
| `approver` | QA Director / Medical Affairs |
| `viewer` | Executive / External Stakeholder |

**Add a Member:**
```
POST /projects/:id/members
{ user_id: "...", role: "reviewer", permissions: ["read"] }
```
- If user is already a member, their role/permissions are **updated** (upsert)
- An in-app notification `project_assigned` is sent to the new member

**Remove a Member:**
```
DELETE /projects/:id/members/:memberId
```
- Sets `status = 'inactive'` and `left_at = NOW()` (soft remove)
- Member record is retained for audit trail

---

### 3.3 Milestone Tracking

**Milestone types:**

| Type | Description |
|---|---|
| `phase_gate` | End-of-phase review gate |
| `deliverable` | Specific document or output required |
| `review` | Internal or external review event |
| `submission` | Regulatory submission to authority |
| `approval` | Internal sign-off or regulatory approval |
| `custom` | User-defined |

**Completion Flow:**
```
POST /projects/:id/milestones/:milestoneId
{ status: "completed", actual_date: "2026-08-01" }
```
- `completed_by` is automatically set to the requesting user
- `actual_date` records when it was actually achieved vs. `planned_date`

**Overdue detection (via stats):**
- `GET /projects/:id/stats` returns `milestones.overdue` = count where `status = 'pending' AND planned_date < TODAY`

---

### 3.4 Module Management

Projects can selectively enable QAssure modules:

| Module Code | Module Name |
|---|---|
| `aice` | AI Clinical Evaluation |
| `dhf` | Design History File |
| `sqm` | Supplier Quality Management |
| `aich` | AI Complaint Handling |
| `pms` | Post-Market Surveillance |

**Enable a module:**
```
POST /projects/:id/modules/aice/enable
```
Uses upsert — safe to call repeatedly.

**Disable a module:**
```
POST /projects/:id/modules/aice/disable
```
Sets `is_enabled = false`; retains history (`disabled_at` timestamp recorded).

**List active modules:**
```
GET /projects/:id/modules
```
Returns only `is_enabled = true` rows.

---

### 3.5 Project Statistics

The stats endpoint (`GET /projects/:id/stats`) aggregates across four domain areas:

| Stat | Source Table |
|---|---|
| `members` | `project_members` |
| `milestones` (total / completed / missed / overdue) | `project_milestones` |
| `workflows` (total / active / completed) | `workflow_instances` |
| `documents` | `documents` |

This gives a single-request health check for a project's progress.

---

### 3.6 Activity Log

Every significant project action is recorded in `project_activity_log`:

| Activity Type | Trigger |
|---|---|
| `created` | New project created |
| `updated` | Project fields changed |
| `member_added` | User added to project |
| `member_removed` | User removed from project |

The activity log is queried via:
```
GET /projects/:id/activity?activity_type=member_added&limit=20
```

This provides an **immutable chronological audit trail** within the project scope (separate from the global audit service).

---

### 3.7 My Projects vs All Projects

| Query | What It Returns |
|---|---|
| `GET /projects` | All tenant projects |
| `GET /projects?my_projects=true` | Projects where current user is an active member |
| `GET /projects?owner_id=<uuid>` | Projects owned by a specific user |

---

## 4. Business Rules Summary

| Rule | Details |
|---|---|
| Project code is unique | Per tenant (`unique_project_code_per_tenant` constraint) |
| Creator auto-added | Always added as `project_manager` on creation |
| Soft delete | `DELETE /projects/:id` archives; never hard-deletes |
| Soft member removal | `DELETE /members/:id` sets `status = 'inactive'`; record retained |
| Module upsert | Enable/disable is safe to call multiple times |
| Member upsert | `POST /members` re-adding an existing user updates their role |
| Activity logging | `created` and `updated` events are logged inside the DB transaction |
| Milestone completion | `completed_by` auto-set when `status = 'completed'` |
| `code` immutable | Cannot be updated after creation |

---

## 5. Integration with Other Services

| Service | Connection |
|---|---|
| **Document Service** | Documents have optional `project_id` FK |
| **Workflow Engine** | Workflow instances have optional `project_id` FK |
| **CAPA Service** | CAPAs have optional `project_id` FK |
| **Training Service** | Training assignments have optional `project_id` FK |
| **Supplier Service** | Suppliers have optional `project_id` FK |
| **Audit Service** | CREATE/UPDATE/DELETE logged asynchronously |
| **Notification Service** | `project_assigned` sent to new members |

All cross-domain `project_id` columns are **nullable FKs** — existing records in those tables are unaffected.
