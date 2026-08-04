# QAssure License Service — Codebase & API Documentation

---

## 1. Directory Structure

The files managing the licensing enforcement architecture are organized as follows:

```
src/
├── routes/
│   └── license.routes.js            # Router definitions, authentication, and validations
├── controllers/
│   └── license.controller.js        # Controller layer mapping requests to service methods
├── services/
│   └── license.service.js           # Core logic for checks, key generation, and activations
├── validation/
│   └── license.schema.js            # Joi/Zod validation schemas for request bodies
├── sequelize-models/
│   ├── license.js                   # Primary License Sequelize model
│   ├── license_activation.js        # Activation device records schema
│   ├── license_usage.js             # Historical usage data model
│   ├── license_usage_current.js     # MTD current usage counts model
│   └── license_audit_log.js         # Immutable audit logging schema
└── migrations/
    ├── 038_create_license_billing.js # Sequelize migration runner
    └── phase24_license_billing.sql  # Raw SQL schema layout
```

---

## 2. Express Route Registry

All routes require authentication. Base Path: `/api/v1/licenses`

| Method | Endpoint | Action | RBAC Permission |
| :--- | :--- | :--- | :--- |
| **GET** | `/types` | Fetch static license types | None (Authenticated) |
| **GET** | `/tiers` | Fetch static tier definitions | None (Authenticated) |
| **GET** | `/applications` | Fetch licensable modules list | None (Authenticated) |
| **GET** | `/my` | Fetch current tenant's active licenses | `licenses:read` |
| **POST** | `/activate` | Activate a license for the tenant | `licenses:activate` |
| **POST** | `/validate` | Validate license health and state | `licenses:read` |
| **POST** | `/check-feature` | Check if a feature code is allowed | `licenses:read` |
| **POST** | `/` | Create a new license | `licenses:write` (Super Admin) |
| **GET** | `/` | List all licenses across tenants | `licenses:read` (Super Admin) |
| **GET** | `/tenant/:tenantId` | Fetch all licenses belonging to a tenant | `licenses:read` (Super Admin) |
| **GET** | `/:id` | Fetch details of a license by ID | `licenses:read` |
| **PUT** | `/:id` | Update license metadata/limits | `licenses:write` (Super Admin) |
| **POST** | `/:id/revoke` | Revoke an active license | `licenses:revoke` (Super Admin) |
| **GET** | `/:id/usage` | Fetch limits vs current usage metrics | `usage:read` |
| **GET** | `/:id/audit` | Fetch license modification log | `licenses:read` (Super Admin) |

---

## 3. API Request & Response Examples

### 3.1 Create License (`POST /`)
Creates a new license with custom features/limits.

**Request Body**:
```json
{
  "tenant_id": "c0000000-0000-0000-0000-000000000001",
  "license_type": "subscription",
  "tier": "professional",
  "application": "aice",
  "expires_at": "2027-06-26T12:00:00.000Z",
  "limits": {
    "max_users": 30,
    "max_storage_gb": 150
  },
  "features": ["cer_generation", "literature_search"],
  "notes": "Custom high-user count allocation."
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "e44df021-ef31-482d-88bb-cfda4091abff",
    "tenant_id": "c0000000-0000-0000-0000-000000000001",
    "license_key": "QASSURE-AICE-PRO-C0000000-20260626-B812EF",
    "license_type": "subscription",
    "tier": "professional",
    "application": "aice",
    "status": "pending",
    "activation_state": "not_activated",
    "limits": {
      "max_users": 30,
      "max_storage_gb": 150
    },
    "features": ["cer_generation", "literature_search"],
    "created_at": "2026-06-26T05:00:00.000Z"
  }
}
```

---

### 3.2 Activate License (`POST /activate`)
Links the license key to the tenant's current setup.

**Request Body**:
```json
{
  "license_key": "QASSURE-AICE-PRO-C0000000-20260626-B812EF",
  "instance_id": "prod-node-01",
  "device_fingerprint": "df-7f8e025a-4bcf-4a30"
}
```

**Response**:
```json
{
  "success": true,
  "message": "License activated successfully",
  "data": {
    "id": "e44df021-ef31-482d-88bb-cfda4091abff",
    "status": "active",
    "activation_state": "activated",
    "activated_at": "2026-06-26T05:05:00.000Z"
  }
}
```

---

### 3.3 Check Feature Access (`POST /check-feature`)
Determines if a feature is allowed on the current license.

**Request Body**:
```json
{
  "license_id": "e44df021-ef31-482d-88bb-cfda4091abff",
  "feature": "cer_generation"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "allowed": true,
    "feature": "cer_generation",
    "license_status": "active"
  }
}
```

---

### 3.4 Get License Usage & Limits (`GET /:id/usage`)
Fetches configured parameters and actual consumption counters.

**Response**:
```json
{
  "success": true,
  "data": {
    "license_id": "e44df021-ef31-482d-88bb-cfda4091abff",
    "limits": {
      "max_users": 30,
      "max_storage_gb": 150,
      "max_ai_tokens": 10000
    },
    "current_usage": {
      "current_users": 12,
      "current_projects": 4,
      "current_ai_tokens_used": 1500,
      "current_storage_gb": 45.5
    },
    "enforcement_level": "active"
  }
}
```
