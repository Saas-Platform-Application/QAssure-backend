const { z } = require("zod");

// ─────────────────────────────────────────
// Upload (single & multiple)
// ─────────────────────────────────────────
const UploadFileSchema = z.object({
  entity_type: z
    .string({ required_error: "entity_type is required" })
    .min(1, "entity_type is required"),

  entity_id: z
    .string({ required_error: "entity_id is required" })
    .uuid("entity_id must be a valid UUID"),

  category: z.string().optional(),

  category_id: z
    .string()
    .optional()
    .nullable(),

  description: z.string().max(500, "description must be at most 500 characters").optional(),

  tags: z.any().optional(), // Handled as string/array by the controller

  metadata: z.any().optional(),
});

// ─────────────────────────────────────────
// Update metadata
// ─────────────────────────────────────────
const UpdateFileMetadataSchema = z.object({
  category: z.string().optional(),

  category_id: z
    .string()
    .optional()
    .nullable(),

  description: z
    .string()
    .max(500, "description must be at most 500 characters")
    .optional(),

  tags: z.array(z.string()).optional(),

  metadata: z.record(z.any()).optional(),
});

// ─────────────────────────────────────────
// Share creation
// ─────────────────────────────────────────
const CreateShareSchema = z.object({
  share_type: z.enum(["link", "user"]).optional().default("link"),

  shared_with_user_id: z
    .string()
    .uuid("shared_with_user_id must be a valid UUID")
    .optional()
    .nullable(),

  shared_with_email: z
    .string()
    .email("shared_with_email must be a valid email")
    .optional()
    .nullable(),

  permissions: z.enum(["view", "download"]).optional().default("view"),

  expires_at: z.coerce.date().optional().nullable(),

  expires_in_hours: z.number().int().positive().optional(),

  max_downloads: z.number().int().positive().optional().nullable(),
});

module.exports = {
  UploadFileSchema,
  UpdateFileMetadataSchema,
  CreateShareSchema,
};
