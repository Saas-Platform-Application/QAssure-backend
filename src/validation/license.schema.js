const { z } = require('zod');

// Create schema for License
const CreateLicenseSchema = z.object({
  tenant_id: z.string().uuid("tenant_id must be a valid UUID"),
  
  application: z.string().min(1, "application is required").max(50, "application must be at most 50 characters"),
  
  license_type: z.string().max(50, "license_type must be at most 50 characters").default("subscription"),
  
  tier: z.string().min(1, "tier is required").max(50, "tier must be at most 50 characters"),
  
  starts_at: z.coerce.date().optional().nullable(),
  
  expires_at: z.coerce.date().optional().nullable(),
  
  limits: z.object({
    max_users: z.number().int().min(0).optional().nullable(),
    max_projects: z.number().int().min(0).optional().nullable(),
    max_ai_tokens: z.number().int().min(0).optional().nullable(),
    max_storage_gb: z.number().int().min(0).optional().nullable(),
    max_api_calls: z.number().int().min(0).optional().nullable(),
  }).optional().nullable(),
  
  features: z.union([
    z.array(z.string()),
    z.record(z.boolean())
  ]).optional().nullable(),
  
  auto_renew: z.boolean().default(false),
  
  billing_cycle: z.enum(["monthly", "annual"]).default("annual"),
  
  base_price: z.number().positive().optional().nullable(),
  
  notes: z.string().optional().nullable(),
});

// Update schema - only includes fields that can be updated
// Based on license.service.js update() method
const UpdateLicenseSchema = z.object({
  tier: z.string().max(50, "tier must be at most 50 characters").optional(),
  
  expires_at: z.coerce.date().optional().nullable(),
  
  limits: z.object({
    max_users: z.number().int().min(0).optional().nullable(),
    max_projects: z.number().int().min(0).optional().nullable(),
    max_ai_tokens: z.number().int().min(0).optional().nullable(),
    max_storage_gb: z.number().int().min(0).optional().nullable(),
    max_api_calls: z.number().int().min(0).optional().nullable(),
  }).optional().nullable(),
  
  features: z.union([
    z.array(z.string()),
    z.record(z.boolean())
  ]).optional().nullable(),
  
  auto_renew: z.boolean().optional(),
  
  notes: z.string().optional().nullable(),
  
  status: z.enum(["pending", "active", "warning", "grace", "suspended", "revoked", "expired"]).optional(),
}).partial(); // Make all fields optional for partial updates

// License params schema
const LicenseParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

// Tenant ID params schema
const TenantIdParamsSchema = z.object({
  tenantId: z.string().uuid("tenantId must be a valid UUID"),
});

// Activate license schema
const ActivateLicenseSchema = z.object({
  license_key: z.string().min(1, "license_key is required").max(100, "license_key must be at most 100 characters"),
  instance_id: z.string().max(255, "instance_id must be at most 255 characters").optional().nullable(),
  device_fingerprint: z.string().max(255, "device_fingerprint must be at most 255 characters").optional().nullable(),
});

// Validate license schema
const ValidateLicenseSchema = z.object({
  license_id: z.string().uuid("license_id must be a valid UUID"),
});

// Check feature schema
const CheckFeatureSchema = z.object({
  license_id: z.string().uuid("license_id must be a valid UUID"),
  feature: z.string().min(1, "feature is required"),
});

// Revoke license schema
const RevokeLicenseSchema = z.object({
  reason: z.string().min(1, "Revocation reason is required"),
});

module.exports = {
  CreateLicenseSchema,
  UpdateLicenseSchema,
  LicenseParamsSchema,
  TenantIdParamsSchema,
  ActivateLicenseSchema,
  ValidateLicenseSchema,
  CheckFeatureSchema,
  RevokeLicenseSchema,
};
