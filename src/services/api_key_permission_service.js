const Apikeypermission = require('../sequelize-models/api_key_permission');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ApikeypermissionService {
  /**
   * Get all apikeypermissions
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Apikeypermission.findAndCountAll({
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
      throw new Error(`Failed to fetch apikeypermissions: ${error.message}`);
    }
  }

  /**
   * Get apikeypermission by ID
   */
  async findById(id) {
    try {
      const apikeypermission = await Apikeypermission.findByPk(id, {
      });

      if (!apikeypermission) {
        throw new Error('Apikeypermission not found');
      }

      return apikeypermission;
    } catch (error) {
      throw new Error(`Failed to fetch apikeypermission: ${error.message}`);
    }
  }

  /**
   * Create new apikeypermission
   */
  async create(data) {
    try {

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const apikeypermission = await Apikeypermission.create(data);

      return apikeypermission;
    } catch (error) {
      throw new Error(`Failed to create apikeypermission: ${error.message}`);
    }
  }

  /**
   * Update apikeypermission
   */
  async update(id, data) {
    try {
      // Check if exists
      const apikeypermission = await this.findById(id);

      await apikeypermission.update(data);
      await apikeypermission.reload();

      return apikeypermission;
    } catch (error) {
      throw new Error(`Failed to update apikeypermission: ${error.message}`);
    }
  }

  /**
   * Delete apikeypermission
   */
  async delete(id) {
    try {
      // Check if exists
      const apikeypermission = await this.findById(id);

      await apikeypermission.destroy();

      return { message: 'Apikeypermission deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete apikeypermission: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  // =========== Custom Service Methods ===========

  // =========== Query Methods (findBy*) ===========
  /**
   * Find apikeypermissions by api_key_id
   */
  async findByApiKeyId(api_key_id) {
    try {
      const results = await Apikeypermission.findAll({
        where: {
          api_key_id: api_key_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeypermissions by api_key_id: ${error.message}`);
    }
  }
  /**
   * Find apikeypermissions by resource
   */
  async findByResource(resource) {
    try {
      const results = await Apikeypermission.findAll({
        where: {
          resource: resource
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeypermissions by resource: ${error.message}`);
    }
  }
  /**
   * Find apikeypermissions by action
   */
  async findByAction(action) {
    try {
      const results = await Apikeypermission.findAll({
        where: {
          action: action
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeypermissions by action: ${error.message}`);
    }
  }
  /**
   * Find apikeypermissions by scope
   */
  async findByScope(scope) {
    try {
      const results = await Apikeypermission.findAll({
        where: {
          scope: scope
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeypermissions by scope: ${error.message}`);
    }
  }
  /**
   * Find apikeypermissions by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Apikeypermission.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeypermissions by created_at: ${error.message}`);
    }
  }
  /**
   * Find apikeypermissions by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Apikeypermission.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeypermissions by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the apikey for this apikeypermission
   */
  async getApiKey(id) {
    try {
      const apikeypermission = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const apikeyService = require('./api_key_service');
      if (apikeypermission.api_key_id) {
        const result = await apikeyService.findById(apikeypermission.api_key_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get apikey for apikeypermission: ${error.message}`);
    }
  }

}

module.exports = new ApikeypermissionService();

