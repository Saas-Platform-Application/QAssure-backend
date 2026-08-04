const Role = require("../sequelize-models/role");
const { sequelize } = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const { getPermissionService } = require("../infrastructure/auth/permission.service");

class RoleService {
  /**
   * Get all roles
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;
      const { Op } = require("sequelize");

      // Handle search filter
      if (where.search) {
        const search = where.search;
        delete where.search;
        where[Op.or] = [
          { name: { [Op.iLike]: `%${search}%` } },
          { code: { [Op.iLike]: `%${search}%` } },
          { description: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order =
        orderBy && Array.isArray(orderBy) && orderBy.length > 0
          ? orderBy
          : [sequelize.literal("created_at DESC")];

      const { count, rows } = await Role.findAndCountAll({
        where,
        limit: take,
        offset: skip,
        order: order,
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(DISTINCT user_id)
                FROM user_roles
                WHERE user_roles.role_id = "Role".id
              )`),
              'user_count'
            ]
          ]
        }
      });

      return {
        data: rows,
        total: count,
        skip,
        take,
        hasMore: skip + take < count,
      };
    } catch (error) {
      throw new Error(`Failed to fetch roles: ${error.message}`);
    }
  }

  /**
   * Get role by ID
   */
  async findById(id) {
    try {
      // Ensure models are loaded
      require("../sequelize-models/loader");
      const Permission = sequelize.models.Permission;
      const Module = sequelize.models.Module;

      const role = await Role.findByPk(id, {
        include: [
          {
            model: Permission,
            as: "permissions",
            attributes: ["resource", "action"],
            required: false,
          },
        ],
      });

      if (!role) {
        throw new Error("Role not found");
      }

      // Format the response to include permissions array with only resource and action
      const roleData = role.toJSON ? role.toJSON() : role;

      // Format permissions to only include resource and action
      if (roleData.permissions && Array.isArray(roleData.permissions)) {
        roleData.permissions = roleData.permissions.map((perm) => ({
          resource: perm.resource,
          action: perm.action,
        }));
      } else {
        roleData.permissions = [];
      }

      return roleData;
    } catch (error) {
      throw new Error(`Failed to fetch role: ${error.message}`);
    }
  }

  /**
   * Create new role
   * @param {Object} data - Role data
   * @param {string} tenantId - Tenant ID from authenticated user (optional, will use data.tenant_id if provided)
   */
  async create(data, tenantId = null) {
    const transaction = await sequelize.transaction();
    try {
      // Auto-generated validation calls (before_create)
      // this.hasHigherRole(data, null);
      // this.validateRole(data, null);

      // Set tenant_id from authenticated user if not provided in data
      // Priority: data.tenant_id > tenantId parameter > null
      if (!data.tenant_id && tenantId) {
        data.tenant_id = tenantId;
      }

      // Extract permissions if provided
      const permissions = data.permissions || [];
      delete data.module_ids; // Remove from data
      delete data.modules; // Remove from data
      delete data.permissions; // Remove from data before creating role

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      // Check for unique constraint violations (name/code within the same tenant)
      const existingName = await Role.findOne({
        where: { name: data.name, tenant_id: data.tenant_id || null },
        transaction,
      });
      if (existingName) {
        throw new Error(
          "Role name already exists. you already have this role with you.",
        );
      }

      const existingCode = await Role.findOne({
        where: { code: data.code, tenant_id: data.tenant_id || null },
        transaction,
      });
      if (existingCode) {
        throw new Error(
          "Role code already exists. you already have this role with you.",
        );
      }

      const role = await Role.create(data, { transaction });

      // Create permissions if provided
      if (permissions && permissions.length > 0) {
        await this.assignPermissions(role.id, permissions, transaction);
      }

      await transaction.commit();

      // Reload role with modules and permissions
      const createdRole = await this.findById(role.id);

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('create', 'role', role.id, tenantId);
      } catch (e) {
        console.error('Failed to send identity update for role create', e);
      }

      return createdRole;
    } catch (error) {
      await transaction.rollback();
      // Handle Sequelize unique constraint errors with user-friendly messages
      if (error.name === "SequelizeUniqueConstraintError") {
        const field = error.errors[0]?.path || "field";

        if (field === "code" || field.includes("code")) {
          throw new Error(
            "Role code already exists. you already have this role with you.",
          );
        } else if (field === "name" || field.includes("name")) {
          throw new Error(
            "Role name already exists. you already have this role with you.",
          );
        } else {
          throw new Error(`Role with this ${field} already exists`);
        }
      }

      // Handle Sequelize validation errors
      if (error.name === "SequelizeValidationError") {
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        throw new Error(
          `Validation error: ${validationErrors.map((e) => `${e.field}: ${e.message}`).join(", ")}`,
        );
      }

      throw new Error(`Failed to create role: ${error.message}`);
    }
  }

  /**
   * Update role
   * @param {string} id - Role ID
   * @param {Object} data - Role data
   * @param {string} userId - User ID (optional, for audit purposes)
   */
  async update(id, data, userId = null) {
    const transaction = await sequelize.transaction();
    try {
      // Get the Sequelize instance directly (not the formatted version)
      // Ensure models are loaded
      require("../sequelize-models/loader");
      const Permission = sequelize.models.Permission;
      const Module = sequelize.models.Module;

      const role = await Role.findByPk(id, {
        include: [
          {
            model: Permission,
            as: "permissions",
            attributes: ["resource", "action"],
            required: false,
          },
          {
            model: Module,
            as: "assignedModules",
            attributes: ["id", "module_id", "name"],
            through: { attributes: [] },
            required: false,
          },
        ],
        transaction,
      });

      if (!role) {
        throw new Error("Role not found");
      }

      // Get current role data for validation
      const currentRoleData = role.toJSON ? role.toJSON() : role;

      // Determine effective tenant_id for uniqueness check and module validation
      // Only update tenant_id if explicitly provided in data
      // If tenant_id is not in data, it will remain unchanged
      const effectiveTenantId =
        data.tenant_id !== undefined
          ? data.tenant_id
          : currentRoleData.tenant_id;
      if (!data.hasOwnProperty("tenant_id")) {
        // Remove tenant_id from data if it wasn't explicitly provided
        delete data.tenant_id;
      }

      if (data.name !== undefined && data.name !== currentRoleData.name) {
        const whereClause = {
          name: data.name,
          tenant_id: effectiveTenantId || null,
        };

        const existingRole = await Role.findOne({
          where: whereClause,
          transaction,
        });
        if (existingRole && existingRole.id !== id) {
          throw new Error(
            "Role name already exists. you already have this role with you.",
          );
        }
      }
      if (!data.hasOwnProperty("tenant_id")) {
        // Remove tenant_id from data if it wasn't explicitly provided
        delete data.tenant_id;
      }

      // Extract permissions if provided
      const permissions = data.permissions;
      delete data.modules;
      delete data.module_ids;

      if (permissions !== undefined) {
        delete data.permissions; // Remove from data before updating role
        await this.assignPermissions(id, permissions, transaction);
      }

      // Auto-generated validation calls (before_update)
      // this.hasHigherRole(data, currentRoleData);
      // this.validateRole(data, currentRoleData);

      await role.update(data, { transaction });

      await transaction.commit();

      // Clear all permission caches as role permissions/modules update affects all users with this role
      try {
        const permissionService = getPermissionService();
        await permissionService.clearAllCache();
      } catch (cacheError) {
        console.warn("[RoleService] Failed to clear permission cache:", cacheError.message);
      }

      // Reload role with modules and permissions
      const updatedRole = await this.findById(id);

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('update', 'role', id, userId);
      } catch (e) {
        console.error('Failed to send identity update for role update', e);
      }

      return updatedRole;
    } catch (error) {
      await transaction.rollback();
      // Handle Sequelize unique constraint errors with user-friendly messages
      if (error.name === "SequelizeUniqueConstraintError") {
        const field = error.errors[0]?.path || "field";

        if (field === "code") {
          throw new Error(
            "Role code already exists. Please choose a different code.",
          );
        } else if (field === "name") {
          throw new Error(
            "Role name already exists. Please choose a different name.",
          );
        } else {
          throw new Error(`Role with this ${field} already exists`);
        }
      }

      // Handle Sequelize validation errors
      if (error.name === "SequelizeValidationError") {
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        }));
        throw new Error(
          `Validation error: ${validationErrors.map((e) => `${e.field}: ${e.message}`).join(", ")}`,
        );
      }

      throw new Error(`Failed to update role: ${error.message}`);
    }
  }

  /**
   * Delete role
   */
  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      // Fetch role as Sequelize instance directly (not using findById which returns plain object)
      const role = await Role.findByPk(id);

      if (!role) {
        await transaction.rollback();
        throw new Error("Role not found");
      }

      await role.destroy({ transaction });
      await transaction.commit();

      // Clear all permission caches
      try {
        const permissionService = getPermissionService();
        await permissionService.clearAllCache();
      } catch (cacheError) {
        console.warn("[RoleService] Failed to clear permission cache:", cacheError.message);
      }

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('delete', 'role', { id }, null);
      } catch (e) {
        console.error('Failed to send identity update for role delete', e);
      }

      return { message: "Role deleted successfully" };
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to delete role: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * platform-admin &gt; tenant-admin &gt; module-admin
   * @generated from DSL function
   * @classification validation
   */
  hasHigherRole(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const role = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = role.status;
    const id = role.id;
    const tenant_id = role.tenant_id;
    const version = role.version;
    const module_id = role.module_id;
    const context = { user: { tenant_id: tenant_id } };
    let hierarchy = [
      "platform-admin",
      "tenant-admin",
      "module-admin",
      "developer",
      "viewer",
    ];
    let userRoleIndex = hierarchy.indexOf(userRole);
    let requiredRoleIndex = hierarchy.indexOf(requiredRole);
    if (userRoleIndex > requiredRoleIndex) {
      throw new Error(
        `Insufficient role permissions. User role does not meet required hierarchy level.`,
      );
    }
  }

  /**
   * Role must be valid system role
   * @generated from DSL function
   * @classification validation
   */
  validateRole(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const role = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = role.status;
    const id = role.id;
    const tenant_id = role.tenant_id;
    const version = role.version;
    const module_id = role.module_id;
    const context = { user: { tenant_id: tenant_id } };
    let validRoles = [
      "platform-admin",
      "tenant-admin",
      "module-admin",
      "developer",
      "viewer",
    ];
    if (!validRoles.includes(role.name)) {
      throw new Error(
        `Invalid role name. Must be one of: platform-admin, tenant-admin, module-admin, developer, viewer`,
      );
    }
  }

  // =========== Custom Service Methods ===========
  /**
   * Get role details
   * GET /api/v1/roles/:roleId
   */
  async findOne(roleId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Role;
      const entityName = "Role";
      const entityNameCamel = "role";
      // Find entity by first parameter (e.g., moduleId, userId, etc.)
      // Try to find using query method if available (e.g., findByModuleId)
      // Fallback: Find by field using findAll
      const results = await EntityModel.findAll({
        where: {
          roleId: roleId,
        },
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
   * Find roles by name
   */
  async findByName(name) {
    try {
      const results = await Role.findAll({
        where: {
          name: name,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find roles by name: ${error.message}`);
    }
  }
  /**
   * Find roles by code
   */
  async findByCode(code) {
    try {
      const results = await Role.findAll({
        where: {
          code: code,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find roles by code: ${error.message}`);
    }
  }
  /**
   * Find roles by description
   */
  async findByDescription(description) {
    try {
      const results = await Role.findAll({
        where: {
          description: description,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find roles by description: ${error.message}`);
    }
  }
  /**
   * Find roles by scope
   */
  async findByScope(scope) {
    try {
      const results = await Role.findAll({
        where: {
          scope: scope,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find roles by scope: ${error.message}`);
    }
  }
  /**
   * Find roles by is_system
   */
  async findByIsSystem(is_system) {
    try {
      const results = await Role.findAll({
        where: {
          is_system: is_system,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find roles by is_system: ${error.message}`);
    }
  }
  /**
   * Find roles by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Role.findAll({
        where: {
          created_at: created_at,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find roles by created_at: ${error.message}`);
    }
  }
  /**
   * Find roles by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Role.findAll({
        where: {
          updated_at: updated_at,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find roles by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get all userroles for this role
   */
  async getUserRole(id) {
    try {
      const role = await this.findById(id);
      // Get related entities (one-to-many)
      const userroleService = require("./user_role_service");
      const results = await userroleService.findAll({
        where: {
          role_id: role.id,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get userrole for role: ${error.message}`);
    }
  }
  /**
   * Get all permissions for this role
   */
  async getPermission(id) {
    try {
      const role = await this.findById(id);
      // Get related entities (one-to-many)
      const permissionService = require("./permission_service");
      const results = await permissionService.findAll({
        where: {
          role_id: role.id,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get permission for role: ${error.message}`);
    }
  }

  /**
   * Assign modules to role
   * @param {string} roleId - Role ID
   * @param {Array<string>} moduleIds - Array of module IDs to assign
   * @param {Object} transaction - Sequelize transaction (optional)
   */
  async assignModules(roleId, moduleIds, transaction = null) {
    try {
      // Ensure models are loaded
      require("../sequelize-models/loader");
      const Module = sequelize.models.Module;
      const RoleModule =
        sequelize.models.RoleModule || sequelize.models.Rolemodule;

      // Validate that all modules exist
      if (moduleIds && moduleIds.length > 0) {
        const modules = await Module.findAll({
          where: { id: moduleIds },
          transaction,
        });

        if (modules.length !== moduleIds.length) {
          const foundIds = modules.map((m) => m.id);
          const missingIds = moduleIds.filter((id) => !foundIds.includes(id));
          throw new Error(`Modules not found: ${missingIds.join(", ")}`);
        }
      }

      // Get current assignments
      const currentAssignments = await sequelize.query(
        `SELECT module_id FROM role_modules WHERE role_id = :roleId`,
        {
          replacements: { roleId },
          type: sequelize.QueryTypes.SELECT,
          transaction,
        },
      );
      const currentModuleIds = currentAssignments.map((a) => a.module_id);

      // Determine modules to add and remove
      const modulesToAdd = moduleIds.filter(
        (id) => !currentModuleIds.includes(id),
      );
      const modulesToRemove = currentModuleIds.filter(
        (id) => !moduleIds.includes(id),
      );

      // Remove modules that are no longer assigned
      if (modulesToRemove.length > 0) {
        await sequelize.query(
          `DELETE FROM role_modules WHERE role_id = :roleId AND module_id IN (:moduleIds)`,
          {
            replacements: { roleId, moduleIds: modulesToRemove },
            type: sequelize.QueryTypes.DELETE,
            transaction,
          },
        );
      }

      // Add new module assignments
      if (modulesToAdd.length > 0) {
        const insertValues = modulesToAdd.map((moduleId) => ({
          id: uuidv4(),
          role_id: roleId,
          module_id: moduleId,
        }));

        // Use bulk insert with ON CONFLICT to handle duplicates
        for (const value of insertValues) {
          await sequelize.query(
            `INSERT INTO role_modules (id, role_id, module_id, created_at, updated_at)
             VALUES (:id, :role_id, :module_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
             ON CONFLICT (role_id, module_id) DO NOTHING`,
            {
              replacements: value,
              type: sequelize.QueryTypes.INSERT,
              transaction,
            },
          );
        }
      }

      if (modulesToAdd.length > 0 || modulesToRemove.length > 0) {
        try {
          const { getModuleService } = require('./module.service');
          
          // Send additions
          if (modulesToAdd.length > 0) {
            // Fetch the IDs of the newly created records
            const addedRecords = await sequelize.query(
              `SELECT id FROM role_modules WHERE role_id = :roleId AND module_id IN (:moduleIds)`,
              {
                replacements: { roleId, moduleIds: modulesToAdd },
                type: sequelize.QueryTypes.SELECT,
                transaction,
              },
            );
            const addedIds = addedRecords.map(r => r.id);
            getModuleService().sendIdentityUpdate('create', 'role_module', addedIds, null);
          }

          // Send removals
          if (modulesToRemove.length > 0) {
            getModuleService().sendIdentityUpdate('delete', 'role_modules', modulesToRemove.map(mId => ({ role_id: roleId, module_id: mId })), null);
          }
        } catch (e) {
          console.error('Failed to send identity update for role_modules', e);
        }
      }
    } catch (error) {
      throw new Error(`Failed to assign modules: ${error.message}`);
    }
  }

  /**
   * Assign permissions to role
   * @param {string} roleId - Role ID
   * @param {Array<Object>} permissions - Array of permission objects with resource and action
   * @param {Object} transaction - Sequelize transaction (optional)
   */
  async assignPermissions(roleId, permissions, transaction = null) {
    try {
      const Permission = require("../sequelize-models/permission");
      const permissionService = require("./permission_service");

      // Get current permissions for this role
      const currentPermissions = await Permission.findAll({
        where: { role_id: roleId },
        attributes: ["id", "resource", "action"],
        transaction,
      });

      // Create a map of current permissions by resource:action
      const currentPermMap = new Map();
      currentPermissions.forEach((perm) => {
        const key = `${perm.resource}:${perm.action}`;
        currentPermMap.set(key, perm.id);
      });

      // Create a set of new permissions by resource:action
      const newPermMap = new Map();
      permissions.forEach((perm) => {
        const key = `${perm.resource}:${perm.action}`;
        newPermMap.set(key, perm);
      });

      // Determine permissions to add and remove
      const permissionsToAdd = [];
      const permissionsToRemove = [];

      // Find permissions to add (in new but not in current)
      newPermMap.forEach((perm, key) => {
        if (!currentPermMap.has(key)) {
          permissionsToAdd.push(perm);
        }
      });

      // Find permissions to remove (in current but not in new)
      currentPermMap.forEach((permId, key) => {
        if (!newPermMap.has(key)) {
          permissionsToRemove.push(permId);
        }
      });

      // Remove permissions that are no longer assigned
      if (permissionsToRemove.length > 0) {
        await Permission.destroy({
          where: { id: permissionsToRemove },
          transaction,
        });
      }

      // Add new permissions
      if (permissionsToAdd.length > 0) {
        const permissionData = permissionsToAdd.map((perm) => ({
          id: uuidv4(),
          role_id: roleId,
          resource: perm.resource,
          action: perm.action,
          scope: "tenant", // Default scope, can be adjusted if needed
        }));

        await Permission.bulkCreate(permissionData, { transaction });
      }
    } catch (error) {
      throw new Error(`Failed to assign permissions: ${error.message}`);
    }
  }
}

module.exports = new RoleService();
