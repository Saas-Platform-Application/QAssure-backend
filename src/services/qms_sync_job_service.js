const Qmssyncjob = require('../sequelize-models/qms_sync_job');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class QmssyncjobService {
  /**
   * Get all qmssyncjobs
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Qmssyncjob.findAndCountAll({
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
      throw new Error(`Failed to fetch qmssyncjobs: ${error.message}`);
    }
  }

  /**
   * Get qmssyncjob by ID
   */
  async findById(id) {
    try {
      const qmssyncjob = await Qmssyncjob.findByPk(id, {
      });

      if (!qmssyncjob) {
        throw new Error('Qmssyncjob not found');
      }

      return qmssyncjob;
    } catch (error) {
      throw new Error(`Failed to fetch qmssyncjob: ${error.message}`);
    }
  }

  /**
   * Create new qmssyncjob
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      this.validateJobType(data, null);
      this.validateStatus(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const qmssyncjob = await Qmssyncjob.create(data);

      return qmssyncjob;
    } catch (error) {
      throw new Error(`Failed to create qmssyncjob: ${error.message}`);
    }
  }

  /**
   * Update qmssyncjob
   */
  async update(id, data) {
    try {
      // Check if exists
      const qmssyncjob = await this.findById(id);

      // Auto-generated validation calls (before_update)
      if(data.job_type) this.validateJobType(data, qmssyncjob);
      if(data.status) this.validateStatus(data, qmssyncjob);
      if(data.metrics) this.updateMetrics(data, qmssyncjob);

      await qmssyncjob.update(data);
      await qmssyncjob.reload();

      return qmssyncjob;
    } catch (error) {
      throw new Error(`Failed to update qmssyncjob: ${error.message}`);
    }
  }

  /**
   * Delete qmssyncjob
   */
  async delete(id) {
    try {
      // Check if exists
      const qmssyncjob = await this.findById(id);

      await qmssyncjob.destroy();

      return { message: 'Qmssyncjob deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete qmssyncjob: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Sync job must be FULL, INCREMENTAL, or RECONCILIATION
   * @generated from DSL function
   * @classification validation
   */
  validateJobType(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmssyncjob = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmssyncjob.status;
    const id = qmssyncjob.id;
    const tenant_id = qmssyncjob.tenant_id;
    const version = qmssyncjob.version;
    const module_id = qmssyncjob.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (!(['FULL', 'INCREMENTAL', 'RECONCILIATION'].includes(qmssyncjob.job_type))) {
      throw new Error(`Invalid job type. Must be FULL, INCREMENTAL, or RECONCILIATION`);
    }
  }

  /**
   * Sync job status must be valid
   * @generated from DSL function
   * @classification validation
   */
  validateStatus(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmssyncjob = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmssyncjob.status;
    const id = qmssyncjob.id;
    const tenant_id = qmssyncjob.tenant_id;
    const version = qmssyncjob.version;
    const module_id = qmssyncjob.module_id;
    const context = { user: { tenant_id: tenant_id } };
    let validStatuses = ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid sync job status. Must be one of: PENDING, RUNNING, COMPLETED, FAILED, CANCELLED`);
    }
  }

  /**
   * Track records created/updated/failed
   * @generated from DSL function
   * @classification validation
   */
  updateMetrics(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const qmssyncjob = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = qmssyncjob.status;
    const id = qmssyncjob.id;
    const tenant_id = qmssyncjob.tenant_id;
    const version = qmssyncjob.version;
    const module_id = qmssyncjob.module_id;
    const context = { user: { tenant_id: tenant_id } };
    qmssyncjob.records_created = created;
    qmssyncjob.records_updated = updated;
    qmssyncjob.records_failed = failed;
  }

  // =========== Custom Service Methods ===========

  // =========== Query Methods (findBy*) ===========
  /**
   * Find qmssyncjobs by connection_id
   */
  async findByConnectionId(connection_id) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          connection_id: connection_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by connection_id: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by job_type
   */
  async findByJobType(job_type) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          job_type: job_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by job_type: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by direction
   */
  async findByDirection(direction) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          direction: direction
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by direction: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by status
   */
  async findByStatus(status) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by status: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by entity_type
   */
  async findByEntityType(entity_type) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          entity_type: entity_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by entity_type: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by records_total
   */
  async findByRecordsTotal(records_total) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          records_total: records_total
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by records_total: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by records_processed
   */
  async findByRecordsProcessed(records_processed) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          records_processed: records_processed
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by records_processed: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by records_created
   */
  async findByRecordsCreated(records_created) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          records_created: records_created
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by records_created: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by records_updated
   */
  async findByRecordsUpdated(records_updated) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          records_updated: records_updated
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by records_updated: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by records_failed
   */
  async findByRecordsFailed(records_failed) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          records_failed: records_failed
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by records_failed: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by conflicts_detected
   */
  async findByConflictsDetected(conflicts_detected) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          conflicts_detected: conflicts_detected
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by conflicts_detected: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by conflicts_resolved
   */
  async findByConflictsResolved(conflicts_resolved) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          conflicts_resolved: conflicts_resolved
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by conflicts_resolved: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by error_message
   */
  async findByErrorMessage(error_message) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          error_message: error_message
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by error_message: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by error_details
   */
  async findByErrorDetails(error_details) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          error_details: error_details
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by error_details: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by started_at
   */
  async findByStartedAt(started_at) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          started_at: started_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by started_at: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by completed_at
   */
  async findByCompletedAt(completed_at) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          completed_at: completed_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by completed_at: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by triggered_by
   */
  async findByTriggeredBy(triggered_by) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          triggered_by: triggered_by
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by triggered_by: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by metadata
   */
  async findByMetadata(metadata) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          metadata: metadata
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by metadata: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by created_at: ${error.message}`);
    }
  }
  /**
   * Find qmssyncjobs by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Qmssyncjob.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find qmssyncjobs by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the qmsconnection for this qmssyncjob
   */
  async getQmsConnection(id) {
    try {
      const qmssyncjob = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const qmsconnectionService = require('./qms_connection_service');
      if (qmssyncjob.connection_id) {
        const result = await qmsconnectionService.findById(qmssyncjob.connection_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get qmsconnection for qmssyncjob: ${error.message}`);
    }
  }
  /**
   * Get the user for this qmssyncjob
   */
  async getUser(id) {
    try {
      const qmssyncjob = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (qmssyncjob.triggered_by) {
        const result = await userService.findById(qmssyncjob.triggered_by);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for qmssyncjob: ${error.message}`);
    }
  }

}

module.exports = new QmssyncjobService();

