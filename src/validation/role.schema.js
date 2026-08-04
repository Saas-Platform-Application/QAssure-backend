const { z } = require("zod");

// Create schema for Role
const CreateRoleSchema = z.object({
  name: z
    .string()
    .min(1, "name is required")
    .min(3, "name must be at least 3 characters")
    .max(50, "name must be at most 50 characters"),

  // code: z.enum(["platform-admin", "tenant-admin", "module-admin", "developer", "viewer"]),
  // code: z.enum(["super_admin", "tenant_admin", "quality_manager", "developer", "viewer"]),
  code: z
    .string()
    .min(1, "Code is required")
    .regex(
      /^[a-z]+(_[a-z]+)*$/,
      "Code must be lowercase and use '_' for separation (e.g. abc_def)",
    ),

  description: z
    .string()
    .min(1, "description is required")
    .max(500, "description must be at most 500 characters"),

  // scope: z.enum(["global", "tenant", "module"]),
  scope: z.enum(["platform", "tenant", "module"]).default("tenant"),

  is_system: z.boolean().optional().nullable(),

  is_active: z.boolean().optional().nullable(),

  tenant_id: z
    .string()
    .uuid("tenant_id must be a valid UUID")
    .optional()
    .nullable(),

  // modules: z.array(z.string().uuid(), "modules must be an array of valid UUIDs").optional().nullable(),

  permissions: z
    .array(
      z.object({
        resource: z.string().min(1, "resource is required"),
        action: z.string().min(1, "action is required"),
      }),
      "permissions must be an array of permission objects with resource and action",
    )
    .optional()
    .nullable(),
});

const UpdateRoleSchema = CreateRoleSchema.omit({ code: true }).partial();

const RoleParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateRoleSchema,
  UpdateRoleSchema,
  RoleParamsSchema,
};
