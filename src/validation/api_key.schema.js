const { z } = require('zod');

// API-level schemas (for controller endpoints)
const CreateApiKeySchema = z.object({
  name: z.string().min(1, "name is required").min(3, "name must be at least 3 characters").max(100, "name must be at most 100 characters"),
  description: z.string().max(500, "description must be at most 500 characters").optional().nullable(),
  permissions: z.array(z.union([
    z.string().regex(/^[a-z_]+:[a-z_]+$/, "permission must be in format 'resource:action'"),
    z.object({
      resource: z.string().min(1),
      action: z.string().min(1)
    })
  ])).optional().default([]),
  expires_at: z.coerce.date().optional().nullable(),
});

const UpdateApiKeySchema = z.object({
  name: z.string().min(3, "name must be at least 3 characters").max(100, "name must be at most 100 characters").optional(),
  description: z.string().max(500, "description must be at most 500 characters").optional().nullable(),
  status: z.enum(["active", "suspended", "revoked"]).optional(),
});

const ValidateApiKeySchema = z.object({
  key: z.string().min(1, "API key is required"),
});

const ApiKeyParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

// Database-level schemas (for direct database operations)
const CreateApikeySchema = z.object({
  key_hash: z.string().min(1, "key_hash is required").max(255, "key_hash must be at most 255 characters"),
  name: z.string().min(1, "name is required").min(3, "name must be at least 3 characters").max(100, "name must be at most 100 characters"),
  description: z.string().max(500, "description must be at most 500 characters").optional().nullable(),
  tenant_id: z.string().uuid(),
  created_by: z.string().uuid(),
  status: z.enum(["active", "suspended", "revoked"]),
  rate_limit: z.number().int().min(1, "rate_limit must be at least 1").optional().nullable(),
  ip_allowlist: z.any().optional().nullable(),
  last_used_at: z.coerce.date().optional().nullable(),
  last_used_ip: z.string().max(45, "last_used_ip must be at most 45 characters").optional().nullable(),
  usage_count: z.number().int().optional().nullable(),
  expires_at: z.coerce.date().optional().nullable(),
});

const UpdateApikeySchema = CreateApikeySchema.partial();

const ApikeyParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  // API-level schemas (for routes/controllers)
  CreateApiKeySchema,
  UpdateApiKeySchema,
  ValidateApiKeySchema,
  ApiKeyParamsSchema,
  // Database-level schemas (for services)
  CreateApikeySchema,
  UpdateApikeySchema,
  ApikeyParamsSchema,
};
