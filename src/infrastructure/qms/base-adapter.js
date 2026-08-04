/**
 * Base QMS Adapter - QAssure Platform
 * Abstract base class for all QMS integrations
 */

class BaseQMSAdapter {
  constructor(config = {}) {
    this.name = 'base';
    this.displayName = 'Base QMS';
    this.version = '1.0.0';
    this.config = config;
    this.connected = false;
    
    // Supported entity types
    this.supportedEntities = [];
    
    // Supported operations
    this.supportedOperations = ['read', 'write', 'sync'];
    
    // Rate limiting
    this.rateLimits = {
      requestsPerMinute: 60,
      requestsPerHour: 1000
    };
  }

  // ==================== Connection ====================

  /**
   * Initialize connection to QMS
   * Must be implemented by subclass
   */
  async connect() {
    throw new Error('connect() must be implemented by subclass');
  }

  /**
   * Disconnect from QMS
   */
  async disconnect() {
    this.connected = false;
  }

  /**
   * Test connection
   */
  async testConnection() {
    try {
      await this.connect();
      const result = await this.healthCheck();
      return {
        success: true,
        message: 'Connection successful',
        details: result
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        error: error.code || 'CONNECTION_FAILED'
      };
    }
  }

  /**
   * Health check
   * Must be implemented by subclass
   */
  async healthCheck() {
    throw new Error('healthCheck() must be implemented by subclass');
  }

  // ==================== Entity Operations ====================

  /**
   * Get available entity types
   */
  getEntityTypes() {
    return this.supportedEntities;
  }

  /**
   * Get entity schema/fields
   * Must be implemented by subclass
   */
  async getEntitySchema(entityType) {
    throw new Error('getEntitySchema() must be implemented by subclass');
  }

  /**
   * Get entity by ID
   * Must be implemented by subclass
   */
  async getEntity(entityType, entityId) {
    throw new Error('getEntity() must be implemented by subclass');
  }

  /**
   * List entities with pagination
   * Must be implemented by subclass
   */
  async listEntities(entityType, options = {}) {
    throw new Error('listEntities() must be implemented by subclass');
  }

  /**
   * Create entity
   * Must be implemented by subclass
   */
  async createEntity(entityType, data) {
    throw new Error('createEntity() must be implemented by subclass');
  }

  /**
   * Update entity
   * Must be implemented by subclass
   */
  async updateEntity(entityType, entityId, data) {
    throw new Error('updateEntity() must be implemented by subclass');
  }

  /**
   * Delete entity
   * Must be implemented by subclass
   */
  async deleteEntity(entityType, entityId) {
    throw new Error('deleteEntity() must be implemented by subclass');
  }

  // ==================== Sync Operations ====================

  /**
   * Get changes since last sync
   * Must be implemented by subclass
   */
  async getChanges(entityType, since, options = {}) {
    throw new Error('getChanges() must be implemented by subclass');
  }

  /**
   * Bulk fetch entities
   */
  async bulkFetch(entityType, entityIds) {
    const results = [];
    for (const id of entityIds) {
      try {
        const entity = await this.getEntity(entityType, id);
        results.push({ id, success: true, data: entity });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return results;
  }

  /**
   * Bulk create entities
   */
  async bulkCreate(entityType, entities) {
    const results = [];
    for (const entity of entities) {
      try {
        const created = await this.createEntity(entityType, entity);
        results.push({ success: true, data: created });
      } catch (error) {
        results.push({ success: false, error: error.message, data: entity });
      }
    }
    return results;
  }

  /**
   * Bulk update entities
   */
  async bulkUpdate(entityType, updates) {
    const results = [];
    for (const { id, data } of updates) {
      try {
        const updated = await this.updateEntity(entityType, id, data);
        results.push({ id, success: true, data: updated });
      } catch (error) {
        results.push({ id, success: false, error: error.message });
      }
    }
    return results;
  }

  // ==================== Field Mapping ====================

  /**
   * Transform QMS entity to QAssure format
   * Override in subclass for custom mapping
   */
  transformToInternal(entityType, externalData) {
    return externalData;
  }

  /**
   * Transform QAssure entity to QMS format
   * Override in subclass for custom mapping
   */
  transformToExternal(entityType, internalData) {
    return internalData;
  }

  // ==================== Document Operations ====================

  /**
   * Get document content
   * Must be implemented by subclass if supported
   */
  async getDocumentContent(documentId) {
    throw new Error('getDocumentContent() not supported by this adapter');
  }

  /**
   * Upload document
   * Must be implemented by subclass if supported
   */
  async uploadDocument(entityType, entityId, file, metadata = {}) {
    throw new Error('uploadDocument() not supported by this adapter');
  }

  // ==================== Utilities ====================

  /**
   * Get adapter info
   */
  getInfo() {
    return {
      name: this.name,
      displayName: this.displayName,
      version: this.version,
      connected: this.connected,
      supportedEntities: this.supportedEntities,
      supportedOperations: this.supportedOperations,
      rateLimits: this.rateLimits
    };
  }

  /**
   * Validate configuration
   */
  validateConfig(config) {
    const errors = [];
    // Override in subclass to add specific validation
    return errors;
  }

  /**
   * Handle API errors
   */
  handleError(error) {
    return {
      code: error.code || 'UNKNOWN_ERROR',
      message: error.message,
      details: error.details || null,
      retryable: this.isRetryableError(error)
    };
  }

  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    const retryableCodes = [408, 429, 500, 502, 503, 504];
    return retryableCodes.includes(error.status || error.code);
  }
}

module.exports = { BaseQMSAdapter };
