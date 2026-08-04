const { z } = require('zod');

// =====================================================
// PRICING PLANS
// =====================================================

// Create schema for Pricing Plan
const CreatePricingPlanSchema = z.object({
  code: z.string().min(1, "code is required").max(50, "code must be at most 50 characters"),
  
  name: z.string().min(1, "name is required").max(100, "name must be at most 100 characters"),
  
  description: z.string().optional().nullable(),
  
  application: z.string().max(50, "application must be at most 50 characters").optional(),
  
  applications: z.array(z.string()).optional(),
  
  license_tier: z.string().max(50, "license_tier must be at most 50 characters").optional().nullable(),
  
  base_price: z.number().positive("base_price must be a positive number").optional(),
  
  price_monthly: z.number().positive("price_monthly must be a positive number").optional(),
  
  price_yearly: z.number().positive("price_yearly must be a positive number").optional(),
  
  currency: z.string().length(3, "currency must be 3 characters").default("USD"),
  
  billing_cycle: z.enum(["monthly", "annual"]).default("annual"),
  
  features: z.union([
    z.array(z.string()),
    z.record(z.union([z.boolean(), z.number()]))
  ]).optional().nullable(),
  
  limits: z.record(z.union([z.number(), z.string()])).optional().nullable(),
  
  is_active: z.boolean().default(true),
  
  is_public: z.boolean().default(true),
}).refine(
  (data) => data.application || (data.applications && data.applications.length > 0),
  { message: "application is required (or provide applications array)" }
).refine(
  (data) => data.base_price || data.price_monthly || data.price_yearly,
  { message: "base_price is required (or provide price_monthly/price_yearly)" }
);

// Update schema for Pricing Plan
// Based on allowedFields in billing.service.js: ['name', 'description', 'base_price', 'currency', 'billing_cycle', 'features', 'limits', 'is_active', 'is_public']
const UpdatePricingPlanSchema = z.object({
  name: z.string().max(100, "name must be at most 100 characters").optional(),
  
  description: z.string().optional().nullable(),
  
  base_price: z.number().positive("base_price must be a positive number").optional(),
  
  currency: z.string().length(3, "currency must be 3 characters").optional(),
  
  billing_cycle: z.enum(["monthly", "annual"]).optional(),
  
  features: z.union([
    z.array(z.string()),
    z.record(z.union([z.boolean(), z.number()]))
  ]).optional().nullable(),
  
  limits: z.record(z.union([z.number(), z.string()])).optional().nullable(),
  
  is_active: z.boolean().optional(),
  
  is_public: z.boolean().optional(),
}).partial().refine(
  (data) => Object.keys(data).length > 0,
  { message: "No fields to update" }
);

// =====================================================
// INVOICES
// =====================================================

// Invoice line item schema
const InvoiceLineItemSchema = z.object({
  description: z.string().min(1, "description is required"),
  quantity: z.number().int().positive("quantity must be a positive integer").default(1),
  unit_price: z.number().nonnegative("unit_price must be non-negative"),
  amount: z.number().nonnegative("amount must be non-negative").optional(),
  period_start: z.coerce.date().optional().nullable(),
  period_end: z.coerce.date().optional().nullable(),
  pricing_plan_id: z.string().uuid("pricing_plan_id must be a valid UUID").optional().nullable(),
  license_id: z.string().uuid("license_id must be a valid UUID").optional().nullable(),
  item_type: z.string().max(50, "item_type must be at most 50 characters").default("license"),
});

// Create schema for Invoice
const CreateInvoiceSchema = z.object({
  tenant_id: z.string().uuid("tenant_id must be a valid UUID"),
  
  license_id: z.string().uuid("license_id must be a valid UUID").optional().nullable(),
  
  due_date: z.coerce.date("due_date must be a valid date"),
  
  period_start: z.coerce.date("period_start must be a valid date").optional().nullable(),
  
  period_end: z.coerce.date("period_end must be a valid date").optional().nullable(),
  
  line_items: z.array(InvoiceLineItemSchema).min(1, "At least one line item is required"),
  
  tax_rate: z.number().min(0).max(100, "tax_rate must be between 0 and 100").default(0),
  
  discount_amount: z.number().nonnegative("discount_amount must be non-negative").default(0),
  
  discount_reason: z.string().optional().nullable(),
  
  notes: z.string().optional().nullable(),
  
  terms: z.string().optional().nullable(),
  
  billing_name: z.string().max(255, "billing_name must be at most 255 characters").optional().nullable(),
  
  billing_email: z.string().email("billing_email must be a valid email").optional().nullable(),
  
  billing_address: z.record(z.any()).optional().nullable(),
});

// =====================================================
// PAYMENTS
// =====================================================

// Create schema for Payment
// Based on billing.service.js recordPayment method
const CreatePaymentSchema = z.object({
  invoice_id: z.string().uuid("invoice_id must be a valid UUID").optional().nullable(),
  
  tenant_id: z.string().uuid("tenant_id must be a valid UUID").optional().nullable(),
  
  amount: z.number().positive("amount must be a positive number"),
  
  currency: z.string().length(3, "currency must be 3 characters").default("USD"),
  
  payment_method: z.string().min(1, "payment_method is required").max(50, "payment_method must be at most 50 characters"),
  
  reference_number: z.string().max(255, "reference_number must be at most 255 characters").optional().nullable(),
  
  transaction_id: z.string().max(255, "transaction_id must be at most 255 characters").optional().nullable(),
  
  bank_name: z.string().max(255, "bank_name must be at most 255 characters").optional().nullable(),
  
  transaction_date: z.coerce.date().optional().nullable(),
  
  payment_date: z.coerce.date().optional().nullable(),
  
  notes: z.string().optional().nullable(),
}).refine(
  (data) => data.invoice_id || data.tenant_id,
  { message: "tenant_id is required (provide directly or via invoice_id)" }
);

// =====================================================
// PARAMS SCHEMAS
// =====================================================

// Generic ID params schema
const IdParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

module.exports = {
  CreatePricingPlanSchema,
  UpdatePricingPlanSchema,
  CreateInvoiceSchema,
  CreatePaymentSchema,
  IdParamsSchema,
};
