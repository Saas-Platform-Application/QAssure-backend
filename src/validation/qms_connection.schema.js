const { z } = require('zod');

// Create schema for Qmsconnection
const CreateQmsconnectionSchema = z.object({
    
  tenant_id: z.string().uuid(),
  
  name: z.string().min(1, "name is required").min(3, "name must be at least 3 characters").max(100, "name must be at most 100 characters"),
  
  qms_type: z.enum(["VEEVA_VAULT", "MASTERCONTROL", "ARENA_PLM", "TRACKWISE", "ETQ_RELIANCE"]),
  
  base_url: z.string().min(1, "base_url is required").max(255, "base_url must be at most 255 characters").url("Invalid URL format"),
  
  auth_type: z.enum(["OAUTH2", "API_KEY", "BASIC_AUTH", "SAML"]),
  
  auth_config: z.any(),
  
  sync_mode: z.enum(["QMS_TO_QASSURE", "QASSURE_TO_QMS", "BIDIRECTIONAL"]),
  
  entity_mappings: z.any().optional().nullable(),
  
  field_mappings: z.any().optional().nullable(),
  
  webhook_url: z.string().max(255, "webhook_url must be at most 255 characters").url("Invalid URL format").optional().nullable(),
  
  webhook_secret: z.string().max(255, "webhook_secret must be at most 255 characters").optional().nullable(),
  
  status: z.enum(["ACTIVE", "SUSPENDED", "ERROR"]),
  
  last_sync_at: z.coerce.date().optional().nullable(),
  
  last_error: z.string().max(1000, "last_error must be at most 1000 characters").optional().nullable(),
  
  created_by: z.string().uuid(),

});

const UpdateQmsconnectionSchema = CreateQmsconnectionSchema.partial();

const QmsconnectionParamsSchema = z.object({
  id: z.string().uuid(),
});

module.exports = {
  CreateQmsconnectionSchema,
  UpdateQmsconnectionSchema,
  QmsconnectionParamsSchema,
  };
