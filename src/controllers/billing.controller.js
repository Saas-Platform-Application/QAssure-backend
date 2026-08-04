/**
 * Billing Controller
 * API endpoints for billing management (invoices, payments, pricing)
 */

const { getBillingService } = require('../services/billing.service');

class BillingController {

  // =====================================================
  // PRICING PLANS
  // =====================================================

  /**
   * Get all pricing plans
   * GET /api/v1/billing/pricing-plans
   */
  async getPricingPlans(req, res) {
    try {
      const service = getBillingService();
      const options = {
        application: req.query.application,
        tier: req.query.tier,
        is_active: req.query.is_active !== 'false',
        is_public: req.query.is_public === 'true' ? true : undefined
      };

      const plans = await service.getPricingPlans(options);

      res.json({
        success: true,
        data: plans
      });
    } catch (error) {
      console.error('[Billing] GetPricingPlans error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get pricing plan by ID
   * GET /api/v1/billing/pricing-plans/:id
   */
  async getPricingPlanById(req, res) {
    try {
      const service = getBillingService();
      const plan = await service.getPricingPlanById(req.params.id);

      if (!plan) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Pricing plan not found' }
        });
      }

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('[Billing] GetPricingPlanById error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * Create pricing plan (Super Admin)
   * POST /api/v1/billing/pricing-plans
   */
  async createPricingPlan(req, res) {
    try {
      const service = getBillingService();
      const plan = await service.createPricingPlan(req.body);

      res.status(201).json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('[Billing] CreatePricingPlan error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * Update pricing plan (Super Admin)
   * PUT /api/v1/billing/pricing-plans/:id
   */
  async updatePricingPlan(req, res) {
    try {
      const service = getBillingService();
      const plan = await service.updatePricingPlan(req.params.id, req.body);

      res.json({
        success: true,
        data: plan
      });
    } catch (error) {
      console.error('[Billing] UpdatePricingPlan error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      });
    }
  }

  // =====================================================
  // INVOICES
  // =====================================================

  /**
   * Create invoice (Super Admin)
   * POST /api/v1/billing/invoices
   */
  async createInvoice(req, res) {
    try {
      const service = getBillingService();
      const invoice = await service.createInvoice(req.body, req.user.id);

      res.status(201).json({
        success: true,
        data: invoice
      });
    } catch (error) {
      console.error('[Billing] CreateInvoice error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * List invoices
   * GET /api/v1/billing/invoices
   */
  async listInvoices(req, res) {
    try {
      const service = getBillingService();
      
      // Tenant admins can only see their own invoices
      const options = {
        tenant_id: req.user.role === 'Super Admin' ? req.query.tenant_id : req.user.tenantId,
        license_id: req.query.license_id,
        status: req.query.status,
        from_date: req.query.from_date,
        to_date: req.query.to_date,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await service.listInvoices(options);

      res.json({
        success: true,
        data: result.invoices,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[Billing] ListInvoices error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get invoice by ID
   * GET /api/v1/billing/invoices/:id
   */
  async getInvoiceById(req, res) {
    try {
      const service = getBillingService();
      const invoice = await service.getInvoiceById(req.params.id);

      if (!invoice) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Invoice not found' }
        });
      }

      // Check access
      if (req.user.role !== 'Super Admin' && invoice.tenant_id !== req.user.tenantId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }

      res.json({
        success: true,
        data: invoice
      });
    } catch (error) {
      console.error('[Billing] GetInvoiceById error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * Send invoice (Super Admin)
   * POST /api/v1/billing/invoices/:id/send
   */
  async sendInvoice(req, res) {
    try {
      const service = getBillingService();
      const invoice = await service.sendInvoice(req.params.id, req.user.id);

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice sent successfully'
      });
    } catch (error) {
      console.error('[Billing] SendInvoice error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'SEND_ERROR', message: error.message }
      });
    }
  }

  /**
   * Void invoice (Super Admin)
   * POST /api/v1/billing/invoices/:id/void
   */
  async voidInvoice(req, res) {
    try {
      const service = getBillingService();
      const invoice = await service.voidInvoice(req.params.id, req.user.id);

      res.json({
        success: true,
        data: invoice,
        message: 'Invoice voided successfully'
      });
    } catch (error) {
      console.error('[Billing] VoidInvoice error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'VOID_ERROR', message: error.message }
      });
    }
  }

  // =====================================================
  // PAYMENTS
  // =====================================================

  /**
   * Record payment (Super Admin)
   * POST /api/v1/billing/payments
   */
  async recordPayment(req, res) {
    try {
      const service = getBillingService();
      const payment = await service.recordPayment(req.body, req.user.id, req.user.tenantId);

      res.status(201).json({
        success: true,
        data: payment,
        message: 'Payment recorded successfully'
      });
    } catch (error) {
      console.error('[Billing] RecordPayment error:', error.message);
      res.status(400).json({
        success: false,
        error: { code: 'PAYMENT_ERROR', message: error.message }
      });
    }
  }

  /**
   * List payments
   * GET /api/v1/billing/payments
   */
  async listPayments(req, res) {
    try {
      const service = getBillingService();
      
      // Tenant admins can only see their own payments
      const options = {
        tenant_id: req.user.role === 'Super Admin' ? req.query.tenant_id : req.user.tenantId,
        invoice_id: req.query.invoice_id,
        status: req.query.status,
        from_date: req.query.from_date,
        to_date: req.query.to_date,
        page: parseInt(req.query.page) || 1,
        limit: parseInt(req.query.limit) || 20
      };

      const result = await service.listPayments(options);

      res.json({
        success: true,
        data: result.payments,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('[Billing] ListPayments error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * Get payment by ID
   * GET /api/v1/billing/payments/:id
   */
  async getPaymentById(req, res) {
    try {
      const service = getBillingService();
      const payment = await service.getPaymentById(req.params.id);

      if (!payment) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Payment not found' }
        });
      }

      // Check access
      if (req.user.role !== 'Super Admin' && payment.tenant_id !== req.user.tenantId) {
        return res.status(403).json({
          success: false,
          error: { code: 'FORBIDDEN', message: 'Access denied' }
        });
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      console.error('[Billing] GetPaymentById error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  // =====================================================
  // BILLING SUMMARY
  // =====================================================

  /**
   * Get billing summary for current tenant
   * GET /api/v1/billing/summary
   */
  async getBillingSummary(req, res) {
    try {
      const service = getBillingService();
      const tenantId = req.user.role === 'Super Admin' && req.query.tenant_id 
        ? req.query.tenant_id 
        : req.user.tenantId;

      const summary = await service.getTenantBillingSummary(tenantId);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('[Billing] GetBillingSummary error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  // =====================================================
  // REVENUE REPORTS (Super Admin)
  // =====================================================

  /**
   * Get revenue summary
   * GET /api/v1/billing/revenue
   */
  async getRevenueSummary(req, res) {
    try {
      const service = getBillingService();
      const options = {
        from_date: req.query.from_date,
        to_date: req.query.to_date,
        group_by: req.query.group_by || 'month'
      };

      const summary = await service.getRevenueSummary(options);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      console.error('[Billing] GetRevenueSummary error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }
}

module.exports = new BillingController();
