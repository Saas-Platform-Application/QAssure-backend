# QAssure Platform
# Test Plan Document

| **Document ID**     | QASSURE-TST-001          |
| ------------------- | ------------------------ |
| **Version**         | 1.2.0                    |
| **Release Date**    | 16 July 2026             |
| **Prepared For**    | L&T Technology Services  |
| **Prepared By**     | QAssure Development Team |
| **Status**          | Final Draft              |
| **Classification**  | CONFIDENTIAL             |

---

## 1. Introduction

### 1.1 Purpose

This Test Plan defines the strategy, scope, resources, schedule, and approach for testing the QAssure Platform. It ensures the system meets functional requirements (QASSURE-SRS-001), non-functional requirements, and compliance mandates (FDA 21 CFR Part 11, ISO 9001:2015).

### 1.2 Test Objectives

- Verify all functional requirements from QASSURE-SRS-001 are implemented correctly
- Validate non-functional requirements (performance, security, availability)
- Confirm FDA 21 CFR Part 11 compliance for electronic records and signatures
- Ensure API contracts match QASSURE-API-001 specification
- Validate multi-tenant data isolation

### 1.3 Scope

**In Scope:**
- All REST API endpoints (200+)
- Authentication & authorization flows
- Multi-tenant data isolation
- All quality management modules (Documents, CAPA, Training, Workflow, Supplier, E-Signatures)
- AI Gateway integration
- File upload/download/deduplication
- WebSocket notifications
- Database integrity & migrations
- Security testing (OWASP Top 10)
- Performance testing at defined load levels

**Out of Scope:**
- Third-party AI provider internal behavior
- Cloud infrastructure stress testing (handled by cloud provider)
- Client browser compatibility beyond stated minimums

---

## 2. Test Strategy

### 2.1 Test Levels

```
┌─────────────────────────────────────────────────────────────────┐
│                        E2E / UAT Tests                         │
│   (Complete user journeys, cross-module workflows, UAT sign-off)│
├─────────────────────────────────────────────────────────────────┤
│                    Integration Tests                            │
│     (API contract tests, DB integration, Kafka integration)     │
├─────────────────────────────────────────────────────────────────┤
│                      Unit Tests                                 │
│          (Service layer, business logic, validators)            │
└─────────────────────────────────────────────────────────────────┘
                         Coverage Target: ≥ 70%
```

### 2.2 Test Types

| Type | Tool | Coverage Target | Owner |
|------|------|----------------|-------|
| Unit Tests | Jest / Mocha | ≥ 70% code coverage | Dev Team |
| Integration Tests | Supertest + Jest | All API endpoints | Dev Team |
| E2E Tests | Playwright / Cypress | Critical user journeys | QA Team |
| Performance Tests | K6 / JMeter | NFR-PERF requirements | QA Team |
| Security Tests | OWASP ZAP / Burp Suite | OWASP Top 10 | Security Team |
| Compliance Tests | Manual + Scripts | FDA 21 CFR Part 11 | QA + Compliance |
| Regression Tests | Automated suite | All features on each release | QA Team |

---

## 3. Test Environments

| Environment | Purpose | Data | Refresh Frequency |
|------------|---------|------|------------------|
| DEV | Active development | Synthetic test data | Continuous |
| QA/Test | QA testing | Anonymized prod-like data | Per sprint |
| Staging | Pre-production validation | Anonymized prod snapshot | Per release |
| Production | Live system | Real data | N/A |
| Sandbox | External integration testing | Isolated test data | On request |

---

## 4. Test Cases

### 4.1 Authentication & Authorization

| TC-ID | Test Case | Input | Expected Result | Priority |
|-------|-----------|-------|----------------|---------|
| TC-AUTH-001 | Valid login with correct credentials | `email: user@test.com, password: Valid123!` | 200 OK + JWT token returned | CRITICAL |
| TC-AUTH-002 | Login with incorrect password | `password: WrongPass` | 401 Unauthorized + error message | CRITICAL |
| TC-AUTH-003 | Login with non-existent email | `email: nobody@test.com` | 401 Unauthorized (no user info leak) | CRITICAL |
| TC-AUTH-004 | Account lockout after 5 failed attempts | 5x wrong password in 2 min | Account locked; 429 on attempt 6 | HIGH |
| TC-AUTH-005 | JWT token refresh | Valid refresh token | 200 OK + new access token | CRITICAL |
| TC-AUTH-006 | Access with expired JWT | Token expired by 1s | 401 Unauthorized | CRITICAL |
| TC-AUTH-007 | Access with revoked JWT | Token in blacklist | 401 Unauthorized | CRITICAL |
| TC-AUTH-008 | Super Admin cross-tenant access | `x-tenant-id: other-tenant` | 200 OK with correct tenant data | HIGH |
| TC-AUTH-009 | Tenant User cross-tenant access attempt (Automated Lockout) | `x-tenant-id: other-tenant` (5 attempts) | 403 Forbidden + user status updated to 'suspended' + all active sessions revoked immediately | CRITICAL |
| TC-AUTH-010 | Missing permission for action | User without `capa:create` POST to /capas | 403 Forbidden | CRITICAL |
| TC-AUTH-011 | API Key authentication | `X-API-Key: valid-key` | 200 OK | HIGH |
| TC-AUTH-012 | Invalid API Key | `X-API-Key: invalid` | 401 Unauthorized | HIGH |
| TC-AUTH-013 | SSO token generation | POST `/auth/sso/launch` | SSO URL + one-time token returned | HIGH |
| TC-AUTH-014 | SSO token reuse | Same token used twice | Second use returns 401 | HIGH |
| TC-AUTH-015 | SSO token expiry | Token used after 30s | 401 Unauthorized | HIGH |
| TC-AUTH-016 | Service Token Refresh & Guard | Refresh token while access token is valid vs expired | Throws 400 with `TOKEN_NOT_EXPIRED` when valid, allows 200 OK with new tokens when expired | CRITICAL |
| TC-AUTH-017 | Platform User cross-tenant access | `x-tenant-id: other-tenant` and Platform User has permission | 200 OK with correct tenant data | HIGH |
| TC-AUTH-018 | Platform User global configuration access | Access platform setting resource without tenant header | 200 OK (tenant context bypassed) | HIGH |
| TC-AUTH-019 | Platform User access without permissions | Platform User lacks specific permission on resource | 403 Forbidden | CRITICAL |
| TC-AUTH-020 | Idle session timeout — user idle beyond threshold | User idle for > `IDLE_TIMEOUT_MINUTES`; access token expires; frontend calls `/auth/refresh` | 401 with `error.code = SESSION_IDLE_TIMEOUT`; session revoked in DB; audit log entry with `reason: idle_timeout` | CRITICAL |
| TC-AUTH-021 | Active user not affected by idle timeout | User makes API calls within `IDLE_TIMEOUT_MINUTES`; access token expires; frontend calls `/auth/refresh` | 200 OK; new token pair returned; `last_activity_at` updated in sessions table | CRITICAL |
| TC-AUTH-022 | Suspended user reactivation | Reactivate suspended tenant admin or tenant user via EditUserModal | User status changes to 'active'; security metadata is cleared; user can successfully authenticate | CRITICAL |
| TC-AUTH-023 | Super Admin toggles platform service | Super Admin disables 'document' service for Tenant A | Tenant platform services table updated; cache invalidated; 'document' routes return 403; UI locks | CRITICAL |
| TC-AUTH-024 | Tenant User accesses disabled service | Tenant User requests `/api/v1/documents` for Tenant A | 403 Forbidden with `code: SERVICE_DISABLED` | CRITICAL |
| TC-AUTH-025 | Super Admin accesses disabled service | Super Admin requests `/api/v1/documents` for Tenant A | 200 OK (Super Admin bypasses service locks) | CRITICAL |
| TC-AUTH-026 | Custom Role modification with disabled service | Tenant Admin attempts to assign `documents:read` permission | Checkboxes for 'documents' resource are grayed out and uncheckable (locked indicator shown) | HIGH |


### 4.2 Multi-Tenant Data Isolation

| TC-ID | Test Case | Expected Result | Priority |
|-------|-----------|----------------|---------|
| TC-MT-001 | Tenant A cannot read Tenant B documents | 403/empty result | CRITICAL |
| TC-MT-002 | Tenant A cannot create users in Tenant B | 403 Forbidden | CRITICAL |
| TC-MT-003 | Database queries always include tenant_id WHERE clause | Verified via query log | CRITICAL |
| TC-MT-004 | Tenant-specific branding isolation | Each tenant gets own logo/colors | HIGH |
| TC-MT-005 | Super Admin can view all tenants' data | 200 OK with correct tenant data | HIGH |
| TC-MT-006 | Tenant provisioning creates isolated data schema | New tenant DB rows isolated | HIGH |

### 4.3 Document Management

| TC-ID | Test Case | Expected Result | Priority |
|-------|-----------|----------------|---------|
| TC-DOC-001 | Create document with all required fields | 201 Created + document ID | HIGH |
| TC-DOC-002 | Create document with missing required field (title) | 400 Bad Request + field error | HIGH |
| TC-DOC-003 | Check out document | Status: CHECKED_OUT; locked for others | HIGH |
| TC-DOC-004 | Check in document with new version | Version incremented; new file attached | HIGH |
| TC-DOC-005 | Concurrent checkout by two users | Second user gets 409 Conflict | HIGH |
| TC-DOC-006 | Document review workflow: Draft → InReview → Approved | State transitions correctly | CRITICAL |
| TC-DOC-007 | Reject document from review | State returns to Draft; comments recorded | HIGH |
| TC-DOC-008 | Approve document without e-signature | 422 Unprocessable - signature required | CRITICAL |
| TC-DOC-009 | Approve document with valid e-signature | Document moves to Approved; audit trail updated | CRITICAL |
| TC-DOC-010 | Version history completeness | All versions retrievable with diffs | HIGH |
| TC-DOC-011 | Document audit trail integrity | Every action logged with user+timestamp | CRITICAL |

### 4.4 CAPA Management

| TC-ID | Test Case | Expected Result | Priority |
|-------|-----------|----------------|---------|
| TC-CAPA-001 | Initiate CAPA with all required fields | 201 Created + CAPA ID | HIGH |
| TC-CAPA-002 | 8D phase progression (D1→D8) | Each phase accessible in sequence | CRITICAL |
| TC-CAPA-003 | Add action item with due date | Action item created with owner | HIGH |
| TC-CAPA-004 | Overdue action item triggers notification | Escalation email/notification sent | HIGH |
| TC-CAPA-005 | Close CAPA with effectiveness verification | CAPA status: CLOSED; verification recorded | CRITICAL |
| TC-CAPA-006 | CAPA linked to source non-conformance | Cross-reference maintained | MEDIUM |
| TC-CAPA-007 | CAPA report generation (PDF) | Valid PDF with all 8D data | HIGH |

### 4.5 Electronic Signatures (FDA 21 CFR Part 11)

| TC-ID | Test Case | Expected Result | Priority |
|-------|-----------|----------------|---------|
| TC-ESIG-001 | Sign record with correct PIN | 200 OK; signature record created with timestamp | CRITICAL |
| TC-ESIG-002 | Sign record with wrong PIN | 401 Unauthorized; attempt logged | CRITICAL |
| TC-ESIG-003 | Signature record contains mandatory fields | userId, timestamp, meaning, recordId all present | CRITICAL |
| TC-ESIG-004 | Signed record integrity check | Any tampering detectable | CRITICAL |
| TC-ESIG-005 | Signature audit trail immutability | Signature audit records cannot be deleted | CRITICAL |
| TC-ESIG-006 | Multiple signatures on same record | All signatures maintained in sequence | HIGH |
| TC-ESIG-007 | Signature by deactivated user blocked | 403 Forbidden | HIGH |

### 4.6 AI Gateway

| TC-ID | Test Case | Expected Result | Priority |
|-------|-----------|----------------|---------|
| TC-AI-001 | Execute prompt with valid provider | 200 OK + AI response | HIGH |
| TC-AI-002 | Streaming execution returns chunks | SSE stream with data chunks | HIGH |
| TC-AI-003 | Cancel ongoing streaming execution | Execution cancelled; stream terminated | MEDIUM |
| TC-AI-004 | Primary provider timeout triggers failover | Secondary provider used | HIGH |
| TC-AI-005 | Rate limiting on AI endpoints | 429 after 10 req/min | HIGH |

### 4.7 File Management

| TC-ID | Test Case | Expected Result | Priority |
|-------|-----------|----------------|---------|
| TC-FILE-001 | Upload valid PDF file | 201 Created + file metadata | HIGH |
| TC-FILE-002 | Upload file exceeding size limit (>100MB) | 400 Bad Request + size error | HIGH |
| TC-FILE-003 | Upload file with invalid MIME type (e.g., .exe) | 400 Bad Request + MIME error | HIGH |
| TC-FILE-004 | Download uploaded file | 200 OK + binary file content | HIGH |
| TC-FILE-005 | File deduplication: upload same file twice | Second upload returns existing blob reference | MEDIUM |
| TC-FILE-006 | `fileDuplication: true` in response for shared blobs | Response field correctly set | MEDIUM |
| TC-FILE-007 | Cross-tenant file access prevented | 403 Forbidden | CRITICAL |

### 4.8 UI Enhancements & Bug Fixes (Sprint — July 2026)

| TC-ID | Test Case | Expected Result | Priority |
|-------|-----------|----------------|---------|
| TC-UI-001 | Tenant Creation Wizard — Logo/Favicon upload removed | The Create Tenant wizard must not display or process a logo or favicon upload field. Branding assets must only be configurable from Organisation Settings post-creation. | HIGH |
| TC-UI-002 | Tenant Creation Wizard — No upload success/error toast shown | Completing the wizard must not trigger any file-upload success or failure toast notification. | HIGH |
| TC-UI-003 | Dashboard Quick Action — New User opens modal | Tenant Admin clicks **New User** in Quick Actions panel; system navigates to `/tenant/users` and the Create User modal auto-opens within ≤ 1 second | CRITICAL |
| TC-UI-004 | Dashboard Quick Action — New Role opens modal | Tenant Admin clicks **New Role**; navigates to `/tenant/roles`; Create Role modal auto-opens | HIGH |
| TC-UI-005 | Dashboard Quick Action — New Dept opens modal | Tenant Admin clicks **New Dept**; navigates to `/tenant/departments`; Create Department modal auto-opens | HIGH |
| TC-UI-006 | Dashboard Quick Action — New Desig opens modal | Tenant Admin clicks **New Desig**; navigates to `/tenant/designations`; Create Designation modal auto-opens | HIGH |
| TC-UI-007 | Dashboard Quick Action — modal does not reopen on page refresh | After the modal is auto-opened and closed, refreshing the page does NOT reopen the modal (navigation state is cleared) | HIGH |
| TC-UI-008 | Workflow Tasks — single assignee shows email + name | Task with one assignee displays `user@domain.com (Full Name)` in the Assigned To column | HIGH |
| TC-UI-009 | Workflow Tasks — multiple assignees show ellipsis + tooltip | Task with 2+ assignees shows first user's info followed by `...`; hovering over `...` displays a tooltip with all assignees | HIGH |
| TC-UI-010 | SERVICE_DISABLED error format consistency | Calling any API endpoint for a disabled tenant service returns `{ "success": false, "error": { "code": "SERVICE_DISABLED", "service": "...", "message": "..." } }` — error fields are nested under the `error` key | CRITICAL |
| TC-UI-011 | Frontend toast on SERVICE_DISABLED — displays correct message | When a disabled-service 403 is received, the UI toast notification displays the human-readable message from `error.message`, not a raw JSON string or undefined | HIGH |

---

## 5. Performance Test Plan

### 5.1 Load Test Scenarios (K6)

```javascript
// k6 load test - ramp up to 500 concurrent users
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '2m', target: 100 },    // Ramp up to 100 users
    { duration: '5m', target: 500 },    // Ramp up to 500 users
    { duration: '10m', target: 500 },   // Hold at 500
    { duration: '2m', target: 0 },      // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'],   // 95% of requests < 500ms
    http_req_failed: ['rate<0.01'],     // Error rate < 1%
  },
};

export default function() {
  const res = http.get('https://api.qassure.com/api/v1/documents', {
    headers: {
      'Authorization': `Bearer ${__ENV.JWT_TOKEN}`,
      'x-tenant-id': __ENV.TENANT_ID,
    },
  });

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 200ms': (r) => r.timings.duration < 200,
  });

  sleep(1);
}
```

### 5.2 Performance Acceptance Criteria

| Scenario | Concurrent Users | P95 Response Time | Error Rate |
|---------|-----------------|------------------|-----------|
| Standard API reads | 500 | < 200ms | < 0.1% |
| Document uploads (5MB) | 50 | < 2s | < 0.5% |
| AI prompt execution | 20 | < 120s | < 1% |
| WebSocket connections | 1000 | Connection < 100ms | < 0.1% |
| Report generation | 10 | < 30s | < 1% |

---

## 6. Security Test Plan

### 6.1 OWASP Top 10 Coverage

| OWASP Risk | Test Approach | Tool |
|-----------|-------------|------|
| A01: Broken Access Control | Auth bypass attempts, IDOR testing, cross-tenant access | OWASP ZAP + Manual |
| A02: Cryptographic Failures | TLS version check, JWT algorithm confusion | SSLScan + Manual |
| A03: Injection | SQL injection on all input fields | SQLMap + OWASP ZAP |
| A04: Insecure Design | Architecture review, threat modeling | Manual Review |
| A05: Security Misconfiguration | Headers, CORS, error messages, default creds | OWASP ZAP |
| A06: Vulnerable Components | Dependency audit | `npm audit`, Snyk |
| A07: Auth & Session Failures | Session fixation, token reuse, brute force | Burp Suite |
| A08: Data Integrity | JWT manipulation, unverified deserialization | Burp Suite |
| A09: Logging Failures | Verify all security events logged | Manual + Log Review |
| A10: SSRF | Server-side request forgery via URL inputs | Manual Testing |

---

## 7. Compliance Test Plan (FDA 21 CFR Part 11)

| Requirement | Section | Test Method |
|------------|---------|------------|
| System access controls | §11.10(a) | Verify RBAC prevents unauthorized access |
| Audit trails | §11.10(e) | Verify all record changes logged with user + timestamp |
| System validation | §11.10(a) | IQ/OQ/PQ documentation |
| Signature manifestations | §11.50 | Verify signature records include: user, meaning, timestamp |
| Signature linking | §11.70 | Verify signatures cryptographically linked to records |
| Sequence controls | §11.200(a)(2) | Verify multi-signature sequences enforced |
| Biometric controls | §11.300 | Verify PIN-based identity verification |

---

## 8. Test Execution Schedule

| Phase | Duration | Activities |
|-------|---------|-----------|
| Test Planning | Week 1 | Finalize test cases, environment setup |
| Unit Testing | Weeks 2-4 | Dev team, continuous via CI pipeline |
| Integration Testing | Weeks 3-5 | API contract tests, DB integration |
| System Testing | Weeks 5-7 | Full functional test execution |
| Performance Testing | Week 6 | Load/stress test execution |
| Security Testing | Week 7 | Penetration testing, OWASP scan |
| UAT | Weeks 8-9 | L&T stakeholder UAT sign-off |
| Regression | Week 10 | Final regression before go-live |

---

## 9. Defect Management

### Defect Severity Classification

| Severity | Description | Resolution SLA |
|---------|-------------|---------------|
| S1 - Critical | System crash, data loss, security breach | 4 hours |
| S2 - High | Feature unusable, compliance violation | 24 hours |
| S3 - Medium | Feature partially works, workaround available | 72 hours |
| S4 - Low | Minor UI issue, documentation error | Next sprint |

### Entry/Exit Criteria

**Test Phase Entry:**
- Test environment deployed and stable
- Test data loaded
- Previous phase exit criteria met

**Test Phase Exit:**
- 100% of planned test cases executed
- All S1/S2 defects resolved and verified
- S3 defects reviewed and accepted by client
- Test summary report approved

---

## 10. Test Deliverables

| Deliverable | Description | Recipient |
|------------|-------------|---------|
| Test Cases (this document) | Full test case library | L&T + QAssure |
| Test Execution Report | Per-sprint execution results | L&T PM |
| Defect Report | Open/closed defects per cycle | L&T PM |
| Performance Test Report | Load test results vs. NFR thresholds | L&T Architect |
| Security Test Report | OWASP findings and remediations | L&T Security |
| UAT Sign-Off Document | Formal client acceptance | L&T Stakeholders |

---

*End of QASSURE-TST-001*
