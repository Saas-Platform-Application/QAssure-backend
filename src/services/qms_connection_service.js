const Qmsconnection = require('../sequelize-models/qms_connection');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class QmsconnectionService {
  /**
   * Get all qmsconnections
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Qmsconnection.findAndCountAll({
        where,
        limit: take,
        offset: skip,
        order: order,
      });

      return {
        data: rows,
        total: count,
        skip,
        take,
        hasMore: skip + take < count
      };
    } catch (error) {
      throw new Error(`Failed to fetch qmsconnections: ${error.message}`);
    }
  }

  /**
   * Get qmsconnection by ID
   */
  async findById(id) {
    try {
      const qmsconnection = await Qmsconnection.findByPk(id, {
      });

      if (!qmsconnection) {
        throw new Error('Qmsconnection not found');
      }

      return qmsconnection;
    } catch (error) {
      throw new Error(`Failed to fetch qmsconnection: ${error.message}`);
    }
  }

  /**
   * Create new qmsconnection
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      this.validateSyncMode(data, null);
      this.validateAuthType(data, null);
      this.validateSystem(data, null);
      this.validateStatus(data, null);
      this.validateSignature(data, null);

      // Auto-generated calculation calls (before_create)
      this.getRetryDelay(data);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const qmsconnection = await Qmsconnection.create(data);

      return qmsconnection;
    } catch (error) {
      throw new Error(`Failed to create qmsconnection: ${error.message}`);
    }
  }

  /**
   * Update qmsconnection
   */
  async update(id, data) {
    try {
      // Check if exists
      const qmsconnection = await this.findById(id);

      // Auto-generated validation calls (before_update)
      if(data.sync_mode) this.validateSyncMode(data, qmsconnection);
      if(data.auth_type) this.validateAuthType(data, qmsconnection);
      if(data.qms_type) this.validateSystem(data, qmsconnection);
      if(data.status) this.validateStatus(data, qmsconnection);
      if(data.should_retry) this.shouldRetry(data, qmsconnection);
      if(data.signature) this.validateSignature(data, qmsconnection);

      // Auto-generated calculation calls (before_update)
      this.getRetryDelay(qmsconnection, data);

      await qmsconnection.update(data);
      await qmsconnection.reload();

      return qmsconnection;
    } catch (error) {
      throw new Error(`Failed to update qmsconnection: ${error.message}`);
    }
  }

  /**
   * Delete qmsconnection
   */
  async delete(id) {
    try {
      // Check if exists
      const qmsconnection = await this.findById(id);

      await qmsconnection.destroy();

      return { message: 'Qmsconnection deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete qmsconnection: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Sync mode must be valid direction
   * @generated from DSL function
   * @classification validation
   */
  validateSyncMode(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmsconnection = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmsconnection.status;
    const id = qmsconnection.id;
    const tenant_id = qmsconnection.tenant_id;
    const version = qmsconnection.version;
    const module_id = qmsconnection.module_id;
    const context = { user: { tenant_id: tenant_id } };
    let validSyncModes = ['QMS_TO_QASSURE', 'QASSURE_TO_QMS', 'BIDIRECTIONAL'];
    if (!validSyncModes.includes(qmsconnection.sync_mode)) {
      throw new Error(`Invalid sync mode. Must be one of: QMS_TO_QASSURE, QASSURE_TO_QMS, or BIDIRECTIONAL`);
    }
  }

  /**
   * Auth type must be valid
   * @generated from DSL function
   * @classification validation
   */
  validateAuthType(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmsconnection = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmsconnection.status;
    const id = qmsconnection.id;
    const tenant_id = qmsconnection.tenant_id;
    const version = qmsconnection.version;
    const module_id = qmsconnection.module_id;
    const context = { user: { tenant_id: tenant_id } };
    let validAuthTypes = ['OAUTH2', 'API_KEY', 'BASIC_AUTH', 'SAML'];
    if (!validAuthTypes.includes(qmsconnection.auth_type)) {
      throw new Error(`Invalid auth type. Must be one of: OAUTH2, API_KEY, BASIC, SAML`);
    }
  }

  /**
   * QMS system must be supported
   * @generated from DSL function
   * @classification validation
   */
  validateSystem(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmsconnection = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmsconnection.status;
    const id = qmsconnection.id;
    const tenant_id = qmsconnection.tenant_id;
    const version = qmsconnection.version;
    const module_id = qmsconnection.module_id;
    const context = { user: { tenant_id: tenant_id } };
    let supportedSystems = ['VEEVA_VAULT', 'MASTERCONTROL', 'ARENA_PLM', 'TRACKWISE', 'ETQ_RELIANCE'];
    if (!supportedSystems.includes(qmsconnection.qms_type)) {
      throw new Error(`QMS system '{qmsconnection.qms_type}' is not supported. Supported systems are: veeva-vault, mastercontrol, arena-plm, trackwise, etq-reliance`);
    }
  }

  /**
   * Connection status must be valid
   * @generated from DSL function
   * @classification validation
   */
  validateStatus(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmsconnection = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmsconnection.status;
    const id = qmsconnection.id;
    const tenant_id = qmsconnection.tenant_id;
    const version = qmsconnection.version;
    const module_id = qmsconnection.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (!(['ACTIVE', 'INACTIVE', 'ERROR'].includes(status))) {
      throw new Error(`Invalid connection status. Must be one of: ACTIVE, INACTIVE, ERROR`);
    }
  }

  /**
   * Webhook failures trigger retry with backoff
   * @generated from DSL function
   * @classification validation
   */
  shouldRetry(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmsconnection = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmsconnection.status;
    const id = qmsconnection.id;
    const tenant_id = qmsconnection.tenant_id;
    const version = qmsconnection.version;
    const module_id = qmsconnection.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (attemptCount < maxRetries) {
      qmsconnection.status = retrying;
    }
    if (attemptCount >= maxRetries) {
      throw new Error(`Webhook retry limit exceeded`);
    }
  }

  /**
   * Exponential backoff for webhook retries
   * @generated from DSL function
   * @classification calculation
   */
  getRetryDelay(data) {
    return; // Disabled for now
    let exponentialDelay = 1000 * Math.pow(2, attemptCount);
    let maxDelay = 60000;
    retryDelay = Math.min(exponentialDelay, maxDelay);
  }

  /**
   * Webhook requests must have valid signature
   * @generated from DSL function
   * @classification validation
   */
  validateSignature(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmsconnection = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmsconnection.status;
    const id = qmsconnection.id;
    const tenant_id = qmsconnection.tenant_id;
    const version = qmsconnection.version;
    const module_id = qmsconnection.module_id;
    const context = { user: { tenant_id: tenant_id } };
    /*
    // Validation Logic Disabled:
    // This logic attempts to validate a webhook signature but 'payload' and 'signature' 
    // are not available in the context of creating/updating a connection configuration.
    // This should likely be moved to a webhook handler endpoint instead.
    
    if (qmsconnection.webhook_url != null && qmsconnection.webhook_secret != null) {
      let crypto = require('crypto');
      let hmac = crypto.createHmac('sha256', qmsconnection.webhook_secret);
      let computed_signature = hmac.update(payload).digest('hex');
      if (computed_signature !== signature) {
        throw new Error(`Invalid webhook signature`);
      }
    }
    */
  }

  // =========== Custom Service Methods ===========
  /**
   * Create QMS connection
   * POST /api/v1/qms/connections
   */
  async createConnection(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement createConnection logic
      throw new Error('Method createConnection not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute createConnection: ${error.message}`);
    }
  }
  /**
   * List QMS connections
   * GET /api/v1/qms/connections
   */
  async listConnections(queryParams) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement listConnections logic
      throw new Error('Method listConnections not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute listConnections: ${error.message}`);
    }
  }
  /**
   * Get QMS connection
   * GET /api/v1/qms/connections/:connectionId
   */
  async getConnection(connectionId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement getConnection logic
      throw new Error('Method getConnection not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getConnection: ${error.message}`);
    }
  }
  /**
   * Update QMS connection
   * PUT /api/v1/qms/connections/:connectionId
   */
  async updateConnection(connectionId, data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement updateConnection logic
      throw new Error('Method updateConnection not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute updateConnection: ${error.message}`);
    }
  }
  /**
   * Delete QMS connection
   * DELETE /api/v1/qms/connections/:connectionId
   */
  async deleteConnection(connectionId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement deleteConnection logic
      throw new Error('Method deleteConnection not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute deleteConnection: ${error.message}`);
    }
  }
  /**
   * Test QMS connection
   * POST /api/v1/qms/connections/:connectionId/test
   */
  async testConnection(connectionId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement testConnection logic
      throw new Error('Method testConnection not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute testConnection: ${error.message}`);
    }
  }
  /**
   * Trigger sync job
   * POST /api/v1/qms/sync
   */
  async triggerSync(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement triggerSync logic
      throw new Error('Method triggerSync not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute triggerSync: ${error.message}`);
    }
  }
  /**
   * Get sync job status
   * GET /api/v1/qms/sync/:jobId
   */
  async getSyncJob(jobId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement getSyncJob logic
      throw new Error('Method getSyncJob not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getSyncJob: ${error.message}`);
    }
  }
  /**
   * List sync jobs
   * GET /api/v1/qms/sync
   */
  async listSyncJobs(queryParams) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement listSyncJobs logic
      throw new Error('Method listSyncJobs not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute listSyncJobs: ${error.message}`);
    }
  }
  /**
   * Cancel sync job
   * POST /api/v1/qms/sync/:jobId/cancel
   */
  async cancelSync(jobId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement cancelSync logic
      throw new Error('Method cancelSync not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute cancelSync: ${error.message}`);
    }
  }
  /**
   * List sync conflicts
   * GET /api/v1/qms/conflicts
   */
  async listConflicts(queryParams) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement listConflicts logic
      throw new Error('Method listConflicts not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute listConflicts: ${error.message}`);
    }
  }
  /**
   * Get conflict details
   * GET /api/v1/qms/conflicts/:conflictId
   */
  async getConflict(conflictId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement getConflict logic
      throw new Error('Method getConflict not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getConflict: ${error.message}`);
    }
  }
  /**
   * Resolve sync conflict
   * POST /api/v1/qms/conflicts/:conflictId/resolve
   */
  async resolveConflict(conflictId, data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement resolveConflict logic
      throw new Error('Method resolveConflict not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute resolveConflict: ${error.message}`);
    }
  }
  /**
   * Handle QMS webhook
   * POST /api/v1/qms/webhooks
   */
  async handleWebhook(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Qmsconnection;
      const entityName = 'Qmsconnection';
      const entityNameCamel = 'qmsconnection';
      // Custom method implementation
      // TODO: Implement handleWebhook logic
      throw new Error('Method handleWebhook not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute handleWebhook: ${error.message}`);
    }
  }

  // =========== Query Methods (findBy*) ===========
  /**
   * Find qmsconnections by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by name
   */
  async findByName(name) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          name: name
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by name: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by qms_type
   */
  async findByQmsType(qms_type) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          qms_type: qms_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by qms_type: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by base_url
   */
  async findByBaseUrl(base_url) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          base_url: base_url
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by base_url: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by auth_type
   */
  async findByAuthType(auth_type) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          auth_type: auth_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by auth_type: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by auth_config
   */
  async findByAuthConfig(auth_config) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          auth_config: auth_config
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by auth_config: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by sync_mode
   */
  async findBySyncMode(sync_mode) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          sync_mode: sync_mode
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by sync_mode: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by entity_mappings
   */
  async findByEntityMappings(entity_mappings) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          entity_mappings: entity_mappings
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by entity_mappings: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by field_mappings
   */
  async findByFieldMappings(field_mappings) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          field_mappings: field_mappings
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by field_mappings: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by webhook_url
   */
  async findByWebhookUrl(webhook_url) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          webhook_url: webhook_url
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by webhook_url: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by webhook_secret
   */
  async findByWebhookSecret(webhook_secret) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          webhook_secret: webhook_secret
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by webhook_secret: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by status
   */
  async findByStatus(status) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by status: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by last_sync_at
   */
  async findByLastSyncAt(last_sync_at) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          last_sync_at: last_sync_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by last_sync_at: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by last_error
   */
  async findByLastError(last_error) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          last_error: last_error
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by last_error: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by created_by
   */
  async findByCreatedBy(created_by) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          created_by: created_by
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by created_by: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by created_at: ${error.message}`);
    }
  }
  /**
   * Find qmsconnections by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Qmsconnection.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsconnections by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the tenant for this qmsconnection
   */
  async getTenant(id) {
    try {
      const qmsconnection = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (qmsconnection.tenant_id) {
        const result = await tenantService.findById(qmsconnection.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for qmsconnection: ${error.message}`);
    }
  }
  /**
   * Get the user for this qmsconnection
   */
  async getUser(id) {
    try {
      const qmsconnection = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (qmsconnection.created_by) {
        const result = await userService.findById(qmsconnection.created_by);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for qmsconnection: ${error.message}`);
    }
  }
  /**
   * Get all qmssyncjobs for this qmsconnection
   */
  async getQmsSyncJob(id) {
    try {
      const qmsconnection = await this.findById(id);
      // Get related entities (one-to-many)
      const qmssyncjobService = require('./qms_sync_job_service');
      const results = await qmssyncjobService.findAll({
        where: {
          connection_id: qmsconnection.id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get qmssyncjob for qmsconnection: ${error.message}`);
    }
  }

}

module.exports = new QmsconnectionService();

