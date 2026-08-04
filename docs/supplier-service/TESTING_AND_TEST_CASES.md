# QAssure Supplier Service — Testing & Test Cases

---

## 1. Test Strategy Overview

Testing for the Supplier Quality Management Service focuses on verifying the integrity of supplier qualification controls, performance measurement, and compliance requirements:

1.  **Supplier Lifecycle Gating**: Ensuring status transitions follow the correct sequence and only permitted transitions are allowed (e.g., only `pending` suppliers can be submitted for qualification).
2.  **Auto-Code Generation**: Validating that `SUP-XXXXX` and `SA-YYYY-XXXX` codes are correctly formatted, sequential, and tenant-scoped.
3.  **Scorecard Calculation**: Verifying that the weighted scoring formula produces correct `overall_score` and that grade boundaries (`A`/`B`/`C`/`D`/`F`) are accurately applied.
4.  **Approval Expiry Automation**: Checking that `approved_date` and `expiry_date` are auto-set when status transitions to `approved`.
5.  **Audit Completion Sync**: Validating that `last_audit_date` and `next_audit_date` are updated on the parent supplier when an audit is completed.
6.  **Multi-Tenant Isolation**: Validating that tenant ID scopes prevent cross-tenant supplier, contact, audit, scorecard, and ASL access.

---

## 2. Test Case Matrix

| ID | Module | Target Case Description | Input Data / Params | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **SUP-TC-01** | Supplier CRUD | Create supplier without supplier_code | name, type, category, risk_level | Supplier created with `status: 'pending'`; auto-generated `SUP-XXXXX` code assigned. |
| **SUP-TC-02** | Supplier CRUD | Create supplier with custom supplier_code | `supplier_code: "EXT-001"` | Supplier created with the provided code, not the auto-generated one. |
| **SUP-TC-03** | Supplier CRUD | Fetch supplier by ID | Supplier UUID, tenant ID | Full supplier details including contacts array, latest scorecard, and address object. |
| **SUP-TC-04** | Supplier CRUD | Update supplier allowed fields | `{ name, legal_name, risk_level }` | Updates database; returns updated supplier; writes audit log entry. |
| **SUP-TC-05** | Supplier CRUD | List suppliers with filters | `?status=approved&category=critical` | Returns only suppliers matching both filters for the tenant. |
| **SUP-TC-06** | Supplier CRUD | List suppliers with search | `?search=pharma` | Returns suppliers where `name` or `supplier_code` contains "pharma" (ILIKE). |
| **SUP-TC-07** | Workflow | Submit pending supplier | Supplier UUID in `pending` status | Status updates to `qualified`; `workflow_instance_id` populated; audit log written. |
| **SUP-TC-08** | Workflow | Submit non-pending supplier | Supplier UUID in `approved` status | Throws `'Only pending suppliers can be submitted'` error; returns 500. |
| **SUP-TC-09** | Workflow | Patch status to approved | `{ status: "approved" }` | Status updates to `approved`; `approved_date` = today; `expiry_date` = today + 1 year. |
| **SUP-TC-10** | Workflow | Patch invalid status | `{ status: "unknown_status" }` | Throws `'Invalid status'` error. |
| **SUP-TC-11** | Contacts | Add contact to supplier | name, email, contact_type, is_primary | Contact created; returned in `contacts` array when fetching supplier by ID. |
| **SUP-TC-12** | Contacts | Add primary contact | `is_primary: true` | Contact flagged as primary; appears first in contacts ordering. |
| **SUP-TC-13** | Audits | Create supplier audit | audit_type, scheduled_date, lead_auditor_id | Audit created with `status: 'planned'` and auto-generated `SA-YYYY-XXXX` number. |
| **SUP-TC-14** | Audits | Complete audit | auditId, findings, overall_rating, next_audit_date | Audit status = `completed`; supplier `last_audit_date` and `next_audit_date` auto-updated. |
| **SUP-TC-15** | Audits | Audit with CAPA required | `capa_required: true` | Audit record flags `capa_required = true` for CAPA linkage. |
| **SUP-TC-16** | Scorecards | Create scorecard | All 4 dimension scores | `overall_score` calculated via weighted formula; `grade` assigned; supplier profile updated. |
| **SUP-TC-17** | Scorecards | Scorecard grade boundaries | Scores exactly at 90, 80, 70, 60 | Grade `A`, `B`, `C`, `D` respectively assigned at boundary values. |
| **SUP-TC-18** | Scorecards | Duplicate period scorecard | Same `period_start`, `period_end` | DB unique constraint fails; 500 error returned. |
| **SUP-TC-19** | ASL | Add supplier to ASL | supplier_id, material_category, approved_date | ASL record created with `status: 'active'`. |
| **SUP-TC-20** | ASL | Fetch ASL list | Tenant-scoped query | Returns all active ASL entries joined with supplier code, name, and current score. |
| **SUP-TC-21** | Dashboard | Fetch dashboard metrics | Auth token, tenant ID | Returns approved/pending/qualification counts, expiring_soon, critical count, avg_score, by_grade. |
| **SUP-TC-22** | Security | Cross-tenant supplier access | User from Tenant B, supplier UUID from Tenant A | `getById` returns `null`; 404 Not Found response. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Full Supplier Lifecycle — Registration to Approval
1.  **Action**: Create a new supplier with `supplier_type: 'raw_material'`, `category: 'critical'`, `risk_level: 'high'`.
    *   *Check*: Status is `'pending'`; `supplier_code` is auto-generated as `SUP-XXXXX`; `score.current` is `null`.
2.  **Action**: Submit supplier using `POST /api/v1/suppliers/{id}/submit`.
    *   *Check*: Status updates to `'qualified'`; `workflow_instance_id` is populated.
3.  **Action**: Update status using `PATCH /api/v1/suppliers/{id}/status` with `{ "status": "approved" }`.
    *   *Check*: `approved_date` = today; `expiry_date` = today + 1 year.
4.  **Action**: Fetch dashboard `GET /api/v1/suppliers/dashboard`.
    *   *Check*: `summary.approved` count has increased by 1.

---

### Scenario B: Audit Lifecycle & Supplier Profile Sync
1.  **Action**: Create an audit with `audit_type: 'periodic'` and `scheduled_date` in the future.
    *   *Check*: Audit created with `status: 'planned'`; `audit_number` is `SA-YYYY-XXXX`.
2.  **Action**: Complete the audit with findings, rating, and `next_audit_date`.
    *   *Check*: Audit status = `'completed'`; parent supplier's `last_audit_date` updated to `actual_date`; `next_audit_date` updated.
3.  **Action**: Fetch supplier by ID.
    *   *Check*: `dates.last_audit` reflects the completed audit date.

---

### Scenario C: Scorecard Weighting Validation
1.  **Action**: Create a scorecard with `quality_score: 100`, `delivery_score: 100`, `service_score: 100`, `cost_score: 100`.
    *   *Check*: `overall.score` = 100; `overall.grade` = `'A'`.
2.  **Action**: Create a scorecard with `quality_score: 50`, `delivery_score: 50`, `service_score: 50`, `cost_score: 50`.
    *   *Check*: `overall.score` = 50; `overall.grade` = `'F'`.
3.  **Action**: Create a scorecard with `quality_score: 90`, `delivery_score: 70`, `service_score: 80`, `cost_score: 60`.
    *   *Check*: `overall.score` = `(90×0.4) + (70×0.3) + (80×0.2) + (60×0.1)` = `36 + 21 + 16 + 6` = **79**; `overall.grade` = `'C'`.
4.  **Action**: Fetch supplier by ID.
    *   *Check*: `score.current` and `score.grade` on the supplier profile match the latest scorecard.

---

### Scenario D: ASL Management
1.  **Action**: Add supplier to ASL with `material_category: 'API'`.
    *   *Check*: ASL record created; `status: 'active'`.
2.  **Action**: Add the same supplier to ASL with `material_category: 'Excipient'`.
    *   *Check*: Second ASL record created; supplier now has 2 ASL entries.
3.  **Action**: Attempt to add same supplier to ASL with `material_category: 'API'` again.
    *   *Check*: Unique constraint violation; 500 error returned.
4.  **Action**: Fetch `GET /api/v1/suppliers/asl?material_category=API`.
    *   *Check*: Only `API` category entries returned, with supplier name, code, and score joined.

---

### Scenario E: Multi-Tenant Isolation Validation
1.  **Action**: Authenticate as Tenant A admin. Create a supplier; record the generated UUID.
2.  **Action**: Authenticate as Tenant B admin.
3.  **Action**: Attempt `GET /api/v1/suppliers/{tenant_a_supplier_uuid}`.
    *   *Check*: Service returns `null` (tenant_id mismatch); controller returns `404 Not Found`.
4.  **Action**: List suppliers for Tenant B.
    *   *Check*: Tenant A supplier does not appear in the list.
