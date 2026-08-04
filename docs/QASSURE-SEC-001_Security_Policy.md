# QAssure Platform
# Security Policy Document

| **Document ID**     | QASSURE-SEC-001          |
| ------------------- | ------------------------ |
| **Version**         | 1.1.0                    |
| **Release Date**    | 08 July 2026             |
| **Prepared For**    | L&T Technology Services  |
| **Prepared By**     | QAssure Development Team |
| **Status**          | Final Draft              |
| **Classification**  | CONFIDENTIAL             |

---

## 1. Purpose and Scope

This Security Policy Document defines the security architecture, controls, and compliance posture of the QAssure Platform. It applies to:
- All production and staging QAssure environments
- All data processed, stored, or transmitted by the platform
- All personnel with access to the platform or its infrastructure

This document aligns with:
- **ISO/IEC 27001:2022** — Information Security Management Systems
- **OWASP Top 10 (2021)** — Web Application Security Risks
- **FDA 21 CFR Part 11** — Electronic Records and Signatures
- **GDPR** — General Data Protection Regulation

---

## 2. Security Architecture

### 2.1 Defense in Depth Model

```
┌─────────────────────────────────────────────────────────────────────┐
│  Layer 7: Application Security (Input validation, RBAC, audit logs) │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 6: API Gateway (Rate limiting, WAF, DDoS protection)         │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 5: Network Security (VPC, security groups, private subnets)  │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4: Transport Security (TLS 1.2+ for all communications)      │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: Authentication (JWT, API Keys, PIN-based e-signature)     │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: Authorization (RBAC, resource-action permissions)         │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 1: Data Security (Encryption at rest, tenant isolation)      │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Network Security

| Control | Implementation |
|---------|--------------|
| Network isolation | All services deployed in private VPC subnets |
| Ingress control | Only ports 80 (redirect) and 443 (HTTPS) exposed publicly |
| Database access | PostgreSQL and Redis accessible only from API pods (no public exposure) |
| Kafka access | Internal VPC only; SASL/TLS authentication required |
| Egress control | Outbound traffic restricted to approved external services (AI providers, SMTP) |

---

## 3. Authentication Security

### 3.1 Password Policy

| Policy | Requirement |
|--------|------------|
| Minimum length | 12 characters |
| Complexity | Uppercase + lowercase + digit + special character |
| History | Cannot reuse last 10 passwords |
| Maximum age | 90 days (configurable per tenant) |
| Algorithm | bcrypt with cost factor ≥ 12 |
| Hashing library | bcryptjs 2.4.3 |

### 3.2 JWT Token Security

| Property | Value |
|---------|-------|
| Algorithm | HS256 (configurable to RS256) |
| Access token lifetime | 15 minutes (configurable via `JWT_EXPIRES_IN`) |
| Refresh token lifetime | 7 days (configurable via `JWT_REFRESH_EXPIRES_IN`) |
| Service token lifetime | Up to 24 hours (configurable, session-backed) |
| Service refresh token lifetime | Service access token lifetime + 24 hours |
| Token storage (client) | Memory only (not localStorage) |
| Revocation mechanism | Database session status check and Redis cache validation (both standard & service tokens support immediate session revocation) |
| Refresh API protection | Token renewal is blocked via validation guard until active access token has expired (returns `TOKEN_NOT_EXPIRED`) |
| Idle timeout enforcement | Sessions idle longer than `IDLE_TIMEOUT_MINUTES` (default: 30 min) are automatically revoked at refresh time; returns `SESSION_IDLE_TIMEOUT` error code |
| Secret minimum length | 256 bits (32 bytes) |

### 3.3 Account Security

| Control | Implementation |
|---------|--------------|
| Brute force protection | Account locked after 5 failed attempts in 15 minutes |
| Rate limiting | 10 auth requests/minute per IP |
| Session management | Explicit logout invalidates all tokens via Redis blacklist |
| Concurrent session control | Configurable max sessions per user per tenant |
| Idle session auto-logout | Sessions are automatically revoked server-side when idle beyond `IDLE_TIMEOUT_MINUTES`; logout reason `idle_timeout` is recorded in the audit log for compliance traceability |
| Cross-tenant lockout protection | Account automatically suspended after 5 unauthorized attempts to access other tenant data; active sessions are immediately revoked (logoutAll) |

### 3.4 API Key Security

| Control | Implementation |
|---------|--------------|
| Format | `qassure_live_` prefix + 32-char random string |
| Storage | SHA-256 hash stored in DB; plaintext never stored |
| Transmission | Header only: `X-API-Key: value` |
| Scope | Keys scoped to tenant + permission set |
| Rotation | Keys can be rotated without system downtime |
| Expiration | Configurable TTL (default: no expiry) |

---

## 4. Authorization Security

### 4.1 RBAC Model

```
Super Admin
    │
    ├──► All tenants, all modules, all data
    │
Platform User (Delegated Admin)
    │
    ├──► Global configs, templates, modules, and failed emails (scoped by platform permissions)
    │
Tenant Admin
    │
    ├──► Own tenant: all modules, all users, all data
    │
Tenant User
    │
    └──► Own tenant: only permitted resources per role assignment
```

### 4.2 Permission Evaluation

Every API request is evaluated in this order:
1. **Token Validity:** JWT/API Key is valid and not revoked
2. **Tenant Scope Check:** User belongs to the requested tenant (bypassed if user is a Super Admin or Platform User operating on platform-level or cross-tenant resources)
3. **Platform Service Check:** Verify if the requested platform service (e.g. document, capa, training) is enabled for the tenant context. If disabled, request is immediately rejected with `SERVICE_DISABLED` (exempting Super Admins)
4. **Role Check:** User's role is active, platform-scoped (for platform users), or tenant-scoped
5. **Permission Check:** User's role has the required `resource:action` permission (evaluated dynamically via dual-mode middlewares for platform operations)
6. **Record Ownership (optional):** User owns or is assigned the requested record

**Fail-secure principle:** Any failure in the chain results in 403 Forbidden.

### 4.3 Permission Naming Convention

```
{module}:{action}

Examples:
  documents:read
  documents:create
  documents:approve
  capa:read
  capa:create
  users:manage
  reports:export
  e-signatures:sign
  admin:system-config
```

---

## 5. Data Security

### 5.1 Encryption at Rest

| Data Store | Encryption |
|-----------|-----------|
| PostgreSQL | AES-256 (managed by cloud provider RDS encryption) |
| Redis | AES-256 (managed by ElastiCache encryption at rest) |
| S3 File Storage | AES-256-SSE (Server-Side Encryption) |
| Database backups | AES-256 encrypted before transfer to backup storage |

### 5.2 Encryption in Transit

| Connection | Encryption |
|-----------|-----------|
| Client ↔ API | TLS 1.2+ (TLS 1.3 preferred) |
| API ↔ PostgreSQL | TLS 1.2+ (SSL mode: verify-full) |
| API ↔ Redis | TLS 1.2+ |
| API ↔ Kafka | TLS 1.2+ with SASL_SSL |
| API ↔ S3 | HTTPS (TLS 1.2+) |
| API ↔ AI Providers | HTTPS (TLS 1.2+) |

### 5.3 Multi-Tenant Data Isolation

All tenant data is logically isolated at the database level:
- Every tenant-scoped table includes a `tenant_id` foreign key
- All ORM queries are automatically scoped with `WHERE tenant_id = ?`
- Cross-tenant access is only possible for Super Admin with explicit `x-tenant-id` header
- Database Row-Level Security (RLS) is evaluated as an additional defense layer

### 5.4 Sensitive Data Handling

| Data Type | Handling |
|-----------|---------|
| Passwords | bcrypt hashed; never stored in plaintext |
| API Keys | SHA-256 hashed; displayed in plaintext only at creation |
| JWT Secrets | Environment variables only; never in source code |
| PII (names, emails) | Stored encrypted at database level |
| Electronic Signatures | Cryptographically linked to records; immutable |
| Audit Logs | Append-only; deletion requires Super Admin + 2FA |

---

## 6. Application Security Controls

### 6.1 Input Validation

- All request payloads validated using **Zod** schema validation
- Validation occurs at the controller layer before business logic
- Rejections return 400 Bad Request with field-level error details
- No user input is interpolated directly into SQL queries (parameterized queries via Sequelize ORM)

### 6.2 HTTP Security Headers (Helmet.js)

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `no-referrer` |
| `X-XSS-Protection` | `1; mode=block` |

### 6.3 Rate Limiting

| Endpoint Category | Limit | Window |
|------------------|-------|--------|
| Authentication | 10 requests | 1 minute per IP |
| Standard API | 100 requests | 1 minute per user |
| File uploads | 20 requests | 1 minute per user |
| AI execution | 10 requests | 1 minute per user |
| Report generation | 5 requests | 1 minute per user |

### 6.4 CORS Policy

```javascript
// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',');
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('CORS policy violation'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'x-tenant-id', 'X-API-Key'],
};
```

### 6.5 File Upload Security

| Control | Implementation |
|---------|--------------|
| MIME type validation | Whitelist of allowed MIME types (PDF, DOCX, XLSX, PNG, JPG) |
| File size limit | 100 MB maximum |
| Virus scanning | ClamAV scan before storage (configurable) |
| Filename sanitization | Strip path traversal characters; UUID-based storage filenames |
| Storage isolation | Files stored in tenant-namespaced S3 paths |

---

## 7. Audit Logging

### 7.1 Audit Events Captured

| Category | Events |
|---------|--------|
| Authentication | Login, logout (**including idle timeout auto-logout with reason `idle_timeout`**), failed login, password change, token refresh |
| Data Access | Read, create, update, delete on all quality records |
| Administration | User creation, role assignment, tenant configuration |
| Workflow | All state transitions with actor identity |
| Electronic Signatures | All signature events with timestamp and meaning |
| File Operations | Upload, download, delete |
| System Configuration | Any environment or security setting changes |

### 7.2 Audit Log Schema

```json
{
  "id": "uuid",
  "tenantId": "uuid",
  "userId": "uuid",
  "action": "UPDATE",
  "entityType": "document",
  "entityId": "uuid",
  "previousValue": { "status": "DRAFT" },
  "newValue": { "status": "IN_REVIEW" },
  "ipAddress": "192.168.1.100",
  "userAgent": "Mozilla/5.0...",
  "timestamp": "2026-06-09T08:30:00.000Z",
  "requestId": "uuid"
}
```

### 7.3 Audit Log Integrity

- Audit logs are **append-only** — updates and deletes are not permitted
- Logs are replicated to an immutable secondary store (e.g., AWS CloudWatch Logs, Splunk)
- Log integrity verified via cryptographic hash chains
- Retention: minimum 7 years (configurable per regulatory requirement)

---

## 8. Vulnerability Management

### 8.1 Dependency Security

```bash
# Run on every CI build
npm audit --audit-level=moderate

# Automated dependency updates
npx npm-check-updates -u
```

| Severity | Response SLA |
|---------|-------------|
| Critical | Patch within 24 hours |
| High | Patch within 7 days |
| Moderate | Patch within 30 days |
| Low | Patch in next sprint |

### 8.2 Penetration Testing Schedule

| Type | Frequency | Scope |
|------|-----------|-------|
| Internal security review | Per release | Code review, dependency audit |
| External penetration test | Annually | Full application + infrastructure |
| OWASP ZAP automated scan | Per sprint | API surface |
| Compliance audit | Annually | FDA 21 CFR Part 11, ISO 27001 |

---

## 9. Incident Response Plan

### 9.1 Incident Classification

| Level | Description | Response Time | Escalation |
|-------|-------------|--------------|-----------|
| P1 - Critical | Data breach, system compromise | 15 minutes | CISO + Legal |
| P2 - High | Service unavailable, auth bypass | 1 hour | Security Team + PM |
| P3 - Medium | Suspicious activity, performance issue | 4 hours | Security Team |
| P4 - Low | Minor anomaly, informational | Next business day | Dev Team |

### 9.2 Response Procedure

```
1. DETECT:    Security alert triggered (SIEM, monitoring, user report)
2. CONTAIN:   Isolate affected systems; disable compromised accounts
3. ASSESS:    Determine scope, impact, and attack vector
4. NOTIFY:    Internal escalation + regulatory notification (if required)
5. REMEDIATE: Apply patches, rotate credentials, restore services
6. RECOVER:   Verify system integrity; restore from backup if needed
7. REVIEW:    Post-incident analysis; update controls
8. DOCUMENT:  Incident report filed within 72 hours
```

### 9.3 Data Breach Notification

In the event of a confirmed personal data breach:
- **GDPR:** Notify supervisory authority within 72 hours
- **Client (L&T):** Notify within 24 hours of confirmation
- **Affected users:** Notify within 72 hours if high risk

---

## 10. GDPR Compliance

| Requirement | Implementation |
|------------|--------------|
| Lawful basis for processing | Documented per data category |
| Data minimization | Collect only what is functionally necessary |
| Right to access | Data export API for user's own data |
| Right to erasure | Soft-delete + pseudonymization; hard delete on request |
| Data retention | Configurable retention policies per tenant |
| Processing records | Maintained in compliance register |
| DPA agreements | Required for all third-party processors (AI providers, SMTP) |
| Data residency | Customer data stays in selected cloud region |

---

## 11. Business Continuity

| Control | Implementation |
|---------|--------------|
| Backup frequency | Daily automated backups |
| Backup retention | 30 days (configurable to 7 years) |
| Backup testing | Monthly restore test |
| Geographic redundancy | Multi-AZ deployment |
| Failover automation | K8s pod scheduling + cloud-managed DB failover |
| RTO | ≤ 1 hour |
| RPO | ≤ 15 minutes (with WAL streaming replication) |

---

## 12. Security Contacts

| Role | Contact |
|------|---------|
| Security Lead | security@qassure.com |
| Incident Response | incident@qassure.com |
| Vulnerability Disclosure | security-disclosure@qassure.com |
| Compliance Queries | compliance@qassure.com |
| DPO (Data Protection Officer) | dpo@qassure.com |

**Security Disclosure:** Responsible disclosure of vulnerabilities via `security-disclosure@qassure.com`. We aim to acknowledge within 48 hours and resolve critical issues within 7 days.

---

*End of QASSURE-SEC-001*
