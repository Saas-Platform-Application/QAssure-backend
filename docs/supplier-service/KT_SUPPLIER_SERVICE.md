# QAssure Supplier Service

## Technical Knowledge Transfer (KT) Guide

Welcome to the technical Knowledge Transfer (KT) guide for the **Supplier Quality Management Service** of the QAssure Platform. This document outlines the service architecture, database tables, business rules (auto-code generation, scorecard weighting, approval expiry), workflow triggers, and common development tasks.

---

## 1. Architectural Overview

The Supplier Service manages the complete lifecycle of an organization's external supply base. It handles initial registration, formal qualification workflows, ongoing audit scheduling, performance scorecard calculation, and Approved Supplier List (ASL) management — all scoped strictly to multi-tenant isolation.

### Directory & Component Map

- **Routing Layer**: [supplier.routes.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/routes/supplier.routes.js) — Defines Express endpoints, enforces `authenticate`, `tenantContext`, `authorize()` RBAC, and applies Zod validation middleware before routing to the controller.
- **Controller Layer**: [supplier.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/supplier.controller.js) — Sanitizes request payloads, manages static data lookup responses (types, categories, statuses, audit types), extracts `tenantId` from `req.user.tenantId` or `req.query.tenantId`, and maps calls to service methods.
- **Service Layer**: [supplier.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/supplier.service.js) — Auto-generates supplier codes (`SUP-XXXXX`) and audit numbers (`SA-YYYY-XXXX`), manages status transitions, computes scorecard weighted grades, triggers background notifications and audit log entries, and calls `IndexingHooks.indexSupplier` for Elasticsearch.
- **Validation Layer**: [supplier.schema.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/validation/supplier.schema.js) — Zod schemas for `CreateSupplierSchema`, `UpdateSupplierSchema`, `SupplierIdParamSchema`, `AddContactSchema`, and `CreateScorecardSchema`.
- **SQL Schema**: [phase18_supplier_quality.sql](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/migrations/phase18_supplier_quality.sql) — Defines 8 tables: `suppliers`, `supplier_contacts`, `supplier_audits`, `audit_findings`, `supplier_scorecards`, `supplier_documents`, `supplier_issues`, `approved_supplier_list`.

---

## 2. System Interaction Workflows

### A. Supplier Creation Flow
```mermaid
sequenceDiagram
    autonumber
    actor User as Quality Admin
    participant Ctrl as supplier.controller
    participant Svc as supplier.service
    database DB as PostgreSQL DB
    participant ES as IndexingHooks
    participant Audit as AuditService
    participant Notif as NotificationService

    User->>Ctrl: POST /api/v1/suppliers (body)
    Ctrl->>Svc: create(tenantId, data, createdBy)
    Svc->>Svc: _generateSupplierCode(tenantId)
    Note over Svc: Returns SUP-XXXXX format
    Svc->>DB: INSERT INTO suppliers (status = 'pending')
    Svc->>DB: SELECT * FROM suppliers (with contacts, scorecard)
    Svc->>ES: IndexingHooks.indexSupplier(supplier, tenantId)
    Svc->>Audit: log({ action: 'CREATE', resource_type: 'supplier' })
    Svc->>Notif: sendByRole(tenantId, 'quality_manager', notification)
    Svc->>Svc: ModuleService.sendIdentityUpdate('create', 'supplier', ...)
    Svc-->>Ctrl: Formatted supplier object
    Ctrl-->>User: 201 Created Response JSON
```

---

### B. Supplier Qualification Workflow Submission
```mermaid
sequenceDiagram
    autonumber
    actor User as Quality Owner
    participant Ctrl as supplier.controller
    participant Svc as supplier.service
    participant WF as workflow-engine.service
    database DB as PostgreSQL DB

    User->>Ctrl: POST /api/v1/suppliers/:id/submit
    Ctrl->>Svc: submitForApproval(id, tenantId, submittedBy)
    Note over Svc: Validates status === 'pending'
    Svc->>WF: startWorkflow({ workflowCode: 'supplier_approval', entityType: 'supplier', context: { category, risk_level } })
    WF-->>Svc: workflow instance (instanceId)
    Svc->>DB: UPDATE suppliers SET status = 'qualified', workflow_instance_id = instanceId
    Svc->>Svc: AuditService.log(action: 'UPDATE', action: 'submitted_for_approval')
    Svc-->>Ctrl: Updated supplier details
    Ctrl-->>User: 200 OK Response JSON
```

---

### C. Scorecard Creation & Grade Calculation
```mermaid
sequenceDiagram
    autonumber
    actor User as Quality Evaluator
    participant Svc as supplier.service
    database DB as PostgreSQL DB

    User->>Svc: createScorecard(supplierId, tenantId, data, createdBy)
    Note over Svc: Calculates weighted overall score
    Note over Svc: overall = (quality×0.4) + (delivery×0.3) + (service×0.2) + (cost×0.1)
    Svc->>Svc: _calculateGrade(overallScore)
    Svc->>DB: INSERT INTO supplier_scorecards
    Svc->>DB: UPDATE suppliers SET current_score = overallScore, score_grade = grade
    Svc-->>User: Formatted scorecard object
```

---

### D. Audit Completion & Supplier Profile Sync
```mermaid
sequenceDiagram
    autonumber
    actor Auditor
    participant Svc as supplier.service
    database DB as PostgreSQL DB
    participant Audit as AuditService

    Auditor->>Svc: completeAudit(auditId, tenantId, data, updatedBy)
    Svc->>DB: UPDATE supplier_audits SET status='completed', findings, rating, score, next_audit_date
    Svc->>DB: SELECT supplier_id FROM supplier_audits WHERE id = auditId
    Svc->>DB: UPDATE suppliers SET last_audit_date, next_audit_date
    Svc->>Audit: log({ action: 'UPDATE', action: 'supplier_audit_completed' })
    Svc-->>Auditor: Updated audit object
```

---

## 3. Key Implementation Details

### A. Supplier Code Auto-Generation
Defined in `SupplierService._generateSupplierCode()`:

```javascript
async _generateSupplierCode(tenantId) {
  const result = await this.pool.query(
    'SELECT COUNT(*) + 1 as next_num FROM suppliers WHERE tenant_id = $1',
    [tenantId]
  );
  return `SUP-${String(result.rows[0].next_num).padStart(5, '0')}`;
}
```
*   Format: `SUP-XXXXX` (e.g., `SUP-00001`), zero-padded to 5 digits.
*   Scoped to `tenant_id` to prevent cross-tenant code conflicts.

---

### B. Audit Number Auto-Generation
Defined in `SupplierService._generateAuditNumber()`:

```javascript
async _generateAuditNumber(tenantId) {
  const year = new Date().getFullYear();
  const result = await this.pool.query(
    `SELECT COUNT(*) + 1 as next_num FROM supplier_audits WHERE tenant_id = $1 AND audit_number LIKE $2`,
    [tenantId, `SA-${year}-%`]
  );
  return `SA-${year}-${String(result.rows[0].next_num).padStart(4, '0')}`;
}
```
*   Format: `SA-YYYY-XXXX` (e.g., `SA-2026-0001`).
*   Counter resets per year, scoped to tenant.

---

### C. Scorecard Grade Calculation

```javascript
_calculateGrade(score) {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
```

*   Weights: Quality 40%, Delivery 30%, Service 20%, Cost 10%.
*   After every scorecard creation, `current_score` and `score_grade` on the `suppliers` table are automatically updated.

---

### D. Approval Expiry Auto-Set
In `SupplierService.updateStatus()`, when `newStatus === 'approved'`:
```javascript
const expiry = new Date();
expiry.setFullYear(expiry.getFullYear() + 1);
updates.expiry_date = expiry;
```
*   `approved_date` is set to `NOW()`.
*   `expiry_date` is set to exactly 1 year from the approval date.
*   The dashboard `expiring_soon` metric queries: `expiry_date < NOW() + INTERVAL '30 days'`.

---

### E. Data Formatting Helpers
Three private formatters normalize raw DB rows into consistent API payloads:

*   `_formatSupplier(s, contacts, scorecard)` — Full detail payload with nested `contact`, `address`, `quality_agreement`, `dates`, `score`, `contacts[]`, and `latest_scorecard`.
*   `_formatSupplierSummary(s)` — Lightweight list payload with `is_expiring` computed field.
*   `_formatAudit(a)` — Audit payload with nested `findings` object and auditor email.
*   `_formatScorecard(s)` — Scorecard payload with nested dimension objects (`quality`, `delivery`, `service`, `cost`, `overall`).

---

## 4. Developer KT Cheat Sheet: Common Tasks

### A. How to Add a New Supplier Type?
1.  Open [supplier.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/supplier.controller.js).
2.  Locate `getTypes(req, res)` and add a new object to the array:
    ```javascript
    { code: 'calibration_lab', name: 'Calibration Laboratory' }
    ```
3.  No database changes required — types are static lookup data.

---

### B. How to Change Scorecard Weighting?
1.  Open [supplier.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/supplier.service.js).
2.  Locate `createScorecard()` and modify the `weights` object:
    ```javascript
    const weights = { quality: 0.4, delivery: 0.3, service: 0.2, cost: 0.1 };
    // Example: increase quality weight
    const weights = { quality: 0.5, delivery: 0.25, service: 0.15, cost: 0.1 };
    ```
3.  Note: All weights must sum to 1.0.

---

### C. How to Add a New Notification Trigger?
1.  Open [supplier.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/supplier.service.js).
2.  In `submitForApproval`, add a `setImmediate` block after the workflow start:
    ```javascript
    setImmediate(async () => {
      try {
        await getNotificationService().sendByRole(tenantId, 'quality_manager', {
          title: `Supplier Submitted: ${supplier.name}`,
          message: `${supplier.supplier_code} has been submitted for qualification review`,
          notification_type: 'info',
          category: 'supplier',
          priority: 'normal',
          entity_type: 'supplier',
          entity_id: supplierId,
          action_url: `/suppliers/${supplierId}`
        });
      } catch (e) { console.warn('[SupplierService] Notification failed:', e.message); }
    });
    ```

---

### D. How to Add a New Allowed Update Field?
1.  Open [supplier.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/supplier.service.js).
2.  Locate `update()` and add the new field name to the `allowedFields` array:
    ```javascript
    const allowedFields = [
      'name', 'legal_name', ..., 'your_new_field'
    ];
    ```
3.  If the field has a special type (JSONB, array), add the appropriate cast in the loop:
    ```javascript
    } else if (key === 'your_new_jsonb_field') {
      setClauses.push(`${key} = $${paramIndex++}::jsonb`);
      values.push(JSON.stringify(value));
    }
    ```
4.  Update `UpdateSupplierSchema` in [supplier.schema.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/validation/supplier.schema.js) to include the field.

---

### E. How to Query Expiring Suppliers?
Direct SQL query against the `suppliers` table:
```sql
SELECT supplier_code, name, expiry_date, status
FROM suppliers
WHERE tenant_id = '<tenant_uuid>'
  AND status = 'approved'
  AND expiry_date < NOW() + INTERVAL '30 days'
ORDER BY expiry_date ASC;
```
