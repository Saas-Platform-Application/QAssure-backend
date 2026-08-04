const { z } = require('zod');

// Create schema for Auditlog
const CreateAuditlogSchema = z.object({

  tenant_id: z.string().uuid().optional().nullable(),

  user_id: z.string().uuid().optional().nullable(),

  module_id: z.string().uuid().optional().nullable(),

  action: z.string().max(100),

  resource_type: z.string().max(100),

  resource_id: z.string().max(255, "resource_id must be at most 255 characters").optional().nullable(),

  request_method: z.string().toUpperCase().optional().nullable(),

  request_path: z.string().max(500, "request_path must be at most 500 characters").optional().nullable(),

  request_body: z.any().optional().nullable(),

  response_status: z.number().int().min(100, "response_status must be at least 100").max(599, "response_status must be at most 599").optional().nullable(),

  response_body: z.any().optional().nullable(),

  ip_address: z.string().max(45, "ip_address must be at most 45 characters").optional().nullable(),

  user_agent: z.string().max(500, "user_agent must be at most 500 characters").optional().nullable(),

  // BE-3: correlation_id is required (business rule). Zod now enforces this at the
  // request boundary so callers receive a 400 instead of a 500 service crash.
  correlation_id: z.string().min(1, "correlation_id is required").max(100, "correlation_id must be at most 100 characters"),

  changes: z.any().optional().nullable(),

  metadata: z.any().optional().nullable(),

});

// BE-11: UpdateAuditlogSchema removed — there is no PUT /api/v1/audit-logs/:id route.
// The schema and its validateUpdate middleware were dead code. Removed to keep the
// codebase clean and avoid giving a false impression that an update endpoint exists.

const AuditlogParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateAuditlogSchema,
  AuditlogParamsSchema,
};

