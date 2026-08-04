# Audit Log Service - Unit Testing Document

---

## 1. Unit Testing Strategy
Unit tests target individual functions, helpers, validation rules, and service methods within the Audit Log Service. External dependencies (such as the database/Sequelize connection and network requests) are mocked to ensure tests run fast and remain decoupled from infrastructure.

---

## 2. Target Files & Coverage

### 2.1 Services
*   **`src/services/audit.service.js`**:
    *   Test `_sanitizeBody` with nested JSON inputs, asserting that keys like `password` are masked while other fields are preserved.
    *   Test `_getResourceType` with various REST URL structures.
*   **`src/services/audit_log_service.js`**:
    *   Test `shouldRetain` rule:
        *   Assertion: Throws an error for dates less than 7 years in the past.
        *   Assertion: Passes successfully for dates greater than 7 years in the past.
    *   Test `validateAction`, verifying that invalid actions throw errors and valid ones pass.
    *   Test `hasCorrelationId`, ensuring validation checks for null or empty string IDs.

### 2.2 Middleware Helpers
*   **`src/middleware/audit.middleware.js`**:
    *   Test `resolveAction` maps HTTP methods and specific endpoints (e.g. `POST /auth/login` maps to `'LOGIN'`).
    *   Test `resolveResourceType` parses paths correctly.
    *   Test `resolveResourceId` parses param values correctly.

---

## 3. Unit Test Code Examples (Mocha / Chai Style)

### 3.1 Testing Body Sanitization
```javascript
const { expect } = require('chai');
const { AuditService } = require('../../src/services/audit.service');

describe('AuditService - _sanitizeBody', () => {
  let auditService;

  beforeEach(() => {
    auditService = new AuditService();
  });

  it('should redact sensitive keys and leave other fields intact', () => {
    const input = {
      username: 'johndoe',
      password: 'mypassword123',
      api_key: 'supersecretkey',
      nested: {
        token: 'auth-token-xyz',
        public_data: 'visible'
      }
    };

    const sanitized = auditService._sanitizeBody(input);

    expect(sanitized.username).to.equal('johndoe');
    expect(sanitized.password).to.equal('[REDACTED]');
    expect(sanitized.api_key).to.equal('[REDACTED]');
    expect(sanitized.nested.token).to.equal('[REDACTED]');
    expect(sanitized.nested.public_data).to.equal('visible');
  });
});
```

### 3.2 Testing Retention Deletion Validation
```javascript
const { expect } = require('chai');
const auditlogService = require('../../src/services/audit_log_service');

describe('AuditlogService - shouldRetain', () => {
  it('should throw an error for audit logs younger than 7 years', () => {
    const freshLog = {
      created_at: new Date() // created today
    };

    expect(() => auditlogService.shouldRetain(freshLog)).to.throw(
      'Audit log cannot be deleted before 7 years retention period'
    );
  });

  it('should not throw an error for audit logs older than 7 years', () => {
    const oldLog = {
      created_at: new Date(Date.now() - 8 * 365 * 24 * 60 * 60 * 1000) // 8 years ago
    };

    expect(() => auditlogService.shouldRetain(oldLog)).to.not.throw();
  });
});
```
