/**
 * Workflow Engine Service
 * Core engine for executing workflows, handling transitions, and managing instances
 */

const { pool } = require('../config/database');
const { getWorkflowDefinitionService } = require('./workflow-definition.service');
const { getElectronicSignatureService } = require('./electronic-signature.service');
const { getEventService } = require('../infrastructure/kafka');
const { getAuditService } = require('./audit.service');
const { getNotificationService } = require('./notification.service');

// Workflow statuses
const WORKFLOW_STATUS = {
  ACTIVE: 'active',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
  SUSPENDED: 'suspended'
};

// Task statuses
const TASK_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  SKIPPED: 'skipped',
  DELEGATED: 'delegated'
};

class WorkflowEngineService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Start a new workflow instance
   */
  async startWorkflow({
    tenantId,
    workflowCode,
    workflowDefinitionId,
    entityType,
    entityId,
    entityName,
    projectId,
    context = {},
    startedBy,
    sourceModule: providedSourceModule,
    sourceModuleId: providedSourceModuleId,
    req = null
  }) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Get workflow definition
      const defService = getWorkflowDefinitionService();
      let definition;

      if (workflowDefinitionId) {
        definition = await defService.getById(workflowDefinitionId, tenantId);
      } else if (workflowCode) {
        definition = await defService.getByCode(workflowCode, tenantId, entityType);
      } else {
        definition = await defService.getDefault(tenantId, entityType);
      }

      if (!definition) {
        throw new Error('No workflow definition found');
      }

      if (definition.status !== 'active') {
        throw new Error('Workflow definition is not active');
      }

      // 1.5 Validate module access (if starting via API or specific module context)
      const effectiveModuleId = (req && req.module && req.module.id)
        ? req.module.id
        : (req && req.user && req.user.isApiKey ? req.user.moduleId : null);

      if (effectiveModuleId) {
        const definitionModuleIds = definition.source_module_id || [];
        // Strict isolation: if starting via a module context, the definition MUST 
        // explicitly include this module ID in its authorized list.
        if (!definitionModuleIds.includes(effectiveModuleId)) {
          throw new Error('This workflow definition is not authorized for your module');
        }
      }

      // 2. Find initial step
      const initialStep = definition.steps.find(s => s.step_type === 'initial');
      if (!initialStep) {
        throw new Error('Workflow has no initial step');
      }

      const sourceModule = providedSourceModule || ((req && req.module && req.module.code)
        ? req.module.code
        : (req && req.user)
          ? (req.user.isApiKey ? (req.user.moduleCode || 'api_key') : 'platform')
          : 'platform');

      const sourceModuleId = providedSourceModuleId || ((req && req.module && req.module.id)
        ? req.module.id
        : (req && req.user && req.user.moduleId)
          ? req.user.moduleId
          : null);

      // 3. Create workflow instance
      const enrichedContext = { ...context, project_id: projectId || null };
      const instanceResult = await client.query(
        `INSERT INTO workflow_instances (
          tenant_id, workflow_definition_id, entity_type, entity_id, entity_name,
          current_step_id, status, context, started_by, source_module, source_module_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING *`,
        [
          tenantId,
          definition.id,
          entityType,
          entityId,
          entityName,
          initialStep.id,
          WORKFLOW_STATUS.ACTIVE,
          JSON.stringify(enrichedContext),
          startedBy,
          sourceModule,
          sourceModuleId
        ]
      );

      const instance = instanceResult.rows[0];

      // 4. Create initial task
      await this._createTask(client, {
        tenantId,
        instanceId: instance.id,
        stepId: initialStep.id,
        step: initialStep,
        assignedBy: startedBy,
        context: { ...context, started_by: startedBy }
      });

      // 5. Record history
      await this._recordHistory(client, {
        tenantId,
        instanceId: instance.id,
        eventType: 'workflow_started',
        toStepId: initialStep.id,
        toStepName: initialStep.name,
        performedBy: startedBy,
        metadata: { workflow_name: definition.name, entity_name: entityName }
      });

      await client.query('COMMIT');

      // 6. Publish event
      this._publishEvent('workflow.started', {
        instanceId: instance.id,
        tenantId,
        workflowName: definition.name,
        entityType,
        entityId,
        entityName
      });
      setImmediate(async () => {
        try {
          await getAuditService().log({
            action: 'CREATE',
            user_id: startedBy,
            tenant_id: tenantId,
            resource_type: 'workflow',
            resource_id: instance.id,
            response_status: 200,
            metadata: { entity_type: entityType, entity_id: entityId, entity_name: entityName, workflow_name: definition.name }
          });
        } catch (e) { console.warn('[WorkflowEngine] Audit log failed:', e.message); }
      });

      return this.getInstance(instance.id, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Execute a transition (move to next step)
   */
  async transition({
    tenantId,
    instanceId,
    taskId,
    action,
    comments,
    signature,  // { password, pin } for e-signature
    signatureId,
    performedBy
  }) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Get current instance and task
      const instance = await this._getInstanceRaw(client, instanceId, tenantId);
      if (!instance) {
        throw new Error('Workflow instance not found');
      }

      if (instance.status !== WORKFLOW_STATUS.ACTIVE) {
        throw new Error(`Workflow is ${instance.status}, cannot transition`);
      }

      const task = await this._getTaskRaw(client, taskId, tenantId);
      if (task.workflow_instance_id !== instanceId) {
        throw new Error('Task does not belong to this workflow instance');
      }
      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status !== 'pending' && task.status !== 'in_progress') {
        throw new Error(`Task cannot be transitioned (current status: ${task.status})`);
      }

      // Verify user is assigned or has permission
      let isAuthorized = false;

      if (task.assigned_user_ids && task.assigned_user_ids.length > 0) {
        if (task.assigned_user_ids.includes(performedBy)) {
          isAuthorized = true;
        } else {
          // Check if user is a delegate for ANY of the assigned users
          for (const assignedUser of task.assigned_user_ids) {
            const isDelegate = await this._checkDelegate(client, assignedUser, performedBy, tenantId);
            if (isDelegate) {
              isAuthorized = true;
              break;
            }
          }
        }
      } else if (task.assigned_to) {
        // Backward compatibility
        if (task.assigned_to === performedBy) {
          isAuthorized = true;
        } else {
          const isDelegate = await this._checkDelegate(client, task.assigned_to, performedBy, tenantId);
          if (isDelegate) isAuthorized = true;
        }
      }

      if (!isAuthorized && ((task.assigned_role_ids && task.assigned_role_ids.length > 0) || task.assigned_role)) {
        // Role-based validation
        const hasRole = await this._checkUserRole(client, performedBy, task.assigned_role_ids || task.assigned_role, tenantId);
        if (hasRole) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized && !task.assigned_user_ids?.length && !task.assigned_to && !task.assigned_role_ids?.length && !task.assigned_role) {
        // Fallback for originator tasks
        if (instance.started_by === performedBy) {
          isAuthorized = true;
        }
      }

      if (!isAuthorized) {
        throw new Error('You are not authorized to perform this task transition');
      }



      // 2. Validate action against current step's available actions
      const currentStepResult = await client.query(
        'SELECT step_code, name, available_actions FROM workflow_steps WHERE id = $1',
        [instance.current_step_id]
      );
      const currentStep = currentStepResult.rows[0];

      if (currentStep) {
        const availableActions = Array.isArray(currentStep.available_actions)
          ? currentStep.available_actions
          : (typeof currentStep.available_actions === 'string' ? JSON.parse(currentStep.available_actions) : []);

        if (!availableActions.includes(action)) {
          throw new Error(`Action '${action}' is not valid for step '${currentStep.name}'. Available actions: ${availableActions.join(', ')}`);
        }
      }

      // 3. Find valid transition
      const transitionResult = await client.query(
        `SELECT t.*, ts.step_code as to_step_code, ts.name as to_step_name, ts.step_type as to_step_type
         FROM workflow_transitions t
         JOIN workflow_steps ts ON t.to_step_id = ts.id
         WHERE t.from_step_id = $1 AND t.action = $2
         ORDER BY t.priority DESC
         LIMIT 1`,
        [instance.current_step_id, action]
      );

      if (transitionResult.rows.length === 0) {
        throw new Error(`No transition defined for action '${action}' from the current step`);
      }

      const transition = transitionResult.rows[0];

      // 3.5 Section completion gate for document entities
      // Only enforced when the document has structured sections.
      if (instance.entity_type === 'document') {
        const { getDocumentService } = require('./document.service');
        const docService = getDocumentService();
        const hasSections = await docService.hasSections(instance.entity_id, tenantId);
        if (hasSections) {
          // 1. Get counts for all types of issues
          const pendingCount = await docService.countSectionsByStatus(instance.entity_id, tenantId, 'pending');
          const totalReworkCount = await docService.countSectionsByStatus(instance.entity_id, tenantId, 'rework');
          const totalCommentsCount = await docService.countUnresolvedComments(instance.entity_id, tenantId);

          // Get counts for INHERITED issues (created in previous steps)
          const inheritedReworkCount = await docService.countReworkFromPreviousSteps(
            instance.entity_id, tenantId, currentStep.name
          );
          const inheritedCommentsCount = await docService.countUnresolvedCommentsFromPreviousSteps(
            instance.entity_id, tenantId, currentStep.name
          );
          
          const isTerminal = transition.to_step_type === 'terminal';
          const actionLower = action.toLowerCase();
          const isBackwardAction = actionLower.includes('reject') || 
                                   actionLower.includes('rework') || 
                                   actionLower.includes('return') || 
                                   actionLower.includes('back') ||
                                   actionLower.includes('correction');

          if (!isBackwardAction) {
            // A. TERMINAL STEP: Strictly block ALL unresolved issues
            if (isTerminal) {
              if (pendingCount > 0 || totalReworkCount > 0 || totalCommentsCount > 0) {
                throw new Error(
                  `Final approval requires all sections to be reviewed and all comments resolved. ` +
                  `(${pendingCount} pending, ${totalReworkCount} rework, ${totalCommentsCount} comments remaining)`
                );
              }
            } 
            // B. INTERMEDIATE FORWARD STEP: Block PENDING or INHERITED issues
            else {
              if (pendingCount > 0) {
                throw new Error(`Cannot proceed: ${pendingCount} section(s) have not been reviewed yet.`);
              }
              if (inheritedReworkCount > 0) {
                throw new Error(`Cannot proceed: There are ${inheritedReworkCount} rework flags from previous steps that must be resolved.`);
              }
              if (inheritedCommentsCount > 0) {
                throw new Error(`Cannot proceed: There are ${inheritedCommentsCount} unresolved comments from previous steps.`);
              }
              // Note: Rework and comments created in the CURRENT step ARE ALLOWED to move forward as feedback.
            }
          }
        }
      }

      // 3. Handle signature if required
      if (transition.requires_signature && !signatureId) {
        if (!signature || !signature.password) {
          throw new Error('Electronic signature required for this action');
        }

        let signatureAction = signature.signatureAction || action.toUpperCase();
        const validActions = ['APPROVE', 'REJECT', 'REVIEW', 'AUTHOR', 'VERIFY', 'RELEASE', 'ACKNOWLEDGE', 'WITHDRAW'];
        if (!validActions.includes(signatureAction)) {
          if (signatureAction.includes('APPROVE')) signatureAction = 'APPROVE';
          else if (signatureAction.includes('REJECT')) signatureAction = 'REJECT';
          else if (signatureAction.includes('VERIFY')) signatureAction = 'VERIFY';
          else if (signatureAction.includes('REVIEW')) signatureAction = 'REVIEW';
          else if (signatureAction === 'SUBMIT' || signatureAction.includes('AUTHOR')) signatureAction = 'AUTHOR';
          else if (signatureAction.includes('RELEASE')) signatureAction = 'RELEASE';
          else if (signatureAction.includes('ACKNOWLEDGE')) signatureAction = 'ACKNOWLEDGE';
          else if (signatureAction.includes('WITHDRAW')) signatureAction = 'WITHDRAW';
          else signatureAction = 'APPROVE'; // Default fallback mapping
        }

        const esigService = getElectronicSignatureService();
        const sig = await esigService.sign({
          userId: performedBy,
          tenantId,
          resourceType: 'workflow_task',
          resourceId: taskId,
          resourceName: `${instance.entity_name} - ${action}`,
          action: signatureAction,
          meaning: transition.signature_meaning || `I ${action} this workflow step`,
          password: signature.password,
          pin: signature.pin,
          authMethod: signature.pin ? 'password_pin' : 'password',
          ipAddress: signature.ipAddress,
          userAgent: signature.userAgent
        });

        signatureId = sig.id;
      }

      // 4. Check comment requirement
      if (transition.requires_comment && !comments) {
        throw new Error('Comment required for this action');
      }

      // 5. Complete current task
      await client.query(
        `UPDATE workflow_tasks 
         SET status = $1, completed_at = NOW(), completed_by = $2, 
             action_taken = $3, comments = $4, signature_id = $5, updated_at = NOW()
         WHERE id = $6`,
        [TASK_STATUS.COMPLETED, performedBy, action, comments, signatureId, taskId]
      );

      // 7. Move to next step
      await client.query(
        `UPDATE workflow_instances 
         SET current_step_id = $1, updated_at = NOW()
         WHERE id = $2`,
        [transition.to_step_id, instanceId]
      );

      // 8. Record history
      await this._recordHistory(client, {
        tenantId,
        instanceId,
        eventType: 'step_completed',
        fromStepId: instance.current_step_id,
        fromStepName: currentStep.name,
        toStepId: transition.to_step_id,
        toStepName: transition.to_step_name,
        action,
        comments,
        performedBy,
        signatureId,
        metadata: { transition_name: transition.name }
      });

      // 8.5 Trigger document section reset if this is a backward/rework transition
      if (instance.entity_type === 'document') {
        const actionLower = action.toLowerCase();
        const isBackwardAction = actionLower.includes('reject') || 
                                 actionLower.includes('rework') || 
                                 actionLower.includes('return') || 
                                 actionLower.includes('back') ||
                                 actionLower.includes('correction');
        
        if (isBackwardAction) {
          const { getDocumentService } = require('./document.service');
          await getDocumentService().resetSectionsForRework(instance.entity_id, tenantId, performedBy);
        }
      }

      // 9. Check if workflow is complete (terminal step)
      if (transition.to_step_type === 'terminal') {
        await client.query(
          `UPDATE workflow_instances 
           SET status = $1, completed_at = NOW(), updated_at = NOW()
           WHERE id = $2`,
          [WORKFLOW_STATUS.COMPLETED, instanceId]
        );

        // Auto-approve document when its workflow reaches the terminal step
        if (instance.entity_type === 'document') {
          await client.query(
            `UPDATE documents
             SET status = 'approved', updated_by = $1, updated_at = NOW()
             WHERE id = $2 AND tenant_id = $3 AND status != 'approved'`,
            [performedBy, instance.entity_id, tenantId]
          );
          await client.query(
            `UPDATE document_versions
             SET status = 'approved', approved_by = $1, approved_at = NOW()
             WHERE document_id = $2 AND status = 'in_review'`,
            [performedBy, instance.entity_id]
          );
          // Also reset all section review_status to 'pending' for the next review cycle
          // (no-op if no sections exist)
          // Notify asynchronously
          setImmediate(async () => {
            try {
              const { getDocumentService } = require('./document.service');
              await getDocumentService().markWorkflowApproved(
                instance.entity_id, tenantId, performedBy, comments
              );
            } catch (e) {
              console.warn('[WorkflowEngine] Document auto-approve notification failed:', e.message);
            }
          });
        }

        await this._recordHistory(client, {
          tenantId,
          instanceId,
          eventType: 'workflow_completed',
          performedBy,
          metadata: { final_action: action }
        });

        this._publishEvent('workflow.completed', {
          instanceId,
          tenantId,
          entityType: instance.entity_type,
          entityId: instance.entity_id,
          entityName: instance.entity_name,
          finalAction: action
        });

        // Notify workflow starter that workflow is complete
        if (instance.started_by) {
          setImmediate(async () => {
            try {
              await getNotificationService().sendFromTemplate(tenantId, instance.started_by, 'workflow_completed', {
                entity_name: instance.entity_name,
                action: action
              }, {
                entityType: instance.entity_type,
                entityId: instance.entity_id,
                entityName: instance.entity_name,
                actionUrl: `/${instance.entity_type}s/${instance.entity_id}`,
                createdBy: performedBy
              });
            } catch (e) {
              console.warn('[WorkflowEngine] Notification failed:', e.message);
            }
          });
        }
      } else {
        // Create task for next step
        const nextStepResult = await client.query(
          'SELECT * FROM workflow_steps WHERE id = $1',
          [transition.to_step_id]
        );
        const nextStep = nextStepResult.rows[0];

        await this._createTask(client, {
          tenantId,
          instanceId,
          stepId: transition.to_step_id,
          step: this._formatStepRaw(nextStep),
          assignedBy: performedBy,
          context: { ...instance.context, started_by: instance.started_by }
        });
      }

      await client.query('COMMIT');

      this._publishEvent('workflow.transitioned', {
        instanceId,
        tenantId,
        fromStep: currentStep.name,
        toStep: transition.to_step_name,
        action,
        performedBy
      });

      setImmediate(async () => {
        try {
          await getAuditService().log({
            action: 'UPDATE',
            user_id: performedBy,
            tenant_id: tenantId,
            resource_type: 'workflow',
            resource_id: instanceId,
            response_status: 200,
            metadata: { action, from_step: currentStep.name, to_step: transition.to_step_name, signature_id: signatureId || null }
          });
        } catch (e) { console.warn('[WorkflowEngine] Audit log failed:', e.message); }
      });

      return this.getInstance(instanceId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow instance
   */
  async getInstance(instanceId, tenantId, currentUserId = null) {
    const result = await this.pool.query(
      `SELECT wi.*, 
              wd.name as workflow_name, wd.code as workflow_code,
              cs.step_code as current_step_code, cs.name as current_step_name,
              u.email as started_by_email, u.first_name, u.last_name
       FROM workflow_instances wi
       JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.id
       LEFT JOIN workflow_steps cs ON wi.current_step_id = cs.id
       LEFT JOIN users u ON wi.started_by = u.id
       WHERE wi.id = $1 AND wi.tenant_id = $2`,
      [instanceId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const instance = result.rows[0];

    // Get tasks
    const tasksResult = await this.pool.query(
      `SELECT wt.*, ws.step_code, ws.name as step_name,
              (SELECT ARRAY_AGG(name) FROM roles WHERE id = ANY(wt.assigned_role_ids)) as assigned_role_names,
              (SELECT ARRAY_AGG(email) FROM users WHERE id = ANY(wt.assigned_user_ids)) as assigned_user_emails
       FROM workflow_tasks wt
       JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
       WHERE wt.workflow_instance_id = $1
       ORDER BY wt.created_at`,
      [instanceId]
    );

    // Get available transitions
    const transitionsResult = await this.pool.query(
      `SELECT t.action, t.name, t.requires_signature, t.requires_comment, t.signature_meaning,
              ts.step_code as to_step_code, ts.name as to_step_name
       FROM workflow_transitions t
       JOIN workflow_steps ts ON t.to_step_id = ts.id
       WHERE t.from_step_id = $1
       ORDER BY t.priority`,
      [instance.current_step_id]
    );

    const formattedInstance = this._formatInstance(instance, tasksResult.rows, transitionsResult.rows, currentUserId);

    // Get full workflow definition (includes steps and transitions)
    const defService = getWorkflowDefinitionService();
    const definition = await defService.getById(instance.workflow_definition_id, tenantId);

    return {
      ...formattedInstance,
      workflow_definition: definition ? {
        steps: definition.steps,
        transitions: definition.transitions
      } : null
    };
  }

  /**
   * Get workflow history
   */
  async getHistory(instanceId, tenantId) {
    const result = await this.pool.query(
      `SELECT wh.*, u.email as performed_by_email
       FROM workflow_history wh
       LEFT JOIN users u ON wh.performed_by = u.id
       WHERE wh.workflow_instance_id = $1 AND wh.tenant_id = $2
       ORDER BY wh.performed_at`,
      [instanceId, tenantId]
    );

    return result.rows.map(h => ({
      id: h.id,
      event_type: h.event_type,
      from_step: h.from_step_name,
      to_step: h.to_step_name,
      action: h.action,
      comments: h.comments,
      performed_by: h.performed_by_email || h.performed_by_name,
      performed_at: h.performed_at,
      signature_id: h.signature_id,
      metadata: h.metadata
    }));
  }

  /**
   * List workflow instances
   */
  async listInstances(tenantId, options = {}) {
    const { entityType, entityId, status, sourceModule, sourceModuleId, limit = 50, offset = 0 } = options;

    let query = `
      SELECT wi.*, 
             wd.name as workflow_name,
             cs.name as current_step_name,
             u.email as started_by_email
      FROM workflow_instances wi
      JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.id
      LEFT JOIN workflow_steps cs ON wi.current_step_id = cs.id
      LEFT JOIN users u ON wi.started_by = u.id
      WHERE wi.tenant_id = $1
    `;

    const params = [tenantId];
    let paramIndex = 2;

    // Build WHERE clauses for both main query and count query
    let whereExtras = '';

    if (entityType) {
      whereExtras += ` AND wi.entity_type = $${paramIndex++}`;
      params.push(entityType);
    }

    if (entityId) {
      whereExtras += ` AND wi.entity_id = $${paramIndex++}`;
      params.push(entityId);
    }

    if (status) {
      whereExtras += ` AND wi.status = $${paramIndex++}`;
      params.push(status);
    }

    if (sourceModule) {
      whereExtras += ` AND wi.source_module = $${paramIndex++}`;
      params.push(sourceModule);
    }

    if (sourceModuleId) {
      whereExtras += ` AND wi.source_module_id = $${paramIndex++}::uuid`;
      params.push(sourceModuleId);
    }

    query += whereExtras;
    query += ` ORDER BY wi.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    // Count query (reuse same filters, exclude limit/offset)
    let countQuery = 'SELECT COUNT(*) FROM workflow_instances wi WHERE wi.tenant_id = $1' + whereExtras;
    const countParams = params.slice(0, params.length - 2); // exclude limit and offset

    const countResult = await this.pool.query(countQuery, countParams);

    return {
      instances: result.rows.map(i => ({
        id: i.id,
        workflow_name: i.workflow_name,
        entity: {
          type: i.entity_type,
          id: i.entity_id,
          name: i.entity_name
        },
        current_step: i.current_step_name,
        status: i.status,
        started_by: i.started_by_email,
        started_at: i.started_at,
        completed_at: i.completed_at,
        source_module: i.source_module,
        source_module_id: i.source_module_id
      })),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Cancel a workflow
   */
  async cancelWorkflow(instanceId, tenantId, cancelledBy, reason) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update instance
      const result = await client.query(
        `UPDATE workflow_instances 
         SET status = $1, cancelled_at = NOW(), cancelled_by = $2, 
             cancellation_reason = $3, updated_at = NOW()
         WHERE id = $4 AND tenant_id = $5 AND status = 'active'
         RETURNING *`,
        [WORKFLOW_STATUS.CANCELLED, cancelledBy, reason, instanceId, tenantId]
      );

      if (result.rows.length === 0) {
        const existsCheck = await client.query(
          'SELECT status FROM workflow_instances WHERE id = $1 AND tenant_id = $2',
          [instanceId, tenantId]
        );
        if (existsCheck.rows.length === 0) {
          throw new Error('Workflow not found');
        }
        throw new Error('Workflow is already ' + existsCheck.rows[0].status);
      }

      // Cancel pending tasks
      await client.query(
        `UPDATE workflow_tasks 
         SET status = 'skipped', updated_at = NOW()
         WHERE workflow_instance_id = $1 AND status = 'pending'`,
        [instanceId]
      );

      // Record history
      await this._recordHistory(client, {
        tenantId,
        instanceId,
        eventType: 'workflow_cancelled',
        performedBy: cancelledBy,
        metadata: { reason }
      });

      await client.query('COMMIT');

      this._publishEvent('workflow.cancelled', {
        instanceId,
        tenantId,
        cancelledBy,
        reason
      });

      // Notify workflow starter that workflow was cancelled
      const cancelledInstance = result.rows[0];
      if (cancelledInstance.started_by && cancelledInstance.started_by !== cancelledBy) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, cancelledInstance.started_by, 'workflow_cancelled', {
              entity_name: cancelledInstance.entity_name,
              reason: reason || 'No reason provided'
            }, {
              entityType: cancelledInstance.entity_type,
              entityId: cancelledInstance.entity_id,
              entityName: cancelledInstance.entity_name,
              actionUrl: `/${cancelledInstance.entity_type}s/${cancelledInstance.entity_id}`,
              createdBy: cancelledBy
            });
          } catch (e) {
            console.warn('[WorkflowEngine] Notification failed:', e.message);
          }
        });
      }

      setImmediate(async () => {
        try {
          await getAuditService().log({
            action: 'UPDATE',
            user_id: cancelledBy,
            tenant_id: tenantId,
            resource_type: 'workflow',
            resource_id: instanceId,
            response_status: 200,
            metadata: { action: 'cancelled', reason }
          });
        } catch (e) { console.warn('[WorkflowEngine] Audit log failed:', e.message); }
      });

      return this.getInstance(instanceId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get available actions for current step
   */
  async getAvailableActions(instanceId, tenantId) {
    // Verify instance exists
    const instanceCheck = await this.pool.query(
      'SELECT id, status FROM workflow_instances WHERE id = $1 AND tenant_id = $2',
      [instanceId, tenantId]
    );

    if (instanceCheck.rows.length === 0) {
      throw new Error('Workflow instance not found');
    }

    const result = await this.pool.query(
      `SELECT t.action, t.name, t.requires_signature, t.requires_comment, t.signature_meaning,
              ts.step_code as to_step_code, ts.name as to_step_name
       FROM workflow_instances wi
       JOIN workflow_transitions t ON t.from_step_id = wi.current_step_id
       JOIN workflow_steps ts ON t.to_step_id = ts.id
       WHERE wi.id = $1 AND wi.tenant_id = $2
       ORDER BY t.priority`,
      [instanceId, tenantId]
    );

    return result.rows.map(a => ({
      action: a.action,
      name: a.name,
      requires_signature: a.requires_signature,
      requires_comment: a.requires_comment,
      signature_meaning: a.signature_meaning,
      next_step: a.to_step_name
    }));
  }

  // Private helper methods

  async _createTask(client, { tenantId, instanceId, stepId, step, assignedBy, context }) {
    let assignedUserIds = null;
    let assignedRoleIds = null;

    // Determine assignees
    const assigneeType = step.assignee ? step.assignee.type : step.assignee_type;
    const assigneeIds = step.assignee ? (step.assignee.user_ids || step.assignee.ids) : step.assignee_user_ids;
    const assigneeRoleIds = step.assignee ? step.assignee.role_ids : step.assignee_role_ids;

    switch (assigneeType) {
      case 'user':
        assignedUserIds = assigneeIds || [context.started_by];
        break;
      case 'role':
        assignedRoleIds = assigneeRoleIds;
        break;
      case 'originator':
        assignedUserIds = [context.started_by];
        break;
    }

    // Check for delegation
    // Check for delegation (only if single user assigned or we want to support multiple delegates)
    if (assignedUserIds && assignedUserIds.length === 1) {
      const delegate = await this._getActiveDelegate(client, assignedUserIds[0], tenantId);
      if (delegate) {
        assignedUserIds = [delegate];
      }
    }

    // Calculate due date
    let dueAt = null;
    if (step.sla && step.sla.hours) {
      dueAt = new Date();
      dueAt.setHours(dueAt.getHours() + step.sla.hours);
    }

    const result = await client.query(
      `INSERT INTO workflow_tasks (
        tenant_id, workflow_instance_id, workflow_step_id,
        assigned_user_ids, assigned_role_ids, 
        assigned_by, due_at, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [
        tenantId, 
        instanceId, 
        stepId, 
        assignedUserIds,
        assignedRoleIds,
        assignedBy, 
        dueAt
      ]
    );

    // Record history
    await this._recordHistory(client, {
      tenantId,
      instanceId,
      eventType: 'task_assigned',
      toStepId: stepId,
      toStepName: step.name,
      performedBy: assignedBy,
      metadata: { 
        assigned_user_ids: assignedUserIds, 
        assigned_role_ids: assignedRoleIds
      }
    });

    this._publishEvent('workflow.task_assigned', {
      taskId: result.rows[0].id,
      instanceId,
      tenantId,
      assignedUserIds,
      assignedRoleIds,
      stepName: step.name
    });

    // Notify assignees (consolidated to avoid duplicates)
    setImmediate(async () => {
      try {
        const nService = getNotificationService();
        const userIds = new Set();
        
        // 1. Direct user assignments
        if (assignedUserIds && assignedUserIds.length > 0) {
          assignedUserIds.forEach(id => userIds.add(id));
        }
        
        // 2. Role assignment
        if (assignedRoleIds && assignedRoleIds.length > 0) {
          const roleUsers = await this.pool.query(
            `SELECT DISTINCT u.id FROM users u
             JOIN user_roles ur ON u.id = ur.user_id
             JOIN user_tenants ut ON ut.user_id = u.id
             WHERE ur.role_id = ANY($1)
               AND ut.tenant_id = $2 
               AND LOWER(ut.status) = 'active' AND LOWER(u.status) = 'active'`,
            [assignedRoleIds, tenantId]
          );
          roleUsers.rows.forEach(u => userIds.add(u.id));
        }

        // Fetch role names for notification context if needed
        let roleNamesStr = 'Assignee';
        if (assignedRoleIds && assignedRoleIds.length > 0) {
          const rolesRes = await this.pool.query('SELECT name FROM roles WHERE id = ANY($1)', [assignedRoleIds]);
          if (rolesRes.rows.length > 0) {
            roleNamesStr = rolesRes.rows.map(r => r.name).join(', ');
          }
        }

        // 3. Send unique notifications
        for (const userId of userIds) {
          // If the user was the one who performed the transition, skip notifying them
          if (userId === assignedBy) continue;

          // Decide template: if specifically assigned to them, use task_assigned, else role_task_assigned
          const templateCode = (assignedUserIds?.includes(userId)) ? 'task_assigned' : 'role_task_assigned';

          await nService.sendFromTemplate(tenantId, userId, templateCode, {
            step_name: step.name,
            role: roleNamesStr
          }, {
            entityType: 'workflow_task',
            entityId: result.rows[0].id,
            entityName: step.name,
            actionUrl: `/workflows/${instanceId}`,
            createdBy: assignedBy
          });
        }
      } catch (e) {
        console.warn('[WorkflowEngine] Consolidated notification failed:', e.message);
      }
    });

    return result.rows[0];
  }

  async _recordHistory(client, data) {
    await client.query(
      `INSERT INTO workflow_history (
        tenant_id, workflow_instance_id, event_type,
        from_step_id, to_step_id, from_step_name, to_step_name,
        action, comments, performed_by, signature_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        data.tenantId,
        data.instanceId,
        data.eventType,
        data.fromStepId,
        data.toStepId,
        data.fromStepName,
        data.toStepName,
        data.action,
        data.comments,
        data.performedBy,
        data.signatureId,
        JSON.stringify(data.metadata || {})
      ]
    );
  }

  async _getInstanceRaw(client, instanceId, tenantId) {
    const result = await client.query(
      'SELECT * FROM workflow_instances WHERE id = $1 AND tenant_id = $2',
      [instanceId, tenantId]
    );
    return result.rows[0];
  }

  async _getTaskRaw(client, taskId, tenantId) {
    const result = await client.query(
      'SELECT * FROM workflow_tasks WHERE id = $1 AND tenant_id = $2',
      [taskId, tenantId]
    );
    return result.rows[0];
  }

  async _checkDelegate(client, originalUser, potentialDelegate, tenantId) {
    const result = await client.query(
      `SELECT 1 FROM workflow_delegates 
       WHERE delegator_id = $1 AND delegate_id = $2 AND tenant_id = $3
       AND is_active = TRUE AND starts_at <= NOW() 
       AND (ends_at IS NULL OR ends_at > NOW())
       LIMIT 1`,
      [originalUser, potentialDelegate, tenantId]
    );
    return result.rows.length > 0;
  }

  async _getActiveDelegate(client, userId, tenantId) {
    const result = await client.query(
      `SELECT delegate_id FROM workflow_delegates 
       WHERE delegator_id = $1 AND tenant_id = $2
       AND is_active = TRUE AND starts_at <= NOW() 
       AND (ends_at IS NULL OR ends_at > NOW())
       LIMIT 1`,
      [userId, tenantId]
    );
    return result.rows.length > 0 ? result.rows[0].delegate_id : null;
  }

  async _checkUserRole(client, userId, roleIdsOrNames, tenantId) {
    if (!roleIdsOrNames) return false;
    
    if (Array.isArray(roleIdsOrNames) && roleIdsOrNames.length > 0) {
      // Check if they are UUIDs
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(roleIdsOrNames[0]);
      
      if (isUuid) {
        const result = await client.query(
          `SELECT 1 FROM user_roles
           WHERE user_id = $1 AND role_id = ANY($2) AND tenant_id = $3
           LIMIT 1`,
          [userId, roleIdsOrNames, tenantId]
        );
        return result.rows.length > 0;
      }
    }

    // Legacy role name/code check
    const roles = typeof roleIdsOrNames === 'string' 
      ? (roleIdsOrNames.includes(',') ? roleIdsOrNames.split(',') : [roleIdsOrNames])
      : roleIdsOrNames;

    const result = await client.query(
      `SELECT 1 FROM user_roles ur
       JOIN roles r ON ur.role_id = r.id
       WHERE ur.user_id = $1 AND (r.name = ANY($2) OR r.code = ANY($2)) AND ur.tenant_id = $3
       LIMIT 1`,
      [userId, roles, tenantId]
    );
    return result.rows.length > 0;
  }

  _formatStepRaw(step) {
    return {
      id: step.id,
      step_code: step.step_code,
      name: step.name,
      step_type: step.step_type,
      assignee: {
        type: step.assignee_type,
        id: step.assignee_id,
        ids: step.assignee_user_ids,
        role: step.assignee_role && step.assignee_role.includes(',') ? step.assignee_role.split(',') : step.assignee_role,
        role_ids: step.assignee_role_ids
      },
      sla: {
        hours: step.sla_hours
      }
    };
  }

  _formatInstance(instance, tasks, availableTransitions, currentUserId = null) {
    return {
      id: instance.id,
      workflow: {
        id: instance.workflow_definition_id,
        name: instance.workflow_name,
        code: instance.workflow_code
      },
      entity: {
        type: instance.entity_type,
        id: instance.entity_id,
        name: instance.entity_name
      },
      current_step: {
        id: instance.current_step_id,
        code: instance.current_step_code,
        name: instance.current_step_name
      },
      status: instance.status,
      context: instance.context,
      tasks: tasks.map(t => {
        let assignedToName = null;
        if (t.assigned_user_ids?.length > 0) {
          const isAssignedToMe = currentUserId && t.assigned_user_ids.includes(currentUserId);
          const otherEmails = (t.assigned_user_emails || []).filter((_, index) => {
            return !isAssignedToMe || t.assigned_user_ids[index] !== currentUserId;
          });

          if (isAssignedToMe) {
            assignedToName = otherEmails.length > 0 ? `You + ${otherEmails.join(", ")}` : "You";
          } else {
            assignedToName = t.assigned_user_emails?.join(", ") || `${t.assigned_user_ids.length} users`;
          }
        } else if (t.assigned_role_ids?.length > 0) {
          assignedToName = t.assigned_role_names?.length > 0 
            ? t.assigned_role_names.join(", ") 
            : `${t.assigned_role_ids.length} roles`;
        } else {
          assignedToName = "Originator";
        }

        return {
          id: t.id,
          step: t.step_name,
          assigned_to_name: assignedToName,
          assigned_user_ids: t.assigned_user_ids,
          assigned_role_ids: t.assigned_role_ids,
          status: t.status,
          action_taken: t.action_taken,
          completed_at: t.completed_at,
          due_at: t.due_at
        };
      }),
      available_actions: availableTransitions.map(t => ({
        action: t.action,
        name: t.name,
        requires_signature: t.requires_signature,
        requires_comment: t.requires_comment,
        next_step: t.to_step_name
      })),
      started_by: instance.started_by_email ? {
        email: instance.started_by_email,
        name: `${instance.first_name} ${instance.last_name}`
      } : null,
      started_at: instance.started_at,
      completed_at: instance.completed_at,
      cancelled_at: instance.cancelled_at,
      cancelled_by: instance.cancelled_by || null,
      cancellation_reason: instance.cancellation_reason || null
    };
  }

  _publishEvent(type, data) {
    try {
      const eventService = getEventService();
      eventService.publish('qassure.workflow.events', { type, data, timestamp: new Date() });
    } catch (e) {
      console.error('[WorkflowEngine] Kafka publish error:', e.message);
    }
  }
}

// Singleton
let instance = null;

const getWorkflowEngineService = () => {
  if (!instance) {
    instance = new WorkflowEngineService();
  }
  return instance;
};

module.exports = {
  WorkflowEngineService,
  getWorkflowEngineService,
  WORKFLOW_STATUS,
  TASK_STATUS
};
