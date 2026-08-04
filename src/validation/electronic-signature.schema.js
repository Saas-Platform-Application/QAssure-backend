const { z } = require('zod');

// =====================================================
// COMMON SCHEMAS
// =====================================================

// ID params schema
const IdParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

// Workflow ID params schema
const WorkflowIdParamsSchema = z.object({
  workflowId: z.string().uuid("workflowId must be a valid UUID"),
});

// Resource params schema
const ResourceParamsSchema = z.object({
  resourceType: z.string().min(1, "resourceType is required").max(100, "resourceType must be at most 100 characters"),
  resourceId: z.string().min(1, "resourceId is required").max(255, "resourceId must be at most 255 characters"),
});

// =====================================================
// SIGNATURE OPERATIONS
// =====================================================

// Signature actions enum
const SignatureActionSchema = z.enum([
  'APPROVE',
  'REJECT',
  'REVIEW',
  'AUTHOR',
  'VERIFY',
  'RELEASE',
  'ACKNOWLEDGE',
  'WITHDRAW'
], {
  errorMap: () => ({ message: "Action must be one of: APPROVE, REJECT, REVIEW, AUTHOR, VERIFY, RELEASE, ACKNOWLEDGE, WITHDRAW" })
});

// Auth method enum
const AuthMethodSchema = z.enum(['password', 'password_pin'], {
  errorMap: () => ({ message: "auth_method must be either 'password' or 'password_pin'" })
}).default('password_pin');

// Create signature schema
const CreateSignatureSchema = z.object({
  resource_type: z.string().min(1, "resource_type is required").max(100, "resource_type must be at most 100 characters"),
  resource_id: z.string().min(1, "resource_id is required").max(255, "resource_id must be at most 255 characters"),
  resource_name: z.string().max(500, "resource_name must be at most 500 characters").optional().nullable(),
  action: SignatureActionSchema,
  meaning: z.string().max(1000, "meaning must be at most 1000 characters").optional().nullable(),
  password: z.string().min(1, "password is required"),
  pin: z.string().optional().nullable(),
  auth_method: AuthMethodSchema.optional(),
  signature_order: z.number().int().positive("signature_order must be a positive integer").optional().nullable(),
  required_signatures: z.number().int().positive("required_signatures must be a positive integer").optional().nullable(),
  workflow_id: z.string().uuid("workflow_id must be a valid UUID").optional().nullable(),
});

// Verify signature schema
const VerifySignatureSchema = z.object({
  signature_id: z.string().uuid("signature_id must be a valid UUID"),
});

// Set PIN schema
const SetPinSchema = z.object({
  password: z.string().min(1, "password is required"),
  pin: z.string().regex(/^\d{4,6}$/, "PIN must be 4-6 digits"),
});

// Invalidate signature schema
const InvalidateSignatureSchema = z.object({
  reason: z.string().min(1, "reason is required").max(1000, "reason must be at most 1000 characters"),
});

// =====================================================
// QUERY SCHEMAS
// =====================================================

// Get user history query schema
const GetUserHistoryQuerySchema = z.object({
  limit: z.string().regex(/^\d+$/, "limit must be a positive integer").transform(Number).optional(),
  offset: z.string().regex(/^\d+$/, "offset must be a non-negative integer").transform(Number).optional(),
  resource_type: z.string().max(100, "resource_type must be at most 100 characters").optional(),
  action: SignatureActionSchema.optional(),
  start_date: z.string().optional(), // Accept any string, service will handle parsing
  end_date: z.string().optional(), // Accept any string, service will handle parsing
});

// Get statistics query schema
const GetStatisticsQuerySchema = z.object({
  start_date: z.string().optional(), // Accept any string, service will handle parsing
  end_date: z.string().optional(), // Accept any string, service will handle parsing
});

module.exports = {
  // Common
  IdParamsSchema,
  WorkflowIdParamsSchema,
  ResourceParamsSchema,
  
  // Signature Operations
  CreateSignatureSchema,
  VerifySignatureSchema,
  SetPinSchema,
  InvalidateSignatureSchema,
  
  // Query Schemas
  GetUserHistoryQuerySchema,
  GetStatisticsQuerySchema,
};
