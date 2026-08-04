# QAssure Billing Service — Unit Testing Document

---

## 1. Unit Testing Strategy

Unit testing for the Billing Service focuses on verifying financial calculations and date validations in isolation:
1.  **Invoice Math Engine**: Verifying that subtotal, tax rates, and discount deductions calculate invoice totals correctly.
2.  **Due Date Validator**: Validating that overdue check functions correctly identify expired invoices based on past due dates.
3.  **Unique Format Helpers**: Asserting that generated invoice numbers match pattern constraints.

---

## 2. Test Cases and Assertions

### 2.1 Invoice Total Calculations
*   **Target**: Validate tax and discount mathematical order.
*   **Assertions**:
    *   *Subtotal*: $100.00, *Tax Rate*: 10%, *Discount*: $10.00 should calculate:
        *   Tax Amount = $10.00 (10% of 100)
        *   Total = $100.00 - $10.00 + $10.00 = $100.00.

### 2.2 Overdue Evaluations
*   **Target**: Verify overdue flags on sent invoices.
*   **Assertions**:
    *   Sent status + due date tomorrow -> `is_overdue: false`.
    *   Sent status + due date yesterday -> `is_overdue: true`.
    *   Draft status + due date yesterday -> `is_overdue: false` (not yet issued).

---

## 3. Mock Test Stub Implementation

Below is a Jest unit test script illustrating how to test the Billing Service calculations:

```javascript
const { BillingService } = require('../../src/services/billing.service');

describe('Billing Service - Calculations & Overdue Helpers', () => {
  let service;

  beforeEach(() => {
    service = new BillingService();
  });

  describe('calculateInvoiceTotals Calculation', () => {
    it('should calculate the correct total and tax amount', () => {
      const items = [
        { unit_price: 100.00, quantity: 2 }, // 200.00
        { unit_price: 50.00, quantity: 1 }   // 50.00
      ];
      const taxRate = 10.00; // 10%
      const discount = 20.00;

      const result = service._computeTotals(items, taxRate, discount);

      expect(result.subtotal).toBe(250.00);
      expect(result.tax_amount).toBe(25.00);
      expect(result.total).toBe(255.00); // 250 - 20 + 25
    });
  });

  describe('isInvoiceOverdue check', () => {
    it('should return true if status is sent and due date is in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invoice = {
        status: 'sent',
        due_date: pastDate
      };

      const result = service._checkOverdue(invoice);
      expect(result).toBe(true);
    });

    it('should return false if status is draft even if due date is in the past', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);

      const invoice = {
        status: 'draft',
        due_date: pastDate
      };

      const result = service._checkOverdue(invoice);
      expect(result).toBe(false);
    });
  });
});
```
