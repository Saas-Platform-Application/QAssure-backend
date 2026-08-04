/**
 * Vector Store Service - QAssure Platform
 * Manages vector storage using Pinecone with per-dimension auto-indexing.
 *
 * Key behaviors:
 * - Each embedding dimension gets its own Pinecone index (e.g.
 *   qassure-knowledge-1024, qassure-knowledge-768, qassure-knowledge-1536).
 * - Indexes are created lazily on first upsert for a new dimension.
 * - Legacy callers that omit `dimension` fall back to PINECONE_INDEX_NAME
 *   (keeps existing `test-index` deployments working).
 * - If PINECONE_INDEX_NAME already matches the requested dimension, we reuse
 *   it instead of creating a redundant dedicated index.
 */
const { Pinecone } = require("@pinecone-database/pinecone");
const crypto = require("crypto");

class VectorStoreService {
  constructor() {
    this.client = null;

    // Legacy / default index (backward compat)
    this.defaultIndexName =
      process.env.PINECONE_INDEX_NAME || "qassure-knowledge";
    this.indexHost = process.env.PINECONE_HOST || null;

    // Multi-index config
    this.indexBaseName = process.env.PINECONE_INDEX_BASE || "qassure-knowledge";
    this.indexCloud = process.env.PINECONE_CLOUD || "aws";
    this.indexRegion = process.env.PINECONE_REGION || "us-east-1";
    this.indexMetric = process.env.PINECONE_METRIC || "cosine";

    this.namespace = process.env.PINECONE_NAMESPACE || "default";

    // dimension -> { indexName, index }. Key `null` = legacy default.
    this.indexCache = new Map();
    // dimension -> Promise (in-flight creation, prevents double-create races)
    this.creationLocks = new Map();
    // indexName -> dimension (populated from listIndexes at init)
    this.existingIndexes = new Map();

    this.initialized = false;
    this.useInMemory = false;
  }

  /**
   * Initialize Pinecone client. Does NOT hard-fail if the default index is
   * missing — dimension-specific indexes are created on demand.
   */
  async initialize() {
    if (this.initialized) return true;

    const apiKey = process.env.PINECONE_API_KEY;

    if (!apiKey) {
      console.warn(
        "[VectorStore] No Pinecone API key configured - using in-memory fallback",
      );
      this.useInMemory = true;
      this.inMemoryStore = new Map();
      this.initialized = true;
      return true;
    }

    try {
      this.client = new Pinecone({ apiKey });

      // Preload existing indexes (dimension map)
      const listResponse = await this.client.listIndexes();
      const indexes = listResponse?.indexes || [];
      for (const idx of indexes) {
        if (idx?.name) {
          console.debug(`[VectorStore] Found index: ${idx.name}, dim: ${idx.dimension}, host: ${idx.host}`);
          this.existingIndexes.set(idx.name, idx);
        }
      }

      // If the legacy default index exists, preload its handle for backward compat
      if (this.existingIndexes.has(this.defaultIndexName)) {
        const idxDesc = this.existingIndexes.get(this.defaultIndexName);
        const handle = idxDesc.host
          ? this.client.index(this.defaultIndexName, idxDesc.host)
          : this.client.index(this.defaultIndexName);
        
        const entry = { 
          indexName: this.defaultIndexName, 
          index: handle, 
          host: idxDesc.host || this.indexHost 
        };
        
        this.indexCache.set(null, entry);
        if (idxDesc.dimension) {
          this.indexCache.set(idxDesc.dimension, entry); // reuse for that dimension
        }
        
        console.log(
          `[VectorStore] ✅ Default Pinecone index "${this.defaultIndexName}" loaded (dim=${idxDesc.dimension}, host=${idxDesc.host})`,
        );
      } else {
        console.warn(
          `[VectorStore] ⚠️  Default index "${this.defaultIndexName}" not found. Dimension-specific indexes will be created on demand.`,
        );
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("[VectorStore] ❌ Failed to connect:", error.message);
      this.useInMemory = true;
      this.inMemoryStore = new Map();
      this.initialized = true;
      return true;
    }
  }

  /**
   * Resolve (and create if needed) the Pinecone index for a given embedding dimension.
   * Returns { indexName, index }.
   *
   * @param {number|null|undefined} dimension
   */
  async _getIndexForDimension(dimension) {
    if (!this.initialized) await this.initialize();

    // Legacy path — no dimension provided, use default
    if (dimension === null || dimension === undefined) {
      const cached = this.indexCache.get(null);
      if (cached) return cached;
      throw new Error(
        `[VectorStore] No default index "${this.defaultIndexName}" available and no dimension specified. ` +
          `Either set PINECONE_INDEX_NAME to an existing index, or pass a dimension to upsert/query.`,
      );
    }

    // Cache hit
    if (this.indexCache.has(dimension)) {
      return this.indexCache.get(dimension);
    }

    // Concurrent create protection — reuse in-flight promise
    if (this.creationLocks.has(dimension)) {
      return this.creationLocks.get(dimension);
    }

    const creationPromise = this._resolveOrCreateIndex(dimension);
    this.creationLocks.set(dimension, creationPromise);

    try {
      const result = await creationPromise;
      this.indexCache.set(dimension, result);
      return result;
    } finally {
      this.creationLocks.delete(dimension);
    }
  }

  async _resolveOrCreateIndex(dimension) {
    const indexName = `${this.indexBaseName}-${dimension}`;

    // Strategy:
    // 1. Check if the default index matches the dimension
    // 2. Check if any other existing index matches the dimension
    // 3. Only then try to find/create by the naming convention

    const allIndexes = Array.from(this.existingIndexes.values());
    
    // Check for ANY index that matches this dimension (prioritize the naming convention if multiple match)
    let existing = allIndexes.find(i => i.name === indexName && i.dimension === dimension);
    
    if (!existing) {
      // Fallback: any index with this dimension (e.g. the legacy default index)
      existing = allIndexes.find(i => i.dimension === dimension);
    }

    if (existing) {
      const handle = this.client.index(existing.name, existing.host || this.indexHost);
      console.log(
        `[VectorStore] ✅ Reusing existing index "${existing.name}" for dimension ${dimension}`,
      );
      return { 
        indexName: existing.name, 
        index: handle, 
        host: existing.host || this.indexHost 
      };
    }

    // Create new serverless index
    console.log(
      `[VectorStore] 🛠️  Creating Pinecone index "${indexName}" ` +
        `(dim=${dimension}, metric=${this.indexMetric}, ${this.indexCloud}/${this.indexRegion})...`,
    );
    const createStart = Date.now();

    await this.client.createIndex({
      name: indexName,
      dimension,
      metric: this.indexMetric,
      spec: {
        serverless: {
          cloud: this.indexCloud,
          region: this.indexRegion,
        },
      },
      waitUntilReady: true, // SDK polls internally; we also poll below as belt-and-suspenders
    });

    // Belt-and-suspenders readiness poll (some SDK versions don't honor waitUntilReady)
    const READY_TIMEOUT_MS = 180000; // 3 min
    const pollStart = Date.now();
    let ready = false;
    while (Date.now() - pollStart < READY_TIMEOUT_MS) {
      try {
        const desc = await this.client.describeIndex(indexName);
        if (desc?.status?.ready === true) {
          ready = true;
          break;
        }
      } catch (_) {
        // may briefly 404 right after creation
      }
      await new Promise((r) => setTimeout(r, 2000));
    }

    if (!ready) {
      throw new Error(
        `[VectorStore] Index "${indexName}" did not become ready within ${READY_TIMEOUT_MS / 1000}s`,
      );
    }

    const handle = this.client.index(indexName);
    const desc = await this.client.describeIndex(indexName);
    this.existingIndexes.set(indexName, desc);
    console.log(
      `[VectorStore] ✅ Index "${indexName}" ready (took ${Math.round((Date.now() - createStart) / 1000)}s)`,
    );
    return { 
      indexName, 
      index: handle, 
      host: desc.host || this.indexHost 
    };
  }

  /**
   * Upsert vectors. Pass `dimension` to route to the correct per-dimension index.
   * If omitted, falls back to the legacy default index (backward compat).
   *
   * @param {Array} vectors
   * @param {string|null} namespace
   * @param {number|null} dimension  NEW
   */
  async upsert(vectors, namespace = null, dimension = null) {
    if (!this.initialized) await this.initialize();

    const ns = namespace || this.namespace;

    if (this.useInMemory) {
      return this._inMemoryUpsert(vectors, ns, dimension);
    }

    // Sanity-check vector dimension matches the requested dimension
    if (dimension && vectors.length > 0) {
      const actualDim = vectors[0].embedding?.length;
      if (actualDim && actualDim !== dimension) {
        throw new Error(
          `[VectorStore] Dimension mismatch: vector has ${actualDim} dimensions but ${dimension} was requested`,
        );
      }
    }

    try {
      const { indexName, index } = await this._getIndexForDimension(dimension);

      const records = vectors.map((v) => ({
        id: v.id || crypto.randomUUID(),
        values: v.embedding,
        metadata: v.metadata || {},
      }));

      // Batch upsert (Pinecone limit is 100 per request)
      const batchSize = 100;
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        await index.namespace(ns).upsert(batch);
      }

      console.log(
        `[VectorStore] Upserted ${records.length} vectors to ${indexName}/${ns} (dim=${dimension || "legacy"})`,
      );
      const { host } = await this._getIndexForDimension(dimension);
      return { success: true, count: records.length, indexName, indexHost: host };
    } catch (error) {
      console.error("[VectorStore] Upsert error:", error.message);
      throw error;
    }
  }

  /**
   * Query similar vectors.
   * Pass `options.dimension` to route to the correct per-dimension index.
   */
  async query(embedding, options = {}) {
    if (!this.initialized) await this.initialize();

    const {
      topK = 5,
      namespace = this.namespace,
      filter = null,
      includeMetadata = true,
      includeValues = false,
      minScore = 0.0,
      dimension = null, // NEW
    } = options;

    if (this.useInMemory) {
      const results = this._inMemoryQuery(embedding, {
        topK,
        namespace,
        minScore,
        dimension,
      });
      return { results, indexHost: "in-memory" };
    }

    // Sanity-check embedding dimension matches requested dimension
    if (dimension && embedding.length !== dimension) {
      throw new Error(
        `[VectorStore] Query dimension mismatch: embedding has ${embedding.length} dimensions but ${dimension} was requested`,
      );
    }

    try {
      const { indexName, index, host } =
        await this._getIndexForDimension(dimension);

      const queryResponse = await index.namespace(namespace).query({
        vector: embedding,
        topK,
        filter,
        includeMetadata,
        includeValues,
      });

      const results = (queryResponse.matches || [])
        .map((match) => {
          console.debug(
            `[VectorStore] Match ID: ${match.id}, Score: ${match.score}`,
          );
          return {
            id: match.id,
            score: match.score,
            metadata: match.metadata,
            values: match.values,
          };
        })
        .filter((match) => match.score >= minScore);

      return { results, indexHost: host || null };
    } catch (error) {
      console.error("[VectorStore] Query error:", error.message);
      throw error;
    }
  }

  /**
   * Delete vectors by ID.
   * Pass `dimension` to target the correct index (otherwise hits legacy default).
   */
  async delete(ids, namespace = null, dimension = null) {
    if (!this.initialized) await this.initialize();

    const ns = namespace || this.namespace;

    if (this.useInMemory) {
      return this._inMemoryDelete(ids, ns, dimension);
    }

    try {
      const { indexName, index } = await this._getIndexForDimension(dimension);
      await index.namespace(ns).deleteMany(ids);
      console.log(
        `[VectorStore] Deleted ${ids.length} vectors from ${indexName}/${ns}`,
      );
      return { success: true, count: ids.length };
    } catch (error) {
      console.error("[VectorStore] Delete error:", error.message);
      throw error;
    }
  }

  /**
   * Delete all vectors in a namespace.
   */
  async deleteAll(namespace = null, dimension = null) {
    if (!this.initialized) await this.initialize();

    const ns = namespace || this.namespace;

    if (this.useInMemory) {
      this._inMemoryDeleteAll(ns, dimension);
      return { success: true };
    }

    try {
      const { indexName, index } = await this._getIndexForDimension(dimension);
      await index.namespace(ns).deleteAll();
      console.log(`[VectorStore] Deleted all vectors in ${indexName}/${ns}`);
      return { success: true };
    } catch (error) {
      // A missing namespace or 404 is not fatal
      if (/not found|404/i.test(error.message)) {
        console.warn(
          `[VectorStore] Namespace ${ns} not found or already deleted (404)`,
        );
        return { success: true };
      }
      console.error("[VectorStore] DeleteAll error:", error.message);
      throw error;
    }
  }

  /**
   * Delete vectors by metadata filter.
   */
  async deleteByFilter(filter, namespace = null, dimension = null) {
    if (!this.initialized) await this.initialize();

    const ns = namespace || this.namespace;

    if (this.useInMemory) {
      return this._inMemoryDeleteByFilter(filter, ns, dimension);
    }

    try {
      const { indexName, index } = await this._getIndexForDimension(dimension);
      await index.namespace(ns).deleteMany({ filter });
      console.log(
        `[VectorStore] Deleted vectors by filter in ${indexName}/${ns}`,
      );
      return { success: true };
    } catch (error) {
      // Fallback for Pinecone Serverless which doesn't support delete-by-filter
      if (error.message.includes("illegal condition") || error.message.includes("not supported")) {
        console.warn(`[VectorStore] deleteByFilter not supported for ${ns}, attempting query-then-delete fallback...`);
        
        // Resolve dimension if not provided so we can generate a dummy query vector
        let dim = dimension;
        if (!dim) {
          const stats = await this.getStats(dimension);
          dim = stats.dimension;
        }

        const { results } = await this.query(new Array(dim || 1536).fill(0), {
          topK: 10000,
          namespace: ns,
          filter,
          dimension: dim
        });

        if (results.length > 0) {
          const ids = results.map(r => r.id);
          return this.delete(ids, ns, dim);
        }
        return { success: true, count: 0 };
      }

      if (/not found|404/i.test(error.message)) {
        console.warn(
          `[VectorStore] Vectors for filter already deleted or not found (404)`,
        );
        return { success: true };
      }
      console.error("[VectorStore] DeleteByFilter error:", error.message);
      throw error;
    }
  }

  /**
   * Get stats for a specific dimension's index (or the default if omitted).
   */
  async getStats(dimension = null) {
    if (!this.initialized) await this.initialize();

    if (this.useInMemory) {
      return this._inMemoryStats();
    }

    try {
      // Single-index stats when dimension explicitly specified
      if (dimension !== null && dimension !== undefined) {
        const { indexName, index } =
          await this._getIndexForDimension(dimension);
        const stats = await index.describeIndexStats();
        return {
          indexName,
          totalVectors: stats.totalRecordCount || 0,
          namespaces: stats.namespaces || {},
          dimension: stats.dimension,
        };
      }

      // Aggregated stats across ALL related indexes (default + qassure-knowledge-*)
      const listResponse = await this.client.listIndexes();
      const allIndexes = listResponse?.indexes || [];
      const relevant = allIndexes.filter(
        (i) =>
          i.name === this.defaultIndexName ||
          i.name.startsWith(`${this.indexBaseName}-`),
      );

      const perIndex = [];
      const mergedNamespaces = {};
      let totalVectors = 0;

      for (const idx of relevant) {
        try {
          const handle = this.client.index(idx.name);
          const s = await handle.describeIndexStats();
          const count = s.totalRecordCount || 0;
          totalVectors += count;

          if (s.namespaces) {
            for (const [ns, nsStats] of Object.entries(s.namespaces)) {
              mergedNamespaces[`${idx.name}:${ns}`] = nsStats;
            }
          }

          perIndex.push({
            indexName: idx.name,
            dimension: idx.dimension,
            totalVectors: count,
            namespaces: s.namespaces || {},
          });
        } catch (e) {
          console.warn(
            `[VectorStore] Stats failed for ${idx.name}: ${e.message}`,
          );
        }
      }

      return {
        totalVectors,
        namespaces: mergedNamespaces,
        indexes: perIndex,
      };
    } catch (error) {
      console.error("[VectorStore] Stats error:", error.message);
      throw error;
    }
  }

  /**
   * Fetch vectors by ID.
   */
  async fetch(ids, namespace = null, dimension = null) {
    if (!this.initialized) await this.initialize();

    const ns = namespace || this.namespace;

    if (this.useInMemory) {
      return this._inMemoryFetch(ids, ns, dimension);
    }

    try {
      const { index } = await this._getIndexForDimension(dimension);
      const response = await index.namespace(ns).fetch(ids);
      return Object.values(response.records || {});
    } catch (error) {
      console.error("[VectorStore] Fetch error:", error.message);
      throw error;
    }
  }

  /**
   * Diagnostic: list all known indexes in the cache.
   */
  listKnownIndexes() {
    const out = [];
    for (const [dim, entry] of this.indexCache.entries()) {
      out.push({ dimension: dim, indexName: entry.indexName });
    }
    return out;
  }

  // ==================== In-Memory Fallback ====================
  // In-memory store is keyed by `${dimension}:${namespace}` so different
  // embedding dimensions don't collide.

  _memKey(namespace, dimension) {
    return dimension ? `d${dimension}:${namespace}` : namespace;
  }

  _inMemoryUpsert(vectors, namespace, dimension) {
    const key = this._memKey(namespace, dimension);
    if (!this.inMemoryStore.has(key)) {
      this.inMemoryStore.set(key, new Map());
    }

    const ns = this.inMemoryStore.get(key);

    for (const v of vectors) {
      const id = v.id || crypto.randomUUID();
      ns.set(id, {
        id,
        values: v.embedding,
        metadata: v.metadata || {},
      });
    }

    console.log(
      `[VectorStore] In-memory upserted ${vectors.length} vectors to ${key}`,
    );
    return { success: true, count: vectors.length };
  }

  _inMemoryQuery(embedding, options) {
    const { topK, namespace, minScore, dimension } = options;
    const key = this._memKey(namespace, dimension);

    if (!this.inMemoryStore.has(key)) {
      return [];
    }

    const ns = this.inMemoryStore.get(key);
    const results = [];

    for (const [id, record] of ns) {
      const score = this._cosineSimilarity(embedding, record.values);
      if (score >= minScore) {
        results.push({
          id,
          score,
          metadata: record.metadata,
        });
      }
    }

    return results.sort((a, b) => b.score - a.score).slice(0, topK);
  }

  _inMemoryDelete(ids, namespace, dimension) {
    const key = this._memKey(namespace, dimension);
    if (!this.inMemoryStore.has(key)) {
      return { success: true, count: 0 };
    }

    const ns = this.inMemoryStore.get(key);
    let count = 0;

    for (const id of ids) {
      if (ns.delete(id)) count++;
    }

    return { success: true, count };
  }

  _inMemoryDeleteAll(namespace, dimension) {
    const key = this._memKey(namespace, dimension);
    this.inMemoryStore.delete(key);
  }

  _inMemoryDeleteByFilter(filter, namespace, dimension) {
    const key = this._memKey(namespace, dimension);
    if (!this.inMemoryStore.has(key)) {
      return { success: true, count: 0 };
    }

    const ns = this.inMemoryStore.get(key);
    let count = 0;

    for (const [id, record] of ns) {
      if (this._matchesFilter(record.metadata, filter)) {
        ns.delete(id);
        count++;
      }
    }

    return { success: true, count };
  }

  _inMemoryFetch(ids, namespace, dimension) {
    const key = this._memKey(namespace, dimension);
    if (!this.inMemoryStore.has(key)) {
      return [];
    }

    const ns = this.inMemoryStore.get(key);
    return ids.map((id) => ns.get(id)).filter(Boolean);
  }

  _inMemoryStats() {
    let totalVectors = 0;
    const namespaces = {};

    for (const [ns, store] of this.inMemoryStore) {
      namespaces[ns] = { recordCount: store.size };
      totalVectors += store.size;
    }

    return {
      totalVectors,
      namespaces,
      inMemory: true,
    };
  }

  _cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

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

    return normA && normB ? dotProduct / (normA * normB) : 0;
  }

  _matchesFilter(metadata, filter) {
    if (!filter) return true;
    for (const [key, value] of Object.entries(filter)) {
      if (value && typeof value === "object" && value["$in"]) {
        if (
          !Array.isArray(value["$in"]) ||
          !value["$in"].includes(metadata[key])
        ) {
          return false;
        }
      } else if (metadata[key] !== value) {
        return false;
      }
    }
    return true;
  }
}

// Singleton
let instance = null;
const getVectorStoreService = () => {
  if (!instance) {
    instance = new VectorStoreService();
  }
  return instance;
};

module.exports = { VectorStoreService, getVectorStoreService };
