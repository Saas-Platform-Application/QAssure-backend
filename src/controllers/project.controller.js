/**
 * Project Controller
 * Handles all project-related API endpoints
 */

const { getProjectService } = require('../services/project.service');

class ProjectController {

  // ============================================================================
  // PROJECT CRUD
  // ============================================================================

  /**
   * POST /api/v1/projects
   * Create a new project
   */
  async create(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;

      const project = await service.create(tenantId, req.body, createdBy);

      res.status(201).json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('[Project] Create error:', error.message);
      
      if (error.message.includes('unique_project_code_per_tenant')) {
        return res.status(409).json({
          success: false,
          error: { code: 'DUPLICATE_CODE', message: 'Project code already exists' }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'CREATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/projects
   * List projects with filtering
   */
  async list(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const { status, project_type, owner_id, search, limit, offset, sort_by, sort_order, my_projects } = req.query;

      let result;
      
      if (my_projects === 'true') {
        result = await service.getMyProjects(req.user.id, tenantId, {
          status,
          project_type,
          search,
          limit: parseInt(limit) || 50,
          offset: parseInt(offset) || 0,
          sort_by,
          sort_order
        });
      } else {
        result = await service.list(tenantId, {
          status,
          project_type,
          owner_id,
          search,
          limit: parseInt(limit) || 50,
          offset: parseInt(offset) || 0,
          sort_by,
          sort_order
        });
      }

      res.json({
        success: true,
        data: result.projects,
        pagination: {
          total: result.total,
          limit: result.limit,
          offset: result.offset
        }
      });
    } catch (error) {
      console.error('[Project] List error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/projects/:id
   * Get project by ID
   */
  async getById(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const project = await service.getById(id, tenantId);

      if (!project) {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: 'Project not found' }
        });
      }

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('[Project] Get by ID error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * PUT /api/v1/projects/:id
   * Update project
   */
  async update(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id } = req.params;

      const project = await service.update(id, tenantId, req.body, updatedBy);

      res.json({
        success: true,
        data: project
      });
    } catch (error) {
      console.error('[Project] Update error:', error.message);
      
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_ERROR', message: error.message }
      });
    }
  }

  /**
   * DELETE /api/v1/projects/:id
   * Archive project (soft delete)
   */
  async delete(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const deletedBy = req.user.id;
      const { id } = req.params;

      await service.delete(id, tenantId, deletedBy);

      res.json({
        success: true,
        message: 'Project archived successfully'
      });
    } catch (error) {
      console.error('[Project] Delete error:', error.message);
      
      if (error.message === 'Project not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'DELETE_ERROR', message: error.message }
      });
    }
  }

  /**
   * GET /api/v1/projects/:id/stats
   * Get project statistics
   */
  async getStats(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const stats = await service.getStats(id, tenantId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      console.error('[Project] Get stats error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  // ============================================================================
  // PROJECT MEMBERS
  // ============================================================================

  /**
   * GET /api/v1/projects/:id/members
   * Get project members
   */
  async getMembers(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const members = await service.getMembers(id, tenantId);

      res.json({
        success: true,
        data: members
      });
    } catch (error) {
      console.error('[Project] Get members error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/projects/:id/members
   * Add member to project
   */
  async addMember(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const addedBy = req.user.id;
      const { id } = req.params;

      const member = await service.addMember(id, tenantId, req.body, addedBy);

      res.status(201).json({
        success: true,
        data: member
      });
    } catch (error) {
      console.error('[Project] Add member error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'ADD_MEMBER_ERROR', message: error.message }
      });
    }
  }

  /**
   * PUT /api/v1/projects/:id/members/:memberId
   * Update member role/permissions
   */
  async updateMember(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id, memberId } = req.params;

      const member = await service.updateMember(id, memberId, tenantId, req.body, updatedBy);

      res.json({
        success: true,
        data: member
      });
    } catch (error) {
      console.error('[Project] Update member error:', error.message);
      
      if (error.message === 'Member not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_MEMBER_ERROR', message: error.message }
      });
    }
  }

  /**
   * DELETE /api/v1/projects/:id/members/:memberId
   * Remove member from project
   */
  async removeMember(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const removedBy = req.user.id;
      const { id, memberId } = req.params;

      await service.removeMember(id, memberId, tenantId, removedBy);

      res.json({
        success: true,
        message: 'Member removed from project'
      });
    } catch (error) {
      console.error('[Project] Remove member error:', error.message);
      
      if (error.message === 'Member not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'REMOVE_MEMBER_ERROR', message: error.message }
      });
    }
  }

  // ============================================================================
  // PROJECT MILESTONES
  // ============================================================================

  /**
   * GET /api/v1/projects/:id/milestones
   * Get project milestones
   */
  async getMilestones(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const milestones = await service.getMilestones(id, tenantId);

      res.json({
        success: true,
        data: milestones
      });
    } catch (error) {
      console.error('[Project] Get milestones error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/projects/:id/milestones
   * Add milestone to project
   */
  async addMilestone(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;
      const { id } = req.params;

      const milestone = await service.addMilestone(id, tenantId, req.body, createdBy);

      res.status(201).json({
        success: true,
        data: milestone
      });
    } catch (error) {
      console.error('[Project] Add milestone error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'ADD_MILESTONE_ERROR', message: error.message }
      });
    }
  }

  /**
   * PUT /api/v1/projects/:id/milestones/:milestoneId
   * Update milestone
   */
  async updateMilestone(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const updatedBy = req.user.id;
      const { id, milestoneId } = req.params;

      const milestone = await service.updateMilestone(milestoneId, id, tenantId, req.body, updatedBy);

      res.json({
        success: true,
        data: milestone
      });
    } catch (error) {
      console.error('[Project] Update milestone error:', error.message);
      
      if (error.message === 'Milestone not found') {
        return res.status(404).json({
          success: false,
          error: { code: 'NOT_FOUND', message: error.message }
        });
      }

      res.status(500).json({
        success: false,
        error: { code: 'UPDATE_MILESTONE_ERROR', message: error.message }
      });
    }
  }

  // ============================================================================
  // PROJECT MODULES
  // ============================================================================

  /**
   * GET /api/v1/projects/:id/modules
   * Get enabled modules for project
   */
  async getModules(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const modules = await service.getModules(id, tenantId);

      res.json({
        success: true,
        data: modules
      });
    } catch (error) {
      console.error('[Project] Get modules error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/projects/:id/modules/:moduleCode/enable
   * Enable module for project
   */
  async enableModule(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const enabledBy = req.user.id;
      const { id, moduleCode } = req.params;

      const module = await service.enableModule(id, tenantId, moduleCode, enabledBy);

      res.json({
        success: true,
        data: module
      });
    } catch (error) {
      console.error('[Project] Enable module error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'ENABLE_MODULE_ERROR', message: error.message }
      });
    }
  }

  /**
   * POST /api/v1/projects/:id/modules/:moduleCode/disable
   * Disable module for project
   */
  async disableModule(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const { id, moduleCode } = req.params;

      const module = await service.disableModule(id, tenantId, moduleCode);

      res.json({
        success: true,
        data: module
      });
    } catch (error) {
      console.error('[Project] Disable module error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'DISABLE_MODULE_ERROR', message: error.message }
      });
    }
  }

  // ============================================================================
  // PROJECT ACTIVITY
  // ============================================================================

  /**
   * GET /api/v1/projects/:id/activity
   * Get project activity log
   */
  async getActivity(req, res) {
    try {
      const service = getProjectService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;
      const { limit, offset, activity_type } = req.query;

      const activity = await service.getActivity(id, tenantId, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0,
        activity_type
      });

      res.json({
        success: true,
        data: activity
      });
    } catch (error) {
      console.error('[Project] Get activity error:', error.message);
      res.status(500).json({
        success: false,
        error: { code: 'FETCH_ERROR', message: error.message }
      });
    }
  }
}

// Export singleton instance
const projectController = new ProjectController();

module.exports = {
  create: projectController.create.bind(projectController),
  list: projectController.list.bind(projectController),
  getById: projectController.getById.bind(projectController),
  update: projectController.update.bind(projectController),
  delete: projectController.delete.bind(projectController),
  getStats: projectController.getStats.bind(projectController),
  getMembers: projectController.getMembers.bind(projectController),
  addMember: projectController.addMember.bind(projectController),
  updateMember: projectController.updateMember.bind(projectController),
  removeMember: projectController.removeMember.bind(projectController),
  getMilestones: projectController.getMilestones.bind(projectController),
  addMilestone: projectController.addMilestone.bind(projectController),
  updateMilestone: projectController.updateMilestone.bind(projectController),
  getModules: projectController.getModules.bind(projectController),
  enableModule: projectController.enableModule.bind(projectController),
  disableModule: projectController.disableModule.bind(projectController),
  getActivity: projectController.getActivity.bind(projectController)
};
