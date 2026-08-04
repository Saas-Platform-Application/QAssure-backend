# QAssure.ai - Complete IAM (Identity & Access Management) Specification
## Authentication, Authorization, and Multi-Tenancy Flows

**Document Version:** 1.0  
**Date:** December 24, 2025  
**Purpose:** Define complete IAM flows for QAssure.ai platform

---

## Table of Contents

1. [IAM Architecture Overview](#1-iam-architecture-overview)
2. [Authentication Flows](#2-authentication-flows)
3. [Authorization & RBAC](#3-authorization--rbac)
4. [Multi-Tenancy Model](#4-multi-tenancy-model)
5. [JWT Token Structure](#5-jwt-token-structure)
6. [Permission System](#6-permission-system)
7. [Session Management](#7-session-management)
8. [API Security](#8-api-security)
9. [Implementation Code](#9-implementation-code)
10. [Database Schema](#10-database-schema)
11. [API Endpoints](#11-api-endpoints)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. IAM Architecture Overview

### 1.1 High-Level IAM Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         QAssure.ai IAM Architecture                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────┐  │
│  │  Client  │────▶│   Kong API   │────▶│    Auth      │────▶│  Module   │  │
│  │  (Web/   │     │   Gateway    │     │  Middleware  │     │  Handler  │  │
│  │  Mobile) │◀────│              │◀────│              │◀────│           │  │
│  └──────────┘     └──────────────┘     └──────────────┘     └───────────┘  │
│        │                 │                    │                    │        │
│        │                 │                    │                    │        │
│        ▼                 ▼                    ▼                    ▼        │
│  ┌──────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────┐  │
│  │  OAuth/  │     │    Rate      │     │  Permission  │     │  Tenant   │  │
│  │  SAML    │     │   Limiter    │     │   Check      │     │  Filter   │  │
│  │  IdP     │     │   (Redis)    │     │   (Redis)    │     │  (Query)  │  │
│  └──────────┘     └──────────────┘     └──────────────┘     └───────────┘  │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        Identity Store (PostgreSQL)                   │   │
│  │  ┌─────────┐  ┌─────────┐  ┌─────────────┐  ┌────────────────────┐  │   │
│  │  │  Users  │  │  Roles  │  │ Permissions │  │    User_Roles      │  │   │
│  │  └─────────┘  └─────────┘  └─────────────┘  └────────────────────┘  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 IAM Components

| Component | Purpose | Technology |
|-----------|---------|------------|
| **Authentication Service** | Verify user identity | JWT, OAuth 2.0, SAML 2.0 |
| **Authorization Service** | Check user permissions | RBAC with Redis caching |
| **Session Manager** | Manage user sessions | Redis |
| **MFA Provider** | Two-factor authentication | TOTP (speakeasy) |
| **Token Service** | Issue/validate JWT tokens | jsonwebtoken |
| **Permission Service** | Load and check permissions | PostgreSQL + Redis |
| **Tenant Service** | Multi-tenant isolation | Row-level security |

---

## 2. Authentication Flows

### 2.1 Email/Password Login Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Email/Password Authentication Flow                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client                    Server                         Database          │
│    │                         │                               │              │
│    │  POST /auth/login       │                               │              │
│    │  {email, password}      │                               │              │
│    │────────────────────────▶│                               │              │
│    │                         │                               │              │
│    │                         │  Find user by email           │              │
│    │                         │──────────────────────────────▶│              │
│    │                         │                               │              │
│    │                         │  User record                  │              │
│    │                         │◀──────────────────────────────│              │
│    │                         │                               │              │
│    │                         │  Verify password (bcrypt)     │              │
│    │                         │  ════════════════════         │              │
│    │                         │                               │              │
│    │                         │  Check if MFA enabled         │              │
│    │                         │  ════════════════════         │              │
│    │                         │                               │              │
│    │        [If MFA NOT enabled]                             │              │
│    │                         │                               │              │
│    │                         │  Generate JWT tokens          │              │
│    │                         │  Create session in Redis      │              │
│    │                         │  ════════════════════         │              │
│    │                         │                               │              │
│    │  {accessToken,          │                               │              │
│    │   refreshToken,         │                               │              │
│    │   user}                 │                               │              │
│    │◀────────────────────────│                               │              │
│    │                         │                               │              │
│    │        [If MFA IS enabled]                              │              │
│    │                         │                               │              │
│    │  {mfaRequired: true,    │                               │              │
│    │   mfaToken}             │                               │              │
│    │◀────────────────────────│                               │              │
│    │                         │                               │              │
│    │  POST /auth/mfa/verify  │                               │              │
│    │  {mfaToken, code}       │                               │              │
│    │────────────────────────▶│                               │              │
│    │                         │                               │              │
│    │                         │  Verify TOTP code             │              │
│    │                         │  ════════════════════         │              │
│    │                         │                               │              │
│    │  {accessToken,          │                               │              │
│    │   refreshToken,         │                               │              │
│    │   user}                 │                               │              │
│    │◀────────────────────────│                               │              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 OAuth 2.0 Login Flow (Google/Microsoft/Okta)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         OAuth 2.0 Authentication Flow                        │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client              QAssure Server           OAuth Provider (Google)       │
│    │                       │                          │                     │
│    │  GET /auth/oauth/     │                          │                     │
│    │      google           │                          │                     │
│    │──────────────────────▶│                          │                     │
│    │                       │                          │                     │
│    │  302 Redirect to      │                          │                     │
│    │  Google OAuth URL     │                          │                     │
│    │◀──────────────────────│                          │                     │
│    │                       │                          │                     │
│    │  User authenticates   │                          │                     │
│    │  with Google          │                          │                     │
│    │─────────────────────────────────────────────────▶│                     │
│    │                       │                          │                     │
│    │  302 Redirect with    │                          │                     │
│    │  authorization code   │                          │                     │
│    │◀─────────────────────────────────────────────────│                     │
│    │                       │                          │                     │
│    │  GET /auth/oauth/     │                          │                     │
│    │      google/callback  │                          │                     │
│    │      ?code=xxx        │                          │                     │
│    │──────────────────────▶│                          │                     │
│    │                       │                          │                     │
│    │                       │  Exchange code for       │                     │
│    │                       │  tokens                  │                     │
│    │                       │─────────────────────────▶│                     │
│    │                       │                          │                     │
│    │                       │  {access_token,          │                     │
│    │                       │   id_token}              │                     │
│    │                       │◀─────────────────────────│                     │
│    │                       │                          │                     │
│    │                       │  Fetch user profile      │                     │
│    │                       │─────────────────────────▶│                     │
│    │                       │                          │                     │
│    │                       │  {email, name, picture}  │                     │
│    │                       │◀─────────────────────────│                     │
│    │                       │                          │                     │
│    │                       │  Find or create user     │                     │
│    │                       │  Link OAuth identity     │                     │
│    │                       │  Generate JWT tokens     │                     │
│    │                       │  ════════════════════    │                     │
│    │                       │                          │                     │
│    │  302 Redirect to      │                          │                     │
│    │  frontend with tokens │                          │                     │
│    │  (or set cookies)     │                          │                     │
│    │◀──────────────────────│                          │                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.3 SAML 2.0 SSO Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SAML 2.0 SSO Flow                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client              QAssure (SP)              Identity Provider (IdP)      │
│    │                       │                          │                     │
│    │  GET /auth/saml/login │                          │                     │
│    │──────────────────────▶│                          │                     │
│    │                       │                          │                     │
│    │                       │  Generate AuthnRequest   │                     │
│    │                       │  (XML, signed)           │                     │
│    │                       │  ════════════════════    │                     │
│    │                       │                          │                     │
│    │  302 Redirect to IdP  │                          │                     │
│    │  with SAMLRequest     │                          │                     │
│    │◀──────────────────────│                          │                     │
│    │                       │                          │                     │
│    │  User authenticates   │                          │                     │
│    │  at IdP login page    │                          │                     │
│    │─────────────────────────────────────────────────▶│                     │
│    │                       │                          │                     │
│    │                       │                          │  Generate           │
│    │                       │                          │  SAMLResponse       │
│    │                       │                          │  (signed assertion) │
│    │                       │                          │  ═══════════════    │
│    │                       │                          │                     │
│    │  POST /auth/saml/     │                          │                     │
│    │       callback        │                          │                     │
│    │  (SAMLResponse)       │                          │                     │
│    │◀─────────────────────────────────────────────────│                     │
│    │──────────────────────▶│                          │                     │
│    │                       │                          │                     │
│    │                       │  Validate signature      │                     │
│    │                       │  Parse assertion         │                     │
│    │                       │  Extract user attrs      │                     │
│    │                       │  ════════════════════    │                     │
│    │                       │                          │                     │
│    │                       │  Find or create user     │                     │
│    │                       │  Map SAML attributes     │                     │
│    │                       │  Generate JWT tokens     │                     │
│    │                       │  ════════════════════    │                     │
│    │                       │                          │                     │
│    │  302 Redirect with    │                          │                     │
│    │  tokens               │                          │                     │
│    │◀──────────────────────│                          │                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 2.4 MFA Setup Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           MFA (TOTP) Setup Flow                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Client                         Server                     Database         │
│    │                               │                           │            │
│    │  POST /auth/mfa/setup         │                           │            │
│    │  (requires auth)              │                           │            │
│    │──────────────────────────────▶│                           │            │
│    │                               │                           │            │
│    │                               │  Generate TOTP secret     │            │
│    │                               │  (speakeasy.generateSecret)            │
│    │                               │  ═══════════════════════  │            │
│    │                               │                           │            │
│    │                               │  Store secret temporarily │            │
│    │                               │  (Redis, 10 min TTL)      │            │
│    │                               │  ═══════════════════════  │            │
│    │                               │                           │            │
│    │                               │  Generate QR code         │            │
│    │                               │  (qrcode library)         │            │
│    │                               │  ═══════════════════════  │            │
│    │                               │                           │            │
│    │  {qrCode: "data:image/png...",│                           │            │
│    │   secret: "JBSWY3DPEHPK...",  │                           │            │
│    │   setupToken: "xxx"}          │                           │            │
│    │◀──────────────────────────────│                           │            │
│    │                               │                           │            │
│    │  User scans QR with           │                           │            │
│    │  Google Authenticator         │                           │            │
│    │  ═══════════════════════      │                           │            │
│    │                               │                           │            │
│    │  POST /auth/mfa/setup/verify  │                           │            │
│    │  {setupToken, code}           │                           │            │
│    │──────────────────────────────▶│                           │            │
│    │                               │                           │            │
│    │                               │  Verify TOTP code         │            │
│    │                               │  ═══════════════════════  │            │
│    │                               │                           │            │
│    │                               │  Save secret to user      │            │
│    │                               │  Enable MFA flag          │            │
│    │                               │──────────────────────────▶│            │
│    │                               │                           │            │
│    │                               │  Generate recovery codes  │            │
│    │                               │  (8 codes, one-time use)  │            │
│    │                               │  ═══════════════════════  │            │
│    │                               │                           │            │
│    │  {enabled: true,              │                           │            │
│    │   recoveryCodes: [...]}       │                           │            │
│    │◀──────────────────────────────│                           │            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authorization & RBAC

### 3.1 Complete Request Authorization Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Complete Request Authorization Flow                       │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Request: POST /api/v1/aice/evaluations                                     │
│  Header: Authorization: Bearer <jwt>                                        │
│  Header: X-Tenant-ID: tenant-123                                            │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Step 1: Extract & Verify JWT Token                                   │   │
│  │ ════════════════════════════════════                                 │   │
│  │                                                                       │   │
│  │  • Extract token from Authorization header                           │   │
│  │  • Verify signature using JWT_SECRET                                 │   │
│  │  • Check expiration (exp claim)                                      │   │
│  │  • Check issuer (iss claim) = qassure.ai                            │   │
│  │  • Check audience (aud claim) = qassure-platform                    │   │
│  │  • Extract claims: userId, email, tenantId, roles                   │   │
│  │                                                                       │   │
│  │  If invalid → 401 Unauthorized                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Step 2: Check Session Validity                                       │   │
│  │ ═════════════════════════════════                                    │   │
│  │                                                                       │   │
│  │  • Get session from Redis: qassure:sessions:{userId}:{sessionId}    │   │
│  │  • Verify session exists and not expired                            │   │
│  │  • Check if token is blacklisted (logout)                           │   │
│  │                                                                       │   │
│  │  If invalid → 401 Unauthorized (Session expired)                    │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Step 3: Validate Tenant Access                                       │   │
│  │ ═══════════════════════════════                                      │   │
│  │                                                                       │   │
│  │  • Get tenant ID from X-Tenant-ID header                            │   │
│  │  • Compare with user's allowed tenants from JWT                     │   │
│  │  • For Platform Admin: Can access any tenant                        │   │
│  │  • For Tenant Admin/User: Can only access their tenant              │   │
│  │                                                                       │   │
│  │  If not allowed → 403 Forbidden (Tenant access denied)              │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Step 4: Load User Permissions                                        │   │
│  │ ══════════════════════════════                                       │   │
│  │                                                                       │   │
│  │  • Check Redis cache: qassure:permissions:{userId}:{tenantId}       │   │
│  │  • If cache miss, load from database:                               │   │
│  │    - Get all roles for user in this tenant                          │   │
│  │    - Get all permissions for those roles                            │   │
│  │    - Expand module-specific permissions                             │   │
│  │  • Cache for 5 minutes                                              │   │
│  │                                                                       │   │
│  │  Result: ["aice.evaluations.create", "aice.evaluations.read", ...]  │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Step 5: Check Required Permission                                    │   │
│  │ ═════════════════════════════════                                    │   │
│  │                                                                       │   │
│  │  Route: POST /api/v1/aice/evaluations                               │   │
│  │  Required Permission: aice.evaluations.create                       │   │
│  │                                                                       │   │
│  │  • Check if user permissions include "aice.evaluations.create"      │   │
│  │  • Check for wildcard: "aice.evaluations.*" or "aice.*"            │   │
│  │  • Check for super admin: "platform.*"                              │   │
│  │  • Check conditional permissions (JSONB conditions)                  │   │
│  │                                                                       │   │
│  │  If not allowed → 403 Forbidden (Permission denied)                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Step 6: Apply Tenant Filter to Query                                 │   │
│  │ ════════════════════════════════════                                 │   │
│  │                                                                       │   │
│  │  • Attach tenantId to request context                               │   │
│  │  • All database queries automatically filtered by tenant_id         │   │
│  │  • Prevent cross-tenant data access                                 │   │
│  │                                                                       │   │
│  │  req.tenantId = "tenant-123"                                        │   │
│  │  req.userId = "user-456"                                            │   │
│  │  req.permissions = [...]                                            │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                              │                                              │
│                              ▼                                              │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ Step 7: Execute Request Handler                                      │   │
│  │ ═══════════════════════════════                                      │   │
│  │                                                                       │   │
│  │  • Handler receives authenticated, authorized request                │   │
│  │  • All queries scoped to tenant                                     │   │
│  │  • Audit log entry created                                          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 RBAC Model

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              RBAC Model                                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│                           ┌──────────────┐                                  │
│                           │    User      │                                  │
│                           │  (user_id)   │                                  │
│                           └──────┬───────┘                                  │
│                                  │                                          │
│                                  │ has many                                 │
│                                  ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                        user_roles                                  │     │
│  │  ┌─────────┬─────────┬───────────┬───────────┬──────────────────┐ │     │
│  │  │ user_id │ role_id │ tenant_id │ module_id │    expires_at    │ │     │
│  │  ├─────────┼─────────┼───────────┼───────────┼──────────────────┤ │     │
│  │  │ user-1  │ role-1  │ tenant-A  │   NULL    │      NULL        │ │     │
│  │  │ user-1  │ role-2  │ tenant-A  │   aice    │  2025-12-31      │ │     │
│  │  │ user-1  │ role-3  │ tenant-B  │   NULL    │      NULL        │ │     │
│  │  └─────────┴─────────┴───────────┴───────────┴──────────────────┘ │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                  │                                          │
│                                  │ references                               │
│                                  ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                          roles                                     │     │
│  │  ┌─────────┬────────────────────┬─────────────┬───────────────┐   │     │
│  │  │   id    │        name        │    scope    │   is_system   │   │     │
│  │  ├─────────┼────────────────────┼─────────────┼───────────────┤   │     │
│  │  │ role-1  │ Platform Admin     │  PLATFORM   │     true      │   │     │
│  │  │ role-2  │ Tenant Admin       │  TENANT     │     true      │   │     │
│  │  │ role-3  │ Quality Manager    │  TENANT     │     true      │   │     │
│  │  │ role-4  │ Clinical Reviewer  │  TENANT     │     true      │   │     │
│  │  │ role-5  │ Viewer             │  TENANT     │     true      │   │     │
│  │  │ role-6  │ Custom Role        │  TENANT     │     false     │   │     │
│  │  └─────────┴────────────────────┴─────────────┴───────────────┘   │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                  │                                          │
│                                  │ has many                                 │
│                                  ▼                                          │
│  ┌───────────────────────────────────────────────────────────────────┐     │
│  │                       permissions                                  │     │
│  │  ┌─────────┬─────────────────────────────┬────────┬────────────┐  │     │
│  │  │ role_id │         resource            │ action │ conditions │  │     │
│  │  ├─────────┼─────────────────────────────┼────────┼────────────┤  │     │
│  │  │ role-1  │ platform.*                  │  *     │    NULL    │  │     │
│  │  │ role-2  │ platform.users              │  *     │    NULL    │  │     │
│  │  │ role-2  │ platform.roles              │  *     │    NULL    │  │     │
│  │  │ role-3  │ aice.evaluations            │  *     │    NULL    │  │     │
│  │  │ role-3  │ aich.complaints             │  *     │    NULL    │  │     │
│  │  │ role-4  │ aice.evaluations            │ read   │    NULL    │  │     │
│  │  │ role-4  │ aice.evaluations            │approve │ {"min_.."}│  │     │
│  │  │ role-5  │ *.*.read                    │  read  │    NULL    │  │     │
│  │  └─────────┴─────────────────────────────┴────────┴────────────┘  │     │
│  └───────────────────────────────────────────────────────────────────┘     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.3 Permission Code Format

```
Format: {module}.{resource}.{action}

STRUCTURE:
─────────────────────────────────────────────────────────────────

Module          Resource              Action
───────         ───────────           ──────────
platform        users                 create
aice            roles                 read
aich            tenants               update
dhf             modules               delete
sq              evaluations           list
                complaints            approve
                designs               reject
                suppliers             export
                audits                import
                settings              manage

EXAMPLES:
─────────────────────────────────────────────────────────────────

platform.users.create         - Create platform users
platform.users.read           - View user details
platform.roles.manage         - Full role management
platform.tenants.create       - Create new tenants
platform.settings.update      - Modify platform settings

aice.evaluations.create       - Create clinical evaluations
aice.evaluations.approve      - Approve evaluations
aice.literature.search        - Search literature database

aich.complaints.create        - Create complaint records
aich.complaints.triage        - Triage complaints
aich.complaints.escalate      - Escalate complaints

dhf.designs.create            - Create design records
dhf.designs.approve           - Approve designs
dhf.reviews.create            - Create design reviews

sq.suppliers.create           - Add suppliers
sq.suppliers.audit            - Conduct supplier audits
sq.corrective_actions.create  - Create CAPAs

WILDCARDS:
─────────────────────────────────────────────────────────────────

platform.*                    - All platform permissions
aice.*                        - All AiCE module permissions
aice.evaluations.*            - All evaluation permissions
*.*.read                      - Read access to everything
*.*.*                         - Super admin (all permissions)
```

---

## 4. Multi-Tenancy Model

### 4.1 Tenant Isolation Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Multi-Tenancy Architecture                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                    Request with Tenant Context                       │   │
│  │                                                                       │   │
│  │  Headers:                                                            │   │
│  │    Authorization: Bearer <jwt>                                       │   │
│  │    X-Tenant-ID: tenant-123                                          │   │
│  │                                                                       │   │
│  │  JWT Claims:                                                         │   │
│  │    {                                                                 │   │
│  │      "userId": "user-456",                                          │   │
│  │      "tenantId": "tenant-123",    ← Primary tenant                  │   │
│  │      "allowedTenants": ["tenant-123", "tenant-789"]                 │   │
│  │    }                                                                 │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                     Tenant Middleware                                │   │
│  │                                                                       │   │
│  │  1. Extract tenant ID from header                                   │   │
│  │  2. Validate tenant exists and is active                            │   │
│  │  3. Check user has access to this tenant                            │   │
│  │  4. Attach tenant context to request                                │   │
│  │                                                                       │   │
│  │  req.tenant = {                                                      │   │
│  │    id: "tenant-123",                                                │   │
│  │    name: "Acme Medical",                                            │   │
│  │    plan: "enterprise",                                              │   │
│  │    settings: {...}                                                  │   │
│  │  }                                                                   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                    │                                        │
│                                    ▼                                        │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  Row-Level Security (Database)                       │   │
│  │                                                                       │   │
│  │  Every table has tenant_id column:                                  │   │
│  │                                                                       │   │
│  │  CREATE TABLE evaluations (                                         │   │
│  │    id UUID PRIMARY KEY,                                             │   │
│  │    tenant_id UUID NOT NULL REFERENCES tenants(id),                  │   │
│  │    ...                                                              │   │
│  │  );                                                                  │   │
│  │                                                                       │   │
│  │  CREATE INDEX idx_evaluations_tenant ON evaluations(tenant_id);     │   │
│  │                                                                       │   │
│  │  All queries automatically filtered:                                │   │
│  │  SELECT * FROM evaluations WHERE tenant_id = 'tenant-123' AND ...   │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                  Data Isolation Guarantees                           │   │
│  │                                                                       │   │
│  │  ✓ Tenant A cannot see Tenant B's data                              │   │
│  │  ✓ Tenant A cannot modify Tenant B's data                           │   │
│  │  ✓ Tenant A cannot query without tenant filter                      │   │
│  │  ✓ Platform admin can access any tenant (with audit)                │   │
│  │  ✓ Cross-tenant reports require explicit permission                 │   │
│  │                                                                       │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 Tenant Context Flow

```javascript
// How tenant context flows through the application

// 1. Middleware extracts tenant
app.use(tenantMiddleware);

// 2. All services receive tenant context
class EvaluationService {
  async create(data, context) {
    // context.tenantId is ALWAYS present
    return this.repository.create({
      ...data,
      tenant_id: context.tenantId  // Enforced
    });
  }

  async findAll(filters, context) {
    // Tenant filter is AUTOMATICALLY applied
    return this.repository.findAll({
      where: {
        tenant_id: context.tenantId,  // Cannot be bypassed
        ...filters
      }
    });
  }
}

// 3. Repository enforces tenant isolation
class BaseRepository {
  async findAll(options) {
    if (!options.where.tenant_id) {
      throw new Error('Tenant ID is required');
    }
    return this.model.findAll(options);
  }
}
```

---

## 5. JWT Token Structure

### 5.1 Access Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    // Standard Claims
    "iss": "qassure.ai",           // Issuer
    "aud": "qassure-platform",     // Audience
    "sub": "user-456",             // Subject (user ID)
    "iat": 1703404800,             // Issued at
    "exp": 1703491200,             // Expires (24h)
    "jti": "token-unique-id",      // Token ID
    
    // User Claims
    "userId": "user-456",
    "email": "john@acme.com",
    "name": "John Doe",
    
    // Tenant Claims
    "tenantId": "tenant-123",      // Primary tenant
    "allowedTenants": [            // Multi-tenant access
      "tenant-123",
      "tenant-789"
    ],
    
    // Role Claims (lightweight)
    "roles": [
      {
        "roleId": "role-3",
        "tenantId": "tenant-123",
        "moduleId": null
      }
    ],
    
    // Session Claims
    "sessionId": "session-abc",
    
    // Feature Flags
    "features": {
      "mfaEnabled": true,
      "apiAccess": true
    }
  },
  "signature": "..."
}
```

### 5.2 Refresh Token Structure

```json
{
  "payload": {
    "iss": "qassure.ai",
    "sub": "user-456",
    "iat": 1703404800,
    "exp": 1704009600,           // 7 days
    "jti": "refresh-token-id",
    "type": "refresh",
    "sessionId": "session-abc",
    "tokenFamily": "family-xyz"  // For refresh token rotation
  }
}
```

### 5.3 Token Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          Token Lifecycle                                     │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LOGIN                                                                      │
│  ─────                                                                      │
│  1. User authenticates                                                      │
│  2. Generate access token (24h)                                            │
│  3. Generate refresh token (7d)                                            │
│  4. Store session in Redis                                                 │
│  5. Return both tokens to client                                           │
│                                                                             │
│  ACCESSING API                                                              │
│  ────────────                                                               │
│  1. Client sends access token in Authorization header                      │
│  2. Server validates token signature and expiration                        │
│  3. Server checks session validity in Redis                                │
│  4. Request proceeds if valid                                              │
│                                                                             │
│  TOKEN REFRESH                                                              │
│  ─────────────                                                              │
│  1. Access token expires (or will expire soon)                             │
│  2. Client sends refresh token to /auth/refresh                            │
│  3. Server validates refresh token                                         │
│  4. Server generates NEW access token                                      │
│  5. (Optional) Rotate refresh token                                        │
│  6. Return new tokens                                                      │
│                                                                             │
│  LOGOUT                                                                     │
│  ──────                                                                     │
│  1. Client calls /auth/logout                                              │
│  2. Server adds token JTI to blacklist (Redis)                             │
│  3. Server destroys session in Redis                                       │
│  4. Client discards tokens                                                 │
│                                                                             │
│  TIMELINE                                                                   │
│  ────────                                                                   │
│                                                                             │
│  Login ──────────────────────────────────────────────────────── Logout     │
│    │                                                               │        │
│    │  Access Token 1    Access Token 2    Access Token 3           │        │
│    │  ├──────24h──────┤├──────24h──────┤├──────24h──────┤         │        │
│    │                                                               │        │
│    │  Refresh Token                                                │        │
│    │  ├───────────────────────7 days─────────────────────────────┤│        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Permission System

### 6.1 Permission Evaluation Algorithm

```javascript
/**
 * Permission evaluation with wildcards and conditions
 */
function hasPermission(userPermissions, requiredPermission, context) {
  // Parse required permission
  const [reqModule, reqResource, reqAction] = requiredPermission.split('.');
  
  for (const permission of userPermissions) {
    const [permModule, permResource, permAction] = permission.code.split('.');
    
    // Check module match (with wildcard)
    if (permModule !== '*' && permModule !== reqModule) continue;
    
    // Check resource match (with wildcard)
    if (permResource !== '*' && permResource !== reqResource) continue;
    
    // Check action match (with wildcard)
    if (permAction !== '*' && permAction !== reqAction) continue;
    
    // Check conditional permissions
    if (permission.conditions) {
      if (!evaluateConditions(permission.conditions, context)) continue;
    }
    
    // Permission granted
    return true;
  }
  
  // Permission denied
  return false;
}

/**
 * Evaluate JSONB conditions
 */
function evaluateConditions(conditions, context) {
  // Example conditions:
  // { "minAmount": 1000 } - Only for amounts >= 1000
  // { "ownRecords": true } - Only own records
  // { "department": ["QA", "RA"] } - Only specific departments
  
  for (const [key, value] of Object.entries(conditions)) {
    switch (key) {
      case 'ownRecords':
        if (value && context.recordOwnerId !== context.userId) return false;
        break;
      case 'minAmount':
        if (context.amount < value) return false;
        break;
      case 'department':
        if (!value.includes(context.userDepartment)) return false;
        break;
      case 'timeWindow':
        // Only allow during business hours
        const hour = new Date().getHours();
        if (hour < value.start || hour > value.end) return false;
        break;
    }
  }
  return true;
}
```

### 6.2 Permission Caching Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                     Permission Caching Strategy                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  CACHE KEY FORMAT                                                           │
│  ────────────────                                                           │
│  qassure:permissions:{userId}:{tenantId}                                   │
│                                                                             │
│  CACHE VALUE (JSON)                                                         │
│  ─────────────────                                                          │
│  {                                                                          │
│    "permissions": [                                                         │
│      {"code": "aice.evaluations.create", "conditions": null},              │
│      {"code": "aice.evaluations.read", "conditions": null},                │
│      {"code": "aice.evaluations.approve", "conditions": {"minLevel": 2}}   │
│    ],                                                                       │
│    "roles": ["Quality Manager", "Clinical Reviewer"],                      │
│    "cachedAt": 1703404800000                                               │
│  }                                                                          │
│                                                                             │
│  CACHE TTL: 5 minutes                                                       │
│                                                                             │
│  CACHE INVALIDATION TRIGGERS                                                │
│  ───────────────────────────                                                │
│  • User role assignment changes                                            │
│  • Role permission changes                                                  │
│  • User logout (all sessions)                                              │
│  • Manual cache clear by admin                                             │
│                                                                             │
│  INVALIDATION COMMAND                                                       │
│  ────────────────────                                                       │
│  DEL qassure:permissions:{userId}:*                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Session Management

### 7.1 Session Storage in Redis

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       Session Storage Structure                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  SESSION KEY                                                                │
│  ───────────                                                                │
│  qassure:sessions:{userId}:{sessionId}                                     │
│                                                                             │
│  SESSION VALUE (JSON)                                                       │
│  ────────────────────                                                       │
│  {                                                                          │
│    "userId": "user-456",                                                   │
│    "tenantId": "tenant-123",                                               │
│    "email": "john@acme.com",                                               │
│    "deviceInfo": {                                                         │
│      "userAgent": "Mozilla/5.0...",                                        │
│      "ip": "192.168.1.100",                                                │
│      "device": "Chrome on Windows"                                         │
│    },                                                                       │
│    "createdAt": 1703404800000,                                             │
│    "lastActivityAt": 1703408400000,                                        │
│    "expiresAt": 1704009600000                                              │
│  }                                                                          │
│                                                                             │
│  SESSION TTL: 7 days (matches refresh token)                               │
│                                                                             │
│  USER SESSIONS INDEX                                                        │
│  ───────────────────                                                        │
│  qassure:user-sessions:{userId} = SET of sessionIds                        │
│  (Used to list all sessions, force logout all)                             │
│                                                                             │
│  TOKEN BLACKLIST                                                            │
│  ───────────────                                                            │
│  qassure:blacklist:{tokenJti} = "1"                                        │
│  TTL: Same as token expiration                                             │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 7.2 Session Operations

```javascript
// Session Service Operations

class SessionService {
  // Create new session
  async createSession(userId, tenantId, deviceInfo) {
    const sessionId = uuid();
    const session = {
      userId,
      tenantId,
      deviceInfo,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
    };
    
    // Store session
    await redis.setex(
      `qassure:sessions:${userId}:${sessionId}`,
      7 * 24 * 60 * 60, // 7 days in seconds
      JSON.stringify(session)
    );
    
    // Add to user's session index
    await redis.sadd(`qassure:user-sessions:${userId}`, sessionId);
    
    return sessionId;
  }
  
  // Get session
  async getSession(userId, sessionId) {
    const data = await redis.get(`qassure:sessions:${userId}:${sessionId}`);
    return data ? JSON.parse(data) : null;
  }
  
  // Update last activity
  async touchSession(userId, sessionId) {
    const session = await this.getSession(userId, sessionId);
    if (session) {
      session.lastActivityAt = Date.now();
      await redis.setex(
        `qassure:sessions:${userId}:${sessionId}`,
        7 * 24 * 60 * 60,
        JSON.stringify(session)
      );
    }
  }
  
  // Destroy single session
  async destroySession(userId, sessionId) {
    await redis.del(`qassure:sessions:${userId}:${sessionId}`);
    await redis.srem(`qassure:user-sessions:${userId}`, sessionId);
  }
  
  // Destroy all sessions (force logout everywhere)
  async destroyAllSessions(userId) {
    const sessionIds = await redis.smembers(`qassure:user-sessions:${userId}`);
    for (const sessionId of sessionIds) {
      await redis.del(`qassure:sessions:${userId}:${sessionId}`);
    }
    await redis.del(`qassure:user-sessions:${userId}`);
  }
  
  // List user sessions
  async getUserSessions(userId) {
    const sessionIds = await redis.smembers(`qassure:user-sessions:${userId}`);
    const sessions = [];
    for (const sessionId of sessionIds) {
      const session = await this.getSession(userId, sessionId);
      if (session) {
        sessions.push({ sessionId, ...session });
      }
    }
    return sessions;
  }
  
  // Blacklist token (for logout)
  async blacklistToken(tokenJti, expiresIn) {
    await redis.setex(`qassure:blacklist:${tokenJti}`, expiresIn, '1');
  }
  
  // Check if token is blacklisted
  async isTokenBlacklisted(tokenJti) {
    return await redis.exists(`qassure:blacklist:${tokenJti}`) === 1;
  }
}
```

---

## 8. API Security

### 8.1 Complete Middleware Chain

```javascript
// app.js - Middleware chain order

const app = express();

// 1. Basic security headers
app.use(helmet());

// 2. CORS
app.use(cors({
  origin: process.env.CORS_ORIGIN.split(','),
  credentials: true
}));

// 3. Body parsing
app.use(express.json({ limit: '10mb' }));

// 4. Request ID generation
app.use(requestIdMiddleware);

// 5. Logging
app.use(requestLoggingMiddleware);

// 6. Rate limiting (per IP)
app.use(rateLimitMiddleware);

// 7. Routes (with per-route middleware)
app.use('/api/v1', apiRoutes);

// Route middleware chain example
router.post('/aice/evaluations',
  authenticate,           // Verify JWT
  validateSession,        // Check Redis session
  extractTenant,          // Get tenant from header
  validateTenantAccess,   // Verify user can access tenant
  authorize('aice.evaluations.create'),  // Check permission
  validateBody(createEvaluationSchema),  // Input validation
  evaluationController.create  // Handler
);
```

### 8.2 Middleware Implementations

```javascript
// authenticate.middleware.js
const authenticate = async (req, res, next) => {
  try {
    // Extract token from header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.substring(7);
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: process.env.JWT_ISSUER,
      audience: process.env.JWT_AUDIENCE
    });
    
    // Check blacklist
    if (await sessionService.isTokenBlacklisted(decoded.jti)) {
      return res.status(401).json({ error: 'Token has been revoked' });
    }
    
    // Check session exists
    const session = await sessionService.getSession(decoded.userId, decoded.sessionId);
    if (!session) {
      return res.status(401).json({ error: 'Session expired' });
    }
    
    // Attach user to request
    req.user = {
      id: decoded.userId,
      email: decoded.email,
      tenantId: decoded.tenantId,
      allowedTenants: decoded.allowedTenants,
      sessionId: decoded.sessionId
    };
    
    // Update session activity
    await sessionService.touchSession(decoded.userId, decoded.sessionId);
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// authorize.middleware.js
const authorize = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { id: userId, tenantId } = req.user;
      
      // Load permissions (from cache or DB)
      const permissions = await permissionService.getUserPermissions(userId, tenantId);
      
      // Check permission
      const context = {
        userId,
        tenantId,
        ...req.body,
        ...req.params
      };
      
      if (!permissionService.hasPermission(permissions, requiredPermission, context)) {
        return res.status(403).json({
          error: 'Permission denied',
          required: requiredPermission
        });
      }
      
      // Attach permissions to request for later use
      req.permissions = permissions;
      
      next();
    } catch (error) {
      return res.status(500).json({ error: 'Authorization check failed' });
    }
  };
};

// tenant.middleware.js
const extractTenant = async (req, res, next) => {
  try {
    // Get tenant ID from header
    const tenantId = req.headers['x-tenant-id'];
    
    if (!tenantId) {
      // Use default tenant from JWT
      req.tenantId = req.user.tenantId;
    } else {
      // Validate user has access to requested tenant
      if (!req.user.allowedTenants.includes(tenantId)) {
        return res.status(403).json({ error: 'Access to this tenant denied' });
      }
      req.tenantId = tenantId;
    }
    
    // Load tenant details
    const tenant = await tenantService.getById(req.tenantId);
    if (!tenant || tenant.status !== 'active') {
      return res.status(403).json({ error: 'Tenant not found or inactive' });
    }
    
    req.tenant = tenant;
    
    next();
  } catch (error) {
    return res.status(500).json({ error: 'Tenant validation failed' });
  }
};
```

---

## 9. Implementation Code

### 9.1 JWT Service

```javascript
// src/infrastructure/auth/jwt.service.js

const jwt = require('jsonwebtoken');
const { v4: uuid } = require('uuid');

class JwtService {
  constructor() {
    this.accessSecret = process.env.JWT_SECRET;
    this.refreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessExpiresIn = process.env.JWT_EXPIRES_IN || '24h';
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';
    this.issuer = process.env.JWT_ISSUER || 'qassure.ai';
    this.audience = process.env.JWT_AUDIENCE || 'qassure-platform';
  }

  /**
   * Generate access token
   */
  generateAccessToken(user, sessionId) {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.primary_tenant_id,
      allowedTenants: user.allowedTenants || [user.primary_tenant_id],
      roles: user.roles || [],
      sessionId,
      features: {
        mfaEnabled: user.mfa_enabled,
        apiAccess: user.api_access_enabled
      }
    };

    return jwt.sign(payload, this.accessSecret, {
      expiresIn: this.accessExpiresIn,
      issuer: this.issuer,
      audience: this.audience,
      subject: user.id,
      jwtid: uuid()
    });
  }

  /**
   * Generate refresh token
   */
  generateRefreshToken(userId, sessionId, tokenFamily) {
    const payload = {
      type: 'refresh',
      sessionId,
      tokenFamily: tokenFamily || uuid()
    };

    return jwt.sign(payload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn,
      issuer: this.issuer,
      subject: userId,
      jwtid: uuid()
    });
  }

  /**
   * Verify access token
   */
  verifyAccessToken(token) {
    return jwt.verify(token, this.accessSecret, {
      issuer: this.issuer,
      audience: this.audience
    });
  }

  /**
   * Verify refresh token
   */
  verifyRefreshToken(token) {
    const decoded = jwt.verify(token, this.refreshSecret, {
      issuer: this.issuer
    });
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  }

  /**
   * Decode token without verification (for debugging)
   */
  decodeToken(token) {
    return jwt.decode(token, { complete: true });
  }

  /**
   * Get token expiration time in seconds
   */
  getTokenExpiration(token) {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return 0;
    return decoded.exp - Math.floor(Date.now() / 1000);
  }
}

module.exports = new JwtService();
```

### 9.2 Permission Service

```javascript
// src/infrastructure/auth/permission.service.js

const redis = require('../redis/redis.client');
const { UserRole, Role, Permission } = require('../../sequelize-models');

class PermissionService {
  constructor() {
    this.cacheTTL = 300; // 5 minutes
    this.cachePrefix = 'qassure:permissions';
  }

  /**
   * Get user permissions (with caching)
   */
  async getUserPermissions(userId, tenantId) {
    const cacheKey = `${this.cachePrefix}:${userId}:${tenantId}`;
    
    // Check cache
    const cached = await redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Load from database
    const permissions = await this.loadPermissionsFromDb(userId, tenantId);
    
    // Cache result
    await redis.setex(cacheKey, this.cacheTTL, JSON.stringify(permissions));
    
    return permissions;
  }

  /**
   * Load permissions from database
   */
  async loadPermissionsFromDb(userId, tenantId) {
    // Get all roles for this user in this tenant
    const userRoles = await UserRole.findAll({
      where: {
        user_id: userId,
        tenant_id: tenantId,
        // Check not expired
        [Op.or]: [
          { expires_at: null },
          { expires_at: { [Op.gt]: new Date() } }
        ]
      },
      include: [{
        model: Role,
        include: [{
          model: Permission
        }]
      }]
    });

    // Flatten permissions
    const permissions = [];
    const roleNames = [];
    
    for (const userRole of userRoles) {
      roleNames.push(userRole.Role.name);
      
      for (const permission of userRole.Role.Permissions) {
        // Build permission code
        const code = `${permission.resource}.${permission.action}`;
        
        // Check module scope
        if (userRole.module_id && !code.startsWith(userRole.module_id)) {
          continue; // Skip if module-scoped and doesn't match
        }
        
        permissions.push({
          code,
          conditions: permission.conditions
        });
      }
    }

    return {
      permissions: [...new Set(permissions.map(p => JSON.stringify(p)))].map(p => JSON.parse(p)),
      roles: [...new Set(roleNames)],
      cachedAt: Date.now()
    };
  }

  /**
   * Check if user has permission
   */
  hasPermission(userPermissions, requiredPermission, context = {}) {
    const [reqModule, reqResource, reqAction] = requiredPermission.split('.');
    
    for (const permission of userPermissions.permissions) {
      const [permModule, permResource, permAction] = permission.code.split('.');
      
      // Check module match (with wildcard)
      if (permModule !== '*' && permModule !== reqModule) continue;
      
      // Check resource match (with wildcard)
      if (permResource !== '*' && permResource !== reqResource) continue;
      
      // Check action match (with wildcard)
      if (permAction !== '*' && permAction !== reqAction) continue;
      
      // Check conditional permissions
      if (permission.conditions && Object.keys(permission.conditions).length > 0) {
        if (!this.evaluateConditions(permission.conditions, context)) continue;
      }
      
      return true;
    }
    
    return false;
  }

  /**
   * Evaluate JSONB conditions
   */
  evaluateConditions(conditions, context) {
    for (const [key, value] of Object.entries(conditions)) {
      switch (key) {
        case 'ownRecords':
          if (value && context.recordOwnerId !== context.userId) return false;
          break;
        case 'minAmount':
          if (context.amount < value) return false;
          break;
        case 'maxAmount':
          if (context.amount > value) return false;
          break;
        case 'department':
          if (Array.isArray(value) && !value.includes(context.userDepartment)) return false;
          break;
        case 'status':
          if (Array.isArray(value) && !value.includes(context.recordStatus)) return false;
          break;
      }
    }
    return true;
  }

  /**
   * Invalidate user permissions cache
   */
  async invalidateCache(userId, tenantId = '*') {
    if (tenantId === '*') {
      // Invalidate all tenants for this user
      const keys = await redis.keys(`${this.cachePrefix}:${userId}:*`);
      if (keys.length > 0) {
        await redis.del(...keys);
      }
    } else {
      await redis.del(`${this.cachePrefix}:${userId}:${tenantId}`);
    }
  }
}

module.exports = new PermissionService();
```

### 9.3 Auth Controller

```javascript
// src/controllers/auth/auth.controller.js

const bcrypt = require('bcryptjs');
const jwtService = require('../../infrastructure/auth/jwt.service');
const sessionService = require('../../infrastructure/redis/session.service');
const mfaService = require('../../infrastructure/auth/mfa/mfa.service');
const { User } = require('../../sequelize-models');

class AuthController {
  /**
   * POST /api/v1/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;

      // Find user
      const user = await User.findOne({ 
        where: { email },
        include: ['roles', 'tenant']
      });
      
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check password
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        // Log failed attempt
        await this.logFailedLogin(user.id, req.ip);
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Check if account is locked
      if (user.locked_until && user.locked_until > new Date()) {
        return res.status(423).json({ 
          error: 'Account locked',
          lockedUntil: user.locked_until
        });
      }

      // Check if MFA is enabled
      if (user.mfa_enabled) {
        // Generate MFA token (short-lived)
        const mfaToken = jwtService.generateMfaToken(user.id);
        return res.status(200).json({
          mfaRequired: true,
          mfaToken
        });
      }

      // Generate tokens and session
      const result = await this.createSessionAndTokens(user, req);
      
      // Log successful login
      await this.logSuccessfulLogin(user.id, req.ip);

      return res.status(200).json(result);
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  }

  /**
   * POST /api/v1/auth/mfa/verify
   */
  async verifyMfa(req, res) {
    try {
      const { mfaToken, code } = req.body;

      // Verify MFA token
      const decoded = jwtService.verifyMfaToken(mfaToken);
      const userId = decoded.sub;

      // Get user
      const user = await User.findByPk(userId, {
        include: ['roles', 'tenant']
      });

      if (!user) {
        return res.status(401).json({ error: 'Invalid MFA token' });
      }

      // Verify TOTP code
      const isValid = mfaService.verifyTotp(user.mfa_secret, code);
      if (!isValid) {
        return res.status(401).json({ error: 'Invalid MFA code' });
      }

      // Generate tokens and session
      const result = await this.createSessionAndTokens(user, req);

      return res.status(200).json(result);
    } catch (error) {
      console.error('MFA verify error:', error);
      return res.status(401).json({ error: 'MFA verification failed' });
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    try {
      const { user } = req;

      // Destroy session
      await sessionService.destroySession(user.id, user.sessionId);

      // Blacklist current token
      const token = req.headers.authorization.substring(7);
      const expiresIn = jwtService.getTokenExpiration(token);
      await sessionService.blacklistToken(req.tokenJti, expiresIn);

      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      return res.status(500).json({ error: 'Logout failed' });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refresh(req, res) {
    try {
      const { refreshToken } = req.body;

      // Verify refresh token
      const decoded = jwtService.verifyRefreshToken(refreshToken);

      // Check session exists
      const session = await sessionService.getSession(decoded.sub, decoded.sessionId);
      if (!session) {
        return res.status(401).json({ error: 'Session expired' });
      }

      // Get user
      const user = await User.findByPk(decoded.sub, {
        include: ['roles', 'tenant']
      });

      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      // Generate new access token (same session)
      const accessToken = jwtService.generateAccessToken(user, decoded.sessionId);

      // Optionally rotate refresh token
      const newRefreshToken = jwtService.generateRefreshToken(
        user.id, 
        decoded.sessionId,
        decoded.tokenFamily
      );

      return res.status(200).json({
        accessToken,
        refreshToken: newRefreshToken
      });
    } catch (error) {
      console.error('Refresh error:', error);
      return res.status(401).json({ error: 'Token refresh failed' });
    }
  }

  /**
   * Helper: Create session and tokens
   */
  async createSessionAndTokens(user, req) {
    // Create session
    const deviceInfo = {
      userAgent: req.headers['user-agent'],
      ip: req.ip,
      device: this.parseUserAgent(req.headers['user-agent'])
    };
    
    const sessionId = await sessionService.createSession(
      user.id,
      user.primary_tenant_id,
      deviceInfo
    );

    // Generate tokens
    const accessToken = jwtService.generateAccessToken(user, sessionId);
    const refreshToken = jwtService.generateRefreshToken(user.id, sessionId);

    return {
      accessToken,
      refreshToken,
      expiresIn: 86400, // 24 hours
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.primary_tenant_id,
        roles: user.roles.map(r => r.name)
      }
    };
  }
}

module.exports = new AuthController();
```

---

## 10. Database Schema

### 10.1 IAM Tables (Already in Schema)

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    primary_tenant_id UUID REFERENCES tenants(id),
    status VARCHAR(20) DEFAULT 'active',
    email_verified BOOLEAN DEFAULT FALSE,
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    scope VARCHAR(20) DEFAULT 'TENANT', -- PLATFORM or TENANT
    is_system BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Permissions table
CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    resource VARCHAR(100) NOT NULL,
    action VARCHAR(50) NOT NULL,
    conditions JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(role_id, resource, action)
);

-- User Roles (junction table)
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    module_id VARCHAR(50), -- NULL means all modules
    expires_at TIMESTAMP,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, role_id, tenant_id, module_id)
);

-- OAuth Identities
CREATE TABLE oauth_identities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- google, microsoft, okta
    provider_user_id VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    profile_data JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(provider, provider_user_id)
);

-- MFA Recovery Codes
CREATE TABLE mfa_recovery_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    code_hash VARCHAR(255) NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- API Keys
CREATE TABLE api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    key_hash VARCHAR(255) NOT NULL,
    key_prefix VARCHAR(10) NOT NULL, -- First 8 chars for identification
    permissions JSONB, -- Scoped permissions
    expires_at TIMESTAMP,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

---

## 11. API Endpoints

### Complete IAM API Endpoints

```
# ═══════════════════════════════════════════════════════════════════════════
# AUTHENTICATION
# ═══════════════════════════════════════════════════════════════════════════

# Basic Auth
POST   /api/v1/auth/login                    # Login with email/password
POST   /api/v1/auth/logout                   # Logout (invalidate session)
POST   /api/v1/auth/refresh                  # Refresh access token
GET    /api/v1/auth/me                       # Get current user
PUT    /api/v1/auth/me                       # Update profile
PUT    /api/v1/auth/me/password              # Change password

# Password Reset
POST   /api/v1/auth/forgot-password          # Request reset email
POST   /api/v1/auth/reset-password           # Reset with token
POST   /api/v1/auth/verify-email             # Verify email address

# OAuth 2.0
GET    /api/v1/auth/oauth/google             # Initiate Google OAuth
GET    /api/v1/auth/oauth/google/callback    # Google callback
GET    /api/v1/auth/oauth/microsoft          # Initiate Microsoft OAuth
GET    /api/v1/auth/oauth/microsoft/callback # Microsoft callback
GET    /api/v1/auth/oauth/okta               # Initiate Okta OAuth
GET    /api/v1/auth/oauth/okta/callback      # Okta callback

# SAML 2.0
GET    /api/v1/auth/saml/login               # Initiate SAML SSO
POST   /api/v1/auth/saml/callback            # SAML assertion callback
GET    /api/v1/auth/saml/metadata            # SP metadata

# MFA
POST   /api/v1/auth/mfa/setup                # Setup MFA (get QR code)
POST   /api/v1/auth/mfa/setup/verify         # Verify setup with code
POST   /api/v1/auth/mfa/verify               # Verify during login
POST   /api/v1/auth/mfa/disable              # Disable MFA
GET    /api/v1/auth/mfa/recovery-codes       # Get recovery codes
POST   /api/v1/auth/mfa/recovery-codes/regenerate  # Regenerate codes

# Sessions
GET    /api/v1/auth/sessions                 # List active sessions
DELETE /api/v1/auth/sessions/:sessionId      # Revoke specific session
DELETE /api/v1/auth/sessions                 # Revoke all (logout everywhere)

# ═══════════════════════════════════════════════════════════════════════════
# USER MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

# Users CRUD
GET    /api/v1/users                         # List users
GET    /api/v1/users/:userId                 # Get user
POST   /api/v1/users                         # Create user
PUT    /api/v1/users/:userId                 # Update user
DELETE /api/v1/users/:userId                 # Deactivate user

# User Actions
POST   /api/v1/users/:userId/activate        # Activate
POST   /api/v1/users/:userId/deactivate      # Deactivate
POST   /api/v1/users/:userId/unlock          # Unlock
POST   /api/v1/users/:userId/reset-password  # Admin reset
POST   /api/v1/users/:userId/resend-invite   # Resend invite

# User Details
GET    /api/v1/users/:userId/roles           # User's roles
GET    /api/v1/users/:userId/permissions     # Effective permissions
GET    /api/v1/users/:userId/sessions        # Active sessions
GET    /api/v1/users/:userId/activity        # Activity log

# ═══════════════════════════════════════════════════════════════════════════
# ROLE MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

# Roles CRUD
GET    /api/v1/roles                         # List roles
GET    /api/v1/roles/:roleId                 # Get role
POST   /api/v1/roles                         # Create role
PUT    /api/v1/roles/:roleId                 # Update role
DELETE /api/v1/roles/:roleId                 # Delete role

# Role Permissions
GET    /api/v1/roles/:roleId/permissions     # Get permissions
PUT    /api/v1/roles/:roleId/permissions     # Update permissions

# Role Users
GET    /api/v1/roles/:roleId/users           # Users with role
POST   /api/v1/roles/:roleId/users           # Assign to user
DELETE /api/v1/roles/:roleId/users/:userId   # Remove from user

# ═══════════════════════════════════════════════════════════════════════════
# PERMISSION MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

GET    /api/v1/permissions/resources         # List resources
GET    /api/v1/permissions/actions           # List actions
GET    /api/v1/permissions/matrix            # Full permission matrix

# ═══════════════════════════════════════════════════════════════════════════
# SSO CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════

GET    /api/v1/auth/sso/config               # Get SSO config
PUT    /api/v1/auth/sso/config               # Update SSO config
GET    /api/v1/auth/sso/providers            # Available providers
POST   /api/v1/auth/sso/test                 # Test SSO config

# Per-tenant SSO
GET    /api/v1/tenants/:tenantId/sso/config
PUT    /api/v1/tenants/:tenantId/sso/config

# ═══════════════════════════════════════════════════════════════════════════
# API KEY MANAGEMENT
# ═══════════════════════════════════════════════════════════════════════════

GET    /api/v1/api-keys                      # List API keys
GET    /api/v1/api-keys/:keyId               # Get key details
POST   /api/v1/api-keys                      # Create API key
PUT    /api/v1/api-keys/:keyId               # Update key
DELETE /api/v1/api-keys/:keyId               # Revoke key
POST   /api/v1/api-keys/:keyId/regenerate    # Regenerate secret
GET    /api/v1/api-keys/:keyId/usage         # Usage stats
```

---

## 12. Testing Checklist

### IAM Testing Checklist

```bash
# ═══════════════════════════════════════════════════════════════════════════
# AUTHENTICATION TESTS
# ═══════════════════════════════════════════════════════════════════════════

# 1. Login with valid credentials
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"password123"}'
# Expected: 200 with {accessToken, refreshToken, user}

# 2. Login with invalid password
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@test.com","password":"wrong"}'
# Expected: 401 Unauthorized

# 3. Access protected route with token
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <access_token>"
# Expected: 200 with user data

# 4. Access protected route without token
curl -X GET http://localhost:3000/api/v1/auth/me
# Expected: 401 Unauthorized

# 5. Refresh token
curl -X POST http://localhost:3000/api/v1/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{"refreshToken":"<refresh_token>"}'
# Expected: 200 with new tokens

# 6. Logout
curl -X POST http://localhost:3000/api/v1/auth/logout \
  -H "Authorization: Bearer <access_token>"
# Expected: 200

# 7. Use token after logout
curl -X GET http://localhost:3000/api/v1/auth/me \
  -H "Authorization: Bearer <old_access_token>"
# Expected: 401 (token blacklisted)

# ═══════════════════════════════════════════════════════════════════════════
# AUTHORIZATION TESTS
# ═══════════════════════════════════════════════════════════════════════════

# 8. Access resource with permission
curl -X POST http://localhost:3000/api/v1/aice/evaluations \
  -H "Authorization: Bearer <token_with_aice.evaluations.create>" \
  -H "X-Tenant-ID: tenant-123" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Evaluation"}'
# Expected: 201 Created

# 9. Access resource without permission
curl -X POST http://localhost:3000/api/v1/aice/evaluations \
  -H "Authorization: Bearer <token_without_permission>" \
  -H "X-Tenant-ID: tenant-123" \
  -H "Content-Type: application/json" \
  -d '{"name":"Test Evaluation"}'
# Expected: 403 Forbidden

# 10. Access different tenant (not allowed)
curl -X GET http://localhost:3000/api/v1/aice/evaluations \
  -H "Authorization: Bearer <token_for_tenant_A>" \
  -H "X-Tenant-ID: tenant-B"
# Expected: 403 Forbidden (tenant access denied)

# ═══════════════════════════════════════════════════════════════════════════
# MFA TESTS
# ═══════════════════════════════════════════════════════════════════════════

# 11. Setup MFA
curl -X POST http://localhost:3000/api/v1/auth/mfa/setup \
  -H "Authorization: Bearer <token>"
# Expected: 200 with {qrCode, secret, setupToken}

# 12. Verify MFA setup
curl -X POST http://localhost:3000/api/v1/auth/mfa/setup/verify \
  -H "Content-Type: application/json" \
  -d '{"setupToken":"<setup_token>","code":"123456"}'
# Expected: 200 with {enabled: true, recoveryCodes: [...]}

# 13. Login with MFA
curl -X POST http://localhost:3000/api/v1/auth/login \
  -d '{"email":"mfa-user@test.com","password":"password123"}'
# Expected: 200 with {mfaRequired: true, mfaToken}

curl -X POST http://localhost:3000/api/v1/auth/mfa/verify \
  -d '{"mfaToken":"<mfa_token>","code":"123456"}'
# Expected: 200 with tokens

# ═══════════════════════════════════════════════════════════════════════════
# SESSION TESTS
# ═══════════════════════════════════════════════════════════════════════════

# 14. List sessions
curl -X GET http://localhost:3000/api/v1/auth/sessions \
  -H "Authorization: Bearer <token>"
# Expected: 200 with list of sessions

# 15. Revoke specific session
curl -X DELETE http://localhost:3000/api/v1/auth/sessions/<sessionId> \
  -H "Authorization: Bearer <token>"
# Expected: 200

# 16. Logout all devices
curl -X DELETE http://localhost:3000/api/v1/auth/sessions \
  -H "Authorization: Bearer <token>"
# Expected: 200
```

---

## Summary

This document now provides **COMPLETE IAM coverage** including:

| Component | Status | Details |
|-----------|--------|---------|
| Authentication Flows | ✅ Complete | Email/Password, OAuth, SAML, MFA |
| Authorization Flow | ✅ Complete | Step-by-step request flow |
| RBAC Model | ✅ Complete | Roles, permissions, conditions |
| Multi-Tenancy | ✅ Complete | Tenant isolation, row-level security |
| JWT Tokens | ✅ Complete | Structure, lifecycle, claims |
| Permission System | ✅ Complete | Format, wildcards, evaluation |
| Session Management | ✅ Complete | Redis storage, operations |
| API Security | ✅ Complete | Middleware chain |
| Implementation Code | ✅ Complete | Services, controllers |
| Database Schema | ✅ Complete | All IAM tables |
| API Endpoints | ✅ Complete | 60+ IAM endpoints |
| Testing Checklist | ✅ Complete | curl commands |

---

*Document End - Complete IAM Specification*
