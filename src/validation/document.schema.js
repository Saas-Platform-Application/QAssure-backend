const { z } = require("zod");

/**
 * Document Category Validation Schemas
 */
const CreateDocumentCategorySchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  code: z.string().min(1, "Code is required").max(100),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid("parent_id must be a valid UUID").optional().nullable(),
  requires_training: z.boolean().optional().default(false),
  retention_years: z.number().int().min(0).optional().default(7),
  review_frequency_months: z.number().int().min(1).optional().default(12)
});

const UpdateDocumentCategorySchema = z.object({
  name: z.string().min(1).max(255).optional(),
  code: z.string().min(1).max(100).optional(),
  description: z.string().optional().nullable(),
  parent_id: z.string().uuid("parent_id must be a valid UUID").optional().nullable(),
  requires_training: z.boolean().optional(),
  retention_years: z.number().int().min(0).optional(),
  review_frequency_months: z.number().int().min(1).optional()
}).partial();

/**
 * Document Validation Schemas
 */
const CreateDocumentSchema = z.object({
  title: z.string().min(1, "Title is required").max(500),
  description: z.string().optional().nullable(),
  document_number: z.string().max(100).optional(),
  category_id: z.string().uuid("category_id must be a valid UUID").optional().nullable(),
  document_type: z.string().min(1, "Document type is required").max(100),
  owner_id: z.string().uuid("owner_id must be a valid UUID").optional().nullable(),
  department: z.string().max(255).optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  custom_fields: z.record(z.any()).optional().default({}),
  content: z.string().optional(),
  content_html: z.string().optional(),
  source_module: z.string().optional().nullable(),
  source_module_id: z.string().uuid().optional().nullable(),
  file_name: z.string().optional().nullable(),
  file_path: z.string().optional().nullable(),
  file_size: z.number().optional().nullable(),
  mime_type: z.string().optional().nullable(),
  file_hash: z.string().optional().nullable(),
  source_record_id: z.string().optional().nullable(),
  workflow_definition_id: z.string().uuid().optional().nullable(),
  sections: z.array(z.object({
    section_number: z.string().optional().nullable(),
    title: z.string().optional().nullable(),
    content: z.string().optional().nullable(),
    content_html: z.string().optional().nullable(),
    order_index: z.number().optional().nullable(),
    parent_id: z.string().uuid().optional().nullable(),
    is_mandatory: z.boolean().optional().default(true)
  })).optional().default([])
});

const UpdateDocumentSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  owner_id: z.string().uuid().optional().nullable(),
  department: z.string().max(255).optional().nullable(),
  tags: z.array(z.string()).optional(),
  custom_fields: z.record(z.any()).optional(),
  source_module: z.string().optional().nullable(),
  source_module_id: z.string().uuid().optional().nullable(),
  source_record_id: z.string().optional().nullable()
}).partial();

const ListDocumentQuerySchema = z.object({
  status: z.string().optional(),
  category_id: z.string().uuid().optional(),
  document_type: z.string().optional(),
  owner_id: z.string().uuid().optional(),
  source_module_id: z.string().uuid().optional(),
  source_record_id: z.string().optional(),
  search: z.string().optional(),
  limit: z.preprocess((val) => parseInt(val, 10), z.number().int().min(1).max(100)).optional(),
  offset: z.preprocess((val) => parseInt(val, 10), z.number().int().min(0)).optional()
});

const DocumentIdParamsSchema = z.object({
  id: z.string().uuid("ID must be a valid UUID")
});

const SubmitForReviewSchema = z.object({
  workflow_definition_id: z.string().uuid("workflow_definition_id must be a valid UUID")
});

module.exports = {
  CreateDocumentCategorySchema,
  UpdateDocumentCategorySchema,
  CreateDocumentSchema,
  UpdateDocumentSchema,
  DocumentIdParamsSchema,
  SubmitForReviewSchema,
  ListDocumentQuerySchema
};
