# QAssure Billing Service

## Technical Knowledge Transfer (KT) Guide

Welcome to the technical Knowledge Transfer (KT) guide for the **Billing Service** of the QAssure Platform. This document outlines the service's architecture, database tables, validation triggers, and common developer tasks.

---

## 1. Architectural Overview

The Billing Service manages the pricing definitions, manual/automated invoicing, payment history, and revenue calculations.

### Directory & Component Map

- **Routing Layer**: [billing.routes.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/routes/billing.routes.js) defines Express endpoints, assigns authorization rules, and gates routes behind JWT authentication.
- **Controller Layer**: [billing.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/billing.controller.js) sanitizes payloads and routes requests.
- **Service Layer**: [billing.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/billing.service.js) coordinates invoicing, payment calculations, and triggers license renewal links.
- **Sequelize Models**: Defined under `src/sequelize-models/`, including `pricing_plan.js`, `invoice.js`, `invoice_line_item.js`, and `payment.js`.

---

## 2. System Interaction Workflows

### A. Invoicing and Payment Flow
This sequence details creating, sending, and collecting payments on invoices.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin
    actor Client as Tenant Admin
    participant Svc as billing.service
    database DB as PostgreSQL DB
    
    Admin->>Svc: createInvoice(tenantId, data, createdBy)
    Svc->>DB: INSERT INTO invoices (status = 'draft')
    Svc-->>Admin: Invoice draft details
    
    Admin->>Svc: sendInvoice(invoiceId)
    Svc->>DB: UPDATE invoices SET status = 'sent', sent_at = NOW()
    Svc->>Client: Send Invoice notification (email)
    
    Client->>Admin: Pays invoice (wire transfer)
    Admin->>Svc: recordPayment(invoiceId, paymentDetails)
    Svc->>DB: INSERT INTO payments (status = 'completed')
    Svc->>DB: UPDATE invoices SET amount_due = 0, status = 'paid', paid_at = NOW()
    Svc-->>Admin: Invoice status paid
```

---

### B. License Renewal Execution
This sequence details how a successful payment triggers a license renewal.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Super Admin
    participant BillSvc as billing.service
    participant LicSvc as license.service
    database DB as PostgreSQL DB
    
    Admin->>BillSvc: recordPayment(invoiceId, paymentDetails)
    BillSvc->>DB: UPDATE invoices SET status = 'paid'
    
    alt invoice has license_id linked
        BillSvc->>LicSvc: renewLicense(licenseId, periodMonths)
        LicSvc->>DB: UPDATE licenses SET expires_at = expires_at + INTERVAL '12 months', status = 'active'
        LicSvc->>DB: INSERT INTO renewal_history (...)
    end
    
    BillSvc-->>Admin: Payment recorded, license extended
```

---

## 3. Key Implementation Details

### A. Invoicing & Receipt Sequences
The PostgreSQL backend maintains dedicated auto-incrementing sequences:
*   `invoice_number_seq` (starts at 1000): Evaluated via `generate_invoice_number()` to build references like `INV-YYYY-XXXXXX`.
*   `payment_number_seq` (starts at 1000): Evaluated via `generate_payment_number()` to build receipts like `PAY-YYYY-XXXXXX`.

---

## 4. Developer KT Cheat Sheet: Common Tasks

### A. How to Add a New Pricing Plan?
Pricing plans are created via Super Admin endpoints, but they can also be pre-seeded in the database:
1. Open the SQL migration `phase24_license_billing.sql`.
2. Append the insert statement inside the `pricing_plans` table:
   ```sql
   INSERT INTO pricing_plans (code, name, application, license_tier, base_price, billing_cycle) 
   VALUES ('aice-starter-monthly', 'AiCE Starter Monthly', 'aice', 'starter', 199.00, 'monthly');
   ```

### B. How to Customize Invoice Tax Computations?
1. Open [billing.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/billing.service.js).
2. Locate the calculation block in the invoice creation flow. You can adjust the tax rate computation before calculating totals:
   ```javascript
   const subtotal = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
   const taxRate = 10.00; // 10% standard tax rate
   const taxAmount = (subtotal - discount) * (taxRate / 100);
   const total = subtotal - discount + taxAmount;
   ```
3. Ensure the calculated values match the corresponding Joi schema validation scopes.
