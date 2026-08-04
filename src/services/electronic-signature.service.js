/**
 * Electronic Signature Service
 * FDA 21 CFR Part 11 Compliant Electronic Signatures
 * 
 * §11.50 - Signature manifestations (meaning)
 * §11.70 - Signature/record linking
 * §11.100 - General requirements (unique to individual)
 * §11.200 - Electronic signature components
 */

const { pool } = require('../config/database');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { getEventService } = require('../infrastructure/kafka');

// Signature actions allowed
const SIGNATURE_ACTIONS = {
  APPROVE: 'APPROVE',
  REJECT: 'REJECT',
  REVIEW: 'REVIEW',
  AUTHOR: 'AUTHOR',
  VERIFY: 'VERIFY',
  RELEASE: 'RELEASE',
  ACKNOWLEDGE: 'ACKNOWLEDGE',
  WITHDRAW: 'WITHDRAW'
};

// Default meanings for each action
const DEFAULT_MEANINGS = {
  APPROVE: 'I have reviewed and approve this record',
  REJECT: 'I have reviewed and reject this record',
  REVIEW: 'I have reviewed this record',
  AUTHOR: 'I am the author of this record',
  VERIFY: 'I verify the accuracy of this record',
  RELEASE: 'I authorize the release of this record',
  ACKNOWLEDGE: 'I acknowledge receipt and understanding of this record',
  WITHDRAW: 'I withdraw my previous signature on this record'
};

class ElectronicSignatureService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Sign a resource with electronic signature
   * FDA Part 11 compliant signature capture
   */
  async sign({
    userId,
    tenantId,
    resourceType,
    resourceId,
    resourceName,
    action,
    meaning,
    password,
    pin,
    authMethod = 'password_pin',
    signatureOrder,
    requiredSignatures,
    workflowId,
    ipAddress,
    userAgent,
    deviceInfo
  }) {
    const client = await this.pool.connect();
      console.log("[DEBUG setPin] Got DB client");
    
    try {
      await client.query('BEGIN');

      // 1. Verify user exists and is active
      const userResult = await client.query(
        `SELECT id, email, first_name, last_name, password_hash, signature_pin_hash, status, locked_until
         FROM users WHERE id = $1`,
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userResult.rows[0];

      if (user.status !== 'active') {
        throw new Error('User account is inactive');
      }

      if (user.locked_until && new Date(user.locked_until) > new Date()) {
        throw new Error('User account is locked');
      }

      // 2. Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        await this._recordFailedAttempt(client, userId, 'signature_password_failed');
        throw new Error('Invalid password');
      }

      // 3. Verify PIN (if required)
      if (authMethod === 'password_pin') {
        if (!user.signature_pin_hash) {
          throw new Error('Signature PIN not set. Please set your PIN first.');
        }
        
        const pinValid = await bcrypt.compare(pin, user.signature_pin_hash);
        if (!pinValid) {
          await this._recordFailedAttempt(client, userId, 'signature_pin_failed');
          throw new Error('Invalid signature PIN');
        }
      }

      // 4. Validate action
      if (!SIGNATURE_ACTIONS[action]) {
        throw new Error(`Invalid signature action. Must be one of: ${Object.keys(SIGNATURE_ACTIONS).join(', ')}`);
      }

      // 5. Use default meaning if not provided
      const signatureMeaning = meaning || DEFAULT_MEANINGS[action];

      // 6. Generate signature hash (non-repudiation)
      const signatureData = `${userId}|${resourceType}|${resourceId}|${action}|${signatureMeaning}|${new Date().toISOString()}`;
      const signatureHash = crypto.createHash('sha256').update(signatureData).digest('hex');

      // 7. Check for duplicate signature (same user, same resource, same action)
      const duplicateCheck = await client.query(
        `SELECT id FROM electronic_signatures 
         WHERE user_id = $1 AND resource_type = $2 AND resource_id = $3 
         AND action = $4 AND is_valid = TRUE`,
        [userId, resourceType, resourceId, action]
      );

      if (duplicateCheck.rows.length > 0) {
        throw new Error('You have already signed this resource with this action');
      }

      // 8. Insert signature record
      const insertResult = await client.query(
        `INSERT INTO electronic_signatures (
          user_id, tenant_id, resource_type, resource_id, resource_name,
          action, meaning, auth_method, signature_hash,
          ip_address, user_agent, device_info,
          signature_order, required_signatures, workflow_id,
          signed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
        RETURNING *`,
        [
          userId, tenantId, resourceType, resourceId, resourceName,
          action, signatureMeaning, authMethod, signatureHash,
          ipAddress, userAgent, JSON.stringify(deviceInfo),
          signatureOrder, requiredSignatures, workflowId
        ]
      );

      const signature = insertResult.rows[0];

      // 9. Log to audit trail
      await this._logAudit(client, {
        tenantId,
        userId,
        action: 'electronic_signature.created',
        resourceType,
        resourceId,
        details: {
          signature_id: signature.id,
          signature_action: action,
          meaning: signatureMeaning
        },
        ipAddress
      });

      await client.query('COMMIT');

      // 10. Publish Kafka event
      try {
        const eventService = getEventService();
        await eventService.publish('qassure.compliance.events', {
          type: 'electronic_signature.created',
          data: {
            signatureId: signature.id,
            userId,
            tenantId,
            resourceType,
            resourceId,
            action,
            signedAt: signature.signed_at
          }
        });
      } catch (kafkaError) {
        console.error('[ElectronicSignature] Kafka publish error:', kafkaError.message);
      }

      return this._formatSignature(signature, user);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Verify a signature is valid
   */
  async verify(signatureId, tenantId) {
    const result = await this.pool.query(
      `SELECT es.*, u.email, u.first_name, u.last_name
       FROM electronic_signatures es
       JOIN users u ON es.user_id = u.id
       WHERE es.id = $1 AND es.tenant_id = $2`,
      [signatureId, tenantId]
    );

    if (result.rows.length === 0) {
      return { valid: false, reason: 'Signature not found' };
    }

    const sig = result.rows[0];

    if (!sig.is_valid) {
      return {
        valid: false,
        reason: 'Signature has been invalidated',
        invalidated_at: sig.invalidated_at,
        invalidation_reason: sig.invalidation_reason
      };
    }

    return {
      valid: true,
      signature: this._formatSignature(sig, {
        email: sig.email,
        first_name: sig.first_name,
        last_name: sig.last_name
      })
    };
  }

  /**
   * Get signature history for a resource
   */
  async getResourceSignatures(resourceType, resourceId, tenantId) {
    const result = await this.pool.query(
      `SELECT es.*, u.email, u.first_name, u.last_name
       FROM electronic_signatures es
       JOIN users u ON es.user_id = u.id
       WHERE es.resource_type = $1 AND es.resource_id = $2 AND es.tenant_id = $3
       ORDER BY es.signed_at DESC`,
      [resourceType, resourceId, tenantId]
    );

    return result.rows.map(sig => this._formatSignature(sig, {
      email: sig.email,
      first_name: sig.first_name,
      last_name: sig.last_name
    }));
  }

  /**
   * Get user's signature history
   */
  async getUserSignatures(userId, tenantId, options = {}) {
    const { limit = 50, offset = 0, resourceType, action, startDate, endDate } = options;

    let query = `
      SELECT es.*, u.email, u.first_name, u.last_name
      FROM electronic_signatures es
      JOIN users u ON es.user_id = u.id
      WHERE es.user_id = $1 AND es.tenant_id = $2
    `;
    const params = [userId, tenantId];
    let paramIndex = 3;

    if (resourceType) {
      query += ` AND es.resource_type = $${paramIndex++}`;
      params.push(resourceType);
    }

    if (action) {
      query += ` AND es.action = $${paramIndex++}`;
      params.push(action);
    }

    if (startDate) {
      query += ` AND es.signed_at >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      query += ` AND es.signed_at <= $${paramIndex++}`;
      params.push(endDate);
    }

    query += ` ORDER BY es.signed_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) FROM electronic_signatures 
      WHERE user_id = $1 AND tenant_id = $2
    `;
    const countParams = [userId, tenantId];
    const countResult = await this.pool.query(countQuery, countParams);

    return {
      signatures: result.rows.map(sig => this._formatSignature(sig, {
        email: sig.email,
        first_name: sig.first_name,
        last_name: sig.last_name
      })),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Invalidate a signature (rare, requires super_admin)
   */
  async invalidate(signatureId, tenantId, invalidatedBy, reason) {
    const client = await this.pool.connect();
      console.log("[DEBUG setPin] Got DB client");

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE electronic_signatures
         SET is_valid = FALSE, invalidated_at = NOW(), 
             invalidated_by = $1, invalidation_reason = $2
         WHERE id = $3 AND tenant_id = $4 AND is_valid = TRUE
         RETURNING *`,
        [invalidatedBy, reason, signatureId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new Error('Signature not found or already invalidated');
      }

      // Log audit
      await this._logAudit(client, {
        tenantId,
        userId: invalidatedBy,
        action: 'electronic_signature.invalidated',
        resourceType: 'electronic_signature',
        resourceId: signatureId,
        details: { reason }
      });

      await client.query('COMMIT');

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Set user's signature PIN
   */
  async setPin(userId, tenantId, password, newPin) {
    console.log("[DEBUG setPin] userId:", userId, "tenantId:", tenantId);
    const client = await this.pool.connect();
      console.log("[DEBUG setPin] Got DB client");

    try {
      // Verify password first
      const userResult = await client.query(
        'SELECT password_hash FROM users WHERE id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        throw new Error('User not found');
      }

      const passwordValid = await bcrypt.compare(password, userResult.rows[0].password_hash);
      if (!passwordValid) {
        throw new Error('Invalid password');
      }

      // Validate PIN format (4-6 digits)
      if (!/^\d{4,6}$/.test(newPin)) {
        throw new Error('PIN must be 4-6 digits');
      }

      // Hash and store PIN
      const pinHash = await bcrypt.hash(newPin, 10);

      await client.query(
        `UPDATE users SET signature_pin_hash = $1, signature_pin_set_at = NOW()
         WHERE id = $2`,
        [pinHash, userId]
      );

      return { success: true, message: 'Signature PIN set successfully' };

    } finally {
      client.release();
    }
  }

  /**
   * Check if workflow has all required signatures
   */
  async checkWorkflowComplete(workflowId, tenantId) {
    const result = await this.pool.query(
      `SELECT COUNT(*) as count, required_signatures
       FROM electronic_signatures
       WHERE workflow_id = $1 AND tenant_id = $2 AND is_valid = TRUE
       GROUP BY required_signatures`,
      [workflowId, tenantId]
    );

    if (result.rows.length === 0) {
      return { complete: false, current: 0, required: null };
    }

    const { count, required_signatures } = result.rows[0];
    return {
      complete: parseInt(count) >= required_signatures,
      current: parseInt(count),
      required: required_signatures
    };
  }

  /**
   * Get signature statistics for compliance reporting
   */
  async getStatistics(tenantId, options = {}) {
    const { startDate, endDate } = options;

    let dateFilter = '';
    const params = [tenantId];

    if (startDate && endDate) {
      dateFilter = 'AND signed_at BETWEEN $2 AND $3';
      params.push(startDate, endDate);
    }

    const result = await this.pool.query(
      `SELECT 
         COUNT(*) as total_signatures,
         COUNT(DISTINCT user_id) as unique_signers,
         COUNT(DISTINCT resource_id) as unique_resources,
         action,
         COUNT(*) as count_by_action
       FROM electronic_signatures
       WHERE tenant_id = $1 AND is_valid = TRUE ${dateFilter}
       GROUP BY action`,
      params
    );

    const stats = {
      total_signatures: 0,
      unique_signers: 0,
      unique_resources: 0,
      by_action: {}
    };

    result.rows.forEach(row => {
      stats.total_signatures = parseInt(row.total_signatures);
      stats.unique_signers = parseInt(row.unique_signers);
      stats.unique_resources = parseInt(row.unique_resources);
      stats.by_action[row.action] = parseInt(row.count_by_action);
    });

    return stats;
  }

  // Private helper methods

  async _recordFailedAttempt(client, userId, reason) {
    await client.query(
      `UPDATE users SET failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1
       WHERE id = $1`,
      [userId]
    );

    // Check if should lock
    const result = await client.query(
      'SELECT failed_login_attempts FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows[0].failed_login_attempts >= 5) {
      await client.query(
        `UPDATE users SET locked_until = NOW() + INTERVAL '30 minutes'
         WHERE id = $1`,
        [userId]
      );
    }
  }

  async _logAudit(client, { tenantId, userId, action, resourceType, resourceId, details, ipAddress }) {
    await client.query(
      `INSERT INTO audit_logs (tenant_id, user_id, action, resource_type, resource_id, metadata, ip_address, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
      [tenantId, userId, action, resourceType, resourceId, JSON.stringify(details), ipAddress]
    );
  }

  _formatSignature(sig, user) {
    return {
      id: sig.id,
      signer: {
        id: sig.user_id,
        email: user.email,
        name: `${user.first_name} ${user.last_name}`
      },
      resource: {
        type: sig.resource_type,
        id: sig.resource_id,
        name: sig.resource_name
      },
      action: sig.action,
      meaning: sig.meaning,
      auth_method: sig.auth_method,
      signed_at: sig.signed_at,
      is_valid: sig.is_valid,
      workflow: sig.workflow_id ? {
        id: sig.workflow_id,
        order: sig.signature_order,
        required: sig.required_signatures
      } : null,
      verification: {
        signature_hash: sig.signature_hash,
        ip_address: sig.ip_address
      }
    };
  }
}

// Singleton
let instance = null;

const getElectronicSignatureService = () => {
  if (!instance) {
    instance = new ElectronicSignatureService();
  }
  return instance;
};

module.exports = {
  ElectronicSignatureService,
  getElectronicSignatureService,
  SIGNATURE_ACTIONS,
  DEFAULT_MEANINGS
};
