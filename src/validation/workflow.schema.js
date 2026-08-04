const { z } = require('zod');

// =====================================================
// COMMON SCHEMAS
// =====================================================

// ID params schema
const IdParamsSchema = z.object({
  id: z.string().uuid("id must be a valid UUID"),
});

// =====================================================
// WORKFLOW DEFINITIONS
// =====================================================

// Step assignee schema
const StepAssigneeSchema = z.object({
  type: z.enum(["user", "role", "originator"], {
    errorMap: () => ({ message: "Assignee type must be one of: user, role, originator" })
  }),
  user_ids: z.array(z.string().uuid("Assignee id must be a valid UUID")).optional().nullable(),
  role_ids: z.array(z.string().uuid("Role id must be a valid UUID")).optional().nullable(),
}).refine(
  (data) => {
    if (data.type === 'user' && (!data.user_ids || data.user_ids.length === 0)) return false;
    if (data.type === 'role' && (!data.role_ids || data.role_ids.length === 0)) return false;
    return true;
  },
  { message: "Assignee user_ids are required for type 'user', role_ids are required for type 'role'" }
);

// Workflow step schema
const WorkflowStepSchema = z.object({
  step_code: z.string().min(1, "step_code is required").max(100, "step_code must be at most 100 characters"),
  code: z.string().max(100, "code must be at most 100 characters").optional(), // Alias for step_code
  name: z.string().min(1, "name is required").max(255, "name must be at most 255 characters"),
  description: z.string().optional().nullable(),
  sequence: z.number().int().positive("sequence must be a positive integer").optional(),
  order: z.number().int().positive("order must be a positive integer").optional(), // Alias for sequence
  step_type: z.enum(["initial", "task", "approval", "terminal"], {
    errorMap: () => ({ message: "step_type must be one of: initial, task, approval, terminal" })
  }).optional(),
  assignee: StepAssigneeSchema.optional().nullable(),
  assignee_type: z.enum(["user", "role", "originator"]).optional().nullable(),
  assignee_user_ids: z.array(z.string().uuid()).optional().nullable(),
  assignee_role_ids: z.array(z.string().uuid()).optional().nullable(),
  sla_hours: z.preprocess(
    (val) => (val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val),
    z.number().int().nonnegative("sla_hours must be a non-negative integer").optional().nullable()
  ),
  sla_warning_hours: z.preprocess(
    (val) => (val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val),
    z.number().int().nonnegative("sla_warning_hours must be a non-negative integer").optional().nullable()
  ),
  sla_escalation_hours: z.preprocess(
    (val) => (val === "" || val === null || (typeof val === "number" && isNaN(val)) ? undefined : val),
    z.number().int().nonnegative("sla_escalation_hours must be a non-negative integer").optional().nullable()
  ),
  requires_signature: z.boolean().default(false),
  requires_comment: z.boolean().default(false),
  requires_attachment: z.boolean().default(false),
  available_actions: z.array(z.string()).default(["approve", "reject"]),
  form_config: z.record(z.any()).optional().nullable(),
}).refine(
  (data) => {
    // Terminal steps are auto-closing and do not require an assignee
    if (data.step_type === 'terminal') return true;

    const type = data.assignee_type || (data.assignee ? data.assignee.type : null);
    const user_ids = data.assignee_user_ids || (data.assignee ? data.assignee.user_ids : null);
    const role_ids = data.assignee_role_ids || (data.assignee ? data.assignee.role_ids : null);

    if (!type) return false;
    if (type === 'user' && (!user_ids || user_ids.length === 0)) return false;
    if (type === 'role' && (!role_ids || role_ids.length === 0)) return false;
    return true;
  },
  { message: "assignee_type is required for non-terminal steps and must be accompanied by assignee_user_ids (for type 'user') or assignee_role_ids (for type 'role')" }
);

// Workflow transition schema
// Accepts both from_step/to_step and from_step_code/to_step_code for flexibility
// Service expects from_step and to_step (step codes), so we normalize to that format
const WorkflowTransitionSchema = z.object({
  // Accept both formats: from_step (preferred) or from_step_code (alias)
  from_step: z.string().min(1, "from_step is required").max(100, "from_step must be at most 100 characters").optional(),
  from_step_code: z.string().min(1, "from_step_code is required").max(100, "from_step_code must be at most 100 characters").optional(),
  // Accept both formats: to_step (preferred) or to_step_code (alias)
  to_step: z.string().min(1, "to_step is required").max(100, "to_step must be at most 100 characters").optional(),
  to_step_code: z.string().min(1, "to_step_code is required").max(100, "to_step_code must be at most 100 characters").optional(),
  action: z.string().min(1, "action is required").max(100, "action must be at most 100 characters"),
  name: z.string().max(255, "name must be at most 255 characters").optional().nullable(),
  priority: z.number().int().default(0),
  requires_signature: z.boolean().default(false),
  requires_comment: z.boolean().default(false),
  signature_meaning: z.string().max(500, "signature_meaning must be at most 500 characters").optional().nullable(),
  conditions: z.record(z.any()).optional().nullable(),
}).refine(
  (data) => data.from_step || data.from_step_code,
  { message: "Either from_step or from_step_code is required", path: ["from_step"] }
).refine(
  (data) => data.to_step || data.to_step_code,
  { message: "Either to_step or to_step_code is required", path: ["to_step"] }
).transform((data) => {
  // Normalize to from_step and to_step format (service expects these field names)
  const normalized = { ...data };
  if (data.from_step_code && !data.from_step) {
    normalized.from_step = data.from_step_code;
  }
  if (data.to_step_code && !data.to_step) {
    normalized.to_step = data.to_step_code;
  }
  // Remove the _code variants to avoid confusion
  delete normalized.from_step_code;
  delete normalized.to_step_code;
  return normalized;
});

// Create workflow definition schema
const CreateWorkflowDefinitionSchema = z.object({
  name: z.string().min(1, "name is required").max(255, "name must be at most 255 characters"),
  description: z.string().optional().nullable(),
  code: z.string().min(1, "code is required").max(100, "code must be at most 100 characters"),
  entity_type: z.string().min(1, "entity_type is required").max(100, "entity_type must be at most 100 characters"),
  entity_id: z.string().uuid("entity_id must be a valid UUID").optional().nullable(),
  status: z.enum(["draft", "active", "deprecated", "archived"]).default("draft"),
  is_default: z.boolean().default(false),
  source_module: z.array(z.string()).optional().nullable(),
  source_module_id: z.array(z.string().uuid()).optional().nullable(),
  config: z.record(z.any()).optional().nullable(),
  steps: z.array(WorkflowStepSchema).optional(),
  transitions: z.array(WorkflowTransitionSchema).optional(),
});

// Update workflow definition schema
// Based on allowedFields in workflow-definition.service.js: ['name', 'description', 'status', 'is_default', 'config']
const UpdateWorkflowDefinitionSchema = z.object({
  name: z.string().max(255, "name must be at most 255 characters").optional(),
  description: z.string().optional().nullable(),
  status: z.enum(["draft", "active", "deprecated", "archived"]).optional(),
  is_default: z.boolean().default(false),
  source_module: z.array(z.string()).optional().nullable(),
  source_module_id: z.array(z.string().uuid()).optional().nullable(),
  config: z.record(z.any()).optional().nullable(),
}).partial();

// =====================================================
// WORKFLOW INSTANCES
// =====================================================

// Start workflow schema
const StartWorkflowSchema = z.object({
  workflow_code: z.string().max(100, "workflow_code must be at most 100 characters").optional().nullable(),
  workflow_definition_id: z.string().uuid("workflow_definition_id must be a valid UUID").optional().nullable(),
  entity_type: z.string().min(1, "entity_type is required").max(100, "entity_type must be at most 100 characters"),
  entity_id: z.string().uuid("entity_id must be a valid UUID"),
  entity_name: z.string().max(255, "entity_name must be at most 255 characters").optional().nullable(),
  project_id: z.string().uuid("project_id must be a valid UUID").optional().nullable(),
  context: z.record(z.any()).optional().nullable(),
}).refine(
  (data) => data.workflow_code || data.workflow_definition_id,
  { message: "Either workflow_code or workflow_definition_id is required" }
);

// Transition workflow schema
const TransitionWorkflowSchema = z.object({
  task_id: z.string().uuid("task_id must be a valid UUID"),
  action: z.string().min(1, "action is required").max(100, "action must be at most 100 characters"),
  comments: z.string().optional().nullable(),
  password: z.string().min(1, "password is required for electronic signature").optional(),
  pin: z.string().optional().nullable(),
});

// Cancel workflow schema
const CancelWorkflowSchema = z.object({
  reason: z.string().min(1, "reason is required").max(1000, "reason must be at most 1000 characters"),
});

// =====================================================
// WORKFLOW TASKS
// =====================================================

// Delegate task schema
const DelegateTaskSchema = z.object({
  delegate_to: z.string().uuid("delegate_to must be a valid UUID"),
  reason: z.string().max(500, "reason must be at most 500 characters").optional().nullable(),
});

module.exports = {
  // Common
  IdParamsSchema,

  // Workflow Definitions
  CreateWorkflowDefinitionSchema,
  UpdateWorkflowDefinitionSchema,

  // Workflow Instances
  StartWorkflowSchema,
  TransitionWorkflowSchema,
  CancelWorkflowSchema,

  // Workflow Tasks
  DelegateTaskSchema,
};
