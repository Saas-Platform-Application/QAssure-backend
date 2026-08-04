#!/bin/bash

#####################################################################
#  QAssure.ai - Comprehensive API Test Script (v2)
#  Version: 2.0
#  Date: January 2026
#  Purpose: Test all 22 phases with edge cases and general cases
#  Changes: Added delays, fixed syntax errors, rate limit handling
#####################################################################

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000/api/v1}"
REPORT_FILE="qassure_test_results_$(date +%Y%m%d_%H%M%S).txt"
DELAY_BETWEEN_TESTS="${DELAY:-0.5}"  # Delay in seconds between tests

# Colors for terminal output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Store tokens
ACCESS_TOKEN=""
REFRESH_TOKEN=""

#####################################################################
# UTILITY FUNCTIONS
#####################################################################

log_header() {
    echo "" | tee -a "$REPORT_FILE"
    echo "======================================================================" | tee -a "$REPORT_FILE"
    echo "  $1" | tee -a "$REPORT_FILE"
    echo "======================================================================" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
}

log_subheader() {
    echo "" | tee -a "$REPORT_FILE"
    echo "----------------------------------------------------------------------" | tee -a "$REPORT_FILE"
    echo "  $1" | tee -a "$REPORT_FILE"
    echo "----------------------------------------------------------------------" | tee -a "$REPORT_FILE"
}

log_test() {
    echo "" | tee -a "$REPORT_FILE"
    echo -e "${BLUE}TEST: $1${NC}" | tee -a "$REPORT_FILE"
    echo "Description: $2" | tee -a "$REPORT_FILE"
}

log_result() {
    local status=$1
    local expected=$2
    local actual=$3
    local response=$4
    
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    
    if [ "$status" == "PASS" ]; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        echo -e "${GREEN}✅ PASS${NC}" | tee -a "$REPORT_FILE"
    else
        FAILED_TESTS=$((FAILED_TESTS + 1))
        echo -e "${RED}❌ FAIL${NC}" | tee -a "$REPORT_FILE"
    fi
    
    echo "Expected: $expected" | tee -a "$REPORT_FILE"
    echo "Actual HTTP Status: $actual" | tee -a "$REPORT_FILE"
    echo "Response:" | tee -a "$REPORT_FILE"
    echo "$response" | head -50 | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    
    sleep "$DELAY_BETWEEN_TESTS"
}

execute_test() {
    local method=$1
    local endpoint=$2
    local data=$3
    local expected_status=$4
    local auth_header=$5
    
    local full_url="${BASE_URL}${endpoint}"
    echo "Command: curl -X $method \"$full_url\"" | tee -a "$REPORT_FILE"
    
    local response
    if [ -n "$data" ]; then
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w '\n%{http_code}' -X "$method" \
                -H "Authorization: Bearer $auth_header" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$full_url" 2>&1)
        else
            response=$(curl -s -w '\n%{http_code}' -X "$method" \
                -H "Content-Type: application/json" \
                -d "$data" \
                "$full_url" 2>&1)
        fi
    else
        if [ -n "$auth_header" ]; then
            response=$(curl -s -w '\n%{http_code}' -X "$method" \
                -H "Authorization: Bearer $auth_header" \
                -H "Content-Type: application/json" \
                "$full_url" 2>&1)
        else
            response=$(curl -s -w '\n%{http_code}' -X "$method" \
                -H "Content-Type: application/json" \
                "$full_url" 2>&1)
        fi
    fi
    
    local http_code=$(echo "$response" | tail -1)
    local body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" == "$expected_status" ]; then
        log_result "PASS" "$expected_status" "$http_code" "$body"
    else
        log_result "FAIL" "$expected_status" "$http_code" "$body"
    fi
    
    echo "$body"
}

#####################################################################
# START REPORT
#####################################################################

echo "QAssure.ai API Test Report" > "$REPORT_FILE"
echo "Generated: $(date)" >> "$REPORT_FILE"
echo "Base URL: $BASE_URL" >> "$REPORT_FILE"
echo "Delay Between Tests: ${DELAY_BETWEEN_TESTS}s" >> "$REPORT_FILE"

log_header "QASSURE.AI COMPREHENSIVE API TEST REPORT"
echo "Test Started: $(date)" | tee -a "$REPORT_FILE"
echo "Base URL: $BASE_URL" | tee -a "$REPORT_FILE"
echo -e "${CYAN}NOTE: Using ${DELAY_BETWEEN_TESTS}s delay between tests. Use DELAY=1 to increase.${NC}" | tee -a "$REPORT_FILE"

#####################################################################
# PHASE 1: CORE INFRASTRUCTURE
#####################################################################

log_header "PHASE 1: CORE INFRASTRUCTURE"
log_subheader "1.1 Health Check Endpoints"

log_test "TC-1.1.1: Basic Health Check" "Verify server is running"
execute_test "GET" "/health" "" "200"

log_test "TC-1.1.2: Detailed Health Check" "Verify all components status"
execute_test "GET" "/health/detailed" "" "200"

log_test "TC-1.1.3: Invalid Endpoint" "Should return 404 for non-existent endpoint"
execute_test "GET" "/nonexistent-endpoint" "" "404"

#####################################################################
# PHASE 2: REDIS & SESSION
#####################################################################

log_header "PHASE 2: REDIS & SESSION MANAGEMENT"
log_subheader "2.1 Cache Operations"

log_test "TC-2.1.1: Cache Health via Detailed Health" "Verify Redis connection"
execute_test "GET" "/health/detailed" "" "200"

#####################################################################
# PHASE 3: AUTHENTICATION
#####################################################################

log_header "PHASE 3: AUTHENTICATION SYSTEM"
log_subheader "3.1 User Registration"

TIMESTAMP=$(date +%s)

log_test "TC-3.1.1: Register with Valid Data" "Should create new user"
execute_test "POST" "/auth/register" "{\"email\": \"testuser_${TIMESTAMP}@qassure.ai\", \"password\": \"SecurePass123!\", \"firstName\": \"Test\", \"lastName\": \"User\"}" "201"

log_test "TC-3.1.2: Register - Weak Password (No Uppercase)" "Should reject"
execute_test "POST" "/auth/register" '{"email": "test2@qassure.ai", "password": "weakpass123!", "firstName": "Test", "lastName": "User"}' "400"

log_test "TC-3.1.3: Register - Weak Password (No Numbers)" "Should reject"
execute_test "POST" "/auth/register" '{"email": "test3@qassure.ai", "password": "WeakPassword!", "firstName": "Test", "lastName": "User"}' "400"

log_test "TC-3.1.4: Register - Weak Password (No Special Chars)" "Should reject"
execute_test "POST" "/auth/register" '{"email": "test4@qassure.ai", "password": "WeakPass123", "firstName": "Test", "lastName": "User"}' "400"

log_test "TC-3.1.5: Register - Weak Password (Too Short)" "Should reject"
execute_test "POST" "/auth/register" '{"email": "test5@qassure.ai", "password": "Sh0rt!", "firstName": "Test", "lastName": "User"}' "400"

log_test "TC-3.1.6: Register - Invalid Email Format" "Should reject"
execute_test "POST" "/auth/register" '{"email": "invalid-email", "password": "SecurePass123!", "firstName": "Test", "lastName": "User"}' "400"

log_test "TC-3.1.7: Register - Missing Required Fields" "Should reject"
execute_test "POST" "/auth/register" '{"email": "test6@qassure.ai"}' "400"

log_test "TC-3.1.8: Register - Duplicate Email" "Should reject"
execute_test "POST" "/auth/register" '{"email": "superadmin@qassure.ai", "password": "SecurePass123!", "firstName": "Test", "lastName": "User"}' "409"

log_subheader "3.2 User Login"

log_test "TC-3.2.1: Login with Valid Credentials" "Should return tokens"
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" -H "Content-Type: application/json" -d '{"email": "superadmin@qassure.ai", "password": "Password123!"}')
echo "Login Response: $LOGIN_RESPONSE" | tee -a "$REPORT_FILE"
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
REFRESH_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"refresh_token":"[^"]*"' | cut -d'"' -f4)
if [ -n "$ACCESS_TOKEN" ]; then
    echo -e "${GREEN}✅ PASS - Token obtained${NC}" | tee -a "$REPORT_FILE"
    TOTAL_TESTS=$((TOTAL_TESTS + 1)); PASSED_TESTS=$((PASSED_TESTS + 1))
else
    echo -e "${RED}❌ FAIL - No token${NC}" | tee -a "$REPORT_FILE"
    TOTAL_TESTS=$((TOTAL_TESTS + 1)); FAILED_TESTS=$((FAILED_TESTS + 1))
fi
sleep "$DELAY_BETWEEN_TESTS"

log_test "TC-3.2.2: Login - Wrong Password" "Should reject"
execute_test "POST" "/auth/login" '{"email": "superadmin@qassure.ai", "password": "WrongPassword123!"}' "401"

log_test "TC-3.2.3: Login - Non-existent User" "Should reject"
execute_test "POST" "/auth/login" '{"email": "nonexistent@qassure.ai", "password": "SecurePass123!"}' "401"

log_test "TC-3.2.4: Login - Empty Password" "Should reject"
execute_test "POST" "/auth/login" '{"email": "superadmin@qassure.ai", "password": ""}' "400"

log_test "TC-3.2.5: Login - Missing Email" "Should reject"
execute_test "POST" "/auth/login" '{"password": "SecurePass123!"}' "400"

log_subheader "3.3 Token Operations"

log_test "TC-3.3.1: Protected Route - Valid Token" "Should allow"
execute_test "GET" "/auth/me" "" "200" "$ACCESS_TOKEN"

log_test "TC-3.3.2: Protected Route - No Token" "Should deny"
execute_test "GET" "/auth/me" "" "401"

log_test "TC-3.3.3: Protected Route - Invalid Token" "Should deny"
execute_test "GET" "/auth/me" "" "401" "invalid-token"

log_test "TC-3.3.4: Protected Route - Malformed JWT" "Should deny"
execute_test "GET" "/auth/me" "" "401" "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.invalid"

log_test "TC-3.3.5: Refresh Token - Valid" "Should return new tokens"
if [ -n "$REFRESH_TOKEN" ]; then
    execute_test "POST" "/auth/refresh" "{\"refreshToken\": \"$REFRESH_TOKEN\"}" "200"
fi

log_test "TC-3.3.6: Refresh Token - Invalid" "Should reject"
execute_test "POST" "/auth/refresh" '{"refresh_token": "invalid-refresh-token"}' "401"

log_subheader "3.4 Password Reset"

log_test "TC-3.4.1: Forgot Password - Valid Email" "Should accept"
execute_test "POST" "/auth/forgot-password" '{"email": "superadmin@qassure.ai"}' "200"

log_test "TC-3.4.2: Forgot Password - Non-existent Email" "Should still return 200"
execute_test "POST" "/auth/forgot-password" '{"email": "nonexistent@qassure.ai"}' "200"

log_test "TC-3.4.3: Reset Password - Invalid Token" "Should reject"
execute_test "POST" "/auth/reset-password" '{"token": "invalid-token", "password": "NewSecurePass123!"}' "400"

log_subheader "3.5 Logout"

log_test "TC-3.5.1: Logout" "Should succeed"
execute_test "POST" "/auth/logout" "" "200" "$ACCESS_TOKEN"

# Re-login
sleep 1
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" -H "Content-Type: application/json" -d '{"email": "superadmin@qassure.ai", "password": "Password123!"}')
ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"access_token":"[^"]*"' | cut -d'"' -f4)
echo "Re-logged in for subsequent tests" | tee -a "$REPORT_FILE"

#####################################################################
# PHASE 4: RBAC
#####################################################################

log_header "PHASE 4: RBAC & AUTHORIZATION"
log_subheader "4.1 Role Management"

log_test "TC-4.1.1: Get All Roles" "Should return roles"
execute_test "GET" "/roles" "" "200" "$ACCESS_TOKEN"

log_test "TC-4.1.2: Get Roles - No Auth" "Should deny"
execute_test "GET" "/roles" "" "401"

TIMESTAMP=$(date +%s)
log_test "TC-4.1.3: Create Role - Valid" "Should create"
execute_test "POST" "/roles" "{\"name\": \"TestRole${TIMESTAMP}\", \"description\": \"Test\", \"permissions\": [\"users:read\"]}" "201" "$ACCESS_TOKEN"

log_test "TC-4.1.4: Create Role - Duplicate Name" "Should reject"
execute_test "POST" "/roles" '{"name": "Admin", "description": "Dup"}' "409" "$ACCESS_TOKEN"

log_test "TC-4.1.5: Create Role - Missing Name" "Should reject"
execute_test "POST" "/roles" '{"description": "No name"}' "400" "$ACCESS_TOKEN"

log_subheader "4.2 Permissions"

log_test "TC-4.2.1: Get Permissions" "Should return permissions"
execute_test "GET" "/permissions" "" "200" "$ACCESS_TOKEN"

log_subheader "4.3 API Keys"

TIMESTAMP=$(date +%s)
log_test "TC-4.3.1: Create API Key" "Should create"
execute_test "POST" "/api-keys" "{\"name\": \"TestKey${TIMESTAMP}\", \"expiresInDays\": 30}" "201" "$ACCESS_TOKEN"

log_test "TC-4.3.2: Get API Keys" "Should return keys"
execute_test "GET" "/api-keys" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 5: MODULES
#####################################################################

log_header "PHASE 5: MODULE REGISTRY"
log_subheader "5.1 Module Operations"

log_test "TC-5.1.1: Get All Modules" "Should return modules"
MODULES_RESP=$(execute_test "GET" "/modules" "" "200" "$ACCESS_TOKEN")
MODULE_ID=$(echo "$MODULES_RESP" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

log_test "TC-5.1.2: Get Non-existent Module" "Should return 404"
execute_test "GET" "/modules/00000000-0000-0000-0000-000000000000" "" "404" "$ACCESS_TOKEN"

log_test "TC-5.1.3: Get Module - Invalid UUID" "Should return 400"
execute_test "GET" "/modules/invalid-uuid" "" "400" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-5.1.4: Create Module - Valid" "Should create"
execute_test "POST" "/modules" "{\"name\": \"TestModule${TIMESTAMP}\", \"moduleKey\": \"test_${TIMESTAMP}\", \"description\": \"Test\", \"version\": \"1.0.0\"}" "201" "$ACCESS_TOKEN"

log_test "TC-5.1.5: Create Module - Missing Fields" "Should reject"
execute_test "POST" "/modules" '{"description": "No name"}' "400" "$ACCESS_TOKEN"

log_test "TC-5.1.6: Get Module Status" "Should return status"
execute_test "GET" "/modules/status" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 6: KAFKA
#####################################################################

log_header "PHASE 6: KAFKA EVENT SYSTEM"
log_subheader "6.1 Events"

log_test "TC-6.1.1: Get Event Topics" "Should return topics"
execute_test "GET" "/events/topics" "" "200" "$ACCESS_TOKEN"

log_test "TC-6.1.2: Get Event History" "Should return history"
execute_test "GET" "/events/history" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 7: AI GATEWAY
#####################################################################

log_header "PHASE 7: AI GATEWAY"
log_subheader "7.1 AI Providers"

log_test "TC-7.1.1: Get AI Providers" "Should return providers"
execute_test "GET" "/ai/providers" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-7.1.2: Create AI Provider - Valid" "Should create"
execute_test "POST" "/ai/providers" "{\"providerName\": \"openai\", \"displayName\": \"Test${TIMESTAMP}\", \"apiKey\": \"sk-test\", \"defaultModel\": \"gpt-4\", \"rateLimitPerMinute\": 100}" "201" "$ACCESS_TOKEN"

log_test "TC-7.1.3: Create AI Provider - Invalid Name" "Should reject"
execute_test "POST" "/ai/providers" '{"providerName": "invalid_provider", "displayName": "Invalid", "apiKey": "test"}' "400" "$ACCESS_TOKEN"

log_test "TC-7.1.4: Create AI Provider - Missing API Key" "Should reject"
execute_test "POST" "/ai/providers" '{"providerName": "openai", "displayName": "NoKey"}' "400" "$ACCESS_TOKEN"

log_subheader "7.2 AI Usage"

log_test "TC-7.2.1: Get AI Usage Summary" "Should return usage"
execute_test "GET" "/ai/usage/summary" "" "200" "$ACCESS_TOKEN"

log_test "TC-7.2.2: Get AI Costs" "Should return costs"
execute_test "GET" "/ai/costs" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 8: RAG
#####################################################################

log_header "PHASE 8: RAG & VECTOR DATABASE"
log_subheader "8.1 Knowledge Base"

log_test "TC-8.1.1: Get KB Collections" "Should return collections"
execute_test "GET" "/ai/knowledge-base" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-8.1.2: Create KB Collection" "Should create"
execute_test "POST" "/ai/knowledge-base/collections" "{\"name\": \"TestColl${TIMESTAMP}\", \"description\": \"Test\"}" "201" "$ACCESS_TOKEN"

log_test "TC-8.1.3: Search KB - Empty Query" "Should reject"
execute_test "POST" "/ai/knowledge-base/search" '{"query": ""}' "400" "$ACCESS_TOKEN"

#####################################################################
# PHASE 9: PROMPTS
#####################################################################

log_header "PHASE 9: PROMPT MANAGEMENT"
log_subheader "9.1 Prompts"

log_test "TC-9.1.1: Get All Prompts" "Should return prompts"
execute_test "GET" "/ai/prompts" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-9.1.2: Create Prompt - Valid" "Should create"
execute_test "POST" "/ai/prompts" "{\"name\": \"TestPrompt${TIMESTAMP}\", \"category\": \"general\", \"systemPrompt\": \"You are helpful.\", \"userPromptTemplate\": \"Help: {{query}}\", \"modelId\": \"gpt-4\"}" "201" "$ACCESS_TOKEN"

log_test "TC-9.1.3: Create Prompt - Missing System Prompt" "Should reject"
execute_test "POST" "/ai/prompts" '{"name": "Incomplete", "category": "general"}' "400" "$ACCESS_TOKEN"

#####################################################################
# PHASE 10-11: QMS
#####################################################################

log_header "PHASE 10-11: QMS INTEGRATION"
log_subheader "10.1 QMS Connections"

log_test "TC-10.1.1: Get QMS Connections" "Should return connections"
execute_test "GET" "/qms/connections" "" "200" "$ACCESS_TOKEN"

log_test "TC-10.1.2: Create QMS - Invalid Type" "Should reject"
execute_test "POST" "/qms/connections" '{"name": "Invalid", "qmsType": "invalid_type", "apiUrl": "https://test.com"}' "400" "$ACCESS_TOKEN"

log_test "TC-10.1.3: Create QMS - Missing URL" "Should reject"
execute_test "POST" "/qms/connections" '{"name": "NoURL", "qmsType": "veeva_vault"}' "400" "$ACCESS_TOKEN"

log_test "TC-11.1.1: Get Entity Mappings" "Should return mappings"
execute_test "GET" "/qms/mappings" "" "200" "$ACCESS_TOKEN"

log_test "TC-11.1.2: Get Sync Jobs" "Should return jobs"
execute_test "GET" "/qms/sync-jobs" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 12: CROSS-MODULE
#####################################################################

log_header "PHASE 12: CROSS-MODULE COMMUNICATION"

log_test "TC-12.1.1: Get Module Dependencies" "Should return dependencies"
execute_test "GET" "/modules/dependencies" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 13: SECURITY & FDA
#####################################################################

log_header "PHASE 13: SECURITY & FDA PART 11"
log_subheader "13.1 E-Signatures"

log_test "TC-13.1.1: Create E-Signature - Valid" "Should create"
execute_test "POST" "/signatures" '{"entityType": "document", "entityId": "00000000-0000-0000-0000-000000000001", "signatureType": "approval", "meaning": "I approve", "password": "Password123!"}' "201" "$ACCESS_TOKEN"

log_test "TC-13.1.2: Create E-Signature - Wrong Password" "Should reject"
execute_test "POST" "/signatures" '{"entityType": "document", "entityId": "00000000-0000-0000-0000-000000000001", "signatureType": "approval", "meaning": "I approve", "password": "WrongPass!"}' "401" "$ACCESS_TOKEN"

log_test "TC-13.1.3: Create E-Signature - No Meaning" "Should reject"
execute_test "POST" "/signatures" '{"entityType": "document", "entityId": "00000000-0000-0000-0000-000000000001", "signatureType": "approval", "password": "Password123!"}' "400" "$ACCESS_TOKEN"

#####################################################################
# PHASE 14: AUDIT
#####################################################################

log_header "PHASE 14: AUDIT SYSTEM"
log_subheader "14.1 Audit Logs"

log_test "TC-14.1.1: Get Audit Logs" "Should return logs"
execute_test "GET" "/audit-logs" "" "200" "$ACCESS_TOKEN"

log_test "TC-14.1.2: Get Audit Logs - Pagination" "Should return paginated"
execute_test "GET" "/audit-logs?page=1&limit=10" "" "200" "$ACCESS_TOKEN"

log_test "TC-14.1.3: Get Audit Logs - Invalid Page" "Should reject"
execute_test "GET" "/audit-logs?page=-1&limit=10" "" "400" "$ACCESS_TOKEN"

log_test "TC-14.1.4: Get Audit Logs - Filter" "Should filter"
execute_test "GET" "/audit-logs?action=LOGIN" "" "200" "$ACCESS_TOKEN"

log_test "TC-14.1.5: Export Audit Logs" "Should export"
execute_test "GET" "/audit-logs/export?format=json" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 15: DOCUMENTS
#####################################################################

log_header "PHASE 15: DOCUMENT MANAGEMENT"
log_subheader "15.1 Documents"

log_test "TC-15.1.1: Get All Documents" "Should return docs"
execute_test "GET" "/documents" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-15.1.2: Create Document - Valid" "Should create"
execute_test "POST" "/documents" "{\"title\": \"TestDoc${TIMESTAMP}\", \"documentNumber\": \"DOC-${TIMESTAMP}\", \"content\": \"Test content\"}" "201" "$ACCESS_TOKEN"

log_test "TC-15.1.3: Create Document - Missing Title" "Should reject"
execute_test "POST" "/documents" '{"documentNumber": "DOC-NOTITLE", "content": "Test"}' "400" "$ACCESS_TOKEN"

log_test "TC-15.1.4: Search Documents" "Should search"
execute_test "GET" "/documents/search?q=test" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 16: TRAINING
#####################################################################

log_header "PHASE 16: TRAINING MANAGEMENT"
log_subheader "16.1 Training Courses"

log_test "TC-16.1.1: Get Training Courses" "Should return courses"
execute_test "GET" "/training/courses" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-16.1.2: Create Course - Valid" "Should create"
execute_test "POST" "/training/courses" "{\"title\": \"TestCourse${TIMESTAMP}\", \"description\": \"Test\", \"durationMinutes\": 60, \"passingScore\": 80}" "201" "$ACCESS_TOKEN"

log_test "TC-16.1.3: Create Course - Invalid Duration" "Should reject"
execute_test "POST" "/training/courses" '{"title": "Invalid", "durationMinutes": -30}' "400" "$ACCESS_TOKEN"

log_test "TC-16.1.4: Create Course - Invalid Score" "Should reject"
execute_test "POST" "/training/courses" '{"title": "Invalid", "passingScore": 150}' "400" "$ACCESS_TOKEN"

log_test "TC-16.2.1: Get Assignments" "Should return assignments"
execute_test "GET" "/training/assignments" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 17: CAPA
#####################################################################

log_header "PHASE 17: CAPA MANAGEMENT"
log_subheader "17.1 CAPAs"

log_test "TC-17.1.1: Get All CAPAs" "Should return CAPAs"
execute_test "GET" "/capas" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-17.1.2: Create CAPA - Valid" "Should create"
execute_test "POST" "/capas" "{\"title\": \"TestCAPA${TIMESTAMP}\", \"description\": \"Test\", \"type\": \"corrective\", \"priority\": \"high\", \"sourceType\": \"complaint\"}" "201" "$ACCESS_TOKEN"

log_test "TC-17.1.3: Create CAPA - Invalid Type" "Should reject"
execute_test "POST" "/capas" '{"title": "Invalid", "type": "invalid_type", "priority": "high"}' "400" "$ACCESS_TOKEN"

log_test "TC-17.1.4: Create CAPA - Invalid Priority" "Should reject"
execute_test "POST" "/capas" '{"title": "Invalid", "type": "corrective", "priority": "super_urgent"}' "400" "$ACCESS_TOKEN"

log_test "TC-17.1.5: Create CAPA - Missing Title" "Should reject"
execute_test "POST" "/capas" '{"type": "corrective", "priority": "high"}' "400" "$ACCESS_TOKEN"

log_test "TC-17.2.1: Get CAPA Statistics" "Should return stats"
execute_test "GET" "/capas/statistics" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 18: SUPPLIERS
#####################################################################

log_header "PHASE 18: SUPPLIER QUALITY"
log_subheader "18.1 Suppliers"

log_test "TC-18.1.1: Get All Suppliers" "Should return suppliers"
execute_test "GET" "/suppliers" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-18.1.2: Create Supplier - Valid" "Should create"
execute_test "POST" "/suppliers" "{\"name\": \"TestSupplier${TIMESTAMP}\", \"code\": \"SUP-${TIMESTAMP}\", \"category\": \"raw_materials\", \"contactEmail\": \"supplier@test.com\"}" "201" "$ACCESS_TOKEN"

log_test "TC-18.1.3: Create Supplier - Invalid Email" "Should reject"
execute_test "POST" "/suppliers" '{"name": "Invalid", "code": "SUP-INV", "contactEmail": "invalid-email"}' "400" "$ACCESS_TOKEN"

#####################################################################
# PHASE 19: REPORTING
#####################################################################

log_header "PHASE 19: REPORTING & ANALYTICS"
log_subheader "19.1 Dashboard"

log_test "TC-19.1.1: Get Dashboard" "Should return dashboard"
execute_test "GET" "/reporting/dashboard" "" "200" "$ACCESS_TOKEN"

log_test "TC-19.1.2: Get KPIs" "Should return KPIs"
execute_test "GET" "/reporting/kpis" "" "200" "$ACCESS_TOKEN"

log_subheader "19.2 Reports"

log_test "TC-19.2.1: Get Report Definitions" "Should return reports"
execute_test "GET" "/reporting/reports" "" "200" "$ACCESS_TOKEN"

log_test "TC-19.2.2: Generate Report - Valid" "Should generate"
execute_test "POST" "/reporting/reports/generate" '{"reportType": "usage", "format": "json", "startDate": "2025-01-01", "endDate": "2025-12-31"}' "200" "$ACCESS_TOKEN"

log_test "TC-19.2.3: Generate Report - Invalid Date Range" "Should reject"
execute_test "POST" "/reporting/reports/generate" '{"reportType": "usage", "startDate": "2025-12-31", "endDate": "2025-01-01"}' "400" "$ACCESS_TOKEN"

log_test "TC-19.2.4: Global Search" "Should search"
execute_test "GET" "/reporting/search?q=test" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 20: NOTIFICATIONS
#####################################################################

log_header "PHASE 20: NOTIFICATIONS"
log_subheader "20.1 Notifications"

log_test "TC-20.1.1: Get My Notifications" "Should return notifications"
execute_test "GET" "/notifications/me" "" "200" "$ACCESS_TOKEN"

log_test "TC-20.1.2: Get Unread Count" "Should return count"
execute_test "GET" "/notifications/me/unread-count" "" "200" "$ACCESS_TOKEN"

log_subheader "20.2 Preferences"

log_test "TC-20.2.1: Get Preferences" "Should return preferences"
execute_test "GET" "/notifications/preferences" "" "200" "$ACCESS_TOKEN"

log_test "TC-20.2.2: Update Preferences - Valid" "Should update"
execute_test "PUT" "/notifications/preferences" '{"emailEnabled": true, "inAppEnabled": true, "digestFrequency": "daily"}' "200" "$ACCESS_TOKEN"

log_test "TC-20.2.3: Update Preferences - Invalid Frequency" "Should reject"
execute_test "PUT" "/notifications/preferences" '{"digestFrequency": "invalid"}' "400" "$ACCESS_TOKEN"

log_subheader "20.3 Alert Rules"

log_test "TC-20.3.1: Get Alert Rules" "Should return rules"
execute_test "GET" "/notifications/alert-rules" "" "200" "$ACCESS_TOKEN"

#####################################################################
# PHASE 21: FILES
#####################################################################

log_header "PHASE 21: FILE ATTACHMENTS"
log_subheader "21.1 Files"

log_test "TC-21.1.1: Get Storage Quota" "Should return quota"
execute_test "GET" "/files/quota" "" "200" "$ACCESS_TOKEN"

log_test "TC-21.1.2: Create Share Link - Invalid Expiry" "Should reject"
execute_test "POST" "/files/00000000-0000-0000-0000-000000000001/share" '{"expiresInHours": -1}' "400" "$ACCESS_TOKEN"

#####################################################################
# PHASE 22: SYSTEM CONFIG
#####################################################################

log_header "PHASE 22: SYSTEM CONFIGURATION"
log_subheader "22.1 Settings"

log_test "TC-22.1.1: Get All Settings" "Should return settings"
execute_test "GET" "/config/settings" "" "200" "$ACCESS_TOKEN"

log_test "TC-22.1.2: Update Setting" "Should update"
execute_test "PUT" "/config/settings/general/platform_name" '{"value": "QAssure Test"}' "200" "$ACCESS_TOKEN"

log_subheader "22.2 Branding"

log_test "TC-22.2.1: Get Branding" "Should return branding"
execute_test "GET" "/config/branding" "" "200" "$ACCESS_TOKEN"

log_test "TC-22.2.2: Update Branding - Valid" "Should update"
execute_test "PUT" "/config/branding" '{"primaryColor": "#1976D2", "secondaryColor": "#424242"}' "200" "$ACCESS_TOKEN"

log_test "TC-22.2.3: Update Branding - Invalid Color" "Should reject"
execute_test "PUT" "/config/branding" '{"primaryColor": "not-a-color"}' "400" "$ACCESS_TOKEN"

log_subheader "22.3 Security"

log_test "TC-22.3.1: Get Security Policy" "Should return policy"
execute_test "GET" "/config/security" "" "200" "$ACCESS_TOKEN"

log_test "TC-22.3.2: Update Security - Valid" "Should update"
execute_test "PUT" "/config/security" '{"passwordMinLength": 10, "passwordRequireUppercase": true}' "200" "$ACCESS_TOKEN"

log_test "TC-22.3.3: Update Security - Invalid Length" "Should reject"
execute_test "PUT" "/config/security" '{"passwordMinLength": 4}' "400" "$ACCESS_TOKEN"

log_subheader "22.4 Feature Flags"

log_test "TC-22.4.1: Get Feature Flags" "Should return flags"
execute_test "GET" "/config/features" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-22.4.2: Create Feature Flag - Valid" "Should create"
execute_test "POST" "/config/features" "{\"flagKey\": \"test_${TIMESTAMP}\", \"flagName\": \"Test\", \"isEnabled\": false, \"rolloutPercentage\": 0}" "201" "$ACCESS_TOKEN"

log_test "TC-22.4.3: Create Flag - Invalid Rollout" "Should reject"
execute_test "POST" "/config/features" '{"flagKey": "invalid", "flagName": "Invalid", "rolloutPercentage": 150}' "400" "$ACCESS_TOKEN"

log_subheader "22.5 Webhooks"

log_test "TC-22.5.1: Get Webhooks" "Should return webhooks"
execute_test "GET" "/config/webhooks" "" "200" "$ACCESS_TOKEN"

TIMESTAMP=$(date +%s)
log_test "TC-22.5.2: Create Webhook - Valid" "Should create"
execute_test "POST" "/config/webhooks" "{\"name\": \"Test${TIMESTAMP}\", \"url\": \"https://webhook.test.com\", \"events\": [\"capa.created\"], \"isActive\": true}" "201" "$ACCESS_TOKEN"

log_test "TC-22.5.3: Create Webhook - Invalid URL" "Should reject"
execute_test "POST" "/config/webhooks" '{"name": "Invalid", "url": "not-a-url", "events": ["capa.created"]}' "400" "$ACCESS_TOKEN"

log_test "TC-22.5.4: Create Webhook - Empty Events" "Should reject"
execute_test "POST" "/config/webhooks" '{"name": "NoEvents", "url": "https://test.com", "events": []}' "400" "$ACCESS_TOKEN"

log_subheader "22.6 Email & SMTP"

log_test "TC-22.6.1: Get Email Templates" "Should return templates"
execute_test "GET" "/config/email-templates" "" "200" "$ACCESS_TOKEN"

log_test "TC-22.7.1: Get SMTP Config" "Should return config"
execute_test "GET" "/config/smtp" "" "200" "$ACCESS_TOKEN"

log_test "TC-22.7.2: Update SMTP - Invalid Port" "Should reject"
execute_test "PUT" "/config/smtp" '{"host": "smtp.test.com", "port": -1}' "400" "$ACCESS_TOKEN"

#####################################################################
# SECURITY TESTS
#####################################################################

log_header "SECURITY TESTS"
log_subheader "SQL Injection Prevention"

log_test "TC-SEC-1: SQL Injection in Search" "Should sanitize"
execute_test "GET" "/documents/search?q=SELECT%20*%20FROM%20users" "" "200" "$ACCESS_TOKEN"

log_test "TC-SEC-2: SQL Injection in Login" "Should reject"
execute_test "POST" "/auth/login" '{"email": "admin; DROP TABLE users;--", "password": "test"}' "400"

log_subheader "Pagination Edge Cases"

log_test "TC-PAGE-1: Large Page Number" "Should handle"
execute_test "GET" "/documents?page=99999&limit=10" "" "200" "$ACCESS_TOKEN"

log_test "TC-PAGE-2: Large Limit" "Should cap"
execute_test "GET" "/documents?page=1&limit=10000" "" "200" "$ACCESS_TOKEN"

log_test "TC-PAGE-3: Zero Limit" "Should reject"
execute_test "GET" "/documents?page=1&limit=0" "" "400" "$ACCESS_TOKEN"

log_subheader "UUID Validation"

log_test "TC-UUID-1: Malformed UUID" "Should reject"
execute_test "GET" "/documents/not-a-uuid" "" "400" "$ACCESS_TOKEN"

#####################################################################
# SUMMARY
#####################################################################

log_header "TEST EXECUTION SUMMARY"

echo "" | tee -a "$REPORT_FILE"
echo "======================================================================" | tee -a "$REPORT_FILE"
echo "                    FINAL TEST RESULTS                                " | tee -a "$REPORT_FILE"
echo "======================================================================" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "Test Completed: $(date)" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"
echo "Total Tests:  $TOTAL_TESTS" | tee -a "$REPORT_FILE"
echo -e "${GREEN}Passed:       $PASSED_TESTS${NC}" | tee -a "$REPORT_FILE"
echo -e "${RED}Failed:       $FAILED_TESTS${NC}" | tee -a "$REPORT_FILE"
echo "" | tee -a "$REPORT_FILE"

if [ $TOTAL_TESTS -gt 0 ]; then
    PASS_RATE=$((PASSED_TESTS * 100 / TOTAL_TESTS))
    echo "Pass Rate:    ${PASS_RATE}%" | tee -a "$REPORT_FILE"
fi

echo "" | tee -a "$REPORT_FILE"
echo "Results saved to: $REPORT_FILE" | tee -a "$REPORT_FILE"
echo "======================================================================" | tee -a "$REPORT_FILE"

exit 0