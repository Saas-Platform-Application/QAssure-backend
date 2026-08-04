const Healthcheck = require('../sequelize-models/health_check');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class HealthcheckService {
  /**
   * Get all healthchecks
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Healthcheck.findAndCountAll({
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
      throw new Error(`Failed to fetch healthchecks: ${error.message}`);
    }
  }

  /**
   * Get healthcheck by ID
   */
  async findById(id) {
    try {
      const healthcheck = await Healthcheck.findByPk(id, {
      });

      if (!healthcheck) {
        throw new Error('Healthcheck not found');
      }

      return healthcheck;
    } catch (error) {
      throw new Error(`Failed to fetch healthcheck: ${error.message}`);
    }
  }

  /**
   * Create new healthcheck
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      await this.shouldCheckHealth(data, null);
      this.validateStatus(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const healthcheck = await Healthcheck.create(data);

      // Auto-generated event publishing (after_create)
      this.shouldAlert(healthcheck);

      return healthcheck;
    } catch (error) {
      throw new Error(`Failed to create healthcheck: ${error.message}`);
    }
  }

  /**
   * Update healthcheck
   */
  async update(id, data) {
    try {
      // Check if exists
      const healthcheck = await this.findById(id);

      // Auto-generated validation calls (before_update)
      if (data.status) this.validateStatus(data, healthcheck);

      await healthcheck.update(data);
      await healthcheck.reload();

      // Auto-generated event publishing (after_update)
      this.shouldAlert(healthcheck);

      return healthcheck;
    } catch (error) {
      throw new Error(`Failed to update healthcheck: ${error.message}`);
    }
  }

  /**
   * Delete healthcheck
   */
  async delete(id) {
    try {
      // Check if exists
      const healthcheck = await this.findById(id);

      await healthcheck.destroy();

      return { message: 'Healthcheck deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete healthcheck: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Health checks run at configured intervals
   * @generated from DSL function
   * @classification validation
   */
  async shouldCheckHealth(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const healthcheck = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = healthcheck.status;
    const id = healthcheck.id;
    const tenant_id = healthcheck.tenant_id;
    const version = healthcheck.version;
    const module_id = healthcheck.module_id;
    const context = { user: { tenant_id: tenant_id } };
    // Use this.findAll instead of undefined HealthCheckService.findOne
    const lastChecks = await this.findAll({ where: { module_id: healthcheck.module_id }, orderBy: [['checked_at', 'DESC']], take: 1 });
    const lastCheck = lastChecks.data[0];

    // Lazy load ModuleService to avoid circular dependency if possible, or assume it's available
    const ModuleService = require('./module_service');
    const module = await ModuleService.findById(healthcheck.module_id);
    if (lastCheck) {
      let currentTime = Date.now();
      let lastCheckTime = lastCheck.checked_at.getTime();
      let timeDifference = currentTime - lastCheckTime;
      let requiredInterval = module.health_check_interval * 1000;
      if (timeDifference < requiredInterval) {
        throw new Error(`Health check interval not met. Required interval: ${module.health_check_interval} seconds`);
      }
    }
  }

  /**
   * 3 consecutive failures trigger alert
   * @generated from DSL function
   * @classification event
   */
  shouldAlert(healthcheck) {
    // Placeholder for alert logic - intentionally left empty or simple for now to fix syntax error
    // TODO: Implement alert logic
  }

  /**
   * Health status must be HEALTHY, UNHEALTHY, or DEGRADED
   * @generated from DSL function
   * @classification validation
   */
  validateStatus(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const healthcheck = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = healthcheck.status;
    const id = healthcheck.id;
    const tenant_id = healthcheck.tenant_id;
    const version = healthcheck.version;
    const module_id = healthcheck.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (!(['HEALTHY', 'UNHEALTHY', 'DEGRADED'].includes(status))) {
      throw new Error(`Health status must be HEALTHY, UNHEALTHY, or DEGRADED`);
    }
  }

  // =========== Custom Service Methods ===========
  /**
   * Get system health
   * GET /api/v1/health
   */
  async getSystemHealth() {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Healthcheck;
      const entityName = 'Healthcheck';
      const entityNameCamel = 'healthcheck';
      // Custom method implementation
      // TODO: Implement getSystemHealth logic
      throw new Error('Method getSystemHealth not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getSystemHealth: ${error.message}`);
    }
  }
  /**
   * Get all modules health
   * GET /api/v1/health/modules
   */
  async getModulesHealth(status) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Healthcheck;
      const entityName = 'Healthcheck';
      const entityNameCamel = 'healthcheck';
      // Custom method implementation
      // TODO: Implement getModulesHealth logic
      throw new Error('Method getModulesHealth not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getModulesHealth: ${error.message}`);
    }
  }
  /**
   * Get module health
   * GET /api/v1/health/modules/:moduleId
   */
  async getModuleHealth(moduleId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Healthcheck;
      const entityName = 'Healthcheck';
      const entityNameCamel = 'healthcheck';
      // Custom method implementation
      // TODO: Implement getModuleHealth logic
      throw new Error('Method getModuleHealth not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getModuleHealth: ${error.message}`);
    }
  }
  /**
   * Get module health history
   * GET /api/v1/health/modules/:moduleId/history
   */
  async getHealthHistory(moduleId, startDate, endDate, limit) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Healthcheck;
      const entityName = 'Healthcheck';
      const entityNameCamel = 'healthcheck';
      // Custom method implementation
      // TODO: Implement getHealthHistory logic
      throw new Error('Method getHealthHistory not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getHealthHistory: ${error.message}`);
    }
  }
  /**
   * Trigger health check
   * POST /api/v1/health/modules/:moduleId/check
   */
  async triggerHealthCheck(moduleId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Healthcheck;
      const entityName = 'Healthcheck';
      const entityNameCamel = 'healthcheck';
      // Custom method implementation
      // TODO: Implement triggerHealthCheck logic
      throw new Error('Method triggerHealthCheck not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute triggerHealthCheck: ${error.message}`);
    }
  }
  /**
   * Get platform components health
   * GET /api/v1/health/components
   */
  async getComponentsHealth() {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Healthcheck;
      const entityName = 'Healthcheck';
      const entityNameCamel = 'healthcheck';
      // Custom method implementation
      // TODO: Implement getComponentsHealth logic
      throw new Error('Method getComponentsHealth not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getComponentsHealth: ${error.message}`);
    }
  }

  // =========== Query Methods (findBy*) ===========
  /**
   * Find healthchecks by module_id
   */
  async findByModuleId(module_id) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          module_id: module_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by module_id: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by status
   */
  async findByStatus(status) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by status: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by response_time_ms
   */
  async findByResponseTimeMs(response_time_ms) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          response_time_ms: response_time_ms
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by response_time_ms: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by http_status
   */
  async findByHttpStatus(http_status) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          http_status: http_status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by http_status: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by error_message
   */
  async findByErrorMessage(error_message) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          error_message: error_message
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by error_message: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by components
   */
  async findByComponents(components) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          components: components
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by components: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by consecutive_failures
   */
  async findByConsecutiveFailures(consecutive_failures) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          consecutive_failures: consecutive_failures
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by consecutive_failures: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by checked_at
   */
  async findByCheckedAt(checked_at) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          checked_at: checked_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by checked_at: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by created_at: ${error.message}`);
    }
  }
  /**
   * Find healthchecks by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Healthcheck.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthchecks by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the module for this healthcheck
   */
  async getModule(id) {
    try {
      const healthcheck = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const moduleService = require('./module_service');
      if (healthcheck.module_id) {
        const result = await moduleService.findById(healthcheck.module_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get module for healthcheck: ${error.message}`);
    }
  }

}

module.exports = new HealthcheckService();

