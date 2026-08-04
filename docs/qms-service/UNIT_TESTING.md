# QAssure QMS Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit testing for the QMS Service focuses on verifying schema transformations and conflict detection rules in isolation:
1.  **Field Mapping Transformer**: Verifying that source fields map to target columns using direct, uppercase, and mapping functions.
2.  **Conflict Detector Engine**: Asserting that concurrent modifications trigger conflict records.

---

## 2. Test Cases and Assertions

### 2.1 Mapping Transformations
*   **Target**: Ensure the mapping engine correctly translates source schemas.
*   **Assertions**:
    *   *Direct*: `{ "external_id": "123" }` maps to `{ "source_record_id": "123" }`.
    *   *Uppercase*: `{ "source_status": "open" }` maps to `{ "status": "OPEN" }`.
    *   *Priority map*: `{ "severity": "1" }` maps to `{ "priority": "critical" }`.

### 2.2 Conflict Resolution Evaluations
*   **Target**: Confirm that conflicting edits are correctly identified.
*   **Assertions**:
    *   Local edit date is newer than or equal to external edit date -> Conflict detected.
    *   Local edit date is older than external edit date -> Direct overwrite (no conflict).

---

## 3. Mock Test Stub Implementation

Below is a Jest unit test script illustrating how to test the QMS mapping and conflict detection functions:

```javascript
const { QmsSyncService } = require('../../src/services/qms-sync.service');

describe('QMS Service - Mapping & Conflict Helpers', () => {
  let service;

  beforeEach(() => {
    service = new QmsSyncService();
  });

  describe('Field Schema Mapper', () => {
    it('should map fields directly', () => {
      const mapping = {
        source_field: 'external_id',
        target_field: 'source_record_id',
        transformation: 'direct'
      };
      const input = { external_id: 'VEEVA-10223' };
      const output = {};

      service._applyMapping(mapping, input, output);
      expect(output.source_record_id).toBe('VEEVA-10223');
    });

    it('should map values to uppercase', () => {
      const mapping = {
        source_field: 'status',
        target_field: 'status',
        transformation: 'uppercase'
      };
      const input = { status: 'draft' };
      const output = {};

      service._applyMapping(mapping, input, output);
      expect(output.status).toBe('DRAFT');
    });

    it('should apply default values when source fields are missing', () => {
      const mapping = {
        source_field: 'missing_field',
        target_field: 'priority',
        transformation: 'direct',
        default_value: 'medium'
      };
      const input = {};
      const output = {};

      service._applyMapping(mapping, input, output);
      expect(output.priority).toBe('medium');
    });
  });

  describe('Conflict Detection Logic', () => {
    it('should identify a conflict if local data is modified concurrently', () => {
      const localRecord = {
        id: 'capa-101',
        title: 'Local CAPA Title',
        updated_at: new Date('2026-06-26T10:00:00.000Z')
      };
      const incomingData = {
        title: 'Veeva Modified Title',
        updated_at: new Date('2026-06-26T09:30:00.000Z') // Older update
      };

      const result = service._detectConflict(localRecord, incomingData);
      expect(result).toBe(true);
    });

    it('should not conflict if incoming data is newer', () => {
      const localRecord = {
        id: 'capa-101',
        title: 'Local CAPA Title',
        updated_at: new Date('2026-06-26T10:00:00.000Z')
      };
      const incomingData = {
        title: 'Veeva Modified Title',
        updated_at: new Date('2026-06-26T10:30:00.000Z') // Newer update
      };

      const result = service._detectConflict(localRecord, incomingData);
      expect(result).toBe(false);
    });
  });
});
```
