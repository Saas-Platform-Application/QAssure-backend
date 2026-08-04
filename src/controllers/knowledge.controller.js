/**
 * Knowledge Controller - QAssure Platform
 * HTTP handlers for RAG/Knowledge Base endpoints
 */
const { getKnowledgeService } = require("../services/knowledge.service");

const knowledgeService = getKnowledgeService();

// ==================== Collections ====================

/**
 * Create collection
 * POST /api/v1/ai/knowledge/collections
 */
const createCollection = async (req, res) => {
  try {
    const { name, description, metadata, provider, embeddingModel, processingMode } = req.body;

    if (!name) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "Collection name is required",
        },
      });
    }
    if (processingMode && !["text", "multimodal"].includes(processingMode)) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: "processingMode must be one of: text, multimodal",
        },
      });
    }

    const collection = await knowledgeService.createCollection(
      { name, description, metadata, provider, embeddingModel, processingMode },
      { tenantId: req.user?.tenantId, userId: req.user?.id },
    );

    res.status(201).json({ success: true, data: collection });
  } catch (error) {
    console.error(
      "[KnowledgeController] createCollection error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * List collections
 * GET /api/v1/ai/knowledge/collections
 */
const listCollections = async (req, res) => {
  try {
    const { page = 1, limit = 20, status } = req.query;

    const result = await knowledgeService.listCollections(req.user?.tenantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error(
      "[KnowledgeController] listCollections error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get collection
 * GET /api/v1/ai/knowledge/collections/:id
 */
const getCollection = async (req, res) => {
  try {
    const collection = await knowledgeService.getCollection(
      req.params.id,
      req.user?.tenantId,
    );

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Collection not found" },
      });
    }

    res.status(200).json({ success: true, data: collection });
  } catch (error) {
    console.error("[KnowledgeController] getCollection error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Update collection
 * PUT /api/v1/ai/knowledge/collections/:id
 */
const updateCollection = async (req, res) => {
  try {
    const { name, description, metadata } = req.body;

    const collection = await knowledgeService.updateCollection(
      req.params.id,
      req.user?.tenantId,
      { name, description, metadata },
    );

    if (!collection) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Collection not found" },
      });
    }

    res.status(200).json({ success: true, data: collection });
  } catch (error) {
    console.error(
      "[KnowledgeController] updateCollection error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Delete collection
 * DELETE /api/v1/ai/knowledge/collections/:id
 */
const deleteCollection = async (req, res) => {
  try {
    await knowledgeService.deleteCollection(req.params.id, req.user?.tenantId, req.user?.id);
    res.status(200).json({ success: true, message: "Collection deleted" });
  } catch (error) {
    console.error(
      "[KnowledgeController] deleteCollection error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

// ==================== Documents ====================

/**
 * Upload document
 * POST /api/v1/ai/knowledge/documents
 */
const uploadDocument = async (req, res) => {
  try {
    const { collectionId, provider } = req.body;
    const file = req.file;

    if (!collectionId) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "collectionId is required" },
      });
    }

    if (!file) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "File is required" },
      });
    }

    const result = await knowledgeService.ingestDocument(
      collectionId,
      file.buffer,
      file.originalname,
      file.mimetype,
      { tenantId: req.user?.tenantId, userId: req.user?.id, provider },
    );

    res.status(202).json({ success: true, data: result });
  } catch (error) {
    console.error("[KnowledgeController] uploadDocument error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * List documents
 * GET /api/v1/ai/knowledge/collections/:collectionId/documents
 */
const listDocuments = async (req, res) => {
  try {
    const { collectionId } = req.params;
    const { page = 1, limit = 20, status } = req.query;

    const result = await knowledgeService.listDocuments(
      collectionId,
      req.user?.tenantId,
      { page: parseInt(page), limit: parseInt(limit), status },
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("[KnowledgeController] listDocuments error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get document status
 * GET /api/v1/ai/knowledge/documents/:id/status
 */
const getDocumentStatus = async (req, res) => {
  try {
    const document = await knowledgeService.getDocumentStatus(
      req.params.id,
      req.user?.tenantId,
    );

    if (!document) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Document not found" },
      });
    }

    res.status(200).json({ success: true, data: document });
  } catch (error) {
    console.error(
      "[KnowledgeController] getDocumentStatus error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Delete document
 * DELETE /api/v1/ai/knowledge/documents/:id
 */
const deleteDocument = async (req, res) => {
  try {
    await knowledgeService.deleteDocument(req.params.id, req.user?.tenantId, req.user?.id);
    res.status(200).json({ success: true, message: "Document deleted" });
  } catch (error) {
    console.error("[KnowledgeController] deleteDocument error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

// ==================== Search ====================

/**
 * Semantic search
 * POST /api/v1/ai/knowledge/search
 */
const search = async (req, res) => {
  try {
    const { query, collectionId, documentId, documentIds, provider, topK = 5, minScore = 0.25 } = req.body;

    // Support both documentId (singular) and documentIds (plural array)
    const effectiveDocumentIds = documentIds || (documentId ? [documentId] : null);

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "Search query is required" },
      });
    }

    const results = await knowledgeService.search(query, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      collectionId,
      documentIds: effectiveDocumentIds,
      provider,
      topK,
      minScore,
    });

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    console.error("[KnowledgeController] search error:", error.message);
    
    if (error.message.includes("Collection not found")) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: error.message },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Search with context (for RAG)
 * POST /api/v1/ai/knowledge/search/context
 */
const searchWithContext = async (req, res) => {
  try {
    const { query, collectionId, documentId, documentIds, provider, topK = 5, minScore = 0.25 } = req.body;

    // Support both documentId (singular) and documentIds (plural array)
    const effectiveDocumentIds = documentIds || (documentId ? [documentId] : null);

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "Search query is required" },
      });
    }

    const result = await knowledgeService.searchWithContext(query, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      collectionId,
      documentIds: effectiveDocumentIds,
      provider,
      topK,
      minScore,
    });

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error(
      "[KnowledgeController] searchWithContext error:",
      error.message,
    );
    
    if (error.message.includes("Collection not found")) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: error.message },
      });
    }

    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * List search history
 * GET /api/v1/ai/knowledge/search/history
 */
const listSearchHistory = async (req, res) => {
  try {
    const { page = 1, limit = 20, collectionId, documentId } = req.query;

    const result = await knowledgeService.listSearchHistory(req.user?.tenantId, {
      page: parseInt(page),
      limit: parseInt(limit),
      collectionId,
      documentId,
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error("[KnowledgeController] listSearchHistory error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get search history by ID
 * GET /api/v1/ai/knowledge/search/history/:id
 */
const getSearchHistoryById = async (req, res) => {
  try {
    const history = await knowledgeService.getSearchHistoryById(
      req.params.id,
      req.user?.tenantId,
    );

    if (!history) {
      return res.status(404).json({
        success: false,
        error: { code: "NOT_FOUND", message: "Search history not found" },
      });
    }

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    console.error(
      "[KnowledgeController] getSearchHistoryById error:",
      error.message,
    );
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

/**
 * Get vector store stats
 * GET /api/v1/ai/knowledge/stats
 */
const getStats = async (req, res) => {
  try {
    const {
      getVectorStoreService,
    } = require("../infrastructure/ai/vector-store.service");
    const vectorStore = getVectorStoreService();
    await vectorStore.initialize();

    const stats = await vectorStore.getStats();
    res.status(200).json({ success: true, data: stats });
  } catch (error) {
    console.error("[KnowledgeController] getStats error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

const ragAnswer = async (req, res) => {
  try {
    const {
      query,
      collectionId,
      documentIds,
      conversationHistory,
      answerProvider,
      answerModel,
      confidenceProvider,
      confidenceModel,
      topK,
      minScore,
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: { code: "INVALID_INPUT", message: "query is required" },
      });
    }

    const result = await knowledgeService.ragAnswer(query, {
      tenantId: req.user?.tenantId,
      userId: req.user?.id,
      collectionId,
      documentIds,
      conversationHistory,
      answerProvider,
      answerModel,
      confidenceProvider,
      confidenceModel,
      topK,
      minScore,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("[KnowledgeController] ragAnswer error:", error.message);
    res.status(500).json({
      success: false,
      error: { code: "SERVER_ERROR", message: error.message },
    });
  }
};

module.exports = {
  createCollection,
  ragAnswer,
  listCollections,
  getCollection,
  updateCollection,
  deleteCollection,
  uploadDocument,
  listDocuments,
  getDocumentStatus,
  deleteDocument,
  search,
  searchWithContext,
  listSearchHistory,
  getSearchHistoryById,
  getStats,
};
