#!/bin/bash

# Quick Test Script - Copy and paste commands from this file one by one

BASE_URL="http://localhost:3000/api/v1"

echo "=========================================="
echo "QAssure API - Quick Test Commands"
echo "=========================================="
echo ""
echo "Copy and paste these commands one by one:"
echo ""

echo "=== STEP 1: Set Base URL ==="
echo "export BASE_URL=\"http://localhost:3000/api/v1\""
echo ""

echo "=== STEP 2: Test Health (No Auth) ==="
echo "curl -X GET \${BASE_URL}/health | python3 -m json.tool"
echo ""

echo "=== STEP 3: Login and Get Token ==="
cat << 'EOF'
LOGIN_RESPONSE=$(curl -s -X POST ${BASE_URL}/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser2@example.com","password":"Test123456"}')

export ACCESS_TOKEN=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
export USER_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['user']['id'])")
export TENANT_ID=$(echo "$LOGIN_RESPONSE" | python3 -c "import sys, json; print(json.load(sys.stdin)['data']['tenant_id'])")

echo "Token: ${ACCESS_TOKEN:0:50}..."
EOF
echo ""

echo "=== STEP 4: Test Auth Endpoints ==="
echo "curl -X GET \${BASE_URL}/auth/me -H \"Authorization: Bearer \$ACCESS_TOKEN\" | python3 -m json.tool"
echo ""

echo "=== STEP 5: Test User Management ==="
echo "curl -X GET \${BASE_URL}/users -H \"Authorization: Bearer \$ACCESS_TOKEN\" | python3 -m json.tool"
echo ""

echo "=== STEP 6: Test Roles ==="
echo "curl -X GET \${BASE_URL}/roles -H \"Authorization: Bearer \$ACCESS_TOKEN\" | python3 -m json.tool"
echo ""

echo "=== STEP 7: Test Modules ==="
echo "curl -X GET \${BASE_URL}/modules -H \"Authorization: Bearer \$ACCESS_TOKEN\" | python3 -m json.tool"
echo ""

echo "=== STEP 8: Test API Keys ==="
echo "curl -X GET \${BASE_URL}/api-keys -H \"Authorization: Bearer \$ACCESS_TOKEN\" | python3 -m json.tool"
echo ""

echo "=========================================="
echo "For complete testing, see TERMINAL_TESTING_STEPS.md"
echo "=========================================="

