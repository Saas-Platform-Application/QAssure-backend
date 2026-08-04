#!/bin/bash
BASE="http://localhost:3000/api/v1"

# ============================================================
# SETUP - Get super admin token and tenant admin token
# ============================================================
echo "=============================="
echo "GETTING TOKENS"
echo "=============================="

TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pharmacorp.com","password":"password123"}' | jq -r '.data.access_token')
echo "Token: ${TOKEN:0:30}..."

# Real IDs from DB
TENANT_ID="c0000000-0000-0000-0000-000000000001"
TENANT_ID2="c0000000-0000-0000-0000-000000000002"
USER_ID="b0000000-0000-0000-0000-000000000004"
DOC_ID="169a3c27-7df5-4919-bd55-6a618c929f30"
WORKFLOW_ID="1ae87a6e-6466-4a0f-b4de-c6b95d2e4851"
COURSE_ID="3d969522-2204-4896-ae0b-5cdd0f034b32"
KNOWLEDGE_ID="86869a44-e2d9-45da-8520-93912335b9a0"
FILE_ID="2fb79a4b-60b7-44ca-ac76-e16dd2e6a547"

H="Authorization: Bearer $TOKEN"
CT="Content-Type: application/json"

# Clear previous test audit logs marker
echo ""
echo "Test started at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
START_TIME=$(date -u +%Y-%m-%dT%H:%M:%SZ)

# ============================================================
# 1. AUTH SERVICE
# ============================================================
echo ""
echo "=============================="
echo "1. AUTH - Login success"
echo "=============================="
curl -s -X POST $BASE/auth/login \
  -H "$CT" \
  -d '{"email":"admin@pharmacorp.com","password":"password123"}' | jq '.success'

echo "--- Auth - Login failure ---"
curl -s -X POST $BASE/auth/login \
  -H "$CT" \
  -d '{"email":"admin@pharmacorp.com","password":"wrongpass"}' | jq '.error.code'

echo "--- Auth - Change password ---"
curl -s -X POST $BASE/auth/change-password \
  -H "$H" -H "$CT" \
  -d '{"currentPassword":"password123","newPassword":"password123"}' | jq '.success // .error.code'

echo "--- Auth - Logout ---"
curl -s -X POST $BASE/auth/logout \
  -H "$H" | jq '.success // .error.code'

# Re-login after logout
TOKEN=$(curl -s -X POST $BASE/auth/login \
  -H "$CT" \
  -d '{"email":"admin@pharmacorp.com","password":"password123"}' | jq -r '.data.access_token')
H="Authorization: Bearer $TOKEN"

# ============================================================
# 2. USER SERVICE
# ============================================================
echo ""
echo "=============================="
echo "2. USER SERVICE"
echo "=============================="

echo "--- Create user ---"
NEW_USER_ID=$(curl -s -X POST $BASE/users \
  -H "$H" -H "$CT" \
  -d "{
    \"email\": \"audittest_$(date +%s)@test.com\",
    \"password_hash\": \"password123\",
    \"first_name\": \"Audit\",
    \"last_name\": \"Test\",
    \"status\": \"active\",
    \"tenant_id\": \"$TENANT_ID\"
  }" | jq -r '.id // .data.id // empty')
echo "Created user: $NEW_USER_ID"

echo "--- Update user ---"
if [ ! -z "$NEW_USER_ID" ]; then
  curl -s -X PUT $BASE/users/$NEW_USER_ID \
    -H "$H" -H "$CT" \
    -d '{"first_name":"AuditUpdated"}' | jq '.id // .error.code'
fi

echo "--- Delete user ---"
if [ ! -z "$NEW_USER_ID" ]; then
  curl -s -X DELETE $BASE/users/$NEW_USER_ID \
    -H "$H" | jq '.message // .error.code'
fi

# ============================================================
# 3. DOCUMENT SERVICE
# ============================================================
echo ""
echo "=============================="
echo "3. DOCUMENT SERVICE"
echo "=============================="

echo "--- Get document (Layer 1) ---"
curl -s -X GET $BASE/documents/$DOC_ID \
  -H "$H" | jq '.id // .error.code'

echo "--- Update document ---"
curl -s -X PUT $BASE/documents/$DOC_ID \
  -H "$H" -H "$CT" \
  -d '{"title":"Audit Test Updated Title"}' | jq '.id // .error.code'

# ============================================================
# 4. CAPA SERVICE
# ============================================================
echo ""
echo "=============================="
echo "4. CAPA SERVICE"
echo "=============================="

echo "--- Create CAPA ---"
CAPA_ID=$(curl -s -X POST $BASE/capas \
  -H "$H" -H "$CT" \
  -d "{
    \"title\": \"Audit Test CAPA\",
    \"description\": \"Testing audit logging\",
    \"capa_type\": \"corrective\",
    \"source\": \"internal_audit\",
    \"priority\": \"medium\",
    \"identified_date\": \"2026-04-03\",
    \"target_date\": \"2026-05-03\",
    \"tenant_id\": \"$TENANT_ID\"
  }" | jq -r '.data.id // .id // empty')
echo "Created CAPA: $CAPA_ID"

echo "--- Update CAPA ---"
if [ ! -z "$CAPA_ID" ]; then
  curl -s -X PUT $BASE/capas/$CAPA_ID \
    -H "$H" -H "$CT" \
    -d '{"priority":"high"}' | jq '.id // .error.code'
fi

# ============================================================
# 5. SUPPLIER SERVICE
# ============================================================
echo ""
echo "=============================="
echo "5. SUPPLIER SERVICE"
echo "=============================="

echo "--- Create supplier ---"
SUPPLIER_ID=$(curl -s -X POST $BASE/suppliers \
  -H "$H" -H "$CT" \
  -d "{
    \"name\": \"Audit Test Supplier\",
    \"supplier_type\": \"manufacturer\",
    \"category\": \"critical\",
    \"primary_contact_email\": \"supplier@test.com\",
    \"tenant_id\": \"$TENANT_ID\"
  }" | jq -r '.data.id // .id // empty')
echo "Created supplier: $SUPPLIER_ID"

echo "--- Update supplier ---"
if [ ! -z "$SUPPLIER_ID" ]; then
  curl -s -X PUT $BASE/suppliers/$SUPPLIER_ID \
    -H "$H" -H "$CT" \
    -d '{"risk_level":"high"}' | jq '.id // .error.code'
fi

# ============================================================
# 6. TRAINING SERVICE
# ============================================================
echo ""
echo "=============================="
echo "6. TRAINING SERVICE"
echo "=============================="

echo "--- Get course (Layer 1) ---"
curl -s -X GET $BASE/training/courses/$COURSE_ID \
  -H "$H" | jq '.id // .error.code'

echo "--- Update course ---"
curl -s -X PUT $BASE/training/courses/$COURSE_ID \
  -H "$H" -H "$CT" \
  -d '{"status":"active"}' | jq '.id // .error.code'

echo "--- Assign training ---"
ASSIGN_ID=$(curl -s -X POST $BASE/training/assignments \
  -H "$H" -H "$CT" \
  -d "{
    \"course_id\": \"$COURSE_ID\",
    \"user_id\": \"$USER_ID\",
    \"due_days\": 30,
    \"reason\": \"Audit test assignment\"
  }" | jq -r '.data.id // .id // empty')
echo "Assignment ID: $ASSIGN_ID"

# ============================================================
# 7. WORKFLOW SERVICE
# ============================================================
echo ""
echo "=============================="
echo "7. WORKFLOW SERVICE"
echo "=============================="

echo "--- Get workflow instance (Layer 1) ---"
curl -s -X GET $BASE/workflows/instances/$WORKFLOW_ID \
  -H "$H" | jq '.id // .error.code'

# ============================================================
# 8. KNOWLEDGE SERVICE
# ============================================================
echo ""
echo "=============================="
echo "8. KNOWLEDGE SERVICE"
echo "=============================="

echo "--- Get collection (Layer 1) ---"
curl -s -X GET $BASE/knowledge/collections/$KNOWLEDGE_ID \
  -H "$H" | jq '.id // .error.code'

echo "--- Create collection ---"
NEW_COLL_ID=$(curl -s -X POST $BASE/knowledge/collections \
  -H "$H" -H "$CT" \
  -d '{"name":"Audit Test Collection","description":"Testing audit"}' | jq -r '.data.id // .id // empty')
echo "Created collection: $NEW_COLL_ID"

echo "--- Delete collection ---"
if [ ! -z "$NEW_COLL_ID" ]; then
  curl -s -X DELETE $BASE/knowledge/collections/$NEW_COLL_ID \
    -H "$H" | jq '.success // .error.code'
fi

# ============================================================
# 9. FILE ATTACHMENT SERVICE
# ============================================================
echo ""
echo "=============================="
echo "9. FILE SERVICE"
echo "=============================="

echo "--- Get file (Layer 1) ---"
curl -s -X GET $BASE/files/$FILE_ID \
  -H "$H" | jq '.id // .error.code'

# ============================================================
# 10. PROJECT SERVICE
# ============================================================
echo ""
echo "=============================="
echo "10. PROJECT SERVICE"
echo "=============================="

echo "--- Create project ---"
PROJECT_ID=$(curl -s -X POST $BASE/projects \
  -H "$H" -H "$CT" \
  -d "{
    \"name\": \"Audit Test Project\",
    \"code\": \"ATP-$(date +%s)\",
    \"project_type\": \"custom\",
    \"status\": \"planning\"
  }" | jq -r '.data.id // .id // empty')
echo "Created project: $PROJECT_ID"

echo "--- Update project ---"
if [ ! -z "$PROJECT_ID" ]; then
  curl -s -X PUT $BASE/projects/$PROJECT_ID \
    -H "$H" -H "$CT" \
    -d '{"status":"active"}' | jq '.id // .error.code'
fi

echo "--- Delete project ---"
if [ ! -z "$PROJECT_ID" ]; then
  curl -s -X DELETE $BASE/projects/$PROJECT_ID \
    -H "$H" | jq '.status // .error.code'
fi

# ============================================================
# FINAL AUDIT LOG DUMP
# ============================================================
echo ""
echo "=============================="
echo "AUDIT LOG RESULTS"
echo "=============================="
docker exec -it qassure-postgres psql -U postgres -d qassure_dev -c "
SELECT action, resource_type, request_path, response_status, created_at 
FROM audit_logs 
WHERE created_at > '$START_TIME'
ORDER BY created_at ASC;"

echo ""
echo "=============================="
echo "AUDIT COUNT BY RESOURCE TYPE"
echo "=============================="
docker exec -it qassure-postgres psql -U postgres -d qassure_dev -c "
SELECT resource_type, action, response_status, COUNT(*) as count
FROM audit_logs 
WHERE created_at > '$START_TIME'
GROUP BY resource_type, action, response_status
ORDER BY resource_type, action;"

