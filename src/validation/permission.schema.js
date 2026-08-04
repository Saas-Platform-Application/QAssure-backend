const { z } = require('zod');

// Create schema for Permission
const CreatePermissionSchema = z.object({
    
  role_id: z.string().uuid(),
  
  resource: z.string().min(1, "resource is required").max(100, "resource must be at most 100 characters"),
  
  action: z.string().min(1, "action is required").max(50, "action must be at most 50 characters"),
  
  scope: z.enum(["global", "tenant", "module"]),
  
  conditions: z.any().optional().nullable(),

});

const UpdatePermissionSchema = CreatePermissionSchema.partial();

const PermissionParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreatePermissionSchema,
  UpdatePermissionSchema,
  PermissionParamsSchema,
  };
