# QAssure CAPA Service — Functional Documentation

---

## 1. Functional Scope

The **CAPA Service** manages the investigation and resolution of quality deviations in the QAssure system. Corrective Actions (CA) address existing problems to prevent their recurrence, while Preventive Actions (PA) address potential problems to prevent their occurrence. By integrating standard workflow gating, automated SLA monitoring, and the 8D methodology, the service guarantees a structured path to resolving deviations and achieving GxP compliance.

---

## 2. Key Modules & Features

### 2.1 CAPA Registration and Auto-Numbering
*   **Identification**: Quality events (audits, supplier issues, deviations) can trigger CAPA registration.
*   **Auto-Formatting**: When a new record is created, the system locks the current year and generates a unique, sequential ID formatted as: `CAPA-YYYY-XXXX` (e.g. `CAPA-2026-0005`). This prevents duplication and simplifies referencing.
*   **Methodology Choice**: Users can toggle the `use_8d` option, which automatically creates an 8D report structure linked to the CAPA.

---

### 2.2 SLAs and Priorities
Each CAPA has a priority level that defines its expected resolution timeline (SLA days):
*   **Critical**: SLA is 7 days. Typically reserved for safety issues or major audit failures.
*   **High**: SLA is 14 days. Used for systemic failures with minor direct impact.
*   **Medium**: SLA is 30 days. Standard baseline for standard process improvements.
*   **Low**: SLA is 60 days. Minor non-conformances or long-term process adjustments.

If the CAPA's `target_date` is in the past and the CAPA is not in a `'closed'` or `'cancelled'` status, it is flagged as **Overdue** in listings and dashboard metrics.

---

### 2.3 8D (Eight Disciplines) Problem Solving Framework
The 8D methodology is structured into eight distinct checkpoints:
*   **D1: Team Assembly**: Establish a cross-functional team with a Champion and key process members.
*   **D2: Problem Description**: Define the problem using the **5W2H** framework (Who, What, When, Where, Why, How, How Many).
*   **D3: Interim Containment**: Outline immediate containment actions taken to isolate customers or products from the problem.
*   **D4: Root Cause Analysis**: Identify the root cause using tools like **5 Whys** or **Ishikawa (Fishbone) Diagrams**. Determine the escape point (where the issue bypassed controls).
*   **D5: Permanent Corrective Actions**: Formulate long-term corrective actions designed to address the root cause directly.
*   **D6: Implementation & Validation**: Plan the implementation and document the results proving that the root cause was eliminated.
*   **D7: Preventive Actions**: Identify systemic changes, such as modifying SOPs, equipment, or training programs, to prevent recurrence.
*   **D8: Closure & Team Recognition**: Capture lessons learned, archive the investigation, and recognize the team's contribution.

Each section tracks independent completion (`d1_completed_at` through `d8_closed_at`) to ensure chronological progress.

---

### 2.4 Action Checklist & Verification
CAPAs can have multiple sub-actions (`capa_actions`) of varying types (`immediate`, `containment`, `corrective`, `preventive`, `verification`):
1.  **Assignee Tracking**: Actions are assigned to specific users with individual due dates.
2.  **State Transitions**: Actions transition from `pending` -> `in_progress` -> `completed` or `cancelled`.
3.  **Completion Evidence**: Completing an action requires documenting the evidence (evidence text and attachments).
4.  **Verification Gate**: Quality administrators must verify the evidence, log `verification_notes`, and record their electronic verification to close out the action item.

---

## 3. FDA 21 CFR Part 11 compliance

For life science organizations, the CAPA process is a primary focal point during regulatory audits. The CAPA service meets FDA 21 CFR Part 11 standards through:

1.  **Strict Audit Trail Logging**: Any change to a CAPA, action item, or 8D section triggers a background call to the `AuditService`. The audit record captures the action type (`CREATE`, `UPDATE`), tenant context, executing user ID, modified resource, and detailed metadata (changed fields).
2.  **Electronic Signature Binding**: Changing a status to `'closed'` or signing off on effectiveness verification is gated behind credentials verification (re-authentication) to establish the identity of the signer.
3.  **System-Managed Status Lifecycle**: Status changes cannot be done arbitrarily; they must follow the approved workflow transitions or be processed through the workflow instance engine.
