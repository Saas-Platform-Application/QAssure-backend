# QAssure Identity & Platform Service — Testing & Test Cases Document

---

## 1. Test Strategy Overview

The Identity Service must be validated across five key testing dimensions:
1. **Authentication & Token Lifecycle**: Correctness of JWT generation, session creation, expiry, and revocation.
2. **Multi-Tenant Isolation**: Ensuring Tenant A's users, roles, and data cannot be accessed by Tenant B.
3. **RBAC Enforcement**: Validating that every permission boundary is enforced correctly for each role scope.
4. **Module SSO Flow**: Validating the complete launch token issuance and verify flow end-to-end.
5. **Security Compliance**: Testing password policy enforcement, lockout behavior, and access review execution.

---

## 2. Comprehensive Test Case Matrix

| ID | API Endpoint | Feature | Description | Input | Expected Result |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **IDS-TC-01** | `POST /auth/register` | Auth | Register new user | Valid email + password | 201. User created with `status=pending_verification` |
| **IDS-TC-02** | `POST /auth/register` | Auth | Register duplicate email | Existing email | 400. Email already registered error |
| **IDS-TC-03** | `POST /auth/verify-email` | Auth | Verify with valid token | Valid verification token | 200. User status → `active` |
| **IDS-TC-04** | `POST /auth/verify-email` | Auth | Verify with expired token | Expired token | 400. Invalid or expired token |
| **IDS-TC-05** | `POST /auth/login` | Auth | Valid credentials login | email, password | 200. Returns `access_token`, `refresh_token`, user + tenant context |
| **IDS-TC-06** | `POST /auth/login` | Auth | Wrong password (1st attempt) | Correct email, wrong password | 401. Increments `failed_login_attempts` |
| **IDS-TC-07** | `POST /auth/login` | Auth | Account locked after max failed attempts | Trigger 5 failures | 401. `ACCOUNT_LOCKED` error. `locked_until` set |
| **IDS-TC-08** | `POST /auth/login` | Auth | Login with unverified account | Unverified email | 401. `EMAIL_NOT_VERIFIED` |
| **IDS-TC-09** | `POST /auth/refresh` | Auth | Refresh valid token | Valid refresh_token | 200. New `access_token` returned |
| **IDS-TC-10** | `POST /auth/refresh` | Auth | Refresh revoked token | Revoked refresh_token | 401. Session expired or revoked |
| **IDS-TC-11** | `POST /auth/logout` | Auth | Logout current session | Valid JWT | 200. Session revoked. Redis cache cleared |
| **IDS-TC-12** | `POST /auth/logout-all` | Auth | Revoke all sessions | Valid JWT | 200. All user sessions revoked |
| **IDS-TC-13** | `GET /auth/me` | Auth | Get current user profile | Valid JWT | 200. Returns user, tenant, roles, permissions |
| **IDS-TC-14** | `POST /auth/forgot-password` | Auth | Request reset for existing email | Valid email | 200. Reset email queued |
| **IDS-TC-15** | `POST /auth/reset-password` | Auth | Reset with valid token | Valid token, new password | 200. Password updated |
| **IDS-TC-16** | `POST /auth/change-password` | Auth | Change with correct current | Valid JWT + current_password | 200. Password updated. Old sessions revoked |
| **IDS-TC-17** | `POST /auth/change-password` | Auth | Reuse recent password | Password matches history | 400. `PASSWORD_REUSE` policy violation |
| **IDS-TC-18** | `POST /auth/service-token` | Auth | Create service token | name + optional expiry | 201. Long-lived token returned |
| **IDS-TC-19** | `GET /users` | Users | List users with permission | `users:read` role | 200. Paginated user list |
| **IDS-TC-20** | `GET /users` | Users | List without permission | No `users:read` | 403. FORBIDDEN |
| **IDS-TC-21** | `POST /users` | Users | Create user with tenant + role | Admin, valid body | 201. User created and assigned |
| **IDS-TC-22** | `DELETE /users/:id` | Users | Delete own account | Tenant admin | 200. Soft delete performed |
| **IDS-TC-23** | `GET /tenants` | Tenants | List all tenants as Super Admin | Super Admin JWT | 200. All tenants returned |
| **IDS-TC-24** | `GET /tenants` | Tenants | List all tenants as Tenant Admin | Tenant admin JWT | 403. FORBIDDEN |
| **IDS-TC-25** | `POST /tenants` | Tenants | Create new tenant | Super Admin + valid body | 201. Tenant created |
| **IDS-TC-26** | `DELETE /tenants/:id` | Tenants | Delete tenant | Super Admin | 200. Tenant deleted, cascade to users/roles |
| **IDS-TC-27** | `POST /tenants/:id/modules/:id/enable` | Tenants | Enable module for tenant | Super Admin | 200. Module activated |
| **IDS-TC-28** | `POST /roles` | Roles | Create tenant-scoped role | Tenant Admin | 201. Role created with scope=tenant |
| **IDS-TC-29** | `POST /roles` | Roles | Create platform-scoped role | Super Admin | 201. Role created with scope=platform |
| **IDS-TC-30** | `DELETE /roles/:id` | Roles | Delete role in use | Admin | 200. Role deleted; user_roles cascade deleted |
| **IDS-TC-31** | `POST /permissions` | Permissions | Assign `users:delete` to role | Admin + role_id | 201. Permission created |
| **IDS-TC-32** | `POST /user-roles` | RBAC | Assign role with expiry | user_id + role_id + expires_at | 201. Temporary role grant created |
| **IDS-TC-33** | `GET /departments/tree` | Departments | Get hierarchical tree | Tenant with nested depts | 200. Nested JSON tree returned |
| **IDS-TC-34** | `POST /departments` | Departments | Create with parent | name + parent_id | 201. Child department created |
| **IDS-TC-35** | `DELETE /departments/:id` | Departments | Soft delete active department | Admin | 200. Status set to inactive |
| **IDS-TC-36** | `PUT /security/password-policy` | Security | Update lockout policy | max_failed_attempts=3 | 200. Policy updated |
| **IDS-TC-37** | `POST /security/password-policy/validate` | Security | Validate weak password | `password=abc` | 400. Policy violation details |
| **IDS-TC-38** | `POST /security/access-reviews` | Security | Create access review | name + scope | 201. Review campaign created |
| **IDS-TC-39** | `POST /security/access-reviews/:id/start` | Security | Start review | Review ID | 200. Items populated, status=active |
| **IDS-TC-40** | `POST /security/access-reviews/:id/items/:id/decide` | Security | Revoke access decision | decision=revoke | 200. Decision recorded |
| **IDS-TC-41** | `POST /security/access-reviews/:id/execute` | Security | Execute revocations (Super Admin) | Super Admin | 200. Roles revoked for flagged users |
| **IDS-TC-42** | `POST /modules/:id/launch` | SSO | Issue launch token | Valid JWT + module ID | 200. `launch_url` with token |
| **IDS-TC-43** | `POST /modules/verify-launch-token` | SSO | Verify valid launch token | API Key + valid token | 200. Full user context returned |
| **IDS-TC-44** | `POST /modules/verify-launch-token` | SSO | Verify expired launch token | API Key + expired token | 401. Token expired |
| **IDS-TC-45** | `POST /modules/verify-launch-token` | SSO | Verify with wrong module API key | Mismatched API Key | 403. Module not authorized |
| **IDS-TC-46** | *Cross-Cutting* | Security | Access any endpoint without JWT | None | 401 MISSING_TOKEN |
| **IDS-TC-47** | *Cross-Cutting* | Isolation | Read Tenant B user using Tenant A token | Tenant A JWT, Tenant B user ID | 404 or 403 |
| **IDS-TC-48** | *Cross-Cutting* | Security | Request with invalid x-tenant-id format | Non-UUID string | 400 INVALID_TENANT_ID |
| **IDS-TC-49** | *Cross-Cutting* | Security | Request to suspended tenant | Suspended tenant ID | 403 TENANT_INACTIVE |
| **IDS-TC-50** | *Cross-Cutting* | SSO | Module API key for inactive tenant module | Active key, disabled module | 403 MODULE_NOT_ACTIVE |
| **IDS-TC-51** | *Cross-Cutting* | Security | Automated lockout on cross-tenant access | 5x cross-tenant access attempts | User status updated to `suspended`, all sessions revoked, security metadata logged |
| **IDS-TC-52** | *Cross-Cutting* | Security | Reactivate suspended user | Set status to `active` via Update User API | User status updated to `active`, preferences security metadata cleared |


---

## 3. Step-by-Step Test Scenarios

### Scenario A: Full Registration → Login → Logout Lifecycle

1. **Register** — `POST /auth/register` with `{ email, password, first_name, last_name }` → Verify 201.
2. **Verify Email** — `POST /auth/verify-email` with token from email → Verify 200 and status = `active`.
3. **Login** — `POST /auth/login` → Verify 200 and receive `access_token`, `refresh_token`.
4. **Profile** — `GET /auth/me` with Bearer token → Verify 200, user details match.
5. **Refresh** — `POST /auth/refresh` with `refresh_token` → Verify new `access_token`.
6. **Logout** — `POST /auth/logout` → Verify 200. Attempt reuse of old `access_token` → Must return 401.

### Scenario B: RBAC Boundary Enforcement

1. Create a role with only `files:read` permission.
2. Assign role to test user.
3. Attempt `GET /api/v1/files/` → **200 OK** (authorized).
4. Attempt `POST /api/v1/files/upload` → **403 FORBIDDEN** (missing `files:create`).
5. Attempt `GET /api/v1/users/` → **403 FORBIDDEN** (missing `users:read`).

### Scenario C: Module SSO End-to-End

1. **Setup**: Register module with valid API key. Enable module for tenant.
2. **Launch**: As authenticated UI user, `POST /modules/:moduleId/launch` → Get `launch_url` with token.
3. **Verify**: Module backend calls `POST /modules/verify-launch-token` with the token and `X-API-Key`.
4. **Assert**: Response contains `user.email`, `tenant.id`, `roles`, `permissions`, and `session_token`.
5. **Expiry Test**: Wait 5+ minutes. Attempt verify again → **401 Token expired**.

### Scenario D: Password Policy + Lockout

1. Set policy: `max_failed_attempts=3`, `lockout_duration_minutes=5`.
2. Login with wrong password 3 times.
3. 4th attempt → **401 ACCOUNT_LOCKED**.
4. Verify `locked_until` is set in `users` table.
5. After 5 minutes, retry login with correct password → **200 OK**.
