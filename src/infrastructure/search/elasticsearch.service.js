/**
 * Elasticsearch Service
 * Provides full-text search, analytics, and audit log storage
 */

const { Client } = require('@elastic/elasticsearch');

class ElasticsearchService {
  constructor() {
    this.client = null;
    this.indexPrefix = process.env.ELASTICSEARCH_INDEX_PREFIX || 'qassure';
    this.isConnected = false;
  }

  async connect() {
    try {
      const node = process.env.ELASTICSEARCH_NODE;

      this.client = new Client({
        node,
        requestTimeout: 30000,
        sniffOnStart: false
      });

      const health = await this.client.cluster.health();
      this.isConnected = true;
      console.log('[Elasticsearch] Connected - Cluster:', health.cluster_name, 'Status:', health.status);

      await this.initializeIndices();
      return true;
    } catch (error) {
      console.error('[Elasticsearch] Connection failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  async disconnect() {
    if (this.client) {
      await this.client.close();
      this.isConnected = false;
    }
  }

  async initializeIndices() {
    const indices = [
      { name: 'documents', mapping: this._getDocumentMapping() },
      { name: 'capas', mapping: this._getCapaMapping() },
      { name: 'training', mapping: this._getTrainingMapping() },
      { name: 'suppliers', mapping: this._getSupplierMapping() },
      { name: 'audit-logs', mapping: this._getAuditLogMapping() }
    ];

    for (const index of indices) {
      const indexName = `${this.indexPrefix}-${index.name}`;
      try {
        const exists = await this.client.indices.exists({ index: indexName });
        if (!exists) {
          await this.client.indices.create({
            index: indexName,
            body: {
              settings: {
                number_of_shards: 1,
                number_of_replicas: 0,
                analysis: {
                  analyzer: {
                    qassure_analyzer: {
                      type: 'custom',
                      tokenizer: 'standard',
                      filter: ['lowercase', 'asciifolding']
                    }
                  }
                }
              },
              mappings: index.mapping
            }
          });
          console.log('[Elasticsearch] Created index:', indexName);
        }
      } catch (error) {
        console.error('[Elasticsearch] Error creating index', indexName, error.message);
      }
    }
  }

  async indexDocument(indexType, id, document, tenantId) {
    if (!this.isConnected) return null;

    const indexName = `${this.indexPrefix}-${indexType}`;
    try {
      const result = await this.client.index({
        index: indexName,
        id: id,
        document: {
          ...document,
          tenant_id: tenantId,
          indexed_at: new Date().toISOString()
        },
        refresh: true
      });
      return result;
    } catch (error) {
      console.error('[Elasticsearch] Index error:', error.message);
      return null;
    }
  }

  async bulkIndex(indexType, documents, tenantId) {
    if (!this.isConnected || documents.length === 0) return null;

    const indexName = `${this.indexPrefix}-${indexType}`;
    const operations = documents.flatMap(doc => [
      { index: { _index: indexName, _id: doc.id } },
      { ...doc, tenant_id: tenantId, indexed_at: new Date().toISOString() }
    ]);

    try {
      const result = await this.client.bulk({ operations, refresh: true });
      return result;
    } catch (error) {
      console.error('[Elasticsearch] Bulk index error:', error.message);
      return null;
    }
  }

  async deleteDocument(indexType, id) {
    if (!this.isConnected) return null;

    const indexName = `${this.indexPrefix}-${indexType}`;
    try {
      await this.client.delete({ index: indexName, id, refresh: true });
      return true;
    } catch (error) {
      return false;
    }
  }

  async search(indexType, query, tenantId, options = {}) {
    if (!this.isConnected) return { hits: [], total: 0 };

    const { page = 1, limit = 20, sort, filters = {} } = options;
    const indexName = `${this.indexPrefix}-${indexType}`;

    const must = [{ term: { tenant_id: tenantId } }];

    if (query) {
      must.push({
        multi_match: {
          query,
          fields: ['title^3', 'description^2', 'content', 'name^3', '*_number'],
          type: 'best_fields',
          fuzziness: 'AUTO'
        }
      });
    }

    for (const [field, value] of Object.entries(filters)) {
      if (Array.isArray(value)) {
        must.push({ terms: { [field]: value } });
      } else {
        must.push({ term: { [field]: value } });
      }
    }

    try {
      const result = await this.client.search({
        index: indexName,
        body: {
          from: (page - 1) * limit,
          size: limit,
          query: { bool: { must } },
          sort: sort || [{ _score: 'desc' }, { indexed_at: 'desc' }],
          highlight: {
            fields: { title: {}, description: {}, content: {} },
            pre_tags: ['<mark>'],
            post_tags: ['</mark>']
          }
        }
      });

      return {
        hits: result.hits.hits.map(hit => ({
          id: hit._id,
          score: hit._score,
          ...hit._source,
          highlights: hit.highlight
        })),
        total: result.hits.total.value
      };
    } catch (error) {
      console.error('[Elasticsearch] Search error:', error.message);
      return { hits: [], total: 0 };
    }
  }

  async globalSearch(query, tenantId, options = {}) {
    if (!this.isConnected) return { results: [], total: 0 };

    const { limit = 20 } = options;
    const indices = ['documents', 'capas', 'training', 'suppliers']
      .map(i => `${this.indexPrefix}-${i}`);

    try {
      const result = await this.client.search({
        index: indices,
        body: {
          size: limit,
          query: {
            bool: {
              must: [
                { term: { tenant_id: tenantId } },
                {
                  multi_match: {
                    query,
                    fields: ['title^3', 'name^3', 'description^2', '*_number^2', 'content'],
                    type: 'best_fields',
                    fuzziness: 'AUTO'
                  }
                }
              ]
            }
          },
          highlight: {
            fields: { '*': {} },
            pre_tags: ['<mark>'],
            post_tags: ['</mark>']
          }
        }
      });

      return {
        results: result.hits.hits.map(hit => ({
          id: hit._id,
          index: hit._index.replace(`${this.indexPrefix}-`, ''),
          score: hit._score,
          ...hit._source,
          highlights: hit.highlight
        })),
        total: result.hits.total.value
      };
    } catch (error) {
      console.error('[Elasticsearch] Global search error:', error.message);
      // Rethrow so the service layer can fall back to PostgreSQL
      throw error;
    }
  }

  async getAggregations(indexType, tenantId, aggregations) {
    if (!this.isConnected) return {};

    const indexName = `${this.indexPrefix}-${indexType}`;

    try {
      const result = await this.client.search({
        index: indexName,
        body: {
          size: 0,
          query: { term: { tenant_id: tenantId } },
          aggs: aggregations
        }
      });

      return result.aggregations;
    } catch (error) {
      console.error('[Elasticsearch] Aggregation error:', error.message);
      return {};
    }
  }

  async logAudit(tenantId, logEntry) {
    const id = logEntry.id || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    return this.indexDocument('audit-logs', id, {
      user_id: logEntry.user_id,
      user_email: logEntry.user_email || null,
      action: logEntry.action,
      entity_type: logEntry.resource_type || logEntry.entity_type,
      entity_id: logEntry.resource_id || logEntry.entity_id,
      entity_name: logEntry.metadata?.resource_name || logEntry.entity_name || null,
      changes: logEntry.changes,
      ip_address: logEntry.ip_address && logEntry.ip_address.includes(':') ? null : logEntry.ip_address, // Ensure valid IPv4/IPv6 compatibility
      tenant_id: tenantId,
      timestamp: logEntry.created_at || logEntry.timestamp || new Date().toISOString()
    }, tenantId);
  }

  async searchAuditLogs(tenantId, options = {}) {
    const { userId, action, entityType, startDate, endDate, page = 1, limit = 50 } = options;

    const filters = {};
    if (userId) filters.user_id = userId;
    if (action) filters.action = action;
    if (entityType) filters.entity_type = entityType;

    return this.search('audit-logs', null, tenantId, {
      page,
      limit,
      filters,
      sort: [{ timestamp: 'desc' }]
    });
  }

  async healthCheck() {
    if (!this.client) {
      return { status: 'disconnected', healthy: false };
    }

    try {
      const health = await this.client.cluster.health();
      return {
        status: health.status,
        healthy: health.status !== 'red',
        cluster_name: health.cluster_name,
        number_of_nodes: health.number_of_nodes
      };
    } catch (error) {
      return { status: 'error', healthy: false, error: error.message };
    }
  }

  _getDocumentMapping() {
    return {
      properties: {
        tenant_id: { type: 'keyword' },
        document_number: { type: 'keyword' },
        title: { type: 'text', analyzer: 'qassure_analyzer' },
        description: { type: 'text', analyzer: 'qassure_analyzer' },
        category: { type: 'keyword' },
        status: { type: 'keyword' },
        version: { type: 'keyword' },
        indexed_at: { type: 'date' }
      }
    };
  }

  _getCapaMapping() {
    return {
      properties: {
        tenant_id: { type: 'keyword' },
        capa_number: { type: 'keyword' },
        title: { type: 'text', analyzer: 'qassure_analyzer' },
        description: { type: 'text', analyzer: 'qassure_analyzer' },
        problem_statement: { type: 'text', analyzer: 'qassure_analyzer' },
        capa_type: { type: 'keyword' },
        priority: { type: 'keyword' },
        status: { type: 'keyword' },
        indexed_at: { type: 'date' }
      }
    };
  }

  _getTrainingMapping() {
    return {
      properties: {
        tenant_id: { type: 'keyword' },
        course_code: { type: 'keyword' },
        title: { type: 'text', analyzer: 'qassure_analyzer' },
        description: { type: 'text', analyzer: 'qassure_analyzer' },
        category: { type: 'keyword' },
        status: { type: 'keyword' },
        indexed_at: { type: 'date' }
      }
    };
  }

  _getSupplierMapping() {
    return {
      properties: {
        tenant_id: { type: 'keyword' },
        supplier_code: { type: 'keyword' },
        name: { type: 'text', analyzer: 'qassure_analyzer' },
        supplier_type: { type: 'keyword' },
        category: { type: 'keyword' },
        status: { type: 'keyword' },
        current_score: { type: 'float' },
        score_grade: { type: 'keyword' },
        indexed_at: { type: 'date' }
      }
    };
  }

  _getAuditLogMapping() {
    return {
      properties: {
        tenant_id: { type: 'keyword' },
        user_id: { type: 'keyword' },
        user_email: { type: 'keyword' },
        action: { type: 'keyword' },
        entity_type: { type: 'keyword' },
        entity_id: { type: 'keyword' },
        entity_name: { type: 'text' },
        changes: { type: 'object', enabled: false },
        ip_address: { type: 'ip' },
        timestamp: { type: 'date' }
      }
    };
  }
}

let instance = null;
const getElasticsearchService = () => {
  if (!instance) instance = new ElasticsearchService();
  return instance;
};

module.exports = { ElasticsearchService, getElasticsearchService };
