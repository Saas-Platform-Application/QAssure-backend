/**
 * Security Controller
 * Handles password policies, access reviews, and security settings
 * FDA 21 CFR Part 11 Compliance
 */

const { getPasswordPolicyService } = require('../services/password-policy.service');
const { getAccessReviewService, REVIEW_STATUS, DECISION_TYPES } = require('../services/access-review.service');
const { getSecuritySettingsService, COMPLIANCE_MODES } = require('../services/security-settings.service');

class SecurityController {

  // ============================================================================
  // PASSWORD POLICY ENDPOINTS
  // ============================================================================

  /**
   * GET /api/v1/security/password-policy
   * Get password policy for current tenant
   */
  async getPasswordPolicy(req, res) {
    try {
      const service = getPasswordPolicyService();
      const tenantId = req.user.tenantId;

      const policy = await service.getPolicy(tenantId);

      res.json({
        success: true,
        data: policy
      });

    } catch (error) {
      console.error('[Security] Get password policy error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * PUT /api/v1/security/password-policy
   * Update password policy (tenant_admin only)
   */
  async updatePasswordPolicy(req, res) {
    try {
      const service = getPasswordPolicyService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;

      const policy = await service.updatePolicy(tenantId, req.body, updatedBy);

      res.json({
        success: true,
        data: policy
      });

    } catch (error) {
      console.error('[Security] Update password policy error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/password-policy/requirements
   * Get password requirements for UI display
   */
  async getPasswordRequirements(req, res) {
    try {
      const service = getPasswordPolicyService();
      const tenantId = req.user.tenantId;

      const requirements = await service.getPolicyRequirements(tenantId);

      res.json({
        success: true,
        data: requirements
      });

    } catch (error) {
      console.error('[Security] Get requirements error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/security/password-policy/validate
   * Validate a password against policy (for real-time UI feedback)
   */
  async validatePassword(req, res) {
    try {
      const service = getPasswordPolicyService();
      const tenantId = req.user.tenantId;
      const { password, username } = req.body;

      if (!password) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'password is required' }
        });
      }

      const result = await service.validatePassword(tenantId, null, password, username);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[Security] Validate password error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/password-expiry
   * Check password expiry status for current user
   */
  async checkPasswordExpiry(req, res) {
    try {
      const service = getPasswordPolicyService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const result = await service.checkPasswordExpiry(userId, tenantId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[Security] Check expiry error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  // ============================================================================
  // ACCESS REVIEW ENDPOINTS
  // ============================================================================

  /**
   * POST /api/v1/security/access-reviews
   * Create a new access review campaign
   */
  async createAccessReview(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;

      const {
        name,
        description,
        review_type,
        scope_type,
        scope_criteria,
        frequency,
        start_date,
        due_date,
        reviewer_id,
        reviewer_role,
        auto_revoke_on_overdue,
        auto_revoke_after_days
      } = req.body;

      if (!name || !start_date || !due_date) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'name, start_date, and due_date are required' }
        });
      }

      const review = await service.createReview({
        tenantId,
        name,
        description,
        reviewType: review_type,
        scopeType: scope_type,
        scopeCriteria: scope_criteria,
        frequency,
        startDate: start_date,
        dueDate: due_date,
        reviewerId: reviewer_id,
        reviewerRole: reviewer_role,
        autoRevokeOnOverdue: auto_revoke_on_overdue,
        autoRevokeAfterDays: auto_revoke_after_days,
        createdBy
      });

      res.status(201).json({
        success: true,
        data: review
      });

    } catch (error) {
      console.error('[Security] Create access review error:', error.message);
      
      if (error.message.includes('does not exist')) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message }
        });
      }
      
      res.status(500).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/access-reviews
   * List access reviews
   */
  async listAccessReviews(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const { status, limit, offset } = req.query;

      const result = await service.listReviews(tenantId, {
        status,
        limit: parseInt(limit) || 20,
        offset: parseInt(offset) || 0
      });

      res.json({
        success: true,
        data: result.reviews,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });

    } catch (error) {
      console.error('[Security] List access reviews error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/access-reviews/:id
   * Get access review details
   */
  async getAccessReview(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const review = await service.getReview(id, tenantId);

      if (!review) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Access review not found' }
        });
      }

      res.json({
        success: true,
        data: review
      });

    } catch (error) {
      console.error('[Security] Get access review error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/access-reviews/:id/items
   * Get users to review in an access review
   */
  async getAccessReviewItems(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;
      const { decision, limit, offset } = req.query;

      const result = await service.getReviewItems(id, tenantId, {
        decision,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json({
        success: true,
        data: result.items,
        pagination: {
          limit: result.limit,
          offset: result.offset
        }
      });

    } catch (error) {
      console.error('[Security] Get review items error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/security/access-reviews/:id/start
   * Start an access review
   */
  async startAccessReview(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const review = await service.startReview(id, tenantId);

      res.json({
        success: true,
        data: review
      });

    } catch (error) {
      console.error('[Security] Start review error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'START_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/security/access-reviews/:id/populate-items
   * Populate review items for an existing review
   */
  async populateReviewItems(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const result = await service.populateReviewItems(id, tenantId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[Security] Populate items error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'POPULATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/security/access-reviews/:id/items/:itemId/decide
   * Make a decision on a user's access
   */
  async makeAccessDecision(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const decidedBy = req.user.id;
      const { id, itemId } = req.params;
      const { decision, reason, new_roles } = req.body;

      if (!decision) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'decision is required' }
        });
      }

      const result = await service.makeDecision({
        reviewId: id,
        tenantId,
        itemId,
        decision,
        decisionReason: reason,
        newRoles: new_roles,
        decidedBy
      });

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[Security] Make decision error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'DECISION_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/security/access-reviews/:id/bulk-certify
   * Certify all pending users at once
   */
  async bulkCertify(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const decidedBy = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      const result = await service.bulkCertify(id, tenantId, decidedBy, reason);

      res.json({
        success: true,
        data: {
          message: `${result.updated} users certified`,
          updated: result.updated
        }
      });

    } catch (error) {
      console.error('[Security] Bulk certify error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'BULK_CERTIFY_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/security/access-reviews/:id/execute
   * Execute review decisions (actually revoke/modify access)
   */
  async executeAccessReview(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const executedBy = req.user.id;
      const { id } = req.params;

      const result = await service.executeDecisions(id, tenantId, executedBy);

      res.json({
        success: true,
        data: {
          message: 'Access review decisions executed',
          revoked: result.revoked,
          modified: result.modified,
          errors: result.errors
        }
      });

    } catch (error) {
      console.error('[Security] Execute review error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'EXECUTE_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/security/access-reviews/:id/cancel
   * Cancel an access review
   */
  async cancelAccessReview(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const cancelledBy = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      const review = await service.cancelReview(id, tenantId, cancelledBy, reason);

      res.json({
        success: true,
        data: review
      });

    } catch (error) {
      console.error('[Security] Cancel review error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'CANCEL_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/access-reviews/compliance-report
   * Get compliance report for access reviews
   */
  async getAccessReviewReport(req, res) {
    try {
      const service = getAccessReviewService();
      const tenantId = req.user.tenantId;
      const { year } = req.query;

      const report = await service.getComplianceReport(tenantId, {
        year: year ? parseInt(year) : null
      });

      res.json({
        success: true,
        data: report
      });

    } catch (error) {
      console.error('[Security] Access review report error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'REPORT_ERROR', message: error.message }
      });
    }
  }

  // ============================================================================
  // SECURITY SETTINGS ENDPOINTS
  // ============================================================================

  /**
   * GET /api/v1/security/settings
   * Get security settings for current tenant
   */
  async getSecuritySettings(req, res) {
    try {
      const service = getSecuritySettingsService();
      const tenantId = req.user.tenantId;

      const settings = await service.getSettings(tenantId);

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      console.error('[Security] Get settings error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * PUT /api/v1/security/settings
   * Update security settings
   */
  async updateSecuritySettings(req, res) {
    try {
      const service = getSecuritySettingsService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;

      const settings = await service.updateSettings(tenantId, req.body, updatedBy);

      res.json({
        success: true,
        data: settings
      });

    } catch (error) {
      console.error('[Security] Update settings error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/security/settings/compliance-mode
   * Apply a compliance mode preset
   */
  async applyComplianceMode(req, res) {
    try {
      const service = getSecuritySettingsService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { mode } = req.body;

      if (!mode || !COMPLIANCE_MODES[mode.toUpperCase()]) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid mode. Must be one of: ${Object.values(COMPLIANCE_MODES).join(', ')}`
          }
        });
      }

      const settings = await service.applyComplianceMode(tenantId, mode, updatedBy);

      res.json({
        success: true,
        data: {
          message: `Compliance mode '${mode}' applied successfully`,
          settings
        }
      });

    } catch (error) {
      console.error('[Security] Apply compliance mode error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'APPLY_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/settings/compliance-modes
   * Get available compliance modes
   */
  async getComplianceModes(req, res) {
    res.json({
      success: true,
      data: {
        modes: COMPLIANCE_MODES,
        descriptions: {
          fda_part11: 'FDA 21 CFR Part 11 - US pharmaceutical regulations',
          eu_annex11: 'EU Annex 11 - European pharmaceutical regulations',
          hipaa: 'HIPAA - US healthcare data privacy',
          iso_13485: 'ISO 13485 - Medical devices quality management',
          custom: 'Custom settings (no preset applied)'
        }
      }
    });
  }

  /**
   * GET /api/v1/security/settings/compliance-summary
   * Get compliance summary and recommendations
   */
  async getComplianceSummary(req, res) {
    try {
      const service = getSecuritySettingsService();
      const tenantId = req.user.tenantId;

      const summary = await service.getComplianceSummary(tenantId);

      res.json({
        success: true,
        data: summary
      });

    } catch (error) {
      console.error('[Security] Compliance summary error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/settings/export
   * Export security settings for backup/audit
   */
  async exportSettings(req, res) {
    try {
      const service = getSecuritySettingsService();
      const tenantId = req.user.tenantId;

      const exported = await service.exportSettings(tenantId);

      res.json({
        success: true,
        data: exported
      });

    } catch (error) {
      console.error('[Security] Export settings error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'EXPORT_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/security/decision-types
   * Get available access review decision types
   */
  async getDecisionTypes(req, res) {
    res.json({
      success: true,
      data: {
        types: DECISION_TYPES,
        descriptions: {
          CERTIFY: 'User still needs this access',
          REVOKE: 'Remove all access from user',
          MODIFY: 'Change user access level',
          PENDING: 'Decision not yet made'
        }
      }
    });
  }

  /**
   * GET /api/v1/security/review-statuses
   * Get access review status types
   */
  async getReviewStatuses(req, res) {
    res.json({
      success: true,
      data: {
        statuses: REVIEW_STATUS,
        descriptions: {
          pending: 'Review created but not started',
          in_progress: 'Review is being conducted',
          completed: 'All decisions made',
          overdue: 'Past due date with pending decisions',
          cancelled: 'Review was cancelled'
        }
      }
    });
  }
}

module.exports = new SecurityController();
