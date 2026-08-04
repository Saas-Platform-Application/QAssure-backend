# Workflow Engine Service - Functional & Module-Level Documentation

---

## 1. Functional Scope & Lifecycle
The Workflow Engine coordinates state changes across platform entities (including Documents, CAPAs, Change Controls, and Supplier Lists). It acts as the gatekeeper for regulatory operations, ensuring that actions can only be executed by qualified users under strict compliance conditions.

---

## 2. Key Modules & Features

### 2.1 Workflow Definitions Lifecycle
Workflows are built from reusable definitions which act as templates:
*   **Draft**: The blueprint is under construction. Steps, assignees, transitions, and compliance gates can be edited freely. Draft definitions cannot start instances.
*   **Active**: The definition is frozen and available for system use. New workflow instances can only be initiated from active definitions.
*   **Deprecated**: The definition is marked for retirement. No new instances can be started from it. However, existing active instances are allowed to run to completion.
*   **Archived**: The definition is completely retired and hidden from operational views. History is preserved for compliance auditing.
*   **Versioning & Cloning**: Modifying steps on an active definition automatically prompts the creation of a cloned draft. This preserves active instance executions from runtime schema changes.

### 2.2 Task Assignees & Allocation Schemes
Assignments dictate who can interact with tasks at each step:
*   **User Mappings (`assignee_type = 'user'`)**: Assigns the task explicitly to one or more user IDs listed in `assignee_user_ids`.
*   **Role Mappings (`assignee_type = 'role'`)**: Assigns the task to user roles (`assignee_role_ids`). Any member of this role can query and claim the task.
*   **Originator (`assignee_type = 'originator'`)**: Automatically routes the task to the user who started the workflow instance (e.g. for revision work after rejection).
*   **Delegation Workflow**: Active tasks can be delegated by assignees to other users. A delegation log is written to `workflow_delegates`, recording the duration (`starts_at` / `ends_at`) and reason.

### 2.3 Compliance Gate Enforcement
Transitions are protected by validation rules defined at each step:
*   **Requires Signature**: Integrates with the Electronic Signature module. Transitions fail immediately if credentials (password & PIN) are not validated.
*   **Requires Comment**: Enforces logging text justifications (e.g., explaining why a document is rejected or approved).
*   **Requires Attachment**: Enforces attaching one or more files to the task before submitting.

### 2.4 SLA Management & Escalations
Tracks execution timing relative to predefined deadlines:
*   **SLA Hours**: The total allowed duration for a step.
*   **SLA Warning Hours**: Triggers warning notifications as the deadline approaches.
*   **SLA Escalation Hours**: Triggered when the deadline is breached. The task is reassigned to the user or role specified in `escalation_user_id` or `escalation_role`, and an escalation event is written to the history log.

---

## 3. FDA 21 CFR Part 11 Compliance Standards
To meet regulatory guidelines, the Workflow Engine enforces:
*   **Immutable History Trails**: Every state transition, delegation, cancellation, or signature verification writes a permanent record to `workflow_history`.
*   **Non-Repudiation**: When a step requires a signature, the signature's unique ID is linked directly to the task and history record, proving who authorized the step.
