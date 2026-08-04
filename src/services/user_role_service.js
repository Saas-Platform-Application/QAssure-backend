const Userrole = require('../sequelize-models/user_role');
const User = require('../sequelize-models/user');
const Role = require('../sequelize-models/role');
const Tenant = require('../sequelize-models/tenant');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class UserroleService {
  /**
   * Get all userroles
   * @param {Object} options - Query options (skip, take, where, orderBy)
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      // Execute database query
      const { count, rows } = await Userrole.findAndCountAll({
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
      throw new Error(`Failed to fetch userroles: ${error.message}`);
    }
  }

  /**
   * Get userrole by ID
   */
  async findById(id) {
    try {
      const userrole = await Userrole.findByPk(id, {
      });

      if (!userrole) {
        throw new Error('Userrole not found');
      }

      return userrole;
    } catch (error) {
      throw new Error(`Failed to fetch userrole: ${error.message}`);
    }
  }

  /**
   * Validate that referenced entities exist
   * @private
   * @param {Object} data - Data to validate
   * @param {Object} options - Options including transaction
   */
  async _validateReferences(data, options = {}) {
    const validations = [];

    if (data.user_id) {
      validations.push(
        User.findByPk(data.user_id, options).then(user => {
          if (!user) throw new Error(`User with id ${data.user_id} does not exist`);
        })
      );
    }

    if (data.role_id) {
      validations.push(
        Role.findByPk(data.role_id, options).then(role => {
          if (!role) throw new Error(`Role with id ${data.role_id} does not exist`);
        })
      );
    }

    if (data.tenant_id) {
      validations.push(
        Tenant.findByPk(data.tenant_id, options).then(tenant => {
          if (!tenant) throw new Error(`Tenant with id ${data.tenant_id} does not exist`);
        })
      );
    }

    await Promise.all(validations);
  }

  /**
   * Normalize and prepare data for creation
   * @private
   */
  _prepareData(data) {
    const prepared = { ...data };

    // Generate UUID if not provided
    if (!prepared.id) {
      prepared.id = uuidv4();
    }

    // Set default assigned_at if not provided
    if (!prepared.assigned_at) {
      prepared.assigned_at = new Date();
    }

    // Dates are already validated and transformed by the validation schema
    // No need to parse them again here

    return prepared;
  }

  /**
   * Handle foreign key constraint errors with specific messages
   * @private
   */
  _handleForeignKeyError(error, data) {
    if (error.name !== 'SequelizeForeignKeyConstraintError') {
      return null;
    }

    const constraint = error.original?.constraint || '';
    
    if (constraint.includes('user_id')) {
      return new Error(`User with id ${data.user_id} does not exist`);
    }
    if (constraint.includes('role_id')) {
      return new Error(`Role with id ${data.role_id} does not exist`);
    }
    if (constraint.includes('tenant_id')) {
      return new Error(`Tenant with id ${data.tenant_id} does not exist`);
    }
    if (constraint.includes('module_id')) {
      return new Error(`Module with id ${data.module_id} does not exist`);
    }

    return new Error(`Foreign key constraint violation: ${constraint}. Please ensure all referenced entities exist.`);
  }

  /**
   * Create new userrole
   * @param {Object} data - User role data
   * @param {Object} options - Options including transaction
   */
  async create(data, options = {}) {
    try {
      // Validate referenced entities exist (parallel validation)
      // Pass options (including transaction) so validation can see uncommitted records
      await this._validateReferences(data, options);

      // Prepare data for creation
      const preparedData = this._prepareData(data);

      // Create userrole
      const userrole = await Userrole.create(preparedData, options);

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('create', 'user_role', userrole.id, options.user_id || null);
      } catch (e) {
        console.error('Failed to send identity update for user_role create', e);
      }

      return userrole;
    } catch (error) {
      // Handle specific error types
      const fkError = this._handleForeignKeyError(error, data);
      if (fkError) {
        throw fkError;
      }

      // Re-throw validation errors as-is
      if (error.message.includes('does not exist')) {
        throw error;
      }

      throw new Error(`Failed to create userrole: ${error.message}`);
    }
  }

  /**
   * Update userrole
   */
  async update(id, data, options = {}) {
    try {
      // Check if exists
      const userrole = await this.findById(id);

      await userrole.update(data);
      await userrole.reload();

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('update', 'user_role', id, options.user_id || null);
      } catch (e) {
        console.error('Failed to send identity update for user_role update', e);
      }

      return userrole;
    } catch (error) {
      throw new Error(`Failed to update userrole: ${error.message}`);
    }
  }

  /**
   * Delete userrole
   */
  async delete(id) {
    try {
      // Check if exists
      const userrole = await this.findById(id);

      await userrole.destroy();

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('delete', 'user_role', { id }, null);
      } catch (e) {
        console.error('Failed to send identity update for user_role delete', e);
      }

      return { message: 'Userrole deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete userrole: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  // =========== Custom Service Methods ===========

  // =========== Query Methods (findBy*) ===========
  /**
   * Find userroles by user_id
   */
  async findByUserId(user_id) {
    try {
      const results = await Userrole.findAll({
        where: {
          user_id: user_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by user_id: ${error.message}`);
    }
  }
  /**
   * Find userroles by role_id
   */
  async findByRoleId(role_id) {
    try {
      const results = await Userrole.findAll({
        where: {
          role_id: role_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by role_id: ${error.message}`);
    }
  }
  /**
   * Find userroles by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Userrole.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find userroles by module_id
   */
  async findByModuleId(module_id) {
    try {
      const results = await Userrole.findAll({
        where: {
          module_id: module_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by module_id: ${error.message}`);
    }
  }
  /**
   * Find userroles by assigned_by
   */
  async findByAssignedBy(assigned_by) {
    try {
      const results = await Userrole.findAll({
        where: {
          assigned_by: assigned_by
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by assigned_by: ${error.message}`);
    }
  }
  /**
   * Find userroles by assigned_at
   */
  async findByAssignedAt(assigned_at) {
    try {
      const results = await Userrole.findAll({
        where: {
          assigned_at: assigned_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by assigned_at: ${error.message}`);
    }
  }
  /**
   * Find userroles by expires_at
   */
  async findByExpiresAt(expires_at) {
    try {
      const results = await Userrole.findAll({
        where: {
          expires_at: expires_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by expires_at: ${error.message}`);
    }
  }
  /**
   * Find userroles by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Userrole.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by created_at: ${error.message}`);
    }
  }
  /**
   * Find userroles by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Userrole.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find userroles by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the user for this userrole
   */
  async getUser(id) {
    try {
      const userrole = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (userrole.user_id) {
        const result = await userService.findById(userrole.user_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for userrole: ${error.message}`);
    }
  }
  /**
   * Get the role for this userrole
   */
  async getRole(id) {
    try {
      const userrole = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const roleService = require('./role_service');
      if (userrole.role_id) {
        const result = await roleService.findById(userrole.role_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get role for userrole: ${error.message}`);
    }
  }
  /**
   * Get the tenant for this userrole
   */
  async getTenant(id) {
    try {
      const userrole = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (userrole.tenant_id) {
        const result = await tenantService.findById(userrole.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for userrole: ${error.message}`);
    }
  }
  /**
   * Get the module for this userrole
   */
  async getModule(id) {
    try {
      const userrole = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const moduleService = require('./module_service');
      if (userrole.module_id) {
        const result = await moduleService.findById(userrole.module_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get module for userrole: ${error.message}`);
    }
  }
  /**
   * Get the user for this userrole
   */
  async getUser(id) {
    try {
      const userrole = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (userrole.assigned_by) {
        const result = await userService.findById(userrole.assigned_by);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for userrole: ${error.message}`);
    }
  }

}

module.exports = new UserroleService();

