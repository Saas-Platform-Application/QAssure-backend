const Tenant = require('../sequelize-models/tenant');
const database = require('../config/database');
const { sequelize } = database;
const { v4: uuidv4 } = require('uuid');

const { getAuditService } = require('./audit.service');

// Get Module model from sequelize to ensure we use the same instance with associations
// Models are already loaded by app.js before routes are registered
const getModuleModel = () => {
  if (!sequelize.models.Module) {
    // Fallback: load models if not already loaded (shouldn't happen in normal flow)
    require('../sequelize-models/loader');
  }
  return sequelize.models.Module;
};

class TenantService {
  /**
   * Get all tenants
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const Module = getModuleModel();

      // Count separately to avoid issues with includes affecting the count
      // When using includes with required: false, findAndCountAll can count incorrectly
      const count = await Tenant.count({
        where,
        distinct: true,
        col: 'id'
      });

      // Fetch the actual data with counts
      const rows = await Tenant.findAll({
        where,
        limit: take,
        offset: skip,
        order: order,
        attributes: {
          include: [
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM user_tenants AS ut
                WHERE ut.tenant_id = "Tenant".id
                AND ut.status = 'active'
                AND NOT EXISTS (
                  SELECT 1
                  FROM user_roles AS ur
                  JOIN roles AS r ON ur.role_id = r.id
                  WHERE ur.user_id = ut.user_id
                  AND ur.tenant_id = ut.tenant_id
                  AND r.code = 'tenant_admin'
                )
              )`),
              'user_count'
            ],
            [
              sequelize.literal(`(
                SELECT COUNT(*)
                FROM tenant_modules AS tm
                WHERE tm.tenant_id = "Tenant".id
                AND tm.status = 'active'
              )`),
              'module_count'
            ]
          ]
        }
      });

      return {
        data: rows,
        total: count,
        skip,
        take,
        hasMore: skip + take < count
      };
    } catch (error) {
      throw new Error(`Failed to fetch tenants: ${error.message}`);
    }
  }

  /**
   * Get tenant theme by domain
   * Returns theme information (logo, favicon, colors) for public access
   */
  async getThemeByDomain(domain) {
    try {
      const tenant = await Tenant.findOne({
        where: {
          domain: domain,
          status: 'active'
        },
        attributes: [
          'id',
          'name',
          'logo_file_path',
          'logo_file_attachment_uuid',
          'favicon_file_path',
          'favicon_file_attachment_uuid',
          'primary_color',
          'secondary_color',
          'accent_color'
        ]
      });

      if (!tenant) {
        throw new Error('Tenant not found for the given domain');
      }

      return {
        id: tenant.id,
        name: tenant.name,
        logo_file_path: tenant.logo_file_path,
        logo_file_attachment_uuid: tenant.logo_file_attachment_uuid,
        favicon_file_path: tenant.favicon_file_path,
        favicon_file_attachment_uuid: tenant.favicon_file_attachment_uuid,
        primary_color: tenant.primary_color,
        secondary_color: tenant.secondary_color,
        accent_color: tenant.accent_color
      };
    } catch (error) {
      throw new Error(`Failed to fetch tenant theme: ${error.message}`);
    }
  }

  async getThemeOftenant(tenantId) {
    try {
      const tenant = await Tenant.findOne({
        where: {
          id: tenantId,
          status: 'active'
        },
        attributes: [
          'id',
          'name',
          'logo_file_path',
          'logo_file_attachment_uuid',
          'favicon_file_path',
          'favicon_file_attachment_uuid',
          'primary_color',
          'secondary_color',
          'accent_color'
        ]
      });

      if (!tenant) {
        throw new Error('Tenant not found for the given domain');
      }

      return {
        id: tenant.id,
        name: tenant.name,
        logo_file_path: tenant.logo_file_path,
        logo_file_attachment_uuid: tenant.logo_file_attachment_uuid,
        favicon_file_path: tenant.favicon_file_path,
        favicon_file_attachment_uuid: tenant.favicon_file_attachment_uuid,
        primary_color: tenant.primary_color,
        secondary_color: tenant.secondary_color,
        accent_color: tenant.accent_color
      };
    } catch (error) {
      throw new Error(`Failed to fetch tenant theme: ${error.message}`);
    }
  }

  /**
   * Get tenant by ID
   */
  async findById(id) {
    try {
      const Module = getModuleModel();
      const tenant = await Tenant.findByPk(id, {
        include: [{
          model: Module,
          as: 'assignedModules',
          through: {
            attributes: ['assigned_at', 'assigned_by', 'status'],
            where: { status: 'active' } // Only include active module assignments
          },
          attributes: ['id', 'module_id', 'name', 'description', 'version', 'status', 'frontend_base_url', 'backend_base_url'],
          required: false // Use LEFT JOIN so tenant is returned even if no active modules
        }]
      });

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      const database = require('../config/database');

      // Get tenant_admin user with contact details (separate query first)
      const tenantAdminQuery = `
        SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.contact_phone,
          u.address_line1,
          u.address_line2,
          u.city,
          u.state,
          u.postal_code,
          u.country
        FROM users u
        INNER JOIN user_tenants ut ON u.id = ut.user_id
        INNER JOIN user_roles ur ON u.id = ur.user_id
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ut.tenant_id = $1
          AND LOWER(ut.status) = 'active'
          AND LOWER(r.code) = 'tenant_admin'
          AND ur.tenant_id = $1
        ORDER BY ur.assigned_at ASC
        LIMIT 1
      `;

      const tenantAdminResult = await database.query(tenantAdminQuery, [id]);
      const tenantAdminId = tenantAdminResult.rows.length > 0 ? tenantAdminResult.rows[0].id : null;
      const tenantAdmin = tenantAdminResult.rows.length > 0 ? {
        id: tenantAdminResult.rows[0].id,
        email: tenantAdminResult.rows[0].email,
        first_name: tenantAdminResult.rows[0].first_name,
        last_name: tenantAdminResult.rows[0].last_name,
        contact_phone: tenantAdminResult.rows[0].contact_phone,
        address_line1: tenantAdminResult.rows[0].address_line1,
        address_line2: tenantAdminResult.rows[0].address_line2,
        city: tenantAdminResult.rows[0].city,
        state: tenantAdminResult.rows[0].state,
        postal_code: tenantAdminResult.rows[0].postal_code,
        country: tenantAdminResult.rows[0].country
      } : null;

      // Get all users for this tenant (excluding tenant_admin) - email and status only
      const usersQuery = tenantAdminId
        ? `
          SELECT DISTINCT
            u.email,
            u.status
          FROM users u
          INNER JOIN user_tenants ut ON u.id = ut.user_id
          WHERE ut.tenant_id = $1
            AND LOWER(ut.status) = 'active'
            AND u.id != $2
          ORDER BY u.email
        `
        : `
          SELECT DISTINCT
            u.email,
            u.status
          FROM users u
          INNER JOIN user_tenants ut ON u.id = ut.user_id
          WHERE ut.tenant_id = $1
            AND LOWER(ut.status) = 'active'
          ORDER BY u.email
        `;

      const usersResult = tenantAdminId
        ? await database.query(usersQuery, [id, tenantAdminId])
        : await database.query(usersQuery, [id]);

      // Convert tenant to JSON and add users array (excluding tenant_admin) and tenant_admin (separate)
      const tenantData = tenant.toJSON ? tenant.toJSON() : tenant;
      tenantData.users = usersResult.rows.map(user => ({
        email: user.email,
        status: user.status
      }));
      tenantData.tenant_admin = tenantAdmin;

      return tenantData;
    } catch (error) {
      throw new Error(`Failed to fetch tenant: ${error.message}`);
    }
  }

  /**
   * Create new tenant
   */
  async create(data, userContext = null) {
    const userId = userContext?.id || null;
    const transaction = await sequelize.transaction();
    try {
      // Auto-generated validation calls (before_create)
      this.validateStatus(data, null);

      // Extract module_ids if provided
      const moduleIds = data.module_ids || [];
      delete data.module_ids; // Remove from data before creating tenant

      // Extract service_keys if provided (platform service enable/disable list)
      const serviceKeys = data.service_keys !== undefined ? data.service_keys : null;
      delete data.service_keys; // Remove from tenant data before creating

      // Extract settings and contact information
      const settings = data.settings || {};
      const contact = settings.contact || null;
      const branding = settings.branding || null;
      delete data.settings; // Remove settings from tenant data

      // Extract enable_sso and enable_2fa from settings or root level
      const enable_sso = data.enable_sso !== undefined ? data.enable_sso : (settings.enable_sso || false);
      const enable_2fa = data.enable_2fa !== undefined ? data.enable_2fa : (settings.enable_2fa || false);

      // Set enable_sso and enable_2fa in tenant data
      data.enable_sso = enable_sso;
      data.enable_2fa = enable_2fa;

      // Extract branding fields from settings.branding
      if (branding) {
        // data.logo_file_path = branding.logo_file_path || null;
        // data.logo_file_attachment_uuid = branding.logo_file_attachment_uuid || null;
        // data.favicon_file_path = branding.favicon_file_path || null;
        // data.favicon_file_attachment_uuid = branding.favicon_file_attachment_uuid || null;
        data.primary_color = branding.primary_color || null;
        data.secondary_color = branding.secondary_color || null;
        data.accent_color = branding.accent_color || null;
      }

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const tenant = await Tenant.create(data, { transaction });

      // Assign modules if provided
      if (moduleIds && moduleIds.length > 0) {
        await this.assignModules(tenant.id, moduleIds, userId, transaction);
      }

      // Create contact user if contact information is provided
      if (contact && contact.email) {
        const userService = require('./user_service');
        const Role = require('../sequelize-models/role');

        // Find tenant_admin role by code
        let tenantAdminRoleId = null;
        try {
          const tenantAdminRole = await Role.findOne({
            where: { code: 'tenant_admin' },
            transaction
          });

          if (tenantAdminRole) {
            tenantAdminRoleId = tenantAdminRole.id;
          } else {
            console.warn('⚠️  Role with code "tenant_admin" not found. User will be created without role assignment.');
          }
        } catch (error) {
          console.warn('⚠️  Failed to find tenant_admin role:', error.message);
        }

        const role_module_combinations = [];
        if (tenantAdminRoleId) {
          role_module_combinations.push({
            role_id: tenantAdminRoleId,
            module_id: null
          });
          if (moduleIds && moduleIds.length > 0) {
            for (const mId of moduleIds) {
              role_module_combinations.push({
                role_id: tenantAdminRoleId,
                module_id: mId
              });
            }
          }
        }

        const contactUserData = {
          email: contact.email,
          password_hash: contact.password, // Will be hashed by user service
          first_name: contact.first_name,
          last_name: contact.last_name,
          contact_phone: contact.contact_phone || null,
          address_line1: contact.address_line1 || null,
          address_line2: contact.address_line2 || null,
          city: contact.city || null,
          state: contact.state || null,
          postal_code: contact.postal_code || null,
          country: contact.country || null,
          status: 'active',
          auth_provider: 'tenant',
          tenant_id: tenant.id, // Assign to the newly created tenant
          is_primary_tenant: true, // Make this the primary tenant for the user
          assigned_by: userId, // Pass the creator's ID for email routing context
          role_module_combinations
        };

        await userService.create(contactUserData, { transaction, requester: userContext });
      }

      await transaction.commit();

      // ── Provision platform services (outside transaction — non-critical) ──
      try {
        if (serviceKeys !== null && Array.isArray(serviceKeys)) {
          // Specific keys provided: enable only those, disable the rest
          await sequelize.query(`
            INSERT INTO tenant_platform_services (tenant_id, service_id, is_enabled, changed_by, changed_at, created_at, updated_at)
            SELECT $1, ps.id,
                   CASE WHEN ps.key = ANY($2::text[]) THEN true ELSE false END,
                   $3, NOW(), NOW(), NOW()
            FROM platform_services ps
            ON CONFLICT (tenant_id, service_id) DO UPDATE
              SET is_enabled  = EXCLUDED.is_enabled,
                  changed_by  = EXCLUDED.changed_by,
                  changed_at  = NOW(),
                  updated_at  = NOW()
          `, { bind: [tenant.id, serviceKeys, userId] });
        } else {
          // No service_keys provided: enable all services by default
          await sequelize.query(`
            INSERT INTO tenant_platform_services (tenant_id, service_id, is_enabled, changed_by, changed_at, created_at, updated_at)
            SELECT $1, ps.id, true, $2, NOW(), NOW(), NOW()
            FROM platform_services ps
            ON CONFLICT (tenant_id, service_id) DO NOTHING
          `, { bind: [tenant.id, userId] });
        }
        console.log(`[TenantService] Platform services provisioned for tenant ${tenant.id}`);
      } catch (svcErr) {
        console.warn('[TenantService] Failed to provision platform services:', svcErr.message);
      }

      try {
        await getAuditService().log({
          action: 'CREATE',
          user_id: userId,
          tenant_id: tenant.id,
          resource_type: 'tenant',
          resource_id: tenant.id,
          response_status: 201,
          metadata: {
            tenant_name: data.name,
            modules_assigned: moduleIds,
            services_enabled: serviceKeys || 'all',
            performed_by: userId || 'super_admin'
          }
        });
      } catch (auditErr) {
        console.warn('[TenantService] Audit log failed:', auditErr.message);
      }

      // Reload tenant with modules
      const createdTenant = await this.findById(tenant.id);
      
      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('create', 'tenant', tenant.id, userId);
      } catch (e) {
        console.error('Failed to send identity update for tenant create', e);
      }

      return createdTenant;
    } catch (error) {
      await transaction.rollback();

      // Handle Sequelize unique constraint errors with user-friendly messages
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path || 'field';

        if (field === 'slug') {
          throw new Error('Tenant slug already exists. Please choose a different slug.');
        } else if (field === 'name') {
          throw new Error('Tenant name already exists. Please choose a different name.');
        } else {
          throw new Error(`Tenant with this ${field} already exists`);
        }
      }

      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new Error(`Validation error: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
      }

      throw new Error(`Failed to create tenant: ${error.message}`);
    }
  }

  /**
   * Update tenant
   */
  async update(id, data, userId = null) {
    const transaction = await sequelize.transaction();
    try {
      // Fetch tenant as Sequelize instance directly (not using findById which returns plain object)
      const Module = getModuleModel();
      const tenant = await Tenant.findByPk(id, {
        include: [{
          model: Module,
          as: 'assignedModules',
          through: {
            attributes: ['assigned_at', 'assigned_by', 'status'],
            where: { status: 'active' } // Only include active module assignments
          },
          attributes: ['id', 'module_id', 'name', 'description', 'version', 'status', 'frontend_base_url', 'backend_base_url'],
          required: false // Use LEFT JOIN so tenant is returned even if no active modules
        }]
      });

      if (!tenant) {
        const notFoundError = new Error('Tenant not found');
        notFoundError.code = 'NOT_FOUND';
        // Rollback transaction before throwing
        if (!transaction.finished) {
          await transaction.rollback();
        }
        throw notFoundError;
      }

      // Extract module_ids if provided
      const moduleIds = data.module_ids;
      if (moduleIds !== undefined) {
        delete data.module_ids; // Remove from data before updating tenant

        // Update module assignments
        await this.assignModules(id, moduleIds, userId, transaction);
      }

      // Extract service_keys if provided (platform service enable/disable list)
      const serviceKeys = data.service_keys !== undefined ? data.service_keys : undefined;
      delete data.service_keys; // Remove from tenant data before updating

      // Extract settings and contact information
      const settings = data.settings || {};
      const contact = settings.contact || null;
      const branding = settings.branding || null;
      delete data.settings; // Remove settings from tenant data

      // Extract enable_sso and enable_2fa from settings or root level
      if (data.enable_sso !== undefined || settings.enable_sso !== undefined) {
        data.enable_sso = data.enable_sso !== undefined ? data.enable_sso : settings.enable_sso;
      }
      if (data.enable_2fa !== undefined || settings.enable_2fa !== undefined) {
        data.enable_2fa = data.enable_2fa !== undefined ? data.enable_2fa : settings.enable_2fa;
      }

      // Extract branding fields from settings.branding
      if (branding) {
        if (branding.logo_file_path !== undefined) {
          data.logo_file_path = branding.logo_file_path;
        }
        if (branding.logo_file_attachment_uuid !== undefined) {
          data.logo_file_attachment_uuid = branding.logo_file_attachment_uuid;
        }
        if (branding.favicon_file_path !== undefined) {
          data.favicon_file_path = branding.favicon_file_path;
        }
        if (branding.favicon_file_attachment_uuid !== undefined) {
          data.favicon_file_attachment_uuid = branding.favicon_file_attachment_uuid;
        }
        if (branding.primary_color !== undefined) {
          data.primary_color = branding.primary_color;
        }
        if (branding.secondary_color !== undefined) {
          data.secondary_color = branding.secondary_color;
        }
        if (branding.accent_color !== undefined) {
          data.accent_color = branding.accent_color;
        }
      }

      // Update tenant
      await tenant.update(data, { transaction });
      await tenant.reload({ transaction });

      // Update contact user if contact information is provided
      if (contact) {
        const userService = require('./user_service');
        const User = require('../sequelize-models/user');
        const Usertenant = require('../sequelize-models/user_tenant');

        let existingUser = null;

        // 1. Priority: Find by provided contact.id
        if (contact.id) {
          existingUser = await User.findByPk(contact.id, { transaction });
        } 
        
        // 2. Secondary: Find current tenant_admin for this tenant
        if (!existingUser) {
          const Role = require('../sequelize-models/role');
          const adminRole = await Role.findOne({ where: { code: 'tenant_admin' }, transaction });
          
          if (adminRole) {
            const userRoleRes = await database.query(`
              SELECT u.* FROM users u
              JOIN user_roles ur ON u.id = ur.user_id
              WHERE ur.tenant_id = $1 AND ur.role_id = $2
              LIMIT 1
            `, [id, adminRole.id]);
            
            if (userRoleRes.rows.length > 0) {
              existingUser = await User.findByPk(userRoleRes.rows[0].id, { transaction });
            }
          }
        }

        // 3. Tertiary: Fallback to searching by email if provided
        if (!existingUser && contact.email) {
          existingUser = await User.findOne({
            where: { email: contact.email },
            transaction
          });
        }

        if (existingUser) {
          // Check if user is already associated with this tenant
          const userTenant = await Usertenant.findOne({
            where: {
              user_id: existingUser.id,
              tenant_id: id
            },
            transaction
          });

          if (userTenant) {
            // Update existing user
            const updateUserData = {
              email: contact.email || existingUser.email, // Allow updating email!
              first_name: contact.first_name || existingUser.first_name,
              last_name: contact.last_name || existingUser.last_name,
              contact_phone: contact.contact_phone !== undefined ? contact.contact_phone : existingUser.contact_phone,
              address_line1: contact.address_line1 !== undefined ? contact.address_line1 : existingUser.address_line1,
              address_line2: contact.address_line2 !== undefined ? contact.address_line2 : existingUser.address_line2,
              city: contact.city !== undefined ? contact.city : existingUser.city,
              state: contact.state !== undefined ? contact.state : existingUser.state,
              postal_code: contact.postal_code !== undefined ? contact.postal_code : existingUser.postal_code,
              country: contact.country !== undefined ? contact.country : existingUser.country,
            };

            // Update password if provided
            if (contact.password) {
              updateUserData.password_hash = contact.password; // Will be hashed by user service
            }

            await userService.update(existingUser.id, updateUserData, { transaction });
          } else {
            // If the user exists but is not associated with this tenant, we should not 
            // automatically link them during an edit/update operation of another tenant.
            throw new Error('The provided administrator email belongs to a user not associated with this tenant.');
          }
        } else {
          // If no administrator is found after all lookup attempts, throw an error
          // instead of creating a new one, as an admin should always exist for a tenant.
          throw new Error('Tenant administrator not found. Please ensure the tenant has a primary contact.');
        }
      }

      await transaction.commit();

      // ── Reconcile platform services (outside transaction — non-critical) ──
      if (serviceKeys !== undefined && Array.isArray(serviceKeys)) {
        try {
          const { invalidateTenantCache } = require('../middleware/service.middleware');

          // Upsert all platform services for this tenant based on provided keys
          await sequelize.query(`
            INSERT INTO tenant_platform_services (tenant_id, service_id, is_enabled, changed_by, changed_at, created_at, updated_at)
            SELECT $1, ps.id,
                   CASE WHEN ps.key = ANY($2::text[]) THEN true ELSE false END,
                   $3, NOW(), NOW(), NOW()
            FROM platform_services ps
            ON CONFLICT (tenant_id, service_id) DO UPDATE
              SET is_enabled  = EXCLUDED.is_enabled,
                  changed_by  = EXCLUDED.changed_by,
                  changed_at  = NOW(),
                  updated_at  = NOW()
          `, { bind: [id, serviceKeys, userId] });

          // Invalidate all cached entries for this tenant
          invalidateTenantCache(id);

          // Audit log for service state change
          await getAuditService().log({
            action: 'UPDATE',
            user_id: userId,
            tenant_id: id,
            resource_type: 'platform_services',
            resource_id: id,
            response_status: 200,
            metadata: { enabled_services: serviceKeys, performed_by: userId || 'super_admin' }
          });
        } catch (svcErr) {
          console.warn('[TenantService] Failed to reconcile platform services:', svcErr.message);
        }
      }

      try {
        await getAuditService().log({
          action: 'UPDATE',
          user_id: userId,
          tenant_id: id,
          resource_type: 'tenant',
          resource_id: id,
          response_status: 200,
          changes: { updated_fields: Object.keys(data) },
          metadata: { performed_by: userId || 'super_admin' }
        });
      } catch (auditErr) {
        console.warn('[TenantService] Audit log failed:', auditErr.message);
      }

      // Reload tenant with modules and users
      const updatedTenant = await this.findById(id);
      
      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('update', 'tenant', id, userId);
      } catch (e) {
        console.error('Failed to send identity update for tenant update', e);
      }

      return updatedTenant;
    } catch (error) {
      // Only rollback if transaction hasn't been finished yet
      if (!transaction.finished) {
        await transaction.rollback();
      }

      // Preserve NOT_FOUND errors (they're already rolled back)
      if (error.code === 'NOT_FOUND') {
        throw error;
      }

      // Handle Sequelize unique constraint errors with user-friendly messages
      if (error.name === 'SequelizeUniqueConstraintError') {
        const field = error.errors[0]?.path || 'field';

        if (field === 'slug') {
          throw new Error('Tenant slug already exists. Please choose a different slug.');
        } else if (field === 'name') {
          throw new Error('Tenant name already exists. Please choose a different name.');
        } else {
          throw new Error(`Tenant with this ${field} already exists`);
        }
      }

      // Handle Sequelize validation errors
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map(err => ({
          field: err.path,
          message: err.message
        }));
        throw new Error(`Validation error: ${validationErrors.map(e => `${e.field}: ${e.message}`).join(', ')}`);
      }

      throw new Error(`Failed to update tenant: ${error.message}`);
    }
  }

  /**
   * Delete tenant
   */
  async delete(id) {
    const transaction = await sequelize.transaction();
    try {
      // Fetch tenant as Sequelize instance directly (not using findById which returns plain object)
      const tenant = await Tenant.findByPk(id);

      if (!tenant) {
        const notFoundError = new Error('Tenant not found');
        notFoundError.code = 'NOT_FOUND';
        // Rollback transaction before throwing
        if (!transaction.finished) {
          await transaction.rollback();
        }
        throw notFoundError;
      }

      // Find all users associated with this tenant
      const Usertenant = require('../sequelize-models/user_tenant');
      const User = require('../sequelize-models/user');
      const Userrole = require('../sequelize-models/user_role');

      const userTenants = await Usertenant.findAll({
        where: { tenant_id: id },
        transaction
      });

      // Get unique user IDs
      const userIds = [...new Set(userTenants.map(ut => ut.user_id))];

      // Delete user roles associated with this tenant
      if (userIds.length > 0) {
        await Userrole.destroy({
          where: {
            tenant_id: id
          },
          transaction
        });
      }

      // Delete user-tenant associations
      await Usertenant.destroy({
        where: { tenant_id: id },
        transaction
      });

      // Delete users that are mapped to this tenant
      // Note: This will delete users even if they're associated with other tenants
      // If you want to only delete users that are ONLY associated with this tenant,
      // you would need to check each user's other tenant associations first
      if (userIds.length > 0) {
        await User.destroy({
          where: {
            id: userIds
          },
          transaction
        });
      }

      // Delete the tenant
      await tenant.destroy({ transaction });

      await transaction.commit();

      try {
        await getAuditService().log({
          action: 'DELETE',
          user_id: null,
          tenant_id: id,
          resource_type: 'tenant',
          resource_id: id,
          response_status: 200,
          metadata: { deleted_users_count: userIds.length }
        });
      } catch (auditErr) {
        console.warn('[TenantService] Audit log failed:', auditErr.message);
      }

      try {
        const { getModuleService } = require('./module.service');
        getModuleService().sendIdentityUpdate('delete', 'tenant', { id }, null);
      } catch (e) {
        console.error('Failed to send identity update for tenant delete', e);
      }

      return {
        message: 'Tenant deleted successfully',
        deletedUsersCount: userIds.length
      };
    } catch (error) {
      // Only rollback if transaction hasn't been finished yet
      if (!transaction.finished) {
        await transaction.rollback();
      }

      // Preserve NOT_FOUND errors (they're already rolled back)
      if (error.code === 'NOT_FOUND') {
        throw error;
      }

      throw new Error(`Failed to delete tenant: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * Row-level security enforces tenant isolation
   * @generated from DSL function
   * @classification validation
   */
  belongsToTenant(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const tenant = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = tenant.status;
    const id = tenant.id;
    const tenant_id = tenant.tenant_id;
    const version = tenant.version;
    const module_id = tenant.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (tenant.id !== context.user.tenant_id) {
      throw new Error(`Access denied: Tenant isolation violation`);
    }
  }

  /**
   * Tenant status must be active, suspended, or deleted
   * @generated from DSL function
   * @classification validation
   */
  validateStatus(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const tenant = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = tenant.status;
    const id = tenant.id;
    const tenant_id = tenant.tenant_id;
    const version = tenant.version;
    const module_id = tenant.module_id;
    const context = { user: { tenant_id: tenant_id } };
    if (!['active', 'suspended', 'deleted'].includes(status)) {
      throw new Error(`Invalid tenant status. Must be active, suspended, or deleted`);
    }
  }

  // =========== Custom Service Methods ===========
  /**
   * Get tenant details
   * GET /api/v1/tenants/:tenantId
   */
  async findOne(tenantId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Tenant;
      const entityName = 'Tenant';
      const entityNameCamel = 'tenant';
      // Find entity by first parameter (e.g., moduleId, userId, etc.)
      // Try to find using query method if available (e.g., findByModuleId)
      // Fallback: Find by field using findAll
      const results = await EntityModel.findAll({
        where: {
          tenantId: tenantId
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
   * Update tenant status
   * PUT /api/v1/tenants/:tenantId/status
   */
  async updateStatus(tenantId, data) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Tenant;
      const entityName = 'Tenant';
      const entityNameCamel = 'tenant';
      // Status update workflow
      const identifier = tenantId;
      // Find entity by identifier
      // Fallback: Find entity by field using findAll
      const modules = await EntityModel.findAll({
        where: {
          tenantId: identifier
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

  // =========== Query Methods (findBy*) ===========
  /**
   * Find tenants by name
   */
  async findByName(name) {
    try {
      const results = await Tenant.findAll({
        where: {
          name: name
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by name: ${error.message}`);
    }
  }
  /**
   * Find tenants by slug
   */
  async findBySlug(slug) {
    try {
      const results = await Tenant.findAll({
        where: {
          slug: slug
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by slug: ${error.message}`);
    }
  }
  /**
   * Find tenants by status
   */
  async findByStatus(status) {
    try {
      const results = await Tenant.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by status: ${error.message}`);
    }
  }
  /**
   * Find tenants by settings
   */
  async findBySettings(settings) {
    try {
      const results = await Tenant.findAll({
        where: {
          settings: settings
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by settings: ${error.message}`);
    }
  }
  /**
   * Find tenants by subscription_tier
   */
  async findBySubscriptionTier(subscription_tier) {
    try {
      const results = await Tenant.findAll({
        where: {
          subscription_tier: subscription_tier
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by subscription_tier: ${error.message}`);
    }
  }
  /**
   * Find tenants by max_users
   */
  async findByMaxUsers(max_users) {
    try {
      const results = await Tenant.findAll({
        where: {
          max_users: max_users
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by max_users: ${error.message}`);
    }
  }
  /**
   * Find tenants by max_modules
   */
  async findByMaxModules(max_modules) {
    try {
      const results = await Tenant.findAll({
        where: {
          max_modules: max_modules
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by max_modules: ${error.message}`);
    }
  }
  /**
   * Find tenants by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Tenant.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by created_at: ${error.message}`);
    }
  }
  /**
   * Find tenants by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Tenant.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find tenants by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get all usertenants for this tenant
   */
  async getUserTenant(id) {
    try {
      const tenant = await this.findById(id);
      // Get related entities (one-to-many)
      const usertenantService = require('./user_tenant_service');
      const results = await usertenantService.findAll({
        where: {
          tenant_id: tenant.id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get usertenant for tenant: ${error.message}`);
    }
  }
  /**
   * Get all modules for this tenant
   */
  async getModule(id) {
    try {
      const tenant = await this.findById(id);
      // Get related entities (one-to-many)
      const moduleService = require('./module_service');
      const results = await moduleService.findAll({
        where: {
          tenant_id: tenant.id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get module for tenant: ${error.message}`);
    }
  }
  /**
   * Get all apikeys for this tenant
   */
  async getApiKey(id) {
    try {
      const tenant = await this.findById(id);
      // Get related entities (one-to-many)
      const apikeyService = require('./api_key_service');
      const results = await apikeyService.findAll({
        where: {
          tenant_id: tenant.id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get apikey for tenant: ${error.message}`);
    }
  }
  /**
   * Get all qmsconnections for this tenant
   */
  async getQmsConnection(id) {
    try {
      const tenant = await this.findById(id);
      // Get related entities (one-to-many)
      const qmsconnectionService = require('./qms_connection_service');
      const results = await qmsconnectionService.findAll({
        where: {
          tenant_id: tenant.id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get qmsconnection for tenant: ${error.message}`);
    }
  }

  /**
   * Assign modules to tenant
   * @param {string} tenantId - Tenant ID
   * @param {Array<string>} moduleIds - Array of module IDs to assign
   * @param {string} assignedBy - User ID who is assigning (optional)
   * @param {Object} transaction - Sequelize transaction (optional)
   */
  async assignModules(tenantId, moduleIds, assignedBy = null, transaction = null) {
    try {
      // Normalize moduleIds to always be an array
      const normalizedModuleIds = Array.isArray(moduleIds) ? moduleIds : (moduleIds ? [moduleIds] : []);

      // Validate that all modules exist
      if (normalizedModuleIds.length > 0) {
        const Module = getModuleModel();
        const modules = await Module.findAll({
          where: { id: normalizedModuleIds },
          transaction
        });

        if (modules.length !== normalizedModuleIds.length) {
          const foundIds = modules.map(m => m.id);
          const missingIds = normalizedModuleIds.filter(id => !foundIds.includes(id));
          throw new Error(`Modules not found: ${missingIds.join(', ')}`);
        }
      }

      // Get current assignments
      const currentAssignments = await sequelize.query(
        `SELECT module_id FROM tenant_modules WHERE tenant_id = :tenantId AND status = 'active'`,
        {
          replacements: { tenantId },
          type: sequelize.QueryTypes.SELECT,
          transaction
        }
      );
      const currentModuleIds = currentAssignments.map(a => a.module_id);

      // Determine modules to add and remove
      const modulesToAdd = normalizedModuleIds.filter(id => !currentModuleIds.includes(id));
      const modulesToRemove = currentModuleIds.filter(id => !normalizedModuleIds.includes(id));

      // Remove modules that are no longer assigned
      if (modulesToRemove.length > 0) {
        // Use sequelize.query with proper array handling
        // Sequelize should handle array expansion in IN clause, but if it doesn't work,
        // we can use unnest or a loop. For now, let's use the standard IN clause.
        // If issues persist, we can switch to: module_id = ANY(ARRAY[:moduleIds]::uuid[])
        const placeholders = modulesToRemove.map((_, index) => `:moduleId${index}`).join(', ');
        const replacements = { tenantId };
        modulesToRemove.forEach((moduleId, index) => {
          replacements[`moduleId${index}`] = moduleId;
        });

        await sequelize.query(
          `UPDATE tenant_modules 
           SET status = 'inactive', updated_at = NOW() 
           WHERE tenant_id = :tenantId AND module_id IN (${placeholders})`,
          {
            replacements,
            type: sequelize.QueryTypes.UPDATE,
            transaction
          }
        );

        // Also update tenant_module_access for consistency
        await sequelize.query(
          `UPDATE tenant_module_access 
           SET enabled = false, disabled_at = NOW(), updated_at = NOW() 
           WHERE tenant_id = :tenantId AND module_id IN (${placeholders})`,
          {
            replacements,
            type: sequelize.QueryTypes.UPDATE,
            transaction
          }
        );
      }

      // Add new module assignments
      if (modulesToAdd.length > 0) {
        const insertValues = modulesToAdd.map(moduleId => ({
          id: uuidv4(),
          tenant_id: tenantId,
          module_id: moduleId,
          assigned_by: assignedBy,
          assigned_at: new Date(),
          status: 'active',
          created_at: new Date(),
          updated_at: new Date()
        }));

        // Use bulk insert with ON CONFLICT to handle duplicates
        for (const value of insertValues) {
          // 1. Update tenant_modules
          await sequelize.query(
            `INSERT INTO tenant_modules (id, tenant_id, module_id, assigned_by, assigned_at, status, created_at, updated_at)
             VALUES (:id, :tenant_id, :module_id, :assigned_by, :assigned_at, :status, :created_at, :updated_at)
             ON CONFLICT (tenant_id, module_id) 
             DO UPDATE SET status = 'active', assigned_by = :assigned_by, updated_at = :updated_at`,
            {
              replacements: value,
              type: sequelize.QueryTypes.INSERT,
              transaction
            }
          );

          // 2. Update tenant_module_access for consistency
          await sequelize.query(
            `INSERT INTO tenant_module_access (id, tenant_id, module_id, enabled, enabled_by, enabled_at, created_at, updated_at)
             VALUES (gen_random_uuid(), :tenant_id, :module_id, true, COALESCE(:assigned_by, '00000000-0000-0000-0000-000000000000'::uuid), :assigned_at, :created_at, :updated_at)
             ON CONFLICT (tenant_id, module_id) 
             DO UPDATE SET enabled = true, enabled_at = :assigned_at, updated_at = :updated_at`,
            {
              replacements: value,
              type: sequelize.QueryTypes.INSERT,
              transaction
            }
          );
        }
      }

      // Sync tenant admin module permissions for all active modules
      const { Op } = require('sequelize');
      const Role = require('../sequelize-models/role');
      const Userrole = require('../sequelize-models/user_role');

      // Remove roles for removed modules (any module_id not in normalizedModuleIds)
      if (normalizedModuleIds.length > 0) {
        await Userrole.destroy({
          where: {
            tenant_id: tenantId,
            module_id: {
              [Op.and]: [
                { [Op.ne]: null },
                { [Op.notIn]: normalizedModuleIds }
              ]
            }
          },
          transaction
        });
      } else {
        // If no modules are active, delete all user roles with a module_id under this tenant
        await Userrole.destroy({
          where: {
            tenant_id: tenantId,
            module_id: { [Op.ne]: null }
          },
          transaction
        });
      }

      const tenantAdminRole = await Role.findOne({
        where: { code: 'tenant_admin' },
        transaction
      });

      if (tenantAdminRole) {
        // Find all active global tenant admins for this tenant
        const tenantAdminUsers = await Userrole.findAll({
          where: {
            tenant_id: tenantId,
            role_id: tenantAdminRole.id,
            module_id: null
          },
          attributes: ['user_id'],
          transaction
        });
        const adminUserIds = tenantAdminUsers.map(u => u.user_id);

        if (adminUserIds.length > 0) {
          // Sync tenant_admin role for all active modules in normalizedModuleIds
          const insertUserRoles = [];
          for (const userId of adminUserIds) {
            for (const mId of normalizedModuleIds) {
              // Check if they already have this assignment
              const existingUserRole = await Userrole.findOne({
                where: {
                  user_id: userId,
                  role_id: tenantAdminRole.id,
                  module_id: mId,
                  tenant_id: tenantId
                },
                transaction
              });

              if (!existingUserRole) {
                insertUserRoles.push({
                  id: uuidv4(),
                  user_id: userId,
                  role_id: tenantAdminRole.id,
                  module_id: mId,
                  tenant_id: tenantId,
                  assigned_by: assignedBy || null,
                  assigned_at: new Date(),
                  created_at: new Date(),
                  updated_at: new Date()
                });
              }
            }
          }

          if (insertUserRoles.length > 0) {
            await Userrole.bulkCreate(insertUserRoles, { transaction });
          }

          // Clear permission cache for the admin users
          try {
            const { getPermissionService } = require("../infrastructure/auth/permission.service");
            const permissionService = getPermissionService();
            for (const uId of adminUserIds) {
              await permissionService.clearCache(uId, tenantId);
            }
          } catch (cacheError) {
            console.warn("[TenantService] Failed to clear permission cache:", cacheError.message);
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to assign modules: ${error.message}`);
    }
  }

}

module.exports = new TenantService();

