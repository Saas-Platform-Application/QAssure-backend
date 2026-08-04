# QAssure Backend — Complete Context for Next Claude Chat
**Date of handoff:** February 27, 2026
**Project:** QAssure — Multi-tenant SaaS Quality Management System for pharma/regulated industries
**Backend path:** `/Users/yasha/Desktop/QAssure-Details/QAssur-backend/`
**Yasha is:** CEO/Founder of Tech4Biz Solutions, Principal Software Architect, project owner

---

## 1. PROJECT OVERVIEW

QAssure is a multi-tenant SaaS platform for regulated industries (pharma, biotech, medical devices).
- **Platform team** (Yasha/Tech4Biz) owns: Auth, RBAC, Tenant management, Document Management, Workflow Engine, CAPA, Training, Supplier, Reporting, Notifications, Audit, E-Signature, Module Registry, AI Gateway
- **LTTS team** builds modules ON TOP of the platform: AiCE (AI Content Engine), AiCH (AI Compliance Hub), SQM, DHF, PMS, LSR
- Modules connect to QAssure via SSO launch tokens + Module API Keys
- Backend: Node.js, Express, PostgreSQL (Docker), Redis, Elasticsearch, Kafka, Socket.io
- Server runs on port 3000: `node server.js`
- Docker PostgreSQL: `docker exec -it qassure-postgres psql -U postgres -d qassure_dev`

---

## 2. MIGRATIONS STATUS — 054 TOTAL APPLIED

All 054 migrations applied and working. Key recent migrations:
- **053** — `workflow_delegates` table creation + `signature_id` column on `workflow_history`
- **054** — `api_keys.tenant_id` made nullable (for module-scoped tenant-agnostic keys)

Migration runner: `node src/migrations/migrate.js`
Migration files location: `src/migrations/`

---

## 3. KEY TEST CREDENTIALS

```
Super Admin:
  email: superadmin@ltts.com
  password: password
  role: super_admin
  tenant: null (platform-level)

Tenant Admin (Pharma Corp):
  email: admin@pharmacorp.com
  password: password
  tenant_id: c0000000-0000-0000-0000-000000000001
  tenant_name: Pharma Corp

Test Document ID: ae543169-8ad5-4676-8ef7-eadca7aef255
  document_number: SOP-2026-0001
  title: Sterile Manufacturing SOP
  current status: obsolete (went through full lifecycle this session)

Module UUID (test-aice): dc60d1aa-027f-46d0-bb53-2295970b1f4c
Module API Key: qas_f1555aa2d24ac69a39a377b814d1af3f75029d92da981e6460fc6781a60d7d9e
```

---

## 4. AUTHENTICATION — TWO COMPLETE FLOWS

### Flow 1 — Tenant User (JWT)
```
POST /api/v1/auth/login
Body: { email, password }
Response: { access_token: "eyJ..." }
Usage: Authorization: Bearer {token}
```

### Flow 2 — Module Developer (API Key)
```
Header: X-API-Key: qas_xxx...
Header: X-Tenant-ID: {tenant uuid}
No JWT. No user login.
```

### Super Admin Login
Super admin logs in without tenant. Auth service has bypass:
- `auth.service.js` lines 437-450: super_admin check skips NO_TENANT error
- `tenant.middleware.js`: super_admin bypasses tenant requirement in 2 places

---

## 5. MODULE API KEY ARCHITECTURE — WORLD-CLASS PATTERN (Stripe/Salesforce/AWS)

**The Core Design:**
- Module gets ONE API key at registration (identifies the module, tenant_id = NULL)
- Tenant context comes per request via `X-Tenant-ID` header
- Platform validates: key valid + module assigned to tenant + permission check

**Five Files Modified for This:**

### Fix 1 — `src/services/module.service.js` (line 296)
```javascript
// BEFORE (wrong):
}, userId, tenantId);
// AFTER (correct — module keys are tenant-agnostic):
}, userId, null);
```

### Fix 2 — `src/middleware/apikey.middleware.js`
Added X-Tenant-ID resolution + tenant-module access validation:
```javascript
const tenantIdFromHeader = req.headers['x-tenant-id'];
const resolvedTenantId = result.apiKey.tenantId || tenantIdFromHeader;

if (!resolvedTenantId) {
  return error: 'MISSING_TENANT'
}

// CRITICAL: uses tenant_module_access table (NOT tenant_modules)
// tenant_module_access has: module_id, tenant_id, enabled (boolean)
// tenant_modules is EMPTY — never used for this purpose
if (!result.apiKey.tenantId && result.apiKey.moduleId) {
  const tenantCheck = await query(
    `SELECT id FROM tenant_module_access 
     WHERE module_id = $1 AND tenant_id = $2 AND enabled = true`,
    [result.apiKey.moduleId, resolvedTenantId]
  );
  if (tenantCheck.rows.length === 0) {
    return error: 'MODULE_NOT_ASSIGNED'
  }
}
req.user.tenantId = resolvedTenantId;
```

### Fix 3 — `src/routes/document.routes.js`
```javascript
// BEFORE:
router.use(authenticate);    // JWT only
// AFTER:
router.use(authenticateAny); // JWT OR API Key
```

### Fix 4 — `src/services/auth.service.js` (lines 437-450)
Super admin bypass for tenant requirement — allows superadmin@ltts.com to log in without tenant.

### Fix 5 — `src/middleware/tenant.middleware.js`
Super admin bypass in two places — super_admin role skips tenant middleware.

---

## 6. DATABASE — CRITICAL TABLE FACTS

**api_keys table:**
- `tenant_id` is NOW NULLABLE (migration 054)
- Module-scoped keys: tenant_id = NULL
- Tenant-scoped keys (user API keys): tenant_id = the tenant UUID

**tenant_module_access table (THE CORRECT TABLE):**
- Columns: id, tenant_id, module_id, enabled (boolean), enabled_by, enabled_at, disabled_at, disabled_by, settings
- Used by apikey.middleware.js to validate module-tenant assignment
- Has UNIQUE constraint on (tenant_id, module_id)
- IMPORTANT: Check `enabled = true`, NOT `status = 'active'`

**tenant_modules table (EMPTY — NOT USED for this purpose):**
- Has status column but is EMPTY
- Do NOT query this table for module-tenant validation

**workflow_history table columns:**
- id, tenant_id, workflow_instance_id, event_type (NOT NULL), from_step_id, to_step_id, from_step_name, to_step_name, action, comments, performed_by, performed_by_name, performed_at (not created_at!), metadata, signature_id
- CRITICAL: Column is `performed_at` NOT `created_at`
- CRITICAL: `event_type` is NOT NULL — always include with value 'transition'

**workflow_delegates table (created in migration 053):**
```sql
id UUID PK, tenant_id UUID FK, delegator_id UUID FK, delegate_id UUID FK,
workflow_definition_id UUID FK, entity_type VARCHAR(100),
starts_at TIMESTAMPTZ NOT NULL, ends_at TIMESTAMPTZ,
is_active BOOLEAN DEFAULT TRUE, reason TEXT,
created_at TIMESTAMPTZ, created_by UUID FK
```

---

## 7. DOCUMENT SERVICE — 100% COMPLETE ✅

### All 17 Endpoints Working for BOTH Auth Flows:

| # | Method | Endpoint | Auth | Status |
|---|--------|----------|------|--------|
| 1 | GET | /documents/categories | JWT + API Key | ✅ Returns 6 |
| 2 | GET | /documents/types | JWT + API Key | ✅ Returns 9 |
| 3 | GET | /documents/statuses | JWT + API Key | ✅ Returns 6 |
| 4 | GET | /documents/due-for-review | JWT + API Key | ✅ |
| 5 | GET | /documents | JWT + API Key | ✅ |
| 6 | GET | /documents/:id | JWT + API Key | ✅ |
| 7 | GET | /documents/:id/versions | JWT + API Key | ✅ Returns 2 |
| 8 | POST | /documents | JWT + API Key | ✅ |
| 9 | PUT | /documents/:id | JWT + API Key | ✅ |
| 10 | POST | /documents/:id/versions | JWT + API Key | ✅ |
| 11 | POST | /documents/:id/checkout | JWT + API Key | ✅ |
| 12 | POST | /documents/:id/checkin | JWT + API Key | ✅ |
| 13 | POST | /documents/:id/submit | JWT + API Key | ✅ |
| 14 | POST | /documents/:id/approve | JWT + API Key | ✅ |
| 15 | POST | /documents/:id/reject | JWT + API Key | ✅ |
| 16 | POST | /documents/:id/make-effective | JWT + API Key | ✅ |
| 17 | POST | /documents/:id/obsolete | JWT + API Key | ✅ |

### Document Lifecycle State Machine:
```
draft → in_review → approved → effective → obsolete
         ↑←←←←←←←← reject ←←←←←←←←←←←←←←←←←←←
```

### Key Business Logic in document.service.js:
- `approve()`: only works on `in_review` status
- `reject()`: works on `in_review` or `approved`, returns to `draft`
- `makeEffective()`: only works on `approved` status; auto-calculates next_review_date = effective_date + category.review_frequency_months
- `makeObsolete()`: only works on `effective` status
- workflow_history INSERT uses: `event_type='transition'`, `performed_at=NOW()` (NOT created_at)
- workflow_history INSERT only runs if `doc.workflow_instance_id` exists

### Files Modified for Document Lifecycle:
- `src/services/document.service.js`: Added approve() (line 436), reject() (line 496), makeObsolete() (line 556); fixed workflow_history column names; added status checks
- `src/controllers/document.controller.js`: Added approve (line 215), reject (line 241), makeEffective (line 274), makeObsolete (line 307)
- `src/routes/document.routes.js`: Added 4 routes (lines 106-109) + changed `authenticate` → `authenticateAny`

---

## 8. FULL VALIDATION TEST RESULTS (Run Today)

```bash
# Test: Module API Key flows
TEST 1: No X-Tenant-ID → { success: false, error: "MISSING_TENANT" } ✅
TEST 2: With X-Tenant-ID (assigned tenant) → { success: true, count: 1 } ✅
TEST 3: Wrong tenant (not assigned) → { success: false, error: "MODULE_NOT_ASSIGNED" } ✅
TEST 4: JWT still works → { success: true, count: 1 } ✅

# Both auth flows validated on all endpoints:
JWT: categories(6) ✅, types(9) ✅, statuses(6) ✅, due-for-review(0) ✅, list(1) ✅, get(obsolete) ✅, versions(2) ✅
API Key: categories(6) ✅, list(1) ✅, get(obsolete) ✅, versions(2) ✅
```

---

## 9. MODULE REGISTRATION & API KEY FLOW

**Module Registration (Super Admin does this):**
```bash
POST /api/v1/modules
Headers: Authorization: Bearer {super_admin_token}
Body: {
  "module_id": "test-aice",
  "name": "AiCE Test Module",
  "version": "1.0.0",
  "runtime_language": "nodejs",
  "base_url": "http://localhost:4000",
  "health_endpoint": "/health",
  "status": "running"
}
Response includes: api_key with 35 permissions (auto-generated, one-time shown)
```

**Enable Module for Tenant:**
```bash
POST /api/v1/tenants/{tenant_id}/modules/{module_id}/enable
→ Inserts into tenant_module_access table with enabled=true
```

**LTTS Developer Integration Pattern:**
```
PRODUCTION: tenant_id comes from SSO verify-token response
DEVELOPMENT: tenant_id from .env (Super Admin provides dev tenant UUID)

Headers for every API call:
  X-API-Key: {module api key from registration}
  X-Tenant-ID: {from SSO session or .env}
```

**SSO Flow (user clicks module in QAssure):**
```
User clicks module → QAssure generates 60-sec single-use launch token
→ Browser redirects to module URL with token
→ Module calls POST /api/v1/modules/verify-launch-token with X-API-Key + token
→ Gets back: user.id, user.email, tenant.id, tenant.name, roles, permissions
→ Module creates its own session with this context
→ Module uses tenant_id from SSO for all subsequent QAssure API calls
```

---

## 10. LTTS DOCUMENTATION — COMPLETED THIS SESSION

LTTS team shared two template files:
1. `Service_API_List.xlsx` — spreadsheet with 16 columns per API
2. `Service_Details_Template.docx` — Word document template with 9 sections

**Both documents created for Document Service:**
- `Document_Service_API_List.xlsx` — all 17 endpoints, all 16 columns filled
- `Document_Service_Details.docx` — all 9 sections complete

**CRITICAL RULE for API Service Type column (caught and fixed this session):**
- Document Service (and ALL services going forward) supports BOTH tenant users AND module developers
- API Service Type MUST be: **"Integration / SAAS Platform"** (NOT just "SAAS Platform")
- This rule applies to every service that supports both auth flows

**Excel Column Structure (16 columns):**
1. Sr No | 2. Service | 3. API Service Type (Integration/SAAS platform or both) | 4. Api Name | 5. Method | 6. End Point API URL List | 7. Request Parameter with datatype | 8. Request Parameter mandatory | 9. Request Parameter optional | 10. Request Body | 11. Process/functionality | 12. Output/response with datatype | 13. Associate Table & Attributes | 14. db activities/functions | 15. Vector db details | 16. Redis cache details

**Word Document Section Structure:**
1. SERVICE NAME: [SERVICE]
2. Feature of Service
3. Scope (In Scope / Out of Scope for Phase 1)
4. Clear Responsibility Split (3.1 Platform Team / 3.2 Module Apps)
5. API List (summary table)
6. Typical Workflow (sub-sections: write path, versioning, etc.)
7. PostgreSQL DB Model (entities with attribute tables)
8. Qdrant Vector DB
9. Object Storage
10. Redis Cache Details

**Base API URL:** `https://backendqassure.tech4bizsolutions.com/api/v1`

---

## 11. WHAT NEEDS TO BE DONE NEXT (IN ORDER)

### Immediate Next Step: Workflow Engine Service
The pattern for each remaining service is:
1. Apply `authenticateAny` to that service's routes (one line change)
2. Test all endpoints for both JWT and API Key
3. Generate Service_API_List.xlsx and Service_Details.docx for that service

**Services Remaining (in order):**
1. **Workflow Engine** — task management, approvals, escalations
2. **CAPA** — corrective and preventive actions
3. **Training** — course assignments and completions
4. **Supplier** — supplier qualification and scoring
5. **Reporting** — KPIs and dashboards

**For Each Service — Route File Change:**
Find: `router.use(authenticate);`
Replace: `router.use(authenticateAny);`
Also import: `const { authenticateAny } = require('../middleware/apikey.middleware');`

---

## 12. DOCUMENT SERVICE — DB ENTITIES SUMMARY

**documents table key columns:**
id, tenant_id, document_number, title, description, content, version, status, category_id, type_id, effective_date, next_review_date, checked_out_by, checked_out_at, created_by, created_at, updated_at

**document_versions table:**
id, document_id, tenant_id, version, status, content, change_summary, created_by, created_at

**document_categories table:**
id, tenant_id, name, code, review_frequency_months (INT, default 12), requires_approval

**workflow_history table (used by document service):**
id, tenant_id, workflow_instance_id, event_type (NOT NULL), action, comments, performed_by, performed_at, signature_id

---

## 13. IMPORTANT ARCHITECTURAL DECISIONS MADE

1. **Module API keys are tenant-agnostic** — one key per module serves all tenants
2. **Tenant-module validation** uses `tenant_module_access` table with `enabled=true`
3. **All service routes** should use `authenticateAny` not `authenticate`
4. **Super admin** has no tenant_id, bypasses all tenant middleware
5. **Document service** requires reason field for reject and obsolete
6. **make-effective** requires `effective_date` in body and document must be in `approved` status
7. **next_review_date** auto-calculated = effective_date + review_frequency_months from category
8. **workflow_history** INSERT requires event_type='transition' explicitly

---

## 14. SERVER MANAGEMENT

```bash
# Kill and restart server
lsof -ti:3000 | xargs kill -9 && sleep 2 && node server.js > /dev/null 2>&1 &
sleep 4 && curl -s http://localhost:3000/health | jq .status

# Get token quickly
TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pharmacorp.com","password":"password"}' | jq -r '.data.access_token')

# Super admin token
SATOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"superadmin@ltts.com","password":"password"}' | jq -r '.data.access_token')

# Env vars for module testing
MODULE_API_KEY="qas_f1555aa2d24ac69a39a377b814d1af3f75029d92da981e6460fc6781a60d7d9e"
TENANT_ID="c0000000-0000-0000-0000-000000000001"
DOC_ID="ae543169-8ad5-4676-8ef7-eadca7aef255"
```

---

## 15. FILES CHANGED IN LAST TWO SESSIONS (COMPLETE LIST)

| File | Change |
|------|--------|
| `src/services/module.service.js` | Line 296: tenantId → null for module API keys |
| `src/middleware/apikey.middleware.js` | Added X-Tenant-ID resolution + tenant_module_access validation |
| `src/routes/document.routes.js` | authenticate → authenticateAny |
| `src/services/auth.service.js` | Super admin bypass for tenant requirement |
| `src/middleware/tenant.middleware.js` | Super admin bypass in 2 places |
| `src/services/document.service.js` | Added approve(), reject(), makeObsolete(); fixed workflow_history columns; status checks |
| `src/controllers/document.controller.js` | Added approve, reject, makeEffective, makeObsolete controllers |
| `src/routes/document.routes.js` | Added 4 lifecycle routes (approve, reject, make-effective, obsolete) |
| `src/migrations/053_fix_workflow_missing_columns.js` | workflow_delegates table + signature_id column |
| `src/migrations/054_make_api_keys_tenant_nullable.js` | api_keys.tenant_id nullable |

---

## 16. QUICK REFERENCE — COMPLETE API KEY TEST

```bash
MODULE_API_KEY="qas_f1555aa2d24ac69a39a377b814d1af3f75029d92da981e6460fc6781a60d7d9e"
TENANT_ID="c0000000-0000-0000-0000-000000000001"

# All 4 tests should pass:
curl -s http://localhost:3000/api/v1/documents -H "X-API-Key: $MODULE_API_KEY" | jq '{success:.success, error:.error.code}'
# → MISSING_TENANT ✅

curl -s http://localhost:3000/api/v1/documents -H "X-API-Key: $MODULE_API_KEY" -H "X-Tenant-ID: $TENANT_ID" | jq '{success:.success, count:(.data|length)}'
# → success:true, count:1 ✅

curl -s http://localhost:3000/api/v1/documents -H "X-API-Key: $MODULE_API_KEY" -H "X-Tenant-ID: c0000000-0000-0000-0000-000000000002" | jq '{success:.success, error:.error.code}'
# → MODULE_NOT_ASSIGNED ✅
```
