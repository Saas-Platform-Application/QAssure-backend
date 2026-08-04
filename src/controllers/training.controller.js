/**
 * Training Controller
 * Handles training management API endpoints
 */

const { getTrainingService } = require('../services/training.service');

class TrainingController {

  // ============================================================================
  // COURSES
  // ============================================================================

  async createCourse(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;

      const { course_code, title, course_type } = req.body;
      if (!course_code || !title || !course_type) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'course_code, title, and course_type are required' }
        });
      }

      const course = await service.createCourse(tenantId, req.body, createdBy);
      res.status(201).json({ success: true, data: course });
    } catch (error) {
      console.error('[Training] Create course error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async listCourses(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const { status, category, course_type, search, limit, offset } = req.query;

      const result = await service.listCourses(tenantId, {
        status, category, course_type, search,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json({
        success: true,
        data: result.courses,
        pagination: { total: result.total, limit: result.limit, offset: result.offset }
      });
    } catch (error) {
      console.error('[Training] List courses error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getCourse(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const course = await service.getCourse(id, tenantId);
      if (!course) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Course not found' } });
      }

      res.json({ success: true, data: course });
    } catch (error) {
      console.error('[Training] Get course error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async updateCourse(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;

      const course = await service.updateCourse(id, tenantId, req.body, updatedBy);
      res.json({ success: true, data: course });
    } catch (error) {
      console.error('[Training] Update course error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // ASSIGNMENTS
  // ============================================================================

  async assignTraining(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const assignedBy = req.user.id;

      const { course_id, user_id } = req.body;
      if (!course_id || !user_id) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'course_id and user_id are required' }
        });
      }

      const assignment = await service.assignTraining(tenantId, req.body, assignedBy);
      res.status(201).json({ success: true, data: assignment });
    } catch (error) {
      console.error('[Training] Assign error:', error.message);
      res.status(500).json({ success: false, error: { code: 'ASSIGN_ERROR', message: error.message } });
    }
  }

  async getMyAssignments(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { status, limit, offset } = req.query;

      const result = await service.getMyAssignments(userId, tenantId, {
        status,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json({ success: true, data: result.assignments, pagination: { limit: result.limit, offset: result.offset } });
    } catch (error) {
      console.error('[Training] Get my assignments error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getAssignment(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const assignment = await service.getAssignment(id, tenantId);
      if (!assignment) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Assignment not found' } });
      }

      res.json({ success: true, data: assignment });
    } catch (error) {
      console.error('[Training] Get assignment error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async startTraining(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;

      const assignment = await service.startTraining(id, tenantId, userId);
      res.json({ success: true, data: assignment });
    } catch (error) {
      console.error('[Training] Start error:', error.message);
      
      // Provide more specific error codes
      let statusCode = 500;
      let errorCode = 'START_ERROR';
      
      if (error.message.includes('not found')) {
        statusCode = 404;
        errorCode = 'NOT_FOUND';
      } else if (error.message.includes('cannot be started') || error.message.includes('Status may have changed')) {
        statusCode = 400;
        errorCode = 'INVALID_STATUS';
      }
      
      res.status(statusCode).json({ success: false, error: { code: errorCode, message: error.message } });
    }
  }

  async completeTraining(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { id } = req.params;

      const { score } = req.body;
      if (score === undefined) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'score is required' }
        });
      }

      const result = await service.completeTraining(id, tenantId, userId, req.body);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Training] Complete error:', error.message);
      res.status(500).json({ success: false, error: { code: 'COMPLETE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // RECORDS
  // ============================================================================

  async getMyRecords(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const userId = req.user.id;
      const { limit, offset } = req.query;

      const result = await service.getUserRecords(userId, tenantId, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json({ success: true, data: result.records, pagination: { limit: result.limit, offset: result.offset } });
    } catch (error) {
      console.error('[Training] Get records error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getExpiringCertifications(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const { days_ahead } = req.query;

      const records = await service.getExpiringCertifications(tenantId, parseInt(days_ahead) || 30);
      res.json({ success: true, data: records });
    } catch (error) {
      console.error('[Training] Expiring certs error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // COMPETENCIES
  // ============================================================================

  async createCompetencyDefinition(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;

      const { name, description, category, levels, role_requirements } = req.body;
      if (!name) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'name is required' }
        });
      }

      const competency = await service.createCompetencyDefinition(tenantId, {
        name,
        description,
        category,
        levels,
        role_requirements
      });

      res.status(201).json({ success: true, data: competency });
    } catch (error) {
      console.error('[Training] Create competency definition error:', error.message);
      
      if (error.message.includes('unique') || error.message.includes('duplicate')) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_NAME', message: 'Competency with this name already exists' }
        });
      }

      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async getCompetencyMatrix(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const { user_id } = req.query;

      const matrix = await service.getCompetencyMatrix(tenantId, user_id);
      res.json({ success: true, data: matrix });
    } catch (error) {
      console.error('[Training] Competency matrix error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async updateUserCompetency(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const assessedBy = req.user.id;
      const { user_id, competency_id } = req.params;

      const result = await service.updateUserCompetency(tenantId, user_id, competency_id, req.body, assessedBy);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Training] Update competency error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // DASHBOARD
  // ============================================================================

  async getDashboard(req, res) {
    try {
      const service = getTrainingService();
      const tenantId = req.user.tenantId;
      const userId = req.query.all ? null : req.user.id;

      const dashboard = await service.getTrainingDashboard(tenantId, userId);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      console.error('[Training] Dashboard error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // STATIC DATA
  // ============================================================================

  async getCourseTypes(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'online', name: 'Online/E-Learning' },
        { code: 'classroom', name: 'Classroom/Instructor-Led' },
        { code: 'on_the_job', name: 'On-the-Job Training' },
        { code: 'self_study', name: 'Self Study' },
        { code: 'external', name: 'External Training' }
      ]
    });
  }

  async getCategories(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'compliance', name: 'Compliance & Regulatory' },
        { code: 'quality', name: 'Quality Management' },
        { code: 'technical', name: 'Technical Skills' },
        { code: 'safety', name: 'Safety & EHS' },
        { code: 'leadership', name: 'Leadership & Management' },
        { code: 'soft_skills', name: 'Soft Skills' }
      ]
    });
  }

  async getStatuses(req, res) {
    res.json({
      success: true,
      data: [
        { code: 'assigned', name: 'Assigned' },
        { code: 'in_progress', name: 'In Progress' },
        { code: 'completed', name: 'Completed' },
        { code: 'overdue', name: 'Overdue' },
        { code: 'waived', name: 'Waived' }
      ]
    });
  }
}

module.exports = new TrainingController();
