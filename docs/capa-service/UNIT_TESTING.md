# QAssure CAPA Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit testing for the CAPA service focuses on verifying internal business logic and formatting functions in isolation:
1.  **CAPA Auto-Numbering**: Validating that `CapaService._generateCapaNumber()` queries the database correctly and returns numbers formatted with the correct year and sequential format (e.g. `CAPA-2026-0001`).
2.  **Date/Overdue Logic**: Verifying that `CapaService._formatCapaSummary()` correctly identifies overdue CAPAs by evaluating `target_date`, current date, and status.
3.  **Data Formatters**: Validating that raw database row returns are correctly transformed into structured API payloads with proper object nestings for dates, owner, and source record references.

---

## 2. Test Cases and Assertions

### 2.1 Overdue Flag Computations
*   **Target**: Ensure overdue indicators react properly to dates and status combinations.
*   **Test Cases**:
    *   *Not Overdue (Future Target Date)*: A CAPA with target date set in the future should return `is_overdue: false`.
    *   *Overdue (Past Target Date)*: A CAPA in `'open'` status with target date in the past should return `is_overdue: true`.
    *   *Closed CAPA (Past Target Date)*: A CAPA with status `'closed'` and target date in the past should return `is_overdue: false` (since it is already resolved).
    *   *Cancelled CAPA (Past Target Date)*: A CAPA with status `'cancelled'` and target date in the past should return `is_overdue: false`.

### 2.2 Action Overdue Computations
*   **Target**: Validate action item overdue logic.
*   **Test Cases**:
    *   *Pending & Past Due*: A pending action with a past due date should return `is_overdue: true`.
    *   *Completed & Past Due*: A completed action with a past due date should return `is_overdue: false`.

---

## 3. Mock Test Stub Implementation

Below is a Jest unit test script illustrating how to mock database connections and assert CAPA formatting rules:

```javascript
const { CapaService } = require('../../src/services/capa.service');

describe('Capa Service - Formatting & Date Logic', () => {
  let capaService;

  beforeEach(() => {
    capaService = new CapaService();
  });

  describe('_formatCapaSummary', () => {
    it('should mark a CAPA as overdue if target_date is in the past and status is not closed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const rawCapa = {
        id: '123',
        capa_number: 'CAPA-2026-0001',
        title: 'Supplier Incident',
        capa_type: 'corrective',
        source: 'supplier',
        priority: 'high',
        status: 'open',
        owner_email: 'qa@company.com',
        target_date: pastDate,
        created_at: new Date()
      };

      const formatted = capaService._formatCapaSummary(rawCapa);
      expect(formatted.is_overdue).toBe(true);
    });

    it('should not mark a CAPA as overdue if target_date is in the past but status is closed', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);

      const rawCapa = {
        id: '123',
        capa_number: 'CAPA-2026-0001',
        title: 'Supplier Incident',
        capa_type: 'corrective',
        source: 'supplier',
        priority: 'high',
        status: 'closed',
        owner_email: 'qa@company.com',
        target_date: pastDate,
        created_at: new Date()
      };

      const formatted = capaService._formatCapaSummary(rawCapa);
      expect(formatted.is_overdue).toBe(false);
    });

    it('should not mark a CAPA as overdue if target_date is in the future', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const rawCapa = {
        id: '123',
        capa_number: 'CAPA-2026-0001',
        title: 'Supplier Incident',
        capa_type: 'corrective',
        source: 'supplier',
        priority: 'high',
        status: 'open',
        owner_email: 'qa@company.com',
        target_date: futureDate,
        created_at: new Date()
      };

      const formatted = capaService._formatCapaSummary(rawCapa);
      expect(formatted.is_overdue).toBe(false);
    });
  });

  describe('_formatAction', () => {
    it('should mark action as overdue if pending and due date is in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 2);

      const rawAction = {
        id: 'act-1',
        action_number: 1,
        description: 'Verify patch integrity',
        action_type: 'verification',
        assigned_to_email: 'tester@company.com',
        department: 'Quality',
        due_date: pastDate,
        completed_date: null,
        status: 'pending',
        evidence: null
      };

      const formatted = capaService._formatAction(rawAction);
      expect(formatted.is_overdue).toBe(true);
    });
  });
});
```
