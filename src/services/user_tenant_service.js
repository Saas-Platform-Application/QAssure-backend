const Usertenant = require('../sequelize-models/user_tenant');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class UsertenantService {
  /**
   * Get all usertenants
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Usertenant.findAndCountAll({
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
      throw new Error(`Failed to fetch usertenants: ${error.message}`);
    }
  }

  /**
   * Get usertenant by ID
   */
  async findById(id) {
    try {
      const usertenant = await Usertenant.findByPk(id, {
      });

      if (!usertenant) {
        throw new Error('Usertenant not found');
      }

      return usertenant;
    } catch (error) {
      throw new Error(`Failed to fetch usertenant: ${error.message}`);
    }
  }

  /**
   * Create new usertenant
   * @param {Object} data - User tenant data
   * @param {Object} options - Options including transaction
   */
  async create(data, options = {}) {
    try {
      // Auto-generated validation calls (before_create)
      // await this.isEmailUnique(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const usertenant = await Usertenant.create(data, options);

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('create', 'user_tenant', usertenant.id, null);
      } catch (e) {
        console.error('Failed to send identity update for user_tenant create', e);
      }

      return usertenant;
    } catch (error) {
      throw new Error(`Failed to create usertenant: ${error.message}`);
    }
  }

  /**
   * Update usertenant
   */
  async update(id, data) {
    try {
      // Check if exists
      const usertenant = await this.findById(id);

      // Auto-generated validation calls (before_update)
      // await this.isEmailUnique(data, usertenant);

      await usertenant.update(data);
      await usertenant.reload();

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('update', 'user_tenant', id, null);
      } catch (e) {
        console.error('Failed to send identity update for user_tenant update', e);
      }

      return usertenant;
    } catch (error) {
      throw new Error(`Failed to update usertenant: ${error.message}`);
    }
  }

  /**
   * Delete usertenant
   */
  async delete(id) {
    try {
      // Check if exists
      const usertenant = await this.findById(id);

      await usertenant.destroy();

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('delete', 'user_tenant', { id }, null);
      } catch (e) {
        console.error('Failed to send identity update for user_tenant delete', e);
      }

      return { message: 'Usertenant deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete usertenant: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Email must be unique within tenant
   * @generated from DSL function
   * @classification validation
   */
  async isEmailUnique(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const usertenant = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = usertenant.status;
    const id = usertenant.id;
    const tenant_id = usertenant.tenant_id;
    const version = usertenant.version;
    const module_id = usertenant.module_id;
    const context = { user: { tenant_id: tenant_id } };
    const user = await UserService.findOne({ id: userTenant.user_id });
const existingUserTenants = await UserTenantService.findOne({ tenant_id: userTenant.tenant_id });
  let emailExists = false;
for (const existingUserTenant of existingUserTenants) {
  const existingUser = await UserService.findOne({ id: existingUserTenant.user_id });
      if (existingUser.email === user.email && existingUserTenant.id != userTenant.id) {
    emailExists = true;
  }
}
  if (emailExists === true) {
  throw new Error(`Email must be unique within tenant`);
}
  }

  // =========== Custom Service Methods ===========

  // =========== Query Methods (findBy*) ===========
  /**
   * Find usertenants by user_id
   */
  async findByUserId(user_id) {
    try {
      const results = await Usertenant.findAll({
        where: {
          user_id: user_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find usertenants by user_id: ${error.message}`);
    }
  }
  /**
   * Find usertenants by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Usertenant.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find usertenants by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find usertenants by status
   */
  async findByStatus(status) {
    try {
      const results = await Usertenant.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find usertenants by status: ${error.message}`);
    }
  }
  /**
   * Find usertenants by is_primary
   */
  async findByIsPrimary(is_primary) {
    try {
      const results = await Usertenant.findAll({
        where: {
          is_primary: is_primary
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find usertenants by is_primary: ${error.message}`);
    }
  }
  /**
   * Find usertenants by joined_at
   */
  async findByJoinedAt(joined_at) {
    try {
      const results = await Usertenant.findAll({
        where: {
          joined_at: joined_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find usertenants by joined_at: ${error.message}`);
    }
  }
  /**
   * Find usertenants by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Usertenant.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find usertenants by created_at: ${error.message}`);
    }
  }
  /**
   * Find usertenants by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Usertenant.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find usertenants by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the user for this usertenant
   */
  async getUser(id) {
    try {
      const usertenant = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (usertenant.user_id) {
        const result = await userService.findById(usertenant.user_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for usertenant: ${error.message}`);
    }
  }
  /**
   * Get the tenant for this usertenant
   */
  async getTenant(id) {
    try {
      const usertenant = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (usertenant.tenant_id) {
        const result = await tenantService.findById(usertenant.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for usertenant: ${error.message}`);
    }
  }

}

module.exports = new UsertenantService();

