#!/bin/bash
# ============================================================================
# QAssure — File Duplication Status Verification Script
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

echo -e "${BOLD}${CYAN}🔐 Authenticating as admin@pharmacorp.com...${NC}"
AUTH_RESPONSE=$(curl -s -X POST "$AUTH_URL" \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@pharmacorp.com", "password": "Admin@123"}')

TOKEN=$(echo "$AUTH_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])" 2>/dev/null)

if [ -z "$TOKEN" ] || [ "$TOKEN" = "None" ]; then
  echo -e "${RED}❌ Authentication failed.${NC}"
  exit 1
fi

AUTH_HEADER="Authorization: Bearer $TOKEN"
echo -e "${GREEN}✅ Token acquired.${NC}"

# Create a unique file content to test duplication
UNIQUE_STRING="Unique content for duplication check $(date +%s)"
echo "$UNIQUE_STRING" > /tmp/duplication-test.txt

echo -e "\n${BOLD}📤 1. Uploading the file for the first time (Original)...${NC}"
UPLOAD1_RESPONSE=$(curl -s -X POST "$BASE_URL/upload" \
  -H "$AUTH_HEADER" \
  -F "file=@/tmp/duplication-test.txt" \
  -F "entity_type=documents" \
  -F "entity_id=00000000-0000-0000-0000-000000000001" \
  -F "description=First upload - Original" \
  -F "category=testing")

FILE1_ID=$(echo "$UPLOAD1_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
FILE1_DUP=$(echo "$UPLOAD1_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileDuplication'])" 2>/dev/null)

echo -e "  File 1 ID: ${CYAN}$FILE1_ID${NC}"
echo -e "  fileDuplication status: ${BOLD}${FILE1_DUP}${NC}"
if [ "$FILE1_DUP" = "False" ]; then
  echo -e "  ${GREEN}✅ PASS: Original file is not marked as duplicate (fileDuplication = false)${NC}"
else
  echo -e "  ${RED}❌ FAIL: Original file is marked as duplicate${NC}"
fi

echo -e "\n${BOLD}📤 2. Uploading the exact same file content again (Duplicate)...${NC}"
UPLOAD2_RESPONSE=$(curl -s -X POST "$BASE_URL/upload" \
  -H "$AUTH_HEADER" \
  -F "file=@/tmp/duplication-test.txt" \
  -F "entity_type=documents" \
  -F "entity_id=00000000-0000-0000-0000-000000000001" \
  -F "description=Second upload - Duplicate" \
  -F "category=testing")

FILE2_ID=$(echo "$UPLOAD2_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
FILE2_DUP=$(echo "$UPLOAD2_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileDuplication'])" 2>/dev/null)

echo -e "  File 2 ID: ${CYAN}$FILE2_ID${NC}"
echo -e "  fileDuplication status: ${BOLD}${FILE2_DUP}${NC}"
if [ "$FILE2_DUP" = "True" ]; then
  echo -e "  ${GREEN}✅ PASS: Deduplicated upload is marked as duplicate (fileDuplication = true)${NC}"
else
  echo -e "  ${RED}❌ FAIL: Deduplicated upload is NOT marked as duplicate${NC}"
fi

echo -e "\n${BOLD}🔍 3. Fetching the Original File by ID...${NC}"
GET1_RESPONSE=$(curl -s "$BASE_URL/$FILE1_ID" -H "$AUTH_HEADER")
GET1_DUP=$(echo "$GET1_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['fileDuplication'])" 2>/dev/null)
echo -e "  fileDuplication status for original file: ${BOLD}${GET1_DUP}${NC}"
if [ "$GET1_DUP" = "True" ]; then
  echo -e "  ${GREEN}✅ PASS: Original file is now correctly marked as duplicate since the blob is shared (fileDuplication = true)${NC}"
else
  echo -e "  ${RED}❌ FAIL: Original file did not update to duplicate status after duplication${NC}"
fi

echo -e "\n${BOLD}🔍 4. Listing Files...${NC}"
LIST_RESPONSE=$(curl -s "$BASE_URL/?limit=10&offset=0" -H "$AUTH_HEADER")
LIST_DUP1=$(echo "$LIST_RESPONSE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
files=[f for f in d.get('data',[]) if f['id'] == '$FILE1_ID']
print(files[0]['fileDuplication'] if files else 'NOT_FOUND')
" 2>/dev/null)
LIST_DUP2=$(echo "$LIST_RESPONSE" | python3 -c "
import sys,json
d=json.load(sys.stdin)
files=[f for f in d.get('data',[]) if f['id'] == '$FILE2_ID']
print(files[0]['fileDuplication'] if files else 'NOT_FOUND')
" 2>/dev/null)

echo -e "  fileDuplication in list for File 1: ${BOLD}${LIST_DUP1}${NC}"
echo -e "  fileDuplication in list for File 2: ${BOLD}${LIST_DUP2}${NC}"

if [ "$LIST_DUP1" = "True" ] && [ "$LIST_DUP2" = "True" ]; then
  echo -e "  ${GREEN}✅ PASS: List response correctly returns fileDuplication = true for both files${NC}"
else
  echo -e "  ${RED}❌ FAIL: List response does not return true for both files${NC}"
fi

# Cleanup
echo -e "\n${BOLD}🗑️ Cleaning up test files...${NC}"
curl -s -X DELETE "$BASE_URL/$FILE1_ID" -H "$AUTH_HEADER" > /dev/null
curl -s -X DELETE "$BASE_URL/$FILE2_ID" -H "$AUTH_HEADER" > /dev/null
rm -f /tmp/duplication-test.txt
echo -e "${GREEN}✅ Done!${NC}"
