/**
 * Workflow Task Service
 * Manages workflow tasks - pending approvals, assignments, delegation
 */

const { pool } = require('../config/database');
const { getEventService } = require('../infrastructure/kafka');

class WorkflowTaskService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Get tasks assigned to a user
   */
  async getMyTasks(userId, tenantId, options = {}) {
    const { 
      status = 'pending', 
      limit = 50, 
      offset = 0,
      entityId,
      entityType,
      moduleId
    } = options;

    let paramIndex = 4;
    const commonParams = [tenantId, status, userId];
    
    let extraFilters = '';
    if (entityType) {
      extraFilters += ` AND wi.entity_type = $${paramIndex++}`;
      commonParams.push(entityType);
    }
    if (entityId) {
      extraFilters += ` AND wi.entity_id = $${paramIndex++}`;
      commonParams.push(entityId);
    }
    if (moduleId) {
      extraFilters += ` AND wi.source_module_id = $${paramIndex++}::uuid`;
      commonParams.push(moduleId);
    }

    const limitParamIndex = paramIndex++;
    const offsetParamIndex = paramIndex++;
    const mainParams = [...commonParams, limit, offset];

    // Get direct assignments, role-based assignments, and originator tasks (where assigned_to is null)
    const result = await this.pool.query(
      `SELECT wt.*, 
              ws.step_code, ws.name as step_name, ws.requires_signature,
              wi.entity_type, wi.entity_id, wi.entity_name, wi.source_module_id,
              wd.name as workflow_name,
              (SELECT ARRAY_AGG(name) FROM roles WHERE id = ANY(wt.assigned_role_ids)) as assigned_role_names,
              (SELECT JSON_AGG(JSON_BUILD_OBJECT('email', email, 'name', NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''))) FROM users WHERE id = ANY(wt.assigned_user_ids)) as assigned_users
       FROM workflow_tasks wt
       JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
       JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
       JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.id
       WHERE wt.tenant_id = $1
       AND wt.status = $2
       AND (
         (wt.assigned_user_ids && ARRAY[$3]::uuid[]) -- Directly assigned
         OR EXISTS (
           SELECT 1 FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = $3 AND ur.tenant_id = $1
           AND r.id = ANY(wt.assigned_role_ids)
         ) -- Role match within same tenant
         OR (wt.assigned_user_ids IS NULL AND wt.assigned_role_ids IS NULL AND wi.started_by = $3) -- Originator fallback
         OR EXISTS (
           SELECT 1 FROM workflow_delegates wdg
           WHERE wdg.delegator_id = ANY(wt.assigned_user_ids)
           AND wdg.delegate_id = $3 
           AND wdg.tenant_id = $1
           AND wdg.is_active = TRUE 
           AND wdg.starts_at <= NOW() 
           AND (wdg.ends_at IS NULL OR wdg.ends_at > NOW())
         ) -- Delegation
       )
       ${extraFilters}
       ORDER BY wt.due_at ASC NULLS LAST, wt.created_at ASC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      mainParams
    );

    // Get count
    const countResult = await this.pool.query(
      `SELECT COUNT(*) FROM workflow_tasks wt
       JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
       WHERE wt.tenant_id = $1 AND wt.status = $2
       AND (
         (wt.assigned_user_ids && ARRAY[$3]::uuid[])
         OR EXISTS (
           SELECT 1 FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = $3 AND ur.tenant_id = $1
           AND r.id = ANY(wt.assigned_role_ids)
         )
         OR (wt.assigned_user_ids IS NULL AND wt.assigned_role_ids IS NULL AND wi.started_by = $3)
         OR EXISTS (
           SELECT 1 FROM workflow_delegates wdg
           WHERE wdg.delegator_id = ANY(wt.assigned_user_ids)
           AND wdg.delegate_id = $3 
           AND wdg.tenant_id = $1
           AND wdg.is_active = TRUE 
           AND wdg.starts_at <= NOW() 
           AND (wdg.ends_at IS NULL OR wdg.ends_at > NOW())
         )
       )
       ${extraFilters}`,
      commonParams
    );

    return {
      tasks: result.rows.map(t => this._formatTask(t, userId)),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Get task by ID
   */
  async getTask(taskId, tenantId) {
    const result = await this.pool.query(
      `SELECT wt.*, 
              wi.entity_type, wi.entity_id, wi.entity_name, wi.context, wi.source_module_id,
              wd.name as workflow_name,
              (SELECT ARRAY_AGG(name) FROM roles WHERE id = ANY(wt.assigned_role_ids)) as assigned_role_names,
              (SELECT JSON_AGG(JSON_BUILD_OBJECT('email', email, 'name', NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''))) FROM users WHERE id = ANY(wt.assigned_user_ids)) as assigned_users
       FROM workflow_tasks wt
       JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
       JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
       JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.id
       WHERE wt.id = $1 AND wt.tenant_id = $2`,
      [taskId, tenantId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const task = result.rows[0];

    // Get available transitions
    const transResult = await this.pool.query(
      `SELECT action, name, requires_signature, requires_comment, signature_meaning
       FROM workflow_transitions
       WHERE from_step_id = $1
       ORDER BY priority`,
      [task.workflow_step_id]
    );

    return {
      ...this._formatTask(task, null), // We don't necessarily know the viewer here without passing it
      available_actions: transResult.rows,
      context: task.context
    };
  }

  async getTaskCounts(userId, tenantId, options = {}) {
    const { entityId, entityType, moduleId } = options;
    
    let paramIndex = 3;
    const params = [tenantId, userId];
    
    let extraFilters = '';
    if (entityType) {
      extraFilters += ` AND wi.entity_type = $${paramIndex++}`;
      params.push(entityType);
    }
    if (entityId) {
      extraFilters += ` AND wi.entity_id = $${paramIndex++}`;
      params.push(entityId);
    }
    if (moduleId) {
      extraFilters += ` AND wi.source_module_id = $${paramIndex++}::uuid`;
      params.push(moduleId);
    }

    const result = await this.pool.query(
      `SELECT 
         COUNT(*) FILTER (WHERE wt.status = 'pending') as pending,
         COUNT(*) FILTER (WHERE wt.status = 'pending' AND wt.due_at < NOW()) as overdue,
         COUNT(*) FILTER (WHERE wt.status = 'pending' AND wt.due_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours') as due_soon,
         COUNT(*) FILTER (WHERE wt.status = 'completed' AND wt.completed_at > NOW() - INTERVAL '7 days') as completed_this_week
       FROM workflow_tasks wt
       JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
       WHERE wt.tenant_id = $1
       AND (
         (wt.assigned_user_ids && ARRAY[$2]::uuid[])
         OR EXISTS (
           SELECT 1 FROM user_roles ur
           JOIN roles r ON r.id = ur.role_id
           WHERE ur.user_id = $2 AND ur.tenant_id = $1
           AND r.id = ANY(wt.assigned_role_ids)
         )
         OR (wt.assigned_user_ids IS NULL AND wt.assigned_role_ids IS NULL AND wi.started_by = $2)
         OR EXISTS (
           SELECT 1 FROM workflow_delegates wdg
           WHERE wdg.delegator_id = ANY(wt.assigned_user_ids)
           AND wdg.delegate_id = $2 
           AND wdg.tenant_id = $1
           AND wdg.is_active = TRUE 
           AND wdg.starts_at <= NOW() 
           AND (wdg.ends_at IS NULL OR wdg.ends_at > NOW())
         )
       )
       ${extraFilters}`,
      params
    );

    return {
      pending: parseInt(result.rows[0].pending),
      overdue: parseInt(result.rows[0].overdue),
      due_soon: parseInt(result.rows[0].due_soon),
      completed_this_week: parseInt(result.rows[0].completed_this_week)
    };
  }

  /**
   * Delegate a task to another user
   */
  async delegateTask(taskId, tenantId, delegatedTo, delegatedBy, reason) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current task with step info
      const taskResult = await client.query(
        `SELECT wt.*, ws.assignee_role_ids 
         FROM workflow_tasks wt
         JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
         WHERE wt.id = $1 AND wt.tenant_id = $2 AND wt.status = $3`,
        [taskId, tenantId, 'pending']
      );

      if (taskResult.rows.length === 0) {
        throw new Error('Task not found or already completed');
      }

      const task = taskResult.rows[0];

      // Verify delegate user exists and is active
      const userCheck = await client.query(
        'SELECT id FROM users WHERE id = $1 AND status = \'active\'',
        [delegatedTo]
      );

      if (userCheck.rows.length === 0) {
        throw new Error('Delegate user not found or inactive');
      }

      // Verify delegate user belongs to the same tenant
      const tenantCheck = await client.query(
        'SELECT id FROM user_tenants WHERE user_id = $1 AND tenant_id = $2 AND status = \'active\'',
        [delegatedTo, tenantId]
      );

      if (tenantCheck.rows.length === 0) {
        throw new Error('Delegate user does not belong to your tenant');
      }

      // Verify delegate user has the required role (if applicable)
      const requiredRoleIds = task.assigned_role_ids || task.assignee_role_ids;
      
      if (requiredRoleIds && requiredRoleIds.length > 0) {
        const roleCheck = await client.query(
          `SELECT 1 FROM user_roles ur
           WHERE ur.user_id = $1 AND ur.tenant_id = $2 AND ur.role_id = ANY($3)`,
          [delegatedTo, tenantId, requiredRoleIds]
        );
        if (roleCheck.rows.length === 0) {
          throw new Error('Delegate user does not have any of the required roles');
        }
      }

      // Verify delegate user has at least one matching role with the person delegating
      const commonRoleCheck = await client.query(
        `SELECT ur1.role_id 
         FROM user_roles ur1
         JOIN user_roles ur2 ON ur1.role_id = ur2.role_id
         WHERE ur1.user_id = $1 AND ur2.user_id = $2 AND ur1.tenant_id = $3 AND ur2.tenant_id = $3`,
        [delegatedBy, delegatedTo, tenantId]
      );

      if (commonRoleCheck.rows.length === 0) {
        throw new Error('Delegate user must have at least one matching role with yours');
      }

      // Update task assignment
      await client.query(
        `UPDATE workflow_tasks 
         SET assigned_user_ids = ARRAY[$1]::uuid[], 
             delegated_from = $2, delegation_reason = $3,
             status = 'delegated', updated_at = NOW()
         WHERE id = $4`,
        [delegatedTo, task.assigned_user_ids?.[0], reason, taskId]
      );

      // Create new task for delegate
      const newTaskResult = await client.query(
        `INSERT INTO workflow_tasks (
          tenant_id, workflow_instance_id, workflow_step_id,
          assigned_user_ids, assigned_by, due_at, status
        ) VALUES ($1, $2, $3, ARRAY[$4]::uuid[], $5, $6, 'pending')
        RETURNING *`,
        [tenantId, task.workflow_instance_id, task.workflow_step_id,
          delegatedTo, delegatedBy, task.due_at]
      );

      // Record in workflow history
      await client.query(
        `INSERT INTO workflow_history (
          tenant_id, workflow_instance_id, event_type, 
          performed_by, metadata
        ) VALUES ($1, $2, 'task_delegated', $3, $4)`,
        [tenantId, task.workflow_instance_id, delegatedBy,
          JSON.stringify({ 
            from_user: task.assigned_user_ids?.[0], 
            to_user: delegatedTo, 
            reason 
          })]
      );

      await client.query('COMMIT');

      this._publishEvent('workflow.task_delegated', {
        originalTaskId: taskId,
        newTaskId: newTaskResult.rows[0].id,
        tenantId,
        delegatedFrom: task.assigned_to,
        delegatedTo,
        reason
      });

      return this.getTask(newTaskResult.rows[0].id, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Claim a role-based task (when task is assigned to a role, not a specific user)
   */
  async claimTask(taskId, tenantId, claimedBy) {
    const result = await this.pool.query(
      `UPDATE workflow_tasks 
       SET assigned_user_ids = ARRAY[$1]::uuid[], status = 'in_progress', updated_at = NOW()
       WHERE id = $2 AND tenant_id = $3 
       AND status = 'pending' AND (assigned_user_ids IS NULL OR cardinality(assigned_user_ids) = 0) 
       AND (assigned_role_ids IS NOT NULL AND cardinality(assigned_role_ids) > 0)
       RETURNING *`,
      [claimedBy, taskId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found, already claimed, or not a role-based task');
    }

    this._publishEvent('workflow.task_claimed', {
      taskId,
      tenantId,
      claimedBy
    });

    return this.getTask(taskId, tenantId);
  }

  /**
   * Release a claimed task back to the role
   */
  async releaseTask(taskId, tenantId, releasedBy) {
    const result = await this.pool.query(
      `UPDATE workflow_tasks 
       SET assigned_user_ids = NULL, status = 'pending', updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 
       AND status = 'in_progress' AND assigned_user_ids = ARRAY[$3]::uuid[] 
       AND (assigned_role_ids IS NOT NULL AND cardinality(assigned_role_ids) > 0)
       RETURNING *`,
      [taskId, tenantId, releasedBy]
    );

    if (result.rows.length === 0) {
      throw new Error('Task not found or cannot be released');
    }

    return this.getTask(taskId, tenantId);
  }

  /**
   * Get overdue tasks (for escalation processing)
   */
  async getOverdueTasks(tenantId = null) {
    let query = `
      SELECT wt.*, 
             ws.name as step_name, ws.sla_escalation_hours, ws.escalation_to, ws.escalation_role,
             wi.entity_type, wi.entity_id, wi.entity_name
      FROM workflow_tasks wt
      JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
      JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
      WHERE wt.status = 'pending'
      AND wt.due_at < NOW()
      AND wt.escalated_at IS NULL
    `;
    const params = [];

    if (tenantId) {
      query += ' AND wt.tenant_id = $1';
      params.push(tenantId);
    }

    query += ' ORDER BY wt.due_at ASC LIMIT 100';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Escalate a task
   */
  async escalateTask(taskId, tenantId, escalatedTo, reason = 'Task overdue') {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Update task
      await client.query(
        `UPDATE workflow_tasks 
         SET escalated_at = NOW(), escalated_to = $1, updated_at = NOW()
         WHERE id = $2 AND tenant_id = $3`,
        [escalatedTo, taskId, tenantId]
      );

      // Get task details for history
      const taskResult = await client.query(
        'SELECT workflow_instance_id FROM workflow_tasks WHERE id = $1',
        [taskId]
      );

      // Record history
      await client.query(
        `INSERT INTO workflow_history (
          tenant_id, workflow_instance_id, event_type, metadata
        ) VALUES ($1, $2, 'task_escalated', $3)`,
        [tenantId, taskResult.rows[0].workflow_instance_id,
          JSON.stringify({ escalated_to: escalatedTo, reason })]
      );

      await client.query('COMMIT');

      this._publishEvent('workflow.task_escalated', {
        taskId,
        tenantId,
        escalatedTo,
        reason
      });

      return this.getTask(taskId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Send warning for tasks approaching due date
   */
  async getTasksNeedingWarning(tenantId = null) {
    let query = `
      SELECT wt.*, 
             ws.name as step_name, ws.sla_warning_hours,
             wi.entity_name
      FROM workflow_tasks wt
      JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
      JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
      WHERE wt.status = 'pending'
      AND wt.due_at IS NOT NULL
      AND wt.warning_sent_at IS NULL
      AND wt.due_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    `;
    const params = [];

    if (tenantId) {
      query += ' AND wt.tenant_id = $1';
      params.push(tenantId);
    }

    query += ' LIMIT 100';

    const result = await this.pool.query(query, params);
    return result.rows;
  }

  /**
   * Mark warning as sent
   */
  async markWarningSent(taskId) {
    await this.pool.query(
      'UPDATE workflow_tasks SET warning_sent_at = NOW() WHERE id = $1',
      [taskId]
    );
  }

  /**
   * Get tasks for a specific workflow instance
   */
  async getInstanceTasks(instanceId, tenantId) {
    const result = await this.pool.query(
      `SELECT wt.*, 
              ws.step_code, ws.name as step_name,
              wi.source_module_id, wi.entity_type, wi.entity_id, wi.entity_name,
              cb.email as completed_by_email,
              wd.name as workflow_name,
              (SELECT ARRAY_AGG(name) FROM roles WHERE id = ANY(wt.assigned_role_ids)) as assigned_role_names,
              (SELECT JSON_AGG(JSON_BUILD_OBJECT('email', email, 'name', NULLIF(TRIM(CONCAT(first_name, ' ', last_name)), ''))) FROM users WHERE id = ANY(wt.assigned_user_ids)) as assigned_users
       FROM workflow_tasks wt
       JOIN workflow_steps ws ON wt.workflow_step_id = ws.id
       JOIN workflow_instances wi ON wt.workflow_instance_id = wi.id
       JOIN workflow_definitions wd ON wi.workflow_definition_id = wd.id
       LEFT JOIN users cb ON wt.completed_by = cb.id
       WHERE wt.workflow_instance_id = $1 AND wt.tenant_id = $2
       ORDER BY wt.created_at`,
      [instanceId, tenantId]
    );

    return result.rows.map(t => this._formatTask(t)); // For instance tasks, we keep names generic
  }

  // Private helpers

  _formatTask(task, currentUserId = null) {
    let assignedToName = null;
    const assignedUsers = task.assigned_users || [];

    if (task.assigned_user_ids?.length > 0) {
      assignedToName = assignedUsers.map(u => u && u.name ? `${u.email} (${u.name})` : (u ? u.email : '')).filter(Boolean).join(", ") || `${task.assigned_user_ids.length} users`;
    } else if (task.assigned_role_ids?.length > 0) {
      assignedToName = task.assigned_role_names?.length > 0 
        ? task.assigned_role_names.join(", ") 
        : `${task.assigned_role_ids.length} roles`;
    } else {
      assignedToName = "Originator";
    }

    return {
      id: task.id,
      workflow: {
        instance_id: task.workflow_instance_id,
        name: task.workflow_name,
        module_id: task.source_module_id
      },
      step: {
        id: task.workflow_step_id,
        code: task.step_code,
        name: task.step_name,
        requires_signature: task.requires_signature,
        requires_comment: task.requires_comment
      },
      entity: {
        type: task.entity_type,
        id: task.entity_id,
        name: task.entity_name
      },
      assignment: {
        assigned_user_ids: task.assigned_user_ids,
        assigned_to_name: assignedToName,
        assigned_users: assignedUsers,
        assigned_role_ids: task.assigned_role_ids,
        assigned_at: task.assigned_at
      },
      status: task.status,
      due_at: task.due_at,
      is_overdue: task.due_at && new Date(task.due_at) < new Date(),
      completion: task.completed_at ? {
        completed_at: task.completed_at,
        completed_by: task.completed_by_email,
        action_taken: task.action_taken,
        comments: task.comments
      } : null,
      escalation: task.escalated_at ? {
        escalated_at: task.escalated_at,
        escalated_to: task.escalated_to
      } : null,
      created_at: task.created_at
    };
  }

  _publishEvent(type, data) {
    try {
      const eventService = getEventService();
      eventService.publish('qassure.workflow.events', { type, data, timestamp: new Date() });
    } catch (e) {
      console.error('[WorkflowTask] Kafka publish error:', e.message);
    }
  }
}

// Singleton
let instance = null;

const getWorkflowTaskService = () => {
  if (!instance) {
    instance = new WorkflowTaskService();
  }
  return instance;
};

module.exports = {
  WorkflowTaskService,
  getWorkflowTaskService
};
