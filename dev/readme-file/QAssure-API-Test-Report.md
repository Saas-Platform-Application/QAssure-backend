# QAssure API Test Report

**Generated:** 2026-01-21 16:38:35  
**Base URL:** http://localhost:3000/api/v1  
**Test User:** d733ea2a-a3f6-4979-901a-142b2349cf5b

## Executive Summary

| Metric | Count | Percentage |
|--------|-------|------------|
| Total Tests | 30 | 100% |
| Passed | 20 | 66.7% |
| Failed | 10 | 33.3% |
| Pass Rate | 20/30 | 66.7% |

## Test Results by Category

### Authentication

**Results:** 7/10 passed (70.0%)

| # | Test Case | Method | Endpoint | Expected | Actual Status | Actual Response | Pass/Fail | Duration |
|---|-----------|--------|----------|----------|---------------|-----------------|-----------|----------|
| 1 | Valid credentials: Successful login | POST | /auth/login | 200 OK, tokens returned... | 401 | {   "success": false,   "error": {     "code": "INVALID_CREDENTIALS",     "message": "Invalid email ... | ✗ FAIL | 0.005s |
| 2 | Invalid email: Non-existent email | POST | /auth/login | 401 Unauthorized... | 401 | {   "success": false,   "error": {     "code": "INVALID_CREDENTIALS",     "message": "Invalid email ... | ✓ PASS | 0.006s |
| 3 | Invalid password: Correct email, wrong password | POST | /auth/login | 401 Unauthorized... | 401 | {   "success": false,   "error": {     "code": "INVALID_CREDENTIALS",     "message": "Invalid email ... | ✓ PASS | 0.007s |
| 4 | Empty email: Missing or empty email field | POST | /auth/login | 400 Bad Request, validation error... | 400 | {   "success": false,   "error": "Validation failed",   "details": [     {       "path": "email",   ... | ✓ PASS | 0.005s |
| 5 | Invalid email format: Malformed email | POST | /auth/login | 400 Bad Request, validation error... | 400 | {   "success": false,   "error": "Validation failed",   "details": [     {       "path": "email",   ... | ✓ PASS | 0.006s |
| 6 | Empty password: Missing or empty password | POST | /auth/login | 400 Bad Request, validation error... | 400 | {   "success": false,   "error": "Validation failed",   "details": [     {       "path": "password",... | ✓ PASS | 0.006s |
| 7 | No body: Empty request body | POST | /auth/login | 400 Bad Request, missing required fields... | 400 | {   "success": false,   "error": "Validation failed",   "details": [     {       "path": "email",   ... | ✓ PASS | 0.004s |
| 8 | Valid logout: With valid token | POST | /auth/logout | 200 OK, logged out... | 200 | {   "success": true,   "message": "Logged out successfully" } | ✓ PASS | 0.013s |
| 9 | Invalid token: Expired or malformed token | POST | /auth/logout | 401 Unauthorized... | 200 | {   "success": true,   "message": "Logged out successfully" } | ✗ FAIL | 0.011s |
| 10 | No token: Missing Authorization header | POST | /auth/logout | 401 Unauthorized... | 200 | {   "success": true,   "message": "Logged out successfully" } | ✗ FAIL | 0.013s |

### Tenants

**Results:** 2/5 passed (40.0%)

| # | Test Case | Method | Endpoint | Expected | Actual Status | Actual Response | Pass/Fail | Duration |
|---|-----------|--------|----------|----------|---------------|-----------------|-----------|----------|
| 1 | Valid fetch: All tenants with default params | GET | /tenants | 200 OK, tenant list... | 403 | {   "success": false,   "error": {     "code": "FORBIDDEN",     "message": "Super admin access requi... | ✗ FAIL | 0.010s |
| 2 | Filtered by status: Active only | GET | /tenants | 200 OK, only active tenants... | 403 | {   "success": false,   "error": {     "code": "FORBIDDEN",     "message": "Super admin access requi... | ✗ FAIL | 0.007s |
| 3 | Valid ID: Existing tenant | GET | /tenants/{id} | 200 OK, tenant object... | 200 | {   "success": true,   "data": {     "id": "00000000-0000-0000-0000-000000000001",     "name": "Acme... | ✓ PASS | 0.023s |
| 4 | Non-existent ID | GET | /tenants/{id} | 404 Not Found... | 200 | {   "success": true,   "data": {     "id": "00000000-0000-0000-0000-000000000001",     "name": "Acme... | ✗ FAIL | 0.006s |
| 5 | Unauthorized: No token or invalid | GET | /tenants | 401 Unauthorized... | 401 | {   "success": false,   "error": {     "code": "MISSING_TOKEN",     "message": "Authentication token... | ✓ PASS | 0.004s |

### Users

**Results:** 3/4 passed (75.0%)

| # | Test Case | Method | Endpoint | Expected | Actual Status | Actual Response | Pass/Fail | Duration |
|---|-----------|--------|----------|----------|---------------|-----------------|-----------|----------|
| 1 | Valid list: Default params | GET | /users | 200, users list... | 200 | {   "success": true,   "data": [     {       "id": "b11e6d37-00c9-4831-ba50-a6774a608b7e",       "em... | ✓ PASS | 0.038s |
| 2 | Valid user | GET | /users/{id} | 200, user object... | 200 | {   "success": true,   "data": {     "id": "d733ea2a-a3f6-4979-901a-142b2349cf5b",     "email": "adm... | ✓ PASS | 0.017s |
| 3 | Non-existent | GET | /users/{id} | 404 Not Found... | 200 | {   "success": true,   "data": {     "id": "d733ea2a-a3f6-4979-901a-142b2349cf5b",     "email": "adm... | ✗ FAIL | 0.007s |
| 4 | Unauthorized | GET | /users | 401 Unauthorized... | 401 | {   "success": false,   "error": {     "code": "MISSING_TOKEN",     "message": "Authentication token... | ✓ PASS | 0.004s |

### Roles

**Results:** 6/7 passed (85.7%)

| # | Test Case | Method | Endpoint | Expected | Actual Status | Actual Response | Pass/Fail | Duration |
|---|-----------|--------|----------|----------|---------------|-----------------|-----------|----------|
| 1 | Valid list | GET | /roles | 200, roles... | 200 | {   "success": true,   "data": [     {       "id": "edf4e1bc-acee-48e0-916d-ab5f00c92530",       "na... | ✓ PASS | 0.009s |
| 2 | Filtered by scope | GET | /roles | 200 filtered... | 200 | {   "success": true,   "data": [     {       "id": "edf4e1bc-acee-48e0-916d-ab5f00c92530",       "na... | ✓ PASS | 0.007s |
| 3 | Valid role | GET | /roles/{id} | 200 object... | 400 | {   "success": false,   "error": "Validation failed",   "details": [     {       "path": "id",      ... | ✗ FAIL | 0.010s |
| 4 | Non-existent | GET | /roles/{id} | 404 Not Found... | 404 | {   "success": false,   "error": {     "code": "NOT_FOUND",     "message": "Failed to fetch role: Ro... | ✓ PASS | 0.009s |
| 5 | Duplicate code | POST | /roles | 400/409 - Role code already exists... | 400 | {   "success": false,   "error": "Validation failed",   "details": [     {       "path": "code",    ... | ✓ PASS | 0.008s |
| 6 | Duplicate name | POST | /roles | 400/409 - Role name already exists... | 400 | {   "success": false,   "error": "Validation failed",   "details": [     {       "path": "code",    ... | ✓ PASS | 0.008s |
| 7 | Unauthorized | GET | /roles | 401 Unauthorized... | 401 | {   "success": false,   "error": {     "code": "MISSING_TOKEN",     "message": "Authentication token... | ✓ PASS | 0.003s |

### Modules

**Results:** 0/2 passed (0.0%)

| # | Test Case | Method | Endpoint | Expected | Actual Status | Actual Response | Pass/Fail | Duration |
|---|-----------|--------|----------|----------|---------------|-----------------|-----------|----------|
| 1 | Valid list | GET | /modules | 200, modules... | 403 | {   "success": false,   "error": {     "code": "FORBIDDEN",     "message": "You don't have permissio... | ✗ FAIL | 0.005s |
| 2 | Non-existent | GET | /modules/{id} | 404 Not Found... | 403 | {   "success": false,   "error": {     "code": "FORBIDDEN",     "message": "You don't have permissio... | ✗ FAIL | 0.010s |

### Audit Logs

**Results:** 2/2 passed (100.0%)

| # | Test Case | Method | Endpoint | Expected | Actual Status | Actual Response | Pass/Fail | Duration |
|---|-----------|--------|----------|----------|---------------|-----------------|-----------|----------|
| 1 | Valid list | GET | /audit-logs | 200, logs... | 200 | {   "success": true,   "data": [     {       "id": "9bf3743c-aa45-4ff0-b30e-75207a9ab4d2",       "te... | ✓ PASS | 0.029s |
| 2 | Non-existent | GET | /audit-logs/{id} | 404 Not Found... | 404 | {   "success": false,   "error": {     "code": "NOT_FOUND",     "message": "Failed to fetch auditlog... | ✓ PASS | 0.007s |

## Detailed Test Results

### Test: Valid credentials: Successful login

- **Category:** Authentication
- **Endpoint:** POST /auth/login
- **Input Parameters:** Body: {"email": "valid@example.com", "password": "correctpass"}
- **Expected Response:** 200 OK, tokens returned
- **Actual Status Code:** 401
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if tokens returned
- **Duration:** 0.005s
- **Error:** Expected one of [200], got 401

---

### Test: Invalid email: Non-existent email

- **Category:** Authentication
- **Endpoint:** POST /auth/login
- **Input Parameters:** Body: {"email": "nonexistent@example.com", "password": "any"}
- **Expected Response:** 401 Unauthorized
- **Actual Status Code:** 401
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if rejects
- **Duration:** 0.006s

---

### Test: Invalid password: Correct email, wrong password

- **Category:** Authentication
- **Endpoint:** POST /auth/login
- **Input Parameters:** Body: {"email": "valid@example.com", "password": "wrongpass"}
- **Expected Response:** 401 Unauthorized
- **Actual Status Code:** 401
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password"
  }
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if rejects
- **Duration:** 0.007s

---

### Test: Empty email: Missing or empty email field

- **Category:** Authentication
- **Endpoint:** POST /auth/login
- **Input Parameters:** Body: {"email": "", "password": "pass"}
- **Expected Response:** 400 Bad Request, validation error
- **Actual Status Code:** 400
- **Actual Response:** 
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": "email",
      "message": "email is required",
      "code": "too_small"
    },
    {
      "path": "email",
      "message": "email must be at least 5 characters",
      "code": "too_small"
    },
    {
      "path": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if validates
- **Duration:** 0.005s

---

### Test: Invalid email format: Malformed email

- **Category:** Authentication
- **Endpoint:** POST /auth/login
- **Input Parameters:** Body: {"email": "invalidemail", "password": "pass"}
- **Expected Response:** 400 Bad Request, validation error
- **Actual Status Code:** 400
- **Actual Response:** 
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": "email",
      "message": "Invalid email format",
      "code": "invalid_string"
    }
  ]
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if validates
- **Duration:** 0.006s

---

### Test: Empty password: Missing or empty password

- **Category:** Authentication
- **Endpoint:** POST /auth/login
- **Input Parameters:** Body: {"email": "valid@example.com", "password": ""}
- **Expected Response:** 400 Bad Request, validation error
- **Actual Status Code:** 400
- **Actual Response:** 
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": "password",
      "message": "password is required",
      "code": "too_small"
    }
  ]
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if validates
- **Duration:** 0.006s

---

### Test: No body: Empty request body

- **Category:** Authentication
- **Endpoint:** POST /auth/login
- **Input Parameters:** Body: {}
- **Expected Response:** 400 Bad Request, missing required fields
- **Actual Status Code:** 400
- **Actual Response:** 
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": "email",
      "message": "Required",
      "code": "invalid_type"
    },
    {
      "path": "password",
      "message": "Required",
      "code": "invalid_type"
    }
  ]
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if validates
- **Duration:** 0.004s

---

### Test: Valid logout: With valid token

- **Category:** Authentication
- **Endpoint:** POST /auth/logout
- **Input Parameters:** Body: {}
- **Expected Response:** 200 OK, logged out
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if succeeds
- **Duration:** 0.013s

---

### Test: Invalid token: Expired or malformed token

- **Category:** Authentication
- **Endpoint:** POST /auth/logout
- **Input Parameters:** Headers: Authorization: Bearer invalid_token
- **Expected Response:** 401 Unauthorized
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if rejects
- **Duration:** 0.011s
- **Error:** Expected one of [401], got 200

---

### Test: No token: Missing Authorization header

- **Category:** Authentication
- **Endpoint:** POST /auth/logout
- **Input Parameters:** Body: {}
- **Expected Response:** 401 Unauthorized
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if requires auth
- **Duration:** 0.013s
- **Error:** Expected one of [401], got 200

---

### Test: Valid fetch: All tenants with default params

- **Category:** Tenants
- **Endpoint:** GET /tenants
- **Input Parameters:** Query: page=1, limit=20
- **Expected Response:** 200 OK, tenant list
- **Actual Status Code:** 403
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Super admin access required"
  }
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if returns list
- **Duration:** 0.010s
- **Error:** Expected one of [200], got 403

---

### Test: Filtered by status: Active only

- **Category:** Tenants
- **Endpoint:** GET /tenants
- **Input Parameters:** Query: status=active
- **Expected Response:** 200 OK, only active tenants
- **Actual Status Code:** 403
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "Super admin access required"
  }
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if filters
- **Duration:** 0.007s
- **Error:** Expected one of [200], got 403

---

### Test: Valid ID: Existing tenant

- **Category:** Tenants
- **Endpoint:** GET /tenants/{id}
- **Input Parameters:** Path: valid_id
- **Expected Response:** 200 OK, tenant object
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "data": {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Acme Pharma update",
    "slug": "acme-pharma-update",
    "status": "active",
    "settings": {
      "timezone": "America/New_York"
    },
    "subscription_tier": null,
    "max_users": null,
    "max_modules": null,
    "created_at": "2026-01-08T03:54:10.791Z",
    "updated_at": "2026-01-13T07:08:27.438Z"
  }
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if returns data
- **Duration:** 0.023s

---

### Test: Non-existent ID

- **Category:** Tenants
- **Endpoint:** GET /tenants/{id}
- **Input Parameters:** Path: invalid_id
- **Expected Response:** 404 Not Found
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "data": {
    "id": "00000000-0000-0000-0000-000000000001",
    "name": "Acme Pharma update",
    "slug": "acme-pharma-update",
    "status": "active",
    "settings": {
      "timezone": "America/New_York"
    },
    "subscription_tier": null,
    "max_users": null,
    "max_modules": null,
    "created_at": "2026-01-08T03:54:10.791Z",
    "updated_at": "2026-01-13T07:08:27.438Z"
  }
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if 404
- **Duration:** 0.006s
- **Error:** Expected one of [404], got 200

---

### Test: Unauthorized: No token or invalid

- **Category:** Tenants
- **Endpoint:** GET /tenants
- **Input Parameters:** No token
- **Expected Response:** 401 Unauthorized
- **Actual Status Code:** 401
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authentication token is required",
    "hint": "Include Authorization: Bearer <token> header"
  }
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if protects
- **Duration:** 0.004s

---

### Test: Valid list: Default params

- **Category:** Users
- **Endpoint:** GET /users
- **Input Parameters:** Query: defaults
- **Expected Response:** 200, users list
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "data": [
    {
      "id": "b11e6d37-00c9-4831-ba50-a6774a608b7e",
      "email": "frontend2biz09@gmail.com",
      "first_name": "front",
      "last_name": "Tech4biz",
      "status": "suspended",
      "auth_provider": "local",
      "saml_subject": null,
      "oauth_provider": null,
      "oauth_subject": null,
      "last_login_at": null,
      "login_count": null,
      "last_login_ip": null,
      "preferences": null,
      "signature_pin_hash": null,
      "signa... (truncated)
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if returns
- **Duration:** 0.038s

---

### Test: Valid user

- **Category:** Users
- **Endpoint:** GET /users/{id}
- **Input Parameters:** Path: valid_id
- **Expected Response:** 200, user object
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "data": {
    "id": "d733ea2a-a3f6-4979-901a-142b2349cf5b",
    "email": "admin@qassure.ai",
    "first_name": "Tenant",
    "last_name": "Admin",
    "status": "active",
    "auth_provider": "local",
    "saml_subject": null,
    "oauth_provider": null,
    "oauth_subject": null,
    "last_login_at": "2026-01-21T11:08:34.776Z",
    "login_count": 6,
    "last_login_ip": null,
    "preferences": null,
    "signature_pin_hash": null,
    "signature_pin_set_at": null,
    "p... (truncated)
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if correct
- **Duration:** 0.017s

---

### Test: Non-existent

- **Category:** Users
- **Endpoint:** GET /users/{id}
- **Input Parameters:** Path: invalid
- **Expected Response:** 404 Not Found
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "data": {
    "id": "d733ea2a-a3f6-4979-901a-142b2349cf5b",
    "email": "admin@qassure.ai",
    "first_name": "Tenant",
    "last_name": "Admin",
    "status": "active",
    "auth_provider": "local",
    "saml_subject": null,
    "oauth_provider": null,
    "oauth_subject": null,
    "last_login_at": "2026-01-21T11:08:34.776Z",
    "login_count": 6,
    "last_login_ip": null,
    "preferences": null,
    "signature_pin_hash": null,
    "signature_pin_set_at": null,
    "p... (truncated)
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if 404
- **Duration:** 0.007s
- **Error:** Expected one of [404], got 200

---

### Test: Unauthorized

- **Category:** Users
- **Endpoint:** GET /users
- **Input Parameters:** No token
- **Expected Response:** 401 Unauthorized
- **Actual Status Code:** 401
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authentication token is required",
    "hint": "Include Authorization: Bearer <token> header"
  }
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if protects
- **Duration:** 0.004s

---

### Test: Valid list

- **Category:** Roles
- **Endpoint:** GET /roles
- **Input Parameters:** Defaults
- **Expected Response:** 200, roles
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "data": [
    {
      "id": "edf4e1bc-acee-48e0-916d-ab5f00c92530",
      "name": "Viewer",
      "code": "viewer",
      "description": "Viewer1",
      "scope": "tenant",
      "is_system": false,
      "created_at": "2026-01-08T03:54:28.182Z",
      "updated_at": "2026-01-19T14:21:57.513Z"
    },
    {
      "id": "579334ca-9b75-4c7e-a46f-4109c6437a2e",
      "name": "Quality Manager",
      "code": "quality_manager",
      "description": null,
      "scope": "tenant",
... (truncated)
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if returns
- **Duration:** 0.009s

---

### Test: Filtered by scope

- **Category:** Roles
- **Endpoint:** GET /roles
- **Input Parameters:** Query: scope=tenant
- **Expected Response:** 200 filtered
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "data": [
    {
      "id": "edf4e1bc-acee-48e0-916d-ab5f00c92530",
      "name": "Viewer",
      "code": "viewer",
      "description": "Viewer1",
      "scope": "tenant",
      "is_system": false,
      "created_at": "2026-01-08T03:54:28.182Z",
      "updated_at": "2026-01-19T14:21:57.513Z"
    },
    {
      "id": "579334ca-9b75-4c7e-a46f-4109c6437a2e",
      "name": "Quality Manager",
      "code": "quality_manager",
      "description": null,
      "scope": "tenant",
... (truncated)
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if correct
- **Duration:** 0.007s

---

### Test: Valid role

- **Category:** Roles
- **Endpoint:** GET /roles/{id}
- **Input Parameters:** Path: valid_id
- **Expected Response:** 200 object
- **Actual Status Code:** 400
- **Actual Response:** 
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": "id",
      "message": "Invalid uuid",
      "code": "invalid_string"
    }
  ]
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if correct
- **Duration:** 0.010s
- **Error:** Expected one of [200], got 400

---

### Test: Non-existent

- **Category:** Roles
- **Endpoint:** GET /roles/{id}
- **Input Parameters:** Path: invalid
- **Expected Response:** 404 Not Found
- **Actual Status Code:** 404
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Failed to fetch role: Role not found"
  }
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if 404
- **Duration:** 0.009s

---

### Test: Duplicate code

- **Category:** Roles
- **Endpoint:** POST /roles
- **Input Parameters:** Body: {"name": "Test Role", "code": "existing_code", "scope": "tenant"}
- **Expected Response:** 400/409 - Role code already exists
- **Actual Status Code:** 400
- **Actual Response:** 
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": "code",
      "message": "Invalid enum value. Expected 'super_admin' | 'tenant_admin' | 'quality_manager' | 'developer' | 'viewer', received 'existing_code'",
      "code": "invalid_enum_value"
    },
    {
      "path": "description",
      "message": "Required",
      "code": "invalid_type"
    }
  ]
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if prevents
- **Duration:** 0.008s

---

### Test: Duplicate name

- **Category:** Roles
- **Endpoint:** POST /roles
- **Input Parameters:** Body: {"name": "existing_name", "code": "new_code", "scope": "tenant"}
- **Expected Response:** 400/409 - Role name already exists
- **Actual Status Code:** 400
- **Actual Response:** 
```json
{
  "success": false,
  "error": "Validation failed",
  "details": [
    {
      "path": "code",
      "message": "Invalid enum value. Expected 'super_admin' | 'tenant_admin' | 'quality_manager' | 'developer' | 'viewer', received 'new_code'",
      "code": "invalid_enum_value"
    },
    {
      "path": "description",
      "message": "Required",
      "code": "invalid_type"
    }
  ]
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if prevents
- **Duration:** 0.008s

---

### Test: Unauthorized

- **Category:** Roles
- **Endpoint:** GET /roles
- **Input Parameters:** No token
- **Expected Response:** 401 Unauthorized
- **Actual Status Code:** 401
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "MISSING_TOKEN",
    "message": "Authentication token is required",
    "hint": "Include Authorization: Bearer <token> header"
  }
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if protects
- **Duration:** 0.003s

---

### Test: Valid list

- **Category:** Modules
- **Endpoint:** GET /modules
- **Input Parameters:** Defaults
- **Expected Response:** 200, modules
- **Actual Status Code:** 403
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to read modules",
    "required": "modules:read"
  }
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if returns
- **Duration:** 0.005s
- **Error:** Expected one of [200], got 403

---

### Test: Non-existent

- **Category:** Modules
- **Endpoint:** GET /modules/{id}
- **Input Parameters:** Path: invalid
- **Expected Response:** 404 Not Found
- **Actual Status Code:** 403
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "You don't have permission to read modules",
    "required": "modules:read"
  }
}
```
- **Pass/Fail:** FAIL
- **Criteria:** Pass if 404
- **Duration:** 0.010s
- **Error:** Expected one of [404], got 403

---

### Test: Valid list

- **Category:** Audit Logs
- **Endpoint:** GET /audit-logs
- **Input Parameters:** Defaults
- **Expected Response:** 200, logs
- **Actual Status Code:** 200
- **Actual Response:** 
```json
{
  "success": true,
  "data": [
    {
      "id": "9bf3743c-aa45-4ff0-b30e-75207a9ab4d2",
      "tenant_id": "00000000-0000-0000-0000-000000000001",
      "user_id": "b248e5e1-3961-464f-bc06-51aa083f041a",
      "action": "module.status_change",
      "resource_type": "module",
      "resource_id": "261d9a1f-b48d-465a-90a4-89823272d9ab",
      "request_method": null,
      "request_path": null,
      "request_body": null,
      "response_status": null,
      "response_body": null,
      "ip_add... (truncated)
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if returns
- **Duration:** 0.029s

---

### Test: Non-existent

- **Category:** Audit Logs
- **Endpoint:** GET /audit-logs/{id}
- **Input Parameters:** Path: invalid
- **Expected Response:** 404 Not Found
- **Actual Status Code:** 404
- **Actual Response:** 
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Failed to fetch auditlog: Auditlog not found"
  }
}
```
- **Pass/Fail:** PASS
- **Criteria:** Pass if 404
- **Duration:** 0.007s

---

