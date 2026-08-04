/**
 * Training Routes
 * Training management endpoints
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/training.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
// Platform service guard — blocks access if 'training' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('training'));

// ============================================================================
// STATIC ROUTES
// ============================================================================

router.get('/types', controller.getCourseTypes);
router.get('/categories', controller.getCategories);
router.get('/statuses', controller.getStatuses);
router.get('/dashboard', controller.getDashboard);
router.get('/expiring-certifications', authorize('training:read'), controller.getExpiringCertifications);

// ============================================================================
// MY TRAINING (Current user)
// ============================================================================

router.get('/my/assignments', controller.getMyAssignments);
router.get('/my/records', controller.getMyRecords);

// ============================================================================
// COURSES
// ============================================================================

router.post('/courses', authorize('training:create'), controller.createCourse);
router.get('/courses', authorize('training:read'), controller.listCourses);
router.get('/courses/:id', authorize('training:read'), controller.getCourse);
router.put('/courses/:id', authorize('training:create'), controller.updateCourse);

// ============================================================================
// ASSIGNMENTS
// ============================================================================

router.post('/assignments', authorize('training:create'), controller.assignTraining);
router.get('/assignments/:id', authorize('training:read'), controller.getAssignment);
router.post('/assignments/:id/start', authorize('training:create'), controller.startTraining);
router.post('/assignments/:id/complete', authorize('training:create'), controller.completeTraining);

// ============================================================================
// COMPETENCIES
// ============================================================================

router.post('/competencies', authorize('training:create'), controller.createCompetencyDefinition);
router.get('/competencies', authorize('training:read'), controller.getCompetencyMatrix);
router.put('/competencies/:user_id/:competency_id', authorize('training:create'), controller.updateUserCompetency);

module.exports = router;
