# Error Management Guide

## Purpose

This document defines a comprehensive error-management approach for QAssure across:

- Server-side (backend API, services, workflows, integrations)
- Client-side (frontend UX and API-consumption behavior)

It covers:

- Common system errors
- Module-specific scenarios
- Error response structure
- Logging, monitoring, and operational handling

---

## 1) Standard Error Response Contract (Backend)

All API errors should follow a consistent response payload:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  },
  "details": []
}
```

### Required fields

- `success`: always `false` for error responses
- `error.code`: stable, machine-readable identifier
- `error.message`: safe, user-facing summary (no secrets or stack trace)

### Optional fields

- `details`: validation or field-level issues
- `request_id` or trace ID (recommended for observability)

---

## 2) HTTP Status Mapping

| Category | HTTP Status | Example Codes |
|---|---:|---|
| Validation failure | 400 | `VALIDATION_ERROR`, `INVALID_PAYLOAD` |
| Authentication failure | 401 | `UNAUTHORIZED`, `TOKEN_EXPIRED` |
| Authorization failure | 403 | `FORBIDDEN`, `INSUFFICIENT_PERMISSION` |
| Resource missing | 404 | `NOT_FOUND`, `USER_NOT_FOUND` |
| Conflict/business rule | 409 | `CONFLICT`, `ALREADY_EXISTS`, `INVALID_STATE` |
| Unprocessable domain data | 422 | `BUSINESS_RULE_VIOLATION` |
| Rate limit | 429 | `RATE_LIMIT_EXCEEDED` |
| Dependency/integration error | 502/503/504 | `DEPENDENCY_ERROR`, `SERVICE_UNAVAILABLE`, `TIMEOUT` |
| Unexpected server failure | 500 | `INTERNAL_SERVER_ERROR` |

---

## 3) Common System Errors (Server-Side)

### 3.1 Request/Validation

- Invalid UUID / malformed params
- Missing required fields
- Invalid enum/state transitions
- Type mismatch (string sent for numeric/date fields)

Expected behavior:

- Return `400` with specific field details
- Never proceed with partial business logic

### 3.2 Authentication & Authorization

- Missing/invalid bearer token or API key
- Expired token/session
- Valid user without required permission/module access

Expected behavior:

- `401` for identity/auth failures
- `403` for permission failures
- Include concise remediation in message

### 3.3 Data/Database

- Unique constraint violations
- Foreign key violations
- Transaction rollback due to business rule
- Deadlock/connection exhaustion/timeouts

Expected behavior:

- Map known DB errors to `409`, `400`, or `422` when applicable
- Avoid exposing SQL/internal schema in response
- Log full technical details server-side

### 3.4 Integration/Infrastructure

- Redis/Kafka/Email/AI service unavailable
- Third-party API timeout
- Storage upload/download failure

Expected behavior:

- Return dependency-specific error (`502/503/504`)
- Retry where safe and idempotent
- Log latency and failure metadata

---

## 4) Module-Specific Error Scenarios

## 4.1 Identity / User / Role / Tenant

- User not found by ID
- Duplicate email during create/update
- Invalid role-module assignment
- Tenant access mismatch for non-super-admin
- Supplier user requested without linked `supplier_id`

Recommended codes:

- `USER_NOT_FOUND`
- `EMAIL_ALREADY_EXISTS`
- `ROLE_ASSIGNMENT_INVALID`
- `TENANT_ACCESS_DENIED`
- `SUPPLIER_LINK_NOT_FOUND`

## 4.2 Document Management

- Submit for review without required `workflow_definition_id`
- Invalid status transition (e.g., approve from non-review state)
- Reject/obsolete/checkout without required reason
- Make effective without `effective_date` or `signature_id`
- New version creation without content/change reason

Recommended codes:

- `WORKFLOW_DEFINITION_REQUIRED`
- `INVALID_DOCUMENT_STATE`
- `REASON_REQUIRED`
- `EFFECTIVE_DATE_REQUIRED`
- `SIGNATURE_REQUIRED`
- `VERSION_VALIDATION_ERROR`

## 4.3 Workflow Engine

- Workflow definition not found/active
- Invalid transition action for current step
- Task not assigned to current user
- Signature required but missing/invalid

Recommended codes:

- `WORKFLOW_DEFINITION_NOT_FOUND`
- `WORKFLOW_TRANSITION_INVALID`
- `TASK_ACCESS_DENIED`
- `SIGNATURE_VALIDATION_FAILED`

## 4.4 Supplier Management

- Supplier not found / tenant mismatch
- Duplicate supplier code
- Invalid status move (pending -> suspended directly, etc.)
- Audit/scorecard create failure due to missing references

Recommended codes:

- `SUPPLIER_NOT_FOUND`
- `SUPPLIER_CODE_CONFLICT`
- `SUPPLIER_STATUS_INVALID`
- `AUDIT_VALIDATION_ERROR`
- `SCORECARD_VALIDATION_ERROR`

## 4.5 File / Attachment Services

- File too large / unsupported type
- Virus scan failure
- Storage provider upload timeout
- Download attempted without permission

Recommended codes:

- `FILE_SIZE_EXCEEDED`
- `FILE_TYPE_NOT_ALLOWED`
- `FILE_SCAN_FAILED`
- `FILE_STORAGE_ERROR`
- `FILE_ACCESS_DENIED`

## 4.6 Reporting / Analytics

- Invalid filter set/date range
- Report definition missing
- Export generation timeout

Recommended codes:

- `REPORT_FILTER_INVALID`
- `REPORT_NOT_FOUND`
- `EXPORT_TIMEOUT`

---

## 5) Frontend Error Handling (Global Handler Based)

QAssure frontend uses a **global error handler** (API client/interceptors + centralized toast/UI messaging).

### 5.1 Global handling responsibilities

- Normalize backend error payload (`error.code`, `error.message`)
- Map unknown responses to fallback message
- Handle network failures and timeouts
- Route auth failures (`401`) to login/session refresh flow
- Block duplicate noisy toasts for identical errors

### 5.2 Page-level handling responsibilities

- Show field-level validation errors where applicable
- Show context-aware empty/error states in modules
- Keep form input intact on recoverable failures
- Allow retry for transient errors (network/dependency)

### 5.3 User-facing message strategy

- Keep messages short, actionable, and non-technical
- Do not expose stack traces or SQL errors
- Provide guidance:
  - retry
  - check input
  - contact admin if persistent

Example fallback:

- "Something went wrong. Please try again."
- "Unable to save right now. Retry in a moment."
- "You do not have permission for this action."

---

## 6) Logging & Observability

## 6.1 Backend logs

Log at least:

- `timestamp`
- `request_id`
- `user_id` (if available)
- `tenant_id` (if available)
- `route`, `method`, `status`
- `error.code`
- technical error metadata/stack (server logs only)

## 6.2 Monitoring metrics

Track:

- Error rate by route/module/status
- Top `error.code` frequency
- P95/P99 latency and timeout rates
- Dependency failure rates (DB, cache, message broker, third-party)

## 6.3 Alerting

Alert on:

- sudden spike in 5xx
- repeated auth failures / token anomalies
- workflow transition failures
- sustained dependency outage

---

## 7) Security & Compliance Rules

- Never return:
  - stack traces
  - SQL statements
  - secrets/tokens
  - internal infrastructure details
- Sanitize PII in logs when not required
- Respect tenant isolation in all error paths
- Ensure same authorization checks on success and failure branches

---

## 8) Testing Checklist

## 8.1 Backend

- Validation tests for required fields and UUIDs
- Permission tests (`401/403`)
- State transition tests for documents/workflows/suppliers
- DB constraint and transaction rollback tests
- Dependency timeout/failure simulation tests

## 8.2 Frontend

- Global handler mapping tests for each status class
- Form validation + API error rendering tests
- Retry/refresh flows for network/auth failures
- Module-specific UI states (empty/error/loading)

---

## 9) Quick Implementation Checklist

- [ ] Every controller returns standardized error payload
- [ ] Known business errors have stable `error.code`
- [ ] Unknown errors map to `INTERNAL_SERVER_ERROR`
- [ ] Global frontend handler maps all status classes
- [ ] Module-specific edge cases covered (document/workflow/supplier/etc.)
- [ ] Logging includes correlation/request IDs
- [ ] Automated tests include negative/error paths

