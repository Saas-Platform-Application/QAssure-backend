# Workflow Engine Service - Testing & Test Case Document

---

## 1. Test Strategy Overview
Workflow engine tests focus on:
1.  **Transition Verification**: Ensuring valid step-codes and sequences are navigated.
2.  **Access Controls**: Ensuring non-assignees cannot execute transitions.
3.  **Gate Verification**: Ensuring missing comments, signatures, or attachments block execution.

---

## 2. Test Case Matrix

| ID | Feature | Target Case Description | Input Data | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **WF-TC-01** | Definitions | Create a workflow definition | name, code, steps, transitions | Definition created (201 Created) |
| **WF-TC-02** | Definitions | Validate schema with missing steps | name, code, steps: [] | Returns 400 Bad Request |
| **WF-TC-03** | Instances | Start instance from definition | workflow_definition_id, entity_id | Instance initialized (201 Created) |
| **WF-TC-04** | Transitions | Execute valid state transition | task_id, action: "submit" | Task completed, next step created |
| **WF-TC-05** | Transitions | Mismatched assignee execution | task_id, non-assignee session | Blocked transition (403 Forbidden) |
| **WF-TC-06** | Transitions | Missing signature on gated step | task_id, empty password/pin | Transition blocked (400 Bad Request) |
| **WF-TC-07** | Transitions | Missing mandatory comment | task_id, action, comments: "" | Transition blocked (400 Bad Request) |
| **WF-TC-08** | Delegation | Delegate task to another user | task_id, delegate_to user_id | Task assignee updated to delegate |
| **WF-TC-09** | Cancellation | Cancel active workflow instance | instance_id, reason | Status becomes "cancelled" |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Lifecycle of Gated Approval Workflow
1.  **Action**: Start instance for definition `doc_approval` and document `DOC-202`.
    *   *Check*: Verify status is `active` and current step is `upload`.
2.  **Action**: Complete step `upload` by calling `/transition` with action `submit`.
    *   *Check*: Current step updates to `review`. A task is assigned to the review role.
3.  **Action**: Attempt to transition `review` with action `approve` but without passing password/PIN.
    *   *Check*: Response must return `400 Bad Request` stating signature credentials are required.
4.  **Action**: Re-try transition with valid password and PIN.
    *   *Check*: Status updates to terminal step `approved`.
