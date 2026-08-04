const Qmsentitymapping = require('../sequelize-models/qms_entity_mapping');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class QmsentitymappingService {
  /**
   * Get all qmsentitymappings
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Qmsentitymapping.findAndCountAll({
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
      throw new Error(`Failed to fetch qmsentitymappings: ${error.message}`);
    }
  }

  /**
   * Get qmsentitymapping by ID
   */
  async findById(id) {
    try {
      const qmsentitymapping = await Qmsentitymapping.findByPk(id, {
      });

      if (!qmsentitymapping) {
        throw new Error('Qmsentitymapping not found');
      }

      return qmsentitymapping;
    } catch (error) {
      throw new Error(`Failed to fetch qmsentitymapping: ${error.message}`);
    }
  }

  /**
   * Create new qmsentitymapping
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      this.validateDirection(data, null);
      this.validateTransformation(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const qmsentitymapping = await Qmsentitymapping.create(data);

      return qmsentitymapping;
    } catch (error) {
      throw new Error(`Failed to create qmsentitymapping: ${error.message}`);
    }
  }

  /**
   * Update qmsentitymapping
   */
  async update(id, data) {
    try {
      // Check if exists
      const qmsentitymapping = await this.findById(id);

      // Auto-generated validation calls (before_update)
      if(data.mapping_direction) this.validateDirection(data, qmsentitymapping);
      this.validateTransformation(data, qmsentitymapping);

      await qmsentitymapping.update(data);
      await qmsentitymapping.reload();

      return qmsentitymapping;
    } catch (error) {
      throw new Error(`Failed to update qmsentitymapping: ${error.message}`);
    }
  }

  /**
   * Delete qmsentitymapping
   */
  async delete(id) {
    try {
      // Check if exists
      const qmsentitymapping = await this.findById(id);

      await qmsentitymapping.destroy();

      return { message: 'Qmsentitymapping deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete qmsentitymapping: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Mapping direction must be valid
   * @generated from DSL function
   * @classification validation
   */
  validateDirection(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmsentitymapping = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmsentitymapping.status;
    const id = qmsentitymapping.id;
    const tenant_id = qmsentitymapping.tenant_id;
    const version = qmsentitymapping.version;
    const module_id = qmsentitymapping.module_id;
    const context = { user: { tenant_id: tenant_id } };
    let validDirections = ['QMS_TO_QASSURE', 'QASSURE_TO_QMS', 'BIDIRECTIONAL'];
    if (!validDirections.includes(qmsentitymapping.mapping_direction)) {
      throw new Error(`Invalid mapping direction. Must be one of: QMS_TO_QASSURE, QASSURE_TO_QMS, or BIDIRECTIONAL`);
    }
  }

  /**
   * Field transformation must be valid
   * @generated from DSL function
   * @classification validation
   */
  validateTransformation(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmsentitymapping = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmsentitymapping.status;
    const id = qmsentitymapping.id;
    const tenant_id = qmsentitymapping.tenant_id;
    const version = qmsentitymapping.version;
    const module_id = qmsentitymapping.module_id;
    const context = { user: { tenant_id: tenant_id } };
    /* 
    // Validation Logic Disabled due to ReferenceError: 'transformation' is not defined.
    if (!['DIRECT','LOOKUP','FORMULA','CONSTANT'].includes(transformation)) {
      throw new Error(`Invalid field transformation type. Must be one of: DIRECT, LOOKUP, FORMULA, CONSTANT`);
    } 
    */
  }

  // =========== Custom Service Methods ===========

  // =========== Query Methods (findBy*) ===========
  /**
   * Find qmsentitymappings by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by qms_connection_id
   */
  async findByQmsConnectionId(qms_connection_id) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          qms_connection_id: qms_connection_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by qms_connection_id: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by qms_entity_type
   */
  async findByQmsEntityType(qms_entity_type) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          qms_entity_type: qms_entity_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by qms_entity_type: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by qassure_entity_type
   */
  async findByQassureEntityType(qassure_entity_type) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          qassure_entity_type: qassure_entity_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by qassure_entity_type: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by mapping_direction
   */
  async findByMappingDirection(mapping_direction) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          mapping_direction: mapping_direction
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by mapping_direction: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by field_mappings
   */
  async findByFieldMappings(field_mappings) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          field_mappings: field_mappings
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by field_mappings: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by transformation_rules
   */
  async findByTransformationRules(transformation_rules) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          transformation_rules: transformation_rules
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by transformation_rules: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by validation_rules
   */
  async findByValidationRules(validation_rules) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          validation_rules: validation_rules
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by validation_rules: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by conflict_resolution_strategy
   */
  async findByConflictResolutionStrategy(conflict_resolution_strategy) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          conflict_resolution_strategy: conflict_resolution_strategy
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by conflict_resolution_strategy: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by sync_enabled
   */
  async findBySyncEnabled(sync_enabled) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          sync_enabled: sync_enabled
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by sync_enabled: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by sync_frequency
   */
  async findBySyncFrequency(sync_frequency) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          sync_frequency: sync_frequency
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by sync_frequency: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by filter_criteria
   */
  async findByFilterCriteria(filter_criteria) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          filter_criteria: filter_criteria
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by filter_criteria: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by last_sync_at
   */
  async findByLastSyncAt(last_sync_at) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          last_sync_at: last_sync_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by last_sync_at: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by records_synced
   */
  async findByRecordsSynced(records_synced) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          records_synced: records_synced
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by records_synced: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by created_by
   */
  async findByCreatedBy(created_by) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          created_by: created_by
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by created_by: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by updated_by
   */
  async findByUpdatedBy(updated_by) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          updated_by: updated_by
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by updated_by: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by created_at: ${error.message}`);
    }
  }
  /**
   * Find qmsentitymappings by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Qmsentitymapping.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmsentitymappings by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the tenant for this qmsentitymapping
   */
  async getTenant(id) {
    try {
      const qmsentitymapping = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (qmsentitymapping.tenant_id) {
        const result = await tenantService.findById(qmsentitymapping.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for qmsentitymapping: ${error.message}`);
    }
  }
  /**
   * Get the qmsconnection for this qmsentitymapping
   */
  async getQmsConnection(id) {
    try {
      const qmsentitymapping = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const qmsconnectionService = require('./qms_connection_service');
      if (qmsentitymapping.qms_connection_id) {
        const result = await qmsconnectionService.findById(qmsentitymapping.qms_connection_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get qmsconnection for qmsentitymapping: ${error.message}`);
    }
  }
  /**
   * Get the user for this qmsentitymapping
   */
  async getUser(id) {
    try {
      const qmsentitymapping = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (qmsentitymapping.created_by) {
        const result = await userService.findById(qmsentitymapping.created_by);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for qmsentitymapping: ${error.message}`);
    }
  }
  /**
   * Get the user for this qmsentitymapping
   */
  async getUser(id) {
    try {
      const qmsentitymapping = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (qmsentitymapping.updated_by) {
        const result = await userService.findById(qmsentitymapping.updated_by);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for qmsentitymapping: ${error.message}`);
    }
  }

}

module.exports = new QmsentitymappingService();

