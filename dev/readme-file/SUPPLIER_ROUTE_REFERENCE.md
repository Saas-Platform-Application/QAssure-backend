# Supplier Quality Management (SQM) API Reference

The `/suppliers` route (registered as `/api/v1/suppliers`) manages the lifecycle of external vendors, including qualification, auditing, and performance monitoring (ASL).

## Base URL
`{{API_BASE_URL}}/api/v1/suppliers`

---

## 1. Supplier Master Data (CRUD)

### Create Supplier
`POST /`
Registers a new supplier in the system.
- **Permissions**: `supplier:write`
- **Key Fields**: `name`, `supplier_code`, `supplier_type`, `category`, `risk_level` (Critical/Major/Minor).

### List Suppliers
`GET /`
- **Filters**: `status`, `category`, `risk_level`, `search`.

### Get Supplier Details
`GET /:id`
- **Returns**: Full profile including contacts, active status, and latest performance grade.

---

## 2. Qualification & Workflow

### Submit for Approval
`POST /:id/submit`
- **Action**: Starts the formal `supplier_approval` workflow. Moves status to `Qualified`.

### Update Status
`PUT /:id/status`
- **Statuses**: `pending`, `qualified`, `approved`, `conditional`, `suspended`, `disqualified`.

---

## 3. Audit Management

### Schedule Audit
`POST /audits`
- **Fields**: `audit_type`, `scheduled_date`, `lead_auditor_id`, `audit_scope`.

### Complete Audit
`POST /audits/:id/complete`
- **Fields**: `major_findings`, `minor_findings`, `observations`, `overall_rating`, `capa_required`.

---

## 4. Performance & Scorecards

### Create Scorecard
`POST /:id/scorecards`
- **Metric Categories**: 
  - **Quality (40%)**: Defect rates, lot acceptance.
  - **Delivery (30%)**: On-time performance.
  - **Service (20%)**: Responsiveness.
  - **Cost (10%)**: Price competitiveness.
- **Result**: Automatically calculates Grade (A, B, C, D, F).

---

## 5. Approved Supplier List (ASL) & Dashboard

### Get ASL
`GET /asl`
- **Action**: Returns the "Golden List" of currently active and approved vendors for procurement.

### Dashboard Stats
`GET /dashboard`
- **Stats**: Total approved, critical suppliers, average score, and upcoming certificate expirations.

---

## 6. Key Business Logic
- **Automatic Code Generation**: Suppliers are assigned a unique code (e.g., `SUP-00001`) upon creation.
- **Risk-Based Auditing**: Critical suppliers are flagged for more frequent audits.
- **Expiry Protection**: The system tracks `expiry_date` (usually 1 year from approval) to ensure compliance.
