# QAssure Platform
# API Quick Reference Guide

| **Document ID**     | QASSURE-API-001          |
| ------------------- | ------------------------ |
| **Version**         | 1.2.0                    |
| **Release Date**    | 16 July 2026             |
| **Prepared For**    | L&T Technology Services  |
| **Prepared By**     | QAssure Development Team |
| **Status**          | Final Draft              |
| **Classification**  | CONFIDENTIAL             |

---

## Overview

All QAssure APIs follow REST conventions. The base URL is:

```
https://<your-domain>/api/v1
```

### Authentication

Every request must include a valid JWT in the `Authorization` header:

```
Authorization: Bearer <access_token>
```

For cross-tenant requests (Super Admin or Platform Users operating across boundaries), include:

```
x-tenant-id: <tenant_uuid>
```

*Note: For platform-scoped operations (e.g. SMTP config, global templates, system settings), Super Admins and Platform Users do not require the `x-tenant-id` header as tenant context is bypassed automatically.*

### Standard Response Envelope

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "limit": 20, "total": 145 }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "The document title is required.",
    "details": [{ "field": "title", "message": "Required" }]
  }
}
```

**Service Disabled Error (HTTP 403):**
```json
{
  "success": false,
  "error": {
    "code": "SERVICE_DISABLED",
    "service": "electronic_signature",
    "message": "The 'electronic signature' service is not enabled for your organization. Please contact your system administrator."
  }
}
```
> All platform-service guard rejections use this standardised `error`-nested format, consistent with all other API error responses.

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK – Request succeeded |
| 201 | Created – Resource created successfully |
| 400 | Bad Request – Invalid input |
| 401 | Unauthorized – Missing or invalid token |
| 403 | Forbidden – Insufficient permissions |
| 404 | Not Found – Resource does not exist |
| 409 | Conflict – Duplicate resource |
| 422 | Unprocessable Entity – Business rule violation |
| 429 | Too Many Requests – Rate limit exceeded |
| 500 | Internal Server Error |

**Authentication Error Codes:**

| Error Code | HTTP | Meaning |
|-----------|------|---------|
| `TOKEN_NOT_EXPIRED` | 400 | Refresh attempted while access token is still valid |
| `SESSION_EXPIRED` | 401 | Session revoked or refresh token expired |
| `SESSION_IDLE_TIMEOUT` | 401 | Session automatically revoked — user was idle beyond the configured `IDLE_TIMEOUT_MINUTES` threshold. The frontend should display a user-facing warning toast. |
| `USER_INACTIVE` | 401 | User account has been deactivated |
| `MISSING_TOKEN` | 401 | No authentication credential provided |
| `SERVICE_DISABLED` | 403 | Platform service has been disabled for this tenant |

---

## Module 1: Authentication (`/api/v1/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|:---:|
| POST | `/auth/login` | User login (email + password) | No |
| POST | `/auth/refresh` | Refresh access token. Requires current access token to be expired. Also enforces idle timeout: returns `SESSION_IDLE_TIMEOUT` (401) if the session has been idle longer than `IDLE_TIMEOUT_MINUTES`. | No |
| POST | `/auth/logout` | Revoke current session | Yes |
| POST | `/auth/forgot-password` | Send password reset email | No |
| POST | `/auth/reset-password` | Reset password with token | No |
| POST | `/auth/change-password` | Change password (authenticated) | Yes |
| POST | `/auth/sso/launch` | Generate SSO launch token for module | Yes |
| POST | `/auth/service-token` | Generate a long-lived service token | Yes |
| POST | `/auth/service-token/revoke` | Revoke a service token session | Yes |
| GET  | `/auth/me` | Get current user profile | Yes |

**Login Request:**
```json
POST /api/v1/auth/login
{
  "email": "user@company.com",
  "password": "SecurePass123!"
}
```

**Login Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "...",
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "role": "tenant_admin",
      "tenantId": "uuid"
    }
  }
}
```

**Create Service Token Request:**
```json
POST /api/v1/auth/service-token
{
  "duration": "24h"
}
```

**Create Service Token Response:**
```json
{
  "success": true,
  "data": {
    "service_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "expires_in": 86400,
    "expires_at": "2026-06-17T12:00:00.000Z",
    "refresh_expires_at": "2026-06-18T12:00:00.000Z",
    "session_id": "uuid"
  }
}
```

**Revoke Service Token Request:**
```json
POST /api/v1/auth/service-token/revoke
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

**Revoke Service Token Response:**
```json
{
  "success": true,
  "data": {
    "success": true,
    "message": "Service token revoked successfully"
  }
}
```

---

## Module 2: Users (`/api/v1/users`)

**Required Permission:** `users:read` / `users:create` / `users:update` / `users:delete`

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/users` | List all users (paginated, filterable). *Super Admin listing bypasses tenant filters to include suspended tenant admins.* |
| GET | `/users/:id` | Get user by ID |
| POST | `/users` | Create new user |
| PUT | `/users/:id` | Update user profile. *Updating status to 'active' automatically purges security/suspension metadata.* |
| DELETE | `/users/:id` | Deactivate user (soft delete) |
| POST | `/users/:id/activate` | Reactivate a deactivated user |
| PUT | `/users/:id/roles` | Update user role assignment |

**Query Parameters for GET /users:**
```
?page=1&limit=20&search=john&role=tenant_admin&status=active&sortBy=createdAt&sortOrder=desc
```


---

## Module 3: Tenants (`/api/v1/tenants`)

**Required Permission:** Super Admin only

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/tenants` | List all tenants |
| GET | `/tenants/:id` | Get tenant details |
| POST | `/tenants` | Create new tenant |
| PUT | `/tenants/:id` | Update tenant configuration |
| DELETE | `/tenants/:id` | Deactivate tenant |
| GET | `/tenants/:id/users` | List users in tenant |
| GET | `/tenants/:id/modules` | List modules assigned to tenant |
| POST | `/tenants/:id/modules` | Assign module to tenant |

---

## Module 4: Roles & Permissions (`/api/v1/roles`, `/api/v1/permissions`)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/roles` | List all roles in tenant |
| POST | `/roles` | Create custom role |
| PUT | `/roles/:id` | Update role |
| DELETE | `/roles/:id` | Delete custom role |
| GET | `/permissions` | List all available permissions |
| POST | `/roles/:id/permissions` | Assign permissions to role |
| DELETE | `/roles/:id/permissions/:permId` | Remove permission from role |

---

## Module 5: Documents (`/api/v1/documents`)

**Required Permission:** `document:read` / `document:create` / `document:update` / `document:delete`

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/documents` | List documents (paginated, filterable) |
| GET | `/documents/:id` | Get document details |
| POST | `/documents` | Create new document |
| PUT | `/documents/:id` | Update document metadata |
| DELETE | `/documents/:id` | Archive/delete document |
| POST | `/documents/:id/checkout` | Check out document for editing |
| POST | `/documents/:id/checkin` | Check in with new version |
| POST | `/documents/:id/submit` | Submit for review |
| POST | `/documents/:id/approve` | Approve document |
| POST | `/documents/:id/reject` | Reject with comments |
| POST | `/documents/:id/obsolete` | Mark as obsolete |
| GET | `/documents/:id/versions` | List all document versions |
| GET | `/documents/:id/audit-trail` | Get complete audit trail |

**Create Document Request:**
```json
POST /api/v1/documents
{
  "title": "SOP-001 - Quality Management Procedure",
  "category": "SOP",
  "type": "CONTROLLED",
  "description": "Standard operating procedure for...",
  "reviewIntervalDays": 365,
  "fileAttachmentId": "uuid"
}
```

---

## Module 6: CAPA (`/api/v1/capas`)

**Required Permission:** `capa:read` / `capa:create` / `capa:update`

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/capas` | List CAPAs (filterable by status, owner) |
| GET | `/capas/:id` | Get CAPA details with all 8D phases |
| POST | `/capas` | Initiate new CAPA |
| PUT | `/capas/:id` | Update CAPA |
| POST | `/capas/:id/transition` | Transition CAPA to next phase |
| GET | `/capas/:id/actions` | List action items |
| POST | `/capas/:id/actions` | Add action item |
| PUT | `/capas/:id/actions/:actionId` | Update action item |
| POST | `/capas/:id/close` | Close CAPA with effectiveness verification |

**Initiate CAPA Request:**
```json
POST /api/v1/capas
{
  "title": "Customer Complaint - Product Defect",
  "description": "Customer reported dimensional non-conformance...",
  "source": "CUSTOMER_COMPLAINT",
  "severity": "MAJOR",
  "detectedDate": "2026-06-01",
  "ownerId": "uuid",
  "dueDate": "2026-07-15"
}
```

---

## Module 7: Training (`/api/v1/training`)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/training/courses` | List all training courses |
| POST | `/training/courses` | Create new course |
| GET | `/training/courses/:id` | Get course with curriculum |
| POST | `/training/assignments` | Assign course to users |
| GET | `/training/assignments` | List assignments |
| PUT | `/training/assignments/:id/complete` | Mark assignment complete |
| GET | `/training/matrix` | Get competency matrix |
| GET | `/training/reports/compliance` | Training compliance report |

---

## Module 8: Workflows (`/api/v1/workflows`)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/workflows` | List workflow definitions |
| POST | `/workflows` | Create workflow definition |
| GET | `/workflows/:id` | Get workflow with states/transitions |
| POST | `/workflows/:id/instances` | Start a new workflow instance |
| GET | `/workflow-instances/:id` | Get workflow instance status |
| POST | `/workflow-instances/:id/transition` | Perform state transition |
| GET | `/workflow-instances/:id/history` | Get transition history |

---

## Module 9: File Management (`/api/v1/files`)

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/files/upload` | Upload file (multipart/form-data) |
| GET | `/files/:id` | Get file metadata |
| GET | `/files/:id/download` | Download file binary |
| GET | `/files/:id/preview` | Preview file (images/PDF) |
| DELETE | `/files/:id` | Delete file (soft delete) |
| GET | `/files` | List files with filters |

**Upload Request (multipart):**
```
POST /api/v1/files/upload
Content-Type: multipart/form-data

file: <binary>
category: DOCUMENT | LOGO | ATTACHMENT
description: "Optional description"
```

**Upload Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "filename": "SOP-001-v2.pdf",
    "mimeType": "application/pdf",
    "size": 245760,
    "url": "/api/v1/files/uuid/download",
    "fileDuplication": false
  }
}
```

---

## Module 10: Electronic Signatures (`/api/v1/electronic-signatures`)

> **Service Guard:** All endpoints in this module require the `electronic_signature` platform service to be enabled for the tenant. If disabled, the API returns HTTP 403 with `error.code = SERVICE_DISABLED`. Super Admins are exempt.

| Method | Endpoint | Description |
|--------|---------|-------------|
| POST | `/electronic-signatures/initiate` | Request signature for a record |
| POST | `/electronic-signatures/sign` | Submit signature with PIN |
| GET | `/electronic-signatures/:id` | Get signature record |
| GET | `/electronic-signatures/resource/:type/:recordId` | Get all signatures for a record |

**Sign Request:**
```json
POST /api/v1/electronic-signatures/uuid/sign
{
  "pin": "1234",
  "meaning": "I approve this document",
  "comments": "Reviewed and verified"
}
```

---

## Module 11: AI Gateway (`/api/v1/ai`)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/ai/providers` | List available AI providers |
| POST | `/ai/execute` | Execute AI prompt (standard) |
| POST | `/ai/stream` | Execute AI prompt (streaming) |
| POST | `/ai/cancel/:executionId` | Cancel ongoing AI execution |
| GET | `/ai/executions` | List recent executions |

**Execute Request:**
```json
POST /api/v1/ai/execute
{
  "prompt": "Analyze this CAPA and suggest root cause categories",
  "context": "CAPA-ID: 12345, Description: ...",
  "provider": "openai",
  "model": "gpt-4o",
  "maxTokens": 1000
}
```

---

## Module 12: Notifications (`/api/v1/notifications`)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/notifications` | List user notifications |
| PUT | `/notifications/:id/read` | Mark as read |
| PUT | `/notifications/read-all` | Mark all as read |
| DELETE | `/notifications/:id` | Delete notification |
| GET | `/notifications/settings` | Get notification preferences |
| PUT | `/notifications/settings` | Update preferences |

---

## Module 13: Reporting (`/api/v1/reports`)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/reports/dashboard` | Executive dashboard KPIs |
| GET | `/reports/capa-summary` | CAPA summary report |
| GET | `/reports/training-compliance` | Training compliance report |
| GET | `/reports/audit-logs` | Audit log report |
| POST | `/reports/generate` | Generate custom report |
| GET | `/reports/:id/download` | Download generated report (PDF/Excel) |

---

## Module 14: Audit Logs (`/api/v1/audit-logs`)

| Method | Endpoint | Description |
|--------|---------|-------------|
| GET | `/audit-logs` | List audit log entries |
| GET | `/audit-logs/:id` | Get specific audit log entry |

**Query Parameters:**
```
?userId=uuid&action=UPDATE&entityType=document&entityId=uuid&fromDate=2026-01-01&toDate=2026-06-01
```

---

## Module 15: Platform Services (`/api/v1/platform-services`)

| Method | Endpoint | Description | Auth Required |
|--------|---------|-------------|:---:|
| GET | `/platform-services` | List all platform services registry | Yes (Super Admin) |
| GET | `/platform-services/my` | Get enabled services keys for current tenant | Yes |
| GET | `/platform-services/tenant/:tenantId` | Get services status for specific tenant | Yes (Super Admin) |

---

## WebSocket Interface

**Connection:**
```
wss://<your-domain>/ws
```

**Authentication:** Pass JWT as query parameter on initial connection:
```
wss://<your-domain>/ws?token=<access_token>
```

**Event Types:**

| Event | Direction | Description |
|-------|----------|-------------|
| `notification:new` | Server → Client | New notification received |
| `workflow:transition` | Server → Client | Workflow state changed |
| `document:approved` | Server → Client | Document approval notification |
| `ai:stream:chunk` | Server → Client | AI streaming response chunk |
| `ai:stream:complete` | Server → Client | AI streaming completed |
| `ping` | Client → Server | Keep-alive heartbeat |

---

## Rate Limiting

| Endpoint Category | Limit |
|------------------|-------|
| Authentication endpoints | 10 requests / minute per IP |
| Standard API endpoints | 100 requests / minute per user |
| File upload endpoints | 20 requests / minute per user |
| AI execution endpoints | 10 requests / minute per user |
| Export/Report generation | 5 requests / minute per user |

---

## API Versioning

- Current version: `v1`
- Breaking changes will increment the major version (`/api/v2/`)
- Non-breaking additions are deployed within the current version
- Deprecated endpoints are announced 90 days before removal

---

*End of QASSURE-API-001*
