/**
 * QMS Controller - QAssure Platform
 * HTTP handlers for QMS integration endpoints
 */
const { getQMSConnectionService } = require('../services/qms-connection.service');
const { getQMSSyncService } = require('../services/qms-sync.service');

const connectionService = getQMSConnectionService();
const syncService = getQMSSyncService();

// ==================== Supported Systems ====================

/**
 * Get supported QMS systems
 * GET /api/v1/qms/supported
 */
const getSupportedSystems = async (req, res) => {
  try {
    const systems = connectionService.getSupportedSystems();
    res.status(200).json({ success: true, data: systems });
  } catch (error) {
    console.error('[QMSController] getSupportedSystems error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Get system details
 * GET /api/v1/qms/supported/:systemName
 */
const getSystemDetails = async (req, res) => {
  try {
    const system = connectionService.getSystemDetails(req.params.systemName);
    
    if (!system) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'QMS system not found' }
      });
    }

    res.status(200).json({ success: true, data: system });
  } catch (error) {
    console.error('[QMSController] getSystemDetails error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// ==================== Connections (using existing schema) ====================

/**
 * Create connection (matching existing schema)
 * POST /api/v1/qms/connections
 */
const createConnection = async (req, res) => {
  try {
    const { 
      name, qms_type, base_url, auth_type, auth_config, 
      sync_mode, entity_mappings, field_mappings, status 
    } = req.body;

    // Map to our internal format
    const systemType = qms_type?.toLowerCase().replace('_', '');
    
    const connection = await connectionService.createConnection(
      req.user?.tenantId,
      { 
        systemType: qms_type,
        name, 
        credentials: {
          baseUrl: base_url,
          authType: auth_type,
          ...auth_config
        },
        settings: {
          syncMode: sync_mode,
          entityMappings: entity_mappings,
          fieldMappings: field_mappings
        }
      },
      req.user?.id
    );

    res.status(201).json({ success: true, data: connection });
  } catch (error) {
    console.error('[QMSController] createConnection error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * List connections
 * GET /api/v1/qms/connections
 */
const listConnections = async (req, res) => {
  try {
    const { status, qms_type, page, limit } = req.query;

    const result = await connectionService.listConnections(req.user?.tenantId, {
      status,
      systemType: qms_type,
      page: parseInt(page) || 1,
      limit: parseInt(limit) || 20
    });

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[QMSController] listConnections error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Get connection by ID
 * GET /api/v1/qms/connections/:id
 */
const getConnection = async (req, res) => {
  try {
    const connection = await connectionService.getConnection(
      req.params.id,
      req.user?.tenantId
    );

    if (!connection) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Connection not found' }
      });
    }

    res.status(200).json({ success: true, data: connection });
  } catch (error) {
    console.error('[QMSController] getConnection error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Update connection
 * PUT /api/v1/qms/connections/:id
 */
const updateConnection = async (req, res) => {
  try {
    const connection = await connectionService.updateConnection(
      req.params.id,
      req.user?.tenantId,
      req.body,
      req.user?.id
    );

    res.status(200).json({ success: true, data: connection });
  } catch (error) {
    console.error('[QMSController] updateConnection error:', error.message);
    
    if (error.message === 'Connection not found') {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: error.message }
      });
    }

    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Delete connection
 * DELETE /api/v1/qms/connections/:id
 */
const deleteConnection = async (req, res) => {
  try {
    await connectionService.deleteConnection(req.params.id, req.user?.tenantId);
    res.status(200).json({ success: true, message: 'Connection deleted' });
  } catch (error) {
    console.error('[QMSController] deleteConnection error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Test connection
 * POST /api/v1/qms/connections/:id/test
 */
const testConnection = async (req, res) => {
  try {
    const result = await connectionService.testConnection(
      req.params.id,
      req.user?.tenantId
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[QMSController] testConnection error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// ==================== Entity Fields ====================

/**
 * Get entity fields
 * GET /api/v1/qms/connections/:id/fields/:entityType
 */
const getEntityFields = async (req, res) => {
  try {
    const fields = await connectionService.getEntityFields(
      req.params.id,
      req.user?.tenantId,
      req.params.entityType
    );

    res.status(200).json({ success: true, data: fields });
  } catch (error) {
    console.error('[QMSController] getEntityFields error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// ==================== Field Mappings ====================

/**
 * Get mappings
 * GET /api/v1/qms/connections/:id/mappings
 */
const getMappings = async (req, res) => {
  try {
    const mappings = await connectionService.getMappings(
      req.params.id,
      req.user?.tenantId
    );

    res.status(200).json({ success: true, data: mappings });
  } catch (error) {
    console.error('[QMSController] getMappings error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Update mappings
 * PUT /api/v1/qms/connections/:id/mappings/:entityType
 */
const updateMappings = async (req, res) => {
  try {
    const result = await connectionService.updateMappings(
      req.params.id,
      req.user?.tenantId,
      req.params.entityType,
      req.body,
      req.user?.id
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[QMSController] updateMappings error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// ==================== Sync Configuration ====================

/**
 * Get sync config
 * GET /api/v1/qms/connections/:id/sync-config
 */
const getSyncConfig = async (req, res) => {
  try {
    const config = await connectionService.getSyncConfig(
      req.params.id,
      req.user?.tenantId
    );

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('[QMSController] getSyncConfig error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Update sync config
 * PUT /api/v1/qms/connections/:id/sync-config
 */
const updateSyncConfig = async (req, res) => {
  try {
    const config = await connectionService.updateSyncConfig(
      req.params.id,
      req.user?.tenantId,
      req.body,
      req.user?.id
    );

    res.status(200).json({ success: true, data: config });
  } catch (error) {
    console.error('[QMSController] updateSyncConfig error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// ==================== Sync Operations ====================

/**
 * Trigger sync
 * POST /api/v1/qms/connections/:id/sync
 */
const triggerSync = async (req, res) => {
  try {
    const { entityTypes, direction, fullSync } = req.body;

    const job = await syncService.triggerSync(
      req.params.id,
      req.user?.tenantId,
      {
        entityTypes,
        direction,
        fullSync,
        userId: req.user?.id
      }
    );

    res.status(202).json({
      success: true,
      data: job,
      message: 'Sync job started'
    });
  } catch (error) {
    console.error('[QMSController] triggerSync error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Get sync status
 * GET /api/v1/qms/connections/:id/sync/status
 */
const getSyncStatus = async (req, res) => {
  try {
    const status = await syncService.getSyncStatus(
      req.params.id,
      req.user?.tenantId
    );

    res.status(200).json({ success: true, data: status });
  } catch (error) {
    console.error('[QMSController] getSyncStatus error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Get sync history
 * GET /api/v1/qms/connections/:id/sync/history
 */
const getSyncHistory = async (req, res) => {
  try {
    const { page, limit } = req.query;

    const result = await syncService.getSyncHistory(
      req.params.id,
      req.user?.tenantId,
      { page: parseInt(page) || 1, limit: parseInt(limit) || 20 }
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[QMSController] getSyncHistory error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Get sync job
 * GET /api/v1/qms/sync/jobs/:jobId
 */
const getSyncJob = async (req, res) => {
  try {
    const job = await syncService.getSyncJob(
      req.params.jobId,
      req.user?.tenantId
    );

    if (!job) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Sync job not found' }
      });
    }

    res.status(200).json({ success: true, data: job });
  } catch (error) {
    console.error('[QMSController] getSyncJob error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Cancel sync job
 * POST /api/v1/qms/sync/jobs/:jobId/cancel
 */
const cancelSync = async (req, res) => {
  try {
    const result = await syncService.cancelSync(
      req.params.jobId,
      req.user?.tenantId,
      req.user?.id
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[QMSController] cancelSync error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

/**
 * Get sync errors
 * GET /api/v1/qms/connections/:id/sync/errors
 */
const getSyncErrors = async (req, res) => {
  try {
    const { page, limit, status } = req.query;

    const result = await syncService.getSyncErrors(
      req.params.id,
      req.user?.tenantId,
      { page: parseInt(page) || 1, limit: parseInt(limit) || 50, status }
    );

    res.status(200).json({ success: true, ...result });
  } catch (error) {
    console.error('[QMSController] getSyncErrors error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

// ==================== Conflict Resolution ====================

/**
 * Resolve conflict
 * POST /api/v1/qms/conflicts/:conflictId/resolve
 */
const resolveConflict = async (req, res) => {
  try {
    const { resolution } = req.body;

    if (!resolution) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_INPUT', message: 'resolution is required' }
      });
    }

    const result = await syncService.resolveConflict(
      req.params.conflictId,
      req.user?.tenantId,
      resolution,
      req.user?.id
    );

    res.status(200).json({ success: true, data: result });
  } catch (error) {
    console.error('[QMSController] resolveConflict error:', error.message);
    res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

module.exports = {
  getSupportedSystems,
  getSystemDetails,
  createConnection,
  listConnections,
  getConnection,
  updateConnection,
  deleteConnection,
  testConnection,
  getEntityFields,
  getMappings,
  updateMappings,
  getSyncConfig,
  updateSyncConfig,
  triggerSync,
  getSyncStatus,
  getSyncHistory,
  getSyncJob,
  cancelSync,
  getSyncErrors,
  resolveConflict
};
