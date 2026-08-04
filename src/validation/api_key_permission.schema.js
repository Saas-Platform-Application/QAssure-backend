const { z } = require('zod');

// Create schema for Apikeypermission
const CreateApikeypermissionSchema = z.object({
    
  api_key_id: z.string().uuid(),
  
  resource: z.string().min(1, "resource is required").max(100, "resource must be at most 100 characters"),
  
  action: z.string().min(1, "action is required").max(50, "action must be at most 50 characters"),
  
  scope: z.enum(["global", "tenant", "module"]),

});

const UpdateApikeypermissionSchema = CreateApikeypermissionSchema.partial();

const ApikeypermissionParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateApikeypermissionSchema,
  UpdateApikeypermissionSchema,
  ApikeypermissionParamsSchema,
  };
