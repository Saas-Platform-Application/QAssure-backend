/**
 * Reporting Controller
 * Handles reporting, analytics, and search API endpoints
 */

const { getReportingService } = require('../services/reporting.service');
const { getElasticsearchService } = require('../infrastructure/search/elasticsearch.service');

class ReportingController {

  // ============================================================================
  // EXECUTIVE DASHBOARD
  // ============================================================================

  async getExecutiveDashboard(req, res) {
    try {
      const service = getReportingService();
      const tenantId = req.user.tenantId;

      const dashboard = await service.getExecutiveDashboard(tenantId);
      res.json({ success: true, data: dashboard });
    } catch (error) {
      console.error('[Reporting] Dashboard error:', error.message);
      res.status(500).json({ success: false, error: { code: 'DASHBOARD_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // KPIs
  // ============================================================================

  async getKPIs(req, res) {
    try {
      const service = getReportingService();
      const tenantId = req.user.tenantId;

      const kpis = await service.getKPIs(tenantId);
      res.json({ success: true, data: kpis });
    } catch (error) {
      console.error('[Reporting] KPIs error:', error.message);
      res.status(500).json({ success: false, error: { code: 'KPI_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // TRENDS
  // ============================================================================

  async getTrends(req, res) {
    try {
      const service = getReportingService();
      const tenantId = req.user.tenantId;
      const { period, months } = req.query;

      const trends = await service.getTrends(tenantId, {
        period: period || 'monthly',
        months: parseInt(months) || 6
      });
      res.json({ success: true, data: trends });
    } catch (error) {
      console.error('[Reporting] Trends error:', error.message);
      res.status(500).json({ success: false, error: { code: 'TRENDS_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // REPORTS
  // ============================================================================

  async listReports(req, res) {
    try {
      const service = getReportingService();
      const tenantId = req.user.tenantId;

      const reports = await service.getReportDefinitions(tenantId);
      res.json({ success: true, data: reports });
    } catch (error) {
      console.error('[Reporting] List reports error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async getReport(req, res) {
    try {
      const service = getReportingService();
      const tenantId = req.user.tenantId;
      const { id } = req.params;

      const report = await service.getReportById(id, tenantId);
      if (!report) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Report not found' } });
      }

      res.json({ success: true, data: report });
    } catch (error) {
      console.error('[Reporting] Get report error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }

  async executeReport(req, res) {
    try {
      const service = getReportingService();
      const tenantId = req.user.tenantId;
      const executedBy = req.user.id;
      const { id } = req.params;
      const parameters = req.body;

      const result = await service.executeReport(id, tenantId, parameters, executedBy);
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[Reporting] Execute report error:', error.message);
      res.status(500).json({ success: false, error: { code: 'EXECUTE_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // GLOBAL SEARCH
  // ============================================================================

  async globalSearch(req, res) {
    try {
      const service = getReportingService();
      const tenantId = req.user.tenantId;
      const { q, limit } = req.query;

      if (!q || q.trim().length < 2) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Search query must be at least 2 characters' }
        });
      }

      const results = await service.globalSearch(q.trim(), tenantId, {
        limit: parseInt(limit) || 20
      });

      res.json({ success: true, data: results });
    } catch (error) {
      console.error('[Reporting] Search error:', error.message);
      res.status(500).json({ success: false, error: { code: 'SEARCH_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // ELASTICSEARCH HEALTH
  // ============================================================================

  async getSearchHealth(req, res) {
    try {
      const es = getElasticsearchService();
      const health = await es.healthCheck();
      res.json({ success: true, data: health });
    } catch (error) {
      console.error('[Reporting] Search health error:', error.message);
      res.status(500).json({ success: false, error: { code: 'HEALTH_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // INDEX MANAGEMENT
  // ============================================================================

  async reindexModule(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const { module } = req.params;

      const validModules = ['documents', 'capas', 'training', 'suppliers', 'audit-logs'];
      if (!validModules.includes(module)) {
        return res.status(400).json({
          success: false,
          error: { code: 'VALIDATION_ERROR', message: 'Invalid module. Must be: ' + validModules.join(', ') }
        });
      }

      const es = getElasticsearchService();
      if (!es.isConnected) {
        return res.status(503).json({
          success: false,
          error: { code: 'SERVICE_UNAVAILABLE', message: 'Elasticsearch is not connected' }
        });
      }

      // Get data from PostgreSQL
      const { pool } = require('../config/database');
      let query, indexType;

      switch (module) {
        case 'capas':
          query = 'SELECT id, capa_number, title, description, problem_statement, capa_type, priority, status FROM capas WHERE tenant_id = $1';
          indexType = 'capas';
          break;
        case 'documents':
          query = 'SELECT id, document_number, title, description, document_type as category, status FROM documents WHERE tenant_id = $1';
          indexType = 'documents';
          break;
        case 'suppliers':
          query = 'SELECT id, supplier_code, name, supplier_type, category, status, current_score, score_grade FROM suppliers WHERE tenant_id = $1';
          indexType = 'suppliers';
          break;
        case 'training':
          query = 'SELECT id, course_code, title, description, category, status FROM training_courses WHERE tenant_id = $1';
          indexType = 'training';
          break;
        case 'audit-logs':
          query = `
            SELECT 
              al.id, al.action, al.user_id, al.tenant_id, 
              al.resource_type, al.resource_id, al.module_id, 
              al.request_method, al.request_path, al.response_status, 
              al.changes, al.metadata, al.ip_address, al.user_agent, 
              al.correlation_id, al.created_at,
              u.email as user_email
            FROM audit_logs al
            LEFT JOIN users u ON u.id = al.user_id
            WHERE al.tenant_id = $1
          `;
          indexType = 'audit-logs';
          break;
      }

      const result = await pool.query(query, [tenantId]);
      
      if (result.rows.length > 0) {
        if (module === 'audit-logs') {
          // Map to ES schema
          const mappedLogs = result.rows.map(log => ({
            id: log.id,
            user_id: log.user_id,
            user_email: log.user_email || null,
            action: log.action,
            entity_type: log.resource_type,
            entity_id: log.resource_id,
            entity_name: log.metadata?.resource_name || null,
            changes: log.changes,
            ip_address: log.ip_address && log.ip_address.includes(':') ? null : log.ip_address,
            timestamp: log.created_at || new Date().toISOString()
          }));
          await es.bulkIndex(indexType, mappedLogs, tenantId);
        } else {
          await es.bulkIndex(indexType, result.rows, tenantId);
        }
      }

      res.json({
        success: true,
        data: {
          module,
          indexed_count: result.rows.length,
          message: `Successfully indexed ${result.rows.length} ${module}`
        }
      });
    } catch (error) {
      console.error('[Reporting] Reindex error:', error.message);
      res.status(500).json({ success: false, error: { code: 'REINDEX_ERROR', message: error.message } });
    }
  }

  // ============================================================================
  // AUDIT LOGS
  // ============================================================================

  async getAuditLogs(req, res) {
    try {
      const tenantId = req.user.tenantId;
      const { user_id, action, entity_type, start_date, end_date, page, limit } = req.query;

      const es = getElasticsearchService();
      
      if (es.isConnected) {
        const results = await es.searchAuditLogs(tenantId, {
          userId: user_id,
          action,
          entityType: entity_type,
          startDate: start_date,
          endDate: end_date,
          page: parseInt(page) || 1,
          limit: parseInt(limit) || 50
        });
        return res.json({ success: true, data: results });
      }

      // Fallback to PostgreSQL audit_logs table
      const { pool } = require('../config/database');
      const result = await pool.query(
        `SELECT * FROM audit_logs WHERE tenant_id = $1 ORDER BY created_at DESC LIMIT $2`,
        [tenantId, parseInt(limit) || 50]
      );

      res.json({ success: true, data: { hits: result.rows, total: result.rows.length } });
    } catch (error) {
      console.error('[Reporting] Audit logs error:', error.message);
      res.status(500).json({ success: false, error: { code: 'FETCH_ERROR', message: error.message } });
    }
  }
}

module.exports = new ReportingController();
