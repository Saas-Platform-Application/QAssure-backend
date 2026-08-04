const Module = require('../sequelize-models/module');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ModuleService {
  /**
   * Get all modules
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Module.findAndCountAll({
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
      throw new Error(`Failed to fetch modules: ${error.message}`);
    }
  }

  /**
   * Get module by ID
   */
  async findById(id) {
    try {
      const module = await Module.findByPk(id, {
      });

      if (!module) {
        throw new Error('Module not found');
      }

      return module;
    } catch (error) {
      throw new Error(`Failed to fetch module: ${error.message}`);
    }
  }

  /**
   * Create new module
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      this.validateModuleId(data, null);
      this.validateVersion(data, null);
      this.validateStatus(data, null);
      this.canTransitionStatus(data, null);
      this.validateEndpoint(data, null);
      this.validateTopic(data, null);
      this.validateResources(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const module = await Module.create(data);

      return module;
    } catch (error) {
      throw new Error(`Failed to create module: ${error.message}`);
    }
  }

  /**
   * Update module
   */
  async update(id, data) {
    try {
      // Check if exists
      const module = await this.findById(id);

      // Auto-generated validation calls (before_update)
      this.validateModuleId(data, module);
      this.validateVersion(data, module);
      this.validateStatus(data, module);
      this.canTransitionStatus(data, module);
      this.validateEndpoint(data, module);
      this.validateTopic(data, module);
      this.validateResources(data, module);

      await module.update(data);
      await module.reload();

      return module;
    } catch (error) {
      throw new Error(`Failed to update module: ${error.message}`);
    }
  }

  /**
   * Delete module
   */
  async delete(id) {
    try {
      // Check if exists
      const module = await this.findById(id);

      await module.destroy();

      return { message: 'Module deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete module: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Module ID must match qassure.{name}.v{major}
   * @generated from DSL function
   * @classification validation
   */
  validateModuleId(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const module = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = module.status;
    const id = module.id;
    const tenant_id = module.tenant_id;
    const version = module.version;
    const module_id = module.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (!(/^qassure\.[a-z0-9-]+\.v\d+$/.test(module.module_id))) {
  throw new Error(`Module ID must match pattern qassure.{name}.v{major} (e.g., qassure.auth-service.v1)`);
}
  }

  /**
   * Version must follow {major}.{minor}.{patch}
   * @generated from DSL function
   * @classification validation
   */
  validateVersion(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const module = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = module.status;
    const id = module.id;
    const tenant_id = module.tenant_id;
    const version = module.version;
    const module_id = module.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (!(/^\d+\.\d+\.\d+$/.test(version))) {
  throw new Error(`Version must follow semantic versioning format: {major}.{minor}.{patch}`);
}
  }

  /**
   * Status must be valid lifecycle state
   * @generated from DSL function
   * @classification validation
   */
  validateStatus(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const module = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = module.status;
    const id = module.id;
    const tenant_id = module.tenant_id;
    const version = module.version;
    const module_id = module.module_id;
    const context = { user: { tenant_id: tenant_id } };
      let validStatuses = ['PENDING','ACTIVE','DEGRADED','SUSPENDED','DEPRECATED','RETIRED'];
  if (!validStatuses.includes(status)) {
  throw new Error(`Invalid status. Must be one of: PENDING, ACTIVE, DEGRADED, SUSPENDED, DEPRECATED, RETIRED`);
}
  }
  /**
   * Status transitions follow lifecycle rules
   * @generated from EnforceModuleLifecycle.table.md
   * @classification validation
   */
  canTransitionStatus(data, existing) {
      // Extract current and new status
  const module = existing ? Object.assign({}, existing, data) : data;
  const currentStatus = existing?.status || data.status || 'PENDING';
  const newStatus = data.status || (typeof data === 'string' ? data : currentStatus);
  
  // If statuses are the same, transition is allowed
  if (currentStatus === newStatus) {
    return true;
  }
  
  // Check if transition is allowed
  const allowedTransitions = {
    'PENDING': ['ACTIVE', 'SUSPENDED'],
    'ACTIVE': ['DEGRADED', 'SUSPENDED', 'DEPRECATED'],
    'DEGRADED': ['ACTIVE', 'SUSPENDED'],
    'SUSPENDED': ['ACTIVE', 'RETIRED'],
    'DEPRECATED': ['RETIRED'],
  };
  
  const allowed = allowedTransitions[currentStatus]?.includes(newStatus);
  return allowed === true;
  }

  /**
   * Module endpoint must be valid URL
   * @generated from DSL function
   * @classification validation
   */
  validateEndpoint(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const module = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = module.status;
    const id = module.id;
    const tenant_id = module.tenant_id;
    const version = module.version;
    const module_id = module.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (!/^https?:\/\/.+/.test(module.base_url)) {
  throw new Error(`Invalid base_url: must be a valid HTTP or HTTPS URL`);
}
  if (!/^https?:\/\/.+/.test(module.health_endpoint)) {
  throw new Error(`Invalid health_endpoint: must be a valid HTTP or HTTPS URL`);
}
  }

  /**
   * Kafka topic must follow naming convention
   * @generated from DSL function
   * @classification validation
   */
  validateTopic(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const module = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = module.status;
    const id = module.id;
    const tenant_id = module.tenant_id;
    const version = module.version;
    const module_id = module.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (module.kafka_topics != null) {
for (const topic of module.kafka_topics) {
          if (!/^[a-z0-9-]+\.[a-z0-9-]+$/.test(topic)) {
      throw new Error(`Invalid Kafka topic name: {topic}. Topic must follow pattern: lowercase letters, numbers, hyphens, with a dot separator (e.g., 'service-name.event-type')`);
    }
  }
}
  }

  /**
   * Resource requirements must be positive
   * @generated from DSL function
   * @classification validation
   */
  validateResources(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const module = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = module.status;
    const id = module.id;
    const tenant_id = module.tenant_id;
    const version = module.version;
    const module_id = module.module_id;
    const context = { user: { tenant_id: tenant_id } };
      let cpu = module.cpu_request || module.cpu_limit || 0;
  let memory = module.memory_request || module.memory_limit || 0;
  let replicas = module.min_replicas || module.max_replicas || 0;
  if (cpu <= 0) {
  throw new Error(`CPU resource requirement must be positive`);
}
  if (memory <= 0) {
  throw new Error(`Memory resource requirement must be positive`);
}
  if (replicas <= 0) {
  throw new Error(`Replica count must be positive`);
}
  }

  // =========== Custom Service Methods ===========
  /**
   * Register new module
   * POST /api/v1/modules/register
   */
  async register(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Module;
      const entityName = 'Module';
      const entityNameCamel = 'module';
      // Registration workflow
      // Validate registration data
      const validatedData = data;
      // Create new entity
      const result = await this.create(validatedData);
      // Additional registration logic can be added here
      return result;
    } catch (error) {
      throw new Error(`Failed to execute register: ${error.message}`);
    }
  }
  /**
   * Get module details
   * GET /api/v1/modules/:moduleId
   */
  async findOne(moduleId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Module;
      const entityName = 'Module';
      const entityNameCamel = 'module';
      // Find entity by first parameter (e.g., moduleId, userId, etc.)
      // Try to find using query method if available (e.g., findByModuleId)
      // Fallback: Find by field using findAll
      const results = await EntityModel.findAll({
        where: {
          moduleId: moduleId
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
   * Update module status
   * PUT /api/v1/modules/:moduleId/status
   */
  async updateStatus(moduleId, data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Module;
      const entityName = 'Module';
      const entityNameCamel = 'module';
      // Status update workflow
      const identifier = moduleId;
      // Find entity by identifier
      // Fallback: Find entity by field using findAll
      const modules = await EntityModel.findAll({
        where: {
          moduleId: identifier
        }
      });
      if (!modules || modules.length === 0) {
        throw new Error(`${entityName} not found`);
      }
      const current = modules[0];
      // Extract new status from second parameter (data)
      const newStatus = data.status || data;
      // Validate status transition using canTransitionStatus
      if (!this.canTransitionStatus({ status: newStatus }, current)) {
        const oldStatus = current.status;
        throw new Error(`Invalid status transition from ${oldStatus} to ${newStatus}`);
      }
      // Update status
      const result = await this.update(current.id, { status: newStatus });
      return result;
    } catch (error) {
      throw new Error(`Failed to execute updateStatus: ${error.message}`);
    }
  }
  /**
   * Get module health
   * GET /api/v1/modules/:moduleId/health
   */
  async getHealth(moduleId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Module;
      const entityName = 'Module';
      const entityNameCamel = 'module';
      // Health check - placeholder implementation
      // TODO: Implement real health check by polling module's health endpoint
      // First parameter is the identifier (e.g., moduleId)
      const identifier = moduleId;
      // For now, return basic health status
      // In production, this should make HTTP request to module's health endpoint
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: entityNameCamel.toLowerCase(),
        moduleId: identifier
      };
    } catch (error) {
      throw new Error(`Failed to execute getHealth: ${error.message}`);
    }
  }

  // =========== Query Methods (findBy*) ===========
  /**
   * Find modules by module_id
   */
  async findByModuleId(module_id) {
    try {
      const results = await Module.findAll({
        where: {
          module_id: module_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by module_id: ${error.message}`);
    }
  }
  /**
   * Find modules by name
   */
  async findByName(name) {
    try {
      const results = await Module.findAll({
        where: {
          name: name
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by name: ${error.message}`);
    }
  }
  /**
   * Find modules by description
   */
  async findByDescription(description) {
    try {
      const results = await Module.findAll({
        where: {
          description: description
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by description: ${error.message}`);
    }
  }
  /**
   * Find modules by version
   */
  async findByVersion(version) {
    try {
      const results = await Module.findAll({
        where: {
          version: version
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by version: ${error.message}`);
    }
  }
  /**
   * Find modules by status
   */
  async findByStatus(status) {
    try {
      const results = await Module.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by status: ${error.message}`);
    }
  }
  /**
   * Find modules by runtime_language
   */
  async findByRuntimeLanguage(runtime_language) {
    try {
      const results = await Module.findAll({
        where: {
          runtime_language: runtime_language
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by runtime_language: ${error.message}`);
    }
  }
  /**
   * Find modules by framework
   */
  async findByFramework(framework) {
    try {
      const results = await Module.findAll({
        where: {
          framework: framework
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by framework: ${error.message}`);
    }
  }
  /**
   * Find modules by base_url
   */
  async findByBaseUrl(base_url) {
    try {
      const results = await Module.findAll({
        where: {
          base_url: base_url
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by base_url: ${error.message}`);
    }
  }
  /**
   * Find modules by health_endpoint
   */
  async findByHealthEndpoint(health_endpoint) {
    try {
      const results = await Module.findAll({
        where: {
          health_endpoint: health_endpoint
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by health_endpoint: ${error.message}`);
    }
  }
  /**
   * Find modules by endpoints
   */
  async findByEndpoints(endpoints) {
    try {
      const results = await Module.findAll({
        where: {
          endpoints: endpoints
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by endpoints: ${error.message}`);
    }
  }
  /**
   * Find modules by kafka_topics
   */
  async findByKafkaTopics(kafka_topics) {
    try {
      const results = await Module.findAll({
        where: {
          kafka_topics: kafka_topics
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by kafka_topics: ${error.message}`);
    }
  }
  /**
   * Find modules by cpu_request
   */
  async findByCpuRequest(cpu_request) {
    try {
      const results = await Module.findAll({
        where: {
          cpu_request: cpu_request
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by cpu_request: ${error.message}`);
    }
  }
  /**
   * Find modules by cpu_limit
   */
  async findByCpuLimit(cpu_limit) {
    try {
      const results = await Module.findAll({
        where: {
          cpu_limit: cpu_limit
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by cpu_limit: ${error.message}`);
    }
  }
  /**
   * Find modules by memory_request
   */
  async findByMemoryRequest(memory_request) {
    try {
      const results = await Module.findAll({
        where: {
          memory_request: memory_request
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by memory_request: ${error.message}`);
    }
  }
  /**
   * Find modules by memory_limit
   */
  async findByMemoryLimit(memory_limit) {
    try {
      const results = await Module.findAll({
        where: {
          memory_limit: memory_limit
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by memory_limit: ${error.message}`);
    }
  }
  /**
   * Find modules by min_replicas
   */
  async findByMinReplicas(min_replicas) {
    try {
      const results = await Module.findAll({
        where: {
          min_replicas: min_replicas
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by min_replicas: ${error.message}`);
    }
  }
  /**
   * Find modules by max_replicas
   */
  async findByMaxReplicas(max_replicas) {
    try {
      const results = await Module.findAll({
        where: {
          max_replicas: max_replicas
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by max_replicas: ${error.message}`);
    }
  }
  /**
   * Find modules by last_health_check
   */
  async findByLastHealthCheck(last_health_check) {
    try {
      const results = await Module.findAll({
        where: {
          last_health_check: last_health_check
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by last_health_check: ${error.message}`);
    }
  }
  /**
   * Find modules by health_status
   */
  async findByHealthStatus(health_status) {
    try {
      const results = await Module.findAll({
        where: {
          health_status: health_status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by health_status: ${error.message}`);
    }
  }
  /**
   * Find modules by consecutive_failures
   */
  async findByConsecutiveFailures(consecutive_failures) {
    try {
      const results = await Module.findAll({
        where: {
          consecutive_failures: consecutive_failures
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by consecutive_failures: ${error.message}`);
    }
  }
  /**
   * Find modules by registered_by
   */
  async findByRegisteredBy(registered_by) {
    try {
      const results = await Module.findAll({
        where: {
          registered_by: registered_by
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by registered_by: ${error.message}`);
    }
  }
  /**
   * Find modules by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Module.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find modules by metadata
   */
  async findByMetadata(metadata) {
    try {
      const results = await Module.findAll({
        where: {
          metadata: metadata
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by metadata: ${error.message}`);
    }
  }
  /**
   * Find modules by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Module.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by created_at: ${error.message}`);
    }
  }
  /**
   * Find modules by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Module.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find modules by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the user for this module
   */
  async getUser(id) {
    try {
      const module = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (module.registered_by) {
        const result = await userService.findById(module.registered_by);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for module: ${error.message}`);
    }
  }
  /**
   * Get the tenant for this module
   */
  async getTenant(id) {
    try {
      const module = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (module.tenant_id) {
        const result = await tenantService.findById(module.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for module: ${error.message}`);
    }
  }
  /**
   * Get all healthchecks for this module
   */
  async getHealthCheck(id) {
    try {
      const module = await this.findById(id);
      // Get related entities (one-to-many)
      const healthcheckService = require('./health_check_service');
      const results = await healthcheckService.findAll({
        where: {
          module_id: module.id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get healthcheck for module: ${error.message}`);
    }
  }
  /**
   * Get all healthhistorys for this module
   */
  async getHealthHistory(id) {
    try {
      const module = await this.findById(id);
      // Get related entities (one-to-many)
      const healthhistoryService = require('./health_history_service');
      const results = await healthhistoryService.findAll({
        where: {
          module_id: module.id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get healthhistory for module: ${error.message}`);
    }
  }

}

module.exports = new ModuleService();

