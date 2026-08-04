const Qmssyncconflict = require('../sequelize-models/qms_sync_conflict');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class QmssyncconflictService {
  /**
   * Get all qmssyncconflicts
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Qmssyncconflict.findAndCountAll({
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
      throw new Error(`Failed to fetch qmssyncconflicts: ${error.message}`);
    }
  }

  /**
   * Get qmssyncconflict by ID
   */
  async findById(id) {
    try {
      const qmssyncconflict = await Qmssyncconflict.findByPk(id, {
      });

      if (!qmssyncconflict) {
        throw new Error('Qmssyncconflict not found');
      }

      return qmssyncconflict;
    } catch (error) {
      throw new Error(`Failed to fetch qmssyncconflict: ${error.message}`);
    }
  }

  /**
   * Create new qmssyncconflict
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      this.isResolved(data, null);
      this.validateResolution(data, null);
      this.validateStatus(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const qmssyncconflict = await Qmssyncconflict.create(data);

      return qmssyncconflict;
    } catch (error) {
      throw new Error(`Failed to create qmssyncconflict: ${error.message}`);
    }
  }

  /**
   * Update qmssyncconflict
   */
  async update(id, data) {
    try {
      // Check if exists
      const qmssyncconflict = await this.findById(id);

      // Auto-generated validation calls (before_update)
     if(data.status) this.isResolved(data, qmssyncconflict);
     if(data.resolution_strategy) this.validateResolution(data, qmssyncconflict);
     if(data.status) this.validateStatus(data, qmssyncconflict);

      await qmssyncconflict.update(data);
      await qmssyncconflict.reload();

      return qmssyncconflict;
    } catch (error) {
      throw new Error(`Failed to update qmssyncconflict: ${error.message}`);
    }
  }

  /**
   * Delete qmssyncconflict
   */
  async delete(id) {
    try {
      // Check if exists
      const qmssyncconflict = await this.findById(id);

      await qmssyncconflict.destroy();

      return { message: 'Qmssyncconflict deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete qmssyncconflict: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Conflicts require manual resolution
   * @generated from DSL function
   * @classification validation
   */
  isResolved(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmssyncconflict = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmssyncconflict.status;
    const id = qmssyncconflict.id;
    const tenant_id = qmssyncconflict.tenant_id;
    const version = qmssyncconflict.version;
    const module_id = qmssyncconflict.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (status !== 'RESOLVED' && status !== 'PENDING') {
      throw new Error(`Conflict status allows PENDING or RESOLVED only by default logic, but business rule implies manual resolution required for completion.`);
    }
    // This rule likely meant to block downstream processes if conflict is open, but for persistence, PENDING is valid.
    // So we basically allow it if it's PENDING.
    if (status === 'RESOLVED' && !qmssyncconflict.resolution_strategy) {
      throw new Error('Resolved conflicts must have a resolution strategy');
    }
  }

  /**
   * Resolution strategy must be valid
   * @generated from DSL function
   * @classification validation
   */
  validateResolution(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmssyncconflict = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmssyncconflict.status;
    const id = qmssyncconflict.id;
    const tenant_id = qmssyncconflict.tenant_id;
    const version = qmssyncconflict.version;
    const module_id = qmssyncconflict.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (qmssyncconflict.resolution_strategy != null) {
      let validStrategies = ['USE_QMS', 'USE_QASSURE', 'MERGE', 'SKIP'];
      if (!validStrategies.includes(qmssyncconflict.resolution_strategy)) {
        throw new Error(`Invalid resolution strategy. Must be one of: USE_QMS, USE_QASSURE, MERGE, SKIP`);
      }
    }
  }

  /**
   * Conflict status must be PENDING or RESOLVED
   * @generated from DSL function
   * @classification validation
   */
  validateStatus(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmssyncconflict = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmssyncconflict.status;
    const id = qmssyncconflict.id;
    const tenant_id = qmssyncconflict.tenant_id;
    const version = qmssyncconflict.version;
    const module_id = qmssyncconflict.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (!(['PENDING', 'RESOLVED'].includes(status))) {
      throw new Error(`Conflict status must be either PENDING or RESOLVED`);
    }
  }

  // =========== Custom Service Methods ===========

  // =========== Query Methods (findBy*) ===========
  /**
   * Find qmssyncconflicts by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by sync_job_id
   */
  async findBySyncJobId(sync_job_id) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          sync_job_id: sync_job_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by sync_job_id: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by qms_connection_id
   */
  async findByQmsConnectionId(qms_connection_id) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          qms_connection_id: qms_connection_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by qms_connection_id: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by entity_type
   */
  async findByEntityType(entity_type) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          entity_type: entity_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by entity_type: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by entity_id
   */
  async findByEntityId(entity_id) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          entity_id: entity_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by entity_id: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by qms_record_id
   */
  async findByQmsRecordId(qms_record_id) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          qms_record_id: qms_record_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by qms_record_id: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by qassure_record_id
   */
  async findByQassureRecordId(qassure_record_id) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          qassure_record_id: qassure_record_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by qassure_record_id: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by conflict_type
   */
  async findByConflictType(conflict_type) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          conflict_type: conflict_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by conflict_type: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by conflict_field
   */
  async findByConflictField(conflict_field) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          conflict_field: conflict_field
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by conflict_field: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by qms_value
   */
  async findByQmsValue(qms_value) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          qms_value: qms_value
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by qms_value: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by qassure_value
   */
  async findByQassureValue(qassure_value) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          qassure_value: qassure_value
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by qassure_value: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by conflict_details
   */
  async findByConflictDetails(conflict_details) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          conflict_details: conflict_details
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by conflict_details: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by status
   */
  async findByStatus(status) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by status: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by resolution_strategy
   */
  async findByResolutionStrategy(resolution_strategy) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          resolution_strategy: resolution_strategy
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by resolution_strategy: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by resolved_value
   */
  async findByResolvedValue(resolved_value) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          resolved_value: resolved_value
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by resolved_value: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by resolved_by
   */
  async findByResolvedBy(resolved_by) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          resolved_by: resolved_by
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by resolved_by: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by resolved_at
   */
  async findByResolvedAt(resolved_at) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          resolved_at: resolved_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by resolved_at: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by resolution_notes
   */
  async findByResolutionNotes(resolution_notes) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          resolution_notes: resolution_notes
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by resolution_notes: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by retry_count
   */
  async findByRetryCount(retry_count) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          retry_count: retry_count
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by retry_count: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by last_retry_at
   */
  async findByLastRetryAt(last_retry_at) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          last_retry_at: last_retry_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by last_retry_at: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by error_message
   */
  async findByErrorMessage(error_message) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          error_message: error_message
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by error_message: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by created_at: ${error.message}`);
    }
  }
  /**
   * Find qmssyncconflicts by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Qmssyncconflict.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncconflicts by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the tenant for this qmssyncconflict
   */
  async getTenant(id) {
    try {
      const qmssyncconflict = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (qmssyncconflict.tenant_id) {
        const result = await tenantService.findById(qmssyncconflict.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for qmssyncconflict: ${error.message}`);
    }
  }
  /**
   * Get the qmssyncjob for this qmssyncconflict
   */
  async getQmsSyncJob(id) {
    try {
      const qmssyncconflict = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const qmssyncjobService = require('./qms_sync_job_service');
      if (qmssyncconflict.sync_job_id) {
        const result = await qmssyncjobService.findById(qmssyncconflict.sync_job_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get qmssyncjob for qmssyncconflict: ${error.message}`);
    }
  }
  /**
   * Get the qmsconnection for this qmssyncconflict
   */
  async getQmsConnection(id) {
    try {
      const qmssyncconflict = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const qmsconnectionService = require('./qms_connection_service');
      if (qmssyncconflict.qms_connection_id) {
        const result = await qmsconnectionService.findById(qmssyncconflict.qms_connection_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get qmsconnection for qmssyncconflict: ${error.message}`);
    }
  }
  /**
   * Get the user for this qmssyncconflict
   */
  async getUser(id) {
    try {
      const qmssyncconflict = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (qmssyncconflict.resolved_by) {
        const result = await userService.findById(qmssyncconflict.resolved_by);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for qmssyncconflict: ${error.message}`);
    }
  }

}

module.exports = new QmssyncconflictService();

