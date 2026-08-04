# Electronic Signature Service - Unit Testing Document

---

## 1. Unit Testing Strategy
Unit tests focus on the isolated validation of:
1.  **Zod Schema Constraints**: Ensuring invalid input types, length boundaries, and action enums are rejected before reaching route handlers.
2.  **Service Utility Calculations**: Validating cryptographic hash consistency and authentication factor checking helper logic.

---

## 2. Validation Schemas Test Suite
The following unit test criteria are implemented for `src/validation/electronic-signature.schema.js`:

### 2.1 SetPinSchema
*   **Target**: Validate password presence and PIN digits.
*   **Test Cases**:
    *   *Pass*: `{ password: "pass", pin: "1234" }` (4 digits)
    *   *Pass*: `{ password: "pass", pin: "567890" }` (6 digits)
    *   *Fail*: `{ password: "pass", pin: "12" }` (too short)
    *   *Fail*: `{ password: "pass", pin: "1234567" }` (too long)
    *   *Fail*: `{ password: "pass", pin: "123a" }` (contains non-numeric characters)

### 2.2 CreateSignatureSchema
*   **Target**: Validate required action enums and resource parameters.
*   **Test Cases**:
    *   *Pass*: `{ resource_type: "doc", resource_id: "id", action: "APPROVE", password: "pwd" }`
    *   *Fail*: `{ resource_type: "", resource_id: "id", action: "APPROVE", password: "pwd" }` (empty resource type)
    *   *Fail*: `{ resource_type: "doc", resource_id: "id", action: "DELETE", password: "pwd" }` (invalid action enum value)

---

## 3. Mocking & Execution Details
To run unit tests without live database attachments:
1.  **Prisma Client Mock**: Mock data-access using libraries like `jest-mock-extended` or simple mock overrides.
2.  **Password Validation Mock**: Mock bcrypt hashing results to isolate controller logic.

```javascript
// Example Jest unit test stub
const { SetPinSchema } = require('../../src/validation/electronic-signature.schema');

describe('SetPinSchema Validation', () => {
  it('should accept 4-6 digit numeric PINs', () => {
    const result = SetPinSchema.safeParse({ password: 'test', pin: '1234' });
    expect(result.success).toBe(true);
  });

  it('should reject non-numeric PINs', () => {
    const result = SetPinSchema.safeParse({ password: 'test', pin: 'abcd' });
    expect(result.success).toBe(false);
  });
});
```
