/**
 * Electronic Signature Controller
 * FDA 21 CFR Part 11 Compliant Electronic Signatures
 */

const { getElectronicSignatureService, SIGNATURE_ACTIONS } = require('../services/electronic-signature.service');

class ElectronicSignatureController {
  
  /**
   * POST /api/v1/electronic-signatures/sign
   * Create an electronic signature
   */
  async sign(req, res) {
    try {
      const service = getElectronicSignatureService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const {
        resource_type,
        resource_id,
        resource_name,
        action,
        meaning,
        password,
        pin,
        auth_method,
        signature_order,
        required_signatures,
        workflow_id
      } = req.body;

      const signature = await service.sign({
        userId,
        tenantId,
        resourceType: resource_type,
        resourceId: resource_id,
        resourceName: resource_name,
        action,
        meaning,
        password,
        pin,
        authMethod: auth_method,
        signatureOrder: signature_order,
        requiredSignatures: required_signatures,
        workflowId: workflow_id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        deviceInfo: {
          browser: req.get('User-Agent'),
          platform: req.get('Sec-CH-UA-Platform')
        }
      });

      res.status(201).json({
        success: true,
        data: signature
      });

    } catch (error) {
      console.error('[ElectronicSignature] Sign error:', error.message);
      
      // Handle specific errors
      if (error.message.includes('Invalid password') || error.message.includes('Invalid signature PIN')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: error.message
          }
        });
      }

      if (error.message.includes('already signed')) {
        return res.status(409).json({
          success: false,
          error: {
            code: 'DUPLICATE_SIGNATURE',
            message: error.message
          }
        });
      }

      if (error.message.includes('PIN not set')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'PIN_NOT_SET',
            message: error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'SIGNATURE_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * POST /api/v1/electronic-signatures/verify
   * Verify a signature is valid
   */
  async verify(req, res) {
    try {
      const service = getElectronicSignatureService();
      const tenantId = req.user.tenantId;
      const { signature_id } = req.body;

      const result = await service.verify(signature_id, tenantId);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[ElectronicSignature] Verify error:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'VERIFICATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * GET /api/v1/electronic-signatures/resource/:resourceType/:resourceId
   * Get signatures for a resource
   */
  async getResourceSignatures(req, res) {
    try {
      const service = getElectronicSignatureService();
      const tenantId = req.user.tenantId;
      const { resourceType, resourceId } = req.params;

      const signatures = await service.getResourceSignatures(resourceType, resourceId, tenantId);

      res.json({
        success: true,
        data: {
          resource: {
            type: resourceType,
            id: resourceId
          },
          signatures,
          count: signatures.length
        }
      });

    } catch (error) {
      console.error('[ElectronicSignature] Get resource signatures error:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * GET /api/v1/electronic-signatures/history
   * Get current user's signature history
   */
  async getUserHistory(req, res) {
    try {
      const service = getElectronicSignatureService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;

      const { limit, offset, resource_type, action, start_date, end_date } = req.query;

      const result = await service.getUserSignatures(userId, tenantId, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        resourceType: resource_type,
        action,
        startDate: start_date,
        endDate: end_date
      });

      res.json({
        success: true,
        data: result.signatures,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });

    } catch (error) {
      console.error('[ElectronicSignature] Get history error:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * GET /api/v1/electronic-signatures/:id
   * Get a specific signature
   */
  async getSignature(req, res) {
    try {
      const service = getElectronicSignatureService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const result = await service.verify(id, tenantId);

      if (!result.valid && result.reason === 'Signature not found') {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Signature not found'
          }
        });
      }

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[ElectronicSignature] Get signature error:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * POST /api/v1/electronic-signatures/:id/invalidate
   * Invalidate a signature (super_admin only)
   */
  async invalidate(req, res) {
    try {
      const service = getElectronicSignatureService();
      const tenantId = req.user.tenantId;
      const invalidatedBy = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      const result = await service.invalidate(id, tenantId, invalidatedBy, reason);

      res.json({
        success: true,
        data: {
          message: 'Signature invalidated successfully',
          signature_id: id,
          invalidated_at: result.invalidated_at
        }
      });

    } catch (error) {
      console.error('[ElectronicSignature] Invalidate error:', error.message);

      if (error.message.includes('not found')) {
        return res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'INVALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * POST /api/v1/electronic-signatures/pin
   * Set or update signature PIN
   */
  async setPin(req, res) {
    try {
      const service = getElectronicSignatureService();
      const userId = req.user.id;
      const tenantId = req.user.tenantId;
      const { password, pin } = req.body;

      const result = await service.setPin(userId, tenantId, password, pin);

      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.error('[ElectronicSignature] Set PIN error:', error.message);

      if (error.message.includes('Invalid password')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_FAILED',
            message: error.message
          }
        });
      }

      if (error.message.includes('PIN must be')) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: error.message
          }
        });
      }

      res.status(500).json({
        success: false,
        error: {
          code: 'PIN_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * GET /api/v1/electronic-signatures/workflow/:workflowId/status
   * Check workflow completion status
   */
  async getWorkflowStatus(req, res) {
    try {
      const service = getElectronicSignatureService();
      const tenantId = req.user.tenantId;
      const { workflowId } = req.params;

      const result = await service.checkWorkflowComplete(workflowId, tenantId);

      res.json({
        success: true,
        data: {
          workflow_id: workflowId,
          complete: result.complete,
          current_signatures: result.current,
          required_signatures: result.required,
          remaining: result.required ? result.required - result.current : null
        }
      });

    } catch (error) {
      console.error('[ElectronicSignature] Workflow status error:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * GET /api/v1/electronic-signatures/statistics
   * Get signature statistics for compliance reporting
   */
  async getStatistics(req, res) {
    try {
      const service = getElectronicSignatureService();
      const tenantId = req.user.tenantId;
      const { start_date, end_date } = req.query;

      const stats = await service.getStatistics(tenantId, {
        startDate: start_date,
        endDate: end_date
      });

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('[ElectronicSignature] Statistics error:', error.message);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATISTICS_ERROR',
          message: error.message
        }
      });
    }
  }

  /**
   * GET /api/v1/electronic-signatures/actions
   * Get available signature actions
   */
  async getActions(req, res) {
    res.json({
      success: true,
      data: {
        actions: Object.keys(SIGNATURE_ACTIONS),
        descriptions: {
          APPROVE: 'Approve a record or document',
          REJECT: 'Reject a record or document',
          REVIEW: 'Mark a record as reviewed',
          AUTHOR: 'Sign as the author of a record',
          VERIFY: 'Verify the accuracy of a record',
          RELEASE: 'Authorize the release of a record',
          ACKNOWLEDGE: 'Acknowledge receipt and understanding',
          WITHDRAW: 'Withdraw a previous signature'
        }
      }
    });
  }
}

module.exports = new ElectronicSignatureController();
