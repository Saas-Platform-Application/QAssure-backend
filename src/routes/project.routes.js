/**
 * Project Routes
 * API endpoints for project management
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/project.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

// All routes require authentication
router.use(authenticate);
// Platform service guard — blocks access if 'project' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('project'));

// ============================================================================
// PROJECT CRUD
// ============================================================================

/**
 * @route   POST /api/v1/projects
 * @desc    Create a new project
 * @access  projects:create
 */
router.post('/', authorize('projects:create'), controller.create);

/**
 * @route   GET /api/v1/projects
 * @desc    List projects (with optional filters)
 * @query   status, project_type, owner_id, search, my_projects, limit, offset, sort_by, sort_order
 * @access  projects:read
 */
router.get('/', authorize('projects:read'), controller.list);

/**
 * @route   GET /api/v1/projects/:id
 * @desc    Get project by ID with full details
 * @access  projects:read
 */
router.get('/:id', authorize('projects:read'), controller.getById);

/**
 * @route   PUT /api/v1/projects/:id
 * @desc    Update project
 * @access  projects:create
 */
router.put('/:id', authorize('projects:create'), controller.update);

/**
 * @route   DELETE /api/v1/projects/:id
 * @desc    Archive project (soft delete)
 * @access  projects:delete
 */
router.delete('/:id', authorize('projects:delete'), controller.delete);

/**
 * @route   GET /api/v1/projects/:id/stats
 * @desc    Get project statistics
 * @access  projects:read
 */
router.get('/:id/stats', authorize('projects:read'), controller.getStats);

// ============================================================================
// PROJECT MEMBERS
// ============================================================================

/**
 * @route   GET /api/v1/projects/:id/members
 * @desc    Get project members
 * @access  projects:read
 */
router.get('/:id/members', authorize('projects:read'), controller.getMembers);

/**
 * @route   POST /api/v1/projects/:id/members
 * @desc    Add member to project
 * @body    { user_id, role, permissions }
 * @access  projects:manage_members
 */
router.post('/:id/members', authorize('projects:create'), controller.addMember);

/**
 * @route   PUT /api/v1/projects/:id/members/:memberId
 * @desc    Update member role/permissions
 * @access  projects:manage_members
 */
router.put('/:id/members/:memberId', authorize('projects:create'), controller.updateMember);

/**
 * @route   DELETE /api/v1/projects/:id/members/:memberId
 * @desc    Remove member from project
 * @access  projects:manage_members
 */
router.delete('/:id/members/:memberId', authorize('projects:create'), controller.removeMember);

// ============================================================================
// PROJECT MILESTONES
// ============================================================================

/**
 * @route   GET /api/v1/projects/:id/milestones
 * @desc    Get project milestones
 * @access  projects:read
 */
router.get('/:id/milestones', authorize('projects:read'), controller.getMilestones);

/**
 * @route   POST /api/v1/projects/:id/milestones
 * @desc    Add milestone to project
 * @body    { name, description, milestone_type, planned_date, sequence, owner_id }
 * @access  projects:create
 */
router.post('/:id/milestones', authorize('projects:create'), controller.addMilestone);

/**
 * @route   PUT /api/v1/projects/:id/milestones/:milestoneId
 * @desc    Update milestone
 * @access  projects:create
 */
router.put('/:id/milestones/:milestoneId', authorize('projects:create'), controller.updateMilestone);

// ============================================================================
// PROJECT MODULES
// ============================================================================

/**
 * @route   GET /api/v1/projects/:id/modules
 * @desc    Get enabled modules for project
 * @access  projects:read
 */
router.get('/:id/modules', authorize('projects:read'), controller.getModules);

/**
 * @route   POST /api/v1/projects/:id/modules/:moduleCode/enable
 * @desc    Enable module for project
 * @access  projects:create
 */
router.post('/:id/modules/:moduleCode/enable', authorize('projects:create'), controller.enableModule);

/**
 * @route   POST /api/v1/projects/:id/modules/:moduleCode/disable
 * @desc    Disable module for project
 * @access  projects:create
 */
router.post('/:id/modules/:moduleCode/disable', authorize('projects:create'), controller.disableModule);

// ============================================================================
// PROJECT ACTIVITY
// ============================================================================

/**
 * @route   GET /api/v1/projects/:id/activity
 * @desc    Get project activity log
 * @query   limit, offset, activity_type
 * @access  projects:read
 */
router.get('/:id/activity', authorize('projects:read'), controller.getActivity);

module.exports = router;
