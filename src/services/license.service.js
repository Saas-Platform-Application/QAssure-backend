/**
 * License Service
 * Manages license lifecycle: creation, activation, validation, enforcement, revocation
 * Based on Architecture Document Section 7
 */

const { pool } = require('../config/database');
const crypto = require('crypto');

class LicenseService {
  constructor() {
    this.pool = pool;
  }

  // =====================================================
  // LICENSE CRUD OPERATIONS (Super Admin)
  // =====================================================

  /**
   * Create a new license for a tenant
   * @param {Object} data - License data
   * @param {UUID} createdBy - User creating the license
   */
  async create(data, createdBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const {
        tenant_id,
        application,
        license_type = 'subscription',
        tier,
        starts_at,
        expires_at,
        limits,
        features,
        auto_renew = false,
        billing_cycle = 'annual',
        base_price,
        notes
      } = data;

      // Validate required fields
      if (!tenant_id) {
        throw new Error('tenant_id is required');
      }
      if (!application) {
        throw new Error('application is required');
      }
      if (!tier) {
        throw new Error('tier is required');
      }

      // Generate license key
      const keyResult = await client.query(
        'SELECT generate_license_key($1, $2, $3) as license_key',
        [application, tier, tenant_id]
      );
      const license_key = keyResult.rows[0]?.license_key;
      
      if (!license_key) {
        throw new Error('Failed to generate license key');
      }

      // Get tier defaults if limits not provided
      let finalLimits = limits;
      let finalFeatures = features;
      if (!limits || !features) {
        const tierResult = await client.query(
          'SELECT max_users, max_projects, max_ai_tokens, max_storage_gb, features FROM license_tiers WHERE code = $1',
          [tier]
        );
        if (tierResult.rows.length > 0) {
          const tierData = tierResult.rows[0];
          finalLimits = limits || {
            max_users: tierData.max_users,
            max_projects: tierData.max_projects,
            max_ai_tokens: tierData.max_ai_tokens,
            max_storage_gb: tierData.max_storage_gb
          };
          finalFeatures = features || tierData.features;
        }
      }

      // Calculate grace_ends_at
      const grace_period_days = 30;
      const grace_ends_at = expires_at 
        ? new Date(new Date(expires_at).getTime() + grace_period_days * 24 * 60 * 60 * 1000)
        : null;

      // Insert license
      const result = await client.query(
        `INSERT INTO licenses (
          tenant_id, license_key, license_type, tier, application,
          status, activation_state, starts_at, expires_at, grace_period_days, grace_ends_at,
          limits, features, auto_renew, billing_cycle, base_price, notes, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *`,
        [
          tenant_id, license_key, license_type, tier, application,
          'pending', 'not_activated', starts_at, expires_at, grace_period_days, grace_ends_at,
          JSON.stringify(finalLimits), JSON.stringify(finalFeatures), 
          auto_renew, billing_cycle, base_price, notes, createdBy
        ]
      );

      const license = result.rows[0];

      // Create audit log entry
      await this._createAuditLog(client, {
        license_id: license.id,
        tenant_id,
        event_type: 'created',
        event_description: `License created for ${application} - ${tier}`,
        new_state: license,
        performed_by: createdBy
      });

      // Initialize usage tracking
      await client.query(
        `INSERT INTO license_usage_current (license_id, tenant_id, period_start, period_resets_at)
         VALUES ($1, $2, DATE_TRUNC('month', NOW()), DATE_TRUNC('month', NOW()) + INTERVAL '1 month')`,
        [license.id, tenant_id]
      );

      await client.query('COMMIT');

      return this._formatLicense(license);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get license by ID
   */
  async getById(id, tenantId = null) {
    let query = `
      SELECT l.*, 
             t.name as tenant_name,
             lt.name as license_type_name,
             ltr.name as tier_name,
             la.name as application_name,
             u.email as created_by_email
      FROM licenses l
      LEFT JOIN tenants t ON l.tenant_id = t.id
      LEFT JOIN license_types lt ON l.license_type = lt.code
      LEFT JOIN license_tiers ltr ON l.tier = ltr.code
      LEFT JOIN licensable_applications la ON l.application = la.code
      LEFT JOIN users u ON l.created_by = u.id
      WHERE l.id = $1
    `;
    const params = [id];

    if (tenantId) {
      query += ' AND l.tenant_id = $2';
      params.push(tenantId);
    }

    const result = await this.pool.query(query, params);
    if (result.rows.length === 0) {
      return null;
    }

    return this._formatLicense(result.rows[0]);
  }

  /**
   * Get license by license key
   */
  async getByKey(licenseKey) {
    const result = await this.pool.query(
      `SELECT l.*, t.name as tenant_name
       FROM licenses l
       LEFT JOIN tenants t ON l.tenant_id = t.id
       WHERE l.license_key = $1`,
      [licenseKey]
    );
    return result.rows.length > 0 ? this._formatLicense(result.rows[0]) : null;
  }

  /**
   * List all licenses (with filtering)
   */
  async list(options = {}) {
    const {
      tenant_id,
      application,
      status,
      tier,
      license_type,
      search,
      page = 1,
      limit = 20,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;

    let query = `
      SELECT l.*, 
             t.name as tenant_name,
             lt.name as license_type_name,
             ltr.name as tier_name,
             la.name as application_name
      FROM licenses l
      LEFT JOIN tenants t ON l.tenant_id = t.id
      LEFT JOIN license_types lt ON l.license_type = lt.code
      LEFT JOIN license_tiers ltr ON l.tier = ltr.code
      LEFT JOIN licensable_applications la ON l.application = la.code
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (tenant_id) {
      query += ` AND l.tenant_id = $${paramIndex++}`;
      params.push(tenant_id);
    }
    if (application) {
      query += ` AND l.application = $${paramIndex++}`;
      params.push(application);
    }
    if (status) {
      query += ` AND l.status = $${paramIndex++}`;
      params.push(status);
    }
    if (tier) {
      query += ` AND l.tier = $${paramIndex++}`;
      params.push(tier);
    }
    if (license_type) {
      query += ` AND l.license_type = $${paramIndex++}`;
      params.push(license_type);
    }
    if (search) {
      query += ` AND (l.license_key ILIKE $${paramIndex} OR t.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Count total
    const countResult = await this.pool.query(
      query.replace(/SELECT .* FROM/, 'SELECT COUNT(*) FROM'),
      params
    );
    const total = parseInt(countResult.rows[0].count);

    // Add sorting and pagination
    const validSortColumns = ['created_at', 'expires_at', 'status', 'tier', 'application'];
    const sortColumn = validSortColumns.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    query += ` ORDER BY l.${sortColumn} ${sortDir}`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, (page - 1) * limit);

    const result = await this.pool.query(query, params);

    return {
      licenses: result.rows.map(row => this._formatLicense(row)),
      pagination: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Get licenses for a specific tenant
   */
  async getByTenant(tenantId) {
    const result = await this.pool.query(
      `SELECT l.*, 
              la.name as application_name,
              ltr.name as tier_name
       FROM licenses l
       LEFT JOIN licensable_applications la ON l.application = la.code
       LEFT JOIN license_tiers ltr ON l.tier = ltr.code
       WHERE l.tenant_id = $1
       ORDER BY l.application, l.created_at DESC`,
      [tenantId]
    );
    return result.rows.map(row => this._formatLicense(row));
  }

  /**
   * Update license
   */
  async update(id, data, updatedBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Get current state
      const current = await client.query('SELECT * FROM licenses WHERE id = $1', [id]);
      if (current.rows.length === 0) {
        throw new Error('License not found');
      }
      const previousState = current.rows[0];

      const {
        tier,
        expires_at,
        limits,
        features,
        auto_renew,
        notes,
        status
      } = data;

      const updates = [];
      const params = [id];
      let paramIndex = 2;

      if (tier !== undefined) {
        updates.push(`tier = $${paramIndex++}`);
        params.push(tier);
      }
      if (expires_at !== undefined) {
        updates.push(`expires_at = $${paramIndex++}`);
        params.push(expires_at);
        // Recalculate grace period
        if (expires_at) {
          updates.push(`grace_ends_at = $${paramIndex++}`);
          params.push(new Date(new Date(expires_at).getTime() + 30 * 24 * 60 * 60 * 1000));
        }
      }
      if (limits !== undefined) {
        updates.push(`limits = $${paramIndex++}`);
        params.push(JSON.stringify(limits));
      }
      if (features !== undefined) {
        updates.push(`features = $${paramIndex++}`);
        params.push(JSON.stringify(features));
      }
      if (auto_renew !== undefined) {
        updates.push(`auto_renew = $${paramIndex++}`);
        params.push(auto_renew);
      }
      if (notes !== undefined) {
        updates.push(`notes = $${paramIndex++}`);
        params.push(notes);
      }
      if (status !== undefined) {
        updates.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      updates.push(`updated_by = $${paramIndex++}`);
      params.push(updatedBy);
      updates.push(`updated_at = NOW()`);

      const result = await client.query(
        `UPDATE licenses SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
        params
      );

      const updatedLicense = result.rows[0];

      // Audit log
      await this._createAuditLog(client, {
        license_id: id,
        tenant_id: updatedLicense.tenant_id,
        event_type: 'updated',
        event_description: 'License updated',
        previous_state: previousState,
        new_state: updatedLicense,
        performed_by: updatedBy
      });

      await client.query('COMMIT');
      return this._formatLicense(updatedLicense);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =====================================================
  // LICENSE ACTIVATION
  // =====================================================

  /**
   * Activate a license using license key
   */
  async activate(licenseKey, tenantId, activatedBy, activationData = {}) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Find license by key
      const licenseResult = await client.query(
        'SELECT * FROM licenses WHERE license_key = $1',
        [licenseKey]
      );

      if (licenseResult.rows.length === 0) {
        throw new Error('Invalid license key');
      }

      const license = licenseResult.rows[0];

      // Verify tenant matches
      if (license.tenant_id !== tenantId) {
        throw new Error('License key does not belong to this tenant');
      }

      // Check if already activated
      if (license.activation_state === 'activated') {
        throw new Error('License is already activated');
      }

      // Check if revoked
      if (license.status === 'revoked') {
        throw new Error('License has been revoked');
      }

      // Determine start date
      const startsAt = license.starts_at || new Date();

      // Update license
      const result = await client.query(
        `UPDATE licenses 
         SET status = 'active', 
             activation_state = 'activated', 
             activated_at = NOW(),
             starts_at = $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [license.id, startsAt]
      );

      const activatedLicense = result.rows[0];

      // Record activation
      await client.query(
        `INSERT INTO license_activations (
          license_id, tenant_id, activation_method, activation_status,
          instance_id, device_fingerprint, ip_address, user_agent, performed_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          license.id, tenantId, activationData.method || 'manual', 'success',
          activationData.instance_id, activationData.device_fingerprint,
          activationData.ip_address, activationData.user_agent, activatedBy
        ]
      );

      // Audit log
      await this._createAuditLog(client, {
        license_id: license.id,
        tenant_id: tenantId,
        event_type: 'activated',
        event_description: 'License activated',
        previous_state: license,
        new_state: activatedLicense,
        performed_by: activatedBy,
        ip_address: activationData.ip_address
      });

      await client.query('COMMIT');
      return this._formatLicense(activatedLicense);
    } catch (error) {
      await client.query('ROLLBACK');
      
      // Log failed activation if we have license info
      if (error.message !== 'Invalid license key') {
        try {
          await this.pool.query(
            `INSERT INTO license_activations (
              license_id, tenant_id, activation_method, activation_status,
              error_code, error_message, performed_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [null, tenantId, 'manual', 'failed', 'ACTIVATION_ERROR', error.message, activatedBy]
          );
        } catch (logError) {
          console.error('Failed to log activation error:', logError);
        }
      }
      
      throw error;
    } finally {
      client.release();
    }
  }

  // =====================================================
  // LICENSE REVOCATION
  // =====================================================

  /**
   * Revoke a license
   */
  async revoke(id, reason, revokedBy) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const current = await client.query('SELECT * FROM licenses WHERE id = $1', [id]);
      if (current.rows.length === 0) {
        throw new Error('License not found');
      }
      const previousState = current.rows[0];

      const result = await client.query(
        `UPDATE licenses 
         SET status = 'revoked', 
             revoked_by = $2,
             revoked_at = NOW(),
             revocation_reason = $3,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id, revokedBy, reason]
      );

      const revokedLicense = result.rows[0];

      // Audit log
      await this._createAuditLog(client, {
        license_id: id,
        tenant_id: revokedLicense.tenant_id,
        event_type: 'revoked',
        event_description: `License revoked: ${reason}`,
        previous_state: previousState,
        new_state: revokedLicense,
        performed_by: revokedBy
      });

      await client.query('COMMIT');
      return this._formatLicense(revokedLicense);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // =====================================================
  // LICENSE VALIDATION & ENFORCEMENT
  // =====================================================

  /**
   * Validate if a license is currently valid
   */
  async validate(licenseId) {
    const result = await this.pool.query(
      'SELECT is_license_valid($1) as is_valid',
      [licenseId]
    );
    return result.rows[0].is_valid;
  }

  /**
   * Get enforcement level for a license
   */
  async getEnforcementLevel(licenseId) {
    const result = await this.pool.query(
      'SELECT get_license_enforcement_level($1) as level',
      [licenseId]
    );
    return result.rows[0].level;
  }

  /**
   * Check if a feature is allowed for a license
   */
  async checkFeature(licenseId, featureCode) {
    const license = await this.getById(licenseId);
    if (!license) {
      return { allowed: false, reason: 'License not found' };
    }

    const enforcementLevel = await this.getEnforcementLevel(licenseId);
    
    // Define feature availability by enforcement level
    const featureMatrix = {
      active: ['all'],
      warning: ['all'],
      grace: ['view', 'export', 'dashboard', 'limited_create'],
      suspended: ['view', 'export', 'dashboard'],
      revoked: [],
      pending: []
    };

    const allowedFeatures = featureMatrix[enforcementLevel] || [];
    
    if (allowedFeatures.includes('all')) {
      // Handle features - can be array or object
      let features = [];
      let featuresObj = {};
      
      if (Array.isArray(license.features)) {
        features = license.features;
      } else if (typeof license.features === 'string') {
        try {
          const parsed = JSON.parse(license.features);
          if (Array.isArray(parsed)) {
            features = parsed;
          } else if (typeof parsed === 'object' && parsed !== null) {
            featuresObj = parsed;
          }
        } catch (e) {
          console.error('[License] Failed to parse features:', e);
        }
      } else if (typeof license.features === 'object' && license.features !== null) {
        // Already an object (from JSONB)
        featuresObj = license.features;
      }
      
      // Check if feature is in license features
      // Support both array format ["core", "advanced"] and object format {"ai_enabled": true}
      const hasFeature = 
        (Array.isArray(features) && (features.includes(featureCode) || features.includes('all'))) ||
        (Object.keys(featuresObj).length > 0 && (featuresObj[featureCode] === true || featuresObj['all'] === true)) ||
        featureCode === 'core';
        
      return { 
        allowed: hasFeature, 
        reason: hasFeature ? null : 'Feature not included in license',
        enforcement_level: enforcementLevel
      };
    }

    const allowed = allowedFeatures.includes(featureCode);
    return {
      allowed,
      reason: allowed ? null : `Feature blocked - License is ${enforcementLevel}`,
      enforcement_level: enforcementLevel
    };
  }

  /**
   * Check usage limits
   */
  async checkLimits(licenseId) {
    const license = await this.getById(licenseId);
    if (!license) {
      throw new Error('License not found');
    }

    const usageResult = await this.pool.query(
      'SELECT * FROM license_usage_current WHERE license_id = $1',
      [licenseId]
    );

    const usage = usageResult.rows[0] || {
      current_users: 0,
      current_projects: 0,
      current_ai_tokens_used: 0,
      current_storage_gb: 0
    };

    const limits = license.limits;
    
    return {
      users: {
        current: usage.current_users,
        limit: limits.max_users,
        percent: limits.max_users > 0 ? (usage.current_users / limits.max_users) * 100 : 0,
        exceeded: limits.max_users > 0 && usage.current_users >= limits.max_users
      },
      projects: {
        current: usage.current_projects,
        limit: limits.max_projects,
        percent: limits.max_projects > 0 ? (usage.current_projects / limits.max_projects) * 100 : 0,
        exceeded: limits.max_projects > 0 && usage.current_projects >= limits.max_projects
      },
      ai_tokens: {
        current: usage.current_ai_tokens_used,
        limit: limits.max_ai_tokens,
        percent: limits.max_ai_tokens > 0 ? (usage.current_ai_tokens_used / limits.max_ai_tokens) * 100 : 0,
        exceeded: limits.max_ai_tokens > 0 && usage.current_ai_tokens_used >= limits.max_ai_tokens
      },
      storage_gb: {
        current: parseFloat(usage.current_storage_gb) || 0,
        limit: limits.max_storage_gb,
        percent: limits.max_storage_gb > 0 ? (usage.current_storage_gb / limits.max_storage_gb) * 100 : 0,
        exceeded: limits.max_storage_gb > 0 && usage.current_storage_gb >= limits.max_storage_gb
      }
    };
  }

  // =====================================================
  // USAGE TRACKING
  // =====================================================

  /**
   * Increment usage counter
   */
  async incrementUsage(licenseId, metric, amount = 1) {
    const validMetrics = ['current_users', 'current_projects', 'current_ai_tokens_used', 'current_storage_gb', 'current_api_calls'];
    if (!validMetrics.includes(metric)) {
      throw new Error(`Invalid metric: ${metric}`);
    }

    await this.pool.query(
      `UPDATE license_usage_current 
       SET ${metric} = ${metric} + $2, updated_at = NOW()
       WHERE license_id = $1`,
      [licenseId, amount]
    );
  }

  /**
   * Decrement usage counter
   */
  async decrementUsage(licenseId, metric, amount = 1) {
    const validMetrics = ['current_users', 'current_projects', 'current_storage_gb'];
    if (!validMetrics.includes(metric)) {
      throw new Error(`Invalid metric: ${metric}`);
    }

    await this.pool.query(
      `UPDATE license_usage_current 
       SET ${metric} = GREATEST(0, ${metric} - $2), updated_at = NOW()
       WHERE license_id = $1`,
      [licenseId, amount]
    );
  }

  /**
   * Get current usage for a license
   */
  async getUsage(licenseId) {
    const result = await this.pool.query(
      'SELECT * FROM license_usage_current WHERE license_id = $1',
      [licenseId]
    );
    return result.rows[0] || null;
  }

  // =====================================================
  // REFERENCE DATA
  // =====================================================

  /**
   * Get all license types
   */
  async getLicenseTypes() {
    const result = await this.pool.query(
      'SELECT * FROM license_types WHERE is_active = true ORDER BY code'
    );
    return result.rows;
  }

  /**
   * Get all license tiers
   */
  async getLicenseTiers() {
    const result = await this.pool.query(
      'SELECT * FROM license_tiers WHERE is_active = true ORDER BY sort_order'
    );
    return result.rows;
  }

  /**
   * Get all licensable applications
   */
  async getApplications() {
    const result = await this.pool.query(
      'SELECT * FROM licensable_applications WHERE is_active = true ORDER BY sort_order'
    );
    return result.rows;
  }

  // =====================================================
  // AUDIT LOG
  // =====================================================

  /**
   * Get audit log for a license
   */
  async getAuditLog(licenseId, options = {}) {
    const { page = 1, limit = 50 } = options;
    
    const result = await this.pool.query(
      `SELECT * FROM license_audit_log 
       WHERE license_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2 OFFSET $3`,
      [licenseId, limit, (page - 1) * limit]
    );
    
    return result.rows;
  }

  // =====================================================
  // PRIVATE HELPERS
  // =====================================================

  async _createAuditLog(client, data) {
    const {
      license_id,
      tenant_id,
      event_type,
      event_description,
      previous_state,
      new_state,
      performed_by,
      ip_address
    } = data;

    // Get previous hash for chain
    const lastLog = await client.query(
      'SELECT event_hash FROM license_audit_log WHERE license_id = $1 ORDER BY created_at DESC LIMIT 1',
      [license_id]
    );
    const previous_hash = lastLog.rows[0]?.event_hash || null;

  // Create event hash using SHA-256 for cryptographic integrity
  const hashInput = JSON.stringify({ license_id, event_type, timestamp: new Date().toISOString(), previous_hash: lastLog.rows[0]?.event_hash || null });
  const event_hash = crypto.createHash('sha256').update(hashInput).digest('hex');

    // Get performer email
    let performerEmail = null;
    if (performed_by) {
      const userResult = await client.query('SELECT email FROM users WHERE id = $1', [performed_by]);
      performerEmail = userResult.rows[0]?.email;
    }

    await client.query(
      `INSERT INTO license_audit_log (
        license_id, tenant_id, event_type, event_description,
        previous_state, new_state, previous_hash, event_hash,
        ip_address, performed_by, performed_by_email
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        license_id, tenant_id, event_type, event_description,
        JSON.stringify(previous_state), JSON.stringify(new_state),
        previous_hash, event_hash, ip_address, performed_by, performerEmail
      ]
    );
  }

  _formatLicense(row) {
    if (!row) return null;
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      tenant_name: row.tenant_name,
      license_key: row.license_key,
      license_type: row.license_type,
      license_type_name: row.license_type_name,
      tier: row.tier,
      tier_name: row.tier_name,
      application: row.application,
      application_name: row.application_name,
      status: row.status,
      activation_state: row.activation_state,
      issued_at: row.issued_at,
      activated_at: row.activated_at,
      starts_at: row.starts_at,
      expires_at: row.expires_at,
      grace_period_days: row.grace_period_days,
      grace_ends_at: row.grace_ends_at,
      limits: typeof row.limits === 'string' 
        ? (() => { try { return JSON.parse(row.limits); } catch { return {}; } })()
        : (row.limits || {}),
      features: (() => {
        // Features can be stored as array or object in JSONB
        if (Array.isArray(row.features)) return row.features;
        if (typeof row.features === 'string') {
          try {
            return JSON.parse(row.features);
          } catch {
            return row.features || {};
          }
        }
        // Return as-is if already an object (from JSONB)
        return row.features || {};
      })(),
      auto_renew: row.auto_renew,
      billing_cycle: row.billing_cycle,
      base_price: row.base_price,
      currency: row.currency,
      notes: row.notes,
      created_by: row.created_by,
      created_by_email: row.created_by_email,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }
}

// Singleton instance
let licenseServiceInstance = null;

function getLicenseService() {
  if (!licenseServiceInstance) {
    licenseServiceInstance = new LicenseService();
  }
  return licenseServiceInstance;
}

module.exports = { LicenseService, getLicenseService };
