# QAssure Platform
# Software Requirements Specification (SRS)

| **Document ID**     | QASSURE-SRS-001          |
| ------------------- | ------------------------ |
| **Version**         | 1.2.0                    |
| **Release Date**    | 16 July 2026             |
| **Prepared For**    | L&T Technology Services  |
| **Prepared By**     | QAssure Development Team |
| **Status**          | Final Draft              |
| **Classification**  | CONFIDENTIAL             |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Overall Description](#2-overall-description)
3. [Functional Requirements](#3-functional-requirements)
4. [Non-Functional Requirements](#4-non-functional-requirements)
5. [External Interface Requirements](#5-external-interface-requirements)
6. [System Constraints](#6-system-constraints)
7. [Compliance Requirements](#7-compliance-requirements)

---

## 1. Introduction

### 1.1 Purpose

This Software Requirements Specification (SRS) document describes the functional and non-functional requirements for the **QAssure Platform** — a cloud-native, multi-tenant Quality Assurance Management System. It serves as the contractual baseline between L&T Technology Services and the QAssure development team.

### 1.2 Scope

The QAssure Platform encompasses:
- Multi-tenant Identity & Access Management
- Document Control & Version Management
- CAPA (Corrective and Preventive Action) Management
- Training & Competency Management
- Supplier Quality Management
- Workflow Automation Engine
- AI-Powered Analytics Gateway
- Electronic Signatures (FDA 21 CFR Part 11 Compliant)
- Real-Time Notification System
- Reporting & Analytics
- Licensing & Billing
- Idle Session Auto-Logout

### 1.3 Definitions

| Term | Definition |
|------|-----------|
| Tenant | An isolated organizational unit within the multi-tenant platform |
| Super Admin | Platform-level administrator with cross-tenant access |
| Platform User | Platform-level administrator with delegated permissions scoped to specific administration resources |
| Tenant Admin | Organization-level administrator managing a single tenant |
| CAPA | Corrective and Preventive Action — a quality process to address non-conformances |
| 8D | Eight Disciplines — a problem-solving methodology used in CAPA |
| SSO | Single Sign-On — seamless authentication between QAssure and external modules |
| JWT | JSON Web Token — a compact token format for authentication |
| Idle Timeout | The maximum period of user inactivity after which the session is automatically revoked |

---

## 2. Overall Description

### 2.1 Product Perspective

QAssure is a standalone SaaS platform operating as the central hub for quality management. External quality modules (e.g., Document Management, CAPA tools) integrate via SSO and REST APIs.

```
[Browser / Mobile Client]
         │
         ▼
[API Gateway / Load Balancer]
         │
    ┌────┴─────┐
    │  QAssure │
    │  Backend │
    └────┬─────┘
    ┌────┴──────────────────────────────┐
    │  PostgreSQL │  Redis  │  Kafka    │
    └─────────────┴─────────┴───────────┘
```

### 2.2 Product Functions

| # | Function | Description |
|---|---------|-------------|
| F-01 | User Authentication | JWT-based login, refresh tokens, password reset |
| F-02 | Multi-Tenant Management | Tenant provisioning, isolation, branding |
| F-03 | Role-Based Access Control | Granular permission system with role hierarchy |
| F-04 | Document Control | Versioned document lifecycle with approval workflows |
| F-05 | CAPA Management | 8D methodology workflows with root cause analysis |
| F-06 | Training Management | Course assignment, completion tracking, certification |
| F-07 | Supplier Quality | Supplier registration, audits, scorecards, ASL |
| F-08 | Workflow Engine | Configurable state-machine based process automation |
| F-09 | Electronic Signatures | Part 11 compliant e-signature with PIN verification |
| F-10 | AI Gateway | Multi-provider AI for quality analytics and insights |
| F-11 | Notifications | Email and real-time WebSocket notifications |
| F-12 | Reporting | KPI dashboards, scheduled reports, data export |
| F-13 | Audit Trails | Immutable logs of all user actions and data changes |
| F-14 | File Management | Secure upload, download, deduplication, versioning |
| F-15 | Module SSO Launch | One-click launch of integrated quality modules |
| F-16 | Licensing & Billing | Usage tracking, invoicing, subscription management |
| F-17 | Idle Session Auto-Logout | Server-side inactivity enforcement: automatically revokes sessions and logs out users who exceed the configured idle timeout period |

### 2.3 User Classes

| User Class | Description | Access Level |
|-----------|-------------|--------------|
| Super Admin | Platform administrator; manages tenants, modules, platform config | Full platform access |
| Platform User | Platform-level delegated administrator; manages scoped settings/resources | Scoped platform access (bypasses tenant checks) |
| Tenant Admin | Organization admin; manages users, roles, modules within their tenant | Tenant-scoped full access |
| Quality Manager | Oversees document control, CAPA, audits | Read/write on quality modules |
| Quality Engineer | Creates/updates quality records | Create/update own records |
| Auditor | Reviews records; generates compliance reports | Read-only on assigned modules |
| External Auditor | Third-party reviewer with restricted temporary access | Limited read-only |
| Training Coordinator | Manages training assignments and course content | Training module full access |
| End User | Completes assigned tasks (training, e-signatures, etc.) | Task-specific access only |

---

## 3. Functional Requirements

### 3.1 Authentication & Authorization (FR-AUTH)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-AUTH-001 | The system shall authenticate users via email/password with bcrypt hashing (min cost factor 12) | MUST |
| FR-AUTH-002 | The system shall issue JWT access tokens with configurable expiry (default: 15 min) | MUST |
| FR-AUTH-003 | The system shall issue refresh tokens with configurable expiry (default: 7 days) | MUST |
| FR-AUTH-004 | The system shall maintain a Redis blacklist for revoked JWT tokens | MUST |
| FR-AUTH-005 | The system shall support API Key authentication for external system integrations | MUST |
| FR-AUTH-006 | The system shall support SSO token generation for module launch with single-use tokens | MUST |
| FR-AUTH-007 | The system shall enforce RBAC with delegated platform-scoped and tenant-scoped role structures (Super Admin → Platform User / Tenant Admin → User) | MUST |
| FR-AUTH-008 | The system shall support granular resource-action permissions (e.g., `documents:read`, `capa:create`) | MUST |
| FR-AUTH-009 | The system shall log all authentication events to the audit trail | MUST |
| FR-AUTH-010 | The system shall lock accounts after 5 failed login attempts for 15 minutes | SHOULD |
| FR-AUTH-011 | The system shall support service tokens with associated refresh tokens expiring 24 hours after the service token's expiration | MUST |
| FR-AUTH-012 | The system shall block token refresh requests via a validation guard if the active access token has not yet expired | MUST |
| FR-AUTH-013 | The system shall support platform-scoped roles enabling delegated administration on platform settings, SMTP configuration, templates, and users while bypassing tenant context checks | MUST |
| FR-AUTH-014 | The system shall automatically revoke a user session and return a `SESSION_IDLE_TIMEOUT` error during token refresh if the session has been idle for longer than the configured `IDLE_TIMEOUT_MINUTES` value; the frontend shall display a user-facing notification informing the user of the reason for logout | MUST |
| FR-AUTH-015 | The system shall automatically suspend a user account and revoke all active sessions (logoutAll) if they attempt to perform cross-tenant API requests (access other tenant data) 5 times, logging this event in the audit trail | MUST |


### 3.2 Multi-Tenancy (FR-TENANT)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-TENANT-001 | The system shall provide complete data isolation between tenants at the database level | MUST |
| FR-TENANT-002 | Each tenant shall have configurable branding (logo, favicon, primary colors), managed post-tenant-creation to align with storage bucket availability | MUST |
| FR-TENANT-003 | The system shall resolve tenant context from the `x-tenant-id` HTTP header | MUST |
| FR-TENANT-004 | Tenant-specific configuration (password policy, session timeout, etc.) shall be independently configurable | MUST |
| FR-TENANT-005 | The Super Admin shall be able to provision new tenants without system downtime | MUST |
| FR-TENANT-006 | Each tenant shall be assignable to specific quality modules | MUST |
| FR-TENANT-007 | The system shall enable the Super Admin to toggle (enable/disable) 14 controllable internal platform services (Document, Training, CAPA, Supplier Quality, Workflow, Projects, Reporting, Electronic Signatures, AI Gateway, QMS Integration, File Attachments, Storage Buckets, Security Policy, and License Billing) per tenant | MUST |
| FR-TENANT-008 | The system shall dynamically lock UI elements (e.g. sidebar navigation, role permission configuration) with tooltips when services are disabled for the tenant | MUST |
| FR-TENANT-009 | The system shall reject backend requests targeting disabled tenant services with a `SERVICE_DISABLED` (HTTP 403) status, while exempting Super Admins | MUST |
| FR-TENANT-010 | The tenant dashboard shall provide quick actions (New User, New Role, New Department, New Designation) that redirect the administrator and automatically launch the creation modal for that entity on load | MUST |

### 3.3 Document Management (FR-DOC)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-DOC-001 | The system shall support document creation with metadata (title, category, version, revision) | MUST |
| FR-DOC-002 | The system shall implement document versioning (Major.Minor format) | MUST |
| FR-DOC-003 | The system shall support document check-out/check-in to prevent concurrent editing | MUST |
| FR-DOC-004 | The system shall route documents through configurable Draft → Review → Approved → Obsolete workflow | MUST |
| FR-DOC-005 | Approved documents shall require electronic signature for state transition | MUST |
| FR-DOC-006 | The system shall support periodic review scheduling with configurable review intervals | MUST |
| FR-DOC-007 | The system shall track all document changes in a complete audit trail | MUST |
| FR-DOC-008 | The system shall support document linking (parent-child, cross-references) | SHOULD |
| FR-DOC-009 | The system shall support full-text search within document metadata | SHOULD |

### 3.4 CAPA Management (FR-CAPA)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-CAPA-001 | The system shall support CAPA initiation from non-conformance reports, audits, or manual entry | MUST |
| FR-CAPA-002 | The system shall implement the 8D problem-solving methodology (D1–D8 phases) | MUST |
| FR-CAPA-003 | Each CAPA phase shall require designated owner assignment | MUST |
| FR-CAPA-004 | The system shall track root cause analysis with configurable cause categorization | MUST |
| FR-CAPA-005 | Action plans shall have due dates with automated escalation notifications | MUST |
| FR-CAPA-006 | The system shall track CAPA effectiveness verification with configurable criteria | MUST |
| FR-CAPA-007 | CAPA records shall be linked to source documents, audit findings, or supplier records | SHOULD |
| FR-CAPA-008 | The system shall generate CAPA KPI metrics (open CAPAs, overdue, closed-on-time rate) | SHOULD |

### 3.5 Training Management (FR-TRAIN)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-TRAIN-001 | The system shall support training course creation with curriculum content | MUST |
| FR-TRAIN-002 | Training assignments shall be auto-triggered by document approval events | MUST |
| FR-TRAIN-003 | The system shall track training completion with pass/fail status and scores | MUST |
| FR-TRAIN-004 | Competency matrices shall map employees to required competencies and training | SHOULD |
| FR-TRAIN-005 | Training certificates shall be automatically generated upon completion | SHOULD |
| FR-TRAIN-006 | The system shall send escalation reminders for overdue training assignments | MUST |

### 3.6 Workflow Engine (FR-WF)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-WF-001 | The system shall support configurable workflow definitions with custom states and transitions | MUST |
| FR-WF-002 | State transitions shall enforce configurable approval/rejection conditions | MUST |
| FR-WF-003 | Workflows shall support parallel approval paths (any/all approvers) | SHOULD |
| FR-WF-004 | The system shall support workflow task delegation and escalation | SHOULD |
| FR-WF-005 | Workflow events shall be published to Kafka for downstream consumption | MUST |
| FR-WF-006 | State transition history shall be stored for complete auditability | MUST |
| FR-WF-007 | The workflow task list shall display assignments using the email and user's full name in brackets (e.g., `email (Name)`) instead of relative/generic names | MUST |
| FR-WF-008 | For tasks with multiple assignees, the system shall show the first assignee followed by an ellipsis (`...`) and display a tooltip containing all assignees on hover | MUST |

### 3.7 Electronic Signatures (FR-ESIG)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-ESIG-001 | The system shall implement electronic signatures compliant with FDA 21 CFR Part 11 | MUST |
| FR-ESIG-002 | E-signatures shall require PIN re-authentication for identity verification | MUST |
| FR-ESIG-003 | Signature records shall include timestamp, user identity, and meaning of signature | MUST |
| FR-ESIG-004 | Signed records shall be cryptographically linked to prevent tampering | MUST |
| FR-ESIG-005 | All signature events shall be logged in an immutable audit trail | MUST |

### 3.8 AI Gateway (FR-AI)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-AI-001 | The system shall support multi-provider AI routing (OpenAI, Anthropic, custom VLLM) | MUST |
| FR-AI-002 | The system shall support streaming and non-streaming AI completions | MUST |
| FR-AI-003 | AI requests shall be cancellable via a registered execution registry | SHOULD |
| FR-AI-004 | Provider failover shall be automatic with configurable retry logic | MUST |
| FR-AI-005 | AI timeout shall be configurable via `AI_PROVIDER_TIMEOUT` env variable (default: 120,000ms) | MUST |

### 3.9 Reporting & Analytics (FR-RPT)

| ID | Requirement | Priority |
|----|------------|---------|
| FR-RPT-001 | Executive dashboard shall display KPIs for all active quality modules | MUST |
| FR-RPT-002 | The system shall generate compliance reports exportable as PDF and Excel | MUST |
| FR-RPT-003 | Reports shall support scheduled generation and email distribution | SHOULD |
| FR-RPT-004 | Trend analysis shall be available for CAPA, training compliance, and audit findings | SHOULD |

---

## 4. Non-Functional Requirements

### 4.1 Performance (NFR-PERF)

| ID | Requirement | Threshold |
|----|------------|----------|
| NFR-PERF-001 | API response time (P95) for standard read operations | ≤ 200ms |
| NFR-PERF-002 | API response time (P95) for write/workflow operations | ≤ 500ms |
| NFR-PERF-003 | File upload throughput | ≥ 50 MB/s |
| NFR-PERF-004 | Concurrent active users supported per tenant | ≥ 500 |
| NFR-PERF-005 | WebSocket notification delivery latency | ≤ 100ms |
| NFR-PERF-006 | Database query execution time (P99) | ≤ 100ms |

### 4.2 Availability (NFR-AVAIL)

| ID | Requirement | Target |
|----|------------|--------|
| NFR-AVAIL-001 | Platform uptime SLA | 99.9% monthly |
| NFR-AVAIL-002 | Planned maintenance window | ≤ 2 hours/month |
| NFR-AVAIL-003 | Recovery Time Objective (RTO) | ≤ 1 hour |
| NFR-AVAIL-004 | Recovery Point Objective (RPO) | ≤ 15 minutes |

### 4.3 Security (NFR-SEC)

| ID | Requirement |
|----|------------|
| NFR-SEC-001 | All API communications must use TLS 1.2 or higher |
| NFR-SEC-002 | Passwords must be hashed using bcrypt (min cost factor 12) |
| NFR-SEC-003 | JWT tokens must use HS256 or RS256 signing |
| NFR-SEC-004 | All sensitive configuration must be stored as environment variables, not in source code |
| NFR-SEC-005 | SQL injection prevention via ORM-parameterized queries |
| NFR-SEC-006 | API rate limiting must be enforced (configurable per endpoint) |
| NFR-SEC-007 | HTTP security headers must be enforced via Helmet.js |
| NFR-SEC-008 | File uploads must be validated for MIME type and size limits |
| NFR-SEC-009 | Cross-Origin Resource Sharing (CORS) must be restricted to approved origins |

### 4.4 Scalability (NFR-SCALE)

| ID | Requirement |
|----|------------|
| NFR-SCALE-001 | Backend API pods must scale horizontally via Kubernetes HPA |
| NFR-SCALE-002 | Database read scaling via PostgreSQL read replicas |
| NFR-SCALE-003 | Redis Cluster mode for distributed cache scaling |
| NFR-SCALE-004 | Kafka consumer groups for parallel event processing |

### 4.5 Maintainability (NFR-MAINT)

| ID | Requirement |
|----|------------|
| NFR-MAINT-001 | All API changes must be backward-compatible within a major version |
| NFR-MAINT-002 | Database schema changes must be managed via numbered migrations |
| NFR-MAINT-003 | Code coverage for unit tests must be ≥ 70% |
| NFR-MAINT-004 | All public APIs must have OpenAPI 3.0 specification |

---

## 5. External Interface Requirements

### 5.1 User Interface

- Responsive web UI supporting Chrome 100+, Firefox 100+, Safari 15+, Edge 100+
- Minimum viewport: 1280×720 (desktop); responsive for tablet (768px)
- WCAG 2.1 AA accessibility compliance

### 5.2 API Interface

- All backend APIs follow REST principles with JSON request/response bodies
- API versioning via URL prefix: `/api/v1/`
- Standard HTTP status codes: 200, 201, 400, 401, 403, 404, 409, 422, 429, 500

### 5.3 External System Integrations

| Integration | Protocol | Purpose |
|------------|---------|---------|
| OpenAI API | HTTPS REST | AI prompt execution |
| Anthropic API | HTTPS REST | AI fallback provider |
| SMTP (Nodemailer) | SMTP/TLS | Email notifications |
| AWS S3 / Compatible | HTTPS REST | File blob storage |
| Kafka | TCP | Async event streaming |

---

## 6. System Constraints

| Constraint | Description |
|-----------|-------------|
| Deployment | Must be deployable on Kubernetes (K8s) or Docker Compose |
| Database | PostgreSQL 15+ is the only supported primary database |
| Authentication | OAuth 2.0 / JWT; no SAML in v1.0 |
| File Size Limit | Maximum upload size: 100 MB per file |
| Data Residency | Customer data must remain within the selected cloud region |
| Browser Support | Modern browsers only (no IE11 support) |

---

## 7. Compliance Requirements

| Standard | Applicability | Implementation |
|---------|-------------|---------------|
| FDA 21 CFR Part 11 | Electronic records and signatures | E-signature module with PIN auth + immutable audit trails |
| ISO 9001:2015 | QMS structure and document control | Document lifecycle, CAPA, audit management modules |
| ISO 13485:2016 | Medical device QMS | Traceability, validation records, design controls |
| ISO/IEC 27001:2022 | Information security | Encryption, access controls, audit logging |
| GDPR | Personal data protection | Data minimization, right to erasure, consent management |
| OWASP Top 10 | Web application security | Input validation, auth controls, rate limiting, CSP headers |

---

*End of QASSURE-SRS-001*
