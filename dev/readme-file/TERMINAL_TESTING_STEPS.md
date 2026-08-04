# Step-by-Step Terminal Commands to Test All Endpoints

Copy and paste these commands one by one into your terminal.

## Prerequisites

Make sure your server is running:
```bash
# In a separate terminal, start the server
cd /Users/yasha/Desktop/QAssure-Details/QAssure-Documents-Team/Latest-Code-Base/QAssure-Project
npm start
```

---

## Step 1: Set Base URL

```bash
export BASE_URL="http://localhost:3000/api/v1"
echo "Base URL set to: $BASE_URL"
```

---

## Step 2: Test Health Endpoints (No Auth Required)

### 2.1 Basic Health Check
```bash
curl -X GET ${BASE_URL}/health | python3 -m json.tool
```

### 2.2 Detailed Health Check
```bash
curl -X GET ${BASE_URL}/health/detailed | python3 -m json.tool
```

### 2.3 Prometheus Metrics
```bash
curl -X GET ${BASE_URL}/metrics | head -20
```

### 2.4 API Info
```bash
curl -X GET ${BASE_URL}/ | python3 -m json.tool
```

---

## Step 3: Login and Get Access Token

```bash
# Login
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "Test123456"
  }')

# Display response
echo "$LOGIN_RESPONSE" | python3 -m json.tool

# Extract and save tokens
export ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
export REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['refresh_token'])")
export USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['user']['id'])")
export TENANT_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['tenant_id'])")

# Verify tokens are set
echo "Access Token: ${ACCESS_TOKEN:0:50}..."
echo "User ID: $USER_ID"
echo "Tenant ID: $TENANT_ID"
```

---

## Step 4: Test Authentication Endpoints

### 4.1 Get Current User
```bash
curl -X GET ${BASE_URL}/auth/me \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 4.2 Validate Token
```bash
curl -X POST ${BASE_URL}/auth/validate \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 4.3 Get Active Sessions
```bash
curl -X GET ${BASE_URL}/auth/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 4.4 Refresh Token
```bash
curl -X POST ${BASE_URL}/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{
    \"refresh_token\": \"$REFRESH_TOKEN\"
  }" | python3 -m json.tool
```

---

## Step 5: Test User Management

### 5.1 List All Users
```bash
curl -X GET ${BASE_URL}/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 5.2 Get User by ID
```bash
curl -X GET ${BASE_URL}/users/$USER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 5.3 Create New User (Admin Only)
```bash
curl -X POST ${BASE_URL}/users \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@test.com",
    "password": "Test123456",
    "first_name": "New",
    "last_name": "User",
    "status": "active"
  }' | python3 -m json.tool
```

### 5.4 Update User
```bash
curl -X PUT ${BASE_URL}/users/$USER_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "first_name": "Updated",
    "last_name": "Name"
  }' | python3 -m json.tool
```

---

## Step 6: Test Tenant Management

### 6.1 Get Tenant by ID
```bash
curl -X GET ${BASE_URL}/tenants/$TENANT_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 6.2 List All Tenants (Super Admin Only)
```bash
curl -X GET ${BASE_URL}/tenants \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

---

## Step 7: Test Role Management

### 7.1 List All Roles
```bash
curl -X GET ${BASE_URL}/roles \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 7.2 Get Role by ID (Get ID from previous response)
```bash
# First, get a role ID from the list
ROLE_ID=$(curl -s -X GET ${BASE_URL}/roles \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data.get('data', [])) > 0 else '')")

echo "Using Role ID: $ROLE_ID"

# Get role by ID
curl -X GET ${BASE_URL}/roles/$ROLE_ID \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

---

## Step 8: Test Permission Management

### 8.1 List All Permissions
```bash
curl -X GET ${BASE_URL}/permissions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

---

## Step 9: Test API Key Management

### 9.1 List API Keys
```bash
curl -X GET ${BASE_URL}/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 9.2 Create API Key
```bash
curl -X POST ${BASE_URL}/api-keys \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test API Key",
    "description": "API key for testing",
    "expires_at": "2026-12-31T23:59:59Z"
  }' | python3 -m json.tool
```

---

## Step 10: Test Module Management

### 10.1 List All Modules
```bash
curl -X GET ${BASE_URL}/modules \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 10.2 Get Module Statistics
```bash
curl -X GET ${BASE_URL}/modules/stats \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 10.3 Get Module States
```bash
curl -X GET ${BASE_URL}/modules/states \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 10.4 Register New Module
```bash
curl -X POST ${BASE_URL}/modules \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "module_id": "test-module",
    "name": "Test Module",
    "version": "1.0.0",
    "base_url": "http://localhost:4000",
    "health_endpoint": "/health"
  }' | python3 -m json.tool
```

### 10.5 Get Module by ID (Get ID from previous response)
```bash
# Get module ID from list
MODULE_ID=$(curl -s -X GET ${BASE_URL}/modules \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data.get('data', [])) > 0 else '')")

if [ -n "$MODULE_ID" ]; then
  echo "Using Module ID: $MODULE_ID"
  curl -X GET ${BASE_URL}/modules/$MODULE_ID \
    -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
else
  echo "No modules found. Create one first using Step 10.4"
fi
```

---

## Step 11: Test Session Management

### 11.1 List All Sessions
```bash
curl -X GET ${BASE_URL}/sessions \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

---

## Step 12: Test Audit Logs

### 12.1 List Audit Logs
```bash
curl -X GET "${BASE_URL}/audit-logs?limit=10&offset=0" \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

---

## Step 13: Test QMS Integration

### 13.1 List QMS Connections
```bash
curl -X GET ${BASE_URL}/qms/connections \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 13.2 List Sync Jobs
```bash
curl -X GET ${BASE_URL}/qms/sync-jobs \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 13.3 List Sync Conflicts
```bash
curl -X GET ${BASE_URL}/qms/sync-conflicts \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 13.4 List Entity Mappings
```bash
curl -X GET ${BASE_URL}/qms/entity-mappings \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

---

## Step 14: Test Logout

### 14.1 Logout Current Session
```bash
curl -X POST ${BASE_URL}/auth/logout \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

### 14.2 Logout All Sessions
```bash
# Login again first to get a new token
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "Test123456"
  }')

export ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")

# Now logout all
curl -X POST ${BASE_URL}/auth/logout-all \
  -H "Authorization: Bearer $ACCESS_TOKEN" | python3 -m json.tool
```

---

## Step 15: Test Registration Flow (New User)

### 15.1 Register New User
```bash
curl -X POST ${BASE_URL}/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser2@example.com",
    "password": "Test123456",
    "first_name": "New",
    "last_name": "User"
  }' | python3 -m json.tool
```

### 15.2 Get Verification Token from Redis
```bash
# Get verification token
VERIFY_KEY=$(redis-cli KEYS "verify:*" | head -1)
VERIFY_TOKEN=$(echo $VERIFY_KEY | cut -d: -f2)
echo "Verification Token: $VERIFY_TOKEN"
```

### 15.3 Verify Email
```bash
curl -X POST ${BASE_URL}/auth/verify-email \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$VERIFY_TOKEN\"
  }" | python3 -m json.tool
```

---

## Step 16: Test Password Reset Flow

### 16.1 Request Password Reset
```bash
curl -X POST ${BASE_URL}/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com"
  }' | python3 -m json.tool
```

### 16.2 Get Reset Token from Redis
```bash
# Get reset token
RESET_KEY=$(redis-cli KEYS "reset:*" | head -1)
RESET_TOKEN=$(echo $RESET_KEY | cut -d: -f2)
echo "Reset Token: $RESET_TOKEN"
```

### 16.3 Reset Password
```bash
curl -X POST ${BASE_URL}/auth/reset-password \
  -H "Content-Type: application/json" \
  -d "{
    \"token\": \"$RESET_TOKEN\",
    \"password\": \"NewPassword123\"
  }" | python3 -m json.tool
```

---

## Step 17: Test Change Password (Authenticated)

### 17.1 Login First
```bash
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "testuser2@example.com",
    "password": "NewPassword123"
  }')

export ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
```

### 17.2 Change Password
```bash
curl -X POST ${BASE_URL}/auth/change-password \
  -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "current_password": "NewPassword123",
    "new_password": "Test123456"
  }' | python3 -m json.tool
```

---

## Quick Test All (One Command)

If you want to test everything at once, use the automated script:

```bash
cd /Users/yasha/Desktop/QAssure-Details/QAssure-Documents-Team/Latest-Code-Base/QAssure-Project
./test_all_endpoints.sh
```

---

## Troubleshooting

### If you get "401 Unauthorized":
```bash
# Re-login to get a new token
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser2@example.com","password":"Test123456"}')
export ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
```

### If you get "403 Forbidden":
- Your user doesn't have the required permissions
- Try with a different user that has admin privileges

### If server is not running:
```bash
cd /Users/yasha/Desktop/QAssure-Details/QAssure-Documents-Team/Latest-Code-Base/QAssure-Project
npm start
```

---

## Summary

You've tested:
- ✅ Health endpoints
- ✅ Authentication (login, logout, refresh)
- ✅ User management
- ✅ Tenant management
- ✅ Role management
- ✅ Permission management
- ✅ API key management
- ✅ Module management
- ✅ Session management
- ✅ Audit logs
- ✅ QMS integration
- ✅ Registration flow
- ✅ Password reset flow

All endpoints are now validated! 🎉

