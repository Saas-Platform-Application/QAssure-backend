/**
 * QMS Connection Service - QAssure Platform
 * Manages QMS connections for tenants (adapted to existing schema)
 */
const crypto = require('crypto');
const database = require('../config/database');
const { getEventService } = require('../infrastructure/kafka');

// Supported QMS systems
const SUPPORTED_QMS = {
  veeva: {
    name: 'veeva',
    displayName: 'Veeva Vault',
    description: 'Veeva Vault Quality Management',
    icon: 'veeva-icon',
    requiredFields: ['baseUrl', 'username', 'password'],
    optionalFields: ['vaultVersion', 'sessionTimeout'],
    entityTypes: ['documents', 'workflows', 'audits', 'training', 'deviations', 'capas', 'change_controls']
  },
  mastercontrol: {
    name: 'mastercontrol',
    displayName: 'MasterControl',
    description: 'MasterControl Quality Excellence',
    icon: 'mastercontrol-icon',
    requiredFields: ['baseUrl', 'apiKey', 'apiSecret'],
    optionalFields: ['environment'],
    entityTypes: ['documents', 'workflows', 'audits', 'training', 'deviations', 'capas', 'nonconformances']
  },
  arena: {
    name: 'arena',
    displayName: 'Arena PLM',
    description: 'Arena Product Lifecycle Management',
    icon: 'arena-icon',
    requiredFields: ['baseUrl', 'workspaceId', 'email', 'password'],
    optionalFields: ['apiVersion'],
    entityTypes: ['items', 'bom', 'changes', 'quality', 'requirements', 'projects']
  },
  trackwise: {
    name: 'trackwise',
    displayName: 'Honeywell TrackWise',
    description: 'TrackWise Digital Quality Management',
    icon: 'trackwise-icon',
    requiredFields: ['baseUrl', 'username', 'password', 'database'],
    optionalFields: ['port', 'useSsl'],
    entityTypes: ['deviations', 'capas', 'audits', 'complaints', 'change_controls']
  },
  etq: {
    name: 'etq',
    displayName: 'ETQ Reliance',
    description: 'ETQ Reliance QMS',
    icon: 'etq-icon',
    requiredFields: ['baseUrl', 'clientId', 'clientSecret'],
    optionalFields: ['scope'],
    entityTypes: ['documents', 'nonconformances', 'capas', 'audits', 'training', 'complaints']
  }
};

class QMSConnectionService {
  constructor() {
    this.eventService = null;
  }

  _getEventService() {
    if (!this.eventService) {
      try {
        this.eventService = getEventService();
      } catch (e) {
        console.warn('[QMSConnection] Event service not available');
      }
    }
    return this.eventService;
  }

  // ==================== Supported QMS ====================

  getSupportedSystems() {
    return Object.values(SUPPORTED_QMS).map(qms => ({
      name: qms.name,
      displayName: qms.displayName,
      description: qms.description,
      icon: qms.icon,
      entityTypes: qms.entityTypes
    }));
  }

  getSystemDetails(systemName) {
    return SUPPORTED_QMS[systemName] || null;
  }

  // ==================== Connection CRUD ====================

  async createConnection(tenantId, data, userId) {
    const { systemType, name, description, credentials, settings = {} } = data;

    const systemInfo = SUPPORTED_QMS[systemType];
    if (!systemInfo) {
      throw new Error(`Unsupported QMS system: ${systemType}`);
    }

    // Validate required credentials
    for (const field of systemInfo.requiredFields) {
      if (!credentials[field]) {
        throw new Error(`Missing required credential: ${field}`);
      }
    }

    const id = crypto.randomUUID();

    const query = `
      INSERT INTO qms_connections (
        id, tenant_id, name, qms_type, base_url, auth_type, auth_config,
        sync_mode, entity_mappings, field_mappings, status, created_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'PENDING', $11, NOW(), NOW())
      RETURNING *
    `;

    const result = await database.query(query, [
      id,
      tenantId,
      name,
      systemType,
      credentials.baseUrl || '',
      credentials.authType || 'api_key',
      JSON.stringify(credentials),
      settings.syncMode || 'BIDIRECTIONAL',
      JSON.stringify(settings.entityMappings || []),
      JSON.stringify(settings.fieldMappings || {}),
      userId
    ]);

    // Publish event
    const eventService = this._getEventService();
    if (eventService) {
      await eventService.publish('qassure.qms.events', {
        type: 'qms.connection.created',
        tenantId,
        data: { connectionId: id, systemType, name }
      }).catch(() => {});
    }

    return this._formatConnection(result.rows[0]);
  }

  async getConnection(connectionId, tenantId) {
    const query = `
      SELECT * FROM qms_connections
      WHERE id = $1 AND tenant_id = $2
    `;
    const result = await database.query(query, [connectionId, tenantId]);
    
    if (result.rows.length === 0) return null;
    return this._formatConnection(result.rows[0]);
  }

  async listConnections(tenantId, options = {}) {
    const { status, systemType, page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;
    const params = [tenantId];
    let paramIndex = 1;

    let whereClause = `WHERE tenant_id = $${paramIndex}`;

    if (status) {
      paramIndex++;
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
    }

    if (systemType) {
      paramIndex++;
      whereClause += ` AND qms_type = $${paramIndex}`;
      params.push(systemType);
    }

    const countQuery = `SELECT COUNT(*) FROM qms_connections ${whereClause}`;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT * FROM qms_connections
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;

    const result = await database.query(dataQuery, params);

    return {
      data: result.rows.map(r => this._formatConnection(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async updateConnection(connectionId, tenantId, data, userId) {
    const existing = await this.getConnection(connectionId, tenantId);
    if (!existing) {
      throw new Error('Connection not found');
    }

    const { name, credentials, settings, status } = data;
    const updates = [];
    const params = [];
    let paramIndex = 0;

    if (name !== undefined) {
      paramIndex++;
      updates.push(`name = $${paramIndex}`);
      params.push(name);
    }

    if (credentials) {
      if (credentials.baseUrl) {
        paramIndex++;
        updates.push(`base_url = $${paramIndex}`);
        params.push(credentials.baseUrl);
      }
      paramIndex++;
      updates.push(`auth_config = $${paramIndex}`);
      params.push(JSON.stringify(credentials));
    }

    if (settings) {
      if (settings.syncMode) {
        paramIndex++;
        updates.push(`sync_mode = $${paramIndex}`);
        params.push(settings.syncMode);
      }
      if (settings.entityMappings) {
        paramIndex++;
        updates.push(`entity_mappings = $${paramIndex}`);
        params.push(JSON.stringify(settings.entityMappings));
      }
      if (settings.fieldMappings) {
        paramIndex++;
        updates.push(`field_mappings = $${paramIndex}`);
        params.push(JSON.stringify(settings.fieldMappings));
      }
    }

    if (status) {
      paramIndex++;
      updates.push(`status = $${paramIndex}`);
      params.push(status);
    }

    updates.push('updated_at = NOW()');
    params.push(connectionId, tenantId);

    const query = `
      UPDATE qms_connections
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2}
      RETURNING *
    `;

    const result = await database.query(query, params);
    return this._formatConnection(result.rows[0]);
  }

  async deleteConnection(connectionId, tenantId) {
    const result = await database.query(
      'DELETE FROM qms_connections WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [connectionId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Connection not found');
    }

    const eventService = this._getEventService();
    if (eventService) {
      await eventService.publish('qassure.qms.events', {
        type: 'qms.connection.deleted',
        tenantId,
        data: { connectionId }
      }).catch(() => {});
    }

    return { success: true };
  }

  // ==================== Connection Testing ====================

  async testConnection(connectionId, tenantId) {
    const connection = await this.getConnection(connectionId, tenantId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Get adapter and test
    const adapter = await this._getAdapter(connection.systemType, connection.authConfig);
    const testResult = await adapter.testConnection();

    // Update connection status
    const newStatus = testResult.success ? 'ACTIVE' : 'ERROR';
    await database.query(`
      UPDATE qms_connections
      SET status = $1, last_error = $2, updated_at = NOW()
      WHERE id = $3
    `, [
      newStatus,
      testResult.success ? null : testResult.message,
      connectionId
    ]);

    return {
      success: testResult.success,
      message: testResult.message,
      status: newStatus,
      details: testResult.details
    };
  }

  // ==================== Entity Fields ====================

  async getEntityFields(connectionId, tenantId, entityType) {
    const connection = await this.getConnection(connectionId, tenantId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const adapter = await this._getAdapter(connection.systemType, connection.authConfig);
    return adapter.getEntitySchema(entityType);
  }

  // ==================== Field Mappings ====================

  async getMappings(connectionId, tenantId) {
    const query = `
      SELECT * FROM qms_entity_mappings
      WHERE qms_connection_id = $1 AND tenant_id = $2
      ORDER BY qms_entity_type, created_at
    `;
    const result = await database.query(query, [connectionId, tenantId]);
    return result.rows.map(r => this._formatMapping(r));
  }

  async updateMappings(connectionId, tenantId, entityType, mappings, userId) {
    // Delete existing mappings for this entity type
    await database.query(`
      DELETE FROM qms_entity_mappings
      WHERE qms_connection_id = $1 AND tenant_id = $2 AND qms_entity_type = $3
    `, [connectionId, tenantId, entityType]);

    // Insert new mapping
    const id = crypto.randomUUID();
    const query = `
      INSERT INTO qms_entity_mappings (
        id, qms_connection_id, tenant_id, qms_entity_type, qassure_entity_type,
        mapping_direction, field_mappings, transformation_rules, validation_rules,
        conflict_resolution_strategy, sync_enabled, records_synced,
        created_by, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 0, $12, NOW(), NOW())
      RETURNING *
    `;

    const result = await database.query(query, [
      id,
      connectionId,
      tenantId,
      entityType,
      mappings.qassureEntityType || entityType,
      mappings.direction || 'BIDIRECTIONAL',
      JSON.stringify(mappings.fieldMappings || []),
      JSON.stringify(mappings.transformationRules || {}),
      JSON.stringify(mappings.validationRules || {}),
      mappings.conflictResolution || 'MANUAL',
      mappings.syncEnabled !== false,
      userId
    ]);

    return this._formatMapping(result.rows[0]);
  }

  // ==================== Sync Configuration ====================

  async getSyncConfig(connectionId, tenantId) {
    const connection = await this.getConnection(connectionId, tenantId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    // Get entity mappings
    const mappings = await this.getMappings(connectionId, tenantId);

    return {
      enabled: connection.status === 'ACTIVE',
      direction: connection.syncMode,
      entityTypes: mappings.map(m => m.qmsEntityType),
      mappings,
      lastSyncAt: connection.lastSyncAt
    };
  }

  async updateSyncConfig(connectionId, tenantId, config, userId) {
    const { direction, enabled } = config;
    const updates = [];
    const params = [];
    let paramIndex = 0;

    if (direction) {
      paramIndex++;
      updates.push(`sync_mode = $${paramIndex}`);
      params.push(direction);
    }

    if (enabled !== undefined) {
      paramIndex++;
      updates.push(`status = $${paramIndex}`);
      params.push(enabled ? 'ACTIVE' : 'INACTIVE');
    }

    if (updates.length === 0) {
      return this.getSyncConfig(connectionId, tenantId);
    }

    updates.push('updated_at = NOW()');
    params.push(connectionId, tenantId);

    await database.query(`
      UPDATE qms_connections
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2}
    `, params);

    return this.getSyncConfig(connectionId, tenantId);
  }

  // ==================== Helpers ====================

  async _getAdapter(systemType, authConfig) {
    const { BaseQMSAdapter } = require('../infrastructure/qms/base-adapter');
    
    const MockAdapter = class extends BaseQMSAdapter {
      constructor(config) {
        super(config);
        this.name = systemType;
        this.displayName = SUPPORTED_QMS[systemType]?.displayName || systemType;
        this.supportedEntities = SUPPORTED_QMS[systemType]?.entityTypes || [];
      }

      async connect() {
        this.connected = true;
        return true;
      }

      async healthCheck() {
        return { status: 'healthy', timestamp: new Date().toISOString() };
      }

      async testConnection() {
        return { success: true, message: 'Connection test successful (mock)' };
      }

      async getEntitySchema(entityType) {
        return {
          entityType,
          fields: [
            { name: 'id', type: 'string', required: true },
            { name: 'name', type: 'string', required: true },
            { name: 'description', type: 'text', required: false },
            { name: 'status', type: 'string', required: true },
            { name: 'created_at', type: 'datetime', required: true },
            { name: 'updated_at', type: 'datetime', required: true }
          ]
        };
      }
    };

    const adapter = new MockAdapter(authConfig);
    await adapter.connect();
    return adapter;
  }

  _formatConnection(row) {
    return {
      id: row.id,
      tenantId: row.tenant_id,
      systemType: row.qms_type,
      name: row.name,
      baseUrl: row.base_url,
      authType: row.auth_type,
      authConfig: row.auth_config,
      syncMode: row.sync_mode,
      entityMappings: row.entity_mappings,
      fieldMappings: row.field_mappings,
      webhookUrl: row.webhook_url,
      status: row.status,
      lastSyncAt: row.last_sync_at,
      lastError: row.last_error,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  _formatMapping(row) {
    return {
      id: row.id,
      connectionId: row.qms_connection_id,
      tenantId: row.tenant_id,
      qmsEntityType: row.qms_entity_type,
      qassureEntityType: row.qassure_entity_type,
      direction: row.mapping_direction,
      fieldMappings: row.field_mappings,
      transformationRules: row.transformation_rules,
      validationRules: row.validation_rules,
      conflictResolution: row.conflict_resolution_strategy,
      syncEnabled: row.sync_enabled,
      syncFrequency: row.sync_frequency,
      lastSyncAt: row.last_sync_at,
      recordsSynced: row.records_synced,
      createdBy: row.created_by,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Singleton
let instance = null;
const getQMSConnectionService = () => {
  if (!instance) {
    instance = new QMSConnectionService();
  }
  return instance;
};

module.exports = { QMSConnectionService, getQMSConnectionService, SUPPORTED_QMS };
