// /**
//  * Scheduled Reports & Export Routes
//  */

// const express = require('express');
// const router = express.Router();
// const controller = require('../controllers/scheduled-reports.controller');
// const { authenticate, authorize } = require('../middleware/auth.middleware');

// router.use(authenticate);

// // ============================================================================
// // SCHEDULED REPORTS
// // ============================================================================

// router.get('/scheduled', authorize('reports:read'), controller.list);
// router.post('/scheduled', authorize('reports:write'), controller.create);
// router.get('/scheduled/:id', authorize('reports:read'), controller.getById);
// router.put('/scheduled/:id', authorize('reports:write'), controller.update);
// router.delete('/scheduled/:id', authorize('reports:write'), controller.delete);
// router.post('/scheduled/:id/run', authorize('reports:write'), controller.runNow);

// // ============================================================================
// // EXPORT ENDPOINTS
// // ============================================================================

// // Export specific report
// router.post('/reports/:id/export/pdf', authorize('reports:read'), controller.exportReportToPDF);
// router.post('/reports/:id/export/excel', authorize('reports:read'), controller.exportReportToExcel);

// // Export dashboard
// router.get('/dashboard/export/pdf', authorize('reports:read'), controller.exportDashboardToPDF);
// router.get('/dashboard/export/excel', authorize('reports:read'), controller.exportDashboardToExcel);

// // Manage exports
// router.get('/exports', authorize('reports:read'), controller.listExports);
// router.get('/exports/download/:filename', authorize('reports:read'), controller.downloadExport);
// router.delete('/exports/:filename', authorize('reports:write'), controller.deleteExport);

// module.exports = router;
