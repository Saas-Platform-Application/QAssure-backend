# Workflow Engine Service - Unit Testing Document

---

## 1. Unit Testing Strategy
Unit testing ensures components behave correctly in isolation:
1.  **Zod Schema Schemas**: Validate `CreateWorkflowDefinitionSchema`, `StartWorkflowSchema`, and `TransitionWorkflowSchema` handle transformations (like renaming `from_step_code` to `from_step`) and validations correctly.
2.  **Assignee Validator Helpers**: Verify logic routing assignees (user/role check) resolves assignments correctly.

---

## 2. Validation Schema Test Suite

### 2.1 TransitionWorkflowSchema
*   **Target**: Ensure action parameters are present.
*   **Test Cases**:
    *   *Pass*: `{ task_id: uuid, action: "submit" }`
    *   *Fail*: `{ task_id: uuid, action: "" }` (empty action)
    *   *Fail*: `{ task_id: "invalid-uuid", action: "submit" }` (bad UUID)

### 2.2 StepAssigneeSchema
*   **Target**: Validate conditional field bindings.
*   **Test Cases**:
    *   *Pass*: `{ type: "role", role_ids: [uuid] }`
    *   *Pass*: `{ type: "user", user_ids: [uuid] }`
    *   *Fail*: `{ type: "role", user_ids: [uuid] }` (missing required role_ids)
    *   *Fail*: `{ type: "user", role_ids: [uuid] }` (missing required user_ids)

---

## 3. Mock Test Stub Implementation
Unit tests can mock database transactions using Jest mock hooks.

```javascript
const { TransitionWorkflowSchema } = require('../../src/validation/workflow.schema');

describe('TransitionWorkflowSchema Validation', () => {
  it('should accept valid transition payloads', () => {
    const payload = {
      task_id: '1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d',
      action: 'approve',
      comments: 'approved SOP'
    };
    const result = TransitionWorkflowSchema.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it('should reject missing task_id fields', () => {
    const payload = {
      action: 'approve'
    };
    const result = TransitionWorkflowSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
```
