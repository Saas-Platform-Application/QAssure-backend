/**
 * Embedding Service - QAssure Platform
 * Generates text embeddings using OpenAI
 */
const { getAIGateway } = require('./gateway.service');

class EmbeddingService {
  constructor() {
    this.gateway = null;
    this.defaultModel = null;
    this.dimensions = 1536;
  }

  /**
   * Initialize the embedding service
   */
  async initialize() {
    this.gateway = getAIGateway();
    await this.gateway.initialize();
    console.log('[EmbeddingService] ✅ Initialized');
    return true;
  }

  /**
   * Generate embeddings for text
   */
  async embed(text, options = {}) {
    if (!this.gateway) {
      await this.initialize();
    }

    const model = options.model || this.defaultModel;
    const tenantId = options.tenantId;

    try {
      const result = await this.gateway.createEmbedding(text, { model, tenantId, provider: options.provider });
      return {
        embedding: result.embeddings[0],
        model: result.model,
        provider: result.provider || options.provider || null,
        fallbackUsed: result.fallbackUsed || false,
        usage: result.usage
      };
    } catch (error) {
      console.error('[EmbeddingService] Error:', error.message);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedBatch(texts, options = {}) {
    if (!this.gateway) {
      await this.initialize();
    }

    const model = options.model || this.defaultModel;
    const tenantId = options.tenantId;

    try {
      const result = await this.gateway.createEmbedding(texts, { model, tenantId, provider: options.provider });
      return {
        embeddings: result.embeddings,
        model: result.model,
        provider: result.provider || options.provider || null,
        fallbackUsed: result.fallbackUsed || false,
        usage: result.usage
      };
    } catch (error) {
      console.error('[EmbeddingService] Batch error:', error.message);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (vecA.length !== vecB.length) {
      throw new Error('Vectors must have same dimensions');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    normA = Math.sqrt(normA);
    normB = Math.sqrt(normB);

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (normA * normB);
  }

  /**
   * Find most similar embeddings
   */
  findSimilar(queryEmbedding, embeddings, topK = 5) {
    const similarities = embeddings.map((emb, index) => ({
      index,
      score: this.cosineSimilarity(queryEmbedding, emb.embedding),
      ...emb
    }));

    return similarities
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }
}

// Singleton
let instance = null;
const getEmbeddingService = () => {
  if (!instance) {
    instance = new EmbeddingService();
  }
  return instance;
};

module.exports = { EmbeddingService, getEmbeddingService };
