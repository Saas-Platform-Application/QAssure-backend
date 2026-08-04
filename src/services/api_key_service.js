const Apikey = require('../sequelize-models/api_key');
const { sequelize } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class ApikeyService {
  /**
   * Get all apikeies
   */
  async findAll(options = {}) {
    try {
      const { skip = 0, take = 100, where = {}, orderBy } = options;

      // Ensure orderBy is in correct format for Sequelize
      // Default to created_at DESC if not provided
      const order = (orderBy && Array.isArray(orderBy) && orderBy.length > 0)
        ? orderBy
        : [sequelize.literal('created_at DESC')];

      const { count, rows } = await Apikey.findAndCountAll({
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
      throw new Error(`Failed to fetch apikeies: ${error.message}`);
    }
  }

  /**
   * Get apikey by ID
   */
  async findById(id) {
    try {
      const apikey = await Apikey.findByPk(id, {
      });

      if (!apikey) {
        throw new Error('Apikey not found');
      }

      return apikey;
    } catch (error) {
      throw new Error(`Failed to fetch apikey: ${error.message}`);
    }
  }

  /**
   * Create new apikey
   */
  async create(data) {
    try {
      // Auto-generated validation calls (before_create)
      this.validateRateLimit(data, null);
      this.isIpAllowed(data, null);
      this.isActive(data, null);
      this.isExpired(data, null);
      this.validateWindow(data, null);

      // Generate UUID for primary key if not provided
      if (!data.id) {
        data.id = uuidv4();
      }

      const apikey = await Apikey.create(data);

      return apikey;
    } catch (error) {
      throw new Error(`Failed to create apikey: ${error.message}`);
    }
  }

  /**
   * Update apikey
   */
  async update(id, data) {
    try {
      // Check if exists
      const apikey = await this.findById(id);

      // Auto-generated validation calls (before_update)
      this.validateRateLimit(data, apikey);
      this.isIpAllowed(data, apikey);
      this.isActive(data, apikey);
      this.isExpired(data, apikey);
      this.validateWindow(data, apikey);

      await apikey.update(data);
      await apikey.reload();

      return apikey;
    } catch (error) {
      throw new Error(`Failed to update apikey: ${error.message}`);
    }
  }

  /**
   * Delete apikey
   */
  async delete(id) {
    try {
      // Check if exists
      const apikey = await this.findById(id);

      await apikey.destroy();

      return { message: 'Apikey deleted successfully' };
    } catch (error) {
      throw new Error(`Failed to delete apikey: ${error.message}`);
    }
  }

  // =========== BLS Business Rules ===========

  /**
   * API keys must have rate limit configured
   * @generated from DSL function
   * @classification validation
   */
  validateRateLimit(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const apikey = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = apikey.status;
    const id = apikey.id;
    const tenant_id = apikey.tenant_id;
    const version = apikey.version;
    const module_id = apikey.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (!(rateLimit > 0 && rateLimit <= 10000)) {
  throw new Error(`Rate limit must be configured between 1 and 10000 requests`);
}
  }

  /**
   * API keys support IP allowlist restrictions
   * @generated from DSL function
   * @classification validation
   */
  isIpAllowed(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const apikey = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = apikey.status;
    const id = apikey.id;
    const tenant_id = apikey.tenant_id;
    const version = apikey.version;
    const module_id = apikey.module_id;
    const context = { user: { tenant_id: tenant_id } };
      let allowedIps = apikey.ip_allowlist || [];
  let clientIp = context.client_ip;
  if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
  throw new Error(`Client IP {clientIp} is not in the allowlist for this API key`);
}
  }

  /**
   * API key must be ACTIVE
   * @generated from DSL function
   * @classification validation
   */
  isActive(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const apikey = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = apikey.status;
    const id = apikey.id;
    const tenant_id = apikey.tenant_id;
    const version = apikey.version;
    const module_id = apikey.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (status !== 'ACTIVE') {
  throw new Error(`API key must be ACTIVE`);
}
  }

  /**
   * API key must not be expired
   * @generated from DSL function
   * @classification validation
   */
  isExpired(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const apikey = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = apikey.status;
    const id = apikey.id;
    const tenant_id = apikey.tenant_id;
    const version = apikey.version;
    const module_id = apikey.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (expiresAt && Date.now() > expiresAt.getTime()) {
  throw new Error(`API key has expired`);
}
  }

  /**
   * Track API key usage count and last used
   * @generated from DSL function
   * @classification calculation
   */
  recordUsage() {
      apiKey.usage_count = apiKey.usage_count + 1;
  apiKey.last_used_at = NOW();
  }

  /**
   * Rate limit window must be valid
   * @generated from DSL function
   * @classification validation
   */
  validateWindow(data, existing) {
    // Extract entity object from data for validation
    // For create: use data directly, for update: merge existing with data
    const apikey = existing ? Object.assign({}, existing, data) : data;
    // Extract common fields that might be used in validation (from entity fields)
    // Extract additional common variables that might be used in validation
    // Common field names that might be referenced in generated code
    const status = apikey.status;
    const id = apikey.id;
    const tenant_id = apikey.tenant_id;
    const version = apikey.version;
    const module_id = apikey.module_id;
    const context = { user: { tenant_id: tenant_id } };
      if (!['MINUTE','HOUR','DAY'].includes(window)) {
  throw new Error(`Rate limit window must be one of: MINUTE, HOUR, or DAY`);
}
  }

  // =========== Custom Service Methods ===========
  /**
   * Get API key details
   * GET /api/v1/api-keys/:keyId
   */
  async findOne(keyId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Apikey;
      const entityName = 'Apikey';
      const entityNameCamel = 'apikey';
      // Find entity by first parameter (e.g., moduleId, userId, etc.)
      // Try to find using query method if available (e.g., findByModuleId)
      // Fallback: Find by field using findAll
      const results = await EntityModel.findAll({
        where: {
          keyId: keyId
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
   * Revoke API key
   * POST /api/v1/api-keys/:keyId/revoke
   */
  async revoke(keyId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Apikey;
      const entityName = 'Apikey';
      const entityNameCamel = 'apikey';
      // Custom method implementation
      // TODO: Implement revoke logic
      throw new Error('Method revoke not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute revoke: ${error.message}`);
    }
  }
  /**
   * Rotate API key
   * POST /api/v1/api-keys/:keyId/rotate
   */
  async rotate(keyId) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Apikey;
      const entityName = 'Apikey';
      const entityNameCamel = 'apikey';
      // Custom method implementation
      // TODO: Implement rotate logic
      throw new Error('Method rotate not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute rotate: ${error.message}`);
    }
  }
  /**
   * Get API key usage stats
   * GET /api/v1/api-keys/:keyId/usage
   */
  async getUsage(keyId, startDate, endDate) {
    try {
      // Store entity references for use in nested blocks
      const EntityModel = Apikey;
      const entityName = 'Apikey';
      const entityNameCamel = 'apikey';
      // Custom method implementation
      // TODO: Implement getUsage logic
      throw new Error('Method getUsage not yet implemented');
    } catch (error) {
      throw new Error(`Failed to execute getUsage: ${error.message}`);
    }
  }

  // =========== Query Methods (findBy*) ===========
  /**
   * Find apikeys by key_hash
   */
  async findByKeyHash(key_hash) {
    try {
      const results = await Apikey.findAll({
        where: {
          key_hash: key_hash
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by key_hash: ${error.message}`);
    }
  }
  /**
   * Find apikeys by name
   */
  async findByName(name) {
    try {
      const results = await Apikey.findAll({
        where: {
          name: name
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by name: ${error.message}`);
    }
  }
  /**
   * Find apikeys by description
   */
  async findByDescription(description) {
    try {
      const results = await Apikey.findAll({
        where: {
          description: description
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by description: ${error.message}`);
    }
  }
  /**
   * Find apikeys by tenant_id
   */
  async findByTenantId(tenant_id) {
    try {
      const results = await Apikey.findAll({
        where: {
          tenant_id: tenant_id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by tenant_id: ${error.message}`);
    }
  }
  /**
   * Find apikeys by created_by
   */
  async findByCreatedBy(created_by) {
    try {
      const results = await Apikey.findAll({
        where: {
          created_by: created_by
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by created_by: ${error.message}`);
    }
  }
  /**
   * Find apikeys by status
   */
  async findByStatus(status) {
    try {
      const results = await Apikey.findAll({
        where: {
          status: status
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by status: ${error.message}`);
    }
  }
  /**
   * Find apikeys by rate_limit
   */
  async findByRateLimit(rate_limit) {
    try {
      const results = await Apikey.findAll({
        where: {
          rate_limit: rate_limit
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by rate_limit: ${error.message}`);
    }
  }
  /**
   * Find apikeys by ip_allowlist
   */
  async findByIpAllowlist(ip_allowlist) {
    try {
      const results = await Apikey.findAll({
        where: {
          ip_allowlist: ip_allowlist
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by ip_allowlist: ${error.message}`);
    }
  }
  /**
   * Find apikeys by last_used_at
   */
  async findByLastUsedAt(last_used_at) {
    try {
      const results = await Apikey.findAll({
        where: {
          last_used_at: last_used_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by last_used_at: ${error.message}`);
    }
  }
  /**
   * Find apikeys by last_used_ip
   */
  async findByLastUsedIp(last_used_ip) {
    try {
      const results = await Apikey.findAll({
        where: {
          last_used_ip: last_used_ip
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by last_used_ip: ${error.message}`);
    }
  }
  /**
   * Find apikeys by usage_count
   */
  async findByUsageCount(usage_count) {
    try {
      const results = await Apikey.findAll({
        where: {
          usage_count: usage_count
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by usage_count: ${error.message}`);
    }
  }
  /**
   * Find apikeys by expires_at
   */
  async findByExpiresAt(expires_at) {
    try {
      const results = await Apikey.findAll({
        where: {
          expires_at: expires_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by expires_at: ${error.message}`);
    }
  }
  /**
   * Find apikeys by created_at
   */
  async findByCreatedAt(created_at) {
    try {
      const results = await Apikey.findAll({
        where: {
          created_at: created_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by created_at: ${error.message}`);
    }
  }
  /**
   * Find apikeys by updated_at
   */
  async findByUpdatedAt(updated_at) {
    try {
      const results = await Apikey.findAll({
        where: {
          updated_at: updated_at
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to find apikeys by updated_at: ${error.message}`);
    }
  }

  // =========== Relationship Methods ===========
  /**
   * Get the tenant for this apikey
   */
  async getTenant(id) {
    try {
      const apikey = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const tenantService = require('./tenant_service');
      if (apikey.tenant_id) {
        const result = await tenantService.findById(apikey.tenant_id);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get tenant for apikey: ${error.message}`);
    }
  }
  /**
   * Get the user for this apikey
   */
  async getUser(id) {
    try {
      const apikey = await this.findById(id);
      // Get related entity (many-to-one or one-to-one)
      const userService = require('./user_service');
      if (apikey.created_by) {
        const result = await userService.findById(apikey.created_by);
        return result;
      }
      return null;
    } catch (error) {
      throw new Error(`Failed to get user for apikey: ${error.message}`);
    }
  }
  /**
   * Get all apikeypermissions for this apikey
   */
  async getApiKeyPermission(id) {
    try {
      const apikey = await this.findById(id);
      // Get related entities (one-to-many)
      const apikeypermissionService = require('./api_key_permission_service');
      const results = await apikeypermissionService.findAll({
        where: {
          api_key_id: apikey.id
        }
      });
      return results;
    } catch (error) {
      throw new Error(`Failed to get apikeypermission for apikey: ${error.message}`);
    }
  }

  /**
 * Create a new API key
 * @param {Object} data - API key data
 * @param {string} data.name - Key name
 * @param {string} data.description - Key description
 * @param {Array} data.permissions - Array of permissions
 * @param {string} data.expires_at - Expiration date
 * @param {string} data.module_id - Associated module ID (optional)
 * @param {string} userId - Creating user ID
 * @param {string} tenantId - Tenant ID
 */
async create(data, userId, tenantId) {
  const { name, description, permissions = [], expires_at, module_id = null } = data;

  // Generate key
  const plainKey = this.generateKey();
  const keyHash = this.hashKey(plainKey);
  const keyPrefix = plainKey.substring(0, 12); // Store prefix for identification

  const keyId = crypto.randomUUID();
  
  // Insert API key
  const query = `
    INSERT INTO api_keys (
      id, tenant_id, name, description, key_hash, key_prefix,
      created_by, expires_at, status, module_id, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
    RETURNING id, name, description, key_prefix, expires_at, status, module_id, created_at
  `;

  const result = await database.query(query, [
    keyId,
    tenantId,
    name,
    description || null,
    keyHash,
    keyPrefix,
    userId,
    expires_at || null,
    'active',
    module_id  // NEW: module_id parameter
  ]);

  const apiKey = result.rows[0];

  // Assign permissions to the key (resource:action format)
  if (permissions.length > 0) {
    for (const perm of permissions) {
      let resource, action;
      if (typeof perm === 'string') {
        [resource, action] = perm.split(':');
      } else {
        resource = perm.resource;
        action = perm.action;
      }
      
      if (resource && action) {
        await database.query(`
          INSERT INTO api_key_permissions (id, api_key_id, resource, action, created_at, updated_at)
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, [crypto.randomUUID(), keyId, resource, action]);
      }
    }
  }

  // Return with the plain key (only shown once!)
  return {
    id: apiKey.id,
    name: apiKey.name,
    description: apiKey.description,
    key: plainKey, // Only returned on creation!
    key_prefix: apiKey.key_prefix,
    expires_at: apiKey.expires_at,
    status: apiKey.status,
    module_id: apiKey.module_id,
    created_at: apiKey.created_at,
    warning: 'Save this key securely. It will not be shown again.'
  };
}

}

module.exports = new ApikeyService();

