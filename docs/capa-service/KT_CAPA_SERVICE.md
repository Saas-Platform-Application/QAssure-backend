# QAssure CAPA Service

## Technical Knowledge Transfer (KT) Guide

Welcome to the technical Knowledge Transfer (KT) guide for the **Corrective and Preventive Action (CAPA) Service** of the QAssure Platform. This document outlines the service's architecture, database tables, business rules (SLA calculation, auto-number generation), 8D methodology stages, workflow triggers, and common development tasks.

---

## 1. Architectural Overview

The CAPA Service handles the lifecycle of non-conformances, quality audits, customer complaints, supplier quality issues, and systemic deviations. It manages root-cause investigations via the 8D framework and coordinates action completions with the QAssure Workflow Engine.

### Directory & Component Map

- **Routing Layer**: [capa.routes.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/routes/capa.routes.js) defines Express endpoints, assigns authorization rules (`authorize('capa:read')`, `authorize('capa:write')`), and gates routes behind JWT authentication.
- **Controller Layer**: [capa.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/capa.controller.js) sanitizes payloads, manages static data lookups, and maps request params to service operations.
- **Service Layer**: [capa.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/capa.service.js) generates auto-incremented CAPA numbers (e.g., `CAPA-YYYY-XXXX`), manages status updates, triggers notification events, indexes entities to Elasticsearch, and writes GxP audit entries.
- **Sequelize Models**: Defined under `src/sequelize-models/`, including `capa.js` (main record), `capa_actions.js` (associated task items), `capa_8d_reports.js` (the 8D stage details), `capa_related_record.js` (cross-references), and `capa_metric.js` (analytics/aggregations).

---

## 2. System Interaction Workflows

### A. CAPA Creation and 8D Report Init
This sequence details how a new CAPA is initialized and, if configured, registers its linked 8D report table.

```mermaid
sequenceDiagram
    autonumber
    actor User as Quality Admin
    participant Ctrl as capa.controller
    participant Svc as capa.service
    database DB as PostgreSQL DB
    participant ES as IndexingHooks
    
    User->>Ctrl: POST /api/v1/capas (body)
    Ctrl->>Svc: create(tenantId, data, createdBy)
    Note over Svc: Starts database transaction
    Svc->>Svc: _generateCapaNumber(client, tenantId)
    Svc->>DB: INSERT INTO capas (status = 'draft')
    
    alt use_8d is true
        Svc->>DB: INSERT INTO capa_8d_reports (capa_id, tenant_id)
    end
    
    Svc->>DB: COMMIT Transaction
    Svc->>ES: indexCapa(capa, tenantId)
    Svc->>Svc: _audit('CREATE', ...)
    Svc-->>Ctrl: Compiled CAPA Details
    Ctrl-->>User: 201 Created Response JSON
```

---

### B. CAPA Submission and Workflow Engine Activation
This sequence details submitting a draft CAPA to trigger the QAssure Workflow Engine.

```mermaid
sequenceDiagram
    autonumber
    actor User as Quality Owner
    participant Ctrl as capa.controller
    participant Svc as capa.service
    participant WF as workflow-engine.service
    database DB as PostgreSQL DB
    
    User->>Ctrl: POST /api/v1/capas/:id/submit
    Ctrl->>Svc: submitForInvestigation(id, tenantId, submittedBy)
    Note over Svc: Verifies status is 'draft'
    Svc->>WF: startWorkflow(capa_workflow, context)
    WF-->>Svc: Workflow instance details (instanceId)
    Svc->>DB: UPDATE capas SET status = 'open', workflow_instance_id = instanceId
    Svc->>Svc: _audit('UPDATE', ...)
    Svc->>Svc: Send Notification to Owner (capa_assigned)
    Svc-->>Ctrl: Updated CAPA Details
    Ctrl-->>User: 200 OK Response JSON
```

---

### C. Action Item Assignment and Verification Loop
This sequence details adding checklist items, complete validations, and quality manager sign-off.

```mermaid
sequenceDiagram
    autonumber
    actor Owner as CAPA Owner
    actor Quality as Quality Manager
    participant Svc as capa.service
    database DB as PostgreSQL DB
    
    Owner->>Svc: addAction(capaId, tenantId, actionData, createdBy)
    Svc->>DB: INSERT INTO capa_actions (status = 'pending')
    Svc-->>Owner: Action details
    
    Note over Owner: Executes task
    Owner->>Svc: updateAction(actionId, tenantId, { status: 'completed', evidence })
    Svc->>DB: UPDATE capa_actions SET completed_date = NOW(), status = 'completed', evidence
    
    Note over Quality: Reviews evidence
    Quality->>Svc: updateAction(actionId, tenantId, { verified_by, verification_notes })
    Svc->>DB: UPDATE capa_actions SET verified_by, verified_at = NOW(), verification_notes
    Svc-->>Quality: Verification logged
```

---

## 3. Key Implementation Details

### A. CAPA Number Formatting
Auto-generated inside `src/services/capa.service.js` under `_generateCapaNumber()`:
* Formula: `CAPA-YYYY-XXXX` where `YYYY` is the current year (e.g. `2026`) and `XXXX` is a 4-digit zero-padded sequential counter scoped to the active tenant's CAPA logs.
* Code:
  ```javascript
  const year = new Date().getFullYear();
  const result = await client.query(
    `SELECT COUNT(*) + 1 as next_num FROM capas WHERE tenant_id = $1 AND capa_number LIKE $2`,
    [tenantId, `CAPA-${year}-%`]
  );
  return `CAPA-${year}-${String(result.rows[0].next_num).padStart(4, '0')}`;
  ```

### B. SLA Priority Mapping
Configured dynamically inside `capa.controller.js` under `getPriorities()`. The service returns the standard SLA mapping:
* **Critical**: SLA is 7 days.
* **High**: SLA is 14 days.
* **Medium**: SLA is 30 days.
* **Low**: SLA is 60 days.

---

## 4. Developer KT Cheat Sheet: Common Tasks

### A. How to Add a New CAPA Source?
1. Open [capa.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/capa.controller.js).
2. Locate `getSources(req, res)` and add a new dictionary object to the array:
   ```javascript
   { code: 'ncr', name: 'Non-Conformance Report (NCR)' }
   ```
3. Update the database table constraint if validation constraints are enforced on the `source` column.

### B. How to Update 8D Section Validations?
1. Open [capa.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/capa.service.js).
2. Locate `update8DSection(capaId, tenantId, section, data, updatedBy)`.
3. Add validation logic check before performing the update. For example, to ensure D2 (Problem Description) is filled before allowing D3 (Containment) updates:
   ```javascript
   if (section === 'd3') {
     const report = await this.get8DReport(capaId, tenantId);
     if (!report.d2_completed_at) {
       throw new Error('Section D2 must be marked complete before initiating D3 containment.');
     }
   }
   ```

### C. How to Add a Custom Notification Trigger?
1. Open [capa.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/capa.service.js).
2. In `updateStatus`, locate the notification trigger section and add a status-specific template check:
   ```javascript
   let template = 'capa_assigned';
   if (newStatus === 'closed') {
     template = 'capa_closed';
   } else if (newStatus === 'investigation') {
     template = 'capa_investigation_started';
   }
   ```
3. Ensure the notification code is seeded in the platform's `notification_categories` system.
