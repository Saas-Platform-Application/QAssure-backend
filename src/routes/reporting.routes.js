/**
 * Reporting Routes
 * Reporting, analytics, dashboards, and search endpoints
 */

const express = require('express');
const router = express.Router();
const controller = require('../controllers/reporting.controller');
const scheduledController = require('../controllers/scheduled-reports.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

router.use(authenticate);
// Platform service guard — blocks access if 'reporting' service is disabled for this tenant
const { serviceEnabled } = require('../middleware/service.middleware');
router.use(serviceEnabled('reporting'));

// ============================================================================
// DASHBOARDS
// ============================================================================

router.get('/dashboard', authorize('reports:read'), controller.getExecutiveDashboard);
router.get('/kpis', authorize('reports:read'), controller.getKPIs);
router.get('/trends', authorize('reports:read'), controller.getTrends);

// ============================================================================
// REPORTS
// ============================================================================

router.get('/reports', authorize('reports:read'), controller.listReports);
router.get('/reports/:id', authorize('reports:read'), controller.getReport);
router.post('/reports/:id/execute', authorize('reports:read'), controller.executeReport);

// ============================================================================
// GLOBAL SEARCH
// ============================================================================

router.get('/search', authorize('reports:read'), controller.globalSearch);

// ============================================================================
// ELASTICSEARCH ADMIN
// ============================================================================

router.get('/search/health', authorize('reports:read'), controller.getSearchHealth);
router.post('/search/reindex/:module', authorize('reports:write'), controller.reindexModule);

// ============================================================================
// AUDIT LOGS
// ============================================================================

router.get('/audit-logs', authorize('audit_logs:read'), controller.getAuditLogs);


// ============================================================================
// SCHEDULED REPORTS
// ============================================================================

router.get('/scheduled', authorize('reports:read'), scheduledController.list);
router.post('/scheduled', authorize('reports:write'), scheduledController.create);
router.get('/scheduled/:id', authorize('reports:read'), scheduledController.getById);
router.put('/scheduled/:id', authorize('reports:write'), scheduledController.update);
router.delete('/scheduled/:id', authorize('reports:write'), scheduledController.delete);
router.post('/scheduled/:id/run', authorize('reports:write'), scheduledController.runNow);

// ============================================================================
// EXPORT ENDPOINTS
// ============================================================================

router.post('/reports/:id/export/pdf', authorize('reports:read'), scheduledController.exportReportToPDF);
router.post('/reports/:id/export/excel', authorize('reports:read'), scheduledController.exportReportToExcel);
router.get('/dashboard/export/pdf', authorize('reports:read'), scheduledController.exportDashboardToPDF);
router.get('/dashboard/export/excel', authorize('reports:read'), scheduledController.exportDashboardToExcel);
router.get('/exports', authorize('reports:read'), scheduledController.listExports);
router.get('/exports/download/:filename', authorize('reports:read'), scheduledController.downloadExport);
router.delete('/exports/cleanup', authorize('reports:write'), scheduledController.cleanupExports.bind(scheduledController));
router.delete('/exports/:filename', authorize('reports:write'), scheduledController.deleteExport);
module.exports = router;
