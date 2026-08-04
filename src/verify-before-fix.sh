#!/bin/bash
# ============================================================================
# QAssure File Attachment Service — Pre-Fix Verification
# ============================================================================
# Run this BEFORE applying fixes to see current state.
# Run from the QAssure backend root directory.
#
# Usage:
#   cd ~/Desktop/QAssure-Details/QAssure-Documents-Team/Latest-Code-Base/QAssur-backend
#   chmod +x verify-before-fix.sh
#   ./verify-before-fix.sh
# ============================================================================

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   QAssure File Service — Pre-Fix Verification               ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

SVC="src/services/file-attachment.service.js"
CTR="src/controllers/file-attachment.controller.js"
RTS="src/routes/file-attachment.routes.js"

# ---- Check files exist ----
echo "📁 Checking files exist..."
for f in "$SVC" "$CTR" "$RTS"; do
  if [ -f "$f" ]; then
    echo "  ✅ $f"
  else
    echo "  ❌ $f — NOT FOUND"
  fi
done
echo ""

# ---- Check #1: getFileStream exists ----
echo "🔍 CHECK 1: Does getFileStream exist?"
STREAM_HITS=$(grep -cn "getFileStream" "$SVC" 2>/dev/null || echo "0")
if [ "$STREAM_HITS" -gt "0" ]; then
  echo "  ✅ getFileStream found ($STREAM_HITS references)"
  grep -n "async getFileStream" "$SVC" 2>/dev/null | head -3 | sed 's/^/  /'
else
  echo "  ❌ getFileStream NOT FOUND — needs to be added"
fi
echo ""

# ---- Check #2: Orphan cleanup in upload ----
echo "🔍 CHECK 2: Orphan file cleanup on DB failure?"
if grep -q "storageProvider.delete" "$SVC" 2>/dev/null; then
  echo "  ✅ storageProvider.delete found in service (cleanup may exist)"
  grep -n "storageProvider.delete" "$SVC" | sed 's/^/  /'
else
  echo "  ❌ No storageProvider.delete calls — orphan cleanup missing"
fi
echo ""

# ---- Check #3: Fragile count query ----
echo "🔍 CHECK 3: Fragile count query in getByEntity?"
if grep -q "query.replace" "$SVC" 2>/dev/null; then
  echo "  ❌ query.replace pattern found — fragile count query still present"
  grep -n "query.replace" "$SVC" | sed 's/^/  /'
else
  echo "  ✅ No query.replace — count query may already be fixed"
fi
echo ""

# ---- Check #4: accessSharedFile storage provider bypass ----
echo "🔍 CHECK 4: accessSharedFile uses storageProvider?"
if grep -A5 "accessSharedFile" "$CTR" 2>/dev/null | grep -q "UPLOAD_DIR\|process.cwd.*uploads"; then
  echo "  ❌ accessSharedFile still hardcodes path (UPLOAD_DIR / process.cwd)"
  grep -n "UPLOAD_DIR\|process.cwd.*uploads" "$CTR" | sed 's/^/  /'
else
  echo "  ✅ No hardcoded UPLOAD_DIR in accessSharedFile (may be fixed)"
fi
echo ""

# ---- Check #5: file_size parseInt in _formatAttachment ----
echo "🔍 CHECK 5: file_size parsed to integer in _formatAttachment?"
if grep -A10 "_formatAttachment" "$SVC" 2>/dev/null | grep -q "parseInt.*file_size"; then
  echo "  ✅ parseInt(file_size) found in _formatAttachment"
else
  echo "  ❌ file_size not parsed — API returns string '18' instead of 18"
fi
echo ""

# ---- Check #6: Error sanitization ----
echo "🔍 CHECK 6: Error message sanitization?"
LEAK_COUNT=$(grep -c "error\.message" "$CTR" 2>/dev/null || echo "0")
if grep -q "sanitizeErrorResponse\|sanitize.*error\|Internal server error" "$CTR" 2>/dev/null; then
  echo "  ✅ Error sanitization pattern found"
else
  echo "  ❌ Raw error.message exposed in $LEAK_COUNT catch blocks"
fi
echo ""

# ---- Check #7: UUID validation middleware ----
echo "🔍 CHECK 7: UUID validation middleware?"
if [ -f "src/middleware/validate-uuid.middleware.js" ]; then
  echo "  ✅ validate-uuid.middleware.js exists"
elif grep -q "validateUUID\|UUID_REGEX" "$RTS" 2>/dev/null; then
  echo "  ✅ UUID validation referenced in routes"
else
  echo "  ❌ No UUID validation — invalid UUIDs cause PostgreSQL 500 errors"
fi
echo ""

# ---- Check #8: Share download count logic ----
echo "🔍 CHECK 8: Share download count respects permissions?"
if grep -B2 -A2 "current_downloads = current_downloads" "$SVC" 2>/dev/null | grep -q "permissions.*download\|download.*permission"; then
  echo "  ✅ Download count checks permission type"
else
  echo "  ⚠️  Download count may increment for view-only shares"
fi
echo ""

# ---- Method count ----
echo "📊 Service method count:"
METHODS=$(grep -c "async " "$SVC" 2>/dev/null || echo "0")
echo "  $METHODS async methods in service"
echo ""

# ---- Line counts ----
echo "📊 File sizes:"
for f in "$SVC" "$CTR" "$RTS"; do
  if [ -f "$f" ]; then
    LINES=$(wc -l < "$f")
    echo "  $f: $LINES lines"
  fi
done
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║   Run the fixes, then run test-all-endpoints.sh             ║"
echo "╚══════════════════════════════════════════════════════════════╝"
