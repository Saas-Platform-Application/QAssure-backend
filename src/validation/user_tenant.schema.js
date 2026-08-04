const { z } = require('zod');

// Create schema for Usertenant
const CreateUsertenantSchema = z.object({
    
  user_id: z.string().uuid(),
  
  tenant_id: z.string().uuid(),
  
  status: z.enum(["active", "suspended"]),
  
  is_primary: z.boolean().optional().nullable(),
  
  joined_at: z.coerce.date(),

});

const UpdateUsertenantSchema = CreateUsertenantSchema.partial();

const UsertenantParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateUsertenantSchema,
  UpdateUsertenantSchema,
  UsertenantParamsSchema,
  };
