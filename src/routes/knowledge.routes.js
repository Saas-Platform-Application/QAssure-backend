/**
 * Knowledge Routes - QAssure Platform
 * Routes for RAG/Knowledge Base endpoints
 */
const express = require('express');
const router = express.Router();
const multer = require('multer');
const knowledgeController = require('../controllers/knowledge.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'text/plain',
      'text/markdown',
      'application/json',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  }
});

// All routes require authentication
router.use(authenticate);
router.use(tenantContext);

// ==================== Collections ====================

// Create collection
router.post('/collections',
  authorize('ai:create'),
  knowledgeController.createCollection
);

// List collections
router.get('/collections',
  authorize('ai:read'),
  knowledgeController.listCollections
);

// Get collection by ID
router.get('/collections/:id',
  authorize('ai:read'),
  knowledgeController.getCollection
);

// Update collection
router.put('/collections/:id',
  authorize('ai:update'),
  knowledgeController.updateCollection
);

// Delete collection
router.delete('/collections/:id',
  authorize('ai:delete'),
  knowledgeController.deleteCollection
);

// List documents in collection
router.get('/collections/:collectionId/documents',
  authorize('ai:read'),
  knowledgeController.listDocuments
);

// ==================== Documents ====================

// Upload document
router.post('/documents',
  authorize('ai:create'),
  upload.single('file'),
  knowledgeController.uploadDocument
);

// Get document status
router.get('/documents/:id/status',
  authorize('ai:read'),
  knowledgeController.getDocumentStatus
);

// Delete document
router.delete('/documents/:id',
  authorize('ai:delete'),
  knowledgeController.deleteDocument
);

// ==================== Search ====================

// Semantic search
router.post('/search',
  authorize('ai:read'),
  knowledgeController.search
);

// Search with context (RAG)
router.post('/search/context',
  authorize('ai:read'),
  knowledgeController.searchWithContext
);
// LTTS-style RAG: retrieve + Mistral answer + Qwen confidence in one call
router.post('/rag-answer',
  authorize('ai:read'),
  knowledgeController.ragAnswer
);

// List search history
router.get('/search/history',
  authorize('ai:read'),
  knowledgeController.listSearchHistory
);

// Get search history by ID
router.get('/search/history/:id',
  authorize('ai:read'),
  knowledgeController.getSearchHistoryById
);

// ==================== Stats ====================

// Get vector store stats
router.get('/stats',
  authorize('ai:read'),
  knowledgeController.getStats
);

module.exports = router;
