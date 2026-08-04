# QAssure Billing Service — Testing & Test Cases

---

## 1. Test Strategy Overview

The testing strategy for the Billing Service focuses on verifying financial calculations and status progression accuracy:
1.  **State Machine Audits**: Confirming that invoice and payment statuses progress along the correct paths.
2.  **Payment Allocations**: Checking that partial and full payment values decrement the invoice's outstanding balance correctly.
3.  **License Integration Hooks**: Ensuring successful payment completions trigger license renewals and extend validation parameters.
4.  **Security Gates**: Restricting invoice creations, payment records, and voids to Super Admins.

---

## 2. Test Case Matrix

| ID | Module | Target Case Description | Input Data / Params | Expected Result |
| :--- | :--- | :--- | :--- | :--- |
| **BIL-TC-01** | Invoices | Create Invoice Header | Tenant ID, license ID, due date, billing info | Invoice created in `draft` status; sequential invoice number generated. |
| **BIL-TC-02** | Invoices | Add Line Items | Description, unit price, quantity | Header total, subtotal, and tax amount updated. |
| **BIL-TC-03** | Invoices | Transition to Sent | Send invoice call | Status changes to `sent`; edits locked. |
| **BIL-TC-04** | Invoices | Void Invoice | Void API call | Status changes to `voided`. |
| **BIL-TC-05** | Payments | Record Full Payment | Payment amount = total | Status of invoice changed to `paid`; amount_due changes to 0. |
| **BIL-TC-06** | Payments | Record Partial Payment | Payment amount = 50% of total | Invoice remains `sent`; amount_due reduced by 50%. |
| **BIL-TC-07** | Integration | License Renewal Trigger | Complete payment for license invoice | License service triggers renewal extending license validity. |
| **BIL-TC-08** | Invoices | Overdue Invoice check | Invoice due yesterday | Cron updates status to `overdue`; logs dashboard alert. |
| **BIL-TC-09** | Revenue | Fetch Revenue Summary | Super Admin credential | Returns aggregated monthly sales data. |
| **BIL-TC-10** | Security | Non-admin invoice creation | Normal user session | Request blocked with `403 Forbidden`. |
| **BIL-TC-11** | Security | Cross-tenant invoice lookup | Tenant B requests Tenant A invoice | Request returns `404 Not Found` or `403 Forbidden`. |

---

## 3. Step-by-Step Test Scenarios

### Scenario A: Invoice Creation & Sending
1.  **Action**: Log in as a Super Admin.
2.  **Action**: Create a draft invoice for Tenant A (`POST /api/v1/billing/invoices`).
    *   *Check*: Confirm the invoice status is `draft` and the total is calculated.
3.  **Action**: Finalize and send the invoice (`POST /api/v1/billing/invoices/{id}/send`).
    *   *Check*: Verify the status changes to `sent`, and details are locked against edits.

### Scenario B: Recording Payments and License Renewal Triggers
1.  **Action**: Create a license for Tenant A in `pending` status.
2.  **Action**: Generate and send a matching registration fee invoice.
3.  **Action**: Record a wire payment matching the invoice total (`POST /api/v1/billing/payments`).
    *   *Check*: Confirm that:
        *   The payment status is `completed`.
        *   The invoice status transitions to `paid` and `amount_due` is 0.
        *   The linked license status transitions to `active`, and the expiry date is extended.
