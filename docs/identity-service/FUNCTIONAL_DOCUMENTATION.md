# QAssure Identity & Platform Service — Functional & Module-Level Documentation

---

## 1. Functional Scope & Goals

The Identity & Platform Service is the gatekeeper for all authenticated operations across QAssure. It is responsible for the full user identity lifecycle: registration, email verification, login, password reset, session management, multi-tenant membership, RBAC assignments, organizational structure (departments, designations), module SSO, and security policy compliance.

---

## 2. Sub-Modules & Feature Descriptions

### 2.1 Authentication Module (`/api/v1/auth`)
Manages the complete user authentication lifecycle:
- **Registration**: Creates user accounts with email/password. Triggers email verification.
- **Email Verification**: Validates a signed token emailed to the user. Marks account as verified.
- **Resend Verification**: Re-issues verification email if original expired.
- **Login**: Validates credentials, checks password policy (expiry, lockout), creates a session record, and issues a signed JWT access token + refresh token pair.
- **Token Refresh**: Accepts a valid refresh token and issues a new access token without requiring credentials. Also enforces idle session timeout: if `last_activity_at` on the session is older than `IDLE_TIMEOUT_MINUTES` (from `config.session`), the session is revoked and a `SESSION_IDLE_TIMEOUT` error is returned instead of new tokens.
- **Logout**: Revokes the current session by marking `revoked_at` in the `sessions` table and clearing Redis session cache. Accepts an optional `reason` parameter (`'user_initiated'` | `'idle_timeout'` | `'forced'`) which is persisted to the audit log for compliance traceability.
- **Logout All**: Revokes all active sessions for the user.
- **Forgot/Reset Password**: Issues a signed password reset token via email; validates and updates the password hash on consumption.
- **Change Password**: Authenticated password change; validates current password, checks password history (21 CFR Part 11), and updates the record.
- **Service Tokens**: Long-lived API tokens for background tasks. Created with an explicit name and optional expiry.

### 2.2 User Management Module (`/api/v1/users`)
CRUD lifecycle for platform users:
- **List Users**: Returns paginated, filtered list of users within the tenant context.
- **Get by ID**: Returns a single user's public profile data.
- **Create User**: Creates a new user account and assigns them to the tenant with a specified role. Tenant admin or super admin only.
- **Update User**: Updates profile fields, department, designation, status, etc.
- **Delete User**: Removes user access (soft delete).
- **Supplier Users**: Fetch users linked to a specific supplier, or fetch supplier details of a user.

### 2.3 Tenant Management Module (`/api/v1/tenants`)
Manages organization (tenant) records. Super Admin scoped:
- **List Tenants**: All organizations registered on the platform.
- **Get by ID**: Full tenant details including subscription tier and branding.
- **Create Tenant**: Provision a new organization (Super Admin only).
- **Update Tenant**: Modify branding, settings, subscription, and feature flags.
- **Delete Tenant**: Remove tenant and cascade to all child resources.
- **Module Access**: Enable/disable modules for a tenant. Update per-tenant module settings.
- **Platform Service Access**: Enable/disable any of the 14 controllable internal platform services (Document, Training, CAPA, Supplier Quality, Workflow, Projects, Reporting, Electronic Signatures, AI Gateway, QMS Integration, File Attachments, Storage Buckets, Security Policy, and License Billing) for a tenant. When a service is disabled, corresponding frontend routes/views render as locked (🔒) with tooltips, and backend endpoints reject access with `SERVICE_DISABLED` (exempting Super Admins and system services like Identity, Notifications, and Audit Logs).
- **Current Tenant Users Dropdown**: Provides a lightweight user list for filter selectors.
- **Theme by Domain**: Public endpoint — returns branding data by domain for white-labeled login pages.

### 2.4 Role Management Module (`/api/v1/roles`)
Manages role definitions that serve as RBAC groupings:
- **List Roles**: Returns all roles for the current tenant.
- **Get by ID**: Returns a role with its associated permissions.
- **Create Role**: Defines a new named role with a scope (`tenant`, `platform`, `module`). Requires `requireTenantAdmin`.
- **Update Role**: Modifies role metadata and permission sets.
- **Delete Role**: Removes the role (cascades to `user_roles`).
- **Role Scope**: Roles can be:
  - `tenant` — scoped to a specific organization
  - `platform` — cross-tenant, used for Super Admin delegated users
  - `module` — scoped to a specific external application module

### 2.5 Permission Management Module (`/api/v1/permissions`)
Manages granular `resource:action` grants attached to roles:
- All permissions follow the format: `<resource>:<action>` (e.g., `users:read`, `files:delete`).
- Wildcards supported: `*:*` (all), `resource:*` (all actions on resource), `*:action` (action on all resources).
- Permissions are linked to a `role_id` and have a `scope` and optional `conditions` JSONB for future attribute-based access control (ABAC).

### 2.6 User-Role Assignment Module (`/api/v1/user-roles`)
Manages the many-to-many mapping between users and roles:
- Assignments can be scoped to a **tenant** and/or a **module**.
- Supports `assigned_by` tracking (audit trail).
- Supports `expires_at` for temporary role elevations.

### 2.7 User-Tenant Membership Module (`/api/v1/user-tenants`)
Manages users belonging to multiple organizations:
- A user can be a member of multiple tenants.
- The `status` field controls active vs. suspended membership.
- Used by `verifyTenantAccess` middleware to validate cross-tenant requests.

### 2.8 Department Module (`/api/v1/departments`)
Organizational hierarchy for users:
- **Flat List**: Returns all departments for the tenant.
- **Tree View**: Returns nested hierarchical representation of departments using parent-child relationships.
- **CRUD**: Full create/update/delete lifecycle. Deletion is soft (deactivation).

### 2.9 Designation Module (`/api/v1/designations`)
Job title and designation management:
- Simple CRUD for job titles/designations linked to tenant.
- Used as a foreign key on the `users` table.

### 2.10 Session Management Module (`/api/v1/sessions`)
Administrative session registry:
- View all active sessions for compliance monitoring.
- Revoke individual sessions (kick specific device/session).
- Revoke all sessions via `DELETE /auth/logout-all`.
- Each session tracks a `last_activity_at` timestamp, updated on every authenticated API request (debounced via Redis to once per 60 seconds per session). This timestamp is checked during token refresh to enforce idle session auto-logout.

### 2.11 Security & Compliance Module (`/api/v1/security`)
21 CFR Part 11 compliance features:

**Password Policy**:
- Configurable minimum length, complexity (uppercase, number, symbol requirements), max age (expiry days), history count (prevent reuse).
- Lockout policy: max failed attempts, lockout duration.
- Validate any password against current policy via `/password-policy/validate`.

**Access Reviews**:
- Create periodic review campaigns with scope (all users, specific roles).
- Start a campaign → review items auto-populated for all users in scope.
- Reviewers make decisions: `certify` (keep access) or `revoke` (remove role).
- Bulk certify all pending users in one action.
- Execute decisions — actually revoke roles for users flagged for removal.
- Compliance report: Aggregated statistics for audit trails.

**Security Settings**:
- Configure MFA enforcement, session timeout, IP allowlists.
- Apply compliance mode presets: `FDA_21CFR_PART11`, `ISO_27001`, `SOC2`.
- Export settings for backup and auditing.
- Compliance summary: Identifies gaps between current config and selected mode.

### 2.12 Module SSO & Launch Token Module (`/api/v1/modules`)
Enables secure user delegation from QAssure into external modules:

**Launch Flow**:
1. User clicks launch in QAssure UI.
2. Platform issues a **5-minute, single-use** launch token tied to the user's session.
3. The response contains a `launch_url` with the token embedded as a query parameter.
4. The external module redirects the user to this URL.
5. Module's backend calls `POST /api/v1/modules/verify-launch-token` using its own `X-API-Key`.
6. Platform validates the token and API key, then returns the full user context (identity, tenant, roles, permissions).
7. Module creates its own authenticated session for the user.

---

## 3. Middleware Architecture

### 3.1 `authenticate` (auth.middleware.js)
The primary identity verification middleware. Applied at the top of every protected route group.

| Mode | Trigger Condition | Behavior |
| :--- | :--- | :--- |
| **JWT Only** | `Authorization: Bearer <token>` present, no `X-API-Key` | Verifies JWT, validates session in DB/Redis, populates `req.user`. After successful auth, updates `last_activity_at` on the session (debounced via Redis; max one DB write per 60s per session) to keep idle timeout from triggering for active users. |
| **API Key Only** | `X-API-Key` present, no JWT | Validates key in DB, checks module-tenant activation, populates `req.user` |
| **Combined** | Both JWT and `X-API-Key` present | Verifies both independently, cross-checks tenant IDs, sets `req.user` from JWT and `req.module` from API key |

### 3.2 `authorize(resource, action)` (auth.middleware.js)
Permission enforcement middleware. Applied per-route after `authenticate`.
- Accepts `'resource:action'` string format or two separate arguments.
- Super Admin always passes.
- Module context (Combined mode) uses module-scoped DB permission check.
- JWT users first check token-cached permissions, then fall back to DB.

### 3.3 `requireRole(roles)` (auth.middleware.js)
Role-based guard. Used to restrict routes to specific named roles (e.g., `tenant_admin`). Does not work with API Key authentication.

### 3.4 `authorizeAny(permissions[])` / `authorizeAll(permissions[])` (auth.middleware.js)
Multi-permission guards — pass if user has **any** or **all** of the specified `resource:action` pairs.

### 3.5 `tenantContext` (tenant.middleware.js)
Resolves the current tenant from `x-tenant-id` header, JWT token, or query parameter. Validates UUID format, checks `tenants` table, enforces `active` status, caches result for 5 minutes. Sets `req.tenant` and `req.tenantId`.

### 3.6 `verifyTenantAccess` (tenant.middleware.js)
After `tenantContext`, confirms the authenticated user is actually a member of the resolved tenant. Checks `user_tenants` table if JWT tenant doesn't match.

* **Automated Lockout Enforcement**: If a user attempts to perform unauthorized cross-tenant API requests (access other tenant data), this middleware tracks the attempts. After 5 attempts, the middleware automatically suspends the user account, terminates all active sessions globally (via `authService.logoutAll`), and persists the suspension reasons into the user preferences security metadata and the compliance audit logs. Super Admins and Platform Users are exempt from this lockout mechanism to ensure administrative operations are not disrupted.


### 3.7 `optionalAuth` (auth.middleware.js)
Like `authenticate` but never returns 401. Used for public routes that behave differently when the user is authenticated (e.g., theme endpoint).

### 3.8 `optionalTenantContext` (tenant.middleware.js)
Like `tenantContext` but never blocks the request. Populates `req.tenant` if available.

### 3.9 `requireFeature(featureName)` (tenant.middleware.js)
Checks if a feature flag is enabled in `req.tenant.settings`. Returns 403 if disabled. Used to gate tenant-specific premium features.

### 3.10 `requireSubscriptionTier(tiers[])` (tenant.middleware.js)
Validates the tenant's subscription tier against an allowed set. Returns 403 with `SUBSCRIPTION_REQUIRED` if the tier doesn't qualify.

### 3.11 `authenticateApiKey` (apikey.middleware.js)
Dedicated API-key-only middleware. Validates `X-API-Key`, resolves tenant from key or header, verifies module activation for module-scoped keys.

### 3.12 `validate(schema, source)` (validationMiddleware.js)
Generic Zod schema validation factory. Validates `req.body`, `req.params`, or `req.query` against the provided Zod schema. Returns structured 400 error on failure with path, message, and Zod error code.

### 3.13 `serviceEnabled(serviceKey)` (service.middleware.js)
Gates backend API routes behind a per-tenant platform service enablement check.
- Bypasses check for Super Admins (`isSuperAdmin === true`) to prevent admin locking.
- Resolves tenant from request context.
- Checks in-memory cache first (TTL: 60s); falls back to database lookup on cache miss.
- Rejects with `SERVICE_DISABLED` (HTTP 403) and explanatory message if service is disabled.
- Fail-safe: allows request to pass if database is unreachable.
