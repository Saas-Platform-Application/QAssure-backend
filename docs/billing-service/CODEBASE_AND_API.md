# QAssure Billing Service — Codebase & API Documentation

---

## 1. Directory Structure

The files managing the subscription invoicing and payment flows are organized as follows:

```
src/
├── routes/
│   └── billing.routes.js            # Router registry and authentication bindings
├── controllers/
│   └── billing.controller.js        # Controller layer mapping requests to service methods
├── services/
│   └── billing.service.js           # Core business logic for invoices, revenue, and payments
├── validation/
│   └── billing.schema.js            # Joi/Zod validation schemas for billing payloads
├── sequelize-models/
│   ├── pricing_plan.js              # Pricing Plan Sequelize model
│   ├── invoice.js                   # Invoice header Sequelize model
│   ├── invoice_line_item.js         # Invoice line detail schema
│   └── payment.js                   # Payments ledger Sequelize model
└── migrations/
    ├── 038_create_license_billing.js # Sequelize migration runner
    └── phase24_license_billing.sql  # Raw SQL schema layout
```

---

## 2. Express Route Registry

All routes require authentication. Base Path: `/api/v1/billing`

| Method | Endpoint | Action | RBAC Permission |
| :--- | :--- | :--- | :--- |
| **GET** | `/pricing-plans` | Fetch active pricing plans | None (Authenticated) |
| **GET** | `/pricing-plans/:id`| Fetch details of a single pricing plan | None (Authenticated) |
| **POST** | `/pricing-plans` | Create a new pricing plan | `pricing_plans:write` (Super Admin) |
| **PUT** | `/pricing-plans/:id`| Update pricing plan details | `pricing_plans:write` (Super Admin) |
| **GET** | `/invoices` | List and filter invoices | `invoices:read` |
| **POST** | `/invoices` | Generate a new invoice manually | `invoices:write` (Super Admin) |
| **GET** | `/invoices/:id` | Fetch details of an invoice | `invoices:read` |
| **POST** | `/invoices/:id/send`| Send invoice notification to tenant | `invoices:write` (Super Admin) |
| **POST** | `/invoices/:id/void`| Void/Cancel a pending invoice | `invoices:delete` (Super Admin) |
| **GET** | `/payments` | List payments | `payments:read` |
| **POST** | `/payments` | Record a payment received | `payments:write` (Super Admin) |
| **GET** | `/payments/:id` | Fetch payment details by ID | `payments:read` |
| **GET** | `/summary` | Get billing dashboard for the tenant | `billing:read` |
| **GET** | `/revenue` | Get revenue summaries and aggregates | `billing:read` (Super Admin) |

---

## 3. API Request & Response Examples

### 3.1 Create Pricing Plan (`POST /pricing-plans`)
Creates a new pricing plan option.

**Request Body**:
```json
{
  "code": "aice-pro-monthly",
  "name": "AiCE Professional Monthly",
  "description": "AI-assisted Clinical Evaluation - Professional Tier",
  "license_tier": "professional",
  "application": "aice",
  "base_price": 499.00,
  "currency": "USD",
  "billing_cycle": "monthly",
  "features": ["cer_generation", "literature_search"],
  "limits": {
    "max_ai_tokens": 10000
  }
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "f89cc8c0-f442-4911-88bc-a89fdcf12dd3",
    "code": "aice-pro-monthly",
    "name": "AiCE Professional Monthly",
    "base_price": 499.00,
    "currency": "USD",
    "billing_cycle": "monthly",
    "is_active": true,
    "created_at": "2026-06-26T05:10:00.000Z"
  }
}
```

---

### 3.2 Create Invoice (`POST /invoices`)
Super Admins create manual invoices.

**Request Body**:
```json
{
  "tenant_id": "c0000000-0000-0000-0000-000000000001",
  "license_id": "e44df021-ef31-482d-88bb-cfda4091abff",
  "due_date": "2026-07-26T00:00:00.000Z",
  "subtotal": 499.00,
  "tax_rate": 10.00,
  "tax_amount": 49.90,
  "total": 548.90,
  "amount_due": 548.90,
  "billing_name": "Pharma Corp Quality Procurement",
  "billing_email": "billing@pharmacorp.com",
  "items": [
    {
      "description": "AiCE Professional Tier - Monthly Subscription",
      "quantity": 1,
      "unit_price": 499.00,
      "amount": 499.00,
      "item_type": "license"
    }
  ]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "a90dfc10-e22d-45ba-8abc-dfda4091ab55",
    "invoice_number": "INV-2026-001002",
    "tenant_id": "c0000000-0000-0000-0000-000000000001",
    "status": "draft",
    "total": 548.90,
    "amount_due": 548.90,
    "created_at": "2026-06-26T05:12:00.000Z"
  }
}
```

---

### 3.3 Record Payment (`POST /payments`)
Documents payments received via wire transfer/checks.

**Request Body**:
```json
{
  "tenant_id": "c0000000-0000-0000-0000-000000000001",
  "invoice_id": "a90dfc10-e22d-45ba-8abc-dfda4091ab55",
  "amount": 548.90,
  "payment_method": "wire",
  "reference_number": "WIRE-REF-992102A",
  "bank_name": "Chase Bank",
  "transaction_date": "2026-06-26T00:00:00.000Z",
  "notes": "Wire payment processed for June 2026"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "e49df021-ef31-482d-88bb-cfda4091abff",
    "payment_number": "PAY-2026-001004",
    "status": "completed",
    "amount": 548.90,
    "invoice": {
      "id": "a90dfc10-e22d-45ba-8abc-dfda4091ab55",
      "status": "paid",
      "amount_due": 0
    }
  }
}
```

---

### 3.4 Get Billing Summary (`GET /summary`)
Returns aggregated metrics for the tenant's billing tab.

**Response**:
```json
{
  "success": true,
  "data": {
    "outstanding_balance": 0.00,
    "last_payment": {
      "amount": 548.90,
      "date": "2026-06-26T05:15:00.000Z",
      "payment_number": "PAY-2026-001004"
    },
    "active_plans": [
      {
        "plan_name": "AiCE Professional Monthly",
        "next_invoice_date": "2026-07-26T12:00:00.000Z",
        "amount": 499.00
      }
    ]
  }
}
```
