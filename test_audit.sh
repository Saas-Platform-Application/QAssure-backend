#!/bin/bash
BASE="http://localhost:3000/api/v1"

# Login
echo "=== LOGIN ==="
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pharmacorp.com","password":"password123"}' | jq -r '.data.access_token')
echo "Token: ${TOKEN:0:20}..."

AUTH="-H \"Authorization: Bearer $TOKEN\""

# Users
echo "=== GET USERS ==="
curl -s -X GET $BASE/users -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

# Tenants
echo "=== GET TENANTS ==="
curl -s -X GET $BASE/tenants -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

# Documents
echo "=== GET DOCUMENTS ==="
curl -s -X GET $BASE/documents -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

# CAPAs
echo "=== GET CAPAS ==="
curl -s -X GET $BASE/capas -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

# Suppliers
echo "=== GET SUPPLIERS ==="
curl -s -X GET $BASE/suppliers -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

# Training
echo "=== GET TRAINING ==="
curl -s -X GET $BASE/training/courses -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

# Workflows
echo "=== GET WORKFLOWS ==="
curl -s -X GET $BASE/workflows/instances -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

# Projects
echo "=== GET PROJECTS ==="
curl -s -X GET $BASE/projects -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

# Failed login
echo "=== FAILED LOGIN ==="
curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pharmacorp.com","password":"wrongpassword"}' | jq '.error.code'

# Logout
echo "=== LOGOUT ==="
curl -s -X POST $BASE/auth/logout \
  -H "Authorization: Bearer $TOKEN" | jq '.success // .error.code'

echo ""
echo "=== AUDIT LOG RESULTS ==="
docker exec -it qassure-postgres psql -U postgres -d qassure_dev -c \
  "SELECT action, resource_type, request_path, response_status, created_at 
   FROM audit_logs 
   ORDER BY created_at DESC 
   LIMIT 20;"
