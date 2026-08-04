# QAssure Training Service
## Codebase & API Reference

**Document ID:** QASSURE-TRN-API-001  
**Base URL:** `/api/v1/training`  
**Authentication:** All routes require `Authorization: Bearer <JWT>` or `X-API-Key: <key>`  

---

## 1. File Map

```
src/
├── routes/
│   └── training.routes.js         # Express router; applies auth & authorize middleware
├── controllers/
│   └── training.controller.js     # HTTP layer; request parsing; 17 handler methods
├── services/
│   └── training.service.js        # Business logic; PostgreSQL queries; singleton
└── migrations/
    └── phase16_training_management.sql  # Full schema: 9 tables + indexes
```

---

## 2. Middleware Chain

Every request to `/api/v1/training/*` passes through:

```javascript
router.use(authenticate);                  // Validates JWT / API Key
// Then per-route:
authorize('training:read')   // GET endpoints
authorize('training:write')  // POST / PUT endpoints
// Some routes have NO authorize() — open to any authenticated user
```

---

## 3. API Endpoints — Complete Reference

### 3.1 Static / Reference Data

---

#### `GET /training/types`
Returns the list of valid course types.

**Auth required:** Yes (any authenticated user)  
**Permission:** None beyond `authenticate`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "code": "online", "name": "Online/E-Learning" },
    { "code": "classroom", "name": "Classroom/Instructor-Led" },
    { "code": "on_the_job", "name": "On-the-Job Training" },
    { "code": "self_study", "name": "Self Study" },
    { "code": "external", "name": "External Training" }
  ]
}
```

---

#### `GET /training/categories`
Returns the list of valid training categories.

**Auth required:** Yes  
**Permission:** None beyond `authenticate`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "code": "compliance", "name": "Compliance & Regulatory" },
    { "code": "quality", "name": "Quality Management" },
    { "code": "technical", "name": "Technical Skills" },
    { "code": "safety", "name": "Safety & EHS" },
    { "code": "leadership", "name": "Leadership & Management" },
    { "code": "soft_skills", "name": "Soft Skills" }
  ]
}
```

---

#### `GET /training/statuses`
Returns the list of valid assignment statuses.

**Auth required:** Yes  
**Permission:** None beyond `authenticate`

**Response `200`:**
```json
{
  "success": true,
  "data": [
    { "code": "assigned", "name": "Assigned" },
    { "code": "in_progress", "name": "In Progress" },
    { "code": "completed", "name": "Completed" },
    { "code": "overdue", "name": "Overdue" },
    { "code": "waived", "name": "Waived" }
  ]
}
```

---

#### `GET /training/dashboard`
Returns KPI summary for the training module.

**Auth required:** Yes  
**Permission:** None beyond `authenticate`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `all` | any | If present, returns tenant-wide stats; otherwise scoped to current user |

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "in_progress": 2,
    "completed_30d": 12,
    "overdue": 1,
    "expiring_certifications": 3
  }
}
```

**Notes:**
- `completed_30d`: Assignments completed in the last 30 days
- `overdue`: Assignments where `due_date < NOW()` and status is `assigned` or `in_progress`
- `expiring_certifications`: Training records expiring within 30 days

---

#### `GET /training/expiring-certifications`
Returns training records that are expiring within N days.

**Auth required:** Yes  
**Permission:** `training:read`

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `days_ahead` | integer | `30` | Look-ahead window in days |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "course": { "id": "uuid", "code": "QMS-001", "title": "Quality Basics", "version": "1.0" },
      "completed_at": "2025-01-15T10:00:00Z",
      "score": 92.5,
      "passed": true,
      "certificate_number": "CERT-2025-001",
      "expires_at": "2026-01-15",
      "instructor": null,
      "external_provider": null,
      "user": { "email": "jane@example.com", "name": "Jane Smith" }
    }
  ]
}
```

---

### 3.2 My Training (Current User)

---

#### `GET /training/my/assignments`
Returns all training assignments for the currently authenticated user.

**Auth required:** Yes  
**Permission:** None beyond `authenticate`

**Query Parameters:**

| Param | Type | Default | Description |
|---|---|---|---|
| `status` | string | — | Filter: `assigned`, `in_progress`, `completed`, `overdue`, `waived` |
| `limit` | integer | `50` | Pagination limit |
| `offset` | integer | `0` | Pagination offset |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "course": {
        "id": "uuid",
        "code": "QMS-001",
        "title": "Quality Management Basics",
        "type": "online",
        "duration_hours": 2.5
      },
      "user": { "id": "uuid" },
      "status": "assigned",
      "assigned_by": "manager@example.com",
      "assigned_at": "2026-06-01T08:00:00Z",
      "reason": "new_hire",
      "due_date": "2026-06-30",
      "started_at": null,
      "completed_at": null,
      "attempts": 0,
      "score": null,
      "passed": null
    }
  ],
  "pagination": { "limit": 50, "offset": 0 }
}
```

---

#### `GET /training/my/records`
Returns completed training history for the current user.

**Auth required:** Yes  
**Permission:** None beyond `authenticate`

**Query Parameters:**

| Param | Type | Default |
|---|---|---|
| `limit` | integer | `50` |
| `offset` | integer | `0` |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "course": {
        "id": "uuid",
        "code": "QMS-001",
        "title": "Quality Management Basics",
        "version": "1.0"
      },
      "completed_at": "2026-06-15T10:00:00Z",
      "score": 88.0,
      "passed": true,
      "certificate_number": "CERT-2026-0012",
      "expires_at": "2027-06-15",
      "instructor": null,
      "external_provider": null
    }
  ],
  "pagination": { "limit": 50, "offset": 0 }
}
```

---

### 3.3 Courses

---

#### `POST /training/courses`
Creates a new training course in the tenant's catalogue.

**Auth required:** Yes  
**Permission:** `training:write`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `course_code` | string | **Yes** | Unique identifier within tenant (e.g., `QMS-001`) |
| `title` | string | **Yes** | Course display name |
| `course_type` | string | **Yes** | `online`, `classroom`, `on_the_job`, `self_study`, `external` |
| `description` | string | No | Full description |
| `category` | string | No | `compliance`, `quality`, `technical`, `safety`, `leadership`, `soft_skills` |
| `duration_hours` | number | No | Estimated hours |
| `passing_score` | integer | No | Default: `80` |
| `max_attempts` | integer | No | Default: `3` |
| `prerequisites` | string[] | No | Array of course IDs |
| `required_for_roles` | string[] | No | Role names |
| `required_for_departments` | string[] | No | Department names |
| `requires_recertification` | boolean | No | Default: `false` |
| `recertification_months` | integer | No | Required if recertification is true |
| `content_url` | string | No | Link to course content |
| `document_id` | UUID | No | Link to controlled document |

**Validation (inline in controller):**
- `course_code`, `title`, `course_type` — all required (400 if missing)

**Response `201`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "course_code": "QMS-001",
    "title": "Quality Management Basics",
    "description": "...",
    "course_type": "online",
    "category": "quality",
    "duration_hours": 2.5,
    "passing_score": 80,
    "max_attempts": 3,
    "prerequisites": [],
    "required_for_roles": [],
    "required_for_departments": [],
    "status": "draft",
    "version": "1.0",
    "recertification": { "required": false },
    "content_url": null,
    "document": null,
    "created_at": "2026-06-29T...",
    "updated_at": "2026-06-29T..."
  }
}
```

**Error Responses:**

| Code | Error Code | Description |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Missing required fields |
| 500 | `CREATE_ERROR` | Database error |

---

#### `GET /training/courses`
Lists all courses in the tenant catalogue.

**Auth required:** Yes  
**Permission:** `training:read`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `status` | string | Filter by status (`draft`, `active`, `archived`) |
| `category` | string | Filter by category |
| `course_type` | string | Filter by type |
| `search` | string | ILIKE search on `title` OR `course_code` |
| `limit` | integer | Default: `50` |
| `offset` | integer | Default: `0` |

**Response `200`:**
```json
{
  "success": true,
  "data": [...],
  "pagination": { "total": 42, "limit": 50, "offset": 0 }
}
```

---

#### `GET /training/courses/:id`
Returns a single course by ID.

**Auth required:** Yes  
**Permission:** `training:read`

**Path Parameters:** `id` — course UUID

**Response `200`:** Same shape as course object in `POST /courses` response.

**Error:**
- `404` `NOT_FOUND` — course not found or wrong tenant

---

#### `PUT /training/courses/:id`
Updates an existing course. Only `allowedFields` are accepted.

**Auth required:** Yes  
**Permission:** `training:write`

**Path Parameters:** `id` — course UUID

**Allowed Update Fields:** `title`, `description`, `category`, `duration_hours`, `passing_score`, `max_attempts`, `requires_recertification`, `recertification_months`, `content_url`, `status`

> ⚠️ `course_code`, `course_type`, `tenant_id` cannot be updated.

**Response `200`:** Updated course object.

---

### 3.4 Assignments

---

#### `POST /training/assignments`
Assigns a course to a user.

**Auth required:** Yes  
**Permission:** `training:write`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `course_id` | UUID | **Yes** | Course to assign |
| `user_id` | UUID | **Yes** | Target user |
| `reason` | string | No | `new_hire`, `recertification`, `document_update`, `role_change` |
| `due_date` | DATE | No | Absolute due date (ISO 8601) |
| `due_days` | integer | No | Relative due date: `NOW() + due_days` (used only if `due_date` not set) |

**Business Logic:**
1. Validates course exists within the tenant (throws `'Course not found'` if not).
2. Calculates `due_date` from `due_date` or `due_days` field.
3. Creates the assignment with `status = 'assigned'`.
4. Runs within a DB transaction (ROLLBACK on error).
5. Sends `training_assigned` notification to the user (if assigner ≠ user).

**Response `201`:** Assignment object (see `GET /assignments/:id` response shape).

---

#### `GET /training/assignments/:id`
Fetches a specific assignment with full course and user detail.

**Auth required:** Yes  
**Permission:** `training:read`

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "course": {
      "id": "uuid",
      "code": "QMS-001",
      "title": "Quality Management Basics",
      "type": "online",
      "duration_hours": 2.5
    },
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "Jane Smith"
    },
    "status": "assigned",
    "assigned_by": "manager@example.com",
    "assigned_at": "2026-06-01T08:00:00Z",
    "reason": "new_hire",
    "due_date": "2026-06-30",
    "started_at": null,
    "completed_at": null,
    "attempts": 0,
    "score": null,
    "passed": null
  }
}
```

---

#### `POST /training/assignments/:id/start`
Marks an assignment as `in_progress`.

**Auth required:** Yes  
**Permission:** `training:write`

**Path Parameters:** `id` — assignment UUID

**Business Rules:**
- Assignment must currently have `status = 'assigned'` (throws error otherwise)
- Sets `started_at = NOW()`, `status = 'in_progress'`
- Atomic update: uses `WHERE status = 'assigned'` guard

**Response `200`:** Updated assignment object.

**Error Responses:**

| Code | Error Code | Condition |
|---|---|---|
| 404 | `NOT_FOUND` | Assignment not found |
| 400 | `INVALID_STATUS` | Status is not `assigned` |

---

#### `POST /training/assignments/:id/complete`
Marks an assignment as `completed` and creates a training record.

**Auth required:** Yes  
**Permission:** `training:write`

**Path Parameters:** `id` — assignment UUID

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `score` | number | **Yes** | Score achieved (0–100) |
| `signature_id` | UUID | No | E-signature acknowledgment |

**Business Logic:**
1. Fetches assignment + course + user in a single join.
2. Sets `status = 'completed'`, `completed_at = NOW()`, `score`, `passed` (score ≥ passing_score), `attempts + 1`.
3. If `passed && requires_recertification`: calculates `expires_at`.
4. Creates an immutable record in `training_records`.
5. Sends `training_completed` notification to assigner.
6. Everything runs inside a DB transaction.

**Response `200`:**
```json
{
  "success": true,
  "data": {
    "assignment": { ... },
    "record": {
      "id": "uuid",
      "course": { "id": "...", "code": "QMS-001", "title": "...", "version": "1.0" },
      "completed_at": "2026-06-29T...",
      "score": 88.0,
      "passed": true,
      "certificate_number": null,
      "expires_at": "2027-06-29",
      "instructor": null,
      "external_provider": null
    },
    "passed": true
  }
}
```

---

### 3.5 Competencies

---

#### `POST /training/competencies`
Creates a new competency definition for the tenant.

**Auth required:** Yes  
**Permission:** `training:write`

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `name` | string | **Yes** | Unique name within tenant |
| `description` | string | No | — |
| `category` | string | No | e.g., `technical`, `regulatory` |
| `levels` | array | No | Custom levels; defaults to 4-level scale if omitted |
| `role_requirements` | object | No | `{ "role_name": required_level }` |

**Default Levels (if `levels` omitted):**
```json
[
  { "level": 1, "name": "Awareness", "description": "Basic understanding" },
  { "level": 2, "name": "Knowledge", "description": "Working knowledge" },
  { "level": 3, "name": "Skill", "description": "Can perform independently" },
  { "level": 4, "name": "Mastery", "description": "Expert level" }
]
```

**Response `201`:** Raw `competency_definitions` row.

**Error:**
- `409` `DUPLICATE_NAME` — competency name already exists for tenant

---

#### `GET /training/competencies`
Returns the full competency matrix, optionally filtered by user.

**Auth required:** Yes  
**Permission:** `training:read`

**Query Parameters:**

| Param | Type | Description |
|---|---|---|
| `user_id` | UUID | If set, returns user-specific current/target levels alongside definitions |

**Response `200`:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "GMP Compliance",
      "description": "Understanding of GMP requirements",
      "category": "regulatory",
      "levels": [...],
      "user_level": 2,
      "target_level": 3,
      "user": { "id": "uuid", "email": "jane@example.com", "name": "Jane Smith" }
    }
  ]
}
```

---

#### `PUT /training/competencies/:user_id/:competency_id`
Creates or updates a user's competency level (upsert).

**Auth required:** Yes  
**Permission:** `training:write`

**Path Parameters:**
- `user_id` — target user UUID
- `competency_id` — competency definition UUID

**Request Body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `current_level` | integer | **Yes** | Current assessed level (1–4) |
| `target_level` | integer | No | Desired/required level |
| `evidence` | string | No | Notes on how competency was demonstrated |

**Business Logic:** Uses PostgreSQL `ON CONFLICT (user_id, competency_id) DO UPDATE` — safe upsert.

**Response `200`:** Raw `user_competencies` row.

---

## 4. Response Shapes

### Course Object
```typescript
{
  id: string;
  course_code: string;
  title: string;
  description: string | null;
  course_type: 'online' | 'classroom' | 'on_the_job' | 'self_study' | 'external';
  category: string | null;
  duration_hours: number;
  passing_score: number;
  max_attempts: number;
  prerequisites: string[];
  required_for_roles: string[];
  required_for_departments: string[];
  status: 'draft' | 'active' | 'archived';
  version: string;
  recertification: { required: boolean; months?: number };
  content_url: string | null;
  document: { id: string; number: string; title: string } | null;
  created_at: string;
  updated_at: string;
}
```

### Assignment Object
```typescript
{
  id: string;
  course: { id: string; code: string; title: string; type: string; duration_hours: number };
  user: { id: string; email?: string; name?: string };
  status: 'assigned' | 'in_progress' | 'completed' | 'overdue' | 'waived';
  assigned_by: string | null;
  assigned_at: string;
  reason: string | null;
  due_date: string | null;
  started_at: string | null;
  completed_at: string | null;
  attempts: number;
  score: number | null;
  passed: boolean | null;
}
```

### Training Record Object
```typescript
{
  id: string;
  course: { id: string; code: string; title: string; version: string };
  completed_at: string;
  score: number | null;
  passed: boolean;
  certificate_number: string | null;
  expires_at: string | null;
  instructor: string | null;
  external_provider: string | null;
}
```

---

## 5. Error Response Format

All errors follow this shape:
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}
```

**Common Error Codes:**

| HTTP | Code | Meaning |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Required field missing |
| 400 | `INVALID_STATUS` | Status transition not allowed |
| 401 | `MISSING_TOKEN` | No auth credentials |
| 401 | `TOKEN_EXPIRED` | JWT expired |
| 403 | `FORBIDDEN` | Permission denied |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `DUPLICATE_NAME` | Competency name conflict |
| 500 | `CREATE_ERROR` | DB insert failed |
| 500 | `UPDATE_ERROR` | DB update failed |
| 500 | `FETCH_ERROR` | DB read failed |
