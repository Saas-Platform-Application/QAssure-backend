const Healthhistory = require('../sequelize-models/health_history');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class HealthhistoryService {
  /**
   * Get all healthhistories
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Healthhistory.findAndCountAll({
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
      throw new Error(`Failed to fetch healthhistories: ${error.message}`);
    }
  }

  /**
   * Get healthhistory by ID
   */
  async findById(id) {
    try {
      const healthhistory = await Healthhistory.findByPk(id, {
      });

      if (!healthhistory) {
        throw new Error('Healthhistory not found');
      }

      return healthhistory;
    } catch (error) {
      throw new Error(`Failed to fetch healthhistory: ${error.message}`);
    }
  }

  /**
   * Create new healthhistory
   */
  async create(data) {
    try {

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const healthhistory = await Healthhistory.create(data);

      return healthhistory;
    } catch (error) {
      throw new Error(`Failed to create healthhistory: ${error.message}`);
    }
  }

  /**
   * Update healthhistory
   */
  async update(id, data) {
    try {
      // Check if exists
      const healthhistory = await this.findById(id);

      await healthhistory.update(data);
      await healthhistory.reload();

      return healthhistory;
    } catch (error) {
      throw new Error(`Failed to update healthhistory: ${error.message}`);
    }
  }

  /**
   * Delete healthhistory
   */
  async delete(id) {
    try {
      // Check if exists
      const healthhistory = await this.findById(id);

      await healthhistory.destroy();

      return { message: 'Healthhistory deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete healthhistory: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Calculate uptime percentage
   * @generated from DSL function
   * @classification calculation
   */
  async calculateUptime() {
    const allChecks = await HealthHistoryService.findOne({ module_id: healthHistory.module_id });
  let totalChecks = allChecks.length;
  let successfulChecks = 0;
for (const check of allChecks) {
      if (check.status === 'healthy' || check.status === 'up') {
    successfulChecks = successfulChecks + 1;
  }
}
  let uptimePercentage = totalChecks > 0 ? (successfulChecks / totalChecks) * 100 : 0;
  module.uptime = uptimePercentage;
  }

  // =========== Custom Service Methods ===========

  // =========== Query Methods (findBy*) ===========
  /**
   * Find healthhistorys by module_id
   */
  async findByModuleId(module_id) {
    try {
      const results = await Healthhistory.findAll({
        where: {
          module_id: module_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthhistorys by module_id: ${error.message}`);
    }
  }
  /**
   * Find healthhistorys by status
   */
  async findByStatus(status) {
    try {
      const results = await Healthhistory.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthhistorys by status: ${error.message}`);
    }
  }
  /**
   * Find healthhistorys by response_time_ms
   */
  async findByResponseTimeMs(response_time_ms) {
    try {
      const results = await Healthhistory.findAll({
        where: {
          response_time_ms: response_time_ms
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthhistorys by response_time_ms: ${error.message}`);
    }
  }
  /**
   * Find healthhistorys by http_status
   */
  async findByHttpStatus(http_status) {
    try {
      const results = await Healthhistory.findAll({
        where: {
          http_status: http_status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthhistorys by http_status: ${error.message}`);
    }
  }
  /**
   * Find healthhistorys by error_message
   */
  async findByErrorMessage(error_message) {
    try {
      const results = await Healthhistory.findAll({
        where: {
          error_message: error_message
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthhistorys by error_message: ${error.message}`);
    }
  }
  /**
   * Find healthhistorys by components
   */
  async findByComponents(components) {
    try {
      const results = await Healthhistory.findAll({
        where: {
          components: components
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthhistorys by components: ${error.message}`);
    }
  }
  /**
   * Find healthhistorys by checked_at
   */
  async findByCheckedAt(checked_at) {
    try {
      const results = await Healthhistory.findAll({
        where: {
          checked_at: checked_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthhistorys by checked_at: ${error.message}`);
    }
  }
  /**
   * Find healthhistorys by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Healthhistory.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find healthhistorys by created_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the module for this healthhistory
   */
  async getModule(id) {
    try {
      const healthhistory = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const moduleService = require('./module_service');
      if (healthhistory.module_id) {
        const result = await moduleService.findById(healthhistory.module_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get module for healthhistory: ${error.message}`);
    }
  }

}

module.exports = new HealthhistoryService();

