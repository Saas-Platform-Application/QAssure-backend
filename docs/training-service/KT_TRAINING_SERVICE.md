# QAssure Training Service
## KT (Knowledge Transfer) Guide

**Document ID:** QASSURE-TRN-KT-001  
**Audience:** New Backend Developers, Onboarding Engineers  
**Prerequisite Reading:** DESIGN_DOCUMENT.md, CODEBASE_AND_API.md  
**Last Updated:** 2026-06-29  

---

## Welcome

This KT guide is your fast-track to understanding the **Training Service** in the QAssure backend. After reading this document you should be able to:

- Navigate the codebase confidently
- Trace any API call from route → controller → service → DB
- Make safe changes to courses, assignments, and competencies
- Understand the permission model and middleware chain
- Avoid common pitfalls and mistakes

---

## 1. Architectural Overview

### 1.1 Directory & Component Map

```
src/routes/training.routes.js         ← HTTP entry point; auth gating
src/controllers/training.controller.js ← Request parsing; HTTP response
src/services/training.service.js       ← Business logic; SQL; transactions
src/migrations/
  └── phase16_training_management.sql  ← Full schema: 9 tables + indexes
```

### 1.2 Key Principle: Direct SQL (No ORM)

The Training Service uses **raw `pg` pool queries**. There is no Sequelize or Prisma. This is intentional for:
- Performance on complex joins
- Fine-grained transaction control
- Explicit control over parameterized query binding

---

## 2. Request Lifecycle — Trace Example

**Scenario:** A manager assigns `QMS-001` to a new hire.

```
POST /api/v1/training/assignments
Authorization: Bearer <jwt>
Body: { course_id: "...", user_id: "...", reason: "new_hire", due_days: 14 }

Step 1: auth.middleware.js → authenticate()
  → Verifies JWT; validates Redis session
  → Sets req.user = { id, email, tenantId, permissions }

Step 2: training.routes.js
  → router.post('/assignments', authorize('training:write'), controller.assignTraining)
  → authorize() checks req.user.permissions for 'training:write'

Step 3: training.controller.js → assignTraining(req, res)
  → Extracts tenantId from req.user.tenantId
  → Validates: course_id and user_id are required (400 if missing)
  → Calls: service.assignTraining(tenantId, req.body, assignedBy)

Step 4: training.service.js → assignTraining()
  → BEGIN transaction
  → Validates course exists in tenant
  → Calculates due_date from due_days (due_date = NOW() + 14 days)
  → INSERT INTO training_assignments (status = 'assigned')
  → COMMIT
  → setImmediate: audit.log({ action: 'CREATE', ... })
  → setImmediate: notification.sendFromTemplate('training_assigned', ...)
  → Returns: getAssignment(assignmentId, tenantId)

Step 5: controller sends 201 response
  { success: true, data: <assignment object> }
```

---

## 3. System Interaction Diagrams

### 3.1 Course Creation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Mgr as Training Manager
    participant Auth as auth.middleware
    participant Ctrl as training.controller
    participant Svc as training.service
    database DB as PostgreSQL

    Mgr->>Auth: POST /training/courses (JWT + body)
    Auth->>Auth: Verify JWT; validate session
    Auth->>Ctrl: req.user set
    Ctrl->>Ctrl: Validate course_code, title, course_type
    Ctrl->>Svc: createCourse(tenantId, body, createdBy)
    Svc->>DB: INSERT INTO training_courses (status='draft')
    DB-->>Svc: New course row
    Svc->>Svc: setImmediate → audit.log(CREATE)
    Svc-->>Ctrl: Formatted course object
    Ctrl-->>Mgr: 201 { success: true, data: course }
```

---

### 3.2 Assignment Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    actor User as Employee
    actor Mgr as Manager
    participant Ctrl as training.controller
    participant Svc as training.service
    participant Notif as notification.service
    database DB as PostgreSQL

    Mgr->>Ctrl: POST /assignments { course_id, user_id }
    Ctrl->>Svc: assignTraining(tenantId, data, assignedBy)
    Svc->>DB: BEGIN; SELECT course; INSERT assignment; COMMIT
    Svc->>Notif: setImmediate → training_assigned to user
    Svc-->>Ctrl: Assignment object
    Ctrl-->>Mgr: 201 Created

    User->>Ctrl: POST /assignments/:id/start
    Ctrl->>Svc: startTraining(id, tenantId, userId)
    Svc->>DB: UPDATE SET status='in_progress', started_at=NOW() WHERE status='assigned'
    Svc-->>Ctrl: Updated assignment
    Ctrl-->>User: 200 OK

    User->>Ctrl: POST /assignments/:id/complete { score: 88 }
    Ctrl->>Svc: completeTraining(id, tenantId, userId, data)
    Svc->>DB: BEGIN
    Svc->>DB: UPDATE training_assignments SET completed, score, passed, attempts+1
    Svc->>DB: INSERT INTO training_records (immutable record)
    Svc->>DB: COMMIT
    Svc->>Notif: setImmediate → training_completed to manager
    Svc-->>Ctrl: { assignment, record, passed }
    Ctrl-->>User: 200 OK
```

---

### 3.3 Competency Upsert Flow

```mermaid
sequenceDiagram
    autonumber
    actor Assessor as Quality Assessor
    participant Ctrl as training.controller
    participant Svc as training.service
    database DB as PostgreSQL

    Assessor->>Ctrl: PUT /competencies/:user_id/:competency_id
    Note over Ctrl: Body: { current_level: 2, target_level: 3 }
    Ctrl->>Svc: updateUserCompetency(tenantId, userId, competencyId, data, assessedBy)
    Svc->>DB: INSERT INTO user_competencies ON CONFLICT DO UPDATE
    DB-->>Svc: Upserted row
    Svc-->>Ctrl: Competency row
    Ctrl-->>Assessor: 200 { success: true, data: row }
```

---

## 4. Key Implementation Details

### 4.1 Singleton Pattern
The service is a singleton — always use the factory function:

```javascript
// ✅ Correct
const { getTrainingService } = require('../services/training.service');
const service = getTrainingService();

// ❌ Wrong — creates a new instance with its own pool connection tracking
const { TrainingService } = require('../services/training.service');
const service = new TrainingService();
```

### 4.2 Transaction Pattern
Assignments and completions use explicit transactions:

```javascript
const client = await this.pool.connect();
try {
  await client.query('BEGIN');
  // ... multiple queries
  await client.query('COMMIT');
} catch (error) {
  await client.query('ROLLBACK');
  throw error;
} finally {
  client.release(); // Always release!
}
```

> ⚠️ **Critical:** Always call `client.release()` in the `finally` block. Not doing so leaks pool connections.

### 4.3 Fire-and-Forget Pattern
Audit and notification calls never block the HTTP response:

```javascript
setImmediate(async () => {
  try {
    await getAuditService().log({ ... });
  } catch(e) {} // Silently ignored — never fail the main request
});
```

### 4.4 Parameterized Queries
All SQL uses `$1, $2, ...` placeholders — **never string interpolation**:

```javascript
// ✅ Safe
await pool.query('SELECT * FROM training_courses WHERE tenant_id = $1', [tenantId]);

// ❌ Unsafe — SQL injection risk
await pool.query(`SELECT * FROM training_courses WHERE tenant_id = '${tenantId}'`);
```

### 4.5 Dynamic Filter Queries
`listCourses()` uses a progressive WHERE builder:

```javascript
let query = 'SELECT * FROM training_courses WHERE tenant_id = $1';
const params = [tenantId];
let paramIndex = 2;

if (status) {
  query += ` AND status = $${paramIndex++}`;
  params.push(status);
}
// ...
query += ` ORDER BY course_code LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
params.push(limit, offset);
```

> ⚠️ Note the `paramIndex` counter is always incremented consistently. When adding new filters, be careful to maintain correct index sequencing.

### 4.6 Denormalized History
When a training record is created, `course_code`, `course_title`, and `course_version` are stored directly in `training_records`. This ensures:
- If a course is later renamed or archived, historical records are unaffected.
- Compliance reports always show what was current at completion time.

---

## 5. Developer KT Cheat Sheet: Common Tasks

### A. How to Add a New Course Type?

1. Open `src/controllers/training.controller.js`
2. Locate `getCourseTypes(req, res)`:
   ```javascript
   { code: 'blended', name: 'Blended Learning' }
   ```
3. Add the entry to the array.
4. Update any DB column constraint validation if the column uses a `CHECK` constraint.
5. Update the `FUNCTIONAL_DOCUMENTATION.md` table.

---

### B. How to Add a New Assignment Status?

1. Open `src/controllers/training.controller.js` → `getStatuses()`.
2. Add new status object.
3. Open `src/services/training.service.js` → update `startTraining()` or `completeTraining()` logic if the new status is a valid transition target.
4. Update database column constraint if `status` has an `IN` check.

---

### C. How to Add a New Filterable Field to `listCourses`?

1. Open `src/services/training.service.js` → `listCourses()`.
2. Destructure the new field from `options`:
   ```javascript
   const { status, category, course_type, search, department, limit = 50, offset = 0 } = options;
   ```
3. Add the filter block:
   ```javascript
   if (department) {
     query += ` AND $${paramIndex++} = ANY(required_for_departments)`;
     params.push(department);
   }
   ```
4. Add the query parameter extraction in `training.controller.js` → `listCourses`:
   ```javascript
   const { status, category, course_type, search, department, limit, offset } = req.query;
   ```
5. Pass it to the service call.

---

### D. How to Add a New Updatable Field to `updateCourse`?

1. Open `src/services/training.service.js` → `updateCourse()`.
2. Add the field name to the `allowedFields` array:
   ```javascript
   const allowedFields = ['title', 'description', ..., 'your_new_field'];
   ```
3. That's it — the dynamic SET builder picks it up automatically.

---

### E. How to Send a New Notification from Training Service?

1. Open `src/services/training.service.js`.
2. Add a `setImmediate` block after the DB operation:
   ```javascript
   setImmediate(async () => {
     try {
       await getNotificationService().sendFromTemplate(
         tenantId,
         recipientUserId,
         'training_overdue_alert',     // Template code — must be seeded in DB
         { course_title: course.title }, // Template variables
         {
           entityType: 'training_assignment',
           entityId: assignmentId,
           entityName: course.title,
           actionUrl: `/training/assignments`,
           createdBy: userId
         }
       );
     } catch(e) { console.warn('[TrainingService] Notification failed:', e.message); }
   });
   ```
3. Ensure the template code `training_overdue_alert` is seeded in `notification_categories` table.

---

### F. How to Add a New Competency Level?

1. When creating a competency, pass a custom `levels` array:
   ```json
   {
     "name": "Statistical Analysis",
     "levels": [
       { "level": 1, "name": "Novice", "description": "Can read charts" },
       { "level": 2, "name": "Practitioner", "description": "Can run analysis" },
       { "level": 3, "name": "Expert", "description": "Can design studies" }
     ]
   }
   ```
2. No code changes required — `levels` is stored as JSONB.

---

## 6. Permission Model Quick Reference

| Route | Permission Required |
|---|---|
| `GET /types`, `/categories`, `/statuses` | None (any authenticated user) |
| `GET /dashboard` | None (any authenticated user) |
| `GET /my/assignments` | None (any authenticated user) |
| `GET /my/records` | None (any authenticated user) |
| `GET /expiring-certifications` | `training:read` |
| `GET /courses` | `training:read` |
| `GET /courses/:id` | `training:read` |
| `GET /assignments/:id` | `training:read` |
| `GET /competencies` | `training:read` |
| `POST /courses` | `training:write` |
| `PUT /courses/:id` | `training:write` |
| `POST /assignments` | `training:write` |
| `POST /assignments/:id/start` | `training:write` |
| `POST /assignments/:id/complete` | `training:write` |
| `POST /competencies` | `training:write` |
| `PUT /competencies/:user_id/:competency_id` | `training:write` |

---

## 7. Gotchas & Known Pitfalls

| Pitfall | What Goes Wrong | How to Avoid |
|---|---|---|
| Forgetting `client.release()` | Pool connection leak; server eventually hangs | Always use `try/catch/finally` pattern |
| Using string interpolation in SQL | SQL injection vulnerability | Always use `$1, $2` parameterized queries |
| Calling `new TrainingService()` | Multiple pool instances | Always use `getTrainingService()` |
| Modifying `training_records` | Breaks compliance/audit trail | Records are immutable by design — never update |
| Changing `course_code` | Breaks denormalized records | `course_code` is not in `allowedFields` for updateCourse |
| Adding filter but forgetting `paramIndex` increment | SQL parameter binding fails | Always increment `paramIndex` per added filter |
| Setting `due_date` and `due_days` both | `due_date` takes precedence; `due_days` ignored | Document this for API consumers |

---

## 8. Database Quick Reference

```sql
-- See all courses for a tenant
SELECT course_code, title, status, course_type
FROM training_courses
WHERE tenant_id = '<tenant-uuid>'
ORDER BY course_code;

-- See overdue assignments
SELECT ta.id, tc.title, u.email, ta.due_date
FROM training_assignments ta
JOIN training_courses tc ON ta.course_id = tc.id
JOIN users u ON ta.user_id = u.id
WHERE ta.tenant_id = '<tenant-uuid>'
  AND ta.status IN ('assigned', 'in_progress')
  AND ta.due_date < NOW();

-- See expiring certifications in next 30 days
SELECT tr.*, u.email
FROM training_records tr
JOIN users u ON tr.user_id = u.id
WHERE tr.tenant_id = '<tenant-uuid>'
  AND tr.expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
  AND tr.passed = TRUE;

-- Check competency levels for a user
SELECT cd.name, cd.category, uc.current_level, uc.target_level
FROM competency_definitions cd
LEFT JOIN user_competencies uc ON cd.id = uc.competency_id
WHERE cd.tenant_id = '<tenant-uuid>'
  AND uc.user_id = '<user-uuid>';
```

---

## 9. Related Services

| Service | Connection to Training |
|---|---|
| `document.service` | Courses can link to SOPs via `document_id` |
| `audit.service` | All mutations are audit-logged |
| `notification.service` | Sends training lifecycle notifications |
| `workflow-engine.service` | Imported; `workflow_instance_id` column reserved for future automation |
| `electronic-signature.service` | `signature_id` on training records for FDA Part 11 |
