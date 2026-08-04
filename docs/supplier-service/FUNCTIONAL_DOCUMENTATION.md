# QAssure Supplier Service — Functional Documentation

---

## 1. Functional Scope

The **Supplier Quality Management Service** governs the entire relationship between a manufacturing or service organization and its external supply chain. It enforces formal supplier qualification processes, ongoing audit scheduling, quantified performance scoring, and the maintenance of a compliant Approved Supplier List (ASL). The service is a foundational control point for ISO 13485 Section 7.4 (Purchasing) and FDA 21 CFR Part 820 Subpart E (Purchasing Controls) compliance.

---

## 2. Key Modules & Features

### 2.1 Supplier Registration & Auto-Code Generation
*   **Onboarding**: New suppliers can be registered with full organizational details — type, category, risk level, contact information, address, business identifiers (Tax ID, DUNS), certifications, and products/services.
*   **Auto-Code Generation**: When a new supplier is created without providing a `supplier_code`, the system generates one automatically. The format is `SUP-XXXXX` (e.g., `SUP-00001`), where `XXXXX` is a 5-digit zero-padded counter scoped to the active tenant.
*   **Initial Status**: All newly registered suppliers start with a `status` of `'pending'`, indicating they have not yet been qualified.

---

### 2.2 Supplier Status Lifecycle
The supplier record moves through a defined lifecycle:

```
pending → [submit] → qualified → [approve] → approved
                                           → conditional (conditional approval)
                ↓                          → suspended
          disqualified ←──────────────────┘
```

| Status | Description |
| :--- | :--- |
| `pending` | Newly registered; not yet qualified. |
| `qualified` | Submitted for qualification review; workflow started. |
| `approved` | Fully approved for procurement. Approval expiry date set +1 year. |
| `conditional` | Approved with conditions or restrictions. |
| `suspended` | Temporarily disqualified; procurement halted. |
| `disqualified` | Permanently removed from the approved supply base. |

*   **Approval Expiry**: When a supplier transitions to `approved`, the system automatically sets `approved_date` to the current date and `expiry_date` to exactly one year later. Suppliers within 30 days of expiry are flagged as `expiring_soon` in the dashboard.
*   **Notifications**: Status changes to `approved`, `suspended`, or `disqualified` trigger priority-appropriate notifications to quality managers.

---

### 2.3 Supplier Qualification Workflow
The formal qualification process integrates with the QAssure Workflow Engine:
1.  The quality team registers the supplier (`POST /api/v1/suppliers`).
2.  Once ready, the record is submitted using `POST /api/v1/suppliers/:id/submit`.
3.  This triggers the `supplier_approval` workflow definition, which routes through configured approval stages.
4.  The status is immediately updated to `'qualified'` and the `workflow_instance_id` is stored on the record.

---

### 2.4 Contact Management
Suppliers can have multiple named contacts for different communication functions:
*   **Contact Types**: `primary`, `quality`, `sales`, `technical`, `emergency`.
*   **Primary Flag**: One contact can be marked as `is_primary: true`. Contacts are returned ordered by primary flag first, then alphabetically by name.
*   The supplier master record also stores `primary_contact_name`, `primary_contact_email`, and `primary_contact_phone` as convenience fields for quick access.

---

### 2.5 Supplier Audit Management
The system manages structured audits of suppliers with auto-generated audit numbers:
*   **Audit Number Format**: `SA-YYYY-XXXX` (e.g., `SA-2026-0001`), where `YYYY` is the current year and `XXXX` is a zero-padded sequential counter scoped to the tenant's audit log for that year.
*   **Audit Types**:
    *   `initial` — Initial qualification audit for new suppliers.
    *   `periodic` — Routine surveillance audit on existing approved suppliers.
    *   `for_cause` — Triggered by a specific quality event or complaint.
    *   `follow_up` — Verifies corrective actions from a previous audit.
    *   `desktop` — Remote document-based review audit.
*   **Audit Lifecycle**: `planned` → `in_progress` → `completed` or `cancelled`.
*   **Completion**: When an audit is completed (`PUT /:id/audits/:auditId/complete`), the system:
    1.  Updates the audit record with findings counts, rating, score, summary, and next audit date.
    2.  Automatically updates the parent supplier's `last_audit_date` and `next_audit_date` fields.
    3.  Writes a GxP audit trail entry to the `AuditService`.

---

### 2.6 Performance Scorecard System
The scorecard system provides a quantitative view of supplier performance over evaluation periods using a weighted scoring model:

| Dimension | Weight | Key Metrics |
| :--- | :--- | :--- |
| **Quality** | 40% | `quality_score`, `defect_rate`, `lot_acceptance_rate`, `complaints_count` |
| **Delivery** | 30% | `delivery_score`, `on_time_delivery_rate`, `lead_time_adherence` |
| **Service** | 20% | `service_score`, `responsiveness_score`, `documentation_score` |
| **Cost** | 10% | `cost_score`, `price_competitiveness` |

*   **Overall Score Calculation**: `overall_score = (quality × 0.4) + (delivery × 0.3) + (service × 0.2) + (cost × 0.1)`
*   **Grade Assignment**:
    *   `A` — Score ≥ 90 (Excellent)
    *   `B` — Score ≥ 80 (Good)
    *   `C` — Score ≥ 70 (Acceptable)
    *   `D` — Score ≥ 60 (Marginal)
    *   `F` — Score < 60 (Failing)
*   **Profile Update**: After each scorecard is created, the supplier's `current_score` and `score_grade` are automatically updated for real-time visibility in list views.
*   **Period Constraint**: Each period `(supplier_id, period_start, period_end)` combination must be unique to prevent duplicate evaluations.

---

### 2.7 Approved Supplier List (ASL)
The ASL is a material-category-scoped register of suppliers authorized for procurement:
*   **Adding to ASL**: `POST /api/v1/suppliers/:id/asl` registers the supplier for a specific `material_category` (e.g., `API`, `Excipient`, `Packaging`).
*   **Unique Per Category**: The same supplier can appear on the ASL for multiple material categories but cannot be duplicated in the same category.
*   **Approval Scope & Restrictions**: Free-text fields allow documenting what the supplier is specifically approved for and any conditions that restrict usage.
*   **Expiry & Review**: ASL entries carry their own `approved_date`, `expiry_date`, and `review_date` to support periodic re-evaluation.
*   **ASL Lookup**: `GET /api/v1/suppliers/asl` returns all active ASL entries for the tenant, joined with the supplier name, code, and current score. Supports filtering by `material_category` and `status`.

---

### 2.8 Dashboard & Analytics
The dashboard endpoint (`GET /api/v1/suppliers/dashboard`) provides a real-time summary of the supplier base:

| Metric | Description |
| :--- | :--- |
| `approved` | Count of approved suppliers. |
| `pending` | Count of suppliers awaiting qualification. |
| `in_qualification` | Count of suppliers currently in the `qualified` status (under review). |
| `suspended` | Count of suspended suppliers. |
| `expiring_soon` | Count of approved suppliers whose expiry is within 30 days. |
| `critical` | Count of suppliers classified as `critical` category. |
| `average_score` | Mean current score across all scored suppliers. |
| `by_grade` | Breakdown of supplier counts by grade (`A`, `B`, `C`, `D`, `F`). |

---

## 3. FDA 21 CFR Part 820 & ISO 13485 Compliance

The Supplier Quality Service directly implements regulatory purchasing controls:

1.  **Vendor Qualification Records**: The `suppliers` table and associated contact/certification data form the formal qualification record for each vendor.
2.  **Audit Trail Logging**: All `CREATE` and `UPDATE` operations write to the platform's `AuditService` via `setImmediate` background calls, recording `action`, `user_id`, `tenant_id`, `resource_type`, `resource_id`, `response_status`, and `metadata`.
3.  **Approval Workflow Gating**: Formal supplier approval requires workflow engine completion, preventing unauthorized qualification.
4.  **Expiry Monitoring**: Approval expiry is tracked and flagged to ensure no expired suppliers remain in the active supply base without re-qualification.
5.  **Audit Linkage**: Supplier audits can be linked to CAPAs (`capa_required: true`, `capa_id` reference), creating a traceable chain from audit finding to corrective action to resolution.
