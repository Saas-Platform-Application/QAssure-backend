/**
 * API Key Service - QAssure Platform
 * Manages API keys with secure hashing
 */
const crypto = require('crypto');
const database = require('../config/database');

class ApiKeyService {
  constructor() {
    this.PREFIX = 'qas_'; // API key prefix for identification
  }

  /**
   * Generate a new API key
   */
  generateKey() {
    const key = crypto.randomBytes(32).toString('hex');
    return `${this.PREFIX}${key}`;
  }

  /**
   * Hash API key for storage
   */
  hashKey(key) {
    return crypto.createHash('sha256').update(key).digest('hex');
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
    
    // Insert API key (with module_id)
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
        // Accept either "resource:action" string or {resource, action} object
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
      permissions: permissions,
      warning: 'Save this key securely. It will not be shown again.'
    };
  }

  /**
   * List API keys for a tenant
   */
  async list(tenantId, options = {}) {
    const { page = 1, limit = 20, status = null, module_id = null } = options;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        ak.id, ak.name, ak.description, ak.key_prefix, 
        ak.expires_at, ak.status, ak.last_used_at, ak.usage_count,
        ak.module_id, ak.created_at, ak.updated_at,
        u.email as created_by_email,
        m.module_id as module_code, m.name as module_name
      FROM api_keys ak
      LEFT JOIN users u ON u.id = ak.created_by
      LEFT JOIN modules m ON m.id = ak.module_id
      WHERE ak.tenant_id = $1
    `;
    const params = [tenantId];

    if (status) {
      query += ` AND ak.status = $${params.length + 1}`;
      params.push(status);
    }

    if (module_id) {
      query += ` AND ak.module_id = $${params.length + 1}`;
      params.push(module_id);
    }

    query += ` ORDER BY ak.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await database.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM api_keys WHERE tenant_id = $1`;
    const countParams = [tenantId];
    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }
    const countResult = await database.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count);

    return {
      data: result.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasMore: offset + limit < total
      }
    };
  }

  /**
   * Get API key by ID
   */
  async getById(keyId, tenantId) {
    const query = `
      SELECT 
        ak.id, ak.name, ak.description, ak.key_prefix,
        ak.expires_at, ak.status, ak.last_used_at, ak.usage_count,
        ak.module_id, ak.created_at, ak.updated_at,
        u.email as created_by_email,
        m.module_id as module_code, m.name as module_name
      FROM api_keys ak
      LEFT JOIN users u ON u.id = ak.created_by
      LEFT JOIN modules m ON m.id = ak.module_id
      WHERE ak.id = $1 AND ak.tenant_id = $2
    `;

    const result = await database.query(query, [keyId, tenantId]);

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    const apiKey = result.rows[0];

    // Get permissions
    const permQuery = `
      SELECT resource, action
      FROM api_key_permissions
      WHERE api_key_id = $1
    `;
    const permResult = await database.query(permQuery, [keyId]);
    apiKey.permissions = permResult.rows;

    return apiKey;
  }

  /**
   * Get API key by module ID
   */
  async getByModuleId(moduleId, tenantId) {
    const query = `
      SELECT 
        ak.id, ak.name, ak.description, ak.key_prefix,
        ak.expires_at, ak.status, ak.last_used_at, ak.usage_count,
        ak.module_id, ak.created_at, ak.updated_at
      FROM api_keys ak
      WHERE ak.module_id = $1 AND ak.tenant_id = $2 AND ak.status = 'active'
      ORDER BY ak.created_at DESC
      LIMIT 1
    `;

    const result = await database.query(query, [moduleId, tenantId]);

    if (result.rows.length === 0) {
      return null;
    }

    const apiKey = result.rows[0];

    // Get permissions
    const permQuery = `
      SELECT resource, action
      FROM api_key_permissions
      WHERE api_key_id = $1
    `;
    const permResult = await database.query(permQuery, [apiKey.id]);
    apiKey.permissions = permResult.rows.map(p => `${p.resource}:${p.action}`);

    return apiKey;
  }

  /**
   * Validate API key and return associated data
   */
  async validate(plainKey) {
    if (!plainKey || !plainKey.startsWith(this.PREFIX)) {
      return { valid: false, error: 'Invalid API key format' };
    }

    const keyHash = this.hashKey(plainKey);

    const query = `
      SELECT 
      ak.id, ak.tenant_id, ak.name, ak.status, ak.expires_at,
      ak.created_by as user_id, ak.module_id,
      m.module_id as module_code, m.name as module_name
      FROM api_keys ak
      LEFT JOIN modules m ON m.id = ak.module_id
      WHERE ak.key_hash = $1
    `;

    const result = await database.query(query, [keyHash]);

    if (result.rows.length === 0) {
      return { valid: false, error: 'API key not found' };
    }

    const apiKey = result.rows[0];

    // Check status
    if (apiKey.status !== 'active') {
      return { valid: false, error: 'API key is not active' };
    }

    // Check expiration
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return { valid: false, error: 'API key has expired' };
    }

    // Get permissions
    const permQuery = `
      SELECT resource, action
      FROM api_key_permissions
      WHERE api_key_id = $1
    `;
    const permResult = await database.query(permQuery, [apiKey.id]);
    const permissions = permResult.rows.map(p => `${p.resource}:${p.action}`);

    // Update usage stats
    await database.query(`
      UPDATE api_keys 
      SET last_used_at = NOW(), usage_count = COALESCE(usage_count, 0) + 1
      WHERE id = $1
    `, [apiKey.id]);

    return {
      valid: true,
      apiKey: {
        id: apiKey.id,
        name: apiKey.name,
        tenantId: apiKey.tenant_id,
        userId: apiKey.user_id,
        moduleId: apiKey.module_id,
        moduleCode: apiKey.module_code || null,
        moduleName: apiKey.module_name || null,
        permissions
      }
    };
  }

  /**
   * Update API key
   */
  async update(keyId, tenantId, data) {
    const { name, description, status } = data;

    const updates = [];
    const params = [];
    let paramCount = 0;

    if (name !== undefined) {
      paramCount++;
      updates.push(`name = $${paramCount}`);
      params.push(name);
    }

    if (description !== undefined) {
      paramCount++;
      updates.push(`description = $${paramCount}`);
      params.push(description);
    }

    if (status !== undefined) {
      paramCount++;
      updates.push(`status = $${paramCount}`);
      params.push(status);
    }

    if (updates.length === 0) {
      throw new Error('No fields to update');
    }

    updates.push(`updated_at = NOW()`);

    paramCount++;
    params.push(keyId);
    paramCount++;
    params.push(tenantId);

    const query = `
      UPDATE api_keys 
      SET ${updates.join(', ')}
      WHERE id = $${paramCount - 1} AND tenant_id = $${paramCount}
      RETURNING id, name, description, status, updated_at
    `;

    const result = await database.query(query, params);

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    return result.rows[0];
  }

  /**
   * Revoke (soft delete) API key
   */
  async revoke(keyId, tenantId) {
    const query = `
      UPDATE api_keys 
      SET status = 'revoked', updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING id, name, status
    `;

    const result = await database.query(query, [keyId, tenantId]);

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    return { success: true, message: 'API key revoked successfully' };
  }

  /**
   * Revoke API key by module ID
   */
  async revokeByModuleId(moduleId, tenantId) {
    const query = `
      UPDATE api_keys 
      SET status = 'revoked', updated_at = NOW()
      WHERE module_id = $1 AND tenant_id = $2
      RETURNING id, name, status
    `;

    const result = await database.query(query, [moduleId, tenantId]);

    return { 
      success: true, 
      message: `${result.rows.length} API key(s) revoked for module`,
      count: result.rows.length
    };
  }

  /**
   * Delete API key permanently
   */
  async delete(keyId, tenantId) {
    // Delete permissions first
    await database.query(
      'DELETE FROM api_key_permissions WHERE api_key_id = $1',
      [keyId]
    );

    // Delete API key
    const result = await database.query(
      'DELETE FROM api_keys WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [keyId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('API key not found');
    }

    return { success: true, message: 'API key deleted successfully' };
  }

  /**
   * Regenerate API key (creates new key, keeps same ID and settings)
   */
  async regenerate(keyId, tenantId) {
    // Verify key exists
    const existing = await this.getById(keyId, tenantId);

    // Generate new key
    const plainKey = this.generateKey();
    const keyHash = this.hashKey(plainKey);
    const keyPrefix = plainKey.substring(0, 12);

    // Update
    await database.query(`
      UPDATE api_keys 
      SET key_hash = $1, key_prefix = $2, updated_at = NOW()
      WHERE id = $3 AND tenant_id = $4
    `, [keyHash, keyPrefix, keyId, tenantId]);

    return {
      id: keyId,
      name: existing.name,
      key: plainKey,
      key_prefix: keyPrefix,
      warning: 'Save this key securely. It will not be shown again.'
    };
  }
}

// Singleton
let instance = null;
const getApiKeyService = () => {
  if (!instance) {
    instance = new ApiKeyService();
  }
  return instance;
};

module.exports = { ApiKeyService, getApiKeyService };
