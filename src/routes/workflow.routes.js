/**
 * Workflow Routes
 * Workflow definitions, instances, and tasks
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/workflow.controller');
const {
  IdParamsSchema,
  CreateWorkflowDefinitionSchema,
  UpdateWorkflowDefinitionSchema,
  StartWorkflowSchema,
  TransitionWorkflowSchema,
  CancelWorkflowSchema,
  DelegateTaskSchema
} = require('../validation/workflow.schema');
const { validate } = require('../middleware/validationMiddleware');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { tenantContext } = require('../middleware/tenant.middleware');

// Validation middleware helpers
const validateParams = validate(IdParamsSchema, 'params');
const validateCreateDefinition = validate(CreateWorkflowDefinitionSchema);
const validateUpdateDefinition = validate(UpdateWorkflowDefinitionSchema);
const validateStartWorkflow = validate(StartWorkflowSchema);
const validateTransition = validate(TransitionWorkflowSchema);
const validateCancel = validate(CancelWorkflowSchema);
const validateDelegate = validate(DelegateTaskSchema);

// All routes require authentication
router.use(authenticate);
router.use(tenantContext);
// Platform service guard — blocks access if 'workflow' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('workflow'));

// ============================================================================
// WORKFLOW DEFINITIONS
// ============================================================================

/**
 * @route   POST /api/v1/workflows/definitions
 * @desc    Create a new workflow definition
 * @access  workflow:create
 */
router.post('/definitions', validateCreateDefinition, authorize('workflow:create'), controller.createDefinition);

/**
 * @route   GET /api/v1/workflows/definitions
 * @desc    List workflow definitions
 * @access  workflow:read
 */
router.get('/definitions', authorize('workflow:read'), controller.listDefinitions);

/**
 * @route   GET /api/v1/workflows/definitions/:id
 * @desc    Get workflow definition by ID
 * @access  workflow:read
 */
router.get('/definitions/:id', validateParams, authorize('workflow:read'), controller.getDefinition);

/**
 * @route   PUT /api/v1/workflows/definitions/:id
 * @desc    Update workflow definition
 * @access  workflow:create
 */
router.put('/definitions/:id', validateParams, validateUpdateDefinition, authorize('workflow:create'), controller.updateDefinition);

/**
 * @route   DELETE /api/v1/workflows/definitions/:id
 * @desc    Delete workflow definition
 * @access  workflow:admin
 */
router.delete('/definitions/:id', validateParams, authorize('workflow:admin'), controller.deleteDefinition);

/**
 * @route   POST /api/v1/workflows/definitions/:id/clone
 * @desc    Clone a workflow definition
 * @access  workflow:create
 */
router.post('/definitions/:id/clone', validateParams, authorize('workflow:create'), controller.cloneDefinition);

/**
 * @route   POST /api/v1/workflows/definitions/:id/activate
 * @desc    Activate a workflow definition
 * @access  workflow:create
 */
router.post('/definitions/:id/activate', validateParams, authorize('workflow:create'), controller.activateDefinition);

/**
 * @route   POST /api/v1/workflows/definitions/:id/deprecate
 * @desc    Deprecate a workflow definition
 * @access  workflow:create
 */
router.post('/definitions/:id/deprecate', validateParams, authorize('workflow:create'), controller.deprecateDefinition);

// ============================================================================
// WORKFLOW TASKS (User's pending work - placed before /instances to avoid conflicts)
// ============================================================================

/**
 * @route   GET /api/v1/workflows/tasks
 * @desc    Get my pending tasks
 * @access  Authenticated users
 */
router.get('/tasks', controller.getMyTasks);

/**
 * @route   GET /api/v1/workflows/tasks/counts
 * @desc    Get task counts for dashboard
 * @access  Authenticated users
 */
router.get('/tasks/counts', controller.getTaskCounts);

/**
 * @route   GET /api/v1/workflows/tasks/:id
 * @desc    Get task details
 * @access  Authenticated users
 */
router.get('/tasks/:id', validateParams, controller.getTask);

/**
 * @route   POST /api/v1/workflows/tasks/:id/delegate
 * @desc    Delegate task to another user
 * @access  Authenticated users (own tasks)
 */
// router.post('/tasks/:id/delegate', validateParams, validateDelegate, controller.delegateTask);

/**
 * @route   POST /api/v1/workflows/tasks/:id/claim
 * @desc    Claim a role-based task
 * @access  Authenticated users (with matching role)
 */
// router.post('/tasks/:id/claim', validateParams, controller.claimTask);

/**
 * @route   POST /api/v1/workflows/tasks/:id/release
 * @desc    Release a claimed task back to the role
 * @access  Authenticated users (own tasks)
 */
// router.post('/tasks/:id/release', validateParams, controller.releaseTask);

// ============================================================================
// WORKFLOW INSTANCES
// ============================================================================

/**
 * @route   POST /api/v1/workflows/instances
 * @desc    Start a new workflow instance
 * @access  Authenticated users
 */
router.post('/instances', validateStartWorkflow, controller.startWorkflow);

/**
 * @route   GET /api/v1/workflows/instances
 * @desc    List workflow instances
 * @access  workflow:read
 */
router.get('/instances', authorize('workflow:read'), controller.listInstances);

/**
 * @route   GET /api/v1/workflows/instances/:id
 * @desc    Get workflow instance details
 * @access  Authenticated users
 */
router.get('/instances/:id', validateParams, controller.getInstance);

/**
 * @route   GET /api/v1/workflows/instances/:id/history
 * @desc    Get workflow instance history
 * @access  Authenticated users
 */
router.get('/instances/:id/history', validateParams, controller.getInstanceHistory);

/**
 * @route   GET /api/v1/workflows/instances/:id/actions
 * @desc    Get available actions for workflow instance
 * @access  Authenticated users
 */
router.get('/instances/:id/actions', validateParams, controller.getAvailableActions);

/**
 * @route   POST /api/v1/workflows/instances/:id/transition
 * @desc    Transition workflow to next step
 * @access  Authenticated users (assigned to task)
 */
router.post('/instances/:id/transition', validateParams, validateTransition, controller.transitionWorkflow);

/**
 * @route   POST /api/v1/workflows/instances/:id/cancel
 * @desc    Cancel a workflow instance
 * @access  workflow:admin or originator
 */
router.post('/instances/:id/cancel', validateParams, validateCancel, controller.cancelWorkflow);

module.exports = router;
