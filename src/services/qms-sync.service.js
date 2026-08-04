/**
 * QMS Sync Service - QAssure Platform
 * Handles synchronization between QAssure and QMS systems
 */
const crypto = require('crypto');
const database = require('../config/database');
const { getQMSConnectionService } = require('./qms-connection.service');

class QMSSyncService {
  constructor() {
    this.connectionService = getQMSConnectionService();
    this.activeSyncs = new Map();
  }

  async _publishEvent(topic, data) {
    try {
      const { getEventService } = require('../infrastructure/kafka');
      const eventService = getEventService();
      if (eventService && typeof eventService.publish === 'function') {
        await eventService.publish(topic, data);
      }
    } catch (e) {
      // Silently ignore event publishing errors
    }
  }

  // ==================== Sync Jobs ====================

  async triggerSync(connectionId, tenantId, options = {}) {
    const { entityTypes, direction, fullSync = false, userId } = options;

    const connection = await this.connectionService.getConnection(connectionId, tenantId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    if (connection.status !== 'ACTIVE') {
      throw new Error('Connection is not active');
    }

    // Check if sync is already running
    const activeKey = `${tenantId}:${connectionId}`;
    if (this.activeSyncs.has(activeKey)) {
      throw new Error('Sync is already in progress for this connection');
    }

    const jobId = crypto.randomUUID();
    const entityType = entityTypes && entityTypes.length > 0 ? entityTypes[0] : 'documents';

    const query = `
      INSERT INTO qms_sync_jobs (
        id, connection_id, job_type, direction,
        entity_type, status, started_at, triggered_by,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'RUNNING', NOW(), $6, NOW(), NOW())
      RETURNING *
    `;

    const result = await database.query(query, [
      jobId,
      connectionId,
      fullSync ? 'FULL' : 'INCREMENTAL',
      direction || connection.syncMode || 'BIDIRECTIONAL',
      entityType,
      userId
    ]);

    this.activeSyncs.set(activeKey, jobId);

    // Publish event
    this._publishEvent('qassure.qms.events', {
      type: 'qms.sync.started',
      tenantId,
      data: { jobId, connectionId, entityTypes }
    });

    // Run sync asynchronously
    this._executeSyncJob(jobId, connectionId, tenantId, {
      entityTypes: entityTypes || ['documents'],
      direction: direction || connection.syncMode || 'BIDIRECTIONAL',
      fullSync
    }).finally(() => {
      this.activeSyncs.delete(activeKey);
    });

    return this._formatSyncJob(result.rows[0]);
  }

  async _executeSyncJob(jobId, connectionId, tenantId, options) {
    const { entityTypes, direction, fullSync } = options;
    
    let recordsTotal = 0;
    let recordsProcessed = 0;
    let recordsCreated = 0;
    let recordsUpdated = 0;
    let recordsFailed = 0;

    try {
      for (let i = 0; i < entityTypes.length; i++) {
        const entityType = entityTypes[i];

        try {
          const result = await this._syncEntityType(
            connectionId, tenantId, entityType, direction, fullSync
          );
          
          recordsTotal += result.total;
          recordsProcessed += result.synced;
          recordsCreated += Math.floor(result.synced * 0.3);
          recordsUpdated += Math.floor(result.synced * 0.7);
          recordsFailed += result.errors;
        } catch (error) {
          recordsFailed++;
        }
      }

      // Complete job
      await database.query(`
        UPDATE qms_sync_jobs
        SET status = 'COMPLETED',
            completed_at = NOW(),
            records_total = $1,
            records_processed = $2,
            records_created = $3,
            records_updated = $4,
            records_failed = $5,
            updated_at = NOW()
        WHERE id = $6
      `, [recordsTotal, recordsProcessed, recordsCreated, recordsUpdated, recordsFailed, jobId]);

      // Update connection last sync time
      await database.query(`
        UPDATE qms_connections
        SET last_sync_at = NOW(), updated_at = NOW()
        WHERE id = $1
      `, [connectionId]);

      // Publish event
      this._publishEvent('qassure.qms.events', {
        type: 'qms.sync.completed',
        tenantId,
        data: { jobId, connectionId, recordsTotal, recordsProcessed, recordsFailed }
      });

    } catch (error) {
      console.error(`[QMSSync] Job ${jobId} failed:`, error.message);

      await database.query(`
        UPDATE qms_sync_jobs
        SET status = 'FAILED',
            completed_at = NOW(),
            error_message = $1,
            updated_at = NOW()
        WHERE id = $2
      `, [error.message, jobId]);

      this._publishEvent('qassure.qms.events', {
        type: 'qms.sync.failed',
        tenantId,
        data: { jobId, connectionId, error: error.message }
      });
    }
  }

  async _syncEntityType(connectionId, tenantId, entityType, direction, fullSync) {
    // Mock implementation - real adapters in Phase 11
    const result = {
      entityType,
      total: 0,
      synced: 0,
      errors: 0,
      errorDetails: []
    };

    await new Promise(resolve => setTimeout(resolve, 500));

    result.total = Math.floor(Math.random() * 50) + 10;
    result.synced = result.total - Math.floor(Math.random() * 5);
    result.errors = result.total - result.synced;

    return result;
  }

  async getSyncStatus(connectionId, tenantId) {
    const query = `
      SELECT j.*, c.tenant_id FROM qms_sync_jobs j
      JOIN qms_connections c ON c.id = j.connection_id
      WHERE j.connection_id = $1 AND c.tenant_id = $2
      ORDER BY j.started_at DESC
      LIMIT 1
    `;
    const result = await database.query(query, [connectionId, tenantId]);
    
    if (result.rows.length === 0) {
      return { status: 'never_synced', lastSync: null };
    }

    const job = result.rows[0];
    return {
      status: job.status,
      jobId: job.id,
      entityType: job.entity_type,
      startedAt: job.started_at,
      completedAt: job.completed_at,
      recordsTotal: job.records_total,
      recordsProcessed: job.records_processed,
      recordsCreated: job.records_created,
      recordsUpdated: job.records_updated,
      recordsFailed: job.records_failed,
      errorMessage: job.error_message
    };
  }

  async getSyncHistory(connectionId, tenantId, options = {}) {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const countQuery = `
      SELECT COUNT(*) FROM qms_sync_jobs j
      JOIN qms_connections c ON c.id = j.connection_id
      WHERE j.connection_id = $1 AND c.tenant_id = $2
    `;
    const countResult = await database.query(countQuery, [connectionId, tenantId]);
    const total = parseInt(countResult.rows[0].count);

    const dataQuery = `
      SELECT j.* FROM qms_sync_jobs j
      JOIN qms_connections c ON c.id = j.connection_id
      WHERE j.connection_id = $1 AND c.tenant_id = $2
      ORDER BY j.started_at DESC
      LIMIT $3 OFFSET $4
    `;
    const result = await database.query(dataQuery, [connectionId, tenantId, limit, offset]);

    return {
      data: result.rows.map(r => this._formatSyncJob(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  async getSyncJob(jobId, tenantId) {
    const query = `
      SELECT j.* FROM qms_sync_jobs j
      JOIN qms_connections c ON c.id = j.connection_id
      WHERE j.id = $1 AND c.tenant_id = $2
    `;
    const result = await database.query(query, [jobId, tenantId]);
    
    if (result.rows.length === 0) return null;
    return this._formatSyncJob(result.rows[0]);
  }

  async cancelSync(jobId, tenantId, userId) {
    const job = await this.getSyncJob(jobId, tenantId);
    if (!job) {
      throw new Error('Sync job not found');
    }

    if (job.status !== 'RUNNING') {
      throw new Error('Only running jobs can be cancelled');
    }

    await database.query(`
      UPDATE qms_sync_jobs
      SET status = 'CANCELLED',
          completed_at = NOW(),
          error_message = 'Cancelled by user',
          updated_at = NOW()
      WHERE id = $1
    `, [jobId]);

    const activeKey = `${tenantId}:${job.connectionId}`;
    this.activeSyncs.delete(activeKey);

    return { success: true, message: 'Sync job cancelled' };
  }

  // ==================== Sync Errors ====================

  async getSyncErrors(connectionId, tenantId, options = {}) {
    const { page = 1, limit = 50, status } = options;
    const offset = (page - 1) * limit;
    const params = [connectionId, tenantId];
    let paramIndex = 2;

    let whereClause = `
      WHERE sc.qms_connection_id = $1 
      AND c.tenant_id = $2
    `;

    if (status) {
      paramIndex++;
      whereClause += ` AND sc.status = $${paramIndex}`;
      params.push(status);
    }

    const countQuery = `
      SELECT COUNT(*) FROM qms_sync_conflicts sc
      JOIN qms_connections c ON c.id = sc.qms_connection_id
      ${whereClause}
    `;
    const countResult = await database.query(countQuery, params);
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const dataQuery = `
      SELECT sc.* FROM qms_sync_conflicts sc
      JOIN qms_connections c ON c.id = sc.qms_connection_id
      ${whereClause}
      ORDER BY sc.created_at DESC
      LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
    `;
    const result = await database.query(dataQuery, params);

    return {
      data: result.rows.map(r => this._formatConflict(r)),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) }
    };
  }

  // ==================== Conflict Resolution ====================

  async resolveConflict(conflictId, tenantId, resolution, userId) {
    const validResolutions = ['USE_SOURCE', 'USE_TARGET', 'MERGE', 'SKIP'];
    if (!validResolutions.includes(resolution.toUpperCase())) {
      throw new Error(`Invalid resolution. Must be one of: ${validResolutions.join(', ')}`);
    }

    const query = `
      UPDATE qms_sync_conflicts sc
      SET status = 'RESOLVED',
          resolution = $1,
          resolved_by = $2,
          resolved_at = NOW(),
          updated_at = NOW()
      FROM qms_connections c
      WHERE sc.id = $3 AND sc.qms_connection_id = c.id AND c.tenant_id = $4
      RETURNING sc.*
    `;

    const result = await database.query(query, [
      resolution.toUpperCase(), userId, conflictId, tenantId
    ]);

    if (result.rows.length === 0) {
      throw new Error('Conflict not found');
    }

    return this._formatConflict(result.rows[0]);
  }

  async getPendingConflictsCount(connectionId, tenantId) {
    const query = `
      SELECT COUNT(*) FROM qms_sync_conflicts sc
      JOIN qms_connections c ON c.id = sc.qms_connection_id
      WHERE sc.qms_connection_id = $1 AND c.tenant_id = $2 AND sc.status = 'PENDING'
    `;
    const result = await database.query(query, [connectionId, tenantId]);
    return parseInt(result.rows[0].count);
  }

  // ==================== Helpers ====================

  _formatSyncJob(row) {
    return {
      id: row.id,
      connectionId: row.connection_id,
      jobType: row.job_type,
      direction: row.direction,
      entityType: row.entity_type,
      status: row.status,
      recordsTotal: row.records_total,
      recordsProcessed: row.records_processed,
      recordsCreated: row.records_created,
      recordsUpdated: row.records_updated,
      recordsFailed: row.records_failed,
      conflictsDetected: row.conflicts_detected,
      conflictsResolved: row.conflicts_resolved,
      errorMessage: row.error_message,
      errorDetails: row.error_details,
      startedAt: row.started_at,
      completedAt: row.completed_at,
      triggeredBy: row.triggered_by,
      metadata: row.metadata,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  _formatConflict(row) {
    return {
      id: row.id,
      connectionId: row.qms_connection_id,
      syncJobId: row.sync_job_id,
      entityType: row.entity_type,
      entityId: row.qms_entity_id,
      qmsData: row.qms_data,
      qassureData: row.qassure_data,
      conflictType: row.conflict_type,
      status: row.status,
      resolution: row.resolution,
      resolvedBy: row.resolved_by,
      resolvedAt: row.resolved_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}

// Singleton
let instance = null;
const getQMSSyncService = () => {
  if (!instance) {
    instance = new QMSSyncService();
  }
  return instance;
};

module.exports = { QMSSyncService, getQMSSyncService };
