// ============================================================================
// QAssure File Attachment Service — Controller Fixes
// File: src/controllers/file-attachment.controller.js
// ============================================================================


// ============================================================================
// FIX #4 (P0): accessSharedFile — use storageProvider instead of hardcoded path
// ============================================================================

// ---- FIND THIS in accessSharedFile() method: ----

// BEFORE:
/*
    const uploadDir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
    const filePath = path.join(uploadDir, share.file_path);
*/

// AFTER:
/*
    const service = getFileAttachmentService();
    const filePath = service.storageProvider.getFullPath(share.file_path);
*/

// NOTE: Make sure getFileAttachmentService is imported at the top of the controller.
// It should already be there since other methods use it. Check with:
//   grep -n "getFileAttachmentService" src/controllers/file-attachment.controller.js


// ============================================================================
// FIX #6 (P1): Sanitize error messages in ALL catch blocks
// ============================================================================
// 
// This fix needs to be applied to EVERY catch block in the controller.
// There are ~17 controller methods, each with at least one catch block.
//
// APPROACH: Create a shared error sanitizer at the top of the file,
//           then use it in every catch block.
// ============================================================================

// ---- ADD THIS at the top of the controller file (after imports): ----

/*
// --- Error Response Sanitizer ---
// Prevents leaking PostgreSQL internals (constraint names, table structure) to API consumers
function sanitizeErrorResponse(error, defaultCode = 'INTERNAL_ERROR') {
  // Known client errors — safe to expose message
  const clientErrorPatterns = [
    { pattern: /quota/i, code: 'QUOTA_ERROR', status: 400 },
    { pattern: /duplicate/i, code: 'DUPLICATE_ERROR', status: 409 },
    { pattern: /not found/i, code: 'NOT_FOUND', status: 404 },
    { pattern: /not allowed/i, code: 'NOT_ALLOWED', status: 403 },
    { pattern: /required/i, code: 'VALIDATION_ERROR', status: 400 },
    { pattern: /invalid.*format/i, code: 'VALIDATION_ERROR', status: 400 },
    { pattern: /file type/i, code: 'INVALID_FILE_TYPE', status: 400 },
    { pattern: /too large/i, code: 'FILE_TOO_LARGE', status: 400 },
    { pattern: /expired/i, code: 'EXPIRED', status: 410 },
    { pattern: /max.*download/i, code: 'MAX_DOWNLOADS_REACHED', status: 410 },
  ];

  for (const { pattern, code, status } of clientErrorPatterns) {
    if (pattern.test(error.message)) {
      return { status, code, message: error.message };
    }
  }

  // Everything else — hide internal details
  console.error(`[FileAttachment] Internal error:`, error.message, error.stack?.split('\n')[1]);
  return { 
    status: 500, 
    code: defaultCode, 
    message: 'An internal error occurred. Please try again or contact support.' 
  };
}
*/

// ---- THEN REPLACE every catch block pattern. ----
// 
// There are two common patterns in the controller. Replace both:
//
// PATTERN A (most methods):
// BEFORE:
/*
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({
        success: false,
        error: { code: 'UPLOAD_ERROR', message: error.message }
      });
    }
*/
// AFTER:
/*
    } catch (error) {
      const err = sanitizeErrorResponse(error, 'UPLOAD_ERROR');
      res.status(err.status).json({
        success: false,
        error: { code: err.code, message: err.message }
      });
    }
*/

// PATTERN B (some methods have inline status checks):
// BEFORE:
/*
    } catch (error) {
      console.error('Download error:', error);
      const status = error.message.includes('not found') ? 404 : 500;
      res.status(status).json({
        success: false,
        error: { code: 'DOWNLOAD_ERROR', message: error.message }
      });
    }
*/
// AFTER:
/*
    } catch (error) {
      const err = sanitizeErrorResponse(error, 'DOWNLOAD_ERROR');
      res.status(err.status).json({
        success: false,
        error: { code: err.code, message: err.message }
      });
    }
*/


// ============================================================================
// HERE IS THE COMPLETE LIST OF CATCH BLOCKS TO UPDATE:
// ============================================================================
// 
// Use this to find all of them:
//   grep -n "catch (error)" src/controllers/file-attachment.controller.js
//
// Expected methods with catch blocks:
//   1.  upload()           → code: 'UPLOAD_ERROR'
//   2.  uploadMultiple()   → code: 'MULTI_UPLOAD_ERROR'
//   3.  getById()          → code: 'FETCH_ERROR'
//   4.  list()             → code: 'LIST_ERROR'
//   5.  getByEntity()      → code: 'FETCH_ERROR'
//   6.  updateMetadata()   → code: 'UPDATE_ERROR'
//   7.  delete()           → code: 'DELETE_ERROR'
//   8.  download()         → code: 'DOWNLOAD_ERROR'
//   9.  preview()          → code: 'PREVIEW_ERROR'
//  10.  uploadVersion()    → code: 'VERSION_ERROR'
//  11.  getVersionHistory()→ code: 'VERSION_HISTORY_ERROR'
//  12.  createShare()      → code: 'SHARE_ERROR'
//  13.  accessSharedFile() → code: 'SHARE_ACCESS_ERROR'
//  14.  revokeShare()      → code: 'REVOKE_ERROR'
//  15.  getQuota()         → code: 'QUOTA_ERROR'
//  16.  updateQuota()      → code: 'QUOTA_UPDATE_ERROR'
//  17.  getStorageStats()  → code: 'STATS_ERROR'
//
// Each one: replace the catch body with sanitizeErrorResponse(error, 'CODE_HERE')
// ============================================================================
