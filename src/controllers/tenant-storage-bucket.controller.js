/**
 * Tenant Storage Bucket Controller — QAssure Platform
 */

const { getTenantStorageBucketService } = require('../services/tenant-storage-bucket.service');

class TenantStorageBucketController {

  // ============================================================================
  // LIST
  // ============================================================================

  async list(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const isSuperAdmin = !!req.user.isSuperAdmin;
      const tenantId = req.user.tenantId;

      const buckets = await service.listBuckets(tenantId, isSuperAdmin);
      res.json({ success: true, data: buckets });
    } catch (error) {
      this._handleError(res, error, 'LIST_ERROR');
    }
  }

  // ============================================================================
  // GET BY ID
  // ============================================================================

  async getById(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const { id } = req.params;
      const isSuperAdmin = !!req.user.isSuperAdmin;
      const tenantId = req.user.tenantId;

      const bucket = await service.getBucketById(id, tenantId, isSuperAdmin);
      if (!bucket) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Bucket not found' },
        });
      }

      res.json({ success: true, data: bucket });
    } catch (error) {
      this._handleError(res, error, 'FETCH_ERROR');
    }
  }

  // ============================================================================
  // CREATE
  // ============================================================================

  async create(req, res) {
    try {
      const service = getTenantStorageBucketService();
      // owner_tenant_id is always the requester's own tenant — never trusted from body
      const ownerTenantId = req.user.tenantId;
      const createdBy = req.user.id;

      const bucket = await service.createBucket(req.body, ownerTenantId, createdBy);
      res.status(201).json({ success: true, data: bucket });
    } catch (error) {
      this._handleError(res, error, 'CREATE_ERROR');
    }
  }

  // ============================================================================
  // UPDATE
  // ============================================================================

  async update(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const { id } = req.params;
      const isSuperAdmin = !!req.user.isSuperAdmin;
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;

      const bucket = await service.updateBucket(id, req.body, updatedBy, tenantId, isSuperAdmin);
      res.json({ success: true, data: bucket });
    } catch (error) {
      this._handleError(res, error, 'UPDATE_ERROR');
    }
  }

  // ============================================================================
  // DELETE (soft)
  // ============================================================================

  async delete(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const { id } = req.params;
      const isSuperAdmin = !!req.user.isSuperAdmin;

      await service.deleteBucket(id, req.user.id, isSuperAdmin);
      res.json({ success: true, data: { message: 'Bucket deactivated successfully' } });
    } catch (error) {
      this._handleError(res, error, 'DELETE_ERROR');
    }
  }

  // ============================================================================
  // ASSIGN BUCKET TO TENANT
  // ============================================================================

  async assignToTenant(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const { id: bucketId } = req.params;
      const { tenant_id, notes } = req.body;

      if (!tenant_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' },
        });
      }

      const result = await service.assignBucketToTenant(bucketId, tenant_id, req.user.id, notes);
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error, 'ASSIGN_ERROR');
    }
  }

  // ============================================================================
  // SUPER ADMIN: SHARE OWN BUCKET WITH ANOTHER TENANT
  // ============================================================================

  async assignSelfBucket(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const { id: bucketId } = req.params;
      const { tenant_id } = req.body;

      if (!tenant_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'tenant_id is required' },
        });
      }

      const result = await service.assignSelfBucketToTenant(
        bucketId,
        tenant_id,
        req.user.id,
        req.user.tenantId,
      );
      res.json({ success: true, data: result });
    } catch (error) {
      this._handleError(res, error, 'ASSIGN_SELF_ERROR');
    }
  }

  // ============================================================================
  // UNASSIGN BUCKET FROM TENANT
  // ============================================================================

  async unassignFromTenant(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const { tenantId } = req.params;

      await service.unassignBucket(tenantId, req.user.id);
      res.json({ success: true, data: { message: 'Bucket unassigned from tenant' } });
    } catch (error) {
      this._handleError(res, error, 'UNASSIGN_ERROR');
    }
  }

  // ============================================================================
  // GET ACTIVE BUCKET FOR A TENANT
  // ============================================================================

  async getActiveForTenant(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const isSuperAdmin = !!req.user.isSuperAdmin;
      const requesterTenantId = req.user.tenantId;

      // SuperAdmin can query any tenant; regular user only their own
      let tenantId = req.params.tenantId;
      if (!isSuperAdmin) {
        tenantId = requesterTenantId;
      }

      const bucket = await service.getActiveBucketForTenant(tenantId);
      if (!bucket) {
        return res.json({
          success: true,
          data: null,
          message: 'No storage bucket configured for this tenant',
        });
      }

      // For tenant (non-superadmin), return formatted (masked) response
      const { _formatForResponse } = service;
      res.json({ success: true, data: service._formatForResponse(bucket) });
    } catch (error) {
      this._handleError(res, error, 'ACTIVE_FETCH_ERROR');
    }
  }

  // ============================================================================
  // GET ASSIGNMENT HISTORY FOR A TENANT
  // ============================================================================

  async getAssignmentHistory(req, res) {
    try {
      const service = getTenantStorageBucketService();
      const { tenantId } = req.params;

      const history = await service.getAssignmentHistory(tenantId);
      res.json({ success: true, data: history });
    } catch (error) {
      this._handleError(res, error, 'HISTORY_ERROR');
    }
  }

  // ============================================================================
  // INTERNAL
  // ============================================================================

  _handleError(res, error, defaultCode) {
    const clientPatterns = [
      { pattern: /not found/i,      code: 'NOT_FOUND',         status: 404 },
      { pattern: /required/i,       code: 'VALIDATION_ERROR',  status: 400 },
      { pattern: /permission/i,     code: 'FORBIDDEN',         status: 403 },
      { pattern: /inactive/i,       code: 'VALIDATION_ERROR',  status: 400 },
      { pattern: /assigned/i,       code: 'CONFLICT',          status: 409 },
      { pattern: /only.*share/i,    code: 'FORBIDDEN',         status: 403 },
      { pattern: /must be/i,        code: 'VALIDATION_ERROR',  status: 400 },
    ];

    for (const { pattern, code, status } of clientPatterns) {
      if (pattern.test(error.message)) {
        return res.status(status).json({
          success: false,
          error: { code, message: error.message },
        });
      }
    }

    console.error('[TenantStorageBucket] Internal error:', error.message, error.stack);
    res.status(500).json({
      success: false,
      error: { code: defaultCode, message: error.message },
    });
  }
}

module.exports = new TenantStorageBucketController();
