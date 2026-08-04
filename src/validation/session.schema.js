const { z } = require('zod');

// Create schema for Session
const CreateSessionSchema = z.object({
    
  user_id: z.string().uuid(),
  
  tenant_id: z.string().uuid().optional().nullable(),
  
  token_hash: z.string().min(1, "token_hash is required").max(255, "token_hash must be at most 255 characters"),
  
  refresh_token_hash: z.string().max(255, "refresh_token_hash must be at most 255 characters").optional().nullable(),
  
  ip_address: z.string().max(45, "ip_address must be at most 45 characters").optional().nullable(),
  
  user_agent: z.string().max(500, "user_agent must be at most 500 characters").optional().nullable(),
  
  expires_at: z.coerce.date(),
  
  refresh_expires_at: z.coerce.date().optional().nullable(),
  
  revoked_at: z.coerce.date().optional().nullable(),

});

const UpdateSessionSchema = CreateSessionSchema.partial();

const SessionParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateSessionSchema,
  UpdateSessionSchema,
  SessionParamsSchema,
  };
