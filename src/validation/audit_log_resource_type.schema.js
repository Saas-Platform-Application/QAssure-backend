const { z } = require('zod');

/**
 * Validation schemas for Audit Log Resource Type admin routes.
 * BE-9: These were missing — all admin routes (POST, PUT/:id, DELETE/:id) were
 * completely unvalidated, passing raw input directly to Sequelize.
 */

// Valid resource type categories
const RESOURCE_TYPE_TYPES = ['PLATFORM', 'MODULE'];

// POST /api/v1/audit-log-resource-types
const CreateAuditLogResourceTypeSchema = z.object({
  name: z.string()
    .min(1, 'name is required')
    .max(100, 'name must be at most 100 characters')
    .regex(/^[a-zA-Z0-9_\-. ]+$/, 'name may only contain letters, numbers, spaces, hyphens, underscores, or dots'),

  type: z.enum(RESOURCE_TYPE_TYPES, {
    errorMap: () => ({ message: `type must be one of: ${RESOURCE_TYPE_TYPES.join(', ')}` })
  }),

  module_id: z.string().uuid('module_id must be a valid UUID').optional().nullable(),

  description: z.string().max(500, 'description must be at most 500 characters').optional().nullable(),
});

// PUT /api/v1/audit-log-resource-types/:id — all fields optional for partial update
const UpdateAuditLogResourceTypeSchema = CreateAuditLogResourceTypeSchema.partial();

// UUID param validation for PUT /:id and DELETE /:id
const AuditLogResourceTypeParamsSchema = z.object({
  id: z.string().uuid('id must be a valid UUID'),
});

module.exports = {
  CreateAuditLogResourceTypeSchema,
  UpdateAuditLogResourceTypeSchema,
  AuditLogResourceTypeParamsSchema,
};
