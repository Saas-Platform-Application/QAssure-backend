const Eventlog = require('../sequelize-models/event_log');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class EventlogService {
  /**
   * Get all eventlogs
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Eventlog.findAndCountAll({
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
      throw new Error(`Failed to fetch eventlogs: ${error.message}`);
    }
  }

  /**
   * Get eventlog by ID
   */
  async findById(id) {
    try {
      const eventlog = await Eventlog.findByPk(id, {
      });

      if (!eventlog) {
        throw new Error('Eventlog not found');
      }

      return eventlog;
    } catch (error) {
      throw new Error(`Failed to fetch eventlog: ${error.message}`);
    }
  }

  /**
   * Create new eventlog
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      this.validateEventType(data, null);
      this.validateVersion(data, null);
      this.hasCorrelationId(data, null);

      // Auto-generated calculation calls (before_create)
      this.getPartitionKey(data);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const eventlog = await Eventlog.create(data);

      return eventlog;
    } catch (error) {
      throw new Error(`Failed to create eventlog: ${error.message}`);
    }
  }

  /**
   * Update eventlog
   */
  async update(id, data) {
    try {
      // Check if exists
      const eventlog = await this.findById(id);

      // Auto-generated validation calls (before_update)
      if (data.event_type) this.validateEventType(data, eventlog);
      if (data.spec_version) this.validateVersion(data, eventlog);
      if (data.correlation_id) this.hasCorrelationId(data, eventlog);

      await eventlog.update(data);
      await eventlog.reload();

      return eventlog;
    } catch (error) {
      throw new Error(`Failed to update eventlog: ${error.message}`);
    }
  }

  /**
   * Delete eventlog
   */
  async delete(id) {
    try {
      // Check if exists
      const eventlog = await this.findById(id);

      await eventlog.destroy();

      return { message: 'Eventlog deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete eventlog: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Event type must be valid CloudEvents type
   * @generated from DSL function
   * @classification validation
   */
  validateEventType(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const eventlog = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = eventlog.status;
    const id = eventlog.id;
    const tenant_id = eventlog.tenant_id;
    const version = eventlog.version;
    const module_id = eventlog.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (!/^([a-z0-9-]+\.)+[a-z0-9-]+$/.test(eventlog.event_type)) {
      throw new Error(`Invalid event type format. Must follow CloudEvents format: lowercase alphanumeric with hyphens, separated by dots (e.g., com.example.user-created)`);
    }
  }

  /**
   * Partition keys ensure event ordering
   * @generated from DSL function
   * @classification calculation
   */
  getPartitionKey(eventlog) {
    eventlog.kafka_key = `${eventlog.tenant_id}:${eventlog.event_subject}`;
  }

  /**
   * CloudEvents version must be 1.0
   * @generated from DSL function
   * @classification validation
   */
  validateVersion(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const eventlog = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = eventlog.status;
    const id = eventlog.id;
    const tenant_id = eventlog.tenant_id;
    const version = eventlog.version;
    const module_id = eventlog.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (eventlog.spec_version !== '1.0') {
      throw new Error(`CloudEvents version must be 1.0`);
    }
  }

  /**
   * Events must have correlation ID
   * @generated from DSL function
   * @classification validation
   */
  hasCorrelationId(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const eventlog = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = eventlog.status;
    const id = eventlog.id;
    const tenant_id = eventlog.tenant_id;
    const version = eventlog.version;
    const module_id = eventlog.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (eventlog.correlation_id == null || eventlog.correlation_id.length == 0) {
      throw new Error(`Correlation ID is required and cannot be empty`);
    }
  }

  // =========== Custom Service Methods ===========
  /**
   * Get event details
   * GET /api/v1/events/:eventId
   */
  async findOne(eventId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Eventlog;
      const entityName = 'Eventlog';
      const entityNameCamel = 'eventlog';
      // Find entity by first parameter (e.g., moduleId, userId, etc.)
      // Try to find using query method if available (e.g., findByModuleId)
      // Fallback: Find by field using findAll
      const results = await EntityModel.findAll({
        where: {
          eventId: eventId
        }
      });
      if (!results || results.length === 0) {
        throw new Error(`${entityName} not found`);
      }
      return results[0];
    } catch (error) {
      throw new Error(`Failed to execute findOne: ${error.message}`);
    }
  }
  /**
   * Publish event
   * POST /api/v1/events/publish
   */
  async publish(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Eventlog;
      const entityName = 'Eventlog';
      const entityNameCamel = 'eventlog';
      // Custom method implementation
      // TODO: Implement publish logic
      throw new Error('Method publish not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute publish: ${error.message}`);
    }
  }

  // =========== Query Methods (findBy*) ===========
  /**
   * Find eventlogs by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Eventlog.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by event_id
   */
  async findByEventId(event_id) {
    try {
      const results = await Eventlog.findAll({
        where: {
          event_id: event_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by event_id: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by event_type
   */
  async findByEventType(event_type) {
    try {
      const results = await Eventlog.findAll({
        where: {
          event_type: event_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by event_type: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by event_source
   */
  async findByEventSource(event_source) {
    try {
      const results = await Eventlog.findAll({
        where: {
          event_source: event_source
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by event_source: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by event_subject
   */
  async findByEventSubject(event_subject) {
    try {
      const results = await Eventlog.findAll({
        where: {
          event_subject: event_subject
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by event_subject: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by event_time
   */
  async findByEventTime(event_time) {
    try {
      const results = await Eventlog.findAll({
        where: {
          event_time: event_time
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by event_time: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by spec_version
   */
  async findBySpecVersion(spec_version) {
    try {
      const results = await Eventlog.findAll({
        where: {
          spec_version: spec_version
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by spec_version: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by data_content_type
   */
  async findByDataContentType(data_content_type) {
    try {
      const results = await Eventlog.findAll({
        where: {
          data_content_type: data_content_type
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by data_content_type: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by data_schema
   */
  async findByDataSchema(data_schema) {
    try {
      const results = await Eventlog.findAll({
        where: {
          data_schema: data_schema
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by data_schema: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by data
   */
  async findByData(data) {
    try {
      const results = await Eventlog.findAll({
        where: {
          data: data
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by data: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by correlation_id
   */
  async findByCorrelationId(correlation_id) {
    try {
      const results = await Eventlog.findAll({
        where: {
          correlation_id: correlation_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by correlation_id: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by causation_id
   */
  async findByCausationId(causation_id) {
    try {
      const results = await Eventlog.findAll({
        where: {
          causation_id: causation_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by causation_id: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by kafka_topic
   */
  async findByKafkaTopic(kafka_topic) {
    try {
      const results = await Eventlog.findAll({
        where: {
          kafka_topic: kafka_topic
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by kafka_topic: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by kafka_partition
   */
  async findByKafkaPartition(kafka_partition) {
    try {
      const results = await Eventlog.findAll({
        where: {
          kafka_partition: kafka_partition
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by kafka_partition: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by kafka_offset
   */
  async findByKafkaOffset(kafka_offset) {
    try {
      const results = await Eventlog.findAll({
        where: {
          kafka_offset: kafka_offset
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by kafka_offset: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by kafka_key
   */
  async findByKafkaKey(kafka_key) {
    try {
      const results = await Eventlog.findAll({
        where: {
          kafka_key: kafka_key
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by kafka_key: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by producer_id
   */
  async findByProducerId(producer_id) {
    try {
      const results = await Eventlog.findAll({
        where: {
          producer_id: producer_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by producer_id: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by published_at
   */
  async findByPublishedAt(published_at) {
    try {
      const results = await Eventlog.findAll({
        where: {
          published_at: published_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by published_at: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by consumed_at
   */
  async findByConsumedAt(consumed_at) {
    try {
      const results = await Eventlog.findAll({
        where: {
          consumed_at: consumed_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by consumed_at: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by consumer_group
   */
  async findByConsumerGroup(consumer_group) {
    try {
      const results = await Eventlog.findAll({
        where: {
          consumer_group: consumer_group
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by consumer_group: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by processing_status
   */
  async findByProcessingStatus(processing_status) {
    try {
      const results = await Eventlog.findAll({
        where: {
          processing_status: processing_status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by processing_status: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by retry_count
   */
  async findByRetryCount(retry_count) {
    try {
      const results = await Eventlog.findAll({
        where: {
          retry_count: retry_count
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by retry_count: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by error_message
   */
  async findByErrorMessage(error_message) {
    try {
      const results = await Eventlog.findAll({
        where: {
          error_message: error_message
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by error_message: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by metadata
   */
  async findByMetadata(metadata) {
    try {
      const results = await Eventlog.findAll({
        where: {
          metadata: metadata
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by metadata: ${error.message}`);
    }
  }
  /**
   * Find eventlogs by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Eventlog.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find eventlogs by created_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the tenant for this eventlog
   */
  async getTenant(id) {
    try {
      const eventlog = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (eventlog.tenant_id) {
        const result = await tenantService.findById(eventlog.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for eventlog: ${error.message}`);
    }
  }

}

module.exports = new EventlogService();

