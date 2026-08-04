const User = require("../sequelize-models/user");
const { sequelize } = require("../config/database");
const database = require("../config/database");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcryptjs");
const { getPermissionService } = require("../infrastructure/auth/permission.service");
const { getAuditService } = require("./audit.service");
const { getPasswordPolicyService } = require("./password-policy.service");
const { getEmailService } = require("../infrastructure/email/email.service");

class UserService {
  /**
   * Get all users with tenant and role information
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;
      const { Op } = require("sequelize");

      // Extract isSuperAdmin flag if passed
      let isSuperAdmin = false;
      if (where.isSuperAdmin !== undefined) {
        isSuperAdmin = !!where.isSuperAdmin;
        delete where.isSuperAdmin;
      }

      // Handle search filter
      if (where.search) {
        const search = where.search;
        delete where.search;
        where[Op.or] = [
          { first_name: { [Op.iLike]: `%${search}%` } },
          { last_name: { [Op.iLike]: `%${search}%` } },
          { email: { [Op.iLike]: `%${search}%` } }
        ];
      }

      // Handle filters that require subqueries
      const subqueryConditions = [];

      // If tenant_id filter is present or scope is platform
      let isPlatformScope = false;
      if (where.scope) {
        isPlatformScope = where.scope === "platform";
        delete where.scope;
      }

      if (where.tenant_id || isPlatformScope) {
        const Tenant = require("../sequelize-models/tenant");
        const platformTenant = await Tenant.findOne({ where: { slug: "qassure-demo" } });
        if (!platformTenant) {
          throw new Error("Platform tenant ('qassure-demo') not found in database.");
        }
        const platformTenantId = platformTenant.id;

        const tenantId = where.tenant_id || platformTenantId;
        if (where.tenant_id) delete where.tenant_id;

        if (isPlatformScope || tenantId === platformTenantId) {
          subqueryConditions.push({
            id: {
              [Op.in]: sequelize.literal(
                `(
                  SELECT DISTINCT ut.user_id
                  FROM user_tenants ut
                  INNER JOIN user_roles ur ON ur.user_id = ut.user_id AND (ur.tenant_id = '${tenantId}' OR ur.tenant_id IS NULL)
                  INNER JOIN roles r ON r.id = ur.role_id
                  WHERE ut.tenant_id = '${tenantId}'
                    AND LOWER(ut.status) = 'active'
                    AND LOWER(r.scope) = 'platform'
                    AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
                )`,
              ),
            },
          });
        } else {
          const tenantAdminExcludeClause = isSuperAdmin
            ? ""
            : `AND NOT EXISTS (
                SELECT 1
                FROM user_roles ur
                INNER JOIN roles r ON r.id = ur.role_id
                WHERE ur.user_id = ut.user_id
                  AND ur.tenant_id = '${tenantId}'
                  AND r.code = 'tenant_admin'
                  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
              )`;

          subqueryConditions.push({
            id: {
              [Op.in]: sequelize.literal(
                `(
                  SELECT ut.user_id
                  FROM user_tenants ut
                  WHERE ut.tenant_id = '${tenantId}'
                    AND LOWER(ut.status) = 'active'
                    ${tenantAdminExcludeClause}
                )`,
              ),
            },
          });
        }
      }

      // If role_id filter is present
      if (where.role_id) {
        const roleId = where.role_id;
        delete where.role_id;
        subqueryConditions.push({
          id: {
            [Op.in]: sequelize.literal(
              `(
                SELECT ur.user_id
                FROM user_roles ur
                WHERE ur.role_id = '${roleId}'
                  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
              )`,
            ),
          },
        });
      }

      // If scope filter is present
      if (where.scope) {
        const scope = where.scope;
        delete where.scope;
        subqueryConditions.push({
          id: {
            [Op.in]: sequelize.literal(
              `(
                SELECT DISTINCT ur.user_id
                FROM user_roles ur
                INNER JOIN roles r ON r.id = ur.role_id
                WHERE r.scope = '${scope}'
                  AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
              )`,
            ),
          },
        });
      }

      // Combine subquery conditions with existing where clause
      if (subqueryConditions.length > 0) {
        if (!where[Op.and]) where[Op.and] = [];
        where[Op.and].push(...subqueryConditions);
      }

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order =
        orderBy && Array.isArray(orderBy) && orderBy.length > 0
          ? orderBy
          : [sequelize.literal("created_at DESC")];

      const { count, rows } = await User.findAndCountAll({
        where,
        limit: take,
        offset: skip,
        order: order,
      });

      // Get tenant and role information for all users using raw SQL
      const userIds = rows.map((user) => user.id);
      const tenantRoleData = await this._getTenantAndRoleData(userIds);

      // Format users with tenant and role info (name and id)
      const formattedUsers = rows.map((user) => {
        const userData = user.toJSON ? user.toJSON() : user;
        const tenantRole = tenantRoleData[userData.id] || {
          tenant: null,
          role: null,
          roles: [],
          department: null,
          designation: null,
        };
        return {
          ...userData,
          tenant: tenantRole.tenant,
          // role: tenantRole.role,
          // roles: tenantRole.roles,
          role_module_combinations: tenantRole.role_module_combinations,
          modules: tenantRole.modules,
          department: tenantRole.department,
          designation: tenantRole.designation,
        };
      });

      return {
        data: formattedUsers,
        total: count,
        skip,
        take,
        hasMore: skip + take < count,
      };
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  }

  /**
   * Get users by tenant_id
   * Returns all users registered for a specific tenant
   */
  async findByTenantId(tenantId, options = {}) {
    try {
      const { skip = 0, take = 100, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order =
        orderBy && Array.isArray(orderBy) && orderBy.length > 0
          ? orderBy
          : [sequelize.literal("created_at DESC")];

      // Use a subquery to filter users by tenant_id through user_tenants table
      const { Op } = require("sequelize");
      const where = {
        id: {
          [Op.in]: sequelize.literal(`(
            SELECT user_id FROM user_tenants 
            WHERE tenant_id = '${tenantId}' 
            AND LOWER(status) = 'active'
          )`),
        },
      };

      const { count, rows } = await User.findAndCountAll({
        where,
        limit: take,
        offset: skip,
        order: order,
      });

      // Get tenant and role information for all users using raw SQL
      const userIds = rows.map((user) => user.id);
      const tenantRoleData = await this._getTenantAndRoleData(userIds);

      // Format users with tenant and role info (name and id)
      const formattedUsers = rows.map((user) => {
        const userData = user.toJSON ? user.toJSON() : user;
        const tenantRole = tenantRoleData[userData.id] || {
          tenant: null,
          role: null,
          roles: [],
          department: null,
          designation: null,
        };
        return {
          ...userData,
          tenant: tenantRole.tenant,
          role: tenantRole.role,
          roles: tenantRole.roles,
          role_module_combinations: tenantRole.role_module_combinations,
          modules: tenantRole.modules,
          department: tenantRole.department,
          designation: tenantRole.designation,
        };
      });

      return {
        data: formattedUsers,
        total: count,
        skip,
        take,
        hasMore: skip + take < count,
      };
    } catch (error) {
      throw new Error(`Failed to fetch users by tenant_id: ${error.message}`);
    }
  }

  /**
   * Minimal user rows for tenant-scoped filter dropdowns (name + role).
   * Only returns active users.
   */
  async listUsersDropdownForTenant(tenantId, search = null) {
    if (!tenantId) {
      return [];
    }
    
    let query = `
      SELECT DISTINCT ON (u.id)
        u.id,
        COALESCE(
          NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''),
          u.email
        ) AS display_name,
        u.email,
        r.name AS role_name,
        r.code AS role_code
      FROM users u
      INNER JOIN user_tenants ut
        ON ut.user_id = u.id
        AND ut.tenant_id = $1
        AND LOWER(ut.status) = 'active'
      LEFT JOIN user_roles ur
        ON ur.user_id = u.id
        AND ur.tenant_id = $1
      LEFT JOIN roles r ON r.id = ur.role_id
      WHERE LOWER(u.status) = 'active'
    `;

    const params = [tenantId];
    if (search) {
      query += ` AND (
        TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))) ILIKE $2
        OR u.email ILIKE $2
      )`;
      params.push(`%${search}%`);
    }

    query += ` ORDER BY u.id, ur.assigned_at ASC NULLS LAST, r.name ASC NULLS LAST`;

    const result = await database.query(query, params);
    return result.rows.map((row) => ({
      id: row.id,
      name: row.display_name,
      email: row.email,
      role: row.role_code || null,
      roleName: row.role_name || null
    }));
  }

  /**
   * Get users by supplier_id
   * Returns all users belonging to a specific supplier
   */
  async findBySupplierId(supplierId, options = {}) {
    try {
      const { skip = 0, take = 100, orderBy } = options;

      const order =
        orderBy && Array.isArray(orderBy) && orderBy.length > 0
          ? orderBy
          : [sequelize.literal("created_at DESC")];

      const { count, rows } = await User.findAndCountAll({
        where: { supplier_id: supplierId },
        limit: take,
        offset: skip,
        order: order,
      });

      // Get tenant and role information for all users using raw SQL
      const userIds = rows.map((user) => user.id);
      let formattedUsers = [];
      
      if (userIds.length > 0) {
        const tenantRoleData = await this._getTenantAndRoleData(userIds);

        // Format users with tenant and role info (name and id)
        formattedUsers = rows.map((user) => {
          const userData = user.toJSON ? user.toJSON() : user;
          const tenantRole = tenantRoleData[userData.id] || {
            tenant: null,
            role: null,
            roles: [],
            department: null,
            designation: null,
          };
          return {
            ...userData,
            tenant: tenantRole.tenant,
            role: tenantRole.role,
            roles: tenantRole.roles,
              role_module_combinations: tenantRole.role_module_combinations,
              modules: tenantRole.modules,
              department: tenantRole.department,
              designation: tenantRole.designation,
            };
          });
      }

      return {
        data: formattedUsers,
        total: count,
        skip,
        take,
        hasMore: skip + take < count,
      };
    } catch (error) {
      throw new Error(`Failed to fetch users by supplier_id: ${error.message}`);
    }
  }


  /**
   * Get user by ID with tenant and role information
   */
  async findById(id) {
    try {
      const user = await User.findByPk(id);

      if (!user) {
        throw new Error("User not found");
      }

      // Get tenant and role information using raw SQL
      const tenantRoleData = await this._getTenantAndRoleData([id]);
      const userData = user.toJSON ? user.toJSON() : user;
      const tenantRole = tenantRoleData[id] || {
        tenant: null,
        role: null,
        roles: [],
        department: null,
        designation: null,
      };

      // Format user with tenant and role info (name and id)
      return {
        ...userData,
        tenant: tenantRole.tenant,
        role: tenantRole.role,
        roles: tenantRole.roles,
        role_module_combinations: tenantRole.role_module_combinations,
        modules: tenantRole.modules,
        department: tenantRole.department,
        designation: tenantRole.designation,
      };
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  }

  /**
   * Get supplier details for a given user ID
   */
  async getSupplierDetailsByUserId(userId, tenantId = null) {
    try {
      const params = [userId];
      let tenantFilter = "";

      if (tenantId) {
        params.push(tenantId);
        tenantFilter = " AND s.tenant_id = $2";
      }

      const result = await database.query(
        `SELECT
          s.id,
          s.tenant_id,
          s.supplier_code,
          s.name,
          s.legal_name,
          s.supplier_type,
          s.category,
          s.risk_level,
          s.status,
          s.primary_contact_name,
          s.primary_contact_email,
          s.primary_contact_phone,
          s.website,
          s.address_line1,
          s.address_line2,
          s.city,
          s.state,
          s.country,
          s.postal_code,
          s.tax_id,
          s.duns_number,
          s.quality_agreement_signed,
          s.quality_agreement_date,
          s.last_audit_date,
          s.next_audit_date,
          s.certifications,
          s.current_score,
          s.score_grade,
          s.products_services,
          s.workflow_instance_id,
          s.created_at,
          s.updated_at
        FROM users u
        INNER JOIN suppliers s ON s.id = u.supplier_id
        WHERE u.id = $1${tenantFilter}
        LIMIT 1`,
        params,
      );

      if (result.rows.length === 0) {
        throw new Error("Supplier details not found for this user");
      }

      return result.rows[0];
    } catch (error) {
      throw new Error(`Failed to fetch supplier details by user ID: ${error.message}`);
    }
  }

  /**
   * Create new user with tenant and role assignment
   */
  async create(data, options = {}) {
    // Use provided transaction or create a new one
    const shouldCommit = !options.transaction;
    const transaction = options.transaction || (await sequelize.transaction());

    try {
      // Extract tenant and role assignment data
      const {
        tenant_id,
        role_module_combinations,
        modules,
        is_primary_tenant,
        assigned_by,
        ...userData
      } = data;

      // Normalize email to lowercase (consistent with auth service login)
      if (userData.email) {
        userData.email = userData.email.toLowerCase().trim();
      }

      // Normalize empty strings for UUID fields
      if (userData.department_id === "") userData.department_id = null;
      if (userData.designation_id === "") userData.designation_id = null;
      if (userData.supplier_id === "") userData.supplier_id = null;

      // Auto-generated validation calls (before_create)
      this.isActive(userData, null);

      // Auto-hash password fields using bcrypt
      let generatedPassword = null;
      if (!userData.password_hash && tenant_id) {
        // Generate a compliant password if none provided
        const policyService = getPasswordPolicyService();
        generatedPassword = await policyService.generateCompliantPassword(tenant_id);
        userData.password_hash = generatedPassword;
        userData.force_password_reset = true;
      }

      if (userData.password_hash) {
        const value = String(userData.password_hash);
        // Check if already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
        const isBcryptHash = /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
        if (!isBcryptHash) {
          const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
          userData.password_hash = await bcrypt.hash(value, rounds);
        }
      }

      // Generate UUID for primary key if not provided
      if (!userData.id) {
        userData.id = uuidv4();
      }

      // Create user
      const user = await User.create(userData, { transaction });

      // Assign modules if provided
      if (modules && modules.length > 0 && tenant_id) {
        await this.assignModules(
          user.id,
          modules,
          tenant_id,
          assigned_by,
          transaction,
        );
      }

      // Assign user to tenant using user_tenant_service
      if (tenant_id) {
        const userTenantService = require("./user_tenant_service");
        await userTenantService.create(
          {
            user_id: user.id,
            tenant_id: tenant_id,
            status: "active",
            is_primary: is_primary_tenant !== false, // Default to true
            joined_at: new Date(),
          },
          { transaction },
        );
      }

      // Assign role(s) to user using user_role_service
      if (tenant_id && role_module_combinations && role_module_combinations.length > 0) {
        const userRoleService = require("./user_role_service");
        for (const combo of role_module_combinations) {
          await userRoleService.create(
            {
              user_id: user.id,
              role_id: combo.role_id,
              module_id: combo.module_id || null,
              tenant_id: tenant_id,
              assigned_by: assigned_by || null,
              assigned_at: new Date(),
            },
            { transaction },
          );
        }
      }

      // Clear permission cache for the user after role assignment
      try {
        const permissionService = getPermissionService();
        await permissionService.clearCache(user.id, tenant_id);
      } catch (cacheError) {
        console.warn("[UserService] Failed to clear permission cache:", cacheError.message);
      }

      // Only commit if we created the transaction
      if (shouldCommit) {
        await transaction.commit();
      }

      // Send generated password email if applicable
      if (generatedPassword) {
        try {
          const emailService = getEmailService();
          
          // Determine which SMTP config to use
          let emailTenantId = tenant_id;
          
          if (options.requester?.isSuperAdmin) {
            // If created by Super Admin, use Global (null) SMTP config
            emailTenantId = null;
          }

          await emailService.sendGeneratedPasswordEmail(
            userData.email,
            userData.first_name || 'User',
            generatedPassword,
            emailTenantId
          );
        } catch (emailError) {
          console.error("[UserService] Failed to send generated password email:", emailError.message);
        }
      }

      // Get tenant and role information for the created user
      const tenantRoleData = await this._getTenantAndRoleData([user.id]);
      const createdUserData = user.toJSON ? user.toJSON() : user;
      const tenantRole = tenantRoleData[user.id] || {
        tenant: null,
        role: null,
        roles: [],
        department: null,
        designation: null,
      };

      try {
        await getAuditService().log({
          action: 'CREATE',
          user_id: assigned_by || null,
          tenant_id: tenant_id || null,
          resource_type: 'user',
          resource_id: user.id,
          response_status: 201,
          metadata: {
            created_user_id: user.id,
            created_user_email: userData.email,
            performed_by: assigned_by || 'system'
          }
        });
      } catch (auditErr) {
        console.warn('[UserService] Audit log failed:', auditErr.message);
      }

      // Return formatted user with tenant and role info (name and id)
      const createdUserObj = {
        ...createdUserData,
        tenant: tenantRole.tenant,
        role: tenantRole.role,
        roles: tenantRole.roles,
        role_module_combinations: tenantRole.role_module_combinations,
        modules: tenantRole.modules,
        department: tenantRole.department,
        designation: tenantRole.designation,
      };

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('create', 'user', user.id, assigned_by);
      } catch (e) {
        console.error('Failed to send identity update for user create', e);
      }

      return createdUserObj;
    } catch (error) {
      // Only rollback if we created the transaction
      if (shouldCommit) {
        await transaction.rollback();
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

      // Handle Sequelize unique constraint errors
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new Error(
          `User with this ${error.errors[0]?.path || "field"} already exists`,
        );
      }

      // Handle foreign key constraint errors
      if (error.name === "SequelizeForeignKeyConstraintError") {
        const constraint = error.original?.constraint || "";
        if (constraint.includes("tenant_id")) {
          throw new Error(`Tenant with id ${tenant_id} does not exist`);
        }
        if (constraint.includes("role_id")) {
          throw new Error(
            `Role with id ${role_id || role_ids?.[0]} does not exist`,
          );
        }
        throw new Error(`Foreign key constraint violation: ${constraint}`);
      }

      throw new Error(`Failed to create user: ${error.message}`);
    }
  }

  /**
   * Update user
   */
  async update(id, data, options = {}) {
    // Use provided transaction or create a new one
    const shouldCommit = !options.transaction;
    const transaction = options.transaction || (await sequelize.transaction());
    try {
      // Fetch Sequelize model instance directly (not using findById which returns plain object)
      const user = await User.findByPk(id, { transaction });

      if (!user) {
        if (shouldCommit) {
          await transaction.rollback();
        }
        throw new Error("User not found");
      }

      // Extract tenant and role assignment data
      const {
        tenant_id,
        role_module_combinations,
        modules,
        is_primary_tenant,
        assigned_by,
        ...userData
      } = data;

      // Normalize email to lowercase (consistent with auth service login)
      if (userData.email) {
        userData.email = userData.email.toLowerCase().trim();
      }

      // Normalize empty strings for UUID fields
      if (userData.department_id === "") userData.department_id = null;
      if (userData.designation_id === "") userData.designation_id = null;
      if (userData.supplier_id === "") userData.supplier_id = null;

      // Get existing user data for validation
      const existingUser = user.toJSON ? user.toJSON() : user;

      // Auto-generated validation calls (before_update)
      this.isActive(userData, existingUser);

      // Auto-hash password fields using bcrypt
      if (userData.password_hash) {
        const value = String(userData.password_hash);
        // Check if already a bcrypt hash (starts with $2a$, $2b$, or $2y$)
        const isBcryptHash = /^\$2[aby]\$\d{2}\$.{53}$/.test(value);
        if (!isBcryptHash) {
          const rounds = parseInt(process.env.BCRYPT_ROUNDS || "12", 10);
          userData.password_hash = await bcrypt.hash(value, rounds);
        }
      }

      // Clear security suspension metadata if reactivated
      if (userData.status === 'active') {
        const currentPrefs = { ...(user.preferences || {}) };
        if (currentPrefs.security) {
          delete currentPrefs.security;
          userData.preferences = currentPrefs;
        }
      }

      // Update the Sequelize model instance (only user table fields)
      await user.update(userData, { transaction });
      await user.reload({ transaction });

      // Update module assignments if provided
      if (modules !== undefined) {
        const modulesArray = Array.isArray(modules)
          ? modules
          : modules
            ? [modules]
            : [];

        // Get effective tenant ID to validate modules against
        let effectiveTenantId = tenant_id;
        if (!effectiveTenantId) {
          const Usertenant = require("../sequelize-models/user_tenant");
          const existingTenant = await Usertenant.findOne({
            where: { user_id: id, status: "active" },
            transaction,
          });
          effectiveTenantId = existingTenant?.tenant_id;
        }

        if (effectiveTenantId) {
          await this.assignModules(
            id,
            modulesArray,
            effectiveTenantId,
            assigned_by,
            transaction,
          );
        }
      }

      // Update tenant assignment if provided using user_tenant_service
      if (tenant_id !== undefined) {
        const userTenantService = require("./user_tenant_service");
        const Usertenant = require("../sequelize-models/user_tenant");

        // Get existing tenant assignment
        const existingTenant = await Usertenant.findOne({
          where: { user_id: id, status: "active" },
          transaction,
        });

        if (tenant_id === null) {
          // Remove tenant assignment
          if (existingTenant) {
            await existingTenant.update(
              { status: "inactive" },
              { transaction },
            );
          }
        } else {
          // Update or create tenant assignment
          if (existingTenant) {
            await existingTenant.update(
              {
                tenant_id: tenant_id,
                is_primary: is_primary_tenant !== false,
                status: "active",
              },
              { transaction },
            );
          } else {
            await userTenantService.create(
              {
                user_id: id,
                tenant_id: tenant_id,
                status: "active",
                is_primary: is_primary_tenant !== false,
                joined_at: new Date(),
              },
              { transaction },
            );
          }
        }
      }

      // Update role assignment if provided using user_role_service
      if (role_module_combinations !== undefined) {
        const userRoleService = require("./user_role_service");
        const Usertenant = require("../sequelize-models/user_tenant");
        const Userrole = require("../sequelize-models/user_role");

        // Get the tenant_id to use for role assignment
        let targetTenantId = tenant_id;
        if (targetTenantId === undefined) {
          // Get existing tenant if not provided
          const existingTenant = await Usertenant.findOne({
            where: { user_id: id, status: "active" },
            transaction,
          });
          targetTenantId = existingTenant?.tenant_id;
        }

        if (targetTenantId) {
          // Remove existing role assignments for this tenant
          await Userrole.destroy({
            where: { user_id: id, tenant_id: targetTenantId },
            transaction,
          });

          if (role_module_combinations.length > 0) {
            for (const combo of role_module_combinations) {
              await userRoleService.create(
                {
                  user_id: id,
                  role_id: combo.role_id,
                  module_id: combo.module_id || null,
                  tenant_id: targetTenantId,
                  assigned_by: assigned_by || null,
                  assigned_at: new Date(),
                },
                { transaction },
              );
            }
          }
        }
      }

      // Clear permission cache for the user after role update
      try {
        const permissionService = getPermissionService();
        // Use targetTenantId which was either provided or fetched from existing
        const Usertenant = require("../sequelize-models/user_tenant");
        let effectiveTenantId = tenant_id;
        if (effectiveTenantId === undefined) {
          const existingTenant = await Usertenant.findOne({
            where: { user_id: id, status: "active" },
            transaction,
          });
          effectiveTenantId = existingTenant?.tenant_id;
        }
        await permissionService.clearCache(id, effectiveTenantId);
      } catch (cacheError) {
        console.warn("[UserService] Failed to clear permission cache:", cacheError.message);
      }

      // Only commit if we created the transaction
      if (shouldCommit) {
        await transaction.commit();
      }

      // Get tenant and role information for the updated user
      const tenantRoleData = await this._getTenantAndRoleData([id]);
      const updatedUserData = user.toJSON ? user.toJSON() : user;
      const tenantRole = tenantRoleData[id] || {
        tenant: null,
        role: null,
        roles: [],
        department: null,
        designation: null,
      };


      try {
        await getAuditService().log({
          action: 'UPDATE',
          user_id: assigned_by || null,
          tenant_id: tenant_id || null,
          resource_type: 'user',
          resource_id: id,
          response_status: 200,
          changes: { updated_fields: Object.keys(userData) },
          metadata: { performed_by: assigned_by || 'system' }
        });
      } catch (auditErr) {
        console.warn('[UserService] Audit log failed:', auditErr.message);
      }

      // Return formatted user with tenant and role info (name and id)
      const updatedUserObj = {
        ...updatedUserData,
        tenant: tenantRole.tenant,
        role: tenantRole.role,
        roles: tenantRole.roles,
        role_module_combinations: tenantRole.role_module_combinations,
        modules: tenantRole.modules,
        department: tenantRole.department,
        designation: tenantRole.designation,
      };

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('update', 'user', id, assigned_by);
      } catch (e) {
        console.error('Failed to send identity update for user update', e);
      }

      return updatedUserObj;
    } catch (error) {
      // Only rollback if we created the transaction
      if (shouldCommit) {
        await transaction.rollback();
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

      // Handle Sequelize unique constraint errors
      if (error.name === "SequelizeUniqueConstraintError") {
        throw new Error(
          `User with this ${error.errors[0]?.path || "field"} already exists`,
        );
      }

      // Handle foreign key constraint errors
      if (error.name === "SequelizeForeignKeyConstraintError") {
        const constraint = error.original?.constraint || "";
        if (constraint.includes("tenant_id")) {
          throw new Error(`Tenant with id ${data.tenant_id} does not exist`);
        }
        if (constraint.includes("role_id")) {
          throw new Error(
            `Role with id ${data.role_id || data.role_ids?.[0]} does not exist`,
          );
        }
        throw new Error(`Foreign key constraint violation: ${constraint}`);
      }

      throw new Error(`Failed to update user: ${error.message}`);
    }
  }

  /**
   * Delete user
   */
  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      // Fetch Sequelize model instance directly (not using findById which returns plain object)
      const user = await User.findByPk(id);

      if (!user) {
        await transaction.rollback();
        throw new Error("User not found");
      }

      // Delete related records first (cascade delete)
      const Usertenant = require("../sequelize-models/user_tenant");
      const Userrole = require("../sequelize-models/user_role");
      await Usertenant.destroy({ where: { user_id: id }, transaction });
      await Userrole.destroy({ where: { user_id: id }, transaction });

      // Delete the user
      await user.destroy({ transaction });

      // Clear permission cache for the user
      try {
        const permissionService = getPermissionService();
        await permissionService.clearCache(id);
      } catch (cacheError) {
        console.warn("[UserService] Failed to clear permission cache:", cacheError.message);
      }

      await transaction.commit();

      try {
        await getAuditService().log({
          action: 'DELETE',
          user_id: null,
          tenant_id: null,
          resource_type: 'user',
          resource_id: id,
          response_status: 200,
          metadata: { deleted_user_id: id }
        });
      } catch (auditErr) {
        console.warn('[UserService] Audit log failed:', auditErr.message);
      }

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('delete', 'user', { id }, null);
      } catch (e) {
        console.error('Failed to send identity update for user delete', e);
      }

      return { message: "User deleted successfully" };
    } catch (error) {
      await transaction.rollback();
      throw new Error(`Failed to delete user: ${error.message}`);
    }
  }

  /**
   * Get all modules that are enabled for a tenant
   */
  async getTenantAccessibleModules(tenantId) {
    try {
      if (!tenantId) {
        return [];
      }
      const { getTenantModuleService } = require("./tenant_module.service");
      const tenantModuleService = getTenantModuleService();
      return await tenantModuleService.getEnabledModuleIdsForTenant(tenantId);
    } catch (error) {
      throw new Error(
        `Failed to get tenant accessible modules: ${error.message}`,
      );
    }
  }

  /**
   * Validate that modules assigned to a user are only those the tenant has access to
   */
  async validateModulesForTenant(moduleIds, tenantId) {
    if (!moduleIds || moduleIds.length === 0) {
      return;
    }
    if (!tenantId) {
      throw new Error("Tenant ID is required to validate modules");
    }
    const accessibleModules = await this.getTenantAccessibleModules(tenantId);
    const invalidModules = moduleIds.filter(
      (id) => !accessibleModules.includes(id),
    );
    if (invalidModules.length > 0) {
      throw new Error(
        `Cannot assign modules that are not enabled for the tenant. Invalid module IDs: ${invalidModules.join(", ")}`,
      );
    }
  }

  /**
   * Assign modules to a user
   */
  async assignModules(
    userId,
    moduleIds,
    tenantId,
    assignedBy,
    transaction = null,
  ) {
    try {
      // Validate modules first
      await this.validateModulesForTenant(moduleIds, tenantId);

      // Load Userrole model
      const Userrole = require("../sequelize-models/user_role");
      const Role = require("../sequelize-models/role");
      const { Op } = require("sequelize");

      // Get current assignments (only those linked to a module)
      const currentAssignments = await Userrole.findAll({
        where: { 
          user_id: userId, 
          tenant_id: tenantId,
          module_id: { [Op.ne]: null }
        },
        transaction,
      });
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
        await Userrole.destroy({
          where: {
            user_id: userId,
            tenant_id: tenantId,
            module_id: modulesToRemove,
          },
          transaction,
        });
      }

      // Add new module assignments
      if (modulesToAdd.length > 0) {
        // Find default role for module access
        let defaultRole = await Role.findOne({
          where: { code: "viewer" },
          transaction,
        });

        // Fallback: search for module_user or any role if viewer not found
        if (!defaultRole) {
          defaultRole = await Role.findOne({
            where: { code: { [Op.like]: "%user%" } },
            transaction,
          });
        }
        
        if (!defaultRole) {
          defaultRole = await Role.findOne({ transaction });
        }

        if (!defaultRole) {
          throw new Error("Cannot assign modules: No roles found in the system to use as default.");
        }

        const insertData = modulesToAdd.map((moduleId) => ({
          id: uuidv4(),
          user_id: userId,
          role_id: defaultRole.id,
          module_id: moduleId,
          tenant_id: tenantId,
          assigned_by: assignedBy || null,
          assigned_at: new Date(),
          created_at: new Date(),
          updated_at: new Date()
        }));

        await Userrole.bulkCreate(insertData, { transaction });
      }

      // Sync notification preferences with new module assignments
      try {
        const { getNotificationService } = require('./notification.service');
        const notificationService = getNotificationService();
        await notificationService.syncUserPreferencesWithModules(userId, tenantId);
      } catch (syncErr) {
        console.warn('[UserService] Preference sync failed:', syncErr.message);
      }
    } catch (error) {
      throw new Error(`Failed to assign modules to user: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * User must be active
   * @generated from DSL function
   * @classification validation
   */
  isActive(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const user = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = user.status;
    const id = user.id;
    const tenant_id = user.tenant_id;
    const version = user.version;
    const module_id = user.module_id;
    const context = { user: { tenant_id: tenant_id } };

    // Validation removed - status can be 'active', 'suspended', or 'deleted'
    // The Zod schema validation already handles valid enum values
    // This method is kept for compatibility but no longer enforces status === 'active'
  }

  // =========== Custom Service Methods ===========
  /**
   * Handle SAML assertion
   * POST /api/v1/auth/saml/callback
   */
  async samlCallback(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = User;
      const entityName = "User";
      const entityNameCamel = "user";
      // Custom method implementation
      // TODO: Implement samlCallback logic
      throw new Error("Method samlCallback not yet implemented");
    } catch (error) {
      throw new Error(`Failed to execute samlCallback: ${error.message}`);
    }
  }
  /**
   * OAuth2 token endpoint
   * POST /api/v1/auth/token
   */
  async token(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = User;
      const entityName = "User";
      const entityNameCamel = "user";
      // Custom method implementation
      // TODO: Implement token logic
      throw new Error("Method token not yet implemented");
    } catch (error) {
      throw new Error(`Failed to execute token: ${error.message}`);
    }
  }
  /**
   * Refresh access token
   * POST /api/v1/auth/refresh
   */
  async refresh(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = User;
      const entityName = "User";
      const entityNameCamel = "user";
      // Custom method implementation
      // TODO: Implement refresh logic
      throw new Error("Method refresh not yet implemented");
    } catch (error) {
      throw new Error(`Failed to execute refresh: ${error.message}`);
    }
  }
  /**
   * Logout user
   * POST /api/v1/auth/logout
   */
  async logout() {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = User;
      const entityName = "User";
      const entityNameCamel = "user";
      // Custom method implementation
      // TODO: Implement logout logic
      throw new Error("Method logout not yet implemented");
    } catch (error) {
      throw new Error(`Failed to execute logout: ${error.message}`);
    }
  }
  /**
   * Get current user profile
   * GET /api/v1/auth/me
   */
  async me() {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = User;
      const entityName = "User";
      const entityNameCamel = "user";
      // Custom method implementation
      // TODO: Implement me logic
      throw new Error("Method me not yet implemented");
    } catch (error) {
      throw new Error(`Failed to execute me: ${error.message}`);
    }
  }
  /**
   * Create API key
   * POST /api/v1/auth/api-keys
   */
  async createApiKey(data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = User;
      const entityName = "User";
      const entityNameCamel = "user";
      // Custom method implementation
      // TODO: Implement createApiKey logic
      throw new Error("Method createApiKey not yet implemented");
    } catch (error) {
      throw new Error(`Failed to execute createApiKey: ${error.message}`);
    }
  }
  /**
   * List API keys
   * GET /api/v1/auth/api-keys
   */
  async listApiKeys(page, limit) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = User;
      const entityName = "User";
      const entityNameCamel = "user";
      // Custom method implementation
      // TODO: Implement listApiKeys logic
      throw new Error("Method listApiKeys not yet implemented");
    } catch (error) {
      throw new Error(`Failed to execute listApiKeys: ${error.message}`);
    }
  }
  /**
   * Revoke API key
   * DELETE /api/v1/auth/api-keys/:keyId
   */
  async revokeApiKey(keyId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = User;
      const entityName = "User";
      const entityNameCamel = "user";
      // Custom method implementation
      // TODO: Implement revokeApiKey logic
      throw new Error("Method revokeApiKey not yet implemented");
    } catch (error) {
      throw new Error(`Failed to execute revokeApiKey: ${error.message}`);
    }
  }

  // =========== Query Methods (findBy*) ===========
  /**
   * Find users by email
   */
  async findByEmail(email) {
    try {
      const results = await User.findAll({
        where: {
          email: email.toLowerCase(),
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by email: ${error.message}`);
    }
  }
  /**
   * Find users by password_hash
   */
  async findByPasswordHash(password_hash) {
    try {
      const results = await User.findAll({
        where: {
          password_hash: password_hash,
        },
      });
      return results;
    } catch (error) {
      throw new Error(
        `Failed to find users by password_hash: ${error.message}`,
      );
    }
  }
  /**
   * Find users by first_name
   */
  async findByFirstName(first_name) {
    try {
      const results = await User.findAll({
        where: {
          first_name: first_name,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by first_name: ${error.message}`);
    }
  }
  /**
   * Find users by last_name
   */
  async findByLastName(last_name) {
    try {
      const results = await User.findAll({
        where: {
          last_name: last_name,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by last_name: ${error.message}`);
    }
  }
  /**
   * Find users by status
   */
  async findByStatus(status) {
    try {
      const results = await User.findAll({
        where: {
          status: status,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by status: ${error.message}`);
    }
  }
  /**
   * Find users by auth_provider
   */
  async findByAuthProvider(auth_provider) {
    try {
      const results = await User.findAll({
        where: {
          auth_provider: auth_provider,
        },
      });
      return results;
    } catch (error) {
      throw new Error(
        `Failed to find users by auth_provider: ${error.message}`,
      );
    }
  }
  /**
   * Find users by saml_subject
   */
  async findBySamlSubject(saml_subject) {
    try {
      const results = await User.findAll({
        where: {
          saml_subject: saml_subject,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by saml_subject: ${error.message}`);
    }
  }
  /**
   * Find users by oauth_provider
   */
  async findByOauthProvider(oauth_provider) {
    try {
      const results = await User.findAll({
        where: {
          oauth_provider: oauth_provider,
        },
      });
      return results;
    } catch (error) {
      throw new Error(
        `Failed to find users by oauth_provider: ${error.message}`,
      );
    }
  }
  /**
   * Find users by oauth_subject
   */
  async findByOauthSubject(oauth_subject) {
    try {
      const results = await User.findAll({
        where: {
          oauth_subject: oauth_subject,
        },
      });
      return results;
    } catch (error) {
      throw new Error(
        `Failed to find users by oauth_subject: ${error.message}`,
      );
    }
  }
  /**
   * Find users by last_login_at
   */
  async findByLastLoginAt(last_login_at) {
    try {
      const results = await User.findAll({
        where: {
          last_login_at: last_login_at,
        },
      });
      return results;
    } catch (error) {
      throw new Error(
        `Failed to find users by last_login_at: ${error.message}`,
      );
    }
  }
  /**
   * Find users by login_count
   */
  async findByLoginCount(login_count) {
    try {
      const results = await User.findAll({
        where: {
          login_count: login_count,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by login_count: ${error.message}`);
    }
  }
  /**
   * Find users by last_login_ip
   */
  async findByLastLoginIp(last_login_ip) {
    try {
      const results = await User.findAll({
        where: {
          last_login_ip: last_login_ip,
        },
      });
      return results;
    } catch (error) {
      throw new Error(
        `Failed to find users by last_login_ip: ${error.message}`,
      );
    }
  }
  /**
   * Find users by preferences
   */
  async findByPreferences(preferences) {
    try {
      const results = await User.findAll({
        where: {
          preferences: preferences,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by preferences: ${error.message}`);
    }
  }
  /**
   * Find users by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await User.findAll({
        where: {
          created_at: created_at,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by created_at: ${error.message}`);
    }
  }
  /**
   * Find users by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await User.findAll({
        where: {
          updated_at: updated_at,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find users by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get all usertenants for this user
   */
  async getUserTenant(id) {
    try {
      const user = await this.findById(id);
      // Get related entities (one-to-many)
      const usertenantService = require("./user_tenant_service");
      const results = await usertenantService.findAll({
        where: {
          user_id: user.id,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get usertenant for user: ${error.message}`);
    }
  }
  /**
   * Get all userroles for this user
   */
  async getUserRole(id) {
    try {
      const user = await this.findById(id);
      // Get related entities (one-to-many)
      const userroleService = require("./user_role_service");
      const results = await userroleService.findAll({
        where: {
          user_id: user.id,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get userrole for user: ${error.message}`);
    }
  }
  /**
   * Get all sessions for this user
   */
  async getSession(id) {
    try {
      const user = await this.findById(id);
      // Get related entities (one-to-many)
      const sessionService = require("./session_service");
      const results = await sessionService.findAll({
        where: {
          user_id: user.id,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get session for user: ${error.message}`);
    }
  }
  /**
   * Get all apikeys for this user
   */
  async getApiKey(id) {
    try {
      const user = await this.findById(id);
      // Get related entities (one-to-many)
      const apikeyService = require("./api_key_service");
      const results = await apikeyService.findAll({
        where: {
          created_by: user.id,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get apikey for user: ${error.message}`);
    }
  }
  /**
   * Get all auditlogs for this user
   */
  async getAuditLog(id) {
    try {
      const user = await this.findById(id);
      // Get related entities (one-to-many)
      const auditlogService = require("./audit_log_service");
      const results = await auditlogService.findAll({
        where: {
          user_id: user.id,
        },
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get auditlog for user: ${error.message}`);
    }
  }

  /**
   * Get tenant and role data for users using raw SQL
   * @private
   */
  async _getTenantAndRoleData(userIds) {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    try {
      // Get tenant information with name and assignedModules (one tenant per user)
      const tenantQuery = `
        SELECT DISTINCT ON (ut.user_id)
          ut.user_id,
          ut.tenant_id,
          t.name as tenant_name,
          ut.is_primary,
          ut.status
        FROM user_tenants ut
        LEFT JOIN tenants t ON ut.tenant_id = t.id
        WHERE ut.user_id = ANY($1)
          AND LOWER(ut.status) = 'active'
        ORDER BY ut.user_id, ut.is_primary DESC NULLS LAST, ut.joined_at ASC
      `;

      // Get role information with name (multiple roles per user)
      const roleQuery = `
        SELECT 
          ur.user_id,
          ur.role_id,
          r.name as role_name,
          r.code as role_code,
          ur.module_id,
          m.name as module_name,
          ur.tenant_id,
          ur.assigned_at
        FROM user_roles ur
        LEFT JOIN roles r ON ur.role_id = r.id
        LEFT JOIN modules m ON m.id = ur.module_id
        WHERE ur.user_id = ANY($1)
        ORDER BY ur.user_id, ur.assigned_at ASC
      `;

      // Get assigned modules for each tenant
      const modulesQuery = `
        SELECT 
          tm.tenant_id,
          m.id as module_id,
          m.name as module_name
        FROM tenant_modules tm
        INNER JOIN modules m ON tm.module_id = m.id
        WHERE tm.tenant_id = ANY($1)
          AND LOWER(tm.status) = 'active'
        ORDER BY tm.tenant_id, m.name
      `;

      const [tenantResult, roleResult] = await Promise.all([
        database.query(tenantQuery, [userIds]),
        database.query(roleQuery, [userIds]),
      ]);

      // Get unique tenant IDs from tenant results
      const tenantIds = [
        ...new Set(
          tenantResult.rows.map((row) => row.tenant_id).filter(Boolean),
        ),
      ];

      // Fetch modules for all tenants
      let modulesResult = { rows: [] };
      if (tenantIds.length > 0) {
        modulesResult = await database.query(modulesQuery, [tenantIds]);
      }

      // Group modules by tenant_id
      // const modulesByTenant = {};
      // modulesResult.rows.forEach((row) => {
      //   if (!modulesByTenant[row.tenant_id]) {
      //     modulesByTenant[row.tenant_id] = [];
      //   }
      //   modulesByTenant[row.tenant_id].push({
      //     id: row.module_id,
      //     name: row.module_name,
      //   });
      // });


      // Group by user_id (one tenant and one role per user)
      const result = {};

      userIds.forEach((userId) => {
        result[userId] = {
          tenant: null,
          role: null,
          roles: [],
          role_module_combinations: [],
          modules: [],
          department: null,
          designation: null,
        };
      });

      // Process tenant data (one tenant per user) with assignedModules
      tenantResult.rows.forEach((row) => {
        const userId = row.user_id;
        if (result[userId]) {
          result[userId].tenant = {
            id: row.tenant_id,
            name: row.tenant_name,
            // assignedModules: modulesByTenant[row.tenant_id] || [],
          };
        }
      });

      // Process role data (multiple roles per user)
      roleResult.rows.forEach((row) => {
        const userId = row.user_id;
        if (result[userId]) {
          const roleData = {
            id: row.role_id,
            name: row.role_name,
            code: row.role_code,
          };

          const roleModuleData = {
            role_id: row.role_id,
            role_name: row.role_name,
            role_code: row.role_code,
            module_id: row.module_id || null,
            module_name: row.module_name || null
          };

          // Set primary role (for backward compatibility)
          if (!result[userId].role) {
            result[userId].role = roleData;
          }

          // Add to roles array (if unique)
          if (!result[userId].roles.some((r) => r.id === roleData.id)) {
            result[userId].roles.push(roleData);
          }
          if (!result[userId].role_module_combinations) {
             result[userId].role_module_combinations = [];
          }
          result[userId].role_module_combinations.push(roleModuleData);

          // Add to modules array if module_id exists
          if (row.module_id) {
            const moduleData = {
              id: row.module_id,
              name: row.module_name,
            };
            if (!result[userId].modules.some((m) => m.id === moduleData.id)) {
              result[userId].modules.push(moduleData);
            }
          }
        }
      });

      // Get department and designation information for all users
      const deptDesigQuery = `
        SELECT 
          u.id as user_id,
          u.department_id,
          d.name as department_name,
          u.designation_id,
          des.name as designation_name
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        LEFT JOIN designations des ON u.designation_id = des.id
        WHERE u.id = ANY($1)
      `;

      const deptDesigResult = await database.query(deptDesigQuery, [userIds]);

      // Process department and designation data
      deptDesigResult.rows.forEach((row) => {
        const userId = row.user_id;
        if (result[userId]) {
          result[userId].department = row.department_id
            ? {
                id: row.department_id,
                name: row.department_name,
              }
            : null;
          result[userId].designation = row.designation_id
            ? {
                id: row.designation_id,
                name: row.designation_name,
              }
            : null;
        }
      });

      return result;
    } catch (error) {
      console.error(
        "[UserService] Error fetching tenant and role data:",
        error,
      );
      // Return empty data on error
      const result = {};
      userIds.forEach((userId) => {
        result[userId] = { tenant: null, role: null, roles: [] };
      });
      return result;
    }
  }
}

module.exports = new UserService();
