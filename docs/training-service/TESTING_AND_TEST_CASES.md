# QAssure Training Service
## Testing & Test Cases

**Document ID:** QASSURE-TRN-TST-001  
**Last Updated:** 2026-06-29  

---

## 1. Testing Strategy Overview

The Training Service is tested across three levels:

| Level | Scope | Tools |
|---|---|---|
| **Unit Tests** | Service methods in isolation (mocked DB) | Jest + jest.mock |
| **Integration Tests** | Controller → Service → DB end-to-end | Supertest + test DB |
| **Manual / Postman** | Full API validation with real auth tokens | Postman collection |

---

## 2. Test Coverage Map

| Service Method / Endpoint | Unit | Integration | Manual |
|---|---|---|---|
| `createCourse` / `POST /courses` | ✅ | ✅ | ✅ |
| `listCourses` / `GET /courses` | ✅ | ✅ | ✅ |
| `getCourse` / `GET /courses/:id` | ✅ | ✅ | ✅ |
| `updateCourse` / `PUT /courses/:id` | ✅ | ✅ | ✅ |
| `assignTraining` / `POST /assignments` | ✅ | ✅ | ✅ |
| `getAssignment` / `GET /assignments/:id` | ✅ | ✅ | ✅ |
| `getMyAssignments` / `GET /my/assignments` | ✅ | ✅ | ✅ |
| `startTraining` / `POST /assignments/:id/start` | ✅ | ✅ | ✅ |
| `completeTraining` / `POST /assignments/:id/complete` | ✅ | ✅ | ✅ |
| `getUserRecords` / `GET /my/records` | ✅ | ✅ | ✅ |
| `getExpiringCertifications` / `GET /expiring-certifications` | ✅ | ✅ | ✅ |
| `createCompetencyDefinition` / `POST /competencies` | ✅ | ✅ | ✅ |
| `getCompetencyMatrix` / `GET /competencies` | ✅ | ✅ | ✅ |
| `updateUserCompetency` / `PUT /competencies/:uid/:cid` | ✅ | ✅ | ✅ |
| `getTrainingDashboard` / `GET /dashboard` | ✅ | ✅ | ✅ |
| `GET /types`, `/categories`, `/statuses` | — | ✅ | ✅ |

---

## 3. Functional Test Cases

### 3.1 Course Management

#### TC-TRN-001: Create Course — Happy Path
- **Input:** `{ course_code: "QMS-001", title: "Quality Basics", course_type: "online" }`
- **Expected:** `201 Created`; `data.status = "draft"`; `data.passing_score = 80`

#### TC-TRN-002: Create Course — Missing Required Fields
- **Input:** `{ course_code: "QMS-002" }` (no title, no course_type)
- **Expected:** `400 Bad Request`; `error.code = "VALIDATION_ERROR"`

#### TC-TRN-003: Create Course — Duplicate course_code
- **Setup:** Create course with `course_code = "QMS-001"`
- **Action:** Create another with same `course_code` in same tenant
- **Expected:** `500` with DB unique constraint violation

#### TC-TRN-004: List Courses — Filter by Status
- **Input:** `GET /courses?status=active`
- **Expected:** Only `status = 'active'` courses returned

#### TC-TRN-005: List Courses — Search by title
- **Input:** `GET /courses?search=quality`
- **Expected:** Returns courses where title ILIKE `%quality%`

#### TC-TRN-006: Get Course by ID — Not Found
- **Input:** `GET /courses/<random-uuid>`
- **Expected:** `404 Not Found`; `error.code = "NOT_FOUND"`

#### TC-TRN-007: Update Course — Restricted Fields
- **Input:** `PUT /courses/:id` with `{ course_code: "HACK-001" }`
- **Expected:** `200 OK`; `data.course_code` is unchanged (restricted field ignored)

---

### 3.2 Assignment Lifecycle

#### TC-TRN-010: Assign Training — Happy Path
- **Input:** `{ course_id: "<valid>", user_id: "<valid>", due_days: 14 }`
- **Expected:** `201 Created`; `data.status = "assigned"`; due_date = today + 14 days

#### TC-TRN-011: Assign Training — Missing course_id
- **Input:** `{ user_id: "<valid>" }`
- **Expected:** `400`; `error.code = "VALIDATION_ERROR"`

#### TC-TRN-012: Assign Training — Invalid course_id
- **Input:** `{ course_id: "<non-existent>", user_id: "<valid>" }`
- **Expected:** `500`; error message contains `"Course not found"`

#### TC-TRN-013: Start Assignment — Happy Path
- **Setup:** Assignment with `status = "assigned"`
- **Input:** `POST /assignments/:id/start`
- **Expected:** `200 OK`; `data.status = "in_progress"`; `data.started_at` set

#### TC-TRN-014: Start Assignment — Already in_progress
- **Setup:** Assignment with `status = "in_progress"`
- **Input:** `POST /assignments/:id/start`
- **Expected:** `400`; `error.code = "INVALID_STATUS"`

#### TC-TRN-015: Start Assignment — Not Found
- **Input:** `POST /assignments/<random-uuid>/start`
- **Expected:** `404`; `error.code = "NOT_FOUND"`

#### TC-TRN-016: Complete Training — Pass
- **Setup:** Assignment in `in_progress`; course `passing_score = 80`
- **Input:** `{ score: 90 }`
- **Expected:** `200 OK`; `data.passed = true`; `data.record` created

#### TC-TRN-017: Complete Training — Fail
- **Setup:** Same as TC-TRN-016
- **Input:** `{ score: 60 }`
- **Expected:** `200 OK`; `data.passed = false`; `data.record` still created

#### TC-TRN-018: Complete Training — Recertification Date Calculation
- **Setup:** Course with `requires_recertification = true`, `recertification_months = 12`
- **Input:** `{ score: 95 }`
- **Expected:** `data.record.expires_at` ≈ today + 12 months

#### TC-TRN-019: Complete Training — No Score
- **Input:** `{}`
- **Expected:** `400`; `error.code = "VALIDATION_ERROR"`

---

### 3.3 Training Records

#### TC-TRN-020: Get My Records
- **Expected:** `200 OK`; array of `training_records` for current user only

#### TC-TRN-021: Expiring Certifications — Default 30 Days
- **Setup:** Record with `expires_at = NOW() + 10 days` and `passed = true`
- **Input:** `GET /expiring-certifications`
- **Expected:** Record appears in results

#### TC-TRN-022: Expiring Certifications — Custom Days
- **Input:** `GET /expiring-certifications?days_ahead=7`
- **Setup:** Record expiring in 20 days, record expiring in 5 days
- **Expected:** Only the 5-day record appears

---

### 3.4 Competencies

#### TC-TRN-030: Create Competency — Happy Path
- **Input:** `{ name: "GMP Awareness", category: "regulatory" }`
- **Expected:** `201 Created`; default 4-level scale applied

#### TC-TRN-031: Create Competency — Custom Levels
- **Input:** `{ name: "Data Analysis", levels: [{level:1,name:"Novice",...}, {level:2,name:"Expert",...}] }`
- **Expected:** `201 Created`; `data.levels` has custom 2-level scale

#### TC-TRN-032: Create Competency — Duplicate Name
- **Setup:** Create `GMP Awareness`
- **Action:** Create `GMP Awareness` again
- **Expected:** `409 Conflict`; `error.code = "DUPLICATE_NAME"`

#### TC-TRN-033: Create Competency — Missing Name
- **Input:** `{ category: "technical" }`
- **Expected:** `400`; `error.code = "VALIDATION_ERROR"`

#### TC-TRN-034: Get Competency Matrix — Tenant Scoped
- **Expected:** Only competencies for the authenticated user's tenant

#### TC-TRN-035: Get Competency Matrix — User Filter
- **Input:** `GET /competencies?user_id=<uuid>`
- **Expected:** Competencies show `user_level` and `target_level` for that user

#### TC-TRN-036: Update User Competency — Upsert (Create)
- **Input:** `PUT /competencies/:user_id/:competency_id { current_level: 2, target_level: 3 }`
- **Expected:** `200 OK`; row created in `user_competencies`

#### TC-TRN-037: Update User Competency — Upsert (Update)
- **Setup:** Existing user competency record
- **Input:** `PUT /competencies/:user_id/:competency_id { current_level: 3 }`
- **Expected:** `200 OK`; `current_level` updated; no duplicate rows

---

### 3.5 Dashboard

#### TC-TRN-040: Dashboard — User Scope
- **Input:** `GET /dashboard`
- **Expected:** Counts reflect only current user's assignments

#### TC-TRN-041: Dashboard — Tenant Scope
- **Input:** `GET /dashboard?all=true`
- **Expected:** Counts reflect all tenant assignments

#### TC-TRN-042: Dashboard — Overdue Count
- **Setup:** Assignment with `due_date = yesterday`, `status = "assigned"`
- **Input:** `GET /dashboard`
- **Expected:** `data.overdue >= 1`

---

### 3.6 Authentication & Authorization

#### TC-TRN-050: No Auth Token
- **Input:** Any request without Authorization header
- **Expected:** `401`; `error.code = "MISSING_TOKEN"`

#### TC-TRN-051: Expired JWT
- **Input:** Request with expired JWT
- **Expected:** `401`; `error.code = "TOKEN_EXPIRED"`

#### TC-TRN-052: Missing Permission — training:write
- **Setup:** User without `training:write` permission
- **Input:** `POST /training/courses`
- **Expected:** `403 Forbidden`; `error.code = "FORBIDDEN"`

#### TC-TRN-053: Missing Permission — training:read
- **Setup:** User without `training:read` permission
- **Input:** `GET /training/courses`
- **Expected:** `403 Forbidden`

#### TC-TRN-054: Cross-Tenant Isolation
- **Setup:** Course belonging to Tenant A
- **Action:** Tenant B user tries `GET /courses/:id`
- **Expected:** `404 Not Found` (tenant_id filter prevents access)

---

## 4. Edge Cases

| Scenario | Expected Behavior |
|---|---|
| Complete an already-completed assignment | DB query joins on `user_id` — if status isn't right, failure (transaction rolled back) |
| Assign same course twice to same user | Succeeds — creates second assignment record (no unique constraint on user+course) |
| `due_date` AND `due_days` both provided | `due_date` takes precedence (`if (!dueDate && data.due_days)`) |
| Self-assign (assigner = user) | Assignment created; notification NOT sent (conditional guard) |
| `competency.levels` not provided | Defaults applied: 4-level Awareness/Knowledge/Skill/Mastery scale |
| Score = exactly `passing_score` | `passed = true` (`score >= passing_score`) |
| Recertification with `passed = false` | `expires_at = null` (no certification issued for failed attempt) |
