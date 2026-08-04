/**
 * Event Subscription Service - QAssure Platform
 * Manages module subscriptions to event types for cross-module communication
 */
const crypto = require('crypto');
const database = require('../config/database');

class EventSubscriptionService {
  constructor() {
    this.subscriptionCache = new Map();
  }

  /**
   * Create a new event subscription
   */
  async create(tenantId, data, userId) {
    const {
      moduleCode,
      subscriberName,
      eventPattern,
      deliveryType = 'kafka',
      callbackUrl,
      kafkaTopic,
      filters = {},
      description,
      metadata = {}
    } = data;

    // Validate delivery type
    const validDeliveryTypes = ['kafka', 'http', 'internal'];
    if (!validDeliveryTypes.includes(deliveryType)) {
      throw new Error(`Invalid delivery type. Must be one of: ${validDeliveryTypes.join(', ')}`);
    }

    // Validate callback URL for HTTP delivery
    if (deliveryType === 'http' && !callbackUrl) {
      throw new Error('callbackUrl is required for HTTP delivery type');
    }

    const id = crypto.randomUUID();

    const query = `
      INSERT INTO event_subscriptions (
        id, tenant_id, module_code, subscriber_name, event_pattern,
        delivery_type, callback_url, kafka_topic, filters,
        description, metadata, status, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active', $12, NOW(), NOW())
      RETURNING *
    `;

    const result = await database.query(query, [
      id,
      tenantId,
      moduleCode,
      subscriberName,
      eventPattern,
      deliveryType,
      callbackUrl,
      kafkaTopic,
      JSON.stringify(filters),
      description,
      JSON.stringify(metadata),
      userId
    ]);

    // Clear cache
    this._clearCache(tenantId);

    return this._formatSubscription(result.rows[0]);
  }

  /**
   * Get subscription by ID
   */
  async getById(subscriptionId, tenantId) {
    const query = `
      SELECT * FROM event_subscriptions
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await database.query(query, [subscriptionId, tenantId]);
    
    if (result.rows.length === 0) return null;
    return this._formatSubscription(result.rows[0]);
  }

  /**
   * List subscriptions with filters
   */
  async list(tenantId, options = {}) {
    const { moduleCode, eventPattern, status, deliveryType, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const params = [tenantId];
    let paramIndex = 1;

    let whereClause = `WHERE tenant_id = $${paramIndex}`;

    if (moduleCode) {
      paramIndex++;
      whereClause += ` AND module_code = $${paramIndex}`;
      params.push(moduleCode);
    }

    if (eventPattern) {
      paramIndex++;
      whereClause += ` AND event_pattern LIKE $${paramIndex}`;
      params.push(`%${eventPattern}%`);
    }

    if (status) {
      paramIndex++;
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
    }

    if (deliveryType) {
      paramIndex++;
      whereClause += ` AND delivery_type = $${paramIndex}`;
      params.push(deliveryType);
    }

    // Count total
    const countQuery = `SELECT COUNT(*) FROM event_subscriptions ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    params.push(limit, offset);
    const dataQuery = `
      SELECT * FROM event_subscriptions
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    const result = await database.query(dataQuery, params);

    return {
      data: result.rows.map(r => this._formatSubscription(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update subscription
   */
  async update(subscriptionId, tenantId, data, userId) {
    const existing = await this.getById(subscriptionId, tenantId);
    if (!existing) {
      throw new Error('Subscription not found');
    }

    const allowedFields = ['subscriberName', 'eventPattern', 'deliveryType', 
                          'callbackUrl', 'kafkaTopic', 'filters', 'description', 
                          'metadata', 'status'];
    
    const updates = [];
    const params = [];
    let paramIndex = 0;

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        paramIndex++;
        const dbField = this._toSnakeCase(field);
        
        if (field === 'filters' || field === 'metadata') {
          updates.push(`${dbField} = $${paramIndex}`);
          params.push(JSON.stringify(data[field]));
        } else {
          updates.push(`${dbField} = $${paramIndex}`);
          params.push(data[field]);
        }
      }
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push('updated_at = NOW()');
    params.push(subscriptionId, tenantId);

    const query = `
      UPDATE event_subscriptions
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2}
      RETURNING *
    `;

    const result = await database.query(query, params);
    
    // Clear cache
    this._clearCache(tenantId);

    return this._formatSubscription(result.rows[0]);
  }

  /**
   * Delete subscription
   */
  async delete(subscriptionId, tenantId) {
    const result = await database.query(
      'DELETE FROM event_subscriptions WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [subscriptionId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Subscription not found');
    }

    // Clear cache
    this._clearCache(tenantId);

    return { success: true, message: 'Subscription deleted' };
  }

  /**
   * Get subscriptions matching an event type
   */
  async getSubscribersForEvent(tenantId, eventType) {
    const cacheKey = `${tenantId}:${eventType}`;
    
    // Check cache first
    if (this.subscriptionCache.has(cacheKey)) {
      return this.subscriptionCache.get(cacheKey);
    }

    // Query subscriptions that match the event pattern
    const query = `
      SELECT * FROM event_subscriptions
      WHERE tenant_id = $1
        AND status = 'active'
        AND (
          event_pattern = $2
          OR event_pattern = '*'
          OR $2 LIKE REPLACE(REPLACE(event_pattern, '.', '\\.'), '*', '%')
        )
      ORDER BY created_at ASC
    `;

    const result = await database.query(query, [tenantId, eventType]);
    const subscriptions = result.rows.map(r => this._formatSubscription(r));

    // Cache for 60 seconds
    this.subscriptionCache.set(cacheKey, subscriptions);
    setTimeout(() => this.subscriptionCache.delete(cacheKey), 60000);

    return subscriptions;
  }

  /**
   * Pause subscription
   */
  async pause(subscriptionId, tenantId) {
    return this.update(subscriptionId, tenantId, { status: 'paused' });
  }

  /**
   * Resume subscription
   */
  async resume(subscriptionId, tenantId) {
    return this.update(subscriptionId, tenantId, { status: 'active' });
  }

  // ==================== Helpers ====================

  _clearCache(tenantId) {
    for (const key of this.subscriptionCache.keys()) {
      if (key.startsWith(tenantId)) {
        this.subscriptionCache.delete(key);
      }
    }
  }

  _toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  _formatSubscription(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      moduleCode: row.module_code,
      subscriberName: row.subscriber_name,
      eventPattern: row.event_pattern,
      deliveryType: row.delivery_type,
      callbackUrl: row.callback_url,
      kafkaTopic: row.kafka_topic,
      filters: row.filters,
      description: row.description,
      metadata: row.metadata,
      status: row.status,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Singleton
let instance = null;
const getEventSubscriptionService = () => {
  if (!instance) {
    instance = new EventSubscriptionService();
  }
  return instance;
};

module.exports = { EventSubscriptionService, getEventSubscriptionService };
