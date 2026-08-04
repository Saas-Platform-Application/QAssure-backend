const Permission = require('../sequelize-models/permission');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const { getPermissionService } = require('../infrastructure/auth/permission.service');

class PermissionService {
  /**
   * Get all permissions
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Permission.findAndCountAll({
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
      throw new Error(`Failed to fetch permissions: ${error.message}`);
    }
  }

  /**
   * Get permission by ID
   */
  async findById(id) {
    try {
      const permission = await Permission.findByPk(id, {
      });

      if (!permission) {
        throw new Error('Permission not found');
      }

      return permission;
    } catch (error) {
      throw new Error(`Failed to fetch permission: ${error.message}`);
    }
  }

  /**
   * Create new permission
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      // this.validateScope(data, null);
      // this.hasPermissionScope(data, null);
      // this.validateAction(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const permission = await Permission.create(data);

      // Clear all permission caches
      try {
        const permissionService = getPermissionService();
        await permissionService.clearAllCache();
      } catch (cacheError) {
        console.warn("[PermissionService] Failed to clear permission cache:", cacheError.message);
      }

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('create', 'permission', permission.id, null);
      } catch (e) {
        console.error('Failed to send identity update for permission create', e);
      }

      return permission;
    } catch (error) {
      throw new Error(`Failed to create permission: ${error.message}`);
    }
  }

  /**
   * Update permission
   */
  async update(id, data) {
    try {
      // Check if exists
      const permission = await this.findById(id);

      // Auto-generated validation calls (before_update)
      // this.validateScope(data, permission);
      // this.hasPermissionScope(data, permission);
      // this.validateAction(data, permission);

      await permission.update(data);
      await permission.reload();

      // Clear all permission caches
      try {
        const permissionService = getPermissionService();
        await permissionService.clearAllCache();
      } catch (cacheError) {
        console.warn("[PermissionService] Failed to clear permission cache:", cacheError.message);
      }

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('update', 'permission', id, null);
      } catch (e) {
        console.error('Failed to send identity update for permission update', e);
      }

      return permission;
    } catch (error) {
      throw new Error(`Failed to update permission: ${error.message}`);
    }
  }

  /**
   * Delete permission
   */
  async delete(id) {
    try {
      // Check if exists
      const permission = await this.findById(id);

      await permission.destroy();

      // Clear all permission caches
      try {
        const permissionService = getPermissionService();
        await permissionService.clearAllCache();
      } catch (cacheError) {
        console.warn("[PermissionService] Failed to clear permission cache:", cacheError.message);
      }

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('delete', 'permission', { id }, null);
      } catch (e) {
        console.error('Failed to send identity update for permission delete', e);
      }

      return { message: 'Permission deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete permission: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Scope must be GLOBAL, TENANT, or MODULE
   * @generated from DSL function
   * @classification validation
   */
  validateScope(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const permission = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = permission.status;
    const id = permission.id;
    const tenant_id = permission.tenant_id;
    const version = permission.version;
    const module_id = permission.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (!['GLOBAL', 'TENANT', 'MODULE'].includes(scope)) {
  throw new Error(`Invalid scope value. Scope must be one of: GLOBAL, TENANT, or MODULE`);
}
  }

  /**
   * GLOBAL &gt; TENANT &gt; MODULE scope hierarchy
   * @generated from DSL function
   * @classification validation
   */
  hasPermissionScope(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const permission = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = permission.status;
    const id = permission.id;
    const tenant_id = permission.tenant_id;
    const version = permission.version;
    const module_id = permission.module_id;
    const context = { user: { tenant_id: tenant_id } };
      let hierarchy = ['GLOBAL', 'TENANT', 'MODULE'];
  let userScopeIndex = hierarchy.indexOf(permission.scope);
  if (userScopeIndex === -1) {
  throw new Error(`Invalid scope value. Must be one of: GLOBAL, TENANT, MODULE`);
}
  }

  /**
   * Action must be valid CRUD operation
   * @generated from DSL function
   * @classification validation
   */
  validateAction(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const permission = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = permission.status;
    const id = permission.id;
    const tenant_id = permission.tenant_id;
    const version = permission.version;
    const module_id = permission.module_id;
    const context = { user: { tenant_id: tenant_id } };
      let validActions = ['CREATE','READ','UPDATE','DELETE','EXECUTE'];
  if (!validActions.includes(action)) {
  throw new Error(`Invalid action. Must be one of: CREATE, READ, UPDATE, DELETE, EXECUTE`);
}
  }

  // =========== Custom Service Methods ===========
  /**
   * Get permission details
   * GET /api/v1/permissions/:permissionId
   */
  async findOne(permissionId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Permission;
      const entityName = 'Permission';
      const entityNameCamel = 'permission';
      // Find entity by first parameter (e.g., moduleId, userId, etc.)
      // Try to find using query method if available (e.g., findByModuleId)
      // Fallback: Find by field using findAll
      const results = await EntityModel.findAll({
        where: {
          permissionId: permissionId
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

  // =========== Query Methods (findBy*) ===========
  /**
   * Find permissions by role_id
   */
  async findByRoleId(role_id) {
    try {
      const results = await Permission.findAll({
        where: {
          role_id: role_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find permissions by role_id: ${error.message}`);
    }
  }
  /**
   * Find permissions by resource
   */
  async findByResource(resource) {
    try {
      const results = await Permission.findAll({
        where: {
          resource: resource
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find permissions by resource: ${error.message}`);
    }
  }
  /**
   * Find permissions by action
   */
  async findByAction(action) {
    try {
      const results = await Permission.findAll({
        where: {
          action: action
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find permissions by action: ${error.message}`);
    }
  }
  /**
   * Find permissions by scope
   */
  async findByScope(scope) {
    try {
      const results = await Permission.findAll({
        where: {
          scope: scope
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find permissions by scope: ${error.message}`);
    }
  }
  /**
   * Find permissions by conditions
   */
  async findByConditions(conditions) {
    try {
      const results = await Permission.findAll({
        where: {
          conditions: conditions
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find permissions by conditions: ${error.message}`);
    }
  }
  /**
   * Find permissions by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Permission.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find permissions by created_at: ${error.message}`);
    }
  }
  /**
   * Find permissions by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Permission.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find permissions by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the role for this permission
   */
  async getRole(id) {
    try {
      const permission = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const roleService = require('./role_service');
      if (permission.role_id) {
        const result = await roleService.findById(permission.role_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get role for permission: ${error.message}`);
    }
  }

}

module.exports = new PermissionService();

