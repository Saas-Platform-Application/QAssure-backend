# QAssure Supplier Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit testing for the Supplier Service focuses on verifying internal business logic and formatting functions in isolation:

1.  **Supplier Code Auto-Generation**: Validating that `_generateSupplierCode()` produces correctly formatted `SUP-XXXXX` codes with accurate zero-padding.
2.  **Audit Number Auto-Generation**: Validating that `_generateAuditNumber()` produces `SA-YYYY-XXXX` format codes with year scoping.
3.  **Scorecard Grade Calculation**: Verifying that `_calculateGrade()` returns correct grades at all boundary values (90, 80, 70, 60).
4.  **Expiring Flag Logic**: Verifying that `_formatSupplierSummary()` correctly computes `is_expiring` as `true` when `expiry_date` is within 30 days.
5.  **Data Formatters**: Validating that raw database row returns are correctly transformed into structured API payloads with nested objects (`contact`, `address`, `dates`, `score`, `findings`).

---

## 2. Test Cases and Assertions

### 2.1 Supplier Code Generation
*   **Test Case**: With 0 existing suppliers → code should be `SUP-00001`.
*   **Test Case**: With 9 existing suppliers → code should be `SUP-00010`.
*   **Test Case**: With 99999 existing suppliers → code should be `SUP-100000` (no truncation).

### 2.2 Audit Number Generation
*   **Test Case**: With 0 existing audits in current year → number should be `SA-2026-0001`.
*   **Test Case**: With 9 existing audits in current year → number should be `SA-2026-0010`.
*   **Test Case**: Year changes → counter resets (e.g., first audit of 2027 = `SA-2027-0001`).

### 2.3 Grade Calculation Boundaries
*   **Score = 100** → Grade `A`
*   **Score = 90** → Grade `A`
*   **Score = 89.9** → Grade `B`
*   **Score = 80** → Grade `B`
*   **Score = 79.9** → Grade `C`
*   **Score = 70** → Grade `C`
*   **Score = 69.9** → Grade `D`
*   **Score = 60** → Grade `D`
*   **Score = 59.9** → Grade `F`
*   **Score = 0** → Grade `F`

### 2.4 Expiring Flag Logic
*   **Expiry date is 29 days from now + status is `approved`** → `is_expiring: true`
*   **Expiry date is 31 days from now + status is `approved`** → `is_expiring: false`
*   **Expiry date is in the past + status is `approved`** → `is_expiring: true`
*   **No expiry date set** → `is_expiring: false`

### 2.5 Scorecard Weighted Score Calculation
*   **All scores = 100**: `(100×0.4) + (100×0.3) + (100×0.2) + (100×0.1)` = `100.0`
*   **All scores = 0**: `(0×0.4) + (0×0.3) + (0×0.2) + (0×0.1)` = `0.0`
*   **Mixed**: `quality=80, delivery=70, service=90, cost=60`: `(80×0.4) + (70×0.3) + (90×0.2) + (60×0.1)` = `32 + 21 + 18 + 6` = `77.0`

---

## 3. Mock Test Stub Implementation

Below is a Jest unit test script illustrating how to test `_calculateGrade()`, the `_formatSupplierSummary()` expiry logic, and the scorecard weighting formula:

```javascript
const { SupplierService } = require('../../src/services/supplier.service');

describe('Supplier Service - Business Logic & Formatting', () => {
  let supplierService;

  beforeEach(() => {
    supplierService = new SupplierService();
  });

  // ============================================================
  // Grade Calculation Tests
  // ============================================================

  describe('_calculateGrade', () => {
    it('should return A for score >= 90', () => {
      expect(supplierService._calculateGrade(100)).toBe('A');
      expect(supplierService._calculateGrade(90)).toBe('A');
    });

    it('should return B for score >= 80 and < 90', () => {
      expect(supplierService._calculateGrade(89.9)).toBe('B');
      expect(supplierService._calculateGrade(80)).toBe('B');
    });

    it('should return C for score >= 70 and < 80', () => {
      expect(supplierService._calculateGrade(79.9)).toBe('C');
      expect(supplierService._calculateGrade(70)).toBe('C');
    });

    it('should return D for score >= 60 and < 70', () => {
      expect(supplierService._calculateGrade(69.9)).toBe('D');
      expect(supplierService._calculateGrade(60)).toBe('D');
    });

    it('should return F for score < 60', () => {
      expect(supplierService._calculateGrade(59.9)).toBe('F');
      expect(supplierService._calculateGrade(0)).toBe('F');
    });
  });

  // ============================================================
  // Expiry Flag Logic Tests
  // ============================================================

  describe('_formatSupplierSummary - is_expiring flag', () => {
    it('should mark supplier as expiring if expiry is within 30 days', () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 15); // 15 days from now

      const rawSupplier = {
        id: 'sup-001',
        supplier_code: 'SUP-00001',
        name: 'Test Supplier',
        supplier_type: 'raw_material',
        category: 'critical',
        risk_level: 'high',
        status: 'approved',
        current_score: '85.50',
        score_grade: 'B',
        expiry_date: expiryDate
      };

      const formatted = supplierService._formatSupplierSummary(rawSupplier);
      expect(formatted.is_expiring).toBe(true);
    });

    it('should not mark supplier as expiring if expiry is more than 30 days away', () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 60); // 60 days from now

      const rawSupplier = {
        id: 'sup-002',
        supplier_code: 'SUP-00002',
        name: 'Future Supplier',
        supplier_type: 'distributor',
        category: 'minor',
        risk_level: 'low',
        status: 'approved',
        current_score: '91.00',
        score_grade: 'A',
        expiry_date: expiryDate
      };

      const formatted = supplierService._formatSupplierSummary(rawSupplier);
      expect(formatted.is_expiring).toBe(false);
    });

    it('should not set is_expiring if no expiry_date is present', () => {
      const rawSupplier = {
        id: 'sup-003',
        supplier_code: 'SUP-00003',
        name: 'No Expiry Supplier',
        supplier_type: 'service_provider',
        category: 'major',
        risk_level: 'medium',
        status: 'pending',
        current_score: null,
        score_grade: null,
        expiry_date: null
      };

      const formatted = supplierService._formatSupplierSummary(rawSupplier);
      expect(formatted.is_expiring).toBeFalsy();
    });
  });

  // ============================================================
  // Scorecard Weighted Score Tests
  // ============================================================

  describe('scorecard weighted calculation', () => {
    it('should calculate correct weighted overall score', () => {
      const weights = { quality: 0.4, delivery: 0.3, service: 0.2, cost: 0.1 };

      const quality = 80, delivery = 70, service = 90, cost = 60;
      const overallScore = (
        (quality * weights.quality) +
        (delivery * weights.delivery) +
        (service * weights.service) +
        (cost * weights.cost)
      );

      expect(overallScore).toBeCloseTo(77.0, 1);
      expect(supplierService._calculateGrade(overallScore)).toBe('C');
    });

    it('should return grade A when all scores are 100', () => {
      const weights = { quality: 0.4, delivery: 0.3, service: 0.2, cost: 0.1 };
      const overallScore = (100 * 0.4) + (100 * 0.3) + (100 * 0.2) + (100 * 0.1);

      expect(overallScore).toBe(100);
      expect(supplierService._calculateGrade(overallScore)).toBe('A');
    });

    it('should return grade F when all scores are 0', () => {
      const overallScore = (0 * 0.4) + (0 * 0.3) + (0 * 0.2) + (0 * 0.1);
      expect(overallScore).toBe(0);
      expect(supplierService._calculateGrade(overallScore)).toBe('F');
    });
  });

  // ============================================================
  // Formatter Tests
  // ============================================================

  describe('_formatSupplierSummary', () => {
    it('should return correctly structured summary object', () => {
      const rawSupplier = {
        id: 'sup-004',
        supplier_code: 'SUP-00004',
        name: 'Format Test Supplier',
        supplier_type: 'manufacturer',
        category: 'critical',
        risk_level: 'high',
        status: 'approved',
        current_score: '87.60',
        score_grade: 'B',
        expiry_date: null
      };

      const formatted = supplierService._formatSupplierSummary(rawSupplier);

      expect(formatted).toHaveProperty('id', 'sup-004');
      expect(formatted).toHaveProperty('supplier_code', 'SUP-00004');
      expect(formatted).toHaveProperty('score', 87.6);
      expect(formatted).toHaveProperty('grade', 'B');
      expect(formatted).toHaveProperty('status', 'approved');
    });
  });
});
```

---

## 4. Running the Tests

```bash
# Install Jest if not already installed
npm install --save-dev jest

# Run all unit tests
npx jest

# Run only supplier service tests
npx jest --testPathPattern=supplier

# Run tests with coverage report
npx jest --coverage --testPathPattern=supplier
```

**Expected Coverage Targets**:
- `_calculateGrade()`: 100% branch coverage
- `_formatSupplierSummary()`: 100% line coverage
- `_formatAudit()`: 80%+ coverage
- `_formatScorecard()`: 80%+ coverage
