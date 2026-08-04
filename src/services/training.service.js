/**
 * Training Service
 * Manages training courses, assignments, records, and competencies
 */

const { pool } = require('../config/database');
const { getWorkflowEngineService } = require('./workflow-engine.service');
const { getAuditService } = require('./audit.service');
const { getNotificationService } = require('./notification.service');

class TrainingService {
  constructor() {
    this.pool = pool;
  }

  // ============================================================================
  // COURSES
  // ============================================================================

  async createCourse(tenantId, data, createdBy) {
    const result = await this.pool.query(
      `INSERT INTO training_courses (
        tenant_id, course_code, title, description, course_type, category,
        duration_hours, passing_score, max_attempts, prerequisites,
        required_for_roles, required_for_departments, status, version,
        requires_recertification, recertification_months, content_url, document_id, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *`,
      [
        tenantId, data.course_code, data.title, data.description, data.course_type,
        data.category, data.duration_hours, data.passing_score || 80, data.max_attempts || 3,
        data.prerequisites || [], data.required_for_roles || [], data.required_for_departments || [],
        'draft', '1.0', data.requires_recertification || false, data.recertification_months,
        data.content_url, data.document_id, createdBy
      ]
    );

    setImmediate(async () => { try { await getAuditService().log({ action: 'CREATE', user_id: createdBy, tenant_id: tenantId, resource_type: 'training', resource_id: result.rows[0].id, response_status: 201, metadata: { course_code: data.course_code, title: data.title } }); } catch(e){} });
    return this._formatCourse(result.rows[0]);
  }

  async getCourse(courseId, tenantId) {
    const result = await this.pool.query(
      `SELECT c.*, d.document_number, d.title as document_title
       FROM training_courses c
       LEFT JOIN documents d ON c.document_id = d.id
       WHERE c.id = $1 AND c.tenant_id = $2`,
      [courseId, tenantId]
    );
    return result.rows.length > 0 ? this._formatCourse(result.rows[0]) : null;
  }

  async listCourses(tenantId, options = {}) {
    const { status, category, course_type, search, limit = 50, offset = 0 } = options;

    let query = 'SELECT * FROM training_courses WHERE tenant_id = $1';
    const params = [tenantId];
    let paramIndex = 2;

    if (status) {
      query += ` AND status = $${paramIndex++}`;
      params.push(status);
    }
    if (category) {
      query += ` AND category = $${paramIndex++}`;
      params.push(category);
    }
    if (course_type) {
      query += ` AND course_type = $${paramIndex++}`;
      params.push(course_type);
    }
    if (search) {
      query += ` AND (title ILIKE $${paramIndex} OR course_code ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    query += ` ORDER BY course_code LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);
    const countResult = await this.pool.query(
      'SELECT COUNT(*) FROM training_courses WHERE tenant_id = $1',
      [tenantId]
    );

    return {
      courses: result.rows.map(c => this._formatCourse(c)),
      total: parseInt(countResult.rows[0].count),
      limit,
      offset
    };
  }

  async updateCourse(courseId, tenantId, data, updatedBy) {
    const allowedFields = ['title', 'description', 'category', 'duration_hours', 'passing_score',
      'max_attempts', 'requires_recertification', 'recertification_months', 'content_url', 'status'];
    
    const setClauses = [];
    const values = [courseId, tenantId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(data)) {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex++}`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) return this.getCourse(courseId, tenantId);

    setClauses.push(`updated_by = $${paramIndex++}`, 'updated_at = NOW()');
    values.push(updatedBy);

    await this.pool.query(
      `UPDATE training_courses SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2`,
      values
    );

    setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: updatedBy, tenant_id: tenantId, resource_type: 'training', resource_id: courseId, response_status: 200, metadata: { updated_fields: Object.keys(data) } }); } catch(e){} });

    return this.getCourse(courseId, tenantId);
  }

  // ============================================================================
  // ASSIGNMENTS
  // ============================================================================

  async assignTraining(tenantId, data, assignedBy) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get course info
      const courseResult = await client.query(
        'SELECT * FROM training_courses WHERE id = $1 AND tenant_id = $2',
        [data.course_id, tenantId]
      );

      if (courseResult.rows.length === 0) {
        throw new Error('Course not found');
      }

      const course = courseResult.rows[0];

      // Calculate due date
      let dueDate = data.due_date;
      if (!dueDate && data.due_days) {
        dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + data.due_days);
      }

      // Create assignment
      const assignResult = await client.query(
        `INSERT INTO training_assignments (
          tenant_id, course_id, user_id, assigned_by, reason, due_date, status
        ) VALUES ($1, $2, $3, $4, $5, $6, 'assigned')
        RETURNING *`,
        [tenantId, data.course_id, data.user_id, assignedBy, data.reason, dueDate]
      );

      const assignment = assignResult.rows[0];

      await client.query('COMMIT');

      setImmediate(async () => { try { await getAuditService().log({ action: 'CREATE', user_id: assignedBy, tenant_id: tenantId, resource_type: 'training', resource_id: assignment.id, response_status: 201, metadata: { course_id: data.course_id, assigned_user_id: data.user_id } }); } catch(e){} });

      // Notify assigned user
      if (data.user_id && data.user_id !== assignedBy) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, data.user_id, 'training_assigned', {
              course_title: course.title,
              due_date: data.due_date || 'N/A'
            }, {
              entityType: 'training_assignment',
              entityId: assignment.id,
              entityName: course.title,
              actionUrl: `/training/my-assignments`,
              createdBy: assignedBy
            });
          } catch (e) { console.warn('[TrainingService] Notification failed:', e.message); }
        });
      }

      return this.getAssignment(assignment.id, tenantId);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getAssignment(assignmentId, tenantId) {
    const result = await this.pool.query(
      `SELECT ta.*, 
              tc.course_code, tc.title as course_title, tc.course_type, tc.duration_hours, tc.passing_score,
              u.email as user_email, u.first_name, u.last_name,
              ab.email as assigned_by_email
       FROM training_assignments ta
       JOIN training_courses tc ON ta.course_id = tc.id
       JOIN users u ON ta.user_id = u.id
       LEFT JOIN users ab ON ta.assigned_by = ab.id
       WHERE ta.id = $1 AND ta.tenant_id = $2`,
      [assignmentId, tenantId]
    );

    return result.rows.length > 0 ? this._formatAssignment(result.rows[0]) : null;
  }

  async getMyAssignments(userId, tenantId, options = {}) {
    const { status, limit = 50, offset = 0 } = options;

    let query = `
      SELECT ta.*, tc.course_code, tc.title as course_title, tc.course_type, tc.duration_hours
      FROM training_assignments ta
      JOIN training_courses tc ON ta.course_id = tc.id
      WHERE ta.user_id = $1 AND ta.tenant_id = $2
    `;
    const params = [userId, tenantId];
    let paramIndex = 3;

    if (status) {
      query += ` AND ta.status = $${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY ta.due_date ASC NULLS LAST LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
    params.push(limit, offset);

    const result = await this.pool.query(query, params);

    return {
      assignments: result.rows.map(a => this._formatAssignment(a)),
      limit,
      offset
    };
  }

  async startTraining(assignmentId, tenantId, userId) {
    // First, check if assignment exists and get its details
    const assignmentCheck = await this.pool.query(
      `SELECT id, user_id, status, tenant_id 
       FROM training_assignments 
       WHERE id = $1 AND tenant_id = $2`,
      [assignmentId, tenantId]
    );

    if (assignmentCheck.rows.length === 0) {
      throw new Error('Assignment not found');
    }

    const assignment = assignmentCheck.rows[0];

    // Check if assignment can be started
    if (assignment.status !== 'assigned') {
      throw new Error(`Assignment cannot be started. Current status: ${assignment.status}`);
    }

    // Check if user is the assigned user OR has write permission (guaranteed by authorize middleware)
    // Since authorize('training:write') middleware ensures write permission, we allow it
    // But we still check if it's the user's own assignment for better error messages
    if (assignment.user_id !== userId) {
      // User with write permission can start assignments for others
      // This is allowed because authorize('training:write') middleware ensures permission
    }

    // Update the assignment
    const result = await this.pool.query(
      `UPDATE training_assignments 
       SET status = 'in_progress', started_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND tenant_id = $2 AND status = 'assigned'
       RETURNING *`,
      [assignmentId, tenantId]
    );

    if (result.rows.length === 0) {
      throw new Error('Failed to start assignment. Status may have changed.');
    }
    setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: userId, tenant_id: tenantId, resource_type: 'training', resource_id: assignmentId, response_status: 200, metadata: { action: 'training_started' } }); } catch(e){} });

    return this.getAssignment(assignmentId, tenantId);
  }

  async completeTraining(assignmentId, tenantId, userId, data) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get assignment
      const assignResult = await client.query(
        `SELECT ta.*, tc.*, u.first_name, u.last_name
         FROM training_assignments ta
         JOIN training_courses tc ON ta.course_id = tc.id
         JOIN users u ON ta.user_id = u.id
         WHERE ta.id = $1 AND ta.tenant_id = $2 AND ta.user_id = $3`,
        [assignmentId, tenantId, userId]
      );

      if (assignResult.rows.length === 0) {
        throw new Error('Assignment not found');
      }

      const assignment = assignResult.rows[0];
      assignment.user_full_name = `${assignment.first_name} ${assignment.last_name}`;
      const passed = data.score >= assignment.passing_score;

      // Update assignment
      await client.query(
        `UPDATE training_assignments 
         SET status = 'completed', completed_at = NOW(), score = $1, passed = $2,
             attempts = attempts + 1, updated_at = NOW()
         WHERE id = $3`,
        [data.score, passed, assignmentId]
      );

      // Calculate expiry date
      let expiresAt = null;
      if (passed && assignment.requires_recertification && assignment.recertification_months) {
        expiresAt = new Date();
        expiresAt.setMonth(expiresAt.getMonth() + assignment.recertification_months);
      }

      // Create training record
      const recordResult = await client.query(
        `INSERT INTO training_records (
          tenant_id, assignment_id, course_id, course_code, course_title, course_version,
          user_id, completed_at, score, passed, expires_at, signature_id
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, $9, $10, $11)
        RETURNING *`,
        [
          tenantId, assignmentId, assignment.course_id, assignment.course_code,
          assignment.title, assignment.version, userId, data.score, passed,
          expiresAt, data.signature_id
        ]
      );

      await client.query('COMMIT');

      setImmediate(async () => { try { await getAuditService().log({ action: 'UPDATE', user_id: userId, tenant_id: tenantId, resource_type: 'training', resource_id: assignmentId, response_status: 200, metadata: { action: 'training_completed', score: data.score, passed } }); } catch(e){} });

      // Notify assigner of completion
      if (assignment.assigned_by && assignment.assigned_by !== userId) {
        setImmediate(async () => {
          try {
            await getNotificationService().sendFromTemplate(tenantId, assignment.assigned_by, 'training_completed', {
              course_title: assignment.course_title,
              user_name: assignment.user_full_name
            }, {
              entityType: 'training_assignment',
              entityId: assignmentId,
              entityName: assignment.course_title,
              actionUrl: `/training/assignments`,
              createdBy: userId
            });
          } catch (e) { console.warn('[TrainingService] Notification failed:', e.message); }
        });
      }

      return {
        assignment: await this.getAssignment(assignmentId, tenantId),
        record: this._formatRecord(recordResult.rows[0]),
        passed
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // TRAINING RECORDS
  // ============================================================================

  async getUserRecords(userId, tenantId, options = {}) {
    const { limit = 50, offset = 0 } = options;

    const result = await this.pool.query(
      `SELECT tr.*, u.email as user_email
       FROM training_records tr
       JOIN users u ON tr.user_id = u.id
       WHERE tr.user_id = $1 AND tr.tenant_id = $2
       ORDER BY tr.completed_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, tenantId, limit, offset]
    );

    return {
      records: result.rows.map(r => this._formatRecord(r)),
      limit,
      offset
    };
  }

  async getExpiringCertifications(tenantId, daysAhead = 30) {
    const result = await this.pool.query(
      `SELECT tr.*, u.email, u.first_name, u.last_name
       FROM training_records tr
       JOIN users u ON tr.user_id = u.id
       WHERE tr.tenant_id = $1 
       AND tr.expires_at IS NOT NULL
       AND tr.expires_at <= NOW() + INTERVAL '1 day' * $2
       AND tr.passed = TRUE
       ORDER BY tr.expires_at`,
      [tenantId, daysAhead]
    );

    return result.rows.map(r => ({
      ...this._formatRecord(r),
      user: { email: r.email, name: `${r.first_name} ${r.last_name}` }
    }));
  }

  // ============================================================================
  // COMPETENCIES
  // ============================================================================

  async createCompetencyDefinition(tenantId, data) {
    const result = await this.pool.query(
      `INSERT INTO competency_definitions (tenant_id, name, description, category, levels, role_requirements)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        tenantId,
        data.name,
        data.description,
        data.category,
        JSON.stringify(data.levels || [
          { level: 1, name: 'Awareness', description: 'Basic understanding' },
          { level: 2, name: 'Knowledge', description: 'Working knowledge' },
          { level: 3, name: 'Skill', description: 'Can perform independently' },
          { level: 4, name: 'Mastery', description: 'Expert level' }
        ]),
        JSON.stringify(data.role_requirements || {})
      ]
    );

    return result.rows[0];
  }

  async getCompetencyMatrix(tenantId, userId = null) {
    let query = `
      SELECT cd.*, uc.current_level, uc.target_level, uc.user_id, u.email, u.first_name, u.last_name
      FROM competency_definitions cd
      LEFT JOIN user_competencies uc ON cd.id = uc.competency_id
      LEFT JOIN users u ON uc.user_id = u.id
      WHERE cd.tenant_id = $1
    `;
    const params = [tenantId];

    if (userId) {
      query += ' AND (uc.user_id = $2 OR uc.user_id IS NULL)';
      params.push(userId);
    }

    query += ' ORDER BY cd.category, cd.name';

    const result = await this.pool.query(query, params);

    return result.rows.map(r => ({
      id: r.id,
      name: r.name,
      description: r.description,
      category: r.category,
      levels: r.levels,
      user_level: r.current_level,
      target_level: r.target_level,
      user: r.email ? { id: r.user_id, email: r.email, name: `${r.first_name} ${r.last_name}` } : null
    }));
  }

  async updateUserCompetency(tenantId, userId, competencyId, data, assessedBy) {
    const result = await this.pool.query(
      `INSERT INTO user_competencies (tenant_id, user_id, competency_id, current_level, target_level, assessed_by, evidence)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, competency_id) 
       DO UPDATE SET current_level = $4, target_level = $5, assessed_by = $6, assessed_at = NOW(), evidence = $7
       RETURNING *`,
      [tenantId, userId, competencyId, data.current_level, data.target_level, assessedBy, data.evidence]
    );

    return result.rows[0];
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  async getTrainingDashboard(tenantId, userId = null) {
    const userFilter = userId ? 'AND user_id = $2' : '';
    const params = userId ? [tenantId, userId] : [tenantId];

    // Get counts
    const countsResult = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'assigned') as pending,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
         COUNT(*) FILTER (WHERE status = 'completed' AND completed_at > NOW() - INTERVAL '30 days') as completed_30d,
         COUNT(*) FILTER (WHERE status IN ('assigned', 'in_progress') AND due_date < NOW()) as overdue
       FROM training_assignments
       WHERE tenant_id = $1 ${userFilter}`,
      params
    );

    // Get expiring certifications
    const expiringResult = await this.pool.query(
      `SELECT COUNT(*) as expiring
       FROM training_records
       WHERE tenant_id = $1 
       AND expires_at BETWEEN NOW() AND NOW() + INTERVAL '30 days'
       ${userId ? 'AND user_id = $2' : ''}`,
      params
    );

    return {
      pending: parseInt(countsResult.rows[0].pending),
      in_progress: parseInt(countsResult.rows[0].in_progress),
      completed_30d: parseInt(countsResult.rows[0].completed_30d),
      overdue: parseInt(countsResult.rows[0].overdue),
      expiring_certifications: parseInt(expiringResult.rows[0].expiring)
    };
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  _formatCourse(c) {
    return {
      id: c.id,
      course_code: c.course_code,
      title: c.title,
      description: c.description,
      course_type: c.course_type,
      category: c.category,
      duration_hours: parseFloat(c.duration_hours),
      passing_score: c.passing_score,
      max_attempts: c.max_attempts,
      prerequisites: c.prerequisites,
      required_for_roles: c.required_for_roles,
      required_for_departments: c.required_for_departments,
      status: c.status,
      version: c.version,
      recertification: c.requires_recertification ? {
        required: true,
        months: c.recertification_months
      } : { required: false },
      content_url: c.content_url,
      document: c.document_id ? { id: c.document_id, number: c.document_number, title: c.document_title } : null,
      created_at: c.created_at,
      updated_at: c.updated_at
    };
  }

  _formatAssignment(a) {
    return {
      id: a.id,
      course: {
        id: a.course_id,
        code: a.course_code,
        title: a.course_title,
        type: a.course_type,
        duration_hours: parseFloat(a.duration_hours || 0)
      },
      user: a.user_email ? {
        id: a.user_id,
        email: a.user_email,
        name: `${a.first_name} ${a.last_name}`
      } : { id: a.user_id },
      status: a.status,
      assigned_by: a.assigned_by_email,
      assigned_at: a.assigned_at,
      reason: a.reason,
      due_date: a.due_date,
      started_at: a.started_at,
      completed_at: a.completed_at,
      attempts: a.attempts,
      score: a.score ? parseFloat(a.score) : null,
      passed: a.passed
    };
  }

  _formatRecord(r) {
    return {
      id: r.id,
      course: {
        id: r.course_id,
        code: r.course_code,
        title: r.course_title,
        version: r.course_version
      },
      completed_at: r.completed_at,
      score: r.score ? parseFloat(r.score) : null,
      passed: r.passed,
      certificate_number: r.certificate_number,
      expires_at: r.expires_at,
      instructor: r.instructor_name,
      external_provider: r.external_provider
    };
  }
}

// Singleton
let instance = null;
const getTrainingService = () => {
  if (!instance) instance = new TrainingService();
  return instance;
};

module.exports = { TrainingService, getTrainingService };
