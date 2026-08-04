# QAssure Reporting & Analytics Service — Codebase & API Documentation

---

## 1. Directory Structure

The files implementing reporting, analytics, exports, and scheduled run logs are organized as follows:

```
src/
├── routes/
│   └── reporting.routes.js                 # Express route definitions for analytics and schedules
├── controllers/
│   ├── reporting.controller.js             # Controller for dashboard, trends, search, and audit logs
│   └── scheduled-reports.controller.js     # Controller for scheduled reports and exports download
├── services/
│   ├── reporting.service.js                # Database metric aggregators and PG search fallback
│   ├── scheduled-reports.service.js        # Schedule CRUD and node-cron automation loops
│   └── export.service.js                   # PDF/Excel compilers, listing and cleanup functions
├── infrastructure/
│   └── search/
│       └── elasticsearch.service.js        # Elasticsearch client connections and query builder
└── migrations/
    ├── 061_create_reporting_analytics.js   # Sequelize migration script
    └── phase19_reporting_analytics.sql     # PostgreSQL database table schemas
```

---

## 2. Express Route Registry

All routes require JWT Authentication (`authenticate`). Prefix: `/api/v1/reporting`.

| Method | Endpoint | Action | RBAC Permission |
| :--- | :--- | :--- | :--- |
| **GET** | `/dashboard` | Fetch Executive Dashboard Metrics | `reports:read` |
| **GET** | `/kpis` | Fetch list of active KPI values & statuses | `reports:read` |
| **GET** | `/trends` | Fetch historical trend metrics (monthly/weekly) | `reports:read` |
| **GET** | `/reports` | List all active report definitions | `reports:read` |
| **GET** | `/reports/:id` | Fetch single report definition details | `reports:read` |
| **POST** | `/reports/:id/execute` | Execute report and log execution audit | `reports:read` |
| **GET** | `/search` | Query global full-text search engine | `reports:read` |
| **GET** | `/search/health` | Check Elasticsearch cluster connection status | `reports:read` |
| **POST** | `/search/reindex/:module`| Trigger reindex of module rows (CAPAs, etc) | `reports:write` |
| **GET** | `/audit-logs` | Fetch system audit trails (ES / PG fallback) | `audit_logs:read` |
| **GET** | `/scheduled` | List scheduled report configurations | `reports:read` |
| **POST** | `/scheduled` | Create a new scheduled report configuration | `reports:write` |
| **GET** | `/scheduled/:id` | Fetch single scheduled report details | `reports:read` |
| **PUT** | `/scheduled/:id` | Update scheduled report configuration | `reports:write` |
| **DELETE**| `/scheduled/:id` | Delete scheduled report and its run history | `reports:write` |
| **POST** | `/scheduled/:id/run` | Force immediate execution of scheduled task | `reports:write` |
| **POST** | `/reports/:id/export/pdf`| Run report and export directly as PDF download | `reports:read` |
| **POST** | `/reports/:id/export/excel`| Run report and export directly as Excel download| `reports:read` |
| **GET** | `/dashboard/export/pdf` | Export executive dashboard as PDF download | `reports:read` |
| **GET** | `/dashboard/export/excel`| Export executive dashboard as Excel download| `reports:read` |
| **GET** | `/exports` | List generated export files for tenant | `reports:read` |
| **GET** | `/exports/download/:filename`| Download specific export file by filename | `reports:read` |
| **DELETE**| `/exports/:filename` | Delete specific export file from storage | `reports:write` |
| **DELETE**| `/exports/cleanup` | Trigger manual cleanup of old files (Admin) | `reports:write` |

---

## 3. API Request & Response Examples

### 3.1 Get Executive Dashboard (`GET /dashboard`)
Retrieves key summary compliance metrics for the tenant.

**Response**:
```json
{
  "success": true,
  "data": {
    "generated_at": "2026-06-25T12:00:00.000Z",
    "tenant_id": "8f8e025a-4bcf-4a30-8025-0d05ac4f9712",
    "capa": {
      "open": 5,
      "overdue": 1,
      "critical": 2,
      "closed_30d": 3,
      "new_30d": 4,
      "avg_days_to_close": 0,
      "on_time_rate": 80
    },
    "training": {
      "total_assignments": 150,
      "completed": 120,
      "in_progress": 25,
      "overdue": 5,
      "compliance_rate": 80
    },
    "documents": {
      "total": 45,
      "effective": 30,
      "draft": 10,
      "in_review": 5,
      "review_overdue": 2,
      "review_upcoming": 4,
      "currency_rate": 93
    },
    "suppliers": {
      "total": 12,
      "approved": 10,
      "pending": 1,
      "suspended": 1,
      "expiring_soon": 2,
      "avg_score": 85.5
    },
    "health_score": 81
  }
}
```

---

### 3.2 List KPI Values (`GET /kpis`)
Retrieves the list of active KPIs along with current values, targets, and statuses.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "e3da8f80-f001-44bb-9a11-bcf3f11ac8a4",
      "code": "capa_ontime_rate",
      "name": "CAPA On-Time Closure Rate",
      "description": "Percentage of CAPAs closed before their target date",
      "module": "capa",
      "value": 80,
      "target": 95,
      "unit": "%",
      "status": "warning"
    },
    {
      "id": "a90bb8c0-a330-4e20-8b10-6c9fa12df8ba",
      "code": "training_compliance",
      "name": "Training Compliance Rate",
      "description": "Percentage of completed training assignments",
      "module": "training",
      "value": 80,
      "target": 90,
      "unit": "%",
      "status": "warning"
    }
  ]
}
```

---

### 3.3 Execute Report Definition (`POST /reports/:id/execute`)
Triggers queries behind a report definition ID and logs results to `report_history`.

**Request Body**:
```json
{
  "start_date": "2026-01-01",
  "end_date": "2026-06-30"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "report": "CAPA Summary Report",
    "generated_at": "2026-06-25T12:05:00.000Z",
    "data": [
      {
        "status": "open",
        "capa_type": "corrective",
        "priority": "high",
        "count": "3"
      },
      {
        "status": "closed",
        "capa_type": "preventive",
        "priority": "medium",
        "count": "8"
      }
    ]
  }
}
```

---

### 3.4 Create Scheduled Report (`POST /scheduled`)
Registers a recurring schedule to generate and archive reports.

**Request Body**:
```json
{
  "report_definition_id": "bc339da0-f331-4e1a-88bc-39dca412ff88",
  "name": "Monthly Quality Audit Report",
  "schedule_type": "monthly",
  "schedule_config": {
    "day_of_month": 1,
    "hour": 6,
    "minute": 0
  },
  "recipients": [
    { "user_id": "da1e3090-ff2a-4a6c-90b1-fa12da431109", "email": "qa_manager@company.com" }
  ],
  "output_format": "pdf",
  "include_charts": true
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "e30d1aa0-11fa-4091-88fc-fa3cf8911dd1",
    "tenant_id": "8f8e025a-4bcf-4a30-8025-0d05ac4f9712",
    "report_definition_id": "bc339da0-f331-4e1a-88bc-39dca412ff88",
    "name": "Monthly Quality Audit Report",
    "schedule_type": "monthly",
    "schedule_config": {
      "day_of_month": 1,
      "hour": 6,
      "minute": 0
    },
    "recipients": [
      { "user_id": "da1e3090-ff2a-4a6c-90b1-fa12da431109", "email": "qa_manager@company.com" }
    ],
    "output_format": "pdf",
    "include_charts": true,
    "is_active": true,
    "last_run_at": null,
    "next_run_at": "2026-07-01T06:00:00.000Z",
    "created_by": "da1e3090-ff2a-4a6c-90b1-fa12da431109",
    "created_at": "2026-06-25T12:10:00.000Z"
  }
}
```

---

### 3.5 Global Search (`GET /search?q=SOP&limit=5`)
Performs fuzzy multi-match searching across documents, CAPAs, suppliers, and courses.

**Response**:
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "id": "5fa2e890-aef2-48bc-9f33-ef728bdaac2f",
        "index": "documents",
        "score": 3.42,
        "title": "Standard Operating Procedure for CAPA Management",
        "document_number": "SOP-QLTY-001",
        "status": "effective",
        "highlights": {
          "title": [
            "Standard Operating Procedure for <mark>CAPA</mark> Management"
          ]
        }
      }
    ],
    "total": 1
  }
}
```

---

### 3.6 List Exported Files (`GET /exports`)
Lists generated PDF/Excel files available for the tenant's download.

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "filename": "capa_summary_report_1718818818000.pdf",
      "type": "pdf",
      "size_bytes": 18204,
      "created_at": "2026-06-25T12:00:00.000Z",
      "path": "/api/v1/reporting/exports/download/capa_summary_report_1718818818000.pdf",
      "isolated": true
    }
  ],
  "count": 1
}
```
