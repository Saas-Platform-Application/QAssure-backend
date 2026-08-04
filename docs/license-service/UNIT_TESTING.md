# QAssure License Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit testing for the License Service concentrates on verifying calculations, database checks, and date triggers in isolation:
1.  **Date Enforcement Evaluator**: Verifying that `getEnforcementLevel()` returns correct state overrides for warning, grace, and suspended dates.
2.  **Feature Access Rules**: Validating that custom override features merge correctly with the tier's default feature array.
3.  **Key Generator Helper**: Asserting that generated keys match the pattern regex and resolve tenant hash checks.

---

## 2. Test Cases and Assertions

### 2.1 Date State Evaluator
*   **Target**: Confirm proper status labels based on validity dates.
*   **Assertions**:
    *   *Warning*: Expiring in 10 days should evaluate to `'warning'`.
    *   *Grace*: Expired 2 days ago (within 30-day grace window) should evaluate to `'grace'`.
    *   *Suspended*: Expired 31 days ago should evaluate to `'suspended'`.

### 2.2 Feature Array Merger
*   **Target**: Ensure default features combine correctly with custom license features.
*   **Assertions**:
    *   Starter Tier (`['core']`) + custom override (`['aice']`) should return `['core', 'aice']`.

---

## 3. Mock Test Stub Implementation

Below is a Jest unit test script demonstrating how to test the License Service helper methods:

```javascript
const { LicenseService } = require('../../src/services/license.service');

describe('License Service - Date & Logic Helpers', () => {
  let service;

  beforeEach(() => {
    service = new LicenseService();
  });

  describe('getEnforcementLevel Calculation', () => {
    it('should return active for normal licenses with future expiry', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 45);

      const license = {
        status: 'active',
        expires_at: futureDate,
        grace_period_days: 30,
        grace_ends_at: null
      };

      const result = service._computeEnforcementLevel(license);
      expect(result).toBe('active');
    });

    it('should return warning if within 30 days of expiry', () => {
      const closeExpiry = new Date();
      closeExpiry.setDate(closeExpiry.getDate() + 15);

      const license = {
        status: 'active',
        expires_at: closeExpiry,
        grace_period_days: 30,
        grace_ends_at: null
      };

      const result = service._computeEnforcementLevel(license);
      expect(result).toBe('warning');
    });

    it('should return grace if expired but within grace limit', () => {
      const pastExpiry = new Date();
      pastExpiry.setDate(pastExpiry.getDate() - 10);
      const graceEnds = new Date();
      graceEnds.setDate(graceEnds.getDate() + 20);

      const license = {
        status: 'grace',
        expires_at: pastExpiry,
        grace_period_days: 30,
        grace_ends_at: graceEnds
      };

      const result = service._computeEnforcementLevel(license);
      expect(result).toBe('grace');
    });

    it('should return suspended if grace limit has passed', () => {
      const pastExpiry = new Date();
      pastExpiry.setDate(pastExpiry.getDate() - 40);
      const graceEnds = new Date();
      graceEnds.setDate(graceEnds.getDate() - 10);

      const license = {
        status: 'suspended',
        expires_at: pastExpiry,
        grace_period_days: 30,
        grace_ends_at: graceEnds
      };

      const result = service._computeEnforcementLevel(license);
      expect(result).toBe('suspended');
    });
  });

  describe('Feature Access Checks', () => {
    it('should return true if feature exists in features array', () => {
      const license = {
        status: 'active',
        features: ['cer_generation', 'literature_search']
      };

      const result = service._checkFeatureAccess(license, 'cer_generation');
      expect(result).toBe(true);
    });

    it('should return false if feature is missing', () => {
      const license = {
        status: 'active',
        features: ['cer_generation']
      };

      const result = service._checkFeatureAccess(license, 'ai_unlimited');
      expect(result).toBe(false);
    });
  });
});
```
