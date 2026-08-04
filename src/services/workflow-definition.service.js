/**
 * Workflow Definition Service
 * Manages workflow templates (definitions, steps, transitions)
 */

const { pool } = require("../config/database");

class WorkflowDefinitionService {
  constructor() {
    this.pool = pool;
  }

  /**
   * Create a new workflow definition
   */
  async create(tenantId, data, createdBy) {
    const client = await this.pool.connect();

    try {
      await client.query("BEGIN");

      // 1. Create the definition
      const defResult = await client.query(
        `INSERT INTO workflow_definitions (
          tenant_id, name, description, code, entity_type, entity_id, status, is_default, config, created_by,
          source_module, source_module_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *`,
        [
          tenantId,
          data.name,
          data.description,
          data.code,
          data.entity_type,
          data.entity_id || null, // Added entity_id
          data.status || "draft",
          data.is_default || false,
          JSON.stringify(data.config || {}),
          createdBy,
          // Normalize to arrays
          Array.isArray(data.source_module)
            ? data.source_module
            : data.source_module
              ? [data.source_module]
              : ["platform"],
          Array.isArray(data.source_module_id)
            ? data.source_module_id
            : data.source_module_id
              ? [data.source_module_id]
              : [],
        ],
      );

      const definition = defResult.rows[0];

      // 2. Create steps if provided
      if (data.steps && data.steps.length > 0) {
        // Validate assignees before insertion
        await this._validateAssignees(client, tenantId, data.steps);

        // Find the minimum sequence/order to determine the first step
        const sequences = data.steps.map(
          (s, idx) => s.sequence || s.order || idx + 1,
        );
        const minSequence = Math.min(...sequences);

        for (let i = 0; i < data.steps.length; i++) {
          const step = data.steps[i];
          // Map code to step_code and order to sequence for API compatibility
          const stepCode = step.step_code || step.code;
          const sequence = step.sequence || step.order || i + 1;

          if (!stepCode) {
            throw new Error(
              `Step at index ${i} is missing required field: step_code or code`,
            );
          }

          // Determine step_type: if not specified, first step (lowest sequence) should be 'initial'
          let stepType = step.step_type;
          if (!stepType) {
            stepType = sequence === minSequence ? "initial" : "task";
          }

          await client.query(
            `INSERT INTO workflow_steps (
              workflow_definition_id, tenant_id, step_code, name, description,
              sequence, step_type, assignee_type, assignee_user_ids, 
              assignee_role_ids,
              sla_hours, sla_warning_hours, sla_escalation_hours,
              requires_signature, requires_comment, requires_attachment,
              available_actions, form_config
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              definition.id,
              tenantId,
              stepCode,
              step.name,
              step.description,
              sequence,
              stepType,
              step.assignee ? step.assignee.type : step.assignee_type,
              step.assignee ? step.assignee.user_ids : step.assignee_user_ids,
              step.assignee ? step.assignee.role_ids : step.assignee_role_ids,
              step.sla_hours,
              step.sla_warning_hours,
              step.sla_escalation_hours,
              step.requires_signature || false,
              step.requires_comment || false,
              step.requires_attachment || false,
              JSON.stringify(step.available_actions || ["approve", "reject"]),
              JSON.stringify(step.form_config || null),
            ],
          );
        }
      }

      // 3. Create transitions if provided
      if (data.transitions && data.transitions.length > 0) {
        // First get step IDs and their available actions
        const stepsResult = await client.query(
          "SELECT id, step_code, available_actions FROM workflow_steps WHERE workflow_definition_id = $1",
          [definition.id],
        );
        const stepMap = {};
        stepsResult.rows.forEach((s) => {
          stepMap[s.step_code] = {
            id: s.id,
            actions: Array.isArray(s.available_actions)
              ? s.available_actions
              : typeof s.available_actions === "string"
                ? JSON.parse(s.available_actions)
                : [],
          };
        });

        for (const trans of data.transitions) {
          const fromStep = stepMap[trans.from_step];
          const toStep = stepMap[trans.to_step || trans.to_step_code];

          if (fromStep && toStep) {
            // Validate action
            if (!fromStep.actions.includes(trans.action)) {
              throw new Error(
                `Invalid transition action '${trans.action}' for step '${trans.from_step}'. Available actions: ${fromStep.actions.join(", ")}`,
              );
            }

            await client.query(
              `INSERT INTO workflow_transitions (
                workflow_definition_id, tenant_id, from_step_id, to_step_id,
                action, name, requires_signature, requires_comment, signature_meaning, priority
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
              [
                definition.id,
                tenantId,
                fromStep.id,
                toStep.id,
                trans.action,
                trans.name,
                trans.requires_signature || false,
                trans.requires_comment || false,
                trans.signature_meaning,
                trans.priority || 0,
              ],
            );
          }
        }
      }

      // 4. Validate the resulting structure
      await this._validateStructure(client, definition.id);

      await client.query("COMMIT");

      // Return full definition with steps and transitions
      return this.getById(definition.id, tenantId);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get workflow definition by ID
   */
  async getById(id, tenantId) {
    // Get definition
    const defResult = await this.pool.query(
      `SELECT wd.*, u.email as created_by_email
       FROM workflow_definitions wd
       LEFT JOIN users u ON wd.created_by = u.id
       WHERE wd.id = $1 AND wd.tenant_id = $2`,
      [id, tenantId],
    );

    if (defResult.rows.length === 0) {
      return null;
    }

    const definition = defResult.rows[0];

    // Get steps
    const stepsResult = await this.pool.query(
      `SELECT * FROM workflow_steps 
       WHERE workflow_definition_id = $1 
       ORDER BY sequence`,
      [id],
    );

    // Get transitions
    const transResult = await this.pool.query(
      `SELECT t.*, 
              fs.step_code as from_step_code, fs.name as from_step_name,
              ts.step_code as to_step_code, ts.name as to_step_name
       FROM workflow_transitions t
       JOIN workflow_steps fs ON t.from_step_id = fs.id
       JOIN workflow_steps ts ON t.to_step_id = ts.id
       WHERE t.workflow_definition_id = $1
       ORDER BY t.priority`,
      [id],
    );

    return this._formatDefinition(
      definition,
      stepsResult.rows,
      transResult.rows,
    );
  }

  /**
   * Get workflow definition by code (for starting workflows)
   */
  async getByCode(code, tenantId, entityType = null) {
    let query = `
      SELECT id FROM workflow_definitions 
      WHERE tenant_id = $1 AND code = $2 AND status = 'active'
    `;
    const params = [tenantId, code];

    if (entityType) {
      query += " AND entity_type = $3";
      params.push(entityType);
    }

    query += " ORDER BY version DESC LIMIT 1";

    const result = await this.pool.query(query, params);

    if (result.rows.length === 0) {
      return null;
    }

    return this.getById(result.rows[0].id, tenantId);
  }

  /**
   * Get default workflow for an entity type
   */
  async getDefault(tenantId, entityType) {
    const result = await this.pool.query(
      `SELECT id FROM workflow_definitions 
       WHERE tenant_id = $1 AND entity_type = $2 AND is_default = TRUE AND status = 'active'
       LIMIT 1`,
      [tenantId, entityType],
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.getById(result.rows[0].id, tenantId);
  }

  /**
   * List workflow definitions
   */
  async list(tenantId, options = {}) {
    const {
      entityType,
      entityId, // Added entityId
      status,
      sourceModule,
      sourceModuleId,
      limit = 50,
      offset = 0,
    } = options;

    let query = `
      SELECT wd.*, u.email as created_by_email,
             (SELECT COUNT(*) FROM workflow_steps WHERE workflow_definition_id = wd.id) as step_count,
             (SELECT COUNT(*) FROM workflow_instances WHERE workflow_definition_id = wd.id) as instance_count
      FROM workflow_definitions wd
      LEFT JOIN users u ON wd.created_by = u.id
      WHERE wd.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (entityType) {
      query += ` AND wd.entity_type = $${paramIndex++}`;
      params.push(entityType);
    }

    if (entityId) {
      query += ` AND wd.entity_id = $${paramIndex++}`;
      params.push(entityId);
    }

    if (status) {
      query += ` AND wd.status = $${paramIndex++}`;
      params.push(status);
    }

    if (options.search) {
      query += ` AND (wd.name ILIKE $${paramIndex} OR wd.code ILIKE $${paramIndex} OR wd.description ILIKE $${paramIndex++})`;
      params.push(`%${options.search}%`);
    }

    if (sourceModule) {
      const smArray = Array.isArray(sourceModule)
        ? sourceModule
        : [sourceModule];
      query += ` AND wd.source_module && $${paramIndex++}::varchar[]`;
      params.push(smArray);
    }

    if (sourceModuleId) {
      const smidArray = Array.isArray(sourceModuleId)
        ? sourceModuleId
        : [sourceModuleId];
      query += ` AND wd.source_module_id && $${paramIndex++}::uuid[]`;
      params.push(smidArray);
    }

    query += ` ORDER BY wd.name LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    // Get total count (reuse same filters, exclude limit and offset)
    let countQuery =
      "SELECT COUNT(*) FROM workflow_definitions wd WHERE wd.tenant_id = $1";
    const countParams = [tenantId];
    let countParamIndex = 2;

    if (entityType) {
      countQuery += ` AND wd.entity_type = $${countParamIndex++}`;
      countParams.push(entityType);
    }

    if (entityId) {
      countQuery += ` AND wd.entity_id = $${countParamIndex++}`;
      countParams.push(entityId);
    }

    if (status) {
      countQuery += ` AND wd.status = $${countParamIndex++}`;
      countParams.push(status);
    }

    if (options.search) {
      countQuery += ` AND (wd.name ILIKE $${countParamIndex} OR wd.code ILIKE $${countParamIndex} OR wd.description ILIKE $${countParamIndex++})`;
      countParams.push(`%${options.search}%`);
    }

    if (sourceModule) {
      const smArray = Array.isArray(sourceModule)
        ? sourceModule
        : [sourceModule];
      countQuery += ` AND wd.source_module && $${countParamIndex++}::varchar[]`;
      countParams.push(smArray);
    }

    if (sourceModuleId) {
      const smidArray = Array.isArray(sourceModuleId)
        ? sourceModuleId
        : [sourceModuleId];
      countQuery += ` AND wd.source_module_id && $${countParamIndex++}::uuid[]`;
      countParams.push(smidArray);
    }

    const countResult = await this.pool.query(countQuery, countParams);

    return {
      definitions: result.rows.map((d) => ({
        id: d.id,
        name: d.name,
        description: d.description,
        code: d.code,
        version: d.version,
        entity_type: d.entity_type,
        status: d.status,
        is_default: d.is_default,
        step_count: parseInt(d.step_count),
        instance_count: parseInt(d.instance_count),
        created_by: d.created_by_email,
        created_at: d.created_at,
        source_module: d.source_module,
        source_module_id: d.source_module_id,
        entity_id: d.entity_id,
      })),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset,
    };
  }

  /**
   * Update workflow definition
   */
  async update(id, tenantId, data, updatedBy) {
    const allowedFields = [
      "name",
      "description",
      "status",
      "is_default",
      "config",
      "source_module",
      "source_module_id",
    ];
    const setClauses = [];
    const values = [id, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        if (key === "config") {
          setClauses.push(`${key} = $${paramIndex++}::jsonb`);
          values.push(JSON.stringify(value));
        } else {
          setClauses.push(`${key} = $${paramIndex++}`);
          values.push(value);
        }
      }
    }

    if (setClauses.length === 0) {
      throw new Error("No valid fields to update");
    }

    setClauses.push(`updated_by = $${paramIndex++}`);
    values.push(updatedBy);
    setClauses.push(`updated_at = NOW()`);

    const result = await this.pool.query(
      `UPDATE workflow_definitions 
       SET ${setClauses.join(", ")}
       WHERE id = $1 AND tenant_id = $2
       RETURNING *`,
      values,
    );

    if (result.rows.length === 0) {
      throw new Error("Workflow definition not found");
    }

    return this.getById(id, tenantId);
  }

  /**
   * Activate a workflow definition
   */
  async activate(id, tenantId, updatedBy) {
    return this.update(id, tenantId, { status: "active" }, updatedBy);
  }

  /**
   * Deprecate a workflow definition
   */
  async deprecate(id, tenantId, updatedBy) {
    return this.update(id, tenantId, { status: "deprecated" }, updatedBy);
  }

  /**
   * Clone a workflow definition
   */
  async clone(id, tenantId, newName, createdBy) {
    const original = await this.getById(id, tenantId);
    if (!original) {
      throw new Error("Workflow definition not found");
    }

    const cloneData = {
      name: newName || `${original.name} (Copy)`,
      description: original.description,
      code: `${original.code}_copy_${Date.now()}`,
      entity_type: original.entity_type,
      status: "draft",
      is_default: false,
      config: original.config,
      steps: original.steps.map((s) => ({
        step_code: s.step_code,
        name: s.name,
        description: s.description,
        sequence: s.sequence,
        step_type: s.step_type,
        assignee_type: s.assignee ? s.assignee.type : null,
        assignee_user_ids: s.assignee ? s.assignee.user_ids : null,
        assignee_role_ids: s.assignee ? s.assignee.role_ids : null,
        sla_hours: s.sla ? s.sla.hours : null,
        sla_warning_hours: s.sla ? s.sla.warning_hours : null,
        sla_escalation_hours: s.sla ? s.sla.escalation_hours : null,
        requires_signature: s.requirements ? s.requirements.signature : false,
        requires_comment: s.requirements ? s.requirements.comment : false,
        requires_attachment: s.requirements ? s.requirements.attachment : false,
        available_actions: s.available_actions,
        form_config: s.form_config,
      })),
      transitions: original.transitions.map((t) => ({
        from_step: t.from_step_code,
        to_step: t.to_step_code,
        action: t.action,
        name: t.name,
        requires_signature: t.requires_signature,
        requires_comment: t.requires_comment,
        signature_meaning: t.signature_meaning,
      })),
    };

    return this.create(tenantId, cloneData, createdBy);
  }

  /**
   * Delete a workflow definition (only if no instances)
   */
  async delete(id, tenantId) {
    // Check for instances
    const instanceCheck = await this.pool.query(
      "SELECT COUNT(*) FROM workflow_instances WHERE workflow_definition_id = $1",
      [id],
    );

    if (parseInt(instanceCheck.rows[0].count) > 0) {
      throw new Error(
        "Cannot delete workflow with existing instances. Deprecate it instead.",
      );
    }

    const result = await this.pool.query(
      "DELETE FROM workflow_definitions WHERE id = $1 AND tenant_id = $2 RETURNING id",
      [id, tenantId],
    );

    return result.rows.length > 0;
  }

  /**
   * Add a step to a workflow
   */
  async addStep(definitionId, tenantId, stepData) {
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");

      // Validate assignee
      await this._validateAssignees(client, tenantId, [stepData]);

      // Get max sequence
      const seqResult = await client.query(
        "SELECT COALESCE(MAX(sequence), 0) + 1 as next_seq FROM workflow_steps WHERE workflow_definition_id = $1",
        [definitionId],
      );

      const result = await client.query(
        `INSERT INTO workflow_steps (
        workflow_definition_id, tenant_id, step_code, name, description,
        sequence, step_type, assignee_type, assignee_user_ids, assignee_role_ids,
        sla_hours, requires_signature, requires_comment, available_actions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
        [
          definitionId,
          tenantId,
          stepData.step_code,
          stepData.name,
          stepData.description,
          stepData.sequence || seqResult.rows[0].next_seq,
          stepData.step_type || "task",
          stepData.assignee_type,
          stepData.assignee_user_ids || (stepData.assignee ? stepData.assignee.user_ids : null),
          stepData.assignee_role_ids || (stepData.assignee ? stepData.assignee.role_ids : null),
          stepData.sla_hours,
          stepData.requires_signature || false,
          stepData.requires_comment || false,
          JSON.stringify(stepData.available_actions || ["approve", "reject"]),
        ],
      );

      const step = result.rows[0];

      // Validate structure after adding step (if it's not a draft - though all steps are currently validated)
      await this._validateStructure(client, definitionId);

      await client.query("COMMIT");

      return this._formatStep(step);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Add a transition to a workflow
   */
  async addTransition(definitionId, tenantId, transitionData) {
    // Verify that the action is available for this step
    const stepResult = await this.pool.query(
      "SELECT available_actions FROM workflow_steps WHERE id = $1",
      [transitionData.from_step_id],
    );
    if (stepResult.rows.length === 0) {
      throw new Error("From step not found");
    }
    const availableActions = Array.isArray(stepResult.rows[0].available_actions)
      ? stepResult.rows[0].available_actions
      : typeof stepResult.rows[0].available_actions === "string"
        ? JSON.parse(stepResult.rows[0].available_actions)
        : [];

    if (!availableActions.includes(transitionData.action)) {
      throw new Error(
        `Action '${transitionData.action}' is not defined for this step. Available actions: ${availableActions.join(", ")}`,
      );
    }

    const result = await this.pool.query(
      `INSERT INTO workflow_transitions (
        workflow_definition_id, tenant_id, from_step_id, to_step_id,
        action, name, requires_signature, requires_comment, signature_meaning
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        definitionId,
        tenantId,
        transitionData.from_step_id,
        transitionData.to_step_id,
        transitionData.action,
        transitionData.name,
        transitionData.requires_signature || false,
        transitionData.requires_comment || false,
        transitionData.signature_meaning,
      ],
    );

    return result.rows[0];
  }

  // Private helper methods

  _formatDefinition(def, steps, transitions) {
    return {
      id: def.id,
      tenant_id: def.tenant_id,
      name: def.name,
      description: def.description,
      code: def.code,
      version: def.version,
      entity_type: def.entity_type,
      status: def.status,
      is_default: def.is_default,
      config: def.config,
      steps: steps.map((s) => this._formatStep(s)),
      transitions: transitions.map((t) => this._formatTransition(t)),
      created_by: def.created_by_email,
      created_at: def.created_at,
      updated_at: def.updated_at,
      source_module: def.source_module,
      source_module_id: def.source_module_id,
      entity_id: def.entity_id,
    };
  }

  _formatStep(step) {
    return {
      id: step.id,
      step_code: step.step_code,
      name: step.name,
      description: step.description,
      sequence: step.sequence,
      step_type: step.step_type,
      assignee: {
        type: step.assignee_type,
        user_ids: step.assignee_user_ids,
        role_ids: step.assignee_role_ids,
      },
      sla: {
        hours: step.sla_hours,
        warning_hours: step.sla_warning_hours,
        escalation_hours: step.sla_escalation_hours,
      },
      requirements: {
        signature: step.requires_signature,
        comment: step.requires_comment,
        attachment: step.requires_attachment,
      },
      available_actions: step.available_actions,
      form_config: step.form_config,
    };
  }

  _formatTransition(trans) {
    return {
      id: trans.id,
      from_step_id: trans.from_step_id,
      from_step_code: trans.from_step_code,
      from_step_name: trans.from_step_name,
      to_step_id: trans.to_step_id,
      to_step_code: trans.to_step_code,
      to_step_name: trans.to_step_name,
      action: trans.action,
      name: trans.name,
      requires_signature: trans.requires_signature,
      requires_comment: trans.requires_comment,
      signature_meaning: trans.signature_meaning,
      priority: trans.priority,
    };
  }

  async _validateAssignees(client, tenantId, steps) {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const type =
        step.assignee_type || (step.assignee ? step.assignee.type : null);
      const userIds = step.assignee_user_ids || (step.assignee ? step.assignee.user_ids : null);
      const role_ids = step.assignee_role_ids || (step.assignee ? step.assignee.role_ids : null);
      const stepType = step.step_type;

      if (stepType === "terminal") continue;

      if (!type) {
        throw new Error(
          `Step at index ${i} is missing required field: assignee_type or assignee.type`,
        );
      }

      if (type === "user") {
        if (!userIds || userIds.length === 0) {
          throw new Error(
            `Step at index ${i} has assignee_type 'user' but is missing assignee_user_ids`,
          );
        }
        for (const uid of userIds) {
          const userCheck = await client.query(
            "SELECT 1 FROM user_tenants WHERE user_id = $1 AND tenant_id = $2 AND status = 'active'",
            [uid, tenantId],
          );
          if (userCheck.rows.length === 0) {
            throw new Error(
              `Assignee user (ID: ${uid}) at step index ${i} does not belong to this tenant or is inactive`,
            );
          }
        }
      } else if (type === "role") {
        const roles = role_ids;
        if (!roles || roles.length === 0) {
          throw new Error(
            `Step at index ${i} has assignee_type 'role' but is missing assignee_role_ids`,
          );
        }
        for (const r of roles) {
          const roleCheck = await client.query(
            `SELECT 1 FROM roles WHERE id = $1 AND (tenant_id = $2 OR tenant_id IS NULL)`,
            [r, tenantId],
          );
          if (roleCheck.rows.length === 0) {
            throw new Error(
              `Assignee role (ID: '${r}') at step index ${i} does not exist for this tenant`,
            );
          }
        }
      }
    }
  }

  async _validateStructure(client, definitionId) {
    const stepsResult = await client.query(
      "SELECT step_type FROM workflow_steps WHERE workflow_definition_id = $1",
      [definitionId],
    );
    const steps = stepsResult.rows;

    const initialStepsCount = steps.filter(
      (s) => s.step_type === "initial",
    ).length;
    const terminalStepsCount = steps.filter(
      (s) => s.step_type === "terminal",
    ).length;

    if (initialStepsCount === 0) {
      throw new Error(
        'Workflow definition must have exactly one initial step (step_type="initial")',
      );
    }
    if (initialStepsCount > 1) {
      throw new Error("Workflow definition can have only one initial step");
    }
    if (terminalStepsCount === 0) {
      throw new Error(
        'Workflow definition must have at least one terminal step (step_type="terminal")',
      );
    }

    // New Transition Validations
    const stepsData = await client.query(
      "SELECT id, step_code, step_type, available_actions FROM workflow_steps WHERE workflow_definition_id = $1",
      [definitionId],
    );
    const transitionsData = await client.query(
      "SELECT from_step_id, to_step_id, action FROM workflow_transitions WHERE workflow_definition_id = $1",
      [definitionId],
    );

    // Connectivity Validations
    for (const step of stepsData.rows) {
      const isInitial = step.step_type === 'initial';
      const isTerminal = step.step_type === 'terminal';

      // 1. Every non-terminal step must have at least one outgoing transition
      if (!isTerminal) {
        const outgoing = transitionsData.rows.filter(t => t.from_step_id === step.id);
        if (outgoing.length === 0) {
          throw new Error(`Step '${step.step_code}' must have at least one outgoing transition defined`);
        }
      }

      // 2. Every non-initial step must be reachable (at least one incoming transition)
      if (!isInitial) {
        const incoming = transitionsData.rows.filter(t => t.to_step_id === step.id);
        if (incoming.length === 0) {
          throw new Error(`Step '${step.step_code}' is unreachable (no transitions lead to it)`);
        }
      }

      // 3. Terminal steps cannot have outgoing transitions
      if (isTerminal) {
        const outgoing = transitionsData.rows.filter(t => t.from_step_id === step.id);
        if (outgoing.length > 0) {
          throw new Error(`Terminal step '${step.step_code}' cannot have outgoing transitions`);
        }
      }
    }
  }
}

// Singleton
let instance = null;

const getWorkflowDefinitionService = () => {
  if (!instance) {
    instance = new WorkflowDefinitionService();
  }
  return instance;
};

module.exports = {
  WorkflowDefinitionService,
  getWorkflowDefinitionService,
};
