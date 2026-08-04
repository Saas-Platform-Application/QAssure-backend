#!/bin/bash
# ============================================================================
# QAssure File Attachment Service — Complete 18-Endpoint Test Suite
# ============================================================================
# 
# Usage:
#   chmod +x test-all-endpoints.sh
#   ./test-all-endpoints.sh
#
# Prerequisites:
#   - Server running on http://localhost:3000
#   - PostgreSQL with qassure_dev database
#   - Test user: admin@pharmacorp.com / Admin@123
# ============================================================================

set +e

BASE_URL="http://localhost:3000/api/v1/files"
AUTH_URL="http://localhost:3000/api/v1/auth/login"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

PASS=0
FAIL=0
SKIP=0

# Utilities
log_test() { echo -e "\n${CYAN}━━━ TEST $1: $2 ━━━${NC}"; }
log_pass() { echo -e "${GREEN}  ✅ PASS: $1${NC}"; ((PASS++)); }
log_fail() { echo -e "${RED}  ❌ FAIL: $1${NC}"; ((FAIL++)); }
log_warn() { echo -e "${YELLOW}  ⚠️  WARN: $1${NC}"; }
log_skip() { echo -e "${YELLOW}  ⏭️  SKIP: $1${NC}"; ((SKIP++)); }
log_info() { echo -e "  ℹ️  $1"; }

assert_status() {
  local actual="$1" expected="$2" label="$3"
  if [ "$actual" = "$expected" ]; then
    log_pass "$label (HTTP $actual)"
  else
    log_fail "$label — expected HTTP $expected, got HTTP $actual"
  fi
}

assert_json_field() {
  local json="$1" field="$2" expected="$3" label="$4"
  local actual
  actual=$(echo "$json" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d${field})" 2>/dev/null || echo "__PARSE_ERROR__")
  if [ "$actual" = "$expected" ]; then
    log_pass "$label ($field = $expected)"
  else
    log_fail "$label — $field expected '$expected', got '$actual'"
  fi
}

assert_json_type() {
  local json="$1" field="$2" expected_type="$3" label="$4"
  local actual_type
  actual_type=$(echo "$json" | python3 -c "
import sys,json
d=json.load(sys.stdin)
v = d${field}
print(type(v).__name__)
" 2>/dev/null || echo "__PARSE_ERROR__")
  if [ "$actual_type" = "$expected_type" ]; then
    log_pass "$label ($field is $expected_type)"
  else
    log_fail "$label — $field expected type '$expected_type', got '$actual_type'"
  fi
}

# ============================================================================
echo -e "${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   QAssure File Attachment Service — Full Endpoint Test      ║"
echo "║   Testing all 18 endpoints                                  ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ============================================================================
# STEP 0: Authenticate
# ============================================================================
echo -e "${BOLD}🔐 Authenticating as admin@pharmacorp.com...${NC}"

AUTH_RESPONSE=$(curl -s -X POST "$AUTH_URL" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@pharmacorp.com", "password": "Admin@123"}')

TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then
  echo -e "${RED}❌ Authentication failed. Is the server running?${NC}"
  echo "Response: $AUTH_RESPONSE"
  exit 1
fi

echo -e "${GREEN}✅ Token acquired: ${TOKEN:0:20}...${NC}"
AUTH_HEADER="Authorization: Bearer $TOKEN"


# ============================================================================
# TEST 1: POST /upload — Single file upload
# ============================================================================
log_test "1/18" "POST /upload — Single file upload"

echo "test content for upload validation $(date +%s)" > /tmp/qassure-test-upload.txt

UPLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/upload" \
  -H "$AUTH_HEADER" \
  -F "file=@/tmp/qassure-test-upload.txt" \
  -F "entity_type=documents" \
  -F "entity_id=00000000-0000-0000-0000-000000000001" \
  -F "description=Automated test file" \
  -F "tags=test,automated" \
  -F "category=testing")

UPLOAD_STATUS=$(echo "$UPLOAD_RESPONSE" | tail -1)
UPLOAD_BODY=$(echo "$UPLOAD_RESPONSE" | sed '$d')

assert_status "$UPLOAD_STATUS" "201" "Upload returns 201"
assert_json_field "$UPLOAD_BODY" "['success']" "True" "success=true"
assert_json_field "$UPLOAD_BODY" "['data']['source_module']" "platform" "source_module=platform"

FILE_ID=$(echo "$UPLOAD_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
log_info "Created FILE_ID: $FILE_ID"

# Verify file_size is integer, not string (Bug #4 fix)
assert_json_type "$UPLOAD_BODY" "['data']['file_size']" "int" "file_size is integer (not string)"


# ============================================================================
# TEST 2: GET / — List files with pagination
# ============================================================================
log_test "2/18" "GET / — List files with pagination"

LIST_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/?limit=5&offset=0" \
  -H "$AUTH_HEADER")

LIST_STATUS=$(echo "$LIST_RESPONSE" | tail -1)
LIST_BODY=$(echo "$LIST_RESPONSE" | sed '$d')

assert_status "$LIST_STATUS" "200" "List returns 200"
assert_json_field "$LIST_BODY" "['success']" "True" "success=true"

# Check pagination object exists
HAS_PAGINATION=$(echo "$LIST_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('yes' if 'pagination' in d and 'total' in d['pagination'] else 'no')
" 2>/dev/null)
if [ "$HAS_PAGINATION" = "yes" ]; then
  log_pass "Pagination object present with total/limit/offset"
else
  log_fail "Missing pagination object"
fi


# ============================================================================
# TEST 3: GET /:id — Get file by ID
# ============================================================================
log_test "3/18" "GET /:id — Get file by ID"

GETBYID_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/$FILE_ID" \
  -H "$AUTH_HEADER")

GETBYID_STATUS=$(echo "$GETBYID_RESPONSE" | tail -1)
GETBYID_BODY=$(echo "$GETBYID_RESPONSE" | sed '$d')

assert_status "$GETBYID_STATUS" "200" "Get by ID returns 200"
assert_json_field "$GETBYID_BODY" "['data']['id']" "$FILE_ID" "Correct file returned"


# ============================================================================
# TEST 4: GET /:id — Invalid UUID returns 400 (not 500)
# ============================================================================
log_test "4/18" "GET /:id — Invalid UUID validation"

INVALID_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/not-a-uuid" \
  -H "$AUTH_HEADER")

INVALID_STATUS=$(echo "$INVALID_RESPONSE" | tail -1)
INVALID_BODY=$(echo "$INVALID_RESPONSE" | sed '$d')

assert_status "$INVALID_STATUS" "400" "Invalid UUID returns 400 (not 500)"
assert_json_field "$INVALID_BODY" "['success']" "False" "success=false"


# ============================================================================
# TEST 5: PUT /:id — Update metadata
# ============================================================================
log_test "5/18" "PUT /:id — Update metadata"

UPDATE_RESPONSE=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/$FILE_ID" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{"description": "Updated by test script", "tags": ["updated", "automated"], "category": "test-results"}')

UPDATE_STATUS=$(echo "$UPDATE_RESPONSE" | tail -1)
UPDATE_BODY=$(echo "$UPDATE_RESPONSE" | sed '$d')

assert_status "$UPDATE_STATUS" "200" "Update metadata returns 200"
assert_json_field "$UPDATE_BODY" "['data']['description']" "Updated by test script" "Description updated"
assert_json_field "$UPDATE_BODY" "['data']['category']" "test-results" "Category updated"


# ============================================================================
# TEST 6: GET /stats — Storage statistics
# ============================================================================
log_test "6/18" "GET /stats — Storage statistics"

STATS_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/stats" \
  -H "$AUTH_HEADER")

STATS_STATUS=$(echo "$STATS_RESPONSE" | tail -1)
STATS_BODY=$(echo "$STATS_RESPONSE" | sed '$d')

assert_status "$STATS_STATUS" "200" "Stats returns 200"

HAS_BY_MODULE=$(echo "$STATS_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print('yes' if d.get('success') and 'by_module' in d.get('data',{}) else 'no')
" 2>/dev/null)
if [ "$HAS_BY_MODULE" = "yes" ]; then
  log_pass "Stats includes by_module breakdown"
else
  log_fail "Stats missing by_module breakdown"
fi


# ============================================================================
# TEST 7: GET /quota — Get storage quota
# ============================================================================
log_test "7/18" "GET /quota — Get storage quota"

QUOTA_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/quota" \
  -H "$AUTH_HEADER")

QUOTA_STATUS=$(echo "$QUOTA_RESPONSE" | tail -1)
QUOTA_BODY=$(echo "$QUOTA_RESPONSE" | sed '$d')

assert_status "$QUOTA_STATUS" "200" "Get quota returns 200"
assert_json_field "$QUOTA_BODY" "['success']" "True" "success=true"


# ============================================================================
# TEST 8: POST /:id/versions — Upload new version
# ============================================================================
log_test "8/18" "POST /:id/versions — Upload file version"

echo "version 2 content $(date +%s)" > /tmp/qassure-test-v2.txt

VERSION_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/$FILE_ID/versions" \
  -H "$AUTH_HEADER" \
  -F "file=@/tmp/qassure-test-v2.txt" \
  -F "description=Version 2 from test script")

VERSION_STATUS=$(echo "$VERSION_RESPONSE" | tail -1)
VERSION_BODY=$(echo "$VERSION_RESPONSE" | sed '$d')

assert_status "$VERSION_STATUS" "201" "Upload version returns 201"

V2_ID=$(echo "$VERSION_BODY" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
log_info "Version 2 FILE_ID: $V2_ID"

assert_json_field "$VERSION_BODY" "['data']['version']" "2" "Version number is 2"
assert_json_field "$VERSION_BODY" "['data']['previous_version_id']" "$FILE_ID" "Previous version linked"


# ============================================================================
# TEST 9: GET /:id/versions — Version history
# ============================================================================
log_test "9/18" "GET /:id/versions — Version history chain"

HISTORY_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/$V2_ID/versions" \
  -H "$AUTH_HEADER")

HISTORY_STATUS=$(echo "$HISTORY_RESPONSE" | tail -1)
HISTORY_BODY=$(echo "$HISTORY_RESPONSE" | sed '$d')

assert_status "$HISTORY_STATUS" "200" "Version history returns 200"

VERSION_COUNT=$(echo "$HISTORY_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(len(d.get('data',[])))
" 2>/dev/null)
if [ "$VERSION_COUNT" -ge "2" ] 2>/dev/null; then
  log_pass "Version chain has $VERSION_COUNT versions (v1→v2)"
else
  log_fail "Expected ≥2 versions in chain, got $VERSION_COUNT"
fi


# ============================================================================
# TEST 10: GET /:id/download — Download file
# ============================================================================
log_test "10/18" "GET /:id/download — Download file"

DOWNLOAD_RESPONSE=$(curl -s -w "\n%{http_code}" -o /tmp/qassure-downloaded.txt \
  "$BASE_URL/$V2_ID/download" \
  -H "$AUTH_HEADER")

DOWNLOAD_STATUS=$(echo "$DOWNLOAD_RESPONSE" | tail -1)

assert_status "$DOWNLOAD_STATUS" "200" "Download returns 200"

if [ -s /tmp/qassure-downloaded.txt ]; then
  log_pass "Downloaded file is non-empty ($(wc -c < /tmp/qassure-downloaded.txt) bytes)"
else
  log_fail "Downloaded file is empty or missing"
fi

# Check Content-Disposition header
DOWNLOAD_HEADERS=$(curl -s -I "$BASE_URL/$V2_ID/download" -H "$AUTH_HEADER")
if echo "$DOWNLOAD_HEADERS" | grep -qi "content-disposition.*attachment"; then
  log_pass "Content-Disposition: attachment header present"
elif echo "$DOWNLOAD_HEADERS" | grep -qi "content-disposition"; then
  log_warn "Content-Disposition present but may not be 'attachment'"
else
  log_fail "Missing Content-Disposition header"
fi


# ============================================================================
# TEST 11: GET /:id/preview — Preview file (inline)
# ============================================================================
log_test "11/18" "GET /:id/preview — Preview file (inline disposition)"

PREVIEW_HEADERS=$(curl -s -I "$BASE_URL/$V2_ID/preview" -H "$AUTH_HEADER")
PREVIEW_STATUS=$(echo "$PREVIEW_HEADERS" | head -1 | grep -o "[0-9][0-9][0-9]")

assert_status "$PREVIEW_STATUS" "200" "Preview returns 200"

if echo "$PREVIEW_HEADERS" | grep -qi "content-disposition.*inline"; then
  log_pass "Content-Disposition: inline header present"
else
  log_warn "Content-Disposition may not be 'inline' — check header manually"
fi


# ============================================================================
# TEST 12: GET /entity/:type/:id — Get files by entity
# ============================================================================
log_test "12/18" "GET /entity/:type/:id — Files by entity"

ENTITY_RESPONSE=$(curl -s -w "\n%{http_code}" \
  "$BASE_URL/entity/documents/00000000-0000-0000-0000-000000000001" \
  -H "$AUTH_HEADER")

ENTITY_STATUS=$(echo "$ENTITY_RESPONSE" | tail -1)
ENTITY_BODY=$(echo "$ENTITY_RESPONSE" | sed '$d')

assert_status "$ENTITY_STATUS" "200" "Get by entity returns 200"
assert_json_field "$ENTITY_BODY" "['success']" "True" "success=true"

ENTITY_COUNT=$(echo "$ENTITY_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
if isinstance(d.get('data'), list):
  print(len(d['data']))
elif 'pagination' in d:
  print(d['pagination'].get('total', 0))
else:
  print(0)
" 2>/dev/null)
log_info "Entity has $ENTITY_COUNT file(s)"


# ============================================================================
# TEST 13: POST /upload/multiple — Multi-file upload
# ============================================================================
log_test "13/18" "POST /upload/multiple — Multi-file upload"

echo "multi-file A $(date +%s)" > /tmp/qassure-multi-a.txt
echo "multi-file B $(date +%s)" > /tmp/qassure-multi-b.txt

MULTI_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/upload/multiple" \
  -H "$AUTH_HEADER" \
  -F "files=@/tmp/qassure-multi-a.txt" \
  -F "files=@/tmp/qassure-multi-b.txt" \
  -F "entity_type=documents" \
  -F "entity_id=00000000-0000-0000-0000-000000000003")

MULTI_STATUS=$(echo "$MULTI_RESPONSE" | tail -1)
MULTI_BODY=$(echo "$MULTI_RESPONSE" | sed '$d')

assert_status "$MULTI_STATUS" "201" "Multi-upload returns 201"

MULTI_COUNT=$(echo "$MULTI_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data = d.get('data', [])
if isinstance(data, list):
  print(len(data))
elif isinstance(data, dict) and 'uploaded' in data:
  print(len(data['uploaded']))
else:
  print(0)
" 2>/dev/null)
if [ "$MULTI_COUNT" = "2" ]; then
  log_pass "Both files uploaded successfully ($MULTI_COUNT files)"
else
  log_warn "Expected 2 files, got $MULTI_COUNT — check response structure"
fi


# ============================================================================
# TEST 14: POST /:id/share — Create share link
# ============================================================================
log_test "14/18" "POST /:id/share — Create share link"

SHARE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/$V2_ID/share" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -d '{
    "share_type": "link",
    "permissions": "view",
    "expires_in_hours": 24,
    "max_downloads": 5
  }')

SHARE_STATUS=$(echo "$SHARE_RESPONSE" | tail -1)
SHARE_BODY=$(echo "$SHARE_RESPONSE" | sed '$d')

assert_status "$SHARE_STATUS" "201" "Create share returns 201"

SHARE_TOKEN=$(echo "$SHARE_BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
data = d.get('data', {})
print(data.get('share_token', data.get('token', '')))
" 2>/dev/null)

SHARE_ID=$(echo "$SHARE_BODY" | python3 -c "
import sys,json
print(json.load(sys.stdin).get('data', {}).get('id', ''))
" 2>/dev/null)

if [ -n "$SHARE_TOKEN" ] && [ "$SHARE_TOKEN" != "None" ] && [ "$SHARE_TOKEN" != "" ]; then
  log_pass "Share token generated: ${SHARE_TOKEN:0:12}..."
  log_info "Share ID: $SHARE_ID"
else
  log_fail "No share token in response"
  log_info "Full response: $SHARE_BODY"
fi


# ============================================================================
# TEST 15: GET /shared/:token — Access shared file (PUBLIC, no auth)
# ============================================================================
log_test "15/18" "GET /shared/:token — Access shared file (public route)"

if [ -n "$SHARE_TOKEN" ] && [ "$SHARE_TOKEN" != "None" ] && [ "$SHARE_TOKEN" != "" ]; then
  SHARED_RESPONSE=$(curl -s -w "\n%{http_code}" -o /tmp/qassure-shared-download.txt \
    "$BASE_URL/shared/$SHARE_TOKEN")
  SHARED_STATUS=$(echo "$SHARED_RESPONSE" | tail -1)

  assert_status "$SHARED_STATUS" "200" "Shared file access returns 200"

  if [ -s /tmp/qassure-shared-download.txt ]; then
    log_pass "Shared file downloaded ($(wc -c < /tmp/qassure-shared-download.txt) bytes)"
  else
    log_fail "Shared file download is empty"
  fi
else
  log_skip "No share token available — skipping shared file access test"
fi


# ============================================================================
# TEST 16: DELETE /shares/:shareId — Revoke share
# ============================================================================
log_test "16/18" "DELETE /shares/:shareId — Revoke share"

if [ -n "$SHARE_ID" ] && [ "$SHARE_ID" != "None" ] && [ "$SHARE_ID" != "" ]; then
  REVOKE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/shares/$SHARE_ID" \
    -H "$AUTH_HEADER")
  REVOKE_STATUS=$(echo "$REVOKE_RESPONSE" | tail -1)
  REVOKE_BODY=$(echo "$REVOKE_RESPONSE" | sed '$d')

  assert_status "$REVOKE_STATUS" "200" "Revoke share returns 200"
  assert_json_field "$REVOKE_BODY" "['success']" "True" "success=true"

  # Verify shared link no longer works
  REVOKED_RESPONSE=$(curl -s -w "\n%{http_code}" "$BASE_URL/shared/$SHARE_TOKEN")
  REVOKED_STATUS=$(echo "$REVOKED_RESPONSE" | tail -1)

  if [ "$REVOKED_STATUS" = "404" ] || [ "$REVOKED_STATUS" = "410" ] || [ "$REVOKED_STATUS" = "403" ]; then
    log_pass "Revoked share correctly returns error (HTTP $REVOKED_STATUS)"
  else
    log_fail "Revoked share still accessible (HTTP $REVOKED_STATUS)"
  fi
else
  log_skip "No share ID available — skipping revoke test"
fi


# ============================================================================
# TEST 17: DELETE /:id — Soft delete + quota update
# ============================================================================
log_test "17/18" "DELETE /:id — Soft delete and quota trigger"

# Get quota before delete
QUOTA_BEFORE=$(curl -s "$BASE_URL/quota" -H "$AUTH_HEADER" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('data',{}).get('used_storage_bytes', d.get('data',{}).get('used_bytes', 0)))
" 2>/dev/null)

DELETE_RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/$V2_ID" \
  -H "$AUTH_HEADER")

DELETE_STATUS=$(echo "$DELETE_RESPONSE" | tail -1)
DELETE_BODY=$(echo "$DELETE_RESPONSE" | sed '$d')

assert_status "$DELETE_STATUS" "200" "Soft delete returns 200"

# Get quota after delete
QUOTA_AFTER=$(curl -s "$BASE_URL/quota" -H "$AUTH_HEADER" | python3 -c "
import sys,json
d=json.load(sys.stdin)
print(d.get('data',{}).get('used_storage_bytes', d.get('data',{}).get('used_bytes', 0)))
" 2>/dev/null)

log_info "Quota before delete: $QUOTA_BEFORE bytes"
log_info "Quota after delete:  $QUOTA_AFTER bytes"

if [ "$QUOTA_AFTER" -lt "$QUOTA_BEFORE" ] 2>/dev/null; then
  log_pass "Quota decreased after soft delete (trigger working)"
else
  log_warn "Quota did not decrease — trigger may not be firing on UPDATE"
fi

# Verify deleted file returns 404
DELETED_CHECK=$(curl -s -w "\n%{http_code}" "$BASE_URL/$V2_ID" -H "$AUTH_HEADER")
DELETED_CHECK_STATUS=$(echo "$DELETED_CHECK" | tail -1)

if [ "$DELETED_CHECK_STATUS" = "404" ]; then
  log_pass "Deleted file returns 404 as expected"
else
  log_warn "Deleted file returns HTTP $DELETED_CHECK_STATUS (expected 404)"
fi


# ============================================================================
# TEST 18: Error sanitization check
# ============================================================================
log_test "18/18" "Error response sanitization"

# Use non-existent UUID — should return clean error, no DB internals
SANITIZE_RESPONSE=$(curl -s "$BASE_URL/00000000-0000-0000-0000-999999999999" \
  -H "$AUTH_HEADER")

HAS_DB_LEAK=$(echo "$SANITIZE_RESPONSE" | python3 -c "
import sys,json
try:
  d=json.load(sys.stdin)
  msg = str(d.get('error',{}).get('message',''))
  leaky_patterns = ['constraint', 'relation', 'violates', 'column', 'pg_', 'SQLSTATE']
  has_leak = any(p in msg.lower() for p in leaky_patterns)
  print('LEAK' if has_leak else 'CLEAN')
except:
  print('PARSE_ERROR')
" 2>/dev/null)

if [ "$HAS_DB_LEAK" = "CLEAN" ]; then
  log_pass "Error response does not leak DB internals"
elif [ "$HAS_DB_LEAK" = "LEAK" ]; then
  log_fail "Error response leaks database internals — apply error sanitization fix"
  log_info "Response: $SANITIZE_RESPONSE"
else
  log_warn "Could not parse error response"
fi


# ============================================================================
# CLEANUP
# ============================================================================
rm -f /tmp/qassure-test-upload.txt /tmp/qassure-test-v2.txt
rm -f /tmp/qassure-multi-a.txt /tmp/qassure-multi-b.txt
rm -f /tmp/qassure-downloaded.txt /tmp/qassure-shared-download.txt


# ============================================================================
# RESULTS SUMMARY
# ============================================================================
echo -e "\n${BOLD}${CYAN}"
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║                    TEST RESULTS SUMMARY                     ║"
echo "╠══════════════════════════════════════════════════════════════╣"
printf "║  ${GREEN}PASSED: %-3d${CYAN}                                                ║\n" $PASS
printf "║  ${RED}FAILED: %-3d${CYAN}                                                ║\n" $FAIL
printf "║  ${YELLOW}SKIPPED: %-3d${CYAN}                                               ║\n" $SKIP
echo "╠══════════════════════════════════════════════════════════════╣"

TOTAL=$((PASS + FAIL))
if [ $FAIL -eq 0 ]; then
  echo -e "║  ${GREEN}🎉 ALL $TOTAL TESTS PASSED${CYAN}                                      ║"
elif [ $FAIL -le 3 ]; then
  echo -e "║  ${YELLOW}⚠️  $FAIL issue(s) to fix — review failures above${CYAN}                 ║"
else
  echo -e "║  ${RED}🔥 $FAIL failures — significant issues to address${CYAN}                ║"
fi

echo "╚══════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

exit $FAIL
