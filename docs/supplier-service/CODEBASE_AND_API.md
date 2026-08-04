# QAssure Supplier Service — Codebase & API Documentation

---

## 1. Directory Structure

```
src/
├── routes/
│   └── supplier.routes.js               # Route registry, auth, RBAC, and validation middleware
├── controllers/
│   └── supplier.controller.js           # Request/response handlers and static lookup data
├── services/
│   └── supplier.service.js              # Business logic, auto-numbering, scoring, and async integrations
├── validation/
│   └── supplier.schema.js               # Zod schemas: CreateSupplier, UpdateSupplier, AddContact, CreateScorecard, IdParam
└── migrations/
    ├── 060_create_supplier_quality.js   # Sequelize migration runner script
    └── phase18_supplier_quality.sql     # Full SQL schema for 8 tables
```

---

## 2. Express Route Registry

All Supplier routes require JWT Authentication (`authenticate`) and Tenant Context Resolution (`tenantContext`).

**Base Prefix**: `/api/v1/suppliers`

| Method | Endpoint | Action | RBAC Permission |
| :--- | :--- | :--- | :--- |
| **GET** | `/types` | Fetch static supplier type classifications | None (Authenticated) |
| **GET** | `/categories` | Fetch static category list | None (Authenticated) |
| **GET** | `/statuses` | Fetch static lifecycle statuses | None (Authenticated) |
| **GET** | `/audit-types` | Fetch static audit type list | None (Authenticated) |
| **GET** | `/dashboard` | Fetch quality dashboard metrics | `supplier:read` |
| **GET** | `/asl` | Fetch the Approved Supplier List | `supplier:read` |
| **POST** | `/` | Create a new supplier | `supplier:create` |
| **GET** | `/` | List and filter suppliers with pagination | `supplier:read` |
| **GET** | `/:id` | Fetch full supplier details | `supplier:read` |
| **PUT** | `/:id` | Update supplier metadata | `supplier:update` |
| **POST** | `/:id/submit` | Submit supplier for qualification workflow | `supplier:create` |
| **PATCH** | `/:id/status` | Manually update lifecycle status | `supplier:update` |
| **GET** | `/:id/contacts` | Fetch all contacts for a supplier | `supplier:read` |
| **POST** | `/:id/contacts` | Add a contact to a supplier | `supplier:create` |
| **GET** | `/:id/audits` | Fetch all audits for a supplier | `supplier:read` |
| **POST** | `/:id/audits` | Create a scheduled audit | `supplier:create` |
| **PUT** | `/:id/audits/:auditId/complete` | Complete audit with findings | `supplier:update` |
| **GET** | `/:id/scorecards` | Fetch performance scorecards | `supplier:read` |
| **POST** | `/:id/scorecards` | Create a performance scorecard | `supplier:create` |
| **POST** | `/:id/asl` | Add supplier to Approved Supplier List | `supplier:create` |

---

## 3. Zod Validation Schemas (`supplier.schema.js`)

### 3.1 `CreateSupplierSchema`

| Field | Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `name` | `string` | ✅ | Min 2 chars |
| `supplier_type` | `string` | ✅ | Min 1 char |
| `category` | `string` | ✅ | Min 1 char |
| `risk_level` | `enum` | No | `low`, `medium`, `high`; default `low` |
| `website` | `string` | No | Valid URL or empty |
| `primary_contact_email` | `string` | No | Valid email or empty |
| `products_services` | `string[]` | No | Default `[]` |
| `certifications` | `object[]` | No | `[{name, issuing_body?, expiry_date?, document_url?}]`; default `[]` |
| `quality_agreement_signed` | `boolean` | No | Default `false` |
| All address/identity fields | `string` | No | Optional/nullable |

### 3.2 `UpdateSupplierSchema`
Extends `CreateSupplierSchema` with all fields made partial. Adds `status: string (optional)`.

### 3.3 `SupplierIdParamSchema`
`{ id: string (UUID) }` — validated on contacts and scorecards param routes.

### 3.4 `AddContactSchema`

| Field | Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `name` | `string` | ✅ | Min 2 chars |
| `email` | `string` | No | Valid email or empty |
| `is_primary` | `boolean` | No | Default `false` |
| Other fields | `string` | No | Optional/nullable |

### 3.5 `CreateScorecardSchema`

| Field | Type | Required | Validation |
| :--- | :--- | :--- | :--- |
| `period_start` | `date` | ✅ | Coerced date |
| `period_end` | `date` | ✅ | Coerced date |
| `quality_score` | `number` | No | 0–100; default `0` |
| `delivery_score` | `number` | No | 0–100; default `0` |
| `service_score` | `number` | No | 0–100; default `0` |
| `cost_score` | `number` | No | 0–100; default `0` |
| All sub-metrics | `number` | No | Default `0` |
| `notes` | `string` | No | Optional/nullable |

---

## 4. API Request & Response Examples

### 4.1 Create Supplier (`POST /`)

**Request Body**:
```json
{
  "name": "PharmaChem Raw Materials Ltd.",
  "supplier_type": "raw_material",
  "category": "critical",
  "risk_level": "high",
  "primary_contact_name": "Sarah Johnson",
  "primary_contact_email": "sarah.johnson@pharmachem.com",
  "address_line1": "100 Industrial Parkway",
  "city": "Raleigh", "state": "NC", "country": "USA",
  "certifications": [{ "name": "ISO 9001:2015", "issuing_body": "BSI Group", "expiry_date": "2027-06-30" }],
  "quality_agreement_signed": true
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
    "supplier_code": "SUP-00001",
    "name": "PharmaChem Raw Materials Ltd.",
    "category": "critical",
    "status": "pending",
    "score": { "current": null, "grade": null },
    "contacts": [],
    "latest_scorecard": null,
    "workflow_instance_id": null,
    "created_at": "2026-06-30T10:00:00.000Z"
  }
}
```

---

### 4.2 List Suppliers (`GET /?category=critical&status=approved&limit=10`)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "a1b2c3d4-...",
      "supplier_code": "SUP-00001",
      "name": "PharmaChem Raw Materials Ltd.",
      "category": "critical",
      "status": "approved",
      "score": 87.6,
      "grade": "B",
      "expiry_date": "2027-06-30T00:00:00.000Z",
      "is_expiring": false
    }
  ],
  "pagination": { "total": 42, "limit": 10, "offset": 0 }
}
```

---

### 4.3 Submit for Qualification (`POST /:id/submit`)

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "status": "qualified",
    "workflow_instance_id": "wf-instance-uuid",
    "updated_at": "2026-06-30T10:15:00.000Z"
  }
}
```

---

### 4.4 Update Status (`PATCH /:id/status`)

**Request Body**: `{ "status": "approved" }`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "a1b2c3d4-...",
    "status": "approved",
    "dates": {
      "approved": "2026-06-30T00:00:00.000Z",
      "expiry": "2027-06-30T00:00:00.000Z"
    }
  }
}
```

---

### 4.5 Create Audit (`POST /:id/audits`)

**Request Body**:
```json
{
  "audit_type": "periodic",
  "audit_scope": "Full facility audit covering documentation and process controls",
  "scheduled_date": "2026-08-15",
  "lead_auditor_id": "user-uuid-here",
  "audit_team": [{ "user_id": "user-uuid", "name": "Alice QA", "role": "Lead" }]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "audit-uuid",
    "audit_number": "SA-2026-0001",
    "audit_type": "periodic",
    "status": "planned",
    "findings": { "total": 0, "major": 0, "minor": 0, "observations": 0 },
    "capa_required": false
  }
}
```

---

### 4.6 Complete Audit (`PUT /:id/audits/:auditId/complete`)

**Request Body**:
```json
{
  "actual_date": "2026-08-16",
  "findings_count": 3,
  "major_findings": 1,
  "minor_findings": 2,
  "overall_rating": "conditional",
  "score": 72.5,
  "executive_summary": "Generally well maintained. One major finding in change control.",
  "capa_required": true,
  "next_audit_date": "2027-02-15"
}
```

---

### 4.7 Create Scorecard (`POST /:id/scorecards`)

**Request Body**:
```json
{
  "period_start": "2026-01-01",
  "period_end": "2026-06-30",
  "quality_score": 88,
  "delivery_score": 92,
  "service_score": 85,
  "cost_score": 78
}
```

**Response (201 Created)** — overall score auto-calculated:
```json
{
  "success": true,
  "data": {
    "overall": { "score": 87.6, "grade": "B" },
    "quality": { "score": 88 },
    "delivery": { "score": 92 },
    "service": { "score": 85 },
    "cost": { "score": 78 }
  }
}
```

> **Formula**: `(88 × 0.4) + (92 × 0.3) + (85 × 0.2) + (78 × 0.1) = 87.6`

---

### 4.8 Add to ASL (`POST /:id/asl`)

**Request Body**:
```json
{
  "material_category": "API",
  "material_codes": ["RM-4901", "RM-4902"],
  "approval_scope": "Approved for API supply in bulk form",
  "approved_date": "2026-06-30",
  "expiry_date": "2027-06-30"
}
```

---

### 4.9 Fetch Dashboard (`GET /dashboard`)

**Response**:
```json
{
  "success": true,
  "data": {
    "summary": {
      "approved": 28,
      "pending": 5,
      "in_qualification": 4,
      "suspended": 2,
      "expiring_soon": 3,
      "critical": 12,
      "average_score": 83.4
    },
    "by_grade": { "A": 8, "B": 12, "C": 5, "D": 2, "F": 1 }
  }
}
```

---

## 5. Static Lookup Endpoint Data

### `GET /types`
```json
[
  { "code": "manufacturer", "name": "Manufacturer" },
  { "code": "distributor", "name": "Distributor" },
  { "code": "service_provider", "name": "Service Provider" },
  { "code": "raw_material", "name": "Raw Material Supplier" },
  { "code": "contract_manufacturer", "name": "Contract Manufacturer" },
  { "code": "logistics", "name": "Logistics Provider" }
]
```

### `GET /categories`
```json
[
  { "code": "critical", "name": "Critical", "description": "Direct impact on product quality" },
  { "code": "major", "name": "Major", "description": "Significant impact on operations" },
  { "code": "minor", "name": "Minor", "description": "Limited impact" }
]
```

### `GET /statuses`
```json
[
  { "code": "pending", "name": "Pending" },
  { "code": "qualified", "name": "Qualified" },
  { "code": "approved", "name": "Approved" },
  { "code": "conditional", "name": "Conditional Approval" },
  { "code": "suspended", "name": "Suspended" },
  { "code": "disqualified", "name": "Disqualified" }
]
```

### `GET /audit-types`
```json
[
  { "code": "initial", "name": "Initial Qualification" },
  { "code": "periodic", "name": "Periodic/Surveillance" },
  { "code": "for_cause", "name": "For Cause" },
  { "code": "follow_up", "name": "Follow-Up" },
  { "code": "desktop", "name": "Desktop Review" }
]
```
