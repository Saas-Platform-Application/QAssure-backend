/**
 * Knowledge Base Service - QAssure Platform
 * Manages document ingestion, chunking, embedding, and search
 *
 * Multi-tenancy: All DB queries enforce tenant_id. Vector namespaces
 * use {tenantId}_{collectionId} pattern for strict tenant isolation.
 */
const crypto = require("crypto");
const { getAIGateway } = require("../infrastructure/ai/gateway.service");
const database = require("../config/database");
const {
  getEmbeddingService,
} = require("../infrastructure/ai/embedding.service");
const {
  getDocumentProcessor,
} = require("../infrastructure/ai/document.processor");
const { getChunkerService } = require("../infrastructure/ai/chunker.service");
const {
  getVectorStoreService,
} = require("../infrastructure/ai/vector-store.service");

const { getAuditService } = require("./audit.service");

// Embedding batch size — OpenAI limit is 2048 inputs per request.
// Use conservative limit to avoid token ceiling on large chunks.
const EMBEDDING_BATCH_SIZE = 100;

// Pinecone metadata value limit is 40KB. Store enough content for
// meaningful RAG context while staying within limits.
const METADATA_CONTENT_LIMIT = 3600;

class KnowledgeService {
  constructor() {
    this.embeddingService = getEmbeddingService();
    this.documentProcessor = getDocumentProcessor();
    this.chunkerService = getChunkerService();
    this.vectorStore = getVectorStoreService();
  }

  /**
   * Initialize all services
   */
  async initialize() {
    await this.embeddingService.initialize();
    await this.vectorStore.initialize();
    console.log("[KnowledgeService] ✅ Initialized");
  }

  // ==================== Collections ====================

  /**
   * Create a knowledge collection
   */
  async createCollection(data, context = {}) {
    const { tenantId, userId } = context;
    const {
      name,
      description,
      metadata = {},
      provider,
      embeddingModel,
      processingMode = "text",
    } = data;

    const id = crypto.randomUUID();

    const query = `
      INSERT INTO knowledge_collections (
        id, tenant_id, name, description, metadata,
        document_count, chunk_count, status,
        embedding_model, embedding_dimension, embedding_provider,
        processing_mode,
        created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 0, 0, 'active', $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `;
    // Resolve tenant's embedding config for this collection
    const embeddingConfig = await this._resolveEmbeddingConfig(tenantId, {
      provider,
      model: embeddingModel,
    });
    const result = await database.query(query, [
      id,
      tenantId,
      name,
      description,
      JSON.stringify(metadata),
      embeddingConfig.model,
      embeddingConfig.dimension,
      embeddingConfig.provider,
      processingMode,
      userId,
    ]);

    setImmediate(async () => {
      try {
        await getAuditService().log({
          action: "CREATE",
          user_id: userId,
          tenant_id: tenantId,
          resource_type: "knowledge",
          resource_id: id,
          response_status: 201,
          metadata: { collection_name: name },
        });
      } catch (e) {}
    });

    return this._formatCollection(result.rows[0]);
  }

  /**
   * List collections
   */
  async listCollections(tenantId, options = {}) {
    const { page = 1, limit = 20, status = "active" } = options;
    const offset = (page - 1) * limit;

    const query = `
      SELECT * FROM knowledge_collections
      WHERE tenant_id = $1 AND status = $2
      ORDER BY created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await database.query(query, [
      tenantId,
      status,
      limit,
      offset,
    ]);

    const countResult = await database.query(
      "SELECT COUNT(*) FROM knowledge_collections WHERE tenant_id = $1 AND status = $2",
      [tenantId, status],
    );

    return {
      data: result.rows.map((r) => this._formatCollection(r)),
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    };
  }

  /**
   * Get collection by ID
   */
  async getCollection(collectionId, tenantId) {
    const query = `
      SELECT * FROM knowledge_collections
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await database.query(query, [collectionId, tenantId]);

    if (result.rows.length === 0) return null;
    return this._formatCollection(result.rows[0]);
  }

  /**
   * Update collection
   */
  async updateCollection(collectionId, tenantId, data) {
    const { name, description, metadata } = data;
    const updates = [];
    const params = [];
    let paramIndex = 0;

    if (name) {
      paramIndex++;
      updates.push(`name = $${paramIndex}`);
      params.push(name);
    }

    if (description !== undefined) {
      paramIndex++;
      updates.push(`description = $${paramIndex}`);
      params.push(description);
    }

    if (metadata) {
      paramIndex++;
      updates.push(`metadata = $${paramIndex}`);
      params.push(JSON.stringify(metadata));
    }

    if (updates.length === 0) {
      return this.getCollection(collectionId, tenantId);
    }

    updates.push("updated_at = NOW()");
    params.push(collectionId, tenantId);

    const query = `
      UPDATE knowledge_collections
      SET ${updates.join(", ")}
      WHERE id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2}
      RETURNING *
    `;

    const result = await database.query(query, params);
    return result.rows[0] ? this._formatCollection(result.rows[0]) : null;
  }

  /**
   * Delete collection
   */
  async deleteCollection(collectionId, tenantId, userId) {
    // Fetch collection so we know its embedding dimension (needed for multi-index routing)
    const collection = await this.getCollection(collectionId, tenantId);
    const dimension = collection?.embeddingDimension || null;

    // Delete vectors from vector store
    const namespace = `${tenantId}_${collectionId}`;
    await this.vectorStore.deleteAll(namespace, dimension);

    // Delete search history
    await database.query(
      "DELETE FROM knowledge_search_history WHERE collection_id = $1 AND tenant_id = $2",
      [collectionId, tenantId],
    );

    // Delete documents
    await database.query(
      "DELETE FROM knowledge_documents WHERE collection_id = $1 AND tenant_id = $2",
      [collectionId, tenantId],
    );

    // Delete collection
    await database.query(
      "DELETE FROM knowledge_collections WHERE id = $1 AND tenant_id = $2",
      [collectionId, tenantId],
    );

    setImmediate(async () => {
      try {
        await getAuditService().log({
          action: "DELETE",
          user_id: userId,
          tenant_id: tenantId,
          resource_type: "knowledge",
          resource_id: collectionId,
          response_status: 200,
          metadata: { collection_id: collectionId },
        });
      } catch (e) {}
    });

    return { success: true };
  }

  // ==================== Documents ====================

  /**
   * Ingest a document
   */
  async ingestDocument(
    collectionId,
    fileBuffer,
    fileName,
    mimeType,
    context = {},
  ) {
    const { tenantId, userId, provider } = context;

    // Verify collection exists and belongs to this tenant
    const collection = await this.getCollection(collectionId, tenantId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const documentId = crypto.randomUUID();

    // Create document record with processing status
    await database.query(
      `
      INSERT INTO knowledge_documents (
        id, collection_id, tenant_id, file_name, mime_type,
        file_size, status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'processing', $7, NOW(), NOW())
    `,
      [
        documentId,
        collectionId,
        tenantId,
        fileName,
        mimeType,
        fileBuffer.length,
        userId,
      ],
    );

    setImmediate(async () => {
      try {
        await getAuditService().log({
          action: "CREATE",
          user_id: userId,
          tenant_id: tenantId,
          resource_type: "knowledge",
          resource_id: documentId,
          response_status: 201,
          metadata: {
            collection_id: collectionId,
            file_name: fileName,
            mime_type: mimeType,
          },
        });
      } catch (e) {}
    });

    // Process asynchronously, using collection's specific embedding settings
    this._processDocument(
      documentId,
      collectionId,
      tenantId,
      fileBuffer,
      fileName,
      mimeType,
      {
        provider: collection.embeddingProvider,
        model: collection.embeddingModel,
        dimension: collection.embeddingDimension,
        processingMode: collection.processingMode,
      },
    ).catch((err) => {
      console.error(
        `[KnowledgeService] Document processing failed: ${err.message}`,
      );
      this._updateDocumentStatus(documentId, "failed", err.message);
    });

    return {
      id: documentId,
      fileName,
      status: "processing",
      message: "Document queued for processing",
    };
  }

  /**
   * Process document (async)
   */
  async _processDocument(
    documentId,
    collectionId,
    tenantId,
    fileBuffer,
    fileName,
    mimeType,
    options = {},
  ) {
    const { provider, model, dimension, processingMode } = options;
    try {
      // Extract text (branch on collection.processing_mode)
      let text, metadata, wordCount;
      if (processingMode === "multimodal") {
        const r = await this.documentProcessor.processBufferMultimodal(
          fileBuffer,
          mimeType,
          fileName,
          { tenantId },
        );
        text = r.text;
        metadata = r.metadata;
        wordCount = r.wordCount;
      } else {
        const r = await this.documentProcessor.processBuffer(
          fileBuffer,
          mimeType,
          fileName,
        );
        text = r.text;
        metadata = r.metadata;
        wordCount = r.wordCount;
      }

      if (!text || text.length === 0) {
        throw new Error("No text extracted from document");
      }

      // Chunk text
      const chunks = this.chunkerService.chunkByParagraphs(text, {
        chunkSize: 512,
      });

      if (chunks.length === 0) {
        throw new Error("No chunks created from document");
      }

      // FIX: Generate embeddings in batches to avoid OpenAI API limits
      const allEmbeddings = [];
      let finalProvider = provider;
      let finalModel = null;

      for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
        const batchTexts = chunks
          .slice(i, i + EMBEDDING_BATCH_SIZE)
          .map((c) => c.content);
        const embedRes = await this.embeddingService.embedBatch(batchTexts, {
          tenantId,
          provider,
          model,
        });
        allEmbeddings.push(...embedRes.embeddings);
        finalProvider = embedRes.provider;
        finalModel = embedRes.model;
      }

      // Prepare vectors for storage
      const namespace = `${tenantId}_${collectionId}`;
      const vectors = chunks.map((chunk, index) => ({
        id: `${documentId}_${index}`,
        embedding: allEmbeddings[index],
        metadata: {
          documentId,
          collectionId,
          tenantId,
          fileName,
          chunkIndex: index,
          totalChunks: chunks.length,
          // FIX: Store more content for better RAG context (Pinecone metadata limit is 40KB)
          content: chunk.content.substring(0, METADATA_CONTENT_LIMIT),
          charCount: chunk.charCount,
        },
      }));

      // Store in vector database (VectorStore already batches at 100 per Pinecone request)
      // Pass dimension so multi-index routing picks / auto-creates the correct Pinecone index
      const upsertRes = await this.vectorStore.upsert(
        vectors,
        namespace,
        dimension,
      );

      // Enrich metadata with AI info and vector routing info
      const enrichedMetadata = {
        ...metadata,
        ai: {
          provider: finalProvider,
          model: finalModel,
        },
        vector: {
          indexName: upsertRes.indexName,
          indexHost: upsertRes.indexHost || null,
          namespace: namespace,
        },
      };

      // FIX: Add tenant_id filter for defense-in-depth
      await database.query(
        `
        UPDATE knowledge_documents
        SET status = 'completed',
            word_count = $1,
            chunk_count = $2,
            metadata = $3,
            processed_at = NOW(),
            updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5
      `,
        [
          wordCount,
          chunks.length,
          JSON.stringify(enrichedMetadata),
          documentId,
          tenantId,
        ],
      );

      // FIX: Add tenant_id filter for defense-in-depth
      await database.query(
        `
        UPDATE knowledge_collections
        SET document_count = document_count + 1,
            chunk_count = chunk_count + $1,
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `,
        [chunks.length, collectionId, tenantId],
      );

      console.log(
        `[KnowledgeService] Document processed: ${fileName} (${chunks.length} chunks, ${allEmbeddings.length} embeddings)`,
      );
    } catch (error) {
      await this._updateDocumentStatus(documentId, "failed", error.message);
      throw error;
    }
  }

  /**
   * Update document status
   */
  async _updateDocumentStatus(documentId, status, errorMessage = null) {
    await database.query(
      `
      UPDATE knowledge_documents
      SET status = $1, error_message = $2, updated_at = NOW()
      WHERE id = $3
    `,
      [status, errorMessage, documentId],
    );
  }

  /**
   * Get document status
   */
  async getDocumentStatus(documentId, tenantId) {
    const query = `
      SELECT id, file_name, mime_type, file_size, status,
             word_count, chunk_count, error_message,
             created_at, processed_at
      FROM knowledge_documents
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await database.query(query, [documentId, tenantId]);
    return result.rows[0] || null;
  }

  /**
   * List documents in a collection
   */
  async listDocuments(collectionId, tenantId, options = {}) {
    const { page = 1, limit = 20, status } = options;
    const offset = (page - 1) * limit;

    // Fetch collection info to get embedding dimension and namespace
    const collection = await this.getCollection(collectionId, tenantId);
    if (!collection) {
      throw new Error("Collection not found");
    }

    const namespace = `${tenantId}_${collectionId}`;
    let indexHost = null;

    try {
      // Resolve the actual Pinecone index host for this collection's dimension
      const indexInfo = await this.vectorStore._getIndexForDimension(
        collection.embeddingDimension,
      );
      indexHost = indexInfo.host;
    } catch (err) {
      console.warn(
        `[KnowledgeService] Could not resolve index host for collection ${collectionId}:`,
        err.message,
      );
    }

    let query = `
      SELECT * FROM knowledge_documents
      WHERE collection_id = $1 AND tenant_id = $2
    `;
    const params = [collectionId, tenantId];

    if (status) {
      query += ` AND status = $3`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await database.query(query, params);

    const countQuery = `
      SELECT COUNT(*) FROM knowledge_documents
      WHERE collection_id = $1 AND tenant_id = $2
      ${status ? "AND status = $3" : ""}
    `;
    const countResult = await database.query(
      countQuery,
      status ? [collectionId, tenantId, status] : [collectionId, tenantId],
    );
    const total = parseInt(countResult.rows[0].count);

    // Efficiently resolve hosts for different models found in the documents
    const modelHosts = new Map();
    for (const doc of result.rows) {
      const model = doc.metadata?.ai?.model;
      if (model && !modelHosts.has(model)) {
        const dim = this._getDimensionForModel(model);
        if (dim) {
          try {
            const idxInfo = await this.vectorStore._getIndexForDimension(dim);
            console.debug(
              `[KnowledgeService] Resolved host for model ${model}:`,
              idxInfo.host,
            );
            modelHosts.set(model, idxInfo.host);
          } catch (e) {
            console.warn(
              `[KnowledgeService] Failed to resolve host for model ${model}:`,
              e.message,
            );
          }
        }
      }
    }

    // Enrich each document with Pinecone metadata
    const enrichedData = result.rows.map((doc) => {
      const chunkCount = doc.chunk_count || 0;
      const chunkIds = [];
      for (let i = 0; i < chunkCount; i++) {
        chunkIds.push(`${doc.id}_${i}`);
      }

      // Fallback priority:
      // 1. Captured host in metadata.vector.indexHost
      // 2. Resolved host for the document's specific model
      // 3. Collection-level resolved host
      const effectiveHost =
        doc.metadata?.vector?.indexHost ||
        modelHosts.get(doc.metadata?.ai?.model) ||
        indexHost;

      return {
        ...doc,
        chunk_ids: chunkIds,
        namespace: doc.metadata?.vector?.namespace || namespace,
        indexHost: effectiveHost,
      };
    });

    return {
      data: enrichedData,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Delete document
   */
  async deleteDocument(documentId, tenantId, userId) {
    // Get document info
    const doc = await this.getDocumentStatus(documentId, tenantId);
    if (!doc) {
      throw new Error("Document not found");
    }

    // FIX: Add tenant_id filter for defense-in-depth
    // Join to collections so we also get the embedding_dimension (for multi-index routing)
    const collection = await database.query(
      `SELECT d.collection_id, c.embedding_dimension
       FROM knowledge_documents d
       JOIN knowledge_collections c ON c.id = d.collection_id
       WHERE d.id = $1 AND d.tenant_id = $2`,
      [documentId, tenantId],
    );

    if (collection.rows[0]) {
      const collectionId = collection.rows[0].collection_id;
      const dimension = collection.rows[0].embedding_dimension || null;
      const namespace = `${tenantId}_${collectionId}`;

      // Delete all vectors for this document
      // FIX: Use explicit IDs instead of deleteByFilter to support Pinecone Serverless
      const chunkCount = doc.chunk_count || 0;
      const ids = [];
      for (let i = 0; i < chunkCount; i++) {
        ids.push(`${documentId}_${i}`);
      }

      if (ids.length > 0) {
        await this.vectorStore.delete(ids, namespace, dimension);
      }

      // FIX: Add tenant_id filter for defense-in-depth
      await database.query(
        `
        UPDATE knowledge_collections
        SET document_count = GREATEST(document_count - 1, 0),
            chunk_count = GREATEST(chunk_count - $1, 0),
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
      `,
        [doc.chunk_count || 0, collectionId, tenantId],
      );
    }

    // Delete document record
    await database.query(
      "DELETE FROM knowledge_documents WHERE id = $1 AND tenant_id = $2",
      [documentId, tenantId],
    );

    setImmediate(async () => {
      try {
        await getAuditService().log({
          action: "DELETE",
          user_id: userId,
          tenant_id: tenantId,
          resource_type: "knowledge",
          resource_id: documentId,
          response_status: 200,
          metadata: { document_id: documentId },
        });
      } catch (e) {}
    });

    return { success: true };
  }

  // ==================== Search ====================

  /**
   * Semantic search across collections.
   *
   * Single-collection:  uses that collection's (provider, model, dimension).
   * Cross-collection:   collections may have different embeddings / dimensions.
   *                     Groups collections by (provider, model), generates one
   *                     embedding per group, queries each collection with the
   *                     embedding whose dimension matches its own index, then
   *                     merges and sorts by score.
   */
  async search(query, context = {}) {
    const {
      tenantId,
      collectionId,
      documentIds,
      provider,
      topK = 5,
      minScore = 0.25,
    } = context;

    // ==================== Single-collection search ====================
    if (collectionId) {
      const collection = await this.getCollection(collectionId, tenantId);
      if (!collection) {
        throw new Error("Collection not found or access denied");
      }
      const finalProvider = collection.embeddingProvider || provider;
      const finalModel = collection.embeddingModel || context.model;
      const finalDimension = collection.embeddingDimension || null;

      const embedResult = await this.embeddingService.embed(query, {
        tenantId,
        provider: finalProvider,
        model: finalModel,
      });

      const namespace = `${tenantId}_${collectionId}`;

      // Attempt 1: Search within specific documents if provided
      let searchOutput = { results: [], indexHost: null };
      if (documentIds && documentIds.length > 0) {
        searchOutput = await this.vectorStore.query(embedResult.embedding, {
          topK,
          namespace,
          minScore,
          includeMetadata: true,
          includeValues: true,
          dimension: finalDimension,
          filter: { documentId: { $in: documentIds } },
        });
      }

      // Attempt 2: Fallback to entire collection if no specific results found
      if (searchOutput.results.length === 0) {
        searchOutput = await this.vectorStore.query(embedResult.embedding, {
          topK,
          namespace,
          minScore,
          includeMetadata: true,
          includeValues: true,
          dimension: finalDimension,
          filter: null, // Search entire collection
        });
      }

      const { results, indexHost } = searchOutput;

      const response = {
        results: this._formatSearchResults(results, namespace),
        metadata: {
          provider: embedResult.provider,
          model: embedResult.model,
          indexHost,
          fallbackUsed: embedResult.fallbackUsed || false,
        },
      };

      // Store in history
      setImmediate(async () => {
        try {
          await this._storeSearchHistory({
            tenantId,
            userId: context.userId,
            query,
            collectionId,
            documentIds,
            results: response.results,
            metadata: response.metadata,
            searchType: "semantic",
          });
        } catch (err) {
          console.error(
            "[KnowledgeService] Failed to store search history:",
            err.message,
          );
        }
      });

      return response;
    }

    // ==================== Cross-collection search ====================
    // Pull all active collections WITH their embedding config
    const collectionsResult = await database.query(
      `SELECT id, embedding_provider, embedding_model, embedding_dimension
       FROM knowledge_collections
       WHERE tenant_id = $1 AND status = 'active'`,
      [tenantId],
    );

    if (collectionsResult.rows.length === 0) {
      // No collections — still generate an embedding so metadata is populated
      const embedResult = await this.embeddingService.embed(query, {
        tenantId,
        provider,
        model: context.model,
      });
      return {
        results: [],
        metadata: {
          provider: embedResult.provider,
          model: embedResult.model,
          fallbackUsed: embedResult.fallbackUsed || false,
        },
      };
    }

    // Group collections by (provider, model) so we can embed once per group
    const groups = new Map();
    for (const row of collectionsResult.rows) {
      const key = `${row.embedding_provider || "__default__"}::${row.embedding_model || "__default__"}`;
      if (!groups.has(key)) {
        groups.set(key, {
          provider: row.embedding_provider,
          model: row.embedding_model,
          dimension: row.embedding_dimension,
          collectionIds: [],
        });
      }
      groups.get(key).collectionIds.push(row.id);
    }

    // For each group: embed the query, then query each of its collections in parallel
    let metadata = { provider: null, model: null, fallbackUsed: false };
    const allResults = [];

    for (const [key, group] of groups) {
      let groupEmbedding;
      try {
        const embedRes = await this.embeddingService.embed(query, {
          tenantId,
          provider: group.provider || provider,
          model: group.model || context.model,
        });
        groupEmbedding = embedRes.embedding;
        // Return metadata reflects the first group's embedding provider (primary)
        if (metadata.provider === null) {
          metadata = {
            provider: embedRes.provider,
            model: embedRes.model,
            fallbackUsed: embedRes.fallbackUsed || false,
          };
        }
      } catch (err) {
        console.warn(
          `[KnowledgeService] Embedding failed for group ${key}: ${err.message}`,
        );
        continue; // skip this group's collections
      }

      const groupPromises = group.collectionIds.map((id) => {
        const namespace = `${tenantId}_${id}`;
        return this.vectorStore
          .query(groupEmbedding, {
            topK,
            namespace,
            minScore,
            includeMetadata: true,
            includeValues: true,
            dimension: group.dimension,
            filter:
              documentIds && documentIds.length > 0
                ? { documentId: { $in: documentIds } }
                : null,
          })
          .then(({ results: matches, indexHost }) => ({
            matches: matches.map((match) => ({ ...match, namespace })),
            indexHost,
          }))
          .catch((err) => {
            console.warn(
              `[KnowledgeService] Search failed for namespace ${namespace}: ${err.message}`,
            );
            return { matches: [], indexHost: null };
          });
      });

      const groupResults = await Promise.all(groupPromises);
      for (const { matches, indexHost } of groupResults) {
        allResults.push(...matches);
        if (indexHost) {
          if (!metadata.indexHosts) metadata.indexHosts = [];
          if (!metadata.indexHosts.includes(indexHost)) {
            metadata.indexHosts.push(indexHost);
          }
        }
      }
    }

    // Merge, sort by score descending, take topK across all groups
    const merged = allResults
      .sort((a, b) => (b.score || 0) - (a.score || 0))
      .slice(0, topK);

    const response = {
      results: this._formatSearchResults(merged),
      metadata: {
        ...metadata,
        indexHost: metadata.indexHosts
          ? metadata.indexHosts.join(", ")
          : metadata.indexHost,
      },
    };

    // Store in history
    setImmediate(async () => {
      try {
        await this._storeSearchHistory({
          tenantId,
          userId: context.userId,
          query,
          collectionId,
          documentIds,
          results: response.results,
          metadata: response.metadata,
          searchType: "semantic",
        });
      } catch (err) {
        console.error(
          "[KnowledgeService] Failed to store search history:",
          err.message,
        );
      }
    });

    return response;
  }

  /**
   * Search with context for RAG
   */
  async searchWithContext(query, context = {}) {
    const searchResult = await this.search(query, context);
    const { results } = searchResult;

    // Combine top results into context
    const contextText = results
      .map((r, i) => `[Source ${i + 1}: ${r.fileName}]\n${r.content}`)
      .join("\n\n---\n\n");

    const response = {
      results,
      context: contextText,
      sourceCount: results.length,
      metadata: searchResult.metadata,
    };

    // Store in history
    setImmediate(async () => {
      try {
        await this._storeSearchHistory({
          tenantId: context.tenantId,
          userId: context.userId,
          query,
          collectionId: context.collectionId,
          documentIds: context.documentIds,
          results: response.results,
          context: response.context,
          metadata: response.metadata,
          searchType: "context",
        });
      } catch (err) {
        console.error(
          "[KnowledgeService] Failed to store context search history:",
          err.message,
        );
      }
    });

    return response;
  }

  /**
   * LTTS-style RAG: retrieve -> generate (Mistral) -> score (Qwen).
   * Returns answer + confidence + sources in one call.
   *
   * context.answerProvider     - provider for answer generation (e.g. "mistral")
   * context.confidenceProvider - provider for confidence scoring (e.g. "qwen")
   * context.conversationHistory - optional [{ role, content }] previous turns (REQ 2)
   * context.documentIds        - priority docs (REQ 1: searched first, falls back)
   */
  /**
   * Hybrid retrieval: dense candidates from the vector index + BM25 rerank
   * over their content + Reciprocal Rank Fusion. Catches both semantic
   * matches (paraphrases, synonyms) and keyword matches (codes, abbreviations
   * such as CAPA or SOP-1234) that pure semantic similarity alone misses.
   *
   * Returns the same shape as searchWithContext so the caller is unchanged.
   */
  async _hybridRetrieve(query, options = {}) {
    const { tenantId, collectionId, documentIds, topK = 5, userId } = options;

    // Fetch a generous dense candidate pool with no similarity floor.
    const CAND = Math.max(topK * 10, 30);
    const dense = await this.searchWithContext(query, {
      tenantId,
      collectionId,
      documentIds,
      topK: CAND,
      minScore: 0,
      userId,
    });
    const candidates = dense.results || [];
    if (candidates.length === 0) return dense;

    // Tokenize: lowercase, split on non-alphanumeric, drop single-char tokens.
    const tokenize = (s) =>
      (s || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, " ")
        .split(/\s+/)
        .filter((t) => t.length > 1);

    const qTerms = tokenize(query);
    if (qTerms.length === 0) {
      // No usable keywords; return dense top-K as-is.
      const top = candidates.slice(0, topK);
      const context = top
        .map((c, i) => `[Source ${i + 1}: ${c.fileName}]\n${c.content}`)
        .join("\n\n---\n\n");
      return {
        results: top,
        context,
        sourceCount: top.length,
        metadata: { ...dense.metadata, retrieval: "dense_only_no_query_terms" },
      };
    }

    const docTokens = candidates.map((c) => tokenize(c.content));
    const N = docTokens.length;

    // Document frequency for each query term over the candidate pool.
    const df = {};
    for (const t of new Set(qTerms)) {
      df[t] = docTokens.reduce((n, d) => n + (d.includes(t) ? 1 : 0), 0);
    }
    const avgdl = docTokens.reduce((a, d) => a + d.length, 0) / Math.max(N, 1);

    // BM25 score for each candidate.
    const k1 = 1.5,
      b = 0.75;
    const bm25 = docTokens.map((d, i) => {
      const tf = {};
      for (const t of d) tf[t] = (tf[t] || 0) + 1;
      let score = 0;
      for (const t of qTerms) {
        const f = tf[t] || 0;
        if (f === 0) continue;
        const idf = Math.log(
          1 + (N - (df[t] || 0) + 0.5) / ((df[t] || 0) + 0.5),
        );
        score +=
          (idf * (f * (k1 + 1))) /
          (f + k1 * (1 - b + (b * d.length) / Math.max(avgdl, 1)));
      }
      return { idx: i, score };
    });

    // Build rank maps (1-indexed) for Reciprocal Rank Fusion.
    const denseRank = new Map(candidates.map((_, i) => [i, i + 1]));
    const bm25Sorted = bm25.slice().sort((a, b) => b.score - a.score);
    const bm25Rank = new Map(bm25Sorted.map((s, i) => [s.idx, i + 1]));

    // RRF (k=60 is standard practice).
    const RRF_K = 60;
    const fused = candidates.map((c, i) => {
      const dr = denseRank.get(i);
      const br = bm25Rank.get(i);
      const rrf = (dr ? 1 / (RRF_K + dr) : 0) + (br ? 1 / (RRF_K + br) : 0);
      const bs = bm25.find((s) => s.idx === i)?.score ?? 0;
      return { ...c, rrfScore: rrf, bm25Score: bs };
    });
    fused.sort((a, b) => b.rrfScore - a.rrfScore);

    const top = fused.slice(0, topK);
    const context = top
      .map((c, i) => `[Source ${i + 1}: ${c.fileName}]\n${c.content}`)
      .join("\n\n---\n\n");

    return {
      results: top,
      context,
      sourceCount: top.length,
      metadata: {
        ...dense.metadata,
        retrieval: "hybrid_dense_bm25_rrf",
        candidatesEvaluated: N,
      },
    };
  }

  async ragAnswer(query, context = {}) {
    const {
      tenantId,
      collectionId,
      documentIds,
      conversationHistory = [],
      answerProvider = "Mistral7b",
      answerModel = "mistral:7b",
      confidenceProvider = "qwen7b",
      confidenceModel = "Qwen7B",
      topK = 5,
      minScore = 0.25,
    } = context;

    // History-aware retrieval (REQ 2): a follow-up like "how many of them?" has
    // no content words to embed on its own. Prepend prior user turns so the
    // retrieval query carries enough context to find the right chunks.
    let retrievalQuery = query;
    if (conversationHistory.length > 0) {
      const priorUserTurns = conversationHistory
        .filter((m) => m.role === "user")
        .map((m) => m.content)
        .join(" ");
      retrievalQuery = (priorUserTurns + " " + query).trim();
    }
    // Intent routing: detect summarization / document-level queries so they
    // get broad retrieval instead of a high-similarity match (REQ: works for
    // summary/overview queries, not just exact matches).
    const SUMMARY_PATTERN =
      /\b(summar(y|ize|ise|ies)|overview|outline|recap|tl;?dr|what(?:'s| is) (this|the document|it)|tell me about|describe (this|the document)|brief(ly)? (about|on)|key points|main points|gist)\b/i;
    const isSummarizationIntent = SUMMARY_PATTERN.test(query);

    let searchResult;
    if (isSummarizationIntent) {
      // Pull every chunk (or as many as topK=50 allows) regardless of score.
      searchResult = await this.searchWithContext(retrievalQuery, {
        tenantId,
        collectionId,
        documentIds,
        topK: Math.max(topK, 50),
        minScore: 0,
        userId: context.userId,
      });
    } else {
      // Hybrid retrieval: dense candidates + BM25 rerank fused via Reciprocal
      // Rank Fusion. Handles paraphrases, synonyms, codes/abbreviations such as
      // CAPA, and the edge cases pure semantic similarity alone misses.
      searchResult = await this._hybridRetrieve(retrievalQuery, {
        tenantId,
        collectionId,
        documentIds,
        topK,
        userId: context.userId,
      });
    }
    const { results, context: sourceContext, sourceCount } = searchResult;

    if (!sourceCount) {
      return {
        answer: "No relevant information found in the knowledge base.",
        confidence: 0,
        sources: [],
        metadata: searchResult.metadata,
      };
    }

    const { getAIGateway } = require("../infrastructure/ai/gateway.service");
    const gateway = getAIGateway();
    if (!gateway.initialized) await gateway.initialize();

    const systemPrompt = [
      "You are a precise assistant answering questions strictly from the provided sources.",
      "Rules:",
      "1. If the user asks for a summary, overview, or general description, summarize the provided sources faithfully. Do not invent facts.",
      "2. If the user asks a specific question, answer it from the sources. Quote or paraphrase only what is supported.",
      '3. If the sources do not contain enough information to answer, say plainly: "The provided sources do not contain enough information to answer this." Do not guess.',
      "4. Never invent facts, numbers, names, or dates that are not in the sources.",
      "5. Keep answers concise and grounded in the sources.",
    ].join("\n");

    const answerMessages = [
      { role: "system", content: systemPrompt },
      ...conversationHistory,
      {
        role: "user",
        content: "Sources:\n" + sourceContext + "\n\nQuestion: " + query,
      },
    ];
    const answerResult = await gateway.createCompletion(
      {
        provider: answerProvider,
        model: answerModel,
        messages: answerMessages,
        temperature: 0.2,
        max_tokens: 1024,
      },
      { tenantId, userId: context.userId },
    );
    const answer = answerResult.content;

    let confidence = null;
    try {
      const scoringMessages = [
        {
          role: "system",
          content:
            "You are an evaluator. Rate how well the answer is supported by the sources. Output ONLY a number between 0.0 and 1.0 where 1.0 = fully supported, 0.0 = unsupported. No other text.",
        },
        {
          role: "user",
          content:
            "Sources:\n" +
            sourceContext +
            "\n\nQuestion: " +
            query +
            "\n\nAnswer: " +
            answer +
            "\n\nConfidence score:",
        },
      ];
      const scoreResult = await gateway.createCompletion(
        {
          provider: confidenceProvider,
          model: confidenceModel,
          messages: scoringMessages,
          temperature: 0,
          max_tokens: 10,
        },
        { tenantId, userId: context.userId },
      );
      const parsed = parseFloat(String(scoreResult.content).trim());
      if (!Number.isNaN(parsed)) confidence = Math.max(0, Math.min(1, parsed));
    } catch (err) {
      console.warn(
        "[KnowledgeService] Confidence scoring failed:",
        err.message,
      );
    }

    return {
      answer,
      confidence,
      sources: results,
      metadata: {
        ...searchResult.metadata,
        answerProvider: answerResult.provider,
        answerModel: answerResult.model,
      },
    };
  }
  /**
   * List search history
   */
  async listSearchHistory(tenantId, options = {}) {
    const { page = 1, limit = 20, collectionId, documentId } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT h.*, c.name as collection_name
      FROM knowledge_search_history h
      LEFT JOIN knowledge_collections c ON c.id = h.collection_id
      WHERE h.tenant_id = $1
    `;
    const params = [tenantId];

    if (collectionId) {
      params.push(collectionId);
      query += ` AND h.collection_id = $${params.length}`;
    }

    if (documentId) {
      params.push(JSON.stringify([documentId]));
      query += ` AND h.document_ids @> $${params.length}::jsonb`;
    }

    query += ` ORDER BY h.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await database.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM knowledge_search_history WHERE tenant_id = $1`;
    const countParams = [tenantId];
    if (collectionId) {
      countParams.push(collectionId);
      countQuery += ` AND collection_id = $2`;
    }
    if (documentId) {
      countParams.push(JSON.stringify([documentId]));
      countQuery += ` AND document_ids @> $${countParams.length}::jsonb`;
    }
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get search history by ID
   */
  async getSearchHistoryById(id, tenantId) {
    const query = `
      SELECT h.*, c.name as collection_name
      FROM knowledge_search_history h
      LEFT JOIN knowledge_collections c ON c.id = h.collection_id
      WHERE h.id = $1 AND h.tenant_id = $2
    `;
    const result = await database.query(query, [id, tenantId]);
    return result.rows[0] || null;
  }

  /**
   * Store search history entry
   */
  async _storeSearchHistory(data) {
    const {
      tenantId,
      userId,
      query,
      collectionId,
      documentIds,
      results,
      context,
      metadata,
      searchType,
    } = data;

    const sql = `
      INSERT INTO knowledge_search_history (
        id, tenant_id, user_id, query, collection_id, document_ids, results, context, metadata, search_type, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING id
    `;

    const params = [
      crypto.randomUUID(),
      tenantId,
      userId,
      query,
      collectionId,
      JSON.stringify(documentIds || []),
      JSON.stringify(results || []),
      context || null,
      JSON.stringify(metadata || {}),
      searchType || "semantic",
    ];

    await database.query(sql, params);
  }

  // ==================== Helpers ====================

  /**
   * Format vector search results into standard response shape
   */
  _formatSearchResults(results, defaultNamespace = null) {
    return results.map((r) => ({
      chunkId: r.id, // Vector ID is the chunk ID
      score: r.score,
      content: r.metadata?.content,
      documentId: r.metadata?.documentId,
      fileName: r.metadata?.fileName,
      chunkIndex: r.metadata?.chunkIndex,
      collectionId: r.metadata?.collectionId,
      namespace: r.namespace || defaultNamespace,
    }));
  }

  /**
   * Get dimension for a known model name
   */
  _getDimensionForModel(model) {
    const dimensionMap = {
      "text-embedding-3-small": 1536,
      "text-embedding-3-large": 3072,
      "text-embedding-ada-002": 1536,
      "gemini-embedding-001": 768,
      "gemini-embedding-2-preview": 768,
      "nomic-embed-text": 768,
      "bge-m3": 1024,
      "all-minilm": 384,
      "intfloat/e5-large-v2": 1024,
      DistilUseBase: 512,
    };
    return dimensionMap[model] || null;
  }

  /**
   * Resolve the embedding model, dimension, and provider for a tenant.
   * Checks tenant AI config first, falls back to system defaults.
   */
  async _resolveEmbeddingConfig(tenantId, options = {}) {
    try {
      const gateway = getAIGateway();
      if (!gateway.initialized) await gateway.initialize();

      const { providers } = await gateway._resolveProviders(tenantId);
      const embeddingProviderName =
        options.provider || gateway._getEmbeddingProvider(providers);

      if (embeddingProviderName) {
        const provider = providers.get(embeddingProviderName);
        if (!provider) {
          throw new Error(
            `Provider "${embeddingProviderName}" not configured or available for this tenant.`,
          );
        }
        const model =
          options.model || provider.defaultEmbeddingModel || "unknown";

        const dimension = this._getDimensionForModel(model);

        return { model, dimension, provider: embeddingProviderName };
      }
    } catch (err) {
      console.warn(
        "[KnowledgeService] Could not resolve embedding config:",
        err.message,
      );
    }

    // Fallback: unknown until first document is processed
    return { model: null, dimension: null, provider: null };
  }

  _formatCollection(row) {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      documentCount: row.document_count,
      chunkCount: row.chunk_count,
      status: row.status,
      metadata: row.metadata,
      embeddingModel: row.embedding_model,
      embeddingDimension: row.embedding_dimension,
      embeddingProvider: row.embedding_provider,
      processingMode: row.processing_mode || "text",
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton
let instance = null;
const getKnowledgeService = () => {
  if (!instance) {
    instance = new KnowledgeService();
  }
  return instance;
};

module.exports = { KnowledgeService, getKnowledgeService };
