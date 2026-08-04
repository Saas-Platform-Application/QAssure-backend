# QAssure CAPA Service — Testing & Test Cases

---

## 1. Test Strategy Overview

Testing for the CAPA service focuses on verifying the integrity of quality investigations and compliance checks:
1.  **Workflow Gating**: Ensuring status changes follow correct sequences (e.g. Draft -> Submitted/Open -> Investigation -> Actions -> Verification -> Closed).
2.  **8D Sequencing**: Verifying each discipline section (D1 to D8) can be saved, completed, and progress is recorded.
3.  **Action Item Management**: Validating action item creations, assignment changes, evidence uploads, and verification approvals.
4.  **SLA calculations**: Checking if overdue status calculations react correctly when `target_date` is passed.
5.  **Multi-Tenant Privacy**: Validating that tenant ID scopes prevent cross-tenant CAPA lookups and modifications.

---

## 2. Test Case Matrix

| ID | Module | Target Case Description | Input Data / Params | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **CAPA-TC-01** | CAPA CRUD | Create CAPA (without 8D) | Title, type, source, priority, target date | CAPA created in `draft` status; formatted `CAPA-YYYY-XXXX` generated. |
| **CAPA-TC-02** | CAPA CRUD | Create CAPA (with 8D) | Title, type, source, `use_8d: true` | CAPA created; corresponding row in `capa_8d_reports` initialized. |
| **CAPA-TC-03** | CAPA CRUD | Fetch CAPA by ID | CAPA UUID, tenant ID | Complete CAPA details with owner, actions list, and `has_8d_report` flag. |
| **CAPA-TC-04** | CAPA CRUD | Update CAPA details | Update fields (description, owner_id) | Updates database; records audit trail log detailing updated fields. |
| **CAPA-TC-05** | Workflow | Submit CAPA for Investigation | CAPA UUID | Triggers `capa_workflow`; CAPA status updates to `open` (200 OK). |
| **CAPA-TC-06** | Workflow | Manually Patch Status | status: "investigation" | Status changed; audits logged; email notification sent to owner. |
| **CAPA-TC-07** | Actions | Add Action Item | description, type, assignee, due_date | Appends action item to CAPA; status initialized to `pending`. |
| **CAPA-TC-08** | Actions | Complete Action Item | Action ID, evidence, status: "completed"| Sets completed date to now; logs evidence text. |
| **CAPA-TC-09** | 8D Report | Update 8D Section | Section: "d1", team list, mark_complete | Saves team JSON; sets `d1_completed_at` to current timestamp. |
| **CAPA-TC-10** | Dashboard | Fetch Dashboard Metrics | Auth Token, tenant ID | Returns breakdown of open, critical, overdue CAPAs and status lists. |
| **CAPA-TC-11** | Security | Cross-tenant CAPA isolation | User B, CAPA UUID from Tenant A | Returns `404 Not Found` or block access, preventing data leaks. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: CAPA Lifecycle & 8D Report Progression
1.  **Action**: Create a CAPA for Tenant A with `use_8d: true` and `priority: "high"`.
    *   *Check*: Confirm status is `draft` and a corresponding 8D entry exists in the database.
2.  **Action**: Submit the CAPA using `POST /api/v1/capas/{id}/submit`.
    *   *Check*: Verify the status updates to `open` and a workflow instance is registered.
3.  **Action**: Update the 8D report team details in D1 (`PUT /api/v1/capas/{id}/8d/d1`).
    *   *Check*: Verify `d1_team` is populated and `d1_completed_at` is set.
4.  **Action**: Fill the D2 problem description using the 5W2H framework (`PUT /api/v1/capas/{id}/8d/d2`).
    *   *Check*: Confirm 5W2H columns are populated in `capa_8d_reports`.
5.  **Action**: Update the CAPA status to `closed` using `PATCH /api/v1/capas/{id}/status`.
    *   *Check*: Confirm the CAPA closed date is logged.

### Scenario B: Action Item Creation & Verification Gating
1.  **Action**: Log a CAPA action item with status `pending`.
2.  **Action**: Update the action item status to `completed`, uploading mock evidence text.
    *   *Check*: Verify `completed_date` is populated on the action item.
3.  **Action**: Query `GET /api/v1/capas/{id}/actions`.
    *   *Check*: Confirm the action item is returned with completed details.
