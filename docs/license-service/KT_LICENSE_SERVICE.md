# QAssure License Service

## Technical Knowledge Transfer (KT) Guide

Welcome to the technical Knowledge Transfer (KT) guide for the **License Service** of the QAssure Platform. This document outlines the service's architecture, database tables, validation triggers, and common developer tasks.

---

## 1. Architectural Overview

The License Service manages the validation, activation, and compliance tracking of licenses across all QAssure modules (AiCE, SQM, DHF, etc.).

### Directory & Component Map

- **Routing Layer**: [license.routes.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/routes/license.routes.js) defines Express endpoints, assigns authorization rules, and gates routes behind JWT authentication.
- **Controller Layer**: [license.controller.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/controllers/license.controller.js) sanitizes payloads and maps requests.
- **Service Layer**: [license.service.js](file:///home/tech4biz/Downloads/Sibarchan/QAssure/QAssur-backend/src/services/license.service.js) coordinates verification, checks feature scopes, updates counters, and handles database interactions.
- **Sequelize Models**: Models defined under `src/sequelize-models/`, including `license.js`, `license_activation.js`, `license_usage.js`, `license_usage_current.js`, and `license_audit_log.js`.

---

## 2. System Interaction Workflows

### A. License Validation & Expiry Checking
This sequence details how incoming requests verify active license health.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Request Client
    participant Auth as AuthMiddleware
    participant Svc as license.service
    database DB as PostgreSQL DB
    
    Client->>Auth: Request resource (e.g. GET /docs)
    Auth->>Svc: validate(tenantId)
    Svc->>DB: Query licenses where tenant_id = tenantId and status = 'active'
    DB-->>Svc: License record details
    
    alt License is active and valid
        Svc-->>Auth: is_valid: true, enforcement_level: 'active'
        Auth-->>Client: Request processed
    else License is warning or grace
        Svc-->>Auth: is_valid: true, enforcement_level: 'warning/grace'
        Auth-->>Client: Request processed (headers contain warnings)
    else License is suspended or expired
        Svc-->>Auth: is_valid: false, enforcement_level: 'suspended'
        Auth-->>Client: 402 Payment Required
    end
```

---

### B. Limit Verification Gate
This sequence details how other microservices verify resource limits before finalizing changes.

```mermaid
sequenceDiagram
    autonumber
    actor Client as Admin User
    participant Svc as identity-service
    participant LicSvc as license.service
    database DB as PostgreSQL DB
    
    Client->>Svc: POST /api/v1/users (create user)
    Svc->>LicSvc: checkLimits(tenantId)
    LicSvc->>DB: SELECT current_users, max_users FROM current_usage JOIN licenses
    DB-->>LicSvc: current: 25, max: 25
    
    alt limit reached
        LicSvc-->>Svc: Limit Exceeded (current >= max)
        Svc-->>Client: 400 Bad Request (LICENSE_LIMIT_EXCEEDED)
    else limit within range
        LicSvc-->>Svc: Limit Approved
        Svc->>DB: INSERT INTO users
        Svc->>LicSvc: incrementUserCount(tenantId)
        LicSvc->>DB: UPDATE license_usage_current SET current_users = current_users + 1
        Svc-->>Client: 201 Created
    end
```

---

## 3. Key Implementation Details

### A. License Key Generator Function
Licenses are generated via PG PL/pgSQL function `generate_license_key()`, which builds keys using this format:
`QASSURE-{APP}-{TIER}-{HASH}-{TIMESTAMP}-{RANDOM}`

### B. Database Triggers
The trigger `trg_license_status_update` runs before any license update to evaluate validity dates, automatically setting the status to `grace` or `suspended` if expiration limits have passed.

---

## 4. Developer KT Cheat Sheet: Common Tasks

### A. How to Add a New Licensable Application Module?
1. Edit the SQL migration `phase24_license_billing.sql`.
2. Append the new module insertion inside the `licensable_applications` table:
   ```sql
   INSERT INTO licensable_applications (code, name, description) 
   VALUES ('ncr', 'Non-Conformance Reports', 'NCR Module');
   ```

### B. How to Override Limits for a Custom Client License?
When invoking `create()` inside `license.service.js`, include the `limits` dictionary overrides:
```javascript
const customLimits = {
  max_users: 150, // Custom allocation
  max_storage_gb: 1000 // 1 Terabyte override
};
await licenseService.create({
  tenant_id,
  license_type: 'subscription',
  tier: 'custom',
  application: 'platform',
  limits: customLimits
});
```
