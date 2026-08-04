/**
 * Billing Routes
 * API routes for billing management (invoices, payments, pricing)
 */

const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billing.controller');
const {
  CreatePricingPlanSchema,
  UpdatePricingPlanSchema,
  CreateInvoiceSchema,
  CreatePaymentSchema,
  IdParamsSchema
} = require('../validation/billing.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// Validation middleware helpers
const validateCreatePricingPlan = validate(CreatePricingPlanSchema);
const validateUpdatePricingPlan = validate(UpdatePricingPlanSchema);
const validateCreateInvoice = validate(CreateInvoiceSchema);
const validateCreatePayment = validate(CreatePaymentSchema);
const validateParams = validate(IdParamsSchema, 'params');

// All routes require authentication
router.use(authenticate);

// =====================================================
// PRICING PLANS
// =====================================================

// Get all pricing plans (public info)
router.get('/pricing-plans', billingController.getPricingPlans);

// Get pricing plan by ID
router.get('/pricing-plans/:id', validateParams, billingController.getPricingPlanById);

// Create pricing plan (Super Admin only)
router.post('/pricing-plans', validateCreatePricingPlan, authorize('pricing_plans', 'write'), billingController.createPricingPlan);

// Update pricing plan (Super Admin only)
router.put('/pricing-plans/:id', validateParams, validateUpdatePricingPlan, authorize('pricing_plans', 'write'), billingController.updatePricingPlan);

// =====================================================
// INVOICES
// =====================================================

// List invoices
router.get('/invoices', authorize('invoices', 'read'), billingController.listInvoices);

// Create invoice (Super Admin only)
router.post('/invoices', validateCreateInvoice, authorize('invoices', 'write'), billingController.createInvoice);

// Get invoice by ID
router.get('/invoices/:id', validateParams, authorize('invoices', 'read'), billingController.getInvoiceById);

// Send invoice (Super Admin only)
router.post('/invoices/:id/send', validateParams, authorize('invoices', 'write'), billingController.sendInvoice);

// Void invoice (Super Admin only)
router.post('/invoices/:id/void', validateParams, authorize('invoices', 'delete'), billingController.voidInvoice);

// =====================================================
// PAYMENTS
// =====================================================

// List payments
router.get('/payments', authorize('payments', 'read'), billingController.listPayments);

// Record payment (Super Admin only)
router.post('/payments', validateCreatePayment, authorize('payments', 'write'), billingController.recordPayment);

// Get payment by ID
router.get('/payments/:id', validateParams, authorize('payments', 'read'), billingController.getPaymentById);

// =====================================================
// BILLING SUMMARY
// =====================================================

// Get billing summary for tenant
router.get('/summary', authorize('billing', 'read'), billingController.getBillingSummary);

// =====================================================
// REVENUE REPORTS (Super Admin only)
// =====================================================

// Get revenue summary
router.get('/revenue', authorize('billing', 'read'), billingController.getRevenueSummary);

module.exports = router;
