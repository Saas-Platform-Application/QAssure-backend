# QAssure API - Complete Testing Guide

This guide provides curl commands and Postman steps to test all API endpoints.

## 📋 Table of Contents

1. [Setup & Authentication](#setup--authentication)
2. [Health & System Endpoints](#health--system-endpoints)
3. [Authentication Endpoints](#authentication-endpoints)
4. [User Management](#user-management)
5. [Tenant Management](#tenant-management)
6. [Role Management](#role-management)
7. [Permission Management](#permission-management)
8. [API Key Management](#api-key-management)
9. [Module Management](#module-management)
10. [Session Management](#session-management)
11. [Audit Logs](#audit-logs)
12. [QMS Integration](#qms-integration)
13. [AI Gateway](#ai-gateway)

---

## Setup & Authentication

### Step 1: Set Base URL

```bash
# Set this variable for all commands
export BASE_URL="http://localhost:3000/api/v1"
```

### Step 2: Login and Get Access Token

```bash
# Login as a user
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "Test123456"
  }')

# Extract access token
export ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

# Extract refresh token
export REFRESH_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['refresh_token'])")

# Extract user ID
export USER_ID=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['user']['id'])")

# Extract tenant ID
export TENANT_ID=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['tenant_id'])")

echo "Access Token: $ACCESS_TOKEN"
echo "User ID: $USER_ID"
echo "Tenant ID: $TENANT_ID"
```

**For Postman:**
1. Create a new request: `POST {{base_url}}/auth/login`
2. Body (raw JSON):
```json
{
  "email": "testuser2@example.com",
  "password": "Test123456"
}
```
3. In Tests tab, add:
```javascript
pm.environment.set("access_token", pm.response.json().data.access_token);
pm.environment.set("refresh_token", pm.response.json().data.refresh_token);
pm.environment.set("user_id", pm.response.json().data.user.id);
pm.environment.set("tenant_id", pm.response.json().data.tenant_id);
```

---

## Health & System Endpoints

### 1. Basic Health Check (No Auth)
```bash
curl -X GET ${BASE_URL}/health | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/health`

### 2. Detailed Health Check (No Auth)
```bash
curl -X GET ${BASE_URL}/health/detailed | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/health/detailed`

### 3. Prometheus Metrics (No Auth)
```bash
curl -X GET ${BASE_URL}/metrics
```

**Postman:** `GET {{base_url}}/metrics`

### 4. API Info (No Auth)
```bash
curl -X GET ${BASE_URL}/ | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/`

---

## Authentication Endpoints

### 1. Register New User (No Auth)
```bash
curl -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Test123456",
    "first_name": "John",
    "last_name": "Doe"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/register`

### 2. Verify Email (No Auth)
```bash
# Get verification token from Redis or server logs
VERIFY_TOKEN="your_verification_token_here"

curl -X POST ${BASE_URL}/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$VERIFY_TOKEN\"
  }" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/verify-email`

### 3. Resend Verification Email (No Auth)
```bash
curl -X POST ${BASE_URL}/auth/resend-verification \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/resend-verification`

### 4. Login (No Auth)
```bash
curl -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "Test123456"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/login`

### 5. Refresh Token (No Auth)
```bash
curl -X POST ${BASE_URL}/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refresh_token\": \"$REFRESH_TOKEN\"
  }" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/refresh`

### 6. Forgot Password (No Auth)
```bash
curl -X POST ${BASE_URL}/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/forgot-password`

### 7. Reset Password (No Auth)
```bash
# Get reset token from Redis or email
RESET_TOKEN="your_reset_token_here"

curl -X POST ${BASE_URL}/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$RESET_TOKEN\",
    \"password\": \"NewPassword123\"
  }" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/reset-password`

### 8. Get Current User (Auth Required)
```bash
curl -X GET ${BASE_URL}/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/auth/me`  
**Headers:** `Authorization: Bearer {{access_token}}`

### 9. Get Active Sessions (Auth Required)
```bash
curl -X GET ${BASE_URL}/auth/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/auth/sessions`

### 10. Revoke Session (Auth Required)
```bash
SESSION_ID="session_id_to_revoke"

curl -X DELETE ${BASE_URL}/auth/sessions/$SESSION_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `DELETE {{base_url}}/auth/sessions/:sessionId`

### 11. Validate Token (Auth Required)
```bash
curl -X POST ${BASE_URL}/auth/validate \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/validate`

### 12. Change Password (Auth Required)
```bash
curl -X POST ${BASE_URL}/auth/change-password \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "Test123456",
    "new_password": "NewPassword123"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/change-password`

### 13. Logout (Auth Required)
```bash
curl -X POST ${BASE_URL}/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/logout`

### 14. Logout All Sessions (Auth Required)
```bash
curl -X POST ${BASE_URL}/auth/logout-all \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/auth/logout-all`

---

## User Management

### 1. List All Users (Auth Required)
```bash
curl -X GET ${BASE_URL}/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/users`

### 2. Get User by ID (Auth Required)
```bash
curl -X GET ${BASE_URL}/users/$USER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/users/:id`

### 3. Create User (Auth Required - Admin)
```bash
curl -X POST ${BASE_URL}/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser2@example.com",
    "password": "Test123456",
    "first_name": "Jane",
    "last_name": "Smith",
    "status": "active"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/users`

### 4. Update User (Auth Required)
```bash
curl -X PUT ${BASE_URL}/users/$USER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Updated",
    "last_name": "Name"
  }' | python3 -m json.tool
```

**Postman:** `PUT {{base_url}}/users/:id`

### 5. Delete User (Auth Required - Admin)
```bash
curl -X DELETE ${BASE_URL}/users/$USER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `DELETE {{base_url}}/users/:id`

---

## Tenant Management

### 1. List All Tenants (Auth Required - Super Admin)
```bash
curl -X GET ${BASE_URL}/tenants \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/tenants`

### 2. Get Tenant by ID (Auth Required)
```bash
curl -X GET ${BASE_URL}/tenants/$TENANT_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/tenants/:id`

### 3. Create Tenant (Auth Required - Super Admin)
```bash
curl -X POST ${BASE_URL}/tenants \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "New Tenant",
    "slug": "new-tenant",
    "status": "active"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/tenants`

### 4. Update Tenant (Auth Required)
```bash
curl -X PUT ${BASE_URL}/tenants/$TENANT_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Tenant Name"
  }' | python3 -m json.tool
```

**Postman:** `PUT {{base_url}}/tenants/:id`

### 5. Delete Tenant (Auth Required - Super Admin)
```bash
curl -X DELETE ${BASE_URL}/tenants/$TENANT_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `DELETE {{base_url}}/tenants/:id`

---

## Role Management

### 1. List All Roles (Auth Required)
```bash
curl -X GET ${BASE_URL}/roles \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/roles`

### 2. Get Role by ID (Auth Required)
```bash
ROLE_ID="role_id_here"

curl -X GET ${BASE_URL}/roles/$ROLE_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/roles/:id`

### 3. Create Role (Auth Required - Admin)
```bash
curl -X POST ${BASE_URL}/roles \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "custom_role",
    "name": "Custom Role",
    "description": "A custom role"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/roles`

### 4. Update Role (Auth Required - Admin)
```bash
curl -X PUT ${BASE_URL}/roles/$ROLE_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Role Name"
  }' | python3 -m json.tool
```

**Postman:** `PUT {{base_url}}/roles/:id`

### 5. Delete Role (Auth Required - Admin)
```bash
curl -X DELETE ${BASE_URL}/roles/$ROLE_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `DELETE {{base_url}}/roles/:id`

---

## Permission Management

### 1. List All Permissions (Auth Required)
```bash
curl -X GET ${BASE_URL}/permissions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/permissions`

### 2. Get Permission by ID (Auth Required)
```bash
PERMISSION_ID="permission_id_here"

curl -X GET ${BASE_URL}/permissions/$PERMISSION_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/permissions/:id`

### 3. Create Permission (Auth Required - Admin)
```bash
curl -X POST ${BASE_URL}/permissions \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "role_id": "role_id_here",
    "resource": "custom_resource",
    "action": "read"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/permissions`

### 4. Update Permission (Auth Required - Admin)
```bash
curl -X PUT ${BASE_URL}/permissions/$PERMISSION_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "write"
  }' | python3 -m json.tool
```

**Postman:** `PUT {{base_url}}/permissions/:id`

### 5. Delete Permission (Auth Required - Admin)
```bash
curl -X DELETE ${BASE_URL}/permissions/$PERMISSION_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `DELETE {{base_url}}/permissions/:id`

---

## API Key Management

### 1. Create API Key (Auth Required)
```bash
curl -X POST ${BASE_URL}/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "My API Key",
    "description": "API key for integration",
    "expires_at": "2026-12-31T23:59:59Z"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/api-keys`

### 2. List API Keys (Auth Required)
```bash
curl -X GET ${BASE_URL}/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/api-keys`

### 3. Validate API Key (Auth Required)
```bash
curl -X POST ${BASE_URL}/api-keys/validate \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "api_key": "your_api_key_here"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/api-keys/validate`

### 4. Get API Key by ID (Auth Required)
```bash
API_KEY_ID="api_key_id_here"

curl -X GET ${BASE_URL}/api-keys/$API_KEY_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/api-keys/:id`

### 5. Update API Key (Auth Required)
```bash
curl -X PUT ${BASE_URL}/api-keys/$API_KEY_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated API Key Name"
  }' | python3 -m json.tool
```

**Postman:** `PUT {{base_url}}/api-keys/:id`

### 6. Revoke API Key (Auth Required)
```bash
curl -X POST ${BASE_URL}/api-keys/$API_KEY_ID/revoke \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/api-keys/:id/revoke`

### 7. Regenerate API Key (Auth Required)
```bash
curl -X POST ${BASE_URL}/api-keys/$API_KEY_ID/regenerate \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/api-keys/:id/regenerate`

### 8. Delete API Key (Auth Required)
```bash
curl -X DELETE ${BASE_URL}/api-keys/$API_KEY_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `DELETE {{base_url}}/api-keys/:id`

---

## Module Management

### 1. List All Modules (Auth Required)
```bash
curl -X GET ${BASE_URL}/modules \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/modules`

### 2. Get Module Statistics (Auth Required)
```bash
curl -X GET ${BASE_URL}/modules/stats \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/modules/stats`

### 3. Get Module States (Auth Required)
```bash
curl -X GET ${BASE_URL}/modules/states \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/modules/states`

### 4. Register New Module (Auth Required)
```bash
curl -X POST ${BASE_URL}/modules \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module_id": "my-module",
    "name": "My Module",
    "version": "1.0.0",
    "base_url": "http://localhost:4000",
    "health_endpoint": "/health"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/modules`

### 5. Get Module by ID (Auth Required)
```bash
MODULE_ID="module_id_here"

curl -X GET ${BASE_URL}/modules/$MODULE_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/modules/:id`

### 6. Update Module (Auth Required)
```bash
curl -X PUT ${BASE_URL}/modules/$MODULE_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Module Name"
  }' | python3 -m json.tool
```

**Postman:** `PUT {{base_url}}/modules/:id`

### 7. Update Module Status (Auth Required)
```bash
curl -X PATCH ${BASE_URL}/modules/$MODULE_ID/status \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "running",
    "reason": "Module started successfully"
  }' | python3 -m json.tool
```

**Postman:** `PATCH {{base_url}}/modules/:id/status`

### 8. Start Module (Auth Required)
```bash
curl -X POST ${BASE_URL}/modules/$MODULE_ID/start \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/modules/:id/start`

### 9. Stop Module (Auth Required)
```bash
curl -X POST ${BASE_URL}/modules/$MODULE_ID/stop \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/modules/:id/stop`

### 10. Restart Module (Auth Required)
```bash
curl -X POST ${BASE_URL}/modules/$MODULE_ID/restart \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/modules/:id/restart`

### 11. Set Module to Maintenance (Auth Required)
```bash
curl -X POST ${BASE_URL}/modules/$MODULE_ID/maintenance \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Scheduled maintenance"
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/modules/:id/maintenance`

### 12. Deprecate Module (Auth Required)
```bash
curl -X POST ${BASE_URL}/modules/$MODULE_ID/deprecate \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/modules/:id/deprecate`

### 13. Update Module Version (Auth Required)
```bash
curl -X PATCH ${BASE_URL}/modules/$MODULE_ID/version \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "version": "2.0.0"
  }' | python3 -m json.tool
```

**Postman:** `PATCH {{base_url}}/modules/:id/version`

### 14. Health Check Module (Auth Required)
```bash
curl -X POST ${BASE_URL}/modules/$MODULE_ID/health-check \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/modules/:id/health-check`

### 15. Get Module Health History (Auth Required)
```bash
curl -X GET ${BASE_URL}/modules/$MODULE_ID/health-history \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/modules/:id/health-history`

### 16. Delete Module (Auth Required)
```bash
curl -X DELETE ${BASE_URL}/modules/$MODULE_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `DELETE {{base_url}}/modules/:id`

---

## Session Management

### 1. List All Sessions (Auth Required)
```bash
curl -X GET ${BASE_URL}/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/sessions`

### 2. Get Session by ID (Auth Required)
```bash
SESSION_ID="session_id_here"

curl -X GET ${BASE_URL}/sessions/$SESSION_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/sessions/:id`

---

## Audit Logs

### 1. List Audit Logs (Auth Required)
```bash
curl -X GET "${BASE_URL}/audit-logs?limit=10&offset=0" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/audit-logs?limit=10&offset=0`

### 2. Get Audit Log by ID (Auth Required)
```bash
AUDIT_LOG_ID="audit_log_id_here"

curl -X GET ${BASE_URL}/audit-logs/$AUDIT_LOG_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/audit-logs/:id`

---

## QMS Integration

### 1. List QMS Connections (Auth Required)
```bash
curl -X GET ${BASE_URL}/qms/connections \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/qms/connections`

### 2. Create QMS Connection (Auth Required)
```bash
curl -X POST ${BASE_URL}/qms/connections \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Veeva Connection",
    "type": "veeva",
    "base_url": "https://api.veeva.com",
    "credentials": {
      "username": "user",
      "password": "pass"
    }
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/qms/connections`

### 3. List Sync Jobs (Auth Required)
```bash
curl -X GET ${BASE_URL}/qms/sync-jobs \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/qms/sync-jobs`

### 4. List Sync Conflicts (Auth Required)
```bash
curl -X GET ${BASE_URL}/qms/sync-conflicts \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/qms/sync-conflicts`

### 5. List Entity Mappings (Auth Required)
```bash
curl -X GET ${BASE_URL}/qms/entity-mappings \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/qms/entity-mappings`

---

## AI Gateway

### 1. AI Completion (Auth Required)
```bash
curl -X POST ${BASE_URL}/ai/completion \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "What is quality management?",
    "model": "gpt-4",
    "max_tokens": 100
  }' | python3 -m json.tool
```

**Postman:** `POST {{base_url}}/ai/completion`

### 2. List AI Usage (Auth Required)
```bash
curl -X GET "${BASE_URL}/ai/usage?limit=10" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

**Postman:** `GET {{base_url}}/ai/usage?limit=10`

---

## 🧪 Complete Test Script

Save this as `test_all_endpoints.sh`:

```bash
#!/bin/bash

BASE_URL="http://localhost:3000/api/v1"

echo "=== Testing QAssure API Endpoints ==="
echo ""

# 1. Health Check
echo "1. Testing Health Check..."
curl -s -X GET ${BASE_URL}/health | python3 -m json.tool
echo ""

# 2. Login
echo "2. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser2@example.com","password":"Test123456"}')

ACCESS_TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo ""

# 3. Get Current User
echo "3. Testing Get Current User..."
curl -s -X GET ${BASE_URL}/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
echo ""

# 4. List Users
echo "4. Testing List Users..."
curl -s -X GET ${BASE_URL}/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
echo ""

# 5. List Modules
echo "5. Testing List Modules..."
curl -s -X GET ${BASE_URL}/modules \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
echo ""

echo "=== Test Complete ==="
```

Make it executable:
```bash
chmod +x test_all_endpoints.sh
./test_all_endpoints.sh
```

---

## 📝 Postman Collection Setup

1. **Import Collection:** Import `QAssure_API_Collection.postman_collection.json`

2. **Set Environment Variables:**
   - `base_url`: `http://localhost:3000/api/v1`
   - `access_token`: (will be set automatically after login)
   - `refresh_token`: (will be set automatically after login)
   - `user_id`: (will be set automatically after login)
   - `tenant_id`: (will be set automatically after login)

3. **Run Collection:** Use Postman's Collection Runner to test all endpoints

---

## ✅ Expected Response Codes

- **200 OK**: Successful GET, PUT, PATCH requests
- **201 Created**: Successful POST requests (create)
- **204 No Content**: Successful DELETE requests
- **400 Bad Request**: Validation errors, invalid input
- **401 Unauthorized**: Missing or invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Resource already exists (e.g., duplicate email)
- **500 Internal Server Error**: Server error

---

## 🔍 Troubleshooting

### Issue: "401 Unauthorized"
- Check if token is expired
- Verify token format: `Bearer <token>`
- Re-login to get a new token

### Issue: "403 Forbidden"
- User doesn't have required permissions
- Check user roles and permissions

### Issue: "404 Not Found"
- Verify endpoint URL is correct
- Check if resource ID exists

### Issue: "500 Internal Server Error"
- Check server logs
- Verify database and Redis are running
- Check `.env` configuration

---

**Last Updated:** December 30, 2025

