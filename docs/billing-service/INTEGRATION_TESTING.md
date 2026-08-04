# QAssure Billing Service — Integration Testing Document

---

## 1. Integration Scope & Boundaries

The Billing Service coordinates operations across multiple platform layers:
1.  **License Service Renewal Sync**: Triggers license validation extensions when invoices are paid.
2.  **Notification Engine Dispatcher**: Sends notifications (`invoice_sent`, `invoice_overdue`) when invoice states update.
3.  **Audit Service Log**: Commits financial transitions (invoiced amount, payments cleared, refunds) to system logs.

---

## 2. Integration Scenarios

### 2.1 License Service Renewal Execution
*   **Goal**: Confirm that payment clears triggers license extensions.
*   **Steps**:
    1.  Create a license set to expire in 3 days.
    2.  Create and issue a renewal invoice linked to the license.
    3.  Call `POST /api/v1/billing/payments` to record a full payment.
    4.  Verify the invoice status becomes `paid`.
    5.  Check that the license's `expires_at` is extended by 1 year.

---

### 2.2 Billing Summary Calculation
*   **Goal**: Confirm dashboard summary calculations return correct values.
*   **Steps**:
    1.  Seed two outstanding invoices for Tenant A (INV-1 total $500, INV-2 total $300).
    2.  Seed one paid invoice of $200.
    3.  Call the dashboard summary endpoint `GET /api/v1/billing/summary`.
    4.  Verify:
        *   `outstanding_balance` is reported as `$800.00`.
        *   `last_payment` details are returned matching the $200 entry.

---

### 2.3 Overdue Invoice Alert Notification
*   **Goal**: Verify that overdue cron checks trigger tenant alerts.
*   **Steps**:
    1.  Create an invoice with due date set to yesterday.
    2.  Set invoice status to `sent`.
    3.  Manually run the daily billing cron checker.
    4.  Verify:
        *   Invoice status is updated to `overdue`.
        *   The Tenant Admin receives an invoice overdue notification.
