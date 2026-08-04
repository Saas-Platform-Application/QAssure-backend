const { z } = require("zod");

const CreateSupplierSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  legal_name: z.string().optional().nullable(),
  supplier_code: z.string().optional().nullable(),
  supplier_type: z.string().min(1, "Supplier type is required"),
  category: z.string().min(1, "Category is required"),
  risk_level: z.enum(["low", "medium", "high"]).optional().default("low"),
  website: z.string().url("Invalid URL").optional().nullable().or(z.literal("")),
  
  // Primary Contact
  primary_contact_name: z.string().optional().nullable(),
  primary_contact_email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  primary_contact_phone: z.string().optional().nullable(),
  
  // Address
  address_line1: z.string().optional().nullable(),
  address_line2: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  postal_code: z.string().optional().nullable(),
  
  // Business Identifiers
  tax_id: z.string().optional().nullable(),
  duns_number: z.string().optional().nullable(),
  
  // Products & Certifications
  products_services: z.array(z.string()).optional().default([]),
  certifications: z.array(z.object({
    name: z.string(),
    issuing_body: z.string().optional(),
    expiry_date: z.coerce.date().optional().nullable(),
    document_url: z.string().optional().nullable()
  })).optional().default([]),
  
  // Quality Agreement
  quality_agreement_signed: z.boolean().optional().default(false),
  quality_agreement_date: z.coerce.date().optional().nullable(),
});

const UpdateSupplierSchema = CreateSupplierSchema.extend({
  status: z.string().optional(),
  quality_agreement_signed: z.boolean().optional(),
  quality_agreement_date: z.coerce.date().optional().nullable(),
}).partial();

const SupplierIdParamSchema = z.object({
  id: z.string().uuid("Invalid supplier ID"),
});

const AddContactSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  title: z.string().optional().nullable(),
  email: z.string().email("Invalid email").optional().nullable().or(z.literal("")),
  phone: z.string().optional().nullable().or(z.literal("")),
  mobile: z.string().optional().nullable().or(z.literal("")),
  is_primary: z.boolean().optional().default(false),
});

const CreateScorecardSchema = z.object({
  period_start: z.coerce.date(),
  period_end: z.coerce.date(),
  
  // Quality
  quality_score: z.number().min(0).max(100).optional().default(0),
  defect_rate: z.number().optional().default(0),
  lot_acceptance_rate: z.number().optional().default(0),
  complaints_count: z.number().optional().default(0),
  
  // Delivery
  delivery_score: z.number().min(0).max(100).optional().default(0),
  on_time_delivery_rate: z.number().optional().default(0),
  lead_time_adherence: z.number().optional().default(0),
  
  // Service
  service_score: z.number().min(0).max(100).optional().default(0),
  responsiveness_score: z.number().optional().default(0),
  documentation_score: z.number().optional().default(0),
  
  // Cost
  cost_score: z.number().min(0).max(100).optional().default(0),
  price_competitiveness: z.number().optional().default(0),
  
  notes: z.string().optional().nullable(),
});

module.exports = {
  CreateSupplierSchema,
  UpdateSupplierSchema,
  SupplierIdParamSchema,
  AddContactSchema,
  CreateScorecardSchema,
};
