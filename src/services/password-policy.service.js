/**
 * Password Policy Service
 * FDA 21 CFR Part 11 §11.300 - Controls for identification codes/passwords
 * 
 * Features:
 * - Password complexity validation
 * - Password history (prevent reuse)
 * - Password expiry management
 * - Account lockout
 */

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');

// Common passwords to block (top 100 most common)
const COMMON_PASSWORDS = [
  'password', 'password123', '123456', '12345678', 'qwerty', 'abc123',
  'monkey', 'master', 'dragon', 'letmein', 'login', 'welcome',
  'admin', 'passw0rd', 'password1', 'p@ssword', 'p@ssw0rd'
];

class PasswordPolicyService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Get password policy for a tenant
   */
  async getPolicy(tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM password_policies WHERE tenant_id = $1',
      [tenantId]
    );

    if (result.rows.length === 0) {
      // Return default policy
      return this._getDefaultPolicy(tenantId);
    }

    return this._formatPolicy(result.rows[0]);
  }

  /**
   * Update password policy for a tenant
   */
  async updatePolicy(tenantId, updates, updatedBy) {
    const allowedFields = [
      'min_length', 'max_length', 'require_uppercase', 'require_lowercase',
      'require_numbers', 'require_special_chars', 'special_chars_allowed',
      'password_history_count', 'password_expiry_days', 'password_expiry_warning_days',
      'max_failed_attempts', 'lockout_duration_minutes', 'session_timeout_minutes',
      'concurrent_sessions_allowed', 'mfa_required', 'mfa_required_for_roles',
      'prevent_username_in_password', 'prevent_common_passwords'
    ];

    // Filter to only allowed fields
    const filteredUpdates = {};
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        filteredUpdates[field] = updates[field];
      }
    }

    if (Object.keys(filteredUpdates).length === 0) {
      throw new Error('No valid fields to update');
    }

    // Build dynamic update query
    const setClauses = [];
    const values = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(filteredUpdates)) {
      setClauses.push(`${key} = $${paramIndex++}`);
      values.push(value);
    }

    setClauses.push(`updated_at = NOW()`);
    setClauses.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy);

    values.push(tenantId);

    const query = `
      INSERT INTO password_policies (tenant_id, ${Object.keys(filteredUpdates).join(', ')}, updated_by, created_at, updated_at)
      VALUES ($${paramIndex}, ${Object.keys(filteredUpdates).map((_, i) => `$${i + 1}`).join(', ')}, $${paramIndex - 1}, NOW(), NOW())
      ON CONFLICT (tenant_id) DO UPDATE SET ${setClauses.join(', ')}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return this._formatPolicy(result.rows[0]);
  }

  /**
   * Validate a password against the policy
   */
  async validatePassword(tenantId, userId, password, email = null) {
    const policy = await this.getPolicy(tenantId);
    const errors = [];

    // 1. Length check
    if (password.length < policy.complexity?.min_length) {
      errors.push(`Password must be at least ${policy.complexity?.min_length} characters`);
    }
    if (password.length > policy.complexity?.max_length) {
      errors.push(`Password must not exceed ${policy.complexity?.max_length} characters`);
    }

    // 2. Uppercase check
    if (policy.complexity?.require_uppercase && !/[A-Z]/.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    // 3. Lowercase check
    if (policy.complexity?.require_lowercase && !/[a-z]/.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    // 4. Numbers check
    if (policy.complexity?.require_numbers && !/[0-9]/.test(password)) {
      errors.push('Password must contain at least one number');
    }

    // 5. Special characters check
    if (policy.complexity?.require_special_chars) {
      const specialRegex = new RegExp(`[${this._escapeRegex(policy.complexity?.special_chars_allowed)}]`);
      if (!specialRegex.test(password)) {
        errors.push('Password must contain at least one special character');
      }
    }

    // 6. Username in password check
    if (policy.restrictions?.prevent_username_in_password && email) {
      const username = email.split('@')[0].toLowerCase();
      if (password.toLowerCase().includes(username)) {
        errors.push('Password cannot contain your username');
      }
    }

    // 7. Common password check
    if (policy.restrictions?.prevent_common_passwords) {
      if (COMMON_PASSWORDS.includes(password.toLowerCase())) {
        errors.push('Password is too common. Please choose a more unique password');
      }
    }

    // 8. Password history check (if userId provided)
    if (userId) {
      // Always check against current password first
      const currentRes = await this.pool.query('SELECT password_hash FROM users WHERE id = $1', [userId]);
      if (currentRes.rows.length > 0) {
        const matchesCurrent = await bcrypt.compare(password, currentRes.rows[0].password_hash);
        if (matchesCurrent) {
          errors.push('New password cannot be the same as your current password');
        }
      }

      // Then check history
      if (policy.history?.password_history_count > 0) {
        const isReused = await this._checkPasswordHistory(userId, password, policy.history?.password_history_count);
        if (isReused) {
          errors.push(`Cannot reuse any of your last ${policy.history?.password_history_count} passwords`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      policy_summary: {
        min_length: policy.complexity?.min_length,
        require_uppercase: policy.complexity?.require_uppercase,
        require_lowercase: policy.complexity?.require_lowercase,
        require_numbers: policy.complexity?.require_numbers,
        require_special_chars: policy.complexity?.require_special_chars,
        password_history_count: policy.history?.password_history_count,
        special_chars_allowed: policy.complexity?.special_chars_allowed
      }
    };
  }

  /**
   * Add password to history after successful change
   */
  async addToHistory(userId, tenantId, passwordHash, changeReason = 'user_initiated', changedFromIp = null) {
    // First, mark the current password as changed
    await this.pool.query(
      `UPDATE password_history SET changed_at = NOW() 
       WHERE user_id = $1 AND changed_at IS NULL`,
      [userId]
    );

    // Insert new password hash
    await this.pool.query(
      `INSERT INTO password_history (user_id, tenant_id, password_hash, change_reason, changed_from_ip)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, tenantId, passwordHash, changeReason, changedFromIp]
    );

    // Cleanup old history (keep only what policy requires + buffer)
    const policy = await this.getPolicy(tenantId);
    const keepCount = (policy.history?.password_history_count || 12) + 5; // Keep a few extra for safety

    await this.pool.query(
      `DELETE FROM password_history 
       WHERE user_id = $1 
       AND id NOT IN (
         SELECT id FROM password_history 
         WHERE user_id = $1 
         ORDER BY created_at DESC 
         LIMIT $2
       )`,
      [userId, keepCount]
    );
  }

  /**
   * Check if password is expired
   */
  async checkPasswordExpiry(userId, tenantId) {
    const policy = await this.getPolicy(tenantId);

    if (!policy.expiry?.password_expiry_days || policy.expiry?.password_expiry_days === 0) {
      return { expired: false, warning: false };
    }

    const result = await this.pool.query(
      'SELECT password_changed_at, password_expires_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { expired: false, warning: false };
    }

    const user = result.rows[0];
    const now = new Date();

    // If password_expires_at is set, use it
    if (user.password_expires_at) {
      const expiresAt = new Date(user.password_expires_at);
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

      return {
        expired: now > expiresAt,
        warning: daysUntilExpiry <= policy.expiry?.password_expiry_warning_days && daysUntilExpiry > 0,
        days_until_expiry: daysUntilExpiry,
        expires_at: expiresAt
      };
    }

    // Calculate from password_changed_at
    if (user.password_changed_at) {
      const changedAt = new Date(user.password_changed_at);
      const expiresAt = new Date(changedAt.getTime() + (policy.expiry?.password_expiry_days * 24 * 60 * 60 * 1000));
      const daysUntilExpiry = Math.ceil((expiresAt - now) / (1000 * 60 * 60 * 24));

      return {
        expired: now > expiresAt,
        warning: daysUntilExpiry <= policy.expiry?.password_expiry_warning_days && daysUntilExpiry > 0,
        days_until_expiry: daysUntilExpiry,
        expires_at: expiresAt
      };
    }

    // No password change recorded, consider it expired to force reset
    return { expired: true, warning: false, reason: 'No password change date recorded' };
  }

  /**
   * Set password expiry date for a user
   */
  async setPasswordExpiry(userId, tenantId) {
    const policy = await this.getPolicy(tenantId);

    if (!policy.expiry?.password_expiry_days || policy.expiry?.password_expiry_days === 0) {
      // No expiry policy, clear expiry date
      await this.pool.query(
        'UPDATE users SET password_expires_at = NULL WHERE id = $1',
        [userId]
      );
      return null;
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + policy.expiry?.password_expiry_days);

    await this.pool.query(
      `UPDATE users SET 
         password_changed_at = NOW(),
         password_expires_at = $1
       WHERE id = $2`,
      [expiresAt, userId]
    );

    return expiresAt;
  }

  /**
   * Handle failed login attempt
   */
  async recordFailedLogin(userId, tenantId, ipAddress = null) {
    const policy = await this.getPolicy(tenantId);

    const result = await this.pool.query(
      `UPDATE users 
       SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
       WHERE id = $1
       RETURNING failed_login_attempts`,
      [userId]
    );

    const attempts = result.rows[0]?.failed_login_attempts || 0;

    if (attempts >= policy.lockout?.max_failed_attempts) {
      const lockUntil = new Date();
      lockUntil.setMinutes(lockUntil.getMinutes() + policy.lockout?.lockout_duration_minutes);

      await this.pool.query(
        'UPDATE users SET locked_until = $1 WHERE id = $2',
        [lockUntil, userId]
      );

      return {
        locked: true,
        attempts,
        locked_until: lockUntil,
        lockout_duration_minutes: policy.lockout?.lockout_duration_minutes
      };
    }

    return {
      locked: false,
      attempts,
      remaining_attempts: policy.lockout?.max_failed_attempts - attempts
    };
  }

  /**
   * Reset failed login attempts (after successful login)
   */
  async resetFailedLogins(userId) {
    await this.pool.query(
      'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
      [userId]
    );
  }

  /**
   * Check if user account is locked
   */
  async isLocked(userId) {
    const result = await this.pool.query(
      'SELECT locked_until FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return { locked: false };
    }

    const lockedUntil = result.rows[0].locked_until;
    if (!lockedUntil) {
      return { locked: false };
    }

    const now = new Date();
    const lockTime = new Date(lockedUntil);

    if (now > lockTime) {
      // Lock expired, clear it
      await this.pool.query(
        'UPDATE users SET locked_until = NULL, failed_login_attempts = 0 WHERE id = $1',
        [userId]
      );
      return { locked: false };
    }

    return {
      locked: true,
      locked_until: lockTime,
      minutes_remaining: Math.ceil((lockTime - now) / (1000 * 60))
    };
  }

  /**
   * Generate password policy requirements message
   */
  async getPolicyRequirements(tenantId) {
    const policy = await this.getPolicy(tenantId);
    const requirements = [];

    requirements.push(`At least ${policy.complexity?.min_length} characters`);

    if (policy.complexity?.require_uppercase) {
      requirements.push('At least one uppercase letter (A-Z)');
    }
    if (policy.complexity?.require_lowercase) {
      requirements.push('At least one lowercase letter (a-z)');
    }
    if (policy.complexity?.require_numbers) {
      requirements.push('At least one number (0-9)');
    }
    if (policy.complexity?.require_special_chars) {
      requirements.push(`At least one special character (${policy.special_chars_allowed})`);
    }
    if (policy.restrictions?.prevent_username_in_password) {
      requirements.push('Cannot contain your username');
    }
    if (policy.history?.password_history_count > 0) {
      requirements.push(`Cannot reuse your last ${policy.history.password_history_count} passwords`);
    }

    return {
      requirements,
      expiry_days: policy.expiry?.password_expiry_days,
      mfa_required: policy.mfa?.mfa_required
    };
  }

  /**
   * Generate a random password that complies with the tenant's policy
   */
  async generateCompliantPassword(tenantId) {
    const policy = await this.getPolicy(tenantId);
    const { min_length = 12, require_uppercase, require_lowercase, require_numbers, require_special_chars, special_chars_allowed } = policy.complexity;

    const charset = {
      upper: 'ABCDEFGHJKLMNPQRSTUVWXYZ', // Removed confusing chars like I, O
      lower: 'abcdefghijkmnopqrstuvwxyz', // Removed confusing chars like l
      number: '23456789', // Removed confusing chars like 0, 1
      special: special_chars_allowed || '!@#$%^&*()_+-=[]{}|;:,.<>?'
    };

    const requiredChars = [];

    // Ensure at least one of each required type
    if (require_uppercase) requiredChars.push(this._getRandom(charset.upper));
    if (require_lowercase) requiredChars.push(this._getRandom(charset.lower));
    if (require_numbers) requiredChars.push(this._getRandom(charset.number));
    if (require_special_chars) requiredChars.push(this._getRandom(charset.special));

    // Fill the rest with a mix of everything
    const allChars = charset.upper + charset.lower + charset.number + charset.special;
    while (requiredChars.length < min_length) {
      requiredChars.push(this._getRandom(allChars));
    }

    // Shuffle the array to avoid predictable patterns
    return requiredChars.sort(() => Math.random() - 0.5).join('');
  }

  _getRandom(str) {
    return str.charAt(Math.floor(Math.random() * str.length));
  }

  // Private methods

  async _checkPasswordHistory(userId, newPassword, historyCount) {
    const result = await this.pool.query(
      `SELECT password_hash FROM password_history 
       WHERE user_id = $1 
       ORDER BY created_at DESC 
       LIMIT $2`,
      [userId, historyCount]
    );

    for (const row of result.rows) {
      const matches = await bcrypt.compare(newPassword, row.password_hash);
      if (matches) {
        return true; // Password was used before
      }
    }

    return false;
  }

  _escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  _getDefaultPolicy(tenantId) {
    return {
      id: null,
      tenant_id: tenantId,
      complexity: {
        min_length: 12,
        max_length: 128,
        require_uppercase: true,
        require_lowercase: true,
        require_numbers: true,
        require_special_chars: true,
        special_chars_allowed: '!@#$%^&*()_+-=[]{}|;:,.<>?'
      },
      history: {
        password_history_count: 12
      },
      expiry: {
        password_expiry_days: 90,
        password_expiry_warning_days: 14
      },
      lockout: {
        max_failed_attempts: 5,
        lockout_duration_minutes: 30
      },
      session: {
        session_timeout_minutes: 480,
        concurrent_sessions_allowed: 3
      },
      mfa: {
        mfa_required: false,
        mfa_required_for_roles: []
      },
      restrictions: {
        prevent_username_in_password: true,
        prevent_common_passwords: true
      }
    };
  }

  _formatPolicy(row) {
    return {
      id: row.id,
      tenant_id: row.tenant_id,
      complexity: {
        min_length: row.min_length,
        max_length: row.max_length,
        require_uppercase: row.require_uppercase,
        require_lowercase: row.require_lowercase,
        require_numbers: row.require_numbers,
        require_special_chars: row.require_special_chars,
        special_chars_allowed: row.special_chars_allowed
      },
      history: {
        password_history_count: row.password_history_count
      },
      expiry: {
        password_expiry_days: row.password_expiry_days,
        password_expiry_warning_days: row.password_expiry_warning_days
      },
      lockout: {
        max_failed_attempts: row.max_failed_attempts,
        lockout_duration_minutes: row.lockout_duration_minutes
      },
      session: {
        session_timeout_minutes: row.session_timeout_minutes,
        concurrent_sessions_allowed: row.concurrent_sessions_allowed
      },
      mfa: {
        mfa_required: row.mfa_required,
        mfa_required_for_roles: row.mfa_required_for_roles || []
      },
      restrictions: {
        prevent_username_in_password: row.prevent_username_in_password,
        prevent_common_passwords: row.prevent_common_passwords
      },
      updated_at: row.updated_at
    };
  }
}

// Singleton
let instance = null;

const getPasswordPolicyService = () => {
  if (!instance) {
    instance = new PasswordPolicyService();
  }
  return instance;
};

module.exports = {
  PasswordPolicyService,
  getPasswordPolicyService
};
