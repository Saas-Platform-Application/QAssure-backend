/**
 * Project Service
 * Platform service for managing regulatory projects across all modules
 * Projects serve as containers for organizing work (CERs, DHFs, Complaints, etc.)
 */

const { pool } = require('../config/database');
const { getAuditService } = require('./audit.service');
const { getNotificationService } = require('./notification.service');

class ProjectService {
  constructor() {
    this.pool = pool;
  }

  // ============================================================================
  // PROJECT CRUD
  // ============================================================================

  /**
   * Create a new project
   */
  async create(tenantId, data, createdBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 1. Create the project
      const projectResult = await client.query(
        `INSERT INTO projects (
          tenant_id, name, code, description, project_type, status, priority,
          start_date, target_end_date, product_name, product_code, device_class,
          regulatory_pathway, submission_type, regulatory_body, submission_number,
          settings, metadata, owner_id, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
        RETURNING *`,
        [
          tenantId,
          data.name,
          data.code,
          data.description,
          data.project_type || 'custom',
          data.status || 'planning',
          data.priority || 'medium',
          data.start_date,
          data.target_end_date,
          data.product_name,
          data.product_code,
          data.device_class,
          data.regulatory_pathway,
          data.submission_type,
          data.regulatory_body,
          data.submission_number,
          JSON.stringify(data.settings || {}),
          JSON.stringify(data.metadata || {}),
          data.owner_id || createdBy,
          createdBy
        ]
      );

      const project = projectResult.rows[0];

      // 2. Add creator as project manager
      await client.query(
        `INSERT INTO project_members (
          tenant_id, project_id, user_id, role, permissions, status, invited_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          tenantId,
          project.id,
          createdBy,
          'project_manager',
          JSON.stringify(['read', 'write', 'delete', 'approve', 'manage_members']),
          'active',
          createdBy
        ]
      );

      // 3. Enable modules if specified
      if (data.modules && data.modules.length > 0) {
        for (const moduleCode of data.modules) {
          await client.query(
            `INSERT INTO project_modules (
              tenant_id, project_id, module_code, is_enabled, enabled_by
            ) VALUES ($1, $2, $3, $4, $5)`,
            [tenantId, project.id, moduleCode, true, createdBy]
          );
        }
      }

      // 4. Create milestones if provided
      if (data.milestones && data.milestones.length > 0) {
        for (let i = 0; i < data.milestones.length; i++) {
          const milestone = data.milestones[i];
          await client.query(
            `INSERT INTO project_milestones (
              tenant_id, project_id, name, description, milestone_type,
              planned_date, sequence, owner_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [
              tenantId,
              project.id,
              milestone.name,
              milestone.description,
              milestone.milestone_type || 'deliverable',
              milestone.planned_date,
              milestone.sequence || i + 1,
              milestone.owner_id
            ]
          );
        }
      }

      // 5. Log activity
      await this._logActivity(client, tenantId, project.id, 'created', 'project', project.id, null, project, createdBy);

      await client.query('COMMIT');

      setImmediate(async () => { try { await getAuditService().log({ action: 'CREATE', user_id: createdBy, tenant_id: tenantId, resource_type: 'project', resource_id: project.id, response_status: 201, metadata: { name: data.name, project_type: data.project_type || 'custom' } }); } catch(e){} });

      // Return full project with relations
      return this.getById(project.id, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get project by ID with all relations
   */
  async getById(id, tenantId) {
    // Get project
    const projectResult = await this.pool.query(
      `SELECT p.*, 
        u1.email as owner_email, u1.first_name as owner_first_name, u1.last_name as owner_last_name,
        u2.email as created_by_email
      FROM projects p
      LEFT JOIN users u1 ON p.owner_id = u1.id
      LEFT JOIN users u2 ON p.created_by = u2.id
      WHERE p.id = $1 AND p.tenant_id = $2`,
      [id, tenantId]
    );

    if (projectResult.rows.length === 0) {
      return null;
    }

    const project = projectResult.rows[0];

    // Get members
    const membersResult = await this.pool.query(
      `SELECT pm.*, u.email, u.first_name, u.last_name
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1 AND pm.status = 'active'
      ORDER BY pm.role, u.first_name`,
      [id]
    );

    // Get modules
    const modulesResult = await this.pool.query(
      `SELECT * FROM project_modules WHERE project_id = $1 AND is_enabled = true`,
      [id]
    );

    // Get milestones
    const milestonesResult = await this.pool.query(
      `SELECT pm.*, u.email as owner_email, u.first_name as owner_first_name
      FROM project_milestones pm
      LEFT JOIN users u ON pm.owner_id = u.id
      WHERE pm.project_id = $1
      ORDER BY pm.sequence, pm.planned_date`,
      [id]
    );

    return {
      ...project,
      members: membersResult.rows,
      modules: modulesResult.rows.map(m => m.module_code),
      milestones: milestonesResult.rows
    };
  }

  /**
   * List projects with filtering and pagination
   */
  async list(tenantId, options = {}) {
    const {
      status,
      project_type,
      owner_id,
      member_user_id,
      search,
      limit = 50,
      offset = 0,
      sort_by = 'created_at',
      sort_order = 'DESC'
    } = options;

    let query = `
      SELECT DISTINCT p.*, 
        u.email as owner_email, u.first_name as owner_first_name, u.last_name as owner_last_name,
        (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id AND pm.status = 'active') as member_count,
        (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.id AND pm.status = 'completed') as completed_milestones,
        (SELECT COUNT(*) FROM project_milestones pm WHERE pm.project_id = p.id) as total_milestones
      FROM projects p
      LEFT JOIN users u ON p.owner_id = u.id
    `;

    const params = [tenantId];
    let paramIndex = 2;
    const conditions = ['p.tenant_id = $1'];

    // Filter by member if specified
    if (member_user_id) {
      query += ` JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $${paramIndex} AND pm.status = 'active'`;
      params.push(member_user_id);
      paramIndex++;
    }

    if (status) {
      conditions.push(`p.status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (project_type) {
      conditions.push(`p.project_type = $${paramIndex}`);
      params.push(project_type);
      paramIndex++;
    }

    if (owner_id) {
      conditions.push(`p.owner_id = $${paramIndex}`);
      params.push(owner_id);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(p.name ILIKE $${paramIndex} OR p.code ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` WHERE ${conditions.join(' AND ')}`;

    // Validate sort column
    const allowedSorts = ['created_at', 'updated_at', 'name', 'start_date', 'target_end_date', 'status', 'priority'];
    const sortColumn = allowedSorts.includes(sort_by) ? sort_by : 'created_at';
    const sortDir = sort_order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    query += ` ORDER BY p.${sortColumn} ${sortDir}`;
    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    // Get total count
    let countQuery = `SELECT COUNT(DISTINCT p.id) FROM projects p`;
    if (member_user_id) {
      countQuery += ` JOIN project_members pm ON p.id = pm.project_id AND pm.user_id = $2 AND pm.status = 'active'`;
    }
    countQuery += ` WHERE ${conditions.join(' AND ')}`;

    const countParams = member_user_id ? params.slice(0, -2) : [tenantId, ...params.slice(1, -2)];
    const countResult = await this.pool.query(countQuery, countParams.slice(0, conditions.length));

    return {
      projects: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  /**
   * Update project
   */
  async update(id, tenantId, data, updatedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get current state for activity log
      const currentResult = await client.query(
        'SELECT * FROM projects WHERE id = $1 AND tenant_id = $2',
        [id, tenantId]
      );

      if (currentResult.rows.length === 0) {
        throw new Error('Project not found');
      }

      const currentProject = currentResult.rows[0];

      // Build update query dynamically
      const updateFields = [];
      const updateValues = [];
      let paramIndex = 1;

      const allowedFields = [
        'name', 'description', 'status', 'priority', 'start_date', 'target_end_date',
        'actual_end_date', 'product_name', 'product_code', 'device_class',
        'regulatory_pathway', 'submission_type', 'regulatory_body', 'submission_number',
        'settings', 'metadata', 'owner_id'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateFields.push(`${field} = $${paramIndex}`);
          updateValues.push(field === 'settings' || field === 'metadata' ? JSON.stringify(data[field]) : data[field]);
          paramIndex++;
        }
      }

      if (updateFields.length === 0) {
        await client.query('ROLLBACK');
        //setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: updatedBy, tenant_id: tenantId, resource_type: 'project', resource_id: id, response_status: 200, metadata: { updated_fields: Object.keys(data) } }); } catch(e){} });
        return this.getById(id, tenantId);
      }

      updateFields.push(`updated_by = $${paramIndex}`);
      updateValues.push(updatedBy);
      paramIndex++;

      updateFields.push(`updated_at = NOW()`);

      updateValues.push(id, tenantId);

      const updateResult = await client.query(
        `UPDATE projects SET ${updateFields.join(', ')} 
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *`,
        updateValues
      );

      const updatedProject = updateResult.rows[0];

      // Log activity
      await this._logActivity(client, tenantId, id, 'updated', 'project', id, currentProject, updatedProject, updatedBy);

      await client.query('COMMIT');
      setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: updatedBy, tenant_id: tenantId, resource_type: 'project', resource_id: id, response_status: 200, metadata: { updated_fields: Object.keys(data) } }); } catch(e){} });

      return this.getById(id, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete project (soft delete by setting status to 'archived')
   */
  async delete(id, tenantId, deletedBy) {
    const result = await this.pool.query(
      `UPDATE projects SET status = 'archived', updated_by = $3, updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
      RETURNING *`,
      [id, tenantId, deletedBy]
    );

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }
    setImmediate(async () => { try { await getAuditService().log({ action: 'DELETE', user_id: deletedBy, tenant_id: tenantId, resource_type: 'project', resource_id: id, response_status: 200, metadata: { action: 'archived' } }); } catch(e){} });

    return result.rows[0];
  }

  // ============================================================================
  // PROJECT MEMBERS
  // ============================================================================

  /**
   * Add member to project
   */
  async addMember(projectId, tenantId, data, addedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO project_members (
          tenant_id, project_id, user_id, role, permissions, status, invited_by, invited_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (project_id, user_id) 
        DO UPDATE SET role = $4, permissions = $5, status = 'active', updated_at = NOW()
        RETURNING *`,
        [
          tenantId,
          projectId,
          data.user_id,
          data.role || 'contributor',
          JSON.stringify(data.permissions || ['read', 'write']),
          'active',
          addedBy
        ]
      );

      // Log activity
      await this._logActivity(client, tenantId, projectId, 'member_added', 'member', result.rows[0].id, null, result.rows[0], addedBy);

      await client.query('COMMIT');
      setImmediate(async () => { try { await getAuditService().log({ action: 'CREATE', user_id: addedBy, tenant_id: tenantId, resource_type: 'project', resource_id: projectId, response_status: 201, metadata: { action: 'member_added', member_user_id: data.user_id, role: data.role || 'contributor' } }); } catch(e){} });

      // Notify new member if different from who added them
      if (data.user_id && data.user_id !== addedBy) {
        setImmediate(async () => {
          try {
            const project = await this.getById(projectId, tenantId);
            if (project) {
              await getNotificationService().sendFromTemplate(tenantId, data.user_id, 'project_assigned', {
                project_name: project.name,
                role: data.role || 'contributor'
              }, {
                entityType: 'project',
                entityId: projectId,
                entityName: project.name,
                actionUrl: `/projects/${projectId}`,
                createdBy: addedBy
              });
            }
          } catch (e) { console.warn('[ProjectService] Notification failed:', e.message); }
        });
      }

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Update member role/permissions
   */
  async updateMember(projectId, memberId, tenantId, data, updatedBy) {
    const result = await this.pool.query(
      `UPDATE project_members 
      SET role = COALESCE($4, role), 
          permissions = COALESCE($5, permissions),
          updated_at = NOW()
      WHERE id = $1 AND project_id = $2 AND tenant_id = $3
      RETURNING *`,
      [
        memberId,
        projectId,
        tenantId,
        data.role,
        data.permissions ? JSON.stringify(data.permissions) : null
      ]
    );

    if (result.rows.length === 0) {
      throw new Error('Member not found');
    }

    return result.rows[0];
  }

  /**
   * Remove member from project
   */
  async removeMember(projectId, memberId, tenantId, removedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        `UPDATE project_members 
        SET status = 'inactive', left_at = NOW(), updated_at = NOW()
        WHERE id = $1 AND project_id = $2 AND tenant_id = $3
        RETURNING *`,
        [memberId, projectId, tenantId]
      );

      if (result.rows.length === 0) {
        throw new Error('Member not found');
      }

      // Log activity
      await this._logActivity(client, tenantId, projectId, 'member_removed', 'member', memberId, result.rows[0], null, removedBy);

      await client.query('COMMIT');
      setImmediate(async () => { try { await getAuditService().log({ action: 'DELETE', user_id: removedBy, tenant_id: tenantId, resource_type: 'project', resource_id: projectId, response_status: 200, metadata: { action: 'member_removed', member_id: memberId } }); } catch(e){} });
      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get project members
   */
  async getMembers(projectId, tenantId) {
    const result = await this.pool.query(
      `SELECT pm.*, u.email, u.first_name, u.last_name
      FROM project_members pm
      JOIN users u ON pm.user_id = u.id
      WHERE pm.project_id = $1 AND pm.tenant_id = $2 AND pm.status = 'active'
      ORDER BY pm.role, u.first_name`,
      [projectId, tenantId]
    );

    return result.rows;
  }

  /**
   * Check if user is member of project
   */
  async isMember(projectId, userId, tenantId) {
    const result = await this.pool.query(
      `SELECT id, role, permissions FROM project_members 
      WHERE project_id = $1 AND user_id = $2 AND tenant_id = $3 AND status = 'active'`,
      [projectId, userId, tenantId]
    );

    return result.rows.length > 0 ? result.rows[0] : null;
  }

  // ============================================================================
  // PROJECT MILESTONES
  // ============================================================================

  /**
   * Add milestone to project
   */
  async addMilestone(projectId, tenantId, data, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO project_milestones (
        tenant_id, project_id, name, description, milestone_type,
        planned_date, sequence, owner_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        tenantId,
        projectId,
        data.name,
        data.description,
        data.milestone_type || 'deliverable',
        data.planned_date,
        data.sequence || 0,
        data.owner_id
      ]
    );

    return result.rows[0];
  }

  /**
   * Update milestone
   */
  async updateMilestone(milestoneId, projectId, tenantId, data, updatedBy) {
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const allowedFields = ['name', 'description', 'milestone_type', 'planned_date', 'actual_date', 'status', 'sequence', 'owner_id', 'notes'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateFields.push(`${field} = $${paramIndex}`);
        updateValues.push(data[field]);
        paramIndex++;
      }
    }

    // If completing milestone
    if (data.status === 'completed' && !data.completed_by) {
      updateFields.push(`completed_by = $${paramIndex}`);
      updateValues.push(updatedBy);
      paramIndex++;
    }

    updateFields.push(`updated_at = NOW()`);

    updateValues.push(milestoneId, projectId, tenantId);

    const result = await this.pool.query(
      `UPDATE project_milestones SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND project_id = $${paramIndex + 1} AND tenant_id = $${paramIndex + 2}
      RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      throw new Error('Milestone not found');
    }

    return result.rows[0];
  }

  /**
   * Get milestones for project
   */
  async getMilestones(projectId, tenantId) {
    const result = await this.pool.query(
      `SELECT pm.*, u.email as owner_email, u.first_name as owner_first_name
      FROM project_milestones pm
      LEFT JOIN users u ON pm.owner_id = u.id
      WHERE pm.project_id = $1 AND pm.tenant_id = $2
      ORDER BY pm.sequence, pm.planned_date`,
      [projectId, tenantId]
    );

    return result.rows;
  }

  // ============================================================================
  // PROJECT MODULES
  // ============================================================================

  /**
   * Enable module for project
   */
  async enableModule(projectId, tenantId, moduleCode, enabledBy) {
    const result = await this.pool.query(
      `INSERT INTO project_modules (tenant_id, project_id, module_code, is_enabled, enabled_by, enabled_at)
      VALUES ($1, $2, $3, true, $4, NOW())
      ON CONFLICT (project_id, module_code) 
      DO UPDATE SET is_enabled = true, enabled_by = $4, enabled_at = NOW(), disabled_at = NULL, updated_at = NOW()
      RETURNING *`,
      [tenantId, projectId, moduleCode, enabledBy]
    );

    return result.rows[0];
  }

  /**
   * Disable module for project
   */
  async disableModule(projectId, tenantId, moduleCode) {
    const result = await this.pool.query(
      `UPDATE project_modules SET is_enabled = false, disabled_at = NOW(), updated_at = NOW()
      WHERE project_id = $1 AND tenant_id = $2 AND module_code = $3
      RETURNING *`,
      [projectId, tenantId, moduleCode]
    );

    return result.rows[0];
  }

  /**
   * Get enabled modules for project
   */
  async getModules(projectId, tenantId) {
    const result = await this.pool.query(
      `SELECT * FROM project_modules WHERE project_id = $1 AND tenant_id = $2 AND is_enabled = true`,
      [projectId, tenantId]
    );

    return result.rows;
  }

  // ============================================================================
  // PROJECT ACTIVITY
  // ============================================================================

  /**
   * Get project activity log
   */
  async getActivity(projectId, tenantId, options = {}) {
    const { limit = 50, offset = 0, activity_type } = options;

    let query = `
      SELECT pal.*, u.email as performed_by_email, u.first_name, u.last_name
      FROM project_activity_log pal
      LEFT JOIN users u ON pal.performed_by = u.id
      WHERE pal.project_id = $1 AND pal.tenant_id = $2
    `;

    const params = [projectId, tenantId];

    if (activity_type) {
      query += ` AND pal.activity_type = $3`;
      params.push(activity_type);
    }

    query += ` ORDER BY pal.performed_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    return result.rows;
  }

  /**
   * Internal method to log activity
   */
  async _logActivity(client, tenantId, projectId, activityType, entityType, entityId, oldValue, newValue, performedBy) {
    await client.query(
      `INSERT INTO project_activity_log (
        tenant_id, project_id, activity_type, entity_type, entity_id,
        old_value, new_value, performed_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        tenantId,
        projectId,
        activityType,
        entityType,
        entityId,
        oldValue ? JSON.stringify(oldValue) : null,
        newValue ? JSON.stringify(newValue) : null,
        performedBy
      ]
    );
  }

  // ============================================================================
  // PROJECT STATISTICS
  // ============================================================================

  /**
   * Get project statistics
   */
  async getStats(projectId, tenantId) {
    const stats = {};

    // Member count
    const memberResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM project_members WHERE project_id = $1 AND status = 'active'`,
      [projectId]
    );
    stats.members = parseInt(memberResult.rows[0].count);

    // Milestone stats
    const milestoneResult = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'missed') as missed,
        COUNT(*) FILTER (WHERE status = 'pending' AND planned_date < CURRENT_DATE) as overdue
      FROM project_milestones WHERE project_id = $1`,
      [projectId]
    );
    stats.milestones = milestoneResult.rows[0];

    // Workflow instances
    const workflowResult = await this.pool.query(
      `SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
      FROM workflow_instances WHERE project_id = $1`,
      [projectId]
    );
    stats.workflows = workflowResult.rows[0];

    // Documents
    const docResult = await this.pool.query(
      `SELECT COUNT(*) as count FROM documents WHERE project_id = $1`,
      [projectId]
    );
    stats.documents = parseInt(docResult.rows[0].count);

    return stats;
  }

  /**
   * Get my projects (where user is a member)
   */
  async getMyProjects(userId, tenantId, options = {}) {
    return this.list(tenantId, { ...options, member_user_id: userId });
  }
}

// Singleton instance
let projectServiceInstance = null;

function getProjectService() {
  if (!projectServiceInstance) {
    projectServiceInstance = new ProjectService();
  }
  return projectServiceInstance;
}

module.exports = {
  ProjectService,
  getProjectService
};
