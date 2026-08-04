/**
 * Scheduled Reports Controller
 * Handles scheduled reports and export API endpoints
 * 
 * Changes from original:
 * - All exports are tenant-isolated (exports/{tenant_id}/)
 * - All exports tracked in report_history with output_path
 * - listExports/downloadExport/deleteExport are tenant-scoped
 * - Cleanup endpoint for admin use
 */

const { getScheduledReportsService } = require('../services/scheduled-reports.service');
const { getExportService } = require('../services/export.service');
const { getReportingService } = require('../services/reporting.service');
const path = require('path');
const fs = require('fs');

class ScheduledReportsController {

  // ============================================================================
  // SCHEDULED REPORTS CRUD
  // ============================================================================

  async create(req, res) {
    try {
      const service = getScheduledReportsService();
      const tenantId = req.user.tenantId;
      const createdBy = req.user.id;

      const scheduled = await service.create(tenantId, req.body, createdBy);
      res.status(201).json({ success: true, data: scheduled });
    } catch (error) {
      console.error('[ScheduledReports] Create error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CREATE_ERROR', message: error.message } });
    }
  }

  async list(req, res) {
    try {
      const service = getScheduledReportsService();
      const tenantId = req.user.tenantId;
      const { is_active, limit, offset } = req.query;

      const reports = await service.list(tenantId, {
        is_active: is_active !== undefined ? is_active === 'true' : undefined,
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });

      res.json({ success: true, data: reports });
    } catch (error) {
      console.error('[ScheduledReports] List error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getById(req, res) {
    try {
      const service = getScheduledReportsService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const scheduled = await service.getById(id, tenantId);
      if (!scheduled) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Scheduled report not found' } });
      }

      res.json({ success: true, data: scheduled });
    } catch (error) {
      console.error('[ScheduledReports] Get error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async update(req, res) {
    try {
      const service = getScheduledReportsService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const scheduled = await service.update(id, tenantId, req.body);
      if (!scheduled) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Scheduled report not found' } });
      }

      res.json({ success: true, data: scheduled });
    } catch (error) {
      console.error('[ScheduledReports] Update error:', error.message);
      res.status(500).json({ success: false, error: { code: 'UPDATE_ERROR', message: error.message } });
    }
  }

  async delete(req, res) {
    try {
      const service = getScheduledReportsService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const deleted = await service.delete(id, tenantId);
      if (!deleted) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Scheduled report not found' } });
      }

      res.json({ success: true, data: { message: 'Scheduled report deleted' } });
    } catch (error) {
      console.error('[ScheduledReports] Delete error:', error.message);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
    }
  }

  async runNow(req, res) {
    try {
      const service = getScheduledReportsService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const result = await service.runNow(id, tenantId);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[ScheduledReports] RunNow error:', error.message);
      res.status(500).json({ success: false, error: { code: 'EXECUTE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // EXPORT ENDPOINTS (now with tenant isolation + DB tracking)
  // ============================================================================

  async exportReportToPDF(req, res) {
    try {
      const reportingService = getReportingService();
      const exportService = getExportService();
      const tenantId = req.user.tenantId;
      const executedBy = req.user.id;
      const { id } = req.params;

      // Execute the report
      const reportData = await reportingService.executeReport(id, tenantId, req.body || {}, executedBy);
      
      // Export to tenant-isolated directory + track in DB
      const result = await exportService.exportAndTrack(reportData, 'pdf', tenantId, {
        reportDefinitionId: id,
        executedBy,
        reportName: reportData.report
      });

      // Send file
      res.download(result.filePath, result.filename, (err) => {
        if (err && !res.headersSent) {
          console.error('[Export] Download error:', err.message);
          res.status(500).json({ success: false, error: { code: 'DOWNLOAD_ERROR', message: err.message } });
        }
      });
    } catch (error) {
      console.error('[Export] PDF error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
      }
    }
  }

  async exportReportToExcel(req, res) {
    try {
      const reportingService = getReportingService();
      const exportService = getExportService();
      const tenantId = req.user.tenantId;
      const executedBy = req.user.id;
      const { id } = req.params;

      // Execute the report
      const reportData = await reportingService.executeReport(id, tenantId, req.body || {}, executedBy);
      
      // Export to tenant-isolated directory + track in DB
      const result = await exportService.exportAndTrack(reportData, 'excel', tenantId, {
        reportDefinitionId: id,
        executedBy,
        reportName: reportData.report
      });

      // Send file
      res.download(result.filePath, result.filename, (err) => {
        if (err && !res.headersSent) {
          console.error('[Export] Download error:', err.message);
          res.status(500).json({ success: false, error: { code: 'DOWNLOAD_ERROR', message: err.message } });
        }
      });
    } catch (error) {
      console.error('[Export] Excel error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
      }
    }
  }

  async exportDashboardToPDF(req, res) {
    try {
      const reportingService = getReportingService();
      const exportService = getExportService();
      const tenantId = req.user.tenantId;

      const dashboardData = await reportingService.getExecutiveDashboard(tenantId);
      
      const result = await exportService.exportAndTrack(
        { report: 'Executive Dashboard', generated_at: dashboardData.generated_at, data: dashboardData },
        'pdf',
        tenantId,
        { executedBy: req.user.id, reportName: 'Executive Dashboard' }
      );

      res.download(result.filePath, result.filename, (err) => {
        if (err && !res.headersSent) {
          console.error('[Export] Dashboard PDF error:', err.message);
        }
      });
    } catch (error) {
      console.error('[Export] Dashboard PDF error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
      }
    }
  }

  async exportDashboardToExcel(req, res) {
    try {
      const reportingService = getReportingService();
      const exportService = getExportService();
      const tenantId = req.user.tenantId;

      const dashboardData = await reportingService.getExecutiveDashboard(tenantId);
      
      const result = await exportService.exportAndTrack(
        { report: 'Executive Dashboard', generated_at: dashboardData.generated_at, data: dashboardData },
        'excel',
        tenantId,
        { executedBy: req.user.id, reportName: 'Executive Dashboard' }
      );

      res.download(result.filePath, result.filename, (err) => {
        if (err && !res.headersSent) {
          console.error('[Export] Dashboard Excel error:', err.message);
        }
      });
    } catch (error) {
      console.error('[Export] Dashboard Excel error:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ success: false, error: { code: 'EXPORT_ERROR', message: error.message } });
      }
    }
  }

  // ============================================================================
  // LIST / DOWNLOAD / DELETE EXPORTS (tenant-scoped)
  // ============================================================================

  async listExports(req, res) {
    try {
      const exportService = getExportService();
      const tenantId = req.user.tenantId;
      
      const files = exportService.listExports(tenantId);
      
      res.json({ success: true, data: files, count: files.length });
    } catch (error) {
      console.error('[Export] List error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async downloadExport(req, res) {
    try {
      const exportService = getExportService();
      const tenantId = req.user.tenantId;
      const { filename } = req.params;
      
      const filePath = exportService.getFilePath(filename, tenantId);
      
      if (!filePath) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Export file not found' } });
      }

      res.download(filePath, filename);
    } catch (error) {
      console.error('[Export] Download error:', error.message);
      res.status(500).json({ success: false, error: { code: 'DOWNLOAD_ERROR', message: error.message } });
    }
  }

  async deleteExport(req, res) {
    try {
      const exportService = getExportService();
      const tenantId = req.user.tenantId;
      const { filename } = req.params;
      
      const deleted = await exportService.deleteExport(filename, tenantId);
      
      if (!deleted) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Export file not found' } });
      }

      res.json({ success: true, data: { message: 'Export deleted' } });
    } catch (error) {
      console.error('[Export] Delete error:', error.message);
      res.status(500).json({ success: false, error: { code: 'DELETE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // ADMIN: CLEANUP
  // ============================================================================

  async cleanupExports(req, res) {
    try {
      const exportService = getExportService();
      const maxAgeDays = parseInt(req.query.max_age_days) || 30;
      
      const result = await exportService.cleanupOldExports(maxAgeDays);
      
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Export] Cleanup error:', error.message);
      res.status(500).json({ success: false, error: { code: 'CLEANUP_ERROR', message: error.message } });
    }
  }
}

module.exports = new ScheduledReportsController();