# QAssure Training Service
## Functional Documentation

**Document ID:** QASSURE-TRN-FUN-001  
**Audience:** Product Managers, QA Engineers, Business Analysts  
**Last Updated:** 2026-06-29  

---

## 1. Overview

The Training Management module in QAssure enables organizations to:

1. **Build and maintain** a structured training course catalogue.
2. **Assign training** to employees with due dates and reasons.
3. **Track progress** as learners start and complete courses.
4. **Issue training records** as immutable compliance evidence.
5. **Monitor certifications** before they expire.
6. **Define and track competencies** across individuals and roles.
7. **View a KPI dashboard** for training health across the organization.

This module supports compliance with **ISO 9001:2015 Clause 7.2 (Competence)** and **FDA 21 CFR Part 11** (electronic records and signatures).

---

## 2. User Roles & Functional Access

| Action | Any Authenticated User | `training:read` | `training:write` |
|---|---|---|---|
| View types, categories, statuses | ✅ | ✅ | ✅ |
| View dashboard | ✅ | ✅ | ✅ |
| View my assignments | ✅ | ✅ | ✅ |
| View my records | ✅ | ✅ | ✅ |
| View course list | — | ✅ | ✅ |
| View single course | — | ✅ | ✅ |
| View assignment detail | — | ✅ | ✅ |
| View competency matrix | — | ✅ | ✅ |
| View expiring certifications | — | ✅ | ✅ |
| Create course | — | — | ✅ |
| Update course | — | — | ✅ |
| Assign training | — | — | ✅ |
| Start training | — | — | ✅ |
| Complete training | — | — | ✅ |
| Create competency | — | — | ✅ |
| Update user competency | — | — | ✅ |

---

## 3. Feature Walkthroughs

### 3.1 Creating a Course

**Who:** Training Manager / Quality Admin  
**When:** A new training requirement is identified.

**Steps:**
1. Determine the `course_type`:
   - `online` — eLearning / LMS-hosted
   - `classroom` — Instructor-led in-person
   - `on_the_job` — Supervised practical
   - `self_study` — Materials + self-attestation
   - `external` — Third-party training provider
2. Choose a `category` (e.g., `compliance`, `technical`).
3. Set `passing_score` (default: 80%).
4. Optionally link to a **controlled SOP document** (`document_id`).
5. If periodic renewal is needed, enable `requires_recertification` and set `recertification_months`.

**Result:**
- Course is created with `status = 'draft'`.
- Must be activated (set `status = 'active'`) before being assignable.
- An **audit log entry** is created immediately.

---

### 3.2 Assigning Training to an Employee

**Who:** Training Manager / Quality Admin / HR  
**When:** Onboarding, role change, document revision, regulatory event.

**Steps:**
1. Select the course (`course_id`) and the target employee (`user_id`).
2. Optionally specify:
   - `reason` — e.g., `new_hire`, `recertification`
   - `due_date` — fixed deadline
   - `due_days` — relative deadline from today
3. Submit the assignment.

**Result:**
- Assignment created with `status = 'assigned'`.
- Employee receives a **`training_assigned` notification** (if assigner ≠ user).
- Assignment is visible in employee's `/my/assignments` list.

---

### 3.3 Completing Training (Employee Lifecycle)

**Who:** Assigned employee  
**Flow:**

```
Receive assignment (status: assigned)
          │
          ▼
  Click "Start"
  POST /assignments/:id/start
  (status → in_progress, started_at = NOW())
          │
          ▼
  Complete the course / quiz
          │
          ▼
  Submit score
  POST /assignments/:id/complete
  { score: 92, signature_id: "..." }
  (status → completed, training_record created)
          │
          ▼
  Assigner notified via training_completed notification
```

**Passing Logic:**
- `passed = (submitted_score >= course.passing_score)`
- If `passed = false`: record still created; `attempts` incremented.
- If `max_attempts` exceeded: must be reassigned or waived.

---

### 3.4 Recertification Flow

**When:** `requires_recertification = true` and the training record's `expires_at` approaches.

**Detection:**
- `GET /training/expiring-certifications?days_ahead=30` returns all records expiring within 30 days.
- Dashboard `expiring_certifications` count shows current 30-day window.

**Action:**
1. Manager reviews expiring certifications.
2. Re-assigns the course to the employee (`POST /training/assignments`).
3. Employee completes again — new training record with new `expires_at` is created.

---

### 3.5 Competency Matrix Tracking

**Purpose:** Track employee proficiency levels beyond course completion — useful for role-fit analysis and L&D planning.

**Levels (default 4-tier):**

| Level | Name | Description |
|---|---|---|
| 1 | Awareness | Basic understanding |
| 2 | Knowledge | Working knowledge |
| 3 | Skill | Can perform independently |
| 4 | Mastery | Expert level |

**Workflow:**
1. Quality Manager creates competency definitions (`POST /training/competencies`).
2. Assessors evaluate each employee and set `current_level` and `target_level`.
3. `GET /training/competencies?user_id=<uuid>` shows the gap between current and target.

**Key Use Cases:**
- Identify training gaps before a regulatory audit.
- Assign targeted courses to bridge competency gaps.
- Build role-specific training curricula.

---

### 3.6 Dashboard Interpretation

The training dashboard gives a real-time snapshot of training health.

**Metrics:**

| Metric | Formula |
|---|---|
| `pending` | Count of assignments with `status = 'assigned'` |
| `in_progress` | Count of assignments with `status = 'in_progress'` |
| `completed_30d` | Completed assignments in last 30 days |
| `overdue` | Assignments where `due_date < NOW()` AND status not completed/waived |
| `expiring_certifications` | Training records expiring in next 30 days |

**Scope Control:**
- Default: current user's own assignments.
- With `?all` query param: tenant-wide view (admin use).

---

## 4. Business Rules Summary

| Rule | Details |
|---|---|
| Course uniqueness | `course_code` must be unique per tenant |
| Status transitions | `assigned → in_progress → completed` only via specific API calls |
| Score validation | Controlled by `passing_score` field (default 80%) |
| Max attempts | `max_attempts` (default 3); system tracks `attempts` count on assignment |
| Recertification | Calculated only on PASS + `requires_recertification = true` |
| Denormalized records | `training_records` stores course title/version at completion time |
| Competency upsert | `PUT /competencies/:user_id/:competency_id` is safe to call multiple times |
| Notification opt-out | Notification skipped if `assigner = user` (self-assign) |
| Audit trail | All creates and updates are audit-logged asynchronously |

---

## 5. Data Lifecycle

```
training_courses (Catalogue)
        │
        └─ training_assignments (Per-user lifecycle)
                │
                └─ training_records (Immutable completion evidence)
                        │
                        └─ signature_id (E-signature reference)

competency_definitions (Framework)
        │
        └─ user_competencies (Assessment results per user)
```

**Retention Notes:**
- Training records are **never deleted** — they represent compliance evidence.
- Assignments can be waived (`status = 'waived'`) but not deleted.
- Courses can be archived (`status = 'archived'`) but historical records remain linked.

---

## 6. Integration Points

| Service | How |
|---|---|
| **Document Service** | Courses can link to a controlled document via `document_id` |
| **Notification Service** | Sends `training_assigned` and `training_completed` email/in-app notifications |
| **Audit Service** | Logs all creation and update operations |
| **Workflow Engine** | `workflow_instance_id` column on assignments supports future workflow automation |
| **Electronic Signature** | `signature_id` on training records supports FDA Part 11 acknowledgment |
