/**
 * Workflow Controller
 * Handles workflow definitions, instances, and tasks
 */

const {
  getWorkflowDefinitionService,
} = require("../services/workflow-definition.service");
const {
  getWorkflowEngineService,
} = require("../services/workflow-engine.service");
const { getWorkflowTaskService } = require("../services/workflow-task.service");
const { formatError, getErrorStatusCode } = require("../utils/errorFormatter");

class WorkflowController {
  // ============================================================================
  // WORKFLOW DEFINITIONS
  // ============================================================================

  /**
   * POST /api/v1/workflows/definitions
   */
  async createDefinition(req, res) {
    try {
      const service = getWorkflowDefinitionService();
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const createdBy = req.user.id;

      let source_module = req.body.source_module;
      if (!source_module || (Array.isArray(source_module) && source_module.length === 0)) {
        const resolved = (req.module && req.module.code)
          ? req.module.code
          : (req.user && req.user.isApiKey)
            ? req.user.moduleCode
            : undefined;
        source_module = resolved ? [resolved] : undefined;
      } else if (!Array.isArray(source_module)) {
        source_module = [source_module];
      }

      let source_module_id = req.body.source_module_id;
      if (!source_module_id || (Array.isArray(source_module_id) && source_module_id.length === 0)) {
        const resolved = (req.module && req.module.id)
          ? req.module.id
          : (req.user && req.user.isApiKey)
            ? req.user.moduleId
            : undefined;
        source_module_id = resolved ? [resolved] : undefined;
      } else if (!Array.isArray(source_module_id)) {
        source_module_id = [source_module_id];
      }

      if (!source_module || source_module.length === 0 || !source_module_id || source_module_id.length === 0) {
        const error = new Error("Module information (source_module and source_module_id) is required");
        error.code = "VALIDATION_ERROR";
        throw error;
      }

      const definitionData = {
        ...req.body,
        source_module,
        source_module_id,
      };

      const definition = await service.create(
        tenantId,
        definitionData,
        createdBy,
      );

      res.status(201).json({
        success: true,
        data: definition,
      });
    } catch (error) {
      const errorResponse = formatError(error, "CREATE_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * GET /api/v1/workflows/definitions
   */
  async listDefinitions(req, res) {
    try {
      const service = getWorkflowDefinitionService();
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const {
        entity_type,
        entity_id, // Added entity_id
        status,
        source_module,
        source_module_id,
        limit,
        offset,
        search,
      } = req.query;

      const effectiveSourceModule =
        req.module && req.module.code
          ? req.module.code
          : req.user && req.user.isApiKey
            ? req.user.moduleCode
            : source_module;

      const effectiveModuleId =
        req.module && req.module.id
          ? req.module.id
          : req.user && req.user.isApiKey
            ? req.user.moduleId
            : source_module_id;

      const result = await service.list(tenantId, {
        entityType: entity_type,
        entityId: entity_id, // Added entityId
        status,
        sourceModule: effectiveSourceModule,
        sourceModuleId: effectiveModuleId,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        search,
      });

      res.json({
        success: true,
        data: result.definitions,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * GET /api/v1/workflows/definitions/:id
   */
  async getDefinition(req, res) {
    try {
      const service = getWorkflowDefinitionService();
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const { id } = req.params;

      const definition = await service.getById(id, tenantId);

      if (!definition) {
        throw new Error("Workflow definition not found");
      }

      res.json({
        success: true,
        data: definition,
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * PUT /api/v1/workflows/definitions/:id
   */
  async updateDefinition(req, res) {
    try {
      const service = getWorkflowDefinitionService();
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;

      const definition = await service.update(
        id,
        tenantId,
        req.body,
        updatedBy,
      );

      res.json({
        success: true,
        data: definition,
      });
    } catch (error) {
      const errorResponse = formatError(error, "UPDATE_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * DELETE /api/v1/workflows/definitions/:id
   */
  async deleteDefinition(req, res) {
    try {
      const service = getWorkflowDefinitionService();
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const { id } = req.params;

      await service.delete(id, tenantId);

      res.json({
        success: true,
        message: "Workflow definition deleted",
      });
    } catch (error) {
      const errorResponse = formatError(error, "DELETE_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * POST /api/v1/workflows/definitions/:id/clone
   */
  async cloneDefinition(req, res) {
    try {
      const service = getWorkflowDefinitionService();
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const createdBy = req.user.id;
      const { id } = req.params;
      const { name } = req.body;

      const definition = await service.clone(id, tenantId, name, createdBy);

      res.status(201).json({
        success: true,
        data: definition,
      });
    } catch (error) {
      const errorResponse = formatError(error, "CLONE_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * POST /api/v1/workflows/definitions/:id/activate
   */
  async activateDefinition(req, res) {
    try {
      const service = getWorkflowDefinitionService();
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;

      const definition = await service.activate(id, tenantId, updatedBy);

      res.json({
        success: true,
        data: definition,
      });
    } catch (error) {
      const errorResponse = formatError(error, "ACTIVATE_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * POST /api/v1/workflows/definitions/:id/deprecate
   */
  async deprecateDefinition(req, res) {
    try {
      const service = getWorkflowDefinitionService();
      const tenantId = req.query.tenantId || req.user?.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;

      const definition = await service.deprecate(id, tenantId, updatedBy);

      res.json({
        success: true,
        data: definition,
      });
    } catch (error) {
      const errorResponse = formatError(error, "DEPRECATE_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  // ============================================================================
  // WORKFLOW INSTANCES
  // ============================================================================

  /**
   * POST /api/v1/workflows/instances
   */
  async startWorkflow(req, res) {
    try {
      const service = getWorkflowEngineService();
      const tenantId = req.user.tenantId;
      const startedBy = req.user.id;

      const {
        workflow_code,
        workflow_definition_id,
        entity_type,
        entity_id,
        entity_name,
        project_id,
        context,
      } = req.body;

      const instance = await service.startWorkflow({
        tenantId,
        workflowCode: workflow_code,
        workflowDefinitionId: workflow_definition_id,
        entityType: entity_type,
        entityId: entity_id,
        entityName: entity_name,
        projectId: project_id,
        context,
        startedBy,
        req,
      });

      res.status(201).json({
        success: true,
        data: instance,
      });
    } catch (error) {
      const errorResponse = formatError(error, "START_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * GET /api/v1/workflows/instances
   */
  async listInstances(req, res) {
    try {
      const service = getWorkflowEngineService();
      const tenantId = req.user.tenantId;
      const { entity_type, entity_id, status, source_module, limit, offset } =
        req.query;

      const effectiveSourceModule =
        req.module && req.module.code
          ? req.module.code
          : req.user && req.user.isApiKey
            ? req.user.moduleCode
            : source_module;

      const effectiveModuleId =
        req.module && req.module.id
          ? req.module.id
          : req.user && req.user.isApiKey
            ? req.user.moduleId
            : req.query.source_module_id;

      console.log(
        `[WorkflowController] listInstances: req.user.isApiKey=${req.user.isApiKey}, moduleId=${req.user.moduleId}, effectiveModuleId=${effectiveModuleId}`,
      );

      const result = await service.listInstances(tenantId, {
        entityType: entity_type,
        entityId: entity_id,
        status,
        sourceModule: effectiveSourceModule,
        sourceModuleId: effectiveModuleId,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
      });

      res.json({
        success: true,
        data: result.instances,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * GET /api/v1/workflows/instances/:id
   */
  async getInstance(req, res) {
    try {
      const service = getWorkflowEngineService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const instance = await service.getInstance(id, tenantId, req.user.id);

      if (!instance) {
        throw new Error("Workflow instance not found");
      }

      res.json({
        success: true,
        data: instance,
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * GET /api/v1/workflows/instances/:id/history
   */
  async getInstanceHistory(req, res) {
    try {
      const service = getWorkflowEngineService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const history = await service.getHistory(id, tenantId);

      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * GET /api/v1/workflows/instances/:id/actions
   */
  async getAvailableActions(req, res) {
    try {
      const service = getWorkflowEngineService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const actions = await service.getAvailableActions(id, tenantId);

      res.json({
        success: true,
        data: actions,
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * POST /api/v1/workflows/instances/:id/transition
   */
  async transitionWorkflow(req, res) {
    try {
      const service = getWorkflowEngineService();
      const tenantId = req.user.tenantId;
      const performedBy = req.user.id;
      const { id } = req.params;
      const { task_id, action, comments, password, pin, signature_id, signature_action } = req.body;

      const instance = await service.transition({
        tenantId,
        instanceId: id,
        taskId: task_id,
        action,
        comments,
        signatureId: signature_id,
        signature: password
          ? {
              password,
              pin,
              signatureAction: signature_action,
              ipAddress: req.ip,
              userAgent: req.get("User-Agent"),
            }
          : null,
        performedBy,
      });

      res.json({
        success: true,
        data: instance,
      });
    } catch (error) {
      const errorResponse = formatError(error, "TRANSITION_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * POST /api/v1/workflows/instances/:id/cancel
   */
  async cancelWorkflow(req, res) {
    try {
      const service = getWorkflowEngineService();
      const tenantId = req.user.tenantId;
      const cancelledBy = req.user.id;
      const { id } = req.params;
      const { reason } = req.body;

      const instance = await service.cancelWorkflow(
        id,
        tenantId,
        cancelledBy,
        reason,
      );

      res.json({
        success: true,
        data: instance,
      });
    } catch (error) {
      const errorResponse = formatError(error, "CANCEL_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  // ============================================================================
  // WORKFLOW TASKS
  // ============================================================================

  /**
   * GET /api/v1/workflows/tasks
   */
  async getMyTasks(req, res) {
    try {
      const service = getWorkflowTaskService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { status, limit, offset, entity_id, entity_type, module_id } =
        req.query;

      const result = await service.getMyTasks(userId, tenantId, {
        status: status || "pending",
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        entityId: entity_id,
        entityType: entity_type,
        moduleId: module_id,
      });

      res.json({
        success: true,
        data: result.tasks,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset,
        },
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * GET /api/v1/workflows/tasks/counts
   */
  async getTaskCounts(req, res) {
    try {
      const service = getWorkflowTaskService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { entity_id, entity_type, module_id } = req.query;

      const counts = await service.getTaskCounts(userId, tenantId, {
        entityId: entity_id,
        entityType: entity_type,
        moduleId: module_id,
      });

      res.json({
        success: true,
        data: counts,
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * GET /api/v1/workflows/tasks/:id
   */
  async getTask(req, res) {
    try {
      const service = getWorkflowTaskService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const task = await service.getTask(id, tenantId);

      if (!task) {
        throw new Error("Task not found");
      }

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      const errorResponse = formatError(error, "FETCH_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * POST /api/v1/workflows/tasks/:id/delegate
   */
  async delegateTask(req, res) {
    try {
      const service = getWorkflowTaskService();
      const tenantId = req.user.tenantId;
      const delegatedBy = req.user.id;
      const { id } = req.params;
      const { delegate_to, reason } = req.body;

      const task = await service.delegateTask(
        id,
        tenantId,
        delegate_to,
        delegatedBy,
        reason,
      );

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      const errorResponse = formatError(error, "DELEGATE_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * POST /api/v1/workflows/tasks/:id/claim
   */
  async claimTask(req, res) {
    try {
      const service = getWorkflowTaskService();
      const tenantId = req.user.tenantId;
      const claimedBy = req.user.id;
      const { id } = req.params;

      const task = await service.claimTask(id, tenantId, claimedBy);

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      const errorResponse = formatError(error, "CLAIM_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }

  /**
   * POST /api/v1/workflows/tasks/:id/release
   */
  async releaseTask(req, res) {
    try {
      const service = getWorkflowTaskService();
      const tenantId = req.user.tenantId;
      const releasedBy = req.user.id;
      const { id } = req.params;

      const task = await service.releaseTask(id, tenantId, releasedBy);

      res.json({
        success: true,
        data: task,
      });
    } catch (error) {
      const errorResponse = formatError(error, "RELEASE_ERROR");
      res.status(getErrorStatusCode(errorResponse)).json({
        success: false,
        error: errorResponse,
      });
    }
  }
}

module.exports = new WorkflowController();
