// ============================================================================
// QAssure File Attachment Service — Routes with UUID Validation
// File: src/routes/file-attachment.routes.js
// ============================================================================
//
// CHANGES:
// 1. Import validateUUID middleware
// 2. Add validateUUID('id') to every /:id route
// 3. Add validateUUID('shareId') to the /shares/:shareId route
// 4. Add validateUUID('entity_id') to the /entity/:entity_type/:entity_id route
// ============================================================================

// ---- ADD THIS IMPORT at the top (after other middleware imports): ----
// const { validateUUID } = require('../middleware/validate-uuid.middleware');

// ---- THEN UPDATE ROUTES: ----
// Below shows the COMPLETE route registration with validateUUID added.
// Lines marked with  // ← ADDED  show where validateUUID was inserted.

/*
const express = require('express');
const router = express.Router();
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { validateUUID } = require('../middleware/validate-uuid.middleware');  // ← NEW IMPORT
const controller = require('../controllers/file-attachment.controller');

// Multer config (unchanged)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (req, file, cb) => {
    const blocked = ['.exe', '.bat', '.cmd', '.sh', '.ps1', '.msi', '.dll', '.com', '.scr', '.vbs', '.js'];
    const ext = '.' + file.originalname.split('.').pop().toLowerCase();
    if (blocked.includes(ext)) {
      return cb(new Error(`File type ${ext} is not allowed`), false);
    }
    cb(null, true);
  }
});

// ============================================================
// PUBLIC ROUTES (no auth)
// ============================================================
router.get('/shared/:token', controller.accessSharedFile);
// Note: :token is NOT a UUID — it's a random share token, so no validateUUID here

// ============================================================
// AUTHENTICATED ROUTES
// ============================================================

// --- Upload routes (no UUID params) ---
router.post('/upload',
  authenticate, authorize('files:write'),
  upload.single('file'),
  controller.upload
);

router.post('/upload/multiple',
  authenticate, authorize('files:write'),
  upload.array('files', 10),
  controller.uploadMultiple
);

// --- List / Stats / Quota (no UUID params) ---
router.get('/',
  authenticate, authorize('files:read'),
  controller.list
);

router.get('/stats',
  authenticate, authorize('files:read'),
  controller.getStorageStats
);

router.get('/quota',
  authenticate, authorize('files:read'),
  controller.getQuota
);

router.put('/quota',
  authenticate, authorize('files:admin'),
  controller.updateQuota
);

// --- Entity routes (entity_id is UUID) ---
router.get('/entity/:entity_type/:entity_id',
  authenticate, authorize('files:read'),
  validateUUID('entity_id'),                          // ← ADDED
  controller.getByEntity
);

// --- Single file routes (all take :id UUID) ---
router.get('/:id',
  authenticate, authorize('files:read'),
  validateUUID('id'),                                  // ← ADDED
  controller.getById
);

router.put('/:id',
  authenticate, authorize('files:write'),
  validateUUID('id'),                                  // ← ADDED
  controller.updateMetadata
);

router.delete('/:id',
  authenticate, authorize('files:write'),
  validateUUID('id'),                                  // ← ADDED
  controller.delete
);

router.get('/:id/download',
  authenticate, authorize('files:read'),
  validateUUID('id'),                                  // ← ADDED
  controller.download
);

router.get('/:id/preview',
  authenticate, authorize('files:read'),
  validateUUID('id'),                                  // ← ADDED
  controller.preview
);

router.post('/:id/versions',
  authenticate, authorize('files:write'),
  validateUUID('id'),                                  // ← ADDED
  upload.single('file'),
  controller.uploadVersion
);

router.get('/:id/versions',
  authenticate, authorize('files:read'),
  validateUUID('id'),                                  // ← ADDED
  controller.getVersionHistory
);

router.post('/:id/share',
  authenticate, authorize('files:write'),
  validateUUID('id'),                                  // ← ADDED
  controller.createShare
);

// --- Share management (shareId is UUID) ---
router.delete('/shares/:shareId',
  authenticate, authorize('files:write'),
  validateUUID('shareId'),                             // ← ADDED
  controller.revokeShare
);

module.exports = router;
*/

// ============================================================================
// TOTAL CHANGES: 11 routes now have UUID validation
// Routes WITHOUT validation (by design):
//   - GET /shared/:token  → token is not UUID, it's a random string
//   - POST /upload        → no :id param
//   - POST /upload/multiple → no :id param
//   - GET /               → no :id param
//   - GET /stats          → no :id param
//   - GET /quota          → no :id param
//   - PUT /quota          → no :id param
// ============================================================================
