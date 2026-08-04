# QAssure Identity & Platform Service — Codebase & API Documentation

This document maps the full codebase layout and documents all **93 API endpoints** across 13 route groups.

---

## 1. Codebase Layout & File Mapping

### 1.1 Route Files
| File | Base Path | Description |
| :--- | :--- | :--- |
| `auth.routes.js` | `/api/v1/auth` | Registration, login, session, tokens, password |
| `user_routes.js` | `/api/v1/users` | User CRUD, supplier relations |
| `tenant_routes.js` | `/api/v1/tenants` | Tenant CRUD, module access management |
| `role_routes.js` | `/api/v1/roles` | Role CRUD |
| `permission_routes.js` | `/api/v1/permissions` | Permission CRUD |
| `user_role_routes.js` | `/api/v1/user-roles` | User-role assignments |
| `user_tenant_routes.js` | `/api/v1/user-tenants` | User-tenant memberships |
| `department.routes.js` | `/api/v1/departments` | Department CRUD + hierarchy tree |
| `designation.routes.js` | `/api/v1/designations` | Designation CRUD |
| `session_routes.js` | `/api/v1/sessions` | Admin session management |
| `security.routes.js` | `/api/v1/security` | Password policy, access reviews, settings |
| `module_routes.js` | `/api/v1/modules` | Module registration, SSO launch/verify |
| `tenant-storage-bucket.routes.js` | `/api/v1/storage-buckets` | CRUD operations and tenant bucket assignments |
| `platform-services.routes.js` | `/api/v1/platform-services` | Registry and per-tenant enabled service lookup |

### 1.2 Controller Files
| File | Description |
| :--- | :--- |
| `auth.controller.js` | Auth lifecycle handlers |
| `user_controller.js` | User CRUD handlers |
| `tenant_controller.js` | Tenant CRUD + theme handlers |
| `role_controller.js` | Role CRUD handlers |
| `permission_controller.js` | Permission CRUD handlers |
| `user_role_controller.js` | User-role assignment handlers |
| `user_tenant_controller.js` | User-tenant membership handlers |
| `department.controller.js` | Department + tree handlers |
| `designation.controller.js` | Designation handlers |
| `session_controller.js` | Session admin handlers |
| `security.controller.js` | Password policy + access review + settings |
| `module.controller.js` | Module CRUD + SSO launch/verify |
| `tenant-storage-bucket.controller.js` | Storage bucket CRUD and assignment handlers |
| `platform-service.controller.js` | Platform service list, tenant state, and registry handlers |

### 1.3 Middleware Files
| File | Exports | Purpose |
| :--- | :--- | :--- |
| `auth.middleware.js` | `authenticate`, `authorize`, `authorizeAny`, `authorizeAll`, `requireRole`, `optionalAuth` | Primary identity & permission enforcement |
| `tenant.middleware.js` | `tenantContext`, `verifyTenantAccess`, `optionalTenantContext`, `requireFeature`, `requireSubscriptionTier`, `clearTenantCache` | Multi-tenancy isolation |
| `apikey.middleware.js` | `authenticateApiKey`, `authenticateAny`, `authorizeApiKey` | API-key-specific auth |
| `validationMiddleware.js` | `validate(schema, source)` | Zod schema validation factory |
| `service.middleware.js` | `serviceEnabled(serviceKey)`, `invalidateCache`, `invalidateTenantCache` | Platform service enablement checks |

### 1.4 Validation Schema Files
| File | Schemas |
| :--- | :--- |
| `auth.schema.js` | `RegisterSchema`, `LoginSchema`, `VerifyEmailSchema`, `ResendVerificationSchema`, `ForgotPasswordSchema`, `ResetPasswordSchema`, `ChangePasswordSchema`, `RefreshTokenSchema`, `SessionParamsSchema`, `CreateServiceTokenSchema`, `RevokeServiceTokenSchema` |
| `user.schema.js` | `CreateUserSchema`, `UpdateUserSchema`, `UserParamsSchema`, `TenantIdParamsSchema`, `SupplierIdParamsSchema` |
| `tenant.schema.js` | `CreateTenantSchema`, `UpdateTenantSchema`, `TenantParamsSchema` |
| `role.schema.js` | `CreateRoleSchema`, `UpdateRoleSchema`, `RoleParamsSchema` |
| `permission.schema.js` | `CreatePermissionSchema`, `UpdatePermissionSchema`, `PermissionParamsSchema` |
| `user_role.schema.js` | `CreateUserroleSchema`, `UpdateUserroleSchema`, `UserroleParamsSchema` |
| `user_tenant.schema.js` | `CreateUsertenantSchema`, `UpdateUsertenantSchema`, `UsertenantParamsSchema` |
| `session.schema.js` | `CreateSessionSchema`, `UpdateSessionSchema`, `SessionParamsSchema` |

---

## 2. Global Headers & Security Context

```http
Authorization: Bearer <JWT_ACCESS_TOKEN>
x-tenant-id: <TENANT_UUID>
Content-Type: application/json
```
For module calls (Combined mode), additionally:
```http
X-API-Key: <MODULE_API_KEY>
```

---

## 3. Authentication Endpoints (`/api/v1/auth`)

### POST /auth/register
- **Auth**: Public
- **Body**: `{ email, password, first_name, last_name }`
- **201**: `{ success: true, data: { user: {...}, message: "Verification email sent" } }`
- **400**: Email already registered or validation failure

### POST /auth/verify-email
- **Auth**: Public
- **Body**: `{ token: "<verificationToken>" }`
- **200**: `{ success: true, message: "Email verified" }`
- **400**: Invalid or expired token

### POST /auth/resend-verification
- **Auth**: Public
- **Body**: `{ email }`
- **200**: `{ success: true, message: "Verification email resent" }`

### POST /auth/login
- **Auth**: Public
- **Body**: `{ email, password, tenant_id? }`
- **200**:
  ```json
  {
    "success": true,
    "data": {
      "access_token": "<JWT>",
      "refresh_token": "<refreshToken>",
      "expires_in": 3600,
      "user": { "id": "...", "email": "...", "roles": [...], "permissions": [...] },
      "tenant": { "id": "...", "name": "..." }
    }
  }
  ```
- **401**: Invalid credentials, account locked, or unverified email

### POST /auth/refresh
- **Auth**: Public
- **Body**: `{ refresh_token }`
- **200**: `{ access_token, expires_in }`
- **401**: Expired or revoked refresh token

### POST /auth/forgot-password
- **Auth**: Public
- **Body**: `{ email }`
- **200**: `{ success: true, message: "Reset email sent if account exists" }`

### POST /auth/reset-password
- **Auth**: Public
- **Body**: `{ token, new_password }`
- **200**: `{ success: true, message: "Password reset successful" }`
- **400**: Invalid/expired token or password policy violation

### POST /auth/logout
- **Auth**: JWT Required
- **200**: `{ success: true, message: "Logged out" }`

### POST /auth/logout-all
- **Auth**: JWT Required
- **200**: `{ success: true, message: "All sessions revoked" }`

### GET /auth/me
- **Auth**: JWT Required
- **200**: `{ success: true, data: { user, tenant, roles, permissions } }`

### GET /auth/sessions
- **Auth**: JWT Required
- **200**: `{ success: true, data: [{ id, ip_address, user_agent, created_at, expires_at }] }`

### DELETE /auth/sessions/:sessionId
- **Auth**: JWT Required
- **200**: `{ success: true, message: "Session revoked" }`

### POST /auth/validate
- **Auth**: JWT Required
- **200**: `{ success: true, valid: true, user: {...} }`

### POST /auth/service-token
- **Auth**: JWT Required
- **Body**: `{ name, expires_in_days?, permissions? }`
- **201**: `{ success: true, data: { token, id, name, expires_at } }`

### POST /auth/service-token/revoke
- **Auth**: JWT Required
- **Body**: `{ token_id }`
- **200**: `{ success: true, message: "Service token revoked" }`

### POST /auth/change-password
- **Auth**: JWT Required
- **Body**: `{ current_password, new_password }`
- **200**: `{ success: true, message: "Password changed" }`
- **400**: Current password wrong or new password in history

---

## 4. User Endpoints (`/api/v1/users`)

All routes: `authenticate` + `tenantContext` + `verifyTenantAccess`

### GET /users
- **Permission**: `users:read`
- **Query**: `page`, `limit`, `search`, `status`, `department_id`, `designation_id`
- **200**: `{ success: true, data: [...], pagination: { total, page, pages, limit } }`

### GET /users/:id
- **Permission**: `users:read`
- **200**: `{ success: true, data: { id, email, first_name, last_name, status, ... } }`

### GET /users/supplier/:supplier_id
- **Permission**: `users:read`
- **200**: `{ success: true, data: [...] }`

### GET /users/:id/supplier-details
- **Permission**: `users:read`
- **200**: `{ success: true, data: { supplier: {...} } }`

### POST /users
- **Permission**: `users:create`
- **Body**: `{ email, first_name, last_name, tenant_id, role_id, department_id?, designation_id? }`
- **201**: `{ success: true, data: { user } }`

### PUT /users/:id
- **Permission**: `users:update`
- **Body**: `{ first_name?, last_name?, status?, department_id?, designation_id?, preferences? }`
- **200**: `{ success: true, data: { updated user } }`

### DELETE /users/:id
- **Permission**: `users:delete`
- **200**: `{ success: true, message: "User deleted" }`

---

## 5. Tenant Endpoints (`/api/v1/tenants`)

### GET /tenants/theme?domain=example.com
- **Auth**: Public
- **200**: `{ primary_color, secondary_color, accent_color, logo_file_path, favicon_file_path }`

### GET /tenants/tenant-theme
- **Auth**: JWT Required
- **200**: Full theme config for JWT's tenant

### GET /tenants
- **Permission**: `requireSuperAdmin('tenants','read')`
- **200**: `{ success: true, data: [...], pagination: {...} }`

### GET /tenants/current/users/dropdown
- **Auth**: JWT Required
- **200**: `{ success: true, data: [{ id, full_name, role }] }`

### GET /tenants/:id
- **Permission**: `tenants:read`
- **200**: Full tenant object with modules

### POST /tenants
- **Permission**: `requireSuperAdmin('tenants','create')`
- **Body**: `{ name, slug, subscription_tier, max_users, max_modules, domain?, enable_sso?, enable_2fa? }`
- **201**: `{ success: true, data: { tenant } }`

### PUT /tenants/:id
- **Permission**: `tenants:update`
- **Body**: `{ name?, status?, settings?, primary_color?, ... }`
- **200**: Updated tenant object

### DELETE /tenants/:id
- **Permission**: `requireSuperAdmin('tenants','delete')`
- **200**: `{ success: true, message: "Tenant deleted" }`

### GET /tenants/:tenantId/modules
- **Auth**: JWT Required
- **200**: `{ success: true, data: [{ module, enabled, settings }] }`

### POST /tenants/:tenantId/modules/:moduleId/enable
- **Permission**: `requireSuperAdmin('tenants','update')`
- **200**: `{ success: true, message: "Module enabled" }`

### DELETE /tenants/:tenantId/modules/:moduleId
- **Permission**: `requireSuperAdmin('tenants','update')`
- **200**: `{ success: true, message: "Module disabled" }`

### PATCH /tenants/:tenantId/modules/:moduleId/settings
- **Permission**: `requireSuperAdmin('tenants','update')`
- **Body**: `{ settings: { key: value } }`
- **200**: `{ success: true, message: "Settings updated" }`

---

## 6. Role Endpoints (`/api/v1/roles`)

All routes: `authenticate` + `tenantContext` + `verifyTenantAccess`

### GET /roles — Permission: `roles:read` — Returns all roles for tenant
### GET /roles/:id — Permission: `roles:read` — Returns role with permissions
### POST /roles — Permission: `requireTenantAdmin('roles','create')` — Body: `{ name, code, description, scope, tenant_id? }`
### PUT /roles/:id — Permission: `requireTenantAdmin('roles','update')` — Body: `{ name?, description? }`
### DELETE /roles/:id — Permission: `requireTenantAdmin('roles','delete')`

---

## 7. Permission Endpoints (`/api/v1/permissions`)

All routes: `authenticate` + `tenantContext`

### GET /permissions — Permission: `permissions:read`
### GET /permissions/:id — Permission: `permissions:read`
### POST /permissions — Permission: `requireTenantAdmin('permissions','create')` — Body: `{ role_id, resource, action, scope, conditions? }`
### PUT /permissions/:id — Permission: `requireTenantAdmin('permissions','update')`
### DELETE /permissions/:id — Permission: `requireTenantAdmin('permissions','delete')`

---

## 8. Department Endpoints (`/api/v1/departments`)

All routes: `authenticate` + `tenantContext` + `verifyTenantAccess`

### GET /departments — Permission: `departments:read` — Flat list
### GET /departments/tree — Permission: `departments:read` — Nested hierarchy
### GET /departments/:id — Permission: `departments:read`
### POST /departments — Permission: `departments:create` — Body: `{ name, parent_id?, description? }`
### PUT /departments/:id — Permission: `departments:update`
### DELETE /departments/:id — Permission: `departments:delete` — Soft deactivation

---

## 9. Designation Endpoints (`/api/v1/designations`)

All routes: `authenticate` + `tenantContext` + `verifyTenantAccess`

### GET /designations — Permission: `designations:read`
### GET /designations/:id — Permission: `designations:read`
### POST /designations — Permission: `designations:create` — Body: `{ name, description? }`
### PUT /designations/:id — Permission: `designations:update`
### DELETE /designations/:id — Permission: `designations:delete`

---

## 10. Security Endpoints (`/api/v1/security`)

All routes: `authenticate`

### GET /security/password-policy — Returns current tenant password policy
### PUT /security/password-policy — Permission: `security:create` — Body: `{ min_length, require_uppercase, require_number, require_symbol, max_age_days, history_count, max_failed_attempts, lockout_duration_minutes }`
### GET /security/password-policy/requirements — Returns UI-friendly requirements
### POST /security/password-policy/validate — Body: `{ password }` — Tests against policy
### GET /security/password-expiry — Returns expiry status for current user

### POST /security/access-reviews — Permission: `security:create` — Body: `{ name, scope, reviewers: [...] }`
### GET /security/access-reviews — Permission: `security:read`
### GET /security/access-reviews/:id — Permission: `security:read`
### GET /security/access-reviews/:id/items — Permission: `security:read`
### POST /security/access-reviews/:id/start — Permission: `security:create`
### POST /security/access-reviews/:id/populate-items — Permission: `security:create`
### POST /security/access-reviews/:id/items/:itemId/decide — Permission: `security:create` — Body: `{ decision: 'certify'|'revoke', reason? }`
### POST /security/access-reviews/:id/bulk-certify — Permission: `security:create`
### POST /security/access-reviews/:id/execute — Permission: `*:*` (Super Admin)
### POST /security/access-reviews/:id/cancel — Permission: `security:create`
### GET /security/access-reviews/compliance-report — Permission: `audit:read`

### GET /security/decision-types — Returns available decision options
### GET /security/review-statuses — Returns status enum values

### GET /security/settings — Permission: `security:read`
### PUT /security/settings — Permission: `security:create` — Body: `{ mfa_required, session_timeout_minutes, ip_allowlist: [...] }`
### POST /security/settings/compliance-mode — Permission: `*:*` — Body: `{ mode: 'FDA_21CFR_PART11'|'ISO_27001'|'SOC2' }`
### GET /security/settings/compliance-modes — Available presets
### GET /security/settings/compliance-summary — Gap analysis
### GET /security/settings/export — Permission: `*:*` — Downloads settings JSON

---

## 11. Module SSO Endpoints (`/api/v1/modules`)

### POST /modules/:id/launch
- **Auth**: JWT Required (no explicit RBAC — user must have active session)
- **Description**: Issues a 5-minute launch token for the specified module
- **200**:
  ```json
  {
    "success": true,
    "data": {
      "launch_url": "/app/launch?token=<launchToken>",
      "expires_at": "2026-06-19T16:10:00Z"
    }
  }
  ```

### POST /modules/verify-launch-token
- **Auth**: `X-API-Key` (module's API key)
- **Description**: Called by external module backend to validate a launch token and receive full user context
- **Body**: `{ token: "<launchToken>" }`
- **200**:
  ```json
  {
    "success": true,
    "data": {
      "user": { "id": "...", "email": "...", "first_name": "...", "last_name": "..." },
      "tenant": { "id": "...", "name": "..." },
      "roles": [...],
      "permissions": [...],
      "session_token": "<moduleSessionJWT>"
    }
  }
  ```
- **401**: Invalid or expired launch token
- **403**: API key does not belong to the target module

---

## 12. Session Endpoints (`/api/v1/sessions`) — Admin

All routes: `authenticate` + `tenantContext` + `verifyTenantAccess`

### GET /sessions — Permission: `sessions:read` — All tenant sessions
### GET /sessions/:id — Permission: `sessions:read`
### POST /sessions — Permission: `sessions:create` — System use
### PUT /sessions/:id — Permission: `sessions:update`
### DELETE /sessions/:id — Permission: `sessions:delete` — Revoke specific session

---

## 13. User-Role Assignment Endpoints (`/api/v1/user-roles`)

All routes: `authenticate` + `tenantContext` + `verifyTenantAccess`

### GET /user-roles — Permission: `user_roles:read`
### GET /user-roles/:id — Permission: `user_roles:read`
### POST /user-roles — Permission: `user_roles:create` — Body: `{ user_id, role_id, tenant_id?, module_id?, expires_at? }`
### PUT /user-roles/:id — Permission: `user_roles:update`
### DELETE /user-roles/:id — Permission: `user_roles:delete`

---

## 14. User-Tenant Membership Endpoints (`/api/v1/user-tenants`)

All routes: `authenticate` + `tenantContext` + `verifyTenantAccess`

### GET /user-tenants — Permission: `user_tenants:read`
### GET /user-tenants/:id — Permission: `user_tenants:read`
### POST /user-tenants — Permission: `user_tenants:create` — Body: `{ user_id, tenant_id, status? }`
### PUT /user-tenants/:id — Permission: `user_tenants:update`
### DELETE /user-tenants/:id — Permission: `user_tenants:delete`

---

## 15. Tenant Storage Bucket Endpoints (`/api/v1/storage-buckets`)

All routes: `authenticate` + `tenantContext`.

### GET /storage-buckets
- **Permission**: `requireSuperAdmin('storage_buckets', 'read')`
- **Description**: Returns all storage buckets. Standard tenants can see only their assigned bucket.

### POST /storage-buckets
- **Permission**: `requireSuperAdmin('storage_buckets', 'write')`
- **Body**:
  - For Azure: `{ "name", "description", "storage_type": "azure", "azure_account", "azure_container", "azure_sas_token", "azure_url" }`
  - For Local: `{ "name", "description", "storage_type": "local", "local_path" }`
- **201**: Created storage bucket (SAS tokens are stored encrypted via AES-256-GCM and never returned in plain text).

### GET /storage-buckets/:id
- **Permission**: `requireSuperAdmin('storage_buckets', 'read')`
- **Description**: Fetch details of a specific storage bucket.

### PUT /storage-buckets/:id
- **Permission**: `requireSuperAdmin('storage_buckets', 'write')`
- **Description**: Update storage bucket properties.

### DELETE /storage-buckets/:id
- **Permission**: `requireSuperAdmin`
- **Description**: Soft-delete a storage bucket.

### POST /storage-buckets/:id/assign
- **Permission**: `requireSuperAdmin`
- **Body**: `{ "tenant_id" }`
- **Description**: Assigns the bucket to a tenant, setting it as active and saving historical tracking context.

### POST /storage-buckets/:id/assign-self
- **Permission**: `requireSuperAdmin`
- **Body**: `{ "tenant_id" }`
- **Description**: Shares the platform superadmin's default bucket with the specified tenant.

### DELETE /storage-buckets/tenant/:tenantId/unassign
- **Permission**: `requireSuperAdmin`
- **Description**: Unassigns active bucket from the tenant, falling back to local storage.

### GET /storage-buckets/tenant/:tenantId/active
- **Permission**: No additional scope required (authenticated tenant context)
- **Description**: Resolves active storage bucket config for the tenant.

### GET /storage-buckets/tenant/:tenantId/history
- **Permission**: `requireSuperAdmin`
- **Description**: Retrieves history of bucket assignments for the tenant.

---

## 16. Platform Services Endpoints (`/api/v1/platform-services`)

All routes: `authenticate`

### GET /platform-services
- **Permission**: `requireSuperAdmin('tenants', 'read')`
- **Description**: List all registered platform services in the static registry. Used by Create Tenant checkbox lists.

### GET /platform-services/my
- **Permission**: No additional scope required (authenticated tenant context)
- **Description**: Get enabled service keys for the current user's tenant. Used for tenant-side navigation and access guards.

### GET /platform-services/tenant/:tenantId
- **Permission**: `requireSuperAdmin('tenants', 'read')`
- **Description**: Get all registered services showing enabled/disabled state for a specific tenant ID. Used by Edit Tenant Platform Services tab.
