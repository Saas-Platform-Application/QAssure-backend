/**
 * Security Settings Service
 * Tenant-level security configuration management
 * 
 * Features:
 * - Session security settings
 * - IP restrictions (whitelist/blacklist)
 * - Geo restrictions
 * - Audit settings (FDA Part 11 retention)
 * - Electronic signature settings
 * - API security settings
 * - Notification settings
 */

const { pool } = require('../config/database');
const { getRedisClient } = require('../infrastructure/cache/redis.service');

// Compliance modes
const COMPLIANCE_MODES = {
  FDA_PART11: 'fda_part11',
  EU_ANNEX11: 'eu_annex11',
  HIPAA: 'hipaa',
  ISO_13485: 'iso_13485',
  CUSTOM: 'custom'
};

// Default settings per compliance mode
const COMPLIANCE_DEFAULTS = {
  fda_part11: {
    audit_retention_years: 7,
    esig_require_pin: true,
    esig_require_reason: true,
    audit_all_reads: false,
    session_timeout_minutes: 480,
    idle_timeout_minutes: 30
  },
  eu_annex11: {
    audit_retention_years: 10,
    esig_require_pin: true,
    esig_require_reason: true,
    audit_all_reads: true,
    session_timeout_minutes: 480,
    idle_timeout_minutes: 30
  },
  hipaa: {
    audit_retention_years: 6,
    esig_require_pin: true,
    esig_require_reason: true,
    audit_all_reads: true,
    session_timeout_minutes: 240,
    idle_timeout_minutes: 15
  },
  iso_13485: {
    audit_retention_years: 10,
    esig_require_pin: true,
    esig_require_reason: true,
    audit_all_reads: false,
    session_timeout_minutes: 480,
    idle_timeout_minutes: 30
  },
  custom: {}
};

class SecuritySettingsService {
  constructor() {
    this.pool = pool;
    this.cache = new Map();
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes
  }

  /**
   * Get security settings for a tenant
   */
  async getSettings(tenantId) {
    // Check cache
    const cached = this.cache.get(tenantId);
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      return cached.settings;
    }

    const result = await this.pool.query(
      'SELECT * FROM security_settings WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      // Return default settings
      const defaults = this._getDefaultSettings();
      return defaults;
    }

    const settings = this._formatSettings(result.rows[0]);

    // Cache it
    this.cache.set(tenantId, {
      settings,
      timestamp: Date.now()
    });

    return settings;
  }

  /**
   * Update security settings
   */
  async updateSettings(tenantId, updates, updatedBy) {
    const allowedFields = [
      'session_timeout_minutes', 'idle_timeout_minutes', 'force_single_session',
      'ip_whitelist_enabled', 'ip_whitelist', 'ip_blacklist',
      'geo_restriction_enabled', 'allowed_countries',
      'audit_retention_years', 'audit_all_reads', 'audit_sensitive_fields',
      'esig_require_pin', 'esig_pin_length', 'esig_require_reason', 'esig_session_timeout_minutes',
      'api_rate_limit_per_minute', 'api_key_expiry_days',
      'notify_on_failed_login', 'notify_on_password_change', 'notify_on_new_device',
      'notify_on_permission_change', 'security_contact_email',
      'compliance_mode'
    ];

    const setClauses = [];
    const values = [tenantId];
    let paramIndex = 2;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        // Handle array types specially
        if (['ip_whitelist', 'ip_blacklist', 'allowed_countries', 'audit_sensitive_fields'].includes(key)) {
          setClauses.push(`${key} = $${paramIndex++}::text[]`);
        } else {
          setClauses.push(`${key} = $${paramIndex++}`);
        }
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      throw new Error('No valid fields to update');
    }

    setClauses.push(`updated_at = NOW()`);
    setClauses.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy);

    const result = await this.pool.query(
      `UPDATE security_settings
       SET ${setClauses.join(', ')}
       WHERE tenant_id = $1
       RETURNING *`,
      values
    );

    if (result.rows.length === 0) {
      // Insert if doesn't exist
      return this.createSettings(tenantId, updates, updatedBy);
    }

    // Clear cache
    this.cache.delete(tenantId);
    this._clearRedisCache(tenantId);

    return this._formatSettings(result.rows[0]);
  }

  /**
   * Create security settings for a tenant
   */
  async createSettings(tenantId, settings, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO security_settings (
        tenant_id, session_timeout_minutes, idle_timeout_minutes, force_single_session,
        ip_whitelist_enabled, ip_whitelist, ip_blacklist,
        geo_restriction_enabled, allowed_countries,
        audit_retention_years, audit_all_reads, audit_sensitive_fields,
        esig_require_pin, esig_pin_length, esig_require_reason, esig_session_timeout_minutes,
        api_rate_limit_per_minute, api_key_expiry_days,
        notify_on_failed_login, notify_on_password_change, notify_on_new_device,
        notify_on_permission_change, security_contact_email, compliance_mode, updated_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
      ON CONFLICT (tenant_id) DO UPDATE SET updated_at = NOW()
      RETURNING *`,
      [
        tenantId,
        settings.session_timeout_minutes || 480,
        settings.idle_timeout_minutes || 30,
        settings.force_single_session || false,
        settings.ip_whitelist_enabled || false,
        settings.ip_whitelist || null,
        settings.ip_blacklist || null,
        settings.geo_restriction_enabled || false,
        settings.allowed_countries || null,
        settings.audit_retention_years || 7,
        settings.audit_all_reads || false,
        settings.audit_sensitive_fields || null,
        settings.esig_require_pin ?? true,
        settings.esig_pin_length || 4,
        settings.esig_require_reason ?? true,
        settings.esig_session_timeout_minutes || 5,
        settings.api_rate_limit_per_minute || 100,
        settings.api_key_expiry_days || null,
        settings.notify_on_failed_login ?? true,
        settings.notify_on_password_change ?? true,
        settings.notify_on_new_device ?? true,
        settings.notify_on_permission_change ?? true,
        settings.security_contact_email || null,
        settings.compliance_mode || 'fda_part11',
        createdBy
      ]
    );

    return this._formatSettings(result.rows[0]);
  }

  /**
   * Apply compliance mode defaults
   */
  async applyComplianceMode(tenantId, mode, updatedBy) {
    if (!COMPLIANCE_DEFAULTS[mode]) {
      throw new Error(`Invalid compliance mode. Must be one of: ${Object.keys(COMPLIANCE_MODES).join(', ')}`);
    }

    const defaults = COMPLIANCE_DEFAULTS[mode];
    defaults.compliance_mode = mode;

    return this.updateSettings(tenantId, defaults, updatedBy);
  }

  /**
   * Check if IP is allowed
   */
  async checkIpAccess(tenantId, ipAddress) {
    const settings = await this.getSettings(tenantId);

    // If IP restrictions not enabled, allow all
    if (!settings.ip_whitelist_enabled) {
      return { allowed: true };
    }

    // Check blacklist first
    if (settings.ip_blacklist && settings.ip_blacklist.length > 0) {
      if (this._ipMatches(ipAddress, settings.ip_blacklist)) {
        return {
          allowed: false,
          reason: 'IP address is blacklisted'
        };
      }
    }

    // Check whitelist
    if (settings.ip_whitelist && settings.ip_whitelist.length > 0) {
      if (!this._ipMatches(ipAddress, settings.ip_whitelist)) {
        return {
          allowed: false,
          reason: 'IP address is not whitelisted'
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Check if country is allowed
   */
  async checkGeoAccess(tenantId, countryCode) {
    const settings = await this.getSettings(tenantId);

    if (!settings.geo_restriction_enabled) {
      return { allowed: true };
    }

    if (!settings.allowed_countries || settings.allowed_countries.length === 0) {
      return { allowed: true };
    }

    const allowed = settings.allowed_countries.includes(countryCode.toUpperCase());

    return {
      allowed,
      reason: allowed ? null : 'Access from this country is not allowed'
    };
  }

  /**
   * Validate session based on settings
   */
  async validateSession(tenantId, sessionCreatedAt, lastActivityAt) {
    const settings = await this.getSettings(tenantId);
    const now = new Date();

    // Check session timeout (absolute)
    const sessionAge = (now - new Date(sessionCreatedAt)) / (1000 * 60); // minutes
    if (sessionAge > settings.session_timeout_minutes) {
      return {
        valid: false,
        reason: 'Session expired',
        code: 'SESSION_EXPIRED'
      };
    }

    // Check idle timeout
    if (lastActivityAt) {
      const idleTime = (now - new Date(lastActivityAt)) / (1000 * 60); // minutes
      if (idleTime > settings.idle_timeout_minutes) {
        return {
          valid: false,
          reason: 'Session idle timeout',
          code: 'IDLE_TIMEOUT'
        };
      }
    }

    return { valid: true };
  }

  /**
   * Get audit configuration
   */
  async getAuditConfig(tenantId) {
    const settings = await this.getSettings(tenantId);

    return {
      retention_years: settings.audit_retention_years,
      log_reads: settings.audit_all_reads,
      sensitive_fields: settings.audit_sensitive_fields || [],
      compliance_mode: settings.compliance_mode
    };
  }

  /**
   * Get electronic signature configuration
   */
  async getEsigConfig(tenantId) {
    const settings = await this.getSettings(tenantId);

    return {
      require_pin: settings.esig_require_pin,
      pin_length: settings.esig_pin_length,
      require_reason: settings.esig_require_reason,
      session_timeout_minutes: settings.esig_session_timeout_minutes
    };
  }

  /**
   * Get notification configuration
   */
  async getNotificationConfig(tenantId) {
    const settings = await this.getSettings(tenantId);

    return {
      on_failed_login: settings.notify_on_failed_login,
      on_password_change: settings.notify_on_password_change,
      on_new_device: settings.notify_on_new_device,
      on_permission_change: settings.notify_on_permission_change,
      security_contact: settings.security_contact_email
    };
  }

  /**
   * Get compliance summary
   */
  async getComplianceSummary(tenantId) {
    const settings = await this.getSettings(tenantId);
    const issues = [];
    const recommendations = [];

    // Check compliance requirements
    if (settings.compliance_mode === 'fda_part11') {
      // FDA Part 11 checks
      if (!settings.esig_require_pin) {
        issues.push('Electronic signatures should require PIN (§11.200)');
      }
      if (!settings.esig_require_reason) {
        issues.push('Electronic signatures should require meaning/reason (§11.50)');
      }
      if (settings.audit_retention_years < 7) {
        issues.push('Audit retention should be at least 7 years');
      }
      if (settings.session_timeout_minutes > 480) {
        recommendations.push('Consider reducing session timeout to 8 hours or less');
      }
    }

    if (settings.compliance_mode === 'hipaa') {
      if (settings.idle_timeout_minutes > 15) {
        issues.push('HIPAA recommends idle timeout of 15 minutes or less');
      }
      if (!settings.audit_all_reads) {
        recommendations.push('Consider enabling audit logging for read operations');
      }
    }

    // General security recommendations
    if (!settings.ip_whitelist_enabled) {
      recommendations.push('Consider enabling IP whitelist for additional security');
    }
    if (!settings.notify_on_failed_login) {
      recommendations.push('Enable notifications for failed login attempts');
    }

    return {
      compliance_mode: settings.compliance_mode,
      compliant: issues.length === 0,
      issues,
      recommendations,
      settings_summary: {
        session_timeout: `${settings.session_timeout_minutes} minutes`,
        idle_timeout: `${settings.idle_timeout_minutes} minutes`,
        audit_retention: `${settings.audit_retention_years} years`,
        esig_pin_required: settings.esig_require_pin,
        ip_restrictions: settings.ip_whitelist_enabled
      }
    };
  }

  /**
   * Export settings for backup/audit
   */
  async exportSettings(tenantId) {
    const settings = await this.getSettings(tenantId);
    
    return {
      exported_at: new Date().toISOString(),
      tenant_id: tenantId,
      settings,
      compliance_summary: await this.getComplianceSummary(tenantId)
    };
  }

  // Private helper methods

  _getDefaultSettings() {
    return {
      session_timeout_minutes: 480,
      idle_timeout_minutes: 30,
      force_single_session: false,
      ip_whitelist_enabled: false,
      ip_whitelist: [],
      ip_blacklist: [],
      geo_restriction_enabled: false,
      allowed_countries: [],
      audit_retention_years: 7,
      audit_all_reads: false,
      audit_sensitive_fields: [],
      esig_require_pin: true,
      esig_pin_length: 4,
      esig_require_reason: true,
      esig_session_timeout_minutes: 5,
      api_rate_limit_per_minute: 100,
      api_key_expiry_days: null,
      notify_on_failed_login: true,
      notify_on_password_change: true,
      notify_on_new_device: true,
      notify_on_permission_change: true,
      security_contact_email: null,
      compliance_mode: 'fda_part11'
    };
  }

  _formatSettings(row) {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      session: {
        timeout_minutes: row.session_timeout_minutes,
        idle_timeout_minutes: row.idle_timeout_minutes,
        force_single_session: row.force_single_session
      },
      ip_restrictions: {
        enabled: row.ip_whitelist_enabled,
        whitelist: row.ip_whitelist || [],
        blacklist: row.ip_blacklist || []
      },
      geo_restrictions: {
        enabled: row.geo_restriction_enabled,
        allowed_countries: row.allowed_countries || []
      },
      audit: {
        retention_years: row.audit_retention_years,
        log_reads: row.audit_all_reads,
        sensitive_fields: row.audit_sensitive_fields || []
      },
      electronic_signature: {
        require_pin: row.esig_require_pin,
        pin_length: row.esig_pin_length,
        require_reason: row.esig_require_reason,
        session_timeout_minutes: row.esig_session_timeout_minutes
      },
      api: {
        rate_limit_per_minute: row.api_rate_limit_per_minute,
        key_expiry_days: row.api_key_expiry_days
      },
      notifications: {
        on_failed_login: row.notify_on_failed_login,
        on_password_change: row.notify_on_password_change,
        on_new_device: row.notify_on_new_device,
        on_permission_change: row.notify_on_permission_change,
        security_contact: row.security_contact_email
      },
      compliance_mode: row.compliance_mode,
      // Flat properties for backward compatibility
      session_timeout_minutes: row.session_timeout_minutes,
      idle_timeout_minutes: row.idle_timeout_minutes,
      force_single_session: row.force_single_session,
      ip_whitelist_enabled: row.ip_whitelist_enabled,
      ip_whitelist: row.ip_whitelist || [],
      ip_blacklist: row.ip_blacklist || [],
      geo_restriction_enabled: row.geo_restriction_enabled,
      allowed_countries: row.allowed_countries || [],
      audit_retention_years: row.audit_retention_years,
      audit_all_reads: row.audit_all_reads,
      audit_sensitive_fields: row.audit_sensitive_fields || [],
      esig_require_pin: row.esig_require_pin,
      esig_pin_length: row.esig_pin_length,
      esig_require_reason: row.esig_require_reason,
      esig_session_timeout_minutes: row.esig_session_timeout_minutes,
      api_rate_limit_per_minute: row.api_rate_limit_per_minute,
      api_key_expiry_days: row.api_key_expiry_days,
      notify_on_failed_login: row.notify_on_failed_login,
      notify_on_password_change: row.notify_on_password_change,
      notify_on_new_device: row.notify_on_new_device,
      notify_on_permission_change: row.notify_on_permission_change,
      security_contact_email: row.security_contact_email,
      created_at: row.created_at,
      updated_at: row.updated_at
    };
  }

  _ipMatches(ip, list) {
    // Simple IP matching - could be enhanced with CIDR support
    return list.some(entry => {
      if (entry.includes('/')) {
        // CIDR notation - simplified check
        const [network] = entry.split('/');
        return ip.startsWith(network.split('.').slice(0, 3).join('.'));
      }
      return ip === entry;
    });
  }

  async _clearRedisCache(tenantId) {
    try {
      const redis = getRedisClient();
      if (redis) {
        await redis.del(`security_settings:${tenantId}`);
      }
    } catch (e) {
      console.error('[SecuritySettings] Redis cache clear error:', e.message);
    }
  }
}

// Singleton
let instance = null;

const getSecuritySettingsService = () => {
  if (!instance) {
    instance = new SecuritySettingsService();
  }
  return instance;
};

module.exports = {
  SecuritySettingsService,
  getSecuritySettingsService,
  COMPLIANCE_MODES
};
