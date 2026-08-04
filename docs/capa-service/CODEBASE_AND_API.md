# QAssure CAPA Service — Codebase & API Documentation

---

## 1. Directory Structure

The CAPA service and its 8D problem-solving engine are structured as follows:

```
src/
├── routes/
│   └── capa.routes.js               # Route registry, authentication, and RBAC routing
├── controllers/
│   └── capa.controller.js           # Sanitization, static lookups, and orchestrator mappings
├── services/
│   └── capa.service.js              # Business logic, CAPA number generator, and workflow triggers
├── sequelize-models/
│   ├── capa.js                      # Core CAPA Sequelize schema
│   ├── capa_actions.js              # Action item Sequelize schema
│   ├── capa_8d_report.js            # 8D stages Sequelize schema
│   ├── capa_metric.js               # Aggregated metrics Sequelize schema
│   └── capa_related_record.js       # Cross-record links Sequelize schema
└── migrations/
    ├── 059_create_capa_management.js # Sequelize migration script
    └── phase17_capa_management.sql  # SQL schema definition for CAPA tables
```

---

## 2. Express Route Registry

All CAPA routes require JWT Authentication (`authenticate`). Base Prefix: `/api/v1/capas` (or similar namespace).

| Method | Endpoint | Action | RBAC Permission |
| :--- | :--- | :--- | :--- |
| **GET** | `/types` | Fetch list of static CAPA classifications | None (Authenticated) |
| **GET** | `/sources` | Fetch list of static CAPA sources | None (Authenticated) |
| **GET** | `/priorities` | Fetch list of static CAPA priorities and SLA days | None (Authenticated) |
| **GET** | `/statuses` | Fetch list of static CAPA lifecycle statuses | None (Authenticated) |
| **GET** | `/root-cause-methods`| Fetch list of static cause investigation tools | None (Authenticated) |
| **GET** | `/dashboard` | Fetch CAPA dashboard metrics (counts/status ratios) | `capa:read` |
| **POST** | `/` | Create a new CAPA record (optionally enables 8D) | `capa:write` |
| **GET** | `/` | List and filter CAPA records with pagination | `capa:read` |
| **GET** | `/:id` | Fetch details of a single CAPA | `capa:read` |
| **PUT** | `/:id` | Update CAPA metadata and details | `capa:write` |
| **POST** | `/:id/submit` | Submit draft CAPA to trigger the workflow engine | `capa:write` |
| **PATCH**| `/:id/status` | Manually update CAPA lifecycle status | `capa:write` |
| **GET** | `/:id/actions` | Fetch all action items for a CAPA | `capa:read` |
| **POST** | `/:id/actions` | Add a new action item to a CAPA | `capa:write` |
| **PUT** | `/:id/actions/:actionId`| Update action status, assignment, or evidence | `capa:write` |
| **GET** | `/:id/8d` | Fetch the 8D report structure for a CAPA | `capa:read` |
| **PUT** | `/:id/8d/:section`| Update a specific 8D section (d1 through d8) | `capa:write` |

---

## 3. API Request & Response Examples

### 3.1 Create CAPA (`POST /`)
Creates a new CAPA record.

**Request Body**:
```json
{
  "title": "Supplier raw material deviation",
  "description": "Impurities found in batch B-4022",
  "capa_type": "corrective",
  "source": "supplier",
  "priority": "high",
  "risk_level": "high",
  "problem_statement": "Batch B-4022 of active pharmaceutical ingredient contained visible particulate matter.",
  "immediate_action": "Quarantined the remaining packages of batch B-4022.",
  "target_date": "2026-08-31",
  "source_record_type": "supplier_issue",
  "source_record_id": "7f8e025a-4bcf-4a30-8025-0d05ac4f9712",
  "use_8d": true
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "e3da8f80-f001-44bb-9a11-bcf3f11ac8a4",
    "capa_number": "CAPA-2026-0001",
    "title": "Supplier raw material deviation",
    "description": "Impurities found in batch B-4022",
    "capa_type": "corrective",
    "source": "supplier",
    "priority": "high",
    "risk_level": "high",
    "status": "draft",
    "problem_statement": "Batch B-4022 of active pharmaceutical ingredient contained visible particulate matter.",
    "immediate_action": "Quarantined the remaining packages of batch B-4022.",
    "owner": {
      "id": "da1e3090-ff2a-4a6c-90b1-fa12da431109",
      "email": "qa_manager@company.com",
      "name": "QA Manager"
    },
    "dates": {
      "identified": "2026-06-26T00:00:00.000Z",
      "target": "2026-08-31T00:00:00.000Z",
      "closed": null
    },
    "source_record": {
      "type": "supplier_issue",
      "id": "7f8e025a-4bcf-4a30-8025-0d05ac4f9712"
    },
    "actions": [],
    "has_8d_report": true,
    "workflow_instance_id": null,
    "created_by": "qa_manager@company.com",
    "created_at": "2026-06-26T10:10:00.000Z",
    "updated_at": "2026-06-26T10:10:00.000Z"
  }
}
```

---

### 3.2 List CAPAs (`GET /?status=open&priority=high&limit=1`)
Lists CAPAs with filters.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e3da8f80-f001-44bb-9a11-bcf3f11ac8a4",
      "capa_number": "CAPA-2026-0001",
      "title": "Supplier raw material deviation",
      "capa_type": "corrective",
      "source": "supplier",
      "priority": "high",
      "status": "open",
      "owner": "qa_manager@company.com",
      "target_date": "2026-08-31T00:00:00.000Z",
      "is_overdue": false,
      "created_at": "2026-06-26T10:10:00.000Z"
    }
  ],
  "pagination": {
    "total": 12,
    "limit": 1,
    "offset": 0
  }
}
```

---

### 3.3 Submit CAPA (`POST /:id/submit`)
Triggers the workflow engine and updates status to `open`.

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "e3da8f80-f001-44bb-9a11-bcf3f11ac8a4",
    "capa_number": "CAPA-2026-0001",
    "status": "open",
    "workflow_instance_id": "4a0c8f90-ef31-482d-88bb-cfda4091abff",
    "updated_at": "2026-06-26T10:15:00.000Z"
  }
}
```

---

### 3.4 Add Action Item (`POST /:id/actions`)
Appends a task checklist item.

**Request Body**:
```json
{
  "description": "Perform 5 Whys analysis with supplier QC representative",
  "action_type": "corrective",
  "assigned_to": "da1e3090-ff2a-4a6c-90b1-fa12da431109",
  "department": "Quality",
  "due_date": "2026-07-15"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "bc339da0-f331-4e1a-88bc-39dca412ff88",
    "action_number": 1,
    "description": "Perform 5 Whys analysis with supplier QC representative",
    "action_type": "corrective",
    "assigned_to": "qa_manager@company.com",
    "department": "Quality",
    "due_date": "2026-07-15T00:00:00.000Z",
    "completed_date": null,
    "status": "pending",
    "evidence": null,
    "is_overdue": false
  }
}
```

---

### 3.5 Update 8D Section (`PUT /:id/8d/:section`)
Updates stage configurations for the 8D methodology, e.g. section `d1` (Team Assembly).

**Request Body**:
```json
{
  "d1_team": [
    { "user_id": "da1e3090-ff2a-4a6c-90b1-fa12da431109", "name": "Alice QA", "role": "Champion" },
    { "user_id": "8f8e025a-4bcf-4a30-8025-0d05ac4f9712", "name": "Bob Prod", "role": "Member" }
  ],
  "mark_complete": true
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "f89cc8c0-f442-4911-88bc-a89fdcf12dd1",
    "capa_id": "e3da8f80-f001-44bb-9a11-bcf3f11ac8a4",
    "d1_team": [
      { "user_id": "da1e3090-ff2a-4a6c-90b1-fa12da431109", "name": "Alice QA", "role": "Champion" },
      { "user_id": "8f8e025a-4bcf-4a30-8025-0d05ac4f9712", "name": "Bob Prod", "role": "Member" }
    ],
    "d1_completed_at": "2026-06-26T10:20:00.000Z",
    "d2_problem_description": null,
    "created_at": "2026-06-26T10:10:00.000Z",
    "updated_at": "2026-06-26T10:20:00.000Z"
  }
}
```

---

### 3.6 Fetch CAPA Dashboard (`GET /dashboard`)
Retrieves aggregate charts metrics.

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "open": 8,
      "overdue": 2,
      "critical": 1,
      "closed_30d": 4,
      "corrective": 15,
      "preventive": 7
    },
    "by_status": {
      "draft": 2,
      "open": 3,
      "investigation": 2,
      "action": 2,
      "verification": 1,
      "closed": 12
    }
  }
}
```
