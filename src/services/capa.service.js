/**
 * CAPA Service
 * Manages Corrective and Preventive Actions with 8D methodology support
 */

const { pool } = require('../config/database');
const { IndexingHooks } = require('../infrastructure/search/indexing.hooks');
const { getWorkflowEngineService } = require('./workflow-engine.service');
const { getAuditService } = require('./audit.service');
const { getNotificationService } = require('./notification.service');

class CapaService {
  constructor() {
    this.pool = pool;
  }

  // ============================================================================
  // CAPA CRUD
  // ============================================================================

  async create(tenantId, data, createdBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Generate CAPA number
      const capaNumber = await this._generateCapaNumber(client, tenantId);

      // Create CAPA
      const result = await client.query(
        `INSERT INTO capas (
          tenant_id, capa_number, title, description, capa_type, source, priority, risk_level,
          problem_statement, immediate_action, owner_id, department, identified_date, target_date,
          source_record_type, source_record_id, status, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'draft', $17)
        RETURNING *`,
        [
          tenantId, capaNumber, data.title, data.description, data.capa_type, data.source,
          data.priority || 'medium', data.risk_level, data.problem_statement, data.immediate_action,
          data.owner_id || createdBy, data.department, data.identified_date || new Date(),
          data.target_date, data.source_record_type, data.source_record_id, createdBy
        ]
      );

      const capa = result.rows[0];

      // Create 8D report structure if using 8D methodology
      if (data.use_8d) {
        await client.query(
          'INSERT INTO capa_8d_reports (capa_id, tenant_id) VALUES ($1, $2)',
          [capa.id, tenantId]
        );
      }

      await client.query('COMMIT');

      const createdCapa = await this.getById(capa.id, tenantId);
      IndexingHooks.indexCapa(createdCapa, tenantId);
      this._audit('CREATE', tenantId, createdBy, createdCapa.id, { capa_number: createdCapa.capa_number, capa_type: createdCapa.capa_type });

      // Notify owner if different from creator
      if (createdCapa.owner?.id && createdCapa.owner.id !== createdBy) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, createdCapa.owner.id, 'capa_assigned', {
              capa_number: createdCapa.capa_number,
              title: createdCapa.title,
              priority: createdCapa.priority,
              target_date: createdCapa.dates?.target || ''
            }, {
              entityType: 'capa',
              entityId: createdCapa.id,
              entityName: `${createdCapa.capa_number} - ${createdCapa.title}`,
              actionUrl: `/capas/${createdCapa.id}`,
              createdBy: createdBy
            });
          } catch (e) { console.warn('[CapaService] Notification failed:', e.message); }
        });
      }

      return createdCapa;

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getById(id, tenantId) {
    const result = await this.pool.query(
      `SELECT c.*, 
              u.email as owner_email, u.first_name as owner_first_name, u.last_name as owner_last_name,
              cb.email as created_by_email
       FROM capas c
       LEFT JOIN users u ON c.owner_id = u.id
       LEFT JOIN users cb ON c.created_by = cb.id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [id, tenantId]
    );

    if (result.rows.length === 0) return null;

    const capa = result.rows[0];

    // Get actions
    const actionsResult = await this.pool.query(
      `SELECT ca.*, u.email as assigned_to_email
       FROM capa_actions ca
       LEFT JOIN users u ON ca.assigned_to = u.id
       WHERE ca.capa_id = $1
       ORDER BY ca.action_number`,
      [id]
    );

    // Check for 8D report
    const report8dResult = await this.pool.query(
      'SELECT id FROM capa_8d_reports WHERE capa_id = $1',
      [id]
    );

    return this._formatCapa(capa, actionsResult.rows, report8dResult.rows.length > 0);
  }

  async list(tenantId, options = {}) {
    const { status, capa_type, priority, owner_id, source, search, limit = 50, offset = 0 } = options;

    let query = `
      SELECT c.*, u.email as owner_email
      FROM capas c
      LEFT JOIN users u ON c.owner_id = u.id
      WHERE c.tenant_id = $1
    `;
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND c.status = $${paramIndex++}`;
      params.push(status);
    }
    if (capa_type) {
      query += ` AND c.capa_type = $${paramIndex++}`;
      params.push(capa_type);
    }
    if (priority) {
      query += ` AND c.priority = $${paramIndex++}`;
      params.push(priority);
    }
    if (owner_id) {
      query += ` AND c.owner_id = $${paramIndex++}`;
      params.push(owner_id);
    }
    if (source) {
      query += ` AND c.source = $${paramIndex++}`;
      params.push(source);
    }
    if (search) {
      query += ` AND (c.title ILIKE $${paramIndex} OR c.capa_number ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY c.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM capas WHERE tenant_id = $1',
      [tenantId]
    );

    return {
      capas: result.rows.map(c => this._formatCapaSummary(c)),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  async update(id, tenantId, data, updatedBy) {
    const allowedFields = [
      'title', 'description', 'priority', 'risk_level', 'problem_statement',
      'immediate_action', 'containment_action', 'root_cause', 'root_cause_method',
      'corrective_action', 'preventive_action', 'verification_method',
      'verification_results', 'effectiveness_criteria', 'owner_id', 'department', 'target_date'
    ];

    const setClauses = [];
    const values = [id, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return this.getById(id, tenantId);

    setClauses.push(`updated_by = $${paramIndex++}`, 'updated_at = NOW()');
    values.push(updatedBy);

    await this.pool.query(
      `UPDATE capas SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2`,
      values
    );

    this._audit('UPDATE', tenantId, updatedBy, id, { updated_fields: Object.keys(data) });

    return this.getById(id, tenantId);
  }

  // ============================================================================
  // WORKFLOW ACTIONS
  // ============================================================================

  async submitForInvestigation(capaId, tenantId, submittedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const capaResult = await client.query(
        'SELECT * FROM capas WHERE id = $1 AND tenant_id = $2',
        [capaId, tenantId]
      );

      if (capaResult.rows.length === 0) throw new Error('CAPA not found');
      const capa = capaResult.rows[0];

      if (capa.status !== 'draft') throw new Error('Only draft CAPAs can be submitted');

      // Start workflow
      const workflowEngine = getWorkflowEngineService();
      const instance = await workflowEngine.startWorkflow({
        tenantId,
        workflowCode: 'capa_workflow',
        entityType: 'capa',
        entityId: capaId,
        entityName: `${capa.capa_number} - ${capa.title}`,
        context: { capa_type: capa.capa_type, priority: capa.priority },
        startedBy: submittedBy
      });

      // Update CAPA status
      await client.query(
        `UPDATE capas SET status = 'open', workflow_instance_id = $1, updated_by = $2, updated_at = NOW()
         WHERE id = $3`,
        [instance.id, submittedBy, capaId]
      );

      await client.query('COMMIT');
      this._audit('UPDATE', tenantId, submittedBy, capaId, { action: 'submitted_for_investigation' });

      // Notify CAPA owner
      if (capa.owner_id && capa.owner_id !== submittedBy) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, capa.owner_id, 'capa_assigned', {
              capa_number: capa.capa_number,
              title: capa.title,
              priority: capa.priority,
              target_date: capa.target_date
            }, {
              entityType: 'capa',
              entityId: capaId,
              entityName: `${capa.capa_number} - ${capa.title}`,
              actionUrl: `/capas/${capaId}`,
              createdBy: submittedBy
            });
          } catch (e) { console.warn('[CapaService] Notification failed:', e.message); }
        });
      }

      return this.getById(capaId, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async updateStatus(capaId, tenantId, newStatus, updatedBy) {
    const validStatuses = ['draft', 'open', 'investigation', 'action', 'verification', 'closed', 'cancelled'];
    if (!validStatuses.includes(newStatus)) {
      throw new Error('Invalid status');
    }

    const updates = { status: newStatus };
    if (newStatus === 'closed') {
      updates.closed_date = new Date();
    }

    await this.pool.query(
      `UPDATE capas SET status = $1, closed_date = $2, updated_by = $3, updated_at = NOW()
       WHERE id = $4 AND tenant_id = $5`,
      [newStatus, newStatus === 'closed' ? new Date() : null, updatedBy, capaId, tenantId]
    );
    this._audit('UPDATE', tenantId, updatedBy, capaId, { action: 'status_changed', new_status: newStatus });

    // Notify CAPA owner of status change
    const capa = await this.getById(capaId, tenantId);
    if (capa && capa.owner && capa.owner.id && capa.owner.id !== updatedBy) {
      setImmediate(async () => {
        try {
          await getNotificationService().sendFromTemplate(tenantId, capa.owner.id, newStatus === 'closed' ? 'capa_closed' : 'capa_assigned', {
            capa_number: capa.capa_number,
            title: capa.title,
            priority: capa.priority,
            target_date: capa.dates?.target || '',
            status: newStatus
          }, {
            entityType: 'capa',
            entityId: capaId,
            entityName: `${capa.capa_number} - ${capa.title}`,
            actionUrl: `/capas/${capaId}`,
            createdBy: updatedBy
          });
        } catch (e) { console.warn('[CapaService] Notification failed:', e.message); }
      });
    }

    return capa;
  }

  // ============================================================================
  // CAPA ACTIONS
  // ============================================================================

  async addAction(capaId, tenantId, data, createdBy) {
    // Get next action number
    const seqResult = await this.pool.query(
      'SELECT COALESCE(MAX(action_number), 0) + 1 as next_num FROM capa_actions WHERE capa_id = $1',
      [capaId]
    );

    const result = await this.pool.query(
      `INSERT INTO capa_actions (
        capa_id, tenant_id, action_number, description, action_type,
        assigned_to, department, due_date, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
      RETURNING *`,
      [
        capaId, tenantId, seqResult.rows[0].next_num, data.description,
        data.action_type, data.assigned_to, data.department, data.due_date
      ]
    );

    this._audit('CREATE', tenantId, null, capaId, { action: 'capa_action_added', description: data.description, action_type: data.action_type });

    return this._formatAction(result.rows[0]);
  }

  async updateAction(actionId, tenantId, data, updatedBy) {
    const allowedFields = ['description', 'assigned_to', 'due_date', 'status', 'evidence', 'verification_notes'];
    const setClauses = [];
    const values = [actionId, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (data.status === 'completed') {
      setClauses.push(`completed_date = NOW()`);
    }

    setClauses.push('updated_at = NOW()');

    await this.pool.query(
      `UPDATE capa_actions SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2`,
      values
    );

    const result = await this.pool.query(
      'SELECT * FROM capa_actions WHERE id = $1',
      [actionId]
    );

    this._audit('UPDATE', tenantId, updatedBy, actionId, { action: 'capa_action_updated', updated_fields: Object.keys(data) });

    return this._formatAction(result.rows[0]);
  }

  async getActions(capaId, tenantId) {
    const result = await this.pool.query(
      `SELECT ca.*, u.email as assigned_to_email
       FROM capa_actions ca
       LEFT JOIN users u ON ca.assigned_to = u.id
       WHERE ca.capa_id = $1 AND ca.tenant_id = $2
       ORDER BY ca.action_number`,
      [capaId, tenantId]
    );

    return result.rows.map(a => this._formatAction(a));
  }

  // ============================================================================
  // 8D REPORT
  // ============================================================================

  async get8DReport(capaId, tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM capa_8d_reports WHERE capa_id = $1 AND tenant_id = $2',
      [capaId, tenantId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  async update8DSection(capaId, tenantId, section, data, updatedBy) {
    const validSections = ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8'];
    if (!validSections.includes(section)) {
      throw new Error('Invalid 8D section');
    }

    const setClauses = [];
    const values = [capaId, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith(section + '_')) {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(typeof value === 'object' ? JSON.stringify(value) : value);
      }
    }

    if (data.mark_complete) {
      setClauses.push(`${section}_completed_at = NOW()`);
    }

    setClauses.push('updated_at = NOW()');

    await this.pool.query(
      `UPDATE capa_8d_reports SET ${setClauses.join(', ')} WHERE capa_id = $1 AND tenant_id = $2`,
      values
    );

    return this.get8DReport(capaId, tenantId);
  }

  // ============================================================================
  // DASHBOARD & METRICS
  // ============================================================================

  async getDashboard(tenantId) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled')) as open_count,
         COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled') AND target_date < NOW()) as overdue_count,
         COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('closed', 'cancelled')) as critical_count,
         COUNT(*) FILTER (WHERE status = 'closed' AND closed_date > NOW() - INTERVAL '30 days') as closed_30d,
         COUNT(*) FILTER (WHERE capa_type = 'corrective') as corrective_count,
         COUNT(*) FILTER (WHERE capa_type = 'preventive') as preventive_count
       FROM capas WHERE tenant_id = $1`,
      [tenantId]
    );

    const byStatus = await this.pool.query(
      `SELECT status, COUNT(*) as count FROM capas WHERE tenant_id = $1 GROUP BY status`,
      [tenantId]
    );

    return {
      summary: {
        open: parseInt(result.rows[0].open_count),
        overdue: parseInt(result.rows[0].overdue_count),
        critical: parseInt(result.rows[0].critical_count),
        closed_30d: parseInt(result.rows[0].closed_30d),
        corrective: parseInt(result.rows[0].corrective_count),
        preventive: parseInt(result.rows[0].preventive_count)
      },
      by_status: byStatus.rows.reduce((acc, r) => { acc[r.status] = parseInt(r.count); return acc; }, {})
    };
  }

  _audit(action, tenantId, userId, resourceId, metadata = {}) {
    setImmediate(async () => {
      try {
        await getAuditService().log({
          action,
          user_id: userId || null,
          tenant_id: tenantId || null,
          resource_type: 'capa',
          resource_id: resourceId || null,
          response_status: 200,
          metadata
        });
      } catch (e) {
        console.warn('[CapaService] Audit log failed:', e.message);
      }
    });
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  async _generateCapaNumber(client, tenantId) {
    const year = new Date().getFullYear();
    const result = await client.query(
      `SELECT COUNT(*) + 1 as next_num FROM capas 
       WHERE tenant_id = $1 AND capa_number LIKE $2`,
      [tenantId, `CAPA-${year}-%`]
    );
    return `CAPA-${year}-${String(result.rows[0].next_num).padStart(4, '0')}`;
  }

  _formatCapa(c, actions = [], has8D = false) {
    return {
      id: c.id,
      capa_number: c.capa_number,
      title: c.title,
      description: c.description,
      capa_type: c.capa_type,
      source: c.source,
      priority: c.priority,
      risk_level: c.risk_level,
      status: c.status,
      problem_statement: c.problem_statement,
      immediate_action: c.immediate_action,
      containment_action: c.containment_action,
      root_cause: c.root_cause,
      root_cause_method: c.root_cause_method,
      corrective_action: c.corrective_action,
      preventive_action: c.preventive_action,
      verification: {
        method: c.verification_method,
        results: c.verification_results,
        criteria: c.effectiveness_criteria,
        verified: c.effectiveness_verified,
        date: c.effectiveness_date
      },
      owner: c.owner_id ? {
        id: c.owner_id,
        email: c.owner_email,
        name: `${c.owner_first_name} ${c.owner_last_name}`
      } : null,
      department: c.department,
      dates: {
        identified: c.identified_date,
        target: c.target_date,
        closed: c.closed_date
      },
      source_record: c.source_record_type ? {
        type: c.source_record_type,
        id: c.source_record_id
      } : null,
      actions: actions.map(a => this._formatAction(a)),
      has_8d_report: has8D,
      workflow_instance_id: c.workflow_instance_id,
      created_by: c.created_by_email,
      created_at: c.created_at,
      updated_at: c.updated_at
    };
  }

  _formatCapaSummary(c) {
    return {
      id: c.id,
      capa_number: c.capa_number,
      title: c.title,
      capa_type: c.capa_type,
      source: c.source,
      priority: c.priority,
      status: c.status,
      owner: c.owner_email,
      target_date: c.target_date,
      is_overdue: c.target_date && c.status !== 'closed' && new Date(c.target_date) < new Date(),
      created_at: c.created_at
    };
  }

  _formatAction(a) {
    return {
      id: a.id,
      action_number: a.action_number,
      description: a.description,
      action_type: a.action_type,
      assigned_to: a.assigned_to_email || a.assigned_to,
      department: a.department,
      due_date: a.due_date,
      completed_date: a.completed_date,
      status: a.status,
      evidence: a.evidence,
      is_overdue: a.due_date && a.status === 'pending' && new Date(a.due_date) < new Date()
    };
  }
}

// Singleton
let instance = null;
const getCapaService = () => {
  if (!instance) instance = new CapaService();
  return instance;
};

module.exports = { CapaService, getCapaService };
