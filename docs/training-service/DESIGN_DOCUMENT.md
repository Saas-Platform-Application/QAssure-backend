# QAssure Training Service
## Design Document

**Document ID:** QASSURE-TRN-DES-001  
**Service:** Training Management Service  
**Phase:** Phase 16 – AiTM (AI Training Manager)  
**Status:** Active  
**Version:** 1.0  
**Last Updated:** 2026-06-29  

---

## 1. Purpose & Scope

The **Training Service** manages the full lifecycle of employee training programs within the QAssure Quality Management System. It covers:

- Course catalogue management (create, list, update)
- Training assignment & lifecycle (assign → start → complete)
- Immutable training records and certification tracking
- Competency matrix management per user and role
- Expiring certification alerts
- Training dashboard KPIs

This service is part of Phase 16 of the QAssure backend and aligns with **FDA 21 CFR Part 11**, **ISO 9001:2015 Clause 7.2**, and **ISO 13485** requirements for documented training evidence.

---

## 2. Architectural Overview

### 2.1 Layer Responsibilities

| Layer | File | Responsibility |
|---|---|---|
| **Route** | `src/routes/training.routes.js` | Declares Express endpoints; applies `authenticate` + `authorize` middleware; delegates to controller |
| **Controller** | `src/controllers/training.controller.js` | Request parsing, inline validation, HTTP response shaping; invokes `TrainingService` |
| **Service** | `src/services/training.service.js` | Core business logic; direct PostgreSQL queries via `pg` pool; calls Audit & Notification services |
| **Database** | `phase16_training_management.sql` | PostgreSQL schema; 9 tables; strict FK + tenant isolation |

### 2.2 Component Interaction Diagram

```
Client (HTTP Request)
      │
      ▼
[auth.middleware.js]   ← authenticate() verifies JWT/API Key
      │
      ▼
[training.routes.js]   ← authorize('training:read' | 'training:write')
      │
      ▼
[training.controller.js]  ← validates required fields, maps HTTP → service
      │
      ▼
[training.service.js]  ← business logic (pool queries, transactions)
      │             │
      ▼             ▼
[PostgreSQL DB]   [audit.service / notification.service]
```

### 2.3 External Service Dependencies

| Service | Usage | Call Pattern |
|---|---|---|
| `audit.service` | Log CREATE/UPDATE events | `setImmediate` (fire-and-forget) |
| `notification.service` | `training_assigned`, `training_completed` templates | `setImmediate` (fire-and-forget) |
| `workflow-engine.service` | Imported but not actively used in current routes | Reserved for future automation |

---

## 3. Database Design

### 3.1 Entity Relationship Summary

```
tenants (1) ─────────────────────────────────────────── (many) training_courses
tenants (1) ─────────────────────────────────────────── (many) training_curricula
training_curricula (1) ──────────────────────────────── (many) curriculum_courses
training_courses (1) ────────────────────────────────── (many) curriculum_courses
training_courses (1) ────────────────────────────────── (many) training_assignments
training_assignments (1) ────────────────────────────── (1)    training_records
training_courses (1) ────────────────────────────────── (many) training_quiz_questions
training_assignments (1) ────────────────────────────── (many) training_quiz_attempts
competency_definitions (1) ──────────────────────────── (many) user_competencies
users (1) ───────────────────────────────────────────── (many) user_competencies
documents (1) ───────────────────────────────────────── (many) training_courses (optional link)
```

### 3.2 Table Definitions

#### `training_courses`
The course catalogue table. Every course is scoped to a tenant.

| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | UUID PK | NOT NULL | Auto-generated primary key |
| `tenant_id` | UUID FK → tenants | NOT NULL | Tenant isolation |
| `course_code` | VARCHAR(100) | NOT NULL | Unique code per tenant (e.g., `QMS-001`) |
| `title` | VARCHAR(500) | NOT NULL | Human-readable course name |
| `description` | TEXT | NULL | Full course description |
| `course_type` | VARCHAR(50) | NOT NULL | `online`, `classroom`, `on_the_job`, `self_study`, `external` |
| `category` | VARCHAR(100) | NULL | `compliance`, `quality`, `technical`, `safety`, `leadership`, `soft_skills` |
| `duration_hours` | DECIMAL(5,2) | NULL | Expected duration |
| `passing_score` | INTEGER | Default: 80 | Minimum passing percentage |
| `max_attempts` | INTEGER | Default: 3 | Maximum quiz attempts allowed |
| `prerequisites` | TEXT[] | NULL | Array of prerequisite course IDs |
| `required_for_roles` | TEXT[] | NULL | Roles requiring this course |
| `required_for_departments` | TEXT[] | NULL | Departments requiring this course |
| `status` | VARCHAR(50) | Default: `draft` | `draft`, `active`, `archived` |
| `version` | VARCHAR(20) | Default: `1.0` | Version string |
| `requires_recertification` | BOOLEAN | Default: FALSE | Whether course needs periodic renewal |
| `recertification_months` | INTEGER | NULL | Months until re-certification required |
| `content_url` | VARCHAR(1000) | NULL | External/internal content link |
| `document_id` | UUID FK → documents | NULL | Optional link to a controlled SOP document |
| `created_by`, `updated_by` | UUID FK → users | NULL | Audit trail |
| `created_at`, `updated_at` | TIMESTAMPTZ | Auto | Record timestamps |

**Unique constraint:** `(tenant_id, course_code)`

**Indexes:** `tenant_id`, `status`, `course_type`

---

#### `training_curricula`
Groups of ordered courses for structured training programmes (e.g., New Hire Onboarding).

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK | Tenant isolation |
| `name` | VARCHAR(255) | Curriculum name |
| `description` | TEXT | — |
| `target_roles` | TEXT[] | Roles this curriculum targets |
| `target_departments` | TEXT[] | Departments targeted |
| `status` | VARCHAR(50) | `active`, `inactive` |
| `created_by` | UUID FK | — |

---

#### `curriculum_courses`
Junction table linking `training_curricula` ↔ `training_courses`.

| Column | Type | Description |
|---|---|---|
| `curriculum_id` | UUID FK | — |
| `course_id` | UUID FK | — |
| `sequence` | INTEGER | Display order within curriculum |
| `is_required` | BOOLEAN | If false, the course is optional |

**Unique:** `(curriculum_id, course_id)`

---

#### `training_assignments`
Tracks which user is assigned to which course, including progress and completion status.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK | — |
| `course_id` | UUID FK → training_courses | What course |
| `curriculum_id` | UUID FK → training_curricula | Optional curriculum context |
| `user_id` | UUID FK → users | Who is assigned |
| `assigned_by` | UUID FK → users | Who assigned them |
| `assigned_at` | TIMESTAMPTZ | Auto |
| `reason` | VARCHAR(255) | `new_hire`, `recertification`, `document_update`, `role_change` |
| `due_date` | DATE | Expected completion date |
| `extended_due_date` | DATE | Extended due date if granted |
| `extension_reason` | TEXT | — |
| `status` | VARCHAR(50) | `assigned`, `in_progress`, `completed`, `overdue`, `waived` |
| `started_at` | TIMESTAMPTZ | Set when user clicks Start |
| `completed_at` | TIMESTAMPTZ | Set on completion |
| `attempts` | INTEGER | Number of quiz attempts taken |
| `score` | DECIMAL(5,2) | Final score achieved |
| `passed` | BOOLEAN | `true` if score ≥ passing_score |
| `waived_by` | UUID FK | — |
| `waiver_reason` | TEXT | — |
| `workflow_instance_id` | UUID FK → workflow_instances | Optional workflow linkage |

**Indexes:** `(user_id, status)`, `course_id`, `status`, `due_date WHERE status IN ('assigned', 'in_progress')`

---

#### `training_records`
**Immutable** completion history. One record is created per completed assignment. Retains course code/title as denormalized fields for historical accuracy.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK | — |
| `assignment_id` | UUID FK → training_assignments | Source assignment |
| `course_id` | UUID FK | — |
| `course_code` | VARCHAR(100) | **Denormalized** – preserved at time of completion |
| `course_title` | VARCHAR(500) | **Denormalized** – preserved at time of completion |
| `course_version` | VARCHAR(20) | — |
| `user_id` | UUID FK | — |
| `completed_at` | TIMESTAMPTZ | NOT NULL |
| `score` | DECIMAL(5,2) | — |
| `passed` | BOOLEAN | NOT NULL |
| `certificate_number` | VARCHAR(100) | Auto-generated or external |
| `expires_at` | DATE | NULL if no recertification required |
| `signature_id` | UUID | E-signature acknowledgment link |
| `instructor_id` | UUID FK | For classroom training |
| `instructor_name` | VARCHAR(255) | — |
| `external_provider` | VARCHAR(255) | For external training |
| `external_certificate_url` | VARCHAR(1000) | — |

**Indexes:** `user_id`, `course_id`, `expires_at WHERE NOT NULL`

---

#### `training_quiz_questions`
Quiz question bank linked to a course.

| Column | Type | Description |
|---|---|---|
| `course_id` | UUID FK | — |
| `question_text` | TEXT | — |
| `question_type` | VARCHAR(50) | `multiple_choice`, `true_false`, `multi_select` |
| `options` | JSONB | `[{id: 'a', text: 'Option A'}, ...]` |
| `correct_answers` | TEXT[] | `['a']` or `['a', 'c']` |
| `points` | INTEGER | Default: 1 |
| `explanation` | TEXT | Shown post-answer |
| `sequence` | INTEGER | Display order |
| `is_active` | BOOLEAN | Default: TRUE |

---

#### `training_quiz_attempts`
Stores each quiz attempt per assignment.

| Column | Type | Description |
|---|---|---|
| `assignment_id` | UUID FK | — |
| `user_id` | UUID FK | — |
| `attempt_number` | INTEGER | 1-based counter |
| `started_at` | TIMESTAMPTZ | — |
| `completed_at` | TIMESTAMPTZ | — |
| `answers` | JSONB | `{question_id: selected_answers}` |
| `score` | DECIMAL(5,2) | — |
| `passed` | BOOLEAN | — |
| `time_spent_seconds` | INTEGER | — |

---

#### `competency_definitions`
Tenant-scoped competency framework.

| Column | Type | Description |
|---|---|---|
| `id` | UUID PK | — |
| `tenant_id` | UUID FK | — |
| `name` | VARCHAR(255) | Unique per tenant |
| `description` | TEXT | — |
| `category` | VARCHAR(100) | e.g., `technical`, `regulatory` |
| `levels` | JSONB | Array of `{level: 1, name: 'Awareness', description: '...'}` — defaults to 4-level scale |
| `role_requirements` | JSONB | `{role_name: required_level}` mapping |

**Unique:** `(tenant_id, name)`

---

#### `user_competencies`
Maps users to competency definitions with current/target levels.

| Column | Type | Description |
|---|---|---|
| `user_id` | UUID FK | — |
| `competency_id` | UUID FK | — |
| `current_level` | INTEGER | As assessed |
| `target_level` | INTEGER | Required level for role |
| `assessed_at` | TIMESTAMPTZ | — |
| `assessed_by` | UUID FK | — |
| `evidence` | TEXT | Notes/context |
| `training_record_id` | UUID FK | Optional link to training record |
| `expires_at` | DATE | — |

**Unique:** `(user_id, competency_id)` — upsert semantics via `ON CONFLICT`

---

## 4. Assignment Status Lifecycle

```
                ┌──────────────────────────┐
                │         assigned          │  ← Created by assignTraining()
                └────────────┬─────────────┘
                             │  POST /assignments/:id/start
                             ▼
                ┌──────────────────────────┐
                │        in_progress        │  ← Started by user
                └────────────┬─────────────┘
                             │  POST /assignments/:id/complete
                             ▼
                ┌──────────────────────────┐
                │         completed         │  ← Score recorded; training_record created
                └──────────────────────────┘
                         (alt paths)
                        ┌────────────┐
                        │   overdue  │  ← due_date < NOW(), still assigned/in_progress
                        └────────────┘
                        ┌────────────┐
                        │   waived   │  ← Manager waives training requirement
                        └────────────┘
```

---

## 5. Recertification Logic

When `completeTraining()` is called:
1. Checks if `course.requires_recertification === true` AND `course.recertification_months` is set.
2. If `passed === true`, calculates `expires_at = NOW() + recertification_months`.
3. Stores `expires_at` in `training_records`.
4. `getExpiringCertifications()` queries records where `expires_at <= NOW() + N days`.

---

## 6. Security & Permissions

| Permission | Applied To |
|---|---|
| `authenticate` | All routes (JWT or API Key required) |
| `training:read` | GET courses, assignments, competencies, expiring certs |
| `training:write` | POST/PUT courses, assignments, start/complete, competencies |
| No permission gate | `/types`, `/categories`, `/statuses`, `/dashboard`, `/my/assignments`, `/my/records` |

The `authorize` middleware checks permissions from:
1. JWT token payload (fast path)
2. Database via `permissionService.hasPermission()` (fallback)
3. Super Admin bypass (always passes)

---

## 7. Audit & Notification Events

### Audit Events (via `audit.service.log`)

| Trigger | Action | Resource |
|---|---|---|
| `createCourse` | CREATE | `training` |
| `updateCourse` | UPDATE | `training` |
| `assignTraining` | CREATE | `training` |
| `startTraining` | UPDATE | `training` |
| `completeTraining` | UPDATE | `training` |

All audit calls are **fire-and-forget** via `setImmediate` to avoid blocking the HTTP response.

### Notification Events (via `notification.service.sendFromTemplate`)

| Template | Sent To | When |
|---|---|---|
| `training_assigned` | Assigned user | On `assignTraining()` (if assigner ≠ user) |
| `training_completed` | Original assigner | On `completeTraining()` (if user ≠ assigner) |

---

## 8. Singleton Pattern

`TrainingService` is exported as a singleton via:

```javascript
let instance = null;
const getTrainingService = () => {
  if (!instance) instance = new TrainingService();
  return instance;
};
module.exports = { TrainingService, getTrainingService };
```

All controllers call `getTrainingService()` — this avoids creating multiple DB pool handles.

---

## 9. Design Decisions & Rationale

| Decision | Rationale |
|---|---|
| Direct `pg` pool (no ORM) | Performance; complex joins; fine-grained transaction control |
| `training_records` fields denormalized | Ensures audit history survives course title/version changes |
| `setImmediate` for audit/notifications | Prevents response latency from secondary service failures |
| Parameterized queries only | SQL injection prevention |
| `ON CONFLICT` for user_competencies | Upsert pattern avoids duplicate competency rows |
| No validation schema file | Inline validation in controller (field-level guards) |
