#!/bin/bash

# QAssure API - Complete Endpoint Testing Script
# This script tests all API endpoints systematically

set -e  # Exit on error

BASE_URL="http://localhost:3000/api/v1"
TEST_EMAIL="testuser2@example.com"
TEST_PASSWORD="Test123456"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
SKIPPED=0

# Helper function to print test results
print_test() {
    local test_name=$1
    local status=$2
    local message=$3
    
    if [ "$status" == "PASS" ]; then
        echo -e "${GREEN}✓${NC} $test_name"
        ((PASSED++))
    elif [ "$status" == "FAIL" ]; then
        echo -e "${RED}✗${NC} $test_name: $message"
        ((FAILED++))
    elif [ "$status" == "SKIP" ]; then
        echo -e "${YELLOW}⊘${NC} $test_name: $message"
        ((SKIPPED++))
    fi
}

# Helper function to make API calls
api_call() {
    local method=$1
    local endpoint=$2
    local auth_header=$3
    local data=$4
    
    if [ -z "$data" ]; then
        if [ -z "$auth_header" ]; then
            curl -s -X $method "${BASE_URL}${endpoint}" -w "\n%{http_code}"
        else
            curl -s -X $method "${BASE_URL}${endpoint}" \
                -H "Authorization: Bearer $auth_header" \
                -w "\n%{http_code}"
        fi
    else
        if [ -z "$auth_header" ]; then
            curl -s -X $method "${BASE_URL}${endpoint}" \
                -H "Content-Type: application/json" \
                -d "$data" \
                -w "\n%{http_code}"
        else
            curl -s -X $method "${BASE_URL}${endpoint}" \
                -H "Authorization: Bearer $auth_header" \
                -H "Content-Type: application/json" \
                -d "$data" \
                -w "\n%{http_code}"
        fi
    fi
}

echo "=========================================="
echo "QAssure API - Complete Endpoint Testing"
echo "=========================================="
echo ""

# ============================================
# 1. HEALTH & SYSTEM ENDPOINTS
# ============================================
echo "=== 1. Health & System Endpoints ==="

# Health Check
RESPONSE=$(api_call "GET" "/health")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')
if [ "$HTTP_CODE" == "200" ]; then
    print_test "Health Check" "PASS"
else
    print_test "Health Check" "FAIL" "HTTP $HTTP_CODE"
fi

# Detailed Health Check
RESPONSE=$(api_call "GET" "/health/detailed")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "Detailed Health Check" "PASS"
else
    print_test "Detailed Health Check" "FAIL" "HTTP $HTTP_CODE"
fi

# Metrics
RESPONSE=$(api_call "GET" "/metrics")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "Prometheus Metrics" "PASS"
else
    print_test "Prometheus Metrics" "FAIL" "HTTP $HTTP_CODE"
fi

# API Info
RESPONSE=$(api_call "GET" "/")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "API Info" "PASS"
else
    print_test "API Info" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""

# ============================================
# 2. AUTHENTICATION ENDPOINTS
# ============================================
echo "=== 2. Authentication Endpoints ==="

# Login
LOGIN_DATA="{\"email\":\"$TEST_EMAIL\",\"password\":\"$TEST_PASSWORD\"}"
RESPONSE=$(api_call "POST" "/auth/login" "" "$LOGIN_DATA")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" == "200" ]; then
    ACCESS_TOKEN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null || echo "")
    REFRESH_TOKEN=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['refresh_token'])" 2>/dev/null || echo "")
    USER_ID=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['user']['id'])" 2>/dev/null || echo "")
    TENANT_ID=$(echo "$BODY" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['tenant_id'])" 2>/dev/null || echo "")
    
    if [ -n "$ACCESS_TOKEN" ]; then
        print_test "Login" "PASS"
        echo "  Token: ${ACCESS_TOKEN:0:50}..."
    else
        print_test "Login" "FAIL" "Could not extract token"
        ACCESS_TOKEN=""
    fi
else
    print_test "Login" "FAIL" "HTTP $HTTP_CODE"
    ACCESS_TOKEN=""
fi

if [ -z "$ACCESS_TOKEN" ]; then
    echo ""
    echo -e "${RED}ERROR: Cannot proceed without access token. Please check login credentials.${NC}"
    exit 1
fi

# Get Current User
RESPONSE=$(api_call "GET" "/auth/me" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "Get Current User" "PASS"
else
    print_test "Get Current User" "FAIL" "HTTP $HTTP_CODE"
fi

# Validate Token
RESPONSE=$(api_call "POST" "/auth/validate" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "Validate Token" "PASS"
else
    print_test "Validate Token" "FAIL" "HTTP $HTTP_CODE"
fi

# Get Sessions
RESPONSE=$(api_call "GET" "/auth/sessions" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "Get Sessions" "PASS"
else
    print_test "Get Sessions" "FAIL" "HTTP $HTTP_CODE"
fi

# Refresh Token
if [ -n "$REFRESH_TOKEN" ]; then
    REFRESH_DATA="{\"refresh_token\":\"$REFRESH_TOKEN\"}"
    RESPONSE=$(api_call "POST" "/auth/refresh" "" "$REFRESH_DATA")
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    if [ "$HTTP_CODE" == "200" ]; then
        print_test "Refresh Token" "PASS"
    else
        print_test "Refresh Token" "FAIL" "HTTP $HTTP_CODE"
    fi
else
    print_test "Refresh Token" "SKIP" "No refresh token available"
fi

echo ""

# ============================================
# 3. USER MANAGEMENT
# ============================================
echo "=== 3. User Management ==="

# List Users
RESPONSE=$(api_call "GET" "/users" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "List Users" "PASS"
else
    print_test "List Users" "FAIL" "HTTP $HTTP_CODE"
fi

# Get User by ID
if [ -n "$USER_ID" ]; then
    RESPONSE=$(api_call "GET" "/users/$USER_ID" "$ACCESS_TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    if [ "$HTTP_CODE" == "200" ]; then
        print_test "Get User by ID" "PASS"
    else
        print_test "Get User by ID" "FAIL" "HTTP $HTTP_CODE"
    fi
else
    print_test "Get User by ID" "SKIP" "No user ID available"
fi

echo ""

# ============================================
# 4. TENANT MANAGEMENT
# ============================================
echo "=== 4. Tenant Management ==="

# Get Tenant by ID
if [ -n "$TENANT_ID" ]; then
    RESPONSE=$(api_call "GET" "/tenants/$TENANT_ID" "$ACCESS_TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    if [ "$HTTP_CODE" == "200" ]; then
        print_test "Get Tenant by ID" "PASS"
    else
        print_test "Get Tenant by ID" "FAIL" "HTTP $HTTP_CODE"
    fi
else
    print_test "Get Tenant by ID" "SKIP" "No tenant ID available"
fi

echo ""

# ============================================
# 5. ROLE MANAGEMENT
# ============================================
echo "=== 5. Role Management ==="

# List Roles
RESPONSE=$(api_call "GET" "/roles" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "List Roles" "PASS"
    # Extract first role ID for testing
    ROLE_ID=$(echo "$RESPONSE" | sed '$d' | python3 -c "import sys, json; data=json.load(sys.stdin); print(data['data'][0]['id'] if data.get('data') and len(data.get('data', [])) > 0 else '')" 2>/dev/null || echo "")
else
    print_test "List Roles" "FAIL" "HTTP $HTTP_CODE"
fi

# Get Role by ID
if [ -n "$ROLE_ID" ]; then
    RESPONSE=$(api_call "GET" "/roles/$ROLE_ID" "$ACCESS_TOKEN")
    HTTP_CODE=$(echo "$RESPONSE" | tail -1)
    if [ "$HTTP_CODE" == "200" ]; then
        print_test "Get Role by ID" "PASS"
    else
        print_test "Get Role by ID" "FAIL" "HTTP $HTTP_CODE"
    fi
else
    print_test "Get Role by ID" "SKIP" "No role ID available"
fi

echo ""

# ============================================
# 6. PERMISSION MANAGEMENT
# ============================================
echo "=== 6. Permission Management ==="

# List Permissions
RESPONSE=$(api_call "GET" "/permissions" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "List Permissions" "PASS"
else
    print_test "List Permissions" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""

# ============================================
# 7. API KEY MANAGEMENT
# ============================================
echo "=== 7. API Key Management ==="

# List API Keys
RESPONSE=$(api_call "GET" "/api-keys" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "List API Keys" "PASS"
else
    print_test "List API Keys" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""

# ============================================
# 8. MODULE MANAGEMENT
# ============================================
echo "=== 8. Module Management ==="

# List Modules
RESPONSE=$(api_call "GET" "/modules" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "List Modules" "PASS"
else
    print_test "List Modules" "FAIL" "HTTP $HTTP_CODE"
fi

# Get Module Stats
RESPONSE=$(api_call "GET" "/modules/stats" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "Get Module Stats" "PASS"
else
    print_test "Get Module Stats" "FAIL" "HTTP $HTTP_CODE"
fi

# Get Module States
RESPONSE=$(api_call "GET" "/modules/states" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "Get Module States" "PASS"
else
    print_test "Get Module States" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""

# ============================================
# 9. SESSION MANAGEMENT
# ============================================
echo "=== 9. Session Management ==="

# List Sessions
RESPONSE=$(api_call "GET" "/sessions" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "List Sessions" "PASS"
else
    print_test "List Sessions" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""

# ============================================
# 10. AUDIT LOGS
# ============================================
echo "=== 10. Audit Logs ==="

# List Audit Logs
RESPONSE=$(api_call "GET" "/audit-logs?limit=10" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ]; then
    print_test "List Audit Logs" "PASS"
else
    print_test "List Audit Logs" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""

# ============================================
# 11. QMS INTEGRATION
# ============================================
echo "=== 11. QMS Integration ==="

# List QMS Connections
RESPONSE=$(api_call "GET" "/qms/connections" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
    print_test "List QMS Connections" "PASS"
else
    print_test "List QMS Connections" "FAIL" "HTTP $HTTP_CODE"
fi

# List Sync Jobs
RESPONSE=$(api_call "GET" "/qms/sync-jobs" "$ACCESS_TOKEN")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "404" ]; then
    print_test "List Sync Jobs" "PASS"
else
    print_test "List Sync Jobs" "FAIL" "HTTP $HTTP_CODE"
fi

echo ""

# ============================================
# SUMMARY
# ============================================
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo -e "${GREEN}Passed:${NC} $PASSED"
echo -e "${RED}Failed:${NC} $FAILED"
echo -e "${YELLOW}Skipped:${NC} $SKIPPED"
echo "Total: $((PASSED + FAILED + SKIPPED))"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi

