/**
 * Webhook Service - QAssure Platform
 * Manages webhook configurations and deliveries for external integrations
 */
const crypto = require('crypto');
const axios = require('axios');
const database = require('../config/database');

class WebhookService {
  constructor() {
    this.deliveryQueue = [];
    this.processing = false;
  }

  // ==================== Webhook CRUD ====================

  /**
   * Create a new webhook
   */
  async create(tenantId, data, userId) {
    const {
      name,
      description,
      url,
      secret,
      authType = 'none',
      authConfig = {},
      events = [],
      method = 'POST',
      headers = {},
      timeoutMs = 30000,
      retryEnabled = true,
      maxRetries = 3,
      retryDelayMs = 1000
    } = data;

    // Validate URL
    if (!url || !url.startsWith('http')) {
      throw new Error('Valid URL is required (must start with http:// or https://)');
    }

    // Validate events array
    if (!Array.isArray(events) || events.length === 0) {
      throw new Error('At least one event type is required');
    }

    // Generate secret if not provided
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    const id = crypto.randomUUID();

    const query = `
      INSERT INTO webhooks (
        id, tenant_id, name, description, url, secret,
        auth_type, auth_config, events, method, headers,
        timeout_ms, retry_enabled, max_retries, retry_delay_ms,
        status, created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, 'active', $16, NOW(), NOW())
      RETURNING *
    `;

    const result = await database.query(query, [
      id,
      tenantId,
      name,
      description,
      url,
      webhookSecret,
      authType,
      JSON.stringify(authConfig),
      JSON.stringify(events),
      method,
      JSON.stringify(headers),
      timeoutMs,
      retryEnabled,
      maxRetries,
      retryDelayMs,
      userId
    ]);

    const webhook = this._formatWebhook(result.rows[0]);
    
    // Include secret only on creation
    return { ...webhook, secret: webhookSecret };
  }

  /**
   * Get webhook by ID
   */
  async getById(webhookId, tenantId) {
    const query = `
      SELECT * FROM webhooks
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await database.query(query, [webhookId, tenantId]);
    
    if (result.rows.length === 0) return null;
    return this._formatWebhook(result.rows[0]);
  }

  /**
   * List webhooks
   */
  async list(tenantId, options = {}) {
    const { status, eventType, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const params = [tenantId];
    let paramIndex = 1;

    let whereClause = `WHERE tenant_id = $${paramIndex}`;

    if (status) {
      paramIndex++;
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
    }

    if (eventType) {
      paramIndex++;
      whereClause += ` AND events @> $${paramIndex}`;
      params.push(JSON.stringify([eventType]));
    }

    // Count total
    const countQuery = `SELECT COUNT(*) FROM webhooks ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    // Get data
    params.push(limit, offset);
    const dataQuery = `
      SELECT * FROM webhooks
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    const result = await database.query(dataQuery, params);

    return {
      data: result.rows.map(r => this._formatWebhook(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  /**
   * Update webhook
   */
  async update(webhookId, tenantId, data, userId) {
    const existing = await this.getById(webhookId, tenantId);
    if (!existing) {
      throw new Error('Webhook not found');
    }

    const allowedFields = ['name', 'description', 'url', 'authType', 'authConfig',
                          'events', 'method', 'headers', 'timeoutMs', 'retryEnabled',
                          'maxRetries', 'retryDelayMs', 'status'];
    
    const updates = [];
    const params = [];
    let paramIndex = 0;

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        paramIndex++;
        const dbField = this._toSnakeCase(field);
        
        if (['authConfig', 'events', 'headers'].includes(field)) {
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
    params.push(webhookId, tenantId);

    const query = `
      UPDATE webhooks
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2}
      RETURNING *
    `;

    const result = await database.query(query, params);
    return this._formatWebhook(result.rows[0]);
  }

  /**
   * Delete webhook
   */
  async delete(webhookId, tenantId) {
    const result = await database.query(
      'DELETE FROM webhooks WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [webhookId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    return { success: true, message: 'Webhook deleted' };
  }

  /**
   * Regenerate webhook secret
   */
  async regenerateSecret(webhookId, tenantId) {
    const newSecret = crypto.randomBytes(32).toString('hex');
    
    const result = await database.query(
      'UPDATE webhooks SET secret = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3 RETURNING *',
      [newSecret, webhookId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Webhook not found');
    }

    return { secret: newSecret };
  }

  // ==================== Webhook Delivery ====================

  /**
   * Get webhooks subscribed to an event type
   */
  async getWebhooksForEvent(tenantId, eventType) {
    const query = `
      SELECT * FROM webhooks
      WHERE tenant_id = $1
        AND status = 'active'
        AND (events @> $2 OR events @> '"*"')
    `;

    const result = await database.query(query, [tenantId, JSON.stringify([eventType])]);
    return result.rows.map(r => this._formatWebhook(r));
  }

  /**
   * Queue webhook delivery
   */
  async queueDelivery(webhook, event) {
    const id = crypto.randomUUID();

    const query = `
      INSERT INTO webhook_deliveries (
        id, webhook_id, tenant_id, event_id, event_type,
        payload, status, max_attempts, scheduled_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, NOW(), NOW())
      RETURNING *
    `;

    const result = await database.query(query, [
      id,
      webhook.id,
      webhook.tenantId,
      event.id,
      event.type,
      JSON.stringify(event),
      webhook.maxRetries
    ]);

    return this._formatDelivery(result.rows[0]);
  }

  /**
   * Test webhook by sending a test event
   * @param {string} webhookId - Webhook ID
   * @param {string} tenantId - Tenant ID
   * @param {string} [testUrl] - Optional test URL to override webhook URL
   */
  async test(webhookId, tenantId, testUrl = null) {
    const webhook = await this.getById(webhookId, tenantId);
    if (!webhook) {
      throw new Error('Webhook not found');
    }

    const testEvent = {
      id: `test_${Date.now()}`,
      type: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook delivery',
        webhookId: webhook.id,
        webhookName: webhook.name
      }
    };

    // Use test URL if provided, otherwise use webhook URL
    // If webhook URL is an example URL, use webhook.site for testing
    let targetUrl = testUrl || webhook.url;
    
    // Auto-detect example URLs and suggest webhook.site
    if (!testUrl && (webhook.url.includes('example.com') || webhook.url.includes('localhost') || webhook.url.includes('127.0.0.1'))) {
      // For example URLs, we'll still try to deliver but provide helpful error
      targetUrl = webhook.url;
    }

    // Create a test webhook object with the target URL
    const testWebhook = { ...webhook, url: targetUrl };

    // Attempt delivery
    const deliveryResult = await this._deliver(testWebhook, testEvent);

    // Record the test delivery
    await database.query(`
      INSERT INTO webhook_deliveries (
        id, webhook_id, tenant_id, event_id, event_type, payload,
        status, attempts, response_status, response_body, response_time_ms,
        error_message, delivered_at, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 1, $8, $9, $10, $11, $12, NOW())
    `, [
      crypto.randomUUID(),
      webhook.id,
      tenantId,
      testEvent.id,
      testEvent.type,
      JSON.stringify(testEvent),
      deliveryResult.success ? 'delivered' : 'failed',
      deliveryResult.statusCode,
      deliveryResult.body?.substring(0, 1000),
      deliveryResult.responseTime,
      deliveryResult.error,
      deliveryResult.success ? new Date() : null
    ]);

    return {
      success: deliveryResult.success,
      statusCode: deliveryResult.statusCode,
      responseTime: deliveryResult.responseTime,
      error: deliveryResult.error,
      testUrl: targetUrl // Include which URL was actually tested
    };
  }

  /**
   * Deliver webhook to endpoint
   */
  async _deliver(webhook, event) {
    const startTime = Date.now();
    const payload = JSON.stringify(event);
    
    // Generate signature
    const signature = this._generateSignature(payload, webhook.secret);

    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': webhook.id,
      'X-Webhook-Signature': signature,
      'X-Webhook-Timestamp': new Date().toISOString(),
      'User-Agent': 'QAssure-Webhook/1.0',
      ...webhook.headers
    };

    // Add auth headers
    if (webhook.authType === 'bearer' && webhook.authConfig?.token) {
      headers['Authorization'] = `Bearer ${webhook.authConfig.token}`;
    } else if (webhook.authType === 'basic' && webhook.authConfig?.username) {
      const credentials = Buffer.from(
        `${webhook.authConfig.username}:${webhook.authConfig.password}`
      ).toString('base64');
      headers['Authorization'] = `Basic ${credentials}`;
    }

    try {
      // Validate URL before attempting request
      let url;
      try {
        url = new URL(webhook.url);
      } catch (urlError) {
        throw new Error(`Invalid webhook URL: ${webhook.url}`);
      }

      const response = await axios({
        method: webhook.method,
        url: webhook.url,
        headers,
        data: payload,
        timeout: webhook.timeoutMs,
        validateStatus: () => true, // Don't throw on any status code
        maxRedirects: 5
      });

      const responseTime = Date.now() - startTime;
      const body = typeof response.data === 'string' 
        ? response.data 
        : JSON.stringify(response.data);

      // Update webhook stats
      if (response.status >= 200 && response.status < 300) {
        await database.query(`
          UPDATE webhooks 
          SET success_count = success_count + 1, last_triggered_at = NOW()
          WHERE id = $1
        `, [webhook.id]);
      } else {
        await database.query(`
          UPDATE webhooks 
          SET failure_count = failure_count + 1, last_triggered_at = NOW()
          WHERE id = $1
        `, [webhook.id]);
      }

      return {
        success: response.status >= 200 && response.status < 300,
        statusCode: response.status,
        body: body.substring(0, 1000), // Limit body size
        responseTime
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      await database.query(`
        UPDATE webhooks 
        SET failure_count = failure_count + 1, last_triggered_at = NOW()
        WHERE id = $1
      `, [webhook.id]);

      // Provide more detailed error messages
      let errorMessage = error.message;
      const isExampleUrl = webhook.url.includes('example.com') || webhook.url.includes('localhost') || webhook.url.includes('127.0.0.1');
      
      if (error.code === 'ECONNREFUSED') {
        errorMessage = `Connection refused - the webhook URL is not reachable: ${webhook.url}`;
        if (isExampleUrl) {
          errorMessage += '. Note: This appears to be a test/example URL. Use a real webhook endpoint or provide a test_url in the request body.';
        }
      } else if (error.code === 'ENOTFOUND') {
        errorMessage = `DNS lookup failed - the webhook URL hostname cannot be resolved: ${webhook.url}`;
        if (isExampleUrl) {
          errorMessage += '. Note: This appears to be a test/example URL. For testing, you can: 1) Use a real webhook endpoint, 2) Use webhook.site (https://webhook.site), or 3) Provide a test_url parameter in the request body to override the webhook URL.';
        }
      } else if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
        errorMessage = `Request timeout after ${webhook.timeoutMs}ms - the webhook endpoint did not respond in time`;
      } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        errorMessage = `SSL certificate error - the webhook URL has an invalid SSL certificate: ${webhook.url}`;
      } else if (error.response) {
        // Axios error with response
        errorMessage = `HTTP ${error.response.status}: ${error.response.statusText}`;
      } else if (error.request) {
        errorMessage = `No response received from webhook URL: ${webhook.url}`;
      }

      return {
        success: false,
        statusCode: error.response?.status || null,
        error: errorMessage,
        responseTime
      };
    }
  }

  /**
   * Generate HMAC signature for webhook payload
   */
  _generateSignature(payload, secret) {
    return crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');
  }

  // ==================== Delivery History ====================

  /**
   * Get delivery history for a webhook
   */
  async getDeliveryHistory(webhookId, tenantId, options = {}) {
    const { status, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const params = [webhookId, tenantId];
    let paramIndex = 2;

    let whereClause = `WHERE webhook_id = $1 AND tenant_id = $2`;

    if (status) {
      paramIndex++;
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
    }

    const countQuery = `SELECT COUNT(*) FROM webhook_deliveries ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT * FROM webhook_deliveries
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    const result = await database.query(dataQuery, params);

    return {
      data: result.rows.map(r => this._formatDelivery(r)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  // ==================== Helpers ====================

  _toSnakeCase(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }

  _formatWebhook(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      name: row.name,
      description: row.description,
      url: row.url,
      authType: row.auth_type,
      authConfig: row.auth_config,
      events: row.events,
      method: row.method,
      headers: row.headers,
      timeoutMs: row.timeout_ms,
      retryEnabled: row.retry_enabled,
      maxRetries: row.max_retries,
      retryDelayMs: row.retry_delay_ms,
      status: row.status,
      lastTriggeredAt: row.last_triggered_at,
      successCount: row.success_count,
      failureCount: row.failure_count,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      secret: row.secret
    };
  }

  _formatDelivery(row) {
    return {
      id: row.id,
      webhookId: row.webhook_id,
      tenantId: row.tenant_id,
      eventId: row.event_id,
      eventType: row.event_type,
      payload: row.payload,
      status: row.status,
      attempts: row.attempts,
      maxAttempts: row.max_attempts,
      responseStatus: row.response_status,
      responseBody: row.response_body,
      responseTimeMs: row.response_time_ms,
      errorMessage: row.error_message,
      scheduledAt: row.scheduled_at,
      deliveredAt: row.delivered_at,
      nextRetryAt: row.next_retry_at,
      createdAt: row.created_at
    };
  }
}

// Singleton
let instance = null;
const getWebhookService = () => {
  if (!instance) {
    instance = new WebhookService();
  }
  return instance;
};

module.exports = { WebhookService, getWebhookService };
