const { z } = require("zod");

const roleModuleCombinationSchema = z.object({
  role_id: z.string().uuid("role_id must be a valid UUID"),
  module_id: z.string().uuid("module_id must be a valid UUID").optional().nullable(),
});

const validateRoleModuleCombinations = (combinations, ctx) => {
  if (!Array.isArray(combinations)) return;
  if (combinations.length < 1) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: [],
      message: "At least one role_module_combination must be provided",
    });
    return;
  }

  const seenModules = new Set();
  for (let i = 0; i < combinations.length; i++) {
    const combo = combinations[i];
    if (combo.module_id) {
      if (seenModules.has(combo.module_id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [i, "module_id"],
          message: "Each module can only be assigned to one role",
        });
      }
      seenModules.add(combo.module_id);
    }
  }
};

// Create schema for User
const CreateUserSchema = z
  .object({
    email: z
      .string()
      .min(1, "email is required")
      .min(5, "email must be at least 5 characters")
      .max(255, "email must be at most 255 characters")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "email format is invalid")
      .email("Invalid email format"),

    // Accept either 'password' (plain text) or 'password_hash' (already hashed)
    password: z
      .string()
      .min(1, "password is required")
      .max(255, "password must be at most 255 characters")
      .optional(),
    password_hash: z
      .string()
      .max(255, "password_hash must be at most 255 characters")
      .optional()
      .nullable(),

    first_name: z
      .string()
      .max(100, "first_name must be at most 100 characters")
      .optional()
      .nullable(),

    last_name: z
      .string()
      .max(100, "last_name must be at most 100 characters")
      .optional()
      .nullable(),

    status: z.enum(["active", "suspended", "deleted"]),

    auth_provider: z.enum(["local", "saml", "oauth"]),

    saml_subject: z
      .string()
      .max(255, "saml_subject must be at most 255 characters")
      .optional()
      .nullable(),

    oauth_provider: z
      .string()
      .max(50, "oauth_provider must be at most 50 characters")
      .optional()
      .nullable(),

    oauth_subject: z
      .string()
      .max(255, "oauth_subject must be at most 255 characters")
      .optional()
      .nullable(),

    last_login_at: z.coerce.date().optional().nullable(),

    login_count: z.number().int().optional().nullable(),

    last_login_ip: z
      .string()
      .max(45, "last_login_ip must be at most 45 characters")
      .optional()
      .nullable(),

    preferences: z.any().optional().nullable(),

    // Tenant and Role assignment
    tenant_id: z.string().uuid("tenant_id must be a valid UUID").optional(),
    role_module_combinations: z
      .array(roleModuleCombinationSchema)
      .min(1, "At least one role_module_combination must be provided"),
        is_primary_tenant: z.boolean().optional().default(true),
    department_id: z.string().uuid("department_id must be a valid UUID").optional().nullable(),
    designation_id: z.string().uuid("designation_id must be a valid UUID").optional().nullable(),
    category: z.enum(["tenant_user", "supplier_user"]).default("tenant_user"),
    supplier_id: z
      .preprocess(
        (val) => (val === "" ? null : val),
        z.string().uuid("supplier_id must be a valid UUID").optional().nullable(),
      ),
  })
  .superRefine((data, ctx) => {
    validateRoleModuleCombinations(data.role_module_combinations, {
      addIssue: (issue) =>
        ctx.addIssue({
          ...issue,
          path: ["role_module_combinations", ...(issue.path || [])],
        }),
    });
    const isPlatform = data.tenant_id === '00000000-0000-0000-0000-000000000001';
    if (!isPlatform) {
      if (!data.department_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["department_id"],
          message: "department_id is required for tenant users",
        });
      }
      if (!data.designation_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["designation_id"],
          message: "designation_id is required for tenant users",
        });
      }
    }
  })
  .transform((data) => {
    // Transform 'password' to 'password_hash' if password is provided
    if (data.password && !data.password_hash) {
      data.password_hash = data.password;
      delete data.password;
    }
    return data;
  });

// Update schema - includes role assignment fields for updates
const UpdateUserSchema = z
  .object({
    email: z
      .string()
      .min(1, "email is required")
      .min(5, "email must be at least 5 characters")
      .max(255, "email must be at most 255 characters")
      .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "email format is invalid")
      .email("Invalid email format")
      .optional(),
    password_hash: z
      .string()
      .max(255, "password_hash must be at most 255 characters")
      .optional()
      .nullable(),
    first_name: z
      .string()
      .max(100, "first_name must be at most 100 characters")
      .optional()
      .nullable(),
    last_name: z
      .string()
      .max(100, "last_name must be at most 100 characters")
      .optional()
      .nullable(),
    status: z.enum(["active", "suspended", "deleted"]).optional(),
    auth_provider: z.enum(["local", "saml", "oauth"]).optional(),
    saml_subject: z
      .string()
      .max(255, "saml_subject must be at most 255 characters")
      .optional()
      .nullable(),
    oauth_provider: z
      .string()
      .max(50, "oauth_provider must be at most 50 characters")
      .optional()
      .nullable(),
    oauth_subject: z
      .string()
      .max(255, "oauth_subject must be at most 255 characters")
      .optional()
      .nullable(),
    last_login_at: z.coerce.date().optional().nullable(),
    login_count: z.number().int().optional().nullable(),
    last_login_ip: z
      .string()
      .max(45, "last_login_ip must be at most 45 characters")
      .optional()
      .nullable(),
    preferences: z.any().optional().nullable(),
    // Tenant and Role assignment (for updates)
    tenant_id: z.string().uuid("tenant_id must be a valid UUID").optional(),
    role_module_combinations: z.array(roleModuleCombinationSchema).optional(),
    is_primary_tenant: z.boolean().optional(),
    assigned_by: z
      .string()
      .uuid("assigned_by must be a valid UUID")
      .optional()
      .nullable(),
    department_id: z.string().uuid("department_id must be a valid UUID").optional().nullable(),
    designation_id: z.string().uuid("designation_id must be a valid UUID").optional().nullable(),
    category: z.enum(["tenant_user", "supplier_user"]).optional(),
    supplier_id: z
      .preprocess(
        (val) => (val === "" ? null : val),
        z.string().uuid("supplier_id must be a valid UUID").optional().nullable(),
      ),
  })
  .partial()
  .superRefine((data, ctx) => {
    if (data.role_module_combinations !== undefined) {
      validateRoleModuleCombinations(data.role_module_combinations, {
        addIssue: (issue) =>
          ctx.addIssue({
            ...issue,
            path: ["role_module_combinations", ...(issue.path || [])],
          }),
      });
    }
    const isPlatform = data.tenant_id === '00000000-0000-0000-0000-000000000001';
    if (!isPlatform && data.tenant_id !== undefined) {
      if (data.department_id === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["department_id"],
          message: "department_id cannot be null for tenant users",
        });
      }
      if (data.designation_id === null) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["designation_id"],
          message: "designation_id cannot be null for tenant users",
        });
      }
    }
  });

const UserParamsSchema = z.object({
  id: z.string().uuid(),
});

const TenantIdParamsSchema = z.object({
  tenant_id: z.string().uuid("tenant_id must be a valid UUID"),
});

const SupplierIdParamsSchema = z.object({
  supplier_id: z.string().uuid("supplier_id must be a valid UUID"),
});

module.exports = {
  CreateUserSchema,
  UpdateUserSchema,
  UserParamsSchema,
  TenantIdParamsSchema,
  SupplierIdParamsSchema,
};
