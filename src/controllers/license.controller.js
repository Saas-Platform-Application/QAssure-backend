/**
 * License Controller
 * API endpoints for license management
 */

const { getLicenseService } = require('../services/license.service');

class LicenseController {
  
  // =====================================================
  // LICENSE CRUD (Super Admin)
  // =====================================================

  /**
   * Create a new license
   * POST /api/v1/licenses
   */
  async create(req, res) {
    try {
      const service = getLicenseService();
      const license = await service.create(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: license
      });
    } catch (error) {
      console.error('[License] Create error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * List all licenses
   * GET /api/v1/licenses
   */
  async list(req, res) {
    try {
      const service = getLicenseService();
      const options = {
        tenant_id: req.query.tenant_id,
        application: req.query.application,
        status: req.query.status,
        tier: req.query.tier,
        license_type: req.query.license_type,
        search: req.query.search,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20,
        sort_by: req.query.sort_by,
        sort_order: req.query.sort_order
      };

      const result = await service.list(options);

      res.json({
        success: true,
        data: result.licenses,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[License] List error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'LIST_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get license by ID
   * GET /api/v1/licenses/:id
   */
  async getById(req, res) {
    try {
      const service = getLicenseService();
      const license = await service.getById(req.params.id);

      if (!license) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'License not found' }
        });
      }

      res.json({
        success: true,
        data: license
      });
    } catch (error) {
      console.error('[License] GetById error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * Update license
   * PUT /api/v1/licenses/:id
   */
  async update(req, res) {
    try {
      const service = getLicenseService();
      const license = await service.update(req.params.id, req.body, req.user.id);

      res.json({
        success: true,
        data: license
      });
    } catch (error) {
      console.error('[License] Update error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * Revoke license
   * POST /api/v1/licenses/:id/revoke
   */
  async revoke(req, res) {
    try {
      const service = getLicenseService();
      const { reason } = req.body;

      const license = await service.revoke(req.params.id, reason, req.user.id);

      res.json({
        success: true,
        data: license,
        message: 'License revoked successfully'
      });
    } catch (error) {
      console.error('[License] Revoke error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'REVOKE_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get licenses for a tenant
   * GET /api/v1/licenses/tenant/:tenantId
   */
  async getByTenant(req, res) {
    try {
      const service = getLicenseService();
      const licenses = await service.getByTenant(req.params.tenantId);

      res.json({
        success: true,
        data: licenses
      });
    } catch (error) {
      console.error('[License] GetByTenant error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  // =====================================================
  // LICENSE ACTIVATION (Tenant Admin)
  // =====================================================

  /**
   * Activate a license
   * POST /api/v1/licenses/activate
   */
  async activate(req, res) {
    try {
      const service = getLicenseService();
      const { license_key, instance_id, device_fingerprint } = req.body;

      const activationData = {
        method: 'manual',
        ip_address: req.ip,
        user_agent: req.get('User-Agent'),
        instance_id,
        device_fingerprint
      };

      const license = await service.activate(
        license_key,
        req.user.tenantId,
        req.user.id,
        activationData
      );

      res.json({
        success: true,
        data: license,
        message: 'License activated successfully'
      });
    } catch (error) {
      console.error('[License] Activate error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'ACTIVATION_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get my tenant's licenses
   * GET /api/v1/licenses/my
   */
  async getMyLicenses(req, res) {
    try {
      const service = getLicenseService();
      const licenses = await service.getByTenant(req.user.tenantId);

      res.json({
        success: true,
        data: licenses
      });
    } catch (error) {
      console.error('[License] GetMyLicenses error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  // =====================================================
  // LICENSE VALIDATION & ENFORCEMENT
  // =====================================================

  /**
   * Validate a license
   * POST /api/v1/licenses/validate
   */
  async validate(req, res) {
    try {
      const service = getLicenseService();
      const { license_id } = req.body;

      const isValid = await service.validate(license_id);
      const enforcementLevel = await service.getEnforcementLevel(license_id);

      res.json({
        success: true,
        data: {
          is_valid: isValid,
          enforcement_level: enforcementLevel
        }
      });
    } catch (error) {
      console.error('[License] Validate error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message }
      });
    }
  }

  /**
   * Check if feature is allowed
   * POST /api/v1/licenses/check-feature
   */
  async checkFeature(req, res) {
    try {
      const service = getLicenseService();
      const { license_id, feature } = req.body;

      const result = await service.checkFeature(license_id, feature);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[License] CheckFeature error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'CHECK_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get license usage and limits
   * GET /api/v1/licenses/:id/usage
   */
  async getUsage(req, res) {
    try {
      const service = getLicenseService();
      
      // Check tenant access
      const license = await service.getById(req.params.id);
      if (!license) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'License not found' }
        });
      }

      // Tenant admins can only see their own licenses
      const isSuperAdmin = req.user.role === 'super_admin' || req.user.roles?.includes('super_admin');
      if (!isSuperAdmin && license.tenant_id !== req.user.tenantId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }

      const limits = await service.checkLimits(req.params.id);
      const usage = await service.getUsage(req.params.id);

      res.json({
        success: true,
        data: {
          license_id: req.params.id,
          limits,
          current_usage: usage,
          enforcement_level: await service.getEnforcementLevel(req.params.id)
        }
      });
    } catch (error) {
      console.error('[License] GetUsage error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  // =====================================================
  // REFERENCE DATA
  // =====================================================

  /**
   * Get license types
   * GET /api/v1/licenses/types
   */
  async getTypes(req, res) {
    try {
      const service = getLicenseService();
      const types = await service.getLicenseTypes();

      res.json({
        success: true,
        data: types
      });
    } catch (error) {
      console.error('[License] GetTypes error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get license tiers
   * GET /api/v1/licenses/tiers
   */
  async getTiers(req, res) {
    try {
      const service = getLicenseService();
      const tiers = await service.getLicenseTiers();

      res.json({
        success: true,
        data: tiers
      });
    } catch (error) {
      console.error('[License] GetTiers error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get licensable applications
   * GET /api/v1/licenses/applications
   */
  async getApplications(req, res) {
    try {
      const service = getLicenseService();
      const applications = await service.getApplications();

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      console.error('[License] GetApplications error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  // =====================================================
  // AUDIT LOG
  // =====================================================

  /**
   * Get license audit log
   * GET /api/v1/licenses/:id/audit
   */
  async getAuditLog(req, res) {
    try {
      const service = getLicenseService();
      const options = {
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 50
      };

      const auditLog = await service.getAuditLog(req.params.id, options);

      res.json({
        success: true,
        data: auditLog
      });
    } catch (error) {
      console.error('[License] GetAuditLog error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }
}

module.exports = new LicenseController();
