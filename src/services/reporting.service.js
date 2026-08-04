/**
 * Reporting Service
 * Centralized reporting, KPIs, dashboards with Elasticsearch integration
 */

const { pool } = require('../config/database');
const { getElasticsearchService } = require('../infrastructure/search/elasticsearch.service');

class ReportingService {
  constructor() {
    this.pool = pool;
  }

  // ============================================================================
  // EXECUTIVE DASHBOARD
  // ============================================================================

  async getExecutiveDashboard(tenantId) {
    const [capa, training, documents, suppliers] = await Promise.all([
      this._getCapaMetrics(tenantId),
      this._getTrainingMetrics(tenantId),
      this._getDocumentMetrics(tenantId),
      this._getSupplierMetrics(tenantId)
    ]);

    return {
      generated_at: new Date().toISOString(),
      tenant_id: tenantId,
      capa,
      training,
      documents,
      suppliers,
      health_score: this._calculateHealthScore({ capa, training, documents, suppliers })
    };
  }

  async _getCapaMetrics(tenantId) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled')) as open,
         COUNT(*) FILTER (WHERE status NOT IN ('closed', 'cancelled') AND target_date < NOW()) as overdue,
         COUNT(*) FILTER (WHERE priority = 'critical' AND status NOT IN ('closed', 'cancelled')) as critical,
         COUNT(*) FILTER (WHERE status = 'closed' AND closed_date > NOW() - INTERVAL '30 days') as closed_30d,
         COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_30d
       FROM capas WHERE tenant_id = $1`,
      [tenantId]
    );

    const row = result.rows[0];
    const open = parseInt(row.open) || 0;
    const overdue = parseInt(row.overdue) || 0;

    return {
      open: open,
      overdue: overdue,
      critical: parseInt(row.critical) || 0,
      closed_30d: parseInt(row.closed_30d) || 0,
      new_30d: parseInt(row.new_30d) || 0,
      avg_days_to_close: 0,
      on_time_rate: open > 0 ? Math.round((1 - overdue / open) * 100) : 100
    };
  }

  async _getTrainingMetrics(tenantId) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total_assignments,
         COUNT(*) FILTER (WHERE status = 'completed') as completed,
         COUNT(*) FILTER (WHERE status = 'overdue' OR (status IN ('assigned', 'in_progress') AND due_date < NOW())) as overdue,
         COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress
       FROM training_assignments WHERE tenant_id = $1`,
      [tenantId]
    );

    const row = result.rows[0];
    const total = parseInt(row.total_assignments) || 0;
    const completed = parseInt(row.completed) || 0;

    return {
      total_assignments: total,
      completed: completed,
      in_progress: parseInt(row.in_progress) || 0,
      overdue: parseInt(row.overdue) || 0,
      compliance_rate: total > 0 ? Math.round((completed / total) * 100) : 100
    };
  }

  async _getDocumentMetrics(tenantId) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'effective') as effective,
         COUNT(*) FILTER (WHERE status = 'draft') as draft,
         COUNT(*) FILTER (WHERE status = 'in_review') as in_review,
         COUNT(*) FILTER (WHERE next_review_date < NOW() AND status = 'effective') as review_overdue,
         COUNT(*) FILTER (WHERE next_review_date BETWEEN NOW() AND NOW() + INTERVAL '30 days' AND status = 'effective') as review_upcoming
       FROM documents WHERE tenant_id = $1`,
      [tenantId]
    );

    const row = result.rows[0];
    const effective = parseInt(row.effective) || 0;
    const reviewOverdue = parseInt(row.review_overdue) || 0;

    return {
      total: parseInt(row.total) || 0,
      effective: effective,
      draft: parseInt(row.draft) || 0,
      in_review: parseInt(row.in_review) || 0,
      review_overdue: reviewOverdue,
      review_upcoming: parseInt(row.review_upcoming) || 0,
      currency_rate: effective > 0 ? Math.round(((effective - reviewOverdue) / effective) * 100) : 100
    };
  }

  async _getSupplierMetrics(tenantId) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) as total,
         COUNT(*) FILTER (WHERE status = 'approved') as approved,
         COUNT(*) FILTER (WHERE status = 'pending') as pending,
         COUNT(*) FILTER (WHERE status = 'suspended') as suspended,
         COUNT(*) FILTER (WHERE status = 'approved' AND expiry_date < NOW() + INTERVAL '30 days') as expiring_soon
       FROM suppliers WHERE tenant_id = $1`,
      [tenantId]
    );

    // Get average score separately
    const scoreResult = await this.pool.query(
      `SELECT ROUND(AVG(current_score)::numeric, 1) as avg_score 
       FROM suppliers WHERE tenant_id = $1 AND current_score IS NOT NULL`,
      [tenantId]
    );

    const row = result.rows[0];
    return {
      total: parseInt(row.total) || 0,
      approved: parseInt(row.approved) || 0,
      pending: parseInt(row.pending) || 0,
      suspended: parseInt(row.suspended) || 0,
      expiring_soon: parseInt(row.expiring_soon) || 0,
      avg_score: parseFloat(scoreResult.rows[0]?.avg_score) || 0
    };
  }

  _calculateHealthScore(metrics) {
    let score = 100;

    score -= metrics.capa.overdue * 5;
    score -= metrics.capa.critical * 3;

    if (metrics.training.compliance_rate < 95) {
      score -= (95 - metrics.training.compliance_rate);
    }

    score -= metrics.documents.review_overdue * 2;
    score -= metrics.suppliers.suspended * 3;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  // ============================================================================
  // KPIs
  // ============================================================================

  async getKPIs(tenantId) {
    const result = await this.pool.query(
      `SELECT * FROM kpi_definitions WHERE tenant_id = $1 AND is_active = TRUE ORDER BY module, name`,
      [tenantId]
    );

    const kpis = [];
    for (const kpi of result.rows) {
      const value = await this._calculateKPIValue(tenantId, kpi);
      kpis.push({
        id: kpi.id,
        code: kpi.code,
        name: kpi.name,
        description: kpi.description,
        module: kpi.module,
        value: value,
        target: kpi.target_value ? parseFloat(kpi.target_value) : null,
        unit: kpi.unit,
        status: this._getKPIStatus(value, kpi)
      });
    }

    return kpis;
  }

  async _calculateKPIValue(tenantId, kpi) {
    try {
      switch (kpi.code) {
        case 'capa_open_count':
          return (await this._getCapaMetrics(tenantId)).open;
        case 'capa_overdue_count':
          return (await this._getCapaMetrics(tenantId)).overdue;
        case 'capa_ontime_rate':
          return (await this._getCapaMetrics(tenantId)).on_time_rate;
        case 'training_compliance':
          return (await this._getTrainingMetrics(tenantId)).compliance_rate;
        case 'training_overdue_count':
          return (await this._getTrainingMetrics(tenantId)).overdue;
        case 'docs_due_review':
          return (await this._getDocumentMetrics(tenantId)).review_overdue;
        case 'docs_currency_rate':
          return (await this._getDocumentMetrics(tenantId)).currency_rate;
        case 'supplier_approved_count':
          return (await this._getSupplierMetrics(tenantId)).approved;
        case 'supplier_avg_score':
          return (await this._getSupplierMetrics(tenantId)).avg_score;
        case 'supplier_expiring':
          return (await this._getSupplierMetrics(tenantId)).expiring_soon;
        default:
          return 0;
      }
    } catch (error) {
      console.error('[Reporting] KPI calculation error:', kpi.code, error.message);
      return 0;
    }
  }

  _getKPIStatus(value, kpi) {
    if (!kpi.target_value) return 'neutral';

    const target = parseFloat(kpi.target_value);

    if (kpi.target_direction === 'higher_better') {
      if (value >= target) return 'on_target';
      return 'warning';
    } else if (kpi.target_direction === 'lower_better') {
      if (value <= target) return 'on_target';
      return 'warning';
    }

    return 'neutral';
  }

  // ============================================================================
  // TREND DATA
  // ============================================================================

  async getTrends(tenantId, options = {}) {
    const { period = 'monthly', months = 6 } = options;

    const trends = { period, data: [] };

    for (let i = months - 1; i >= 0; i--) {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - i);
      startDate.setDate(1);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(0);
      endDate.setHours(23, 59, 59, 999);

      const [capas, training] = await Promise.all([
        this._getCapaTrend(tenantId, startDate, endDate),
        this._getTrainingTrend(tenantId, startDate, endDate)
      ]);

      trends.data.push({
        period: startDate.toISOString().slice(0, 7),
        capas_opened: capas.opened,
        capas_closed: capas.closed,
        training_completed: training.completed,
        training_assigned: training.assigned
      });
    }

    return trends;
  }

  async _getCapaTrend(tenantId, startDate, endDate) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at BETWEEN $2 AND $3) as opened,
         COUNT(*) FILTER (WHERE closed_date BETWEEN $2 AND $3) as closed
       FROM capas WHERE tenant_id = $1`,
      [tenantId, startDate, endDate]
    );
    return {
      opened: parseInt(result.rows[0].opened) || 0,
      closed: parseInt(result.rows[0].closed) || 0
    };
  }

  async _getTrainingTrend(tenantId, startDate, endDate) {
    const result = await this.pool.query(
      `SELECT
         COUNT(*) FILTER (WHERE created_at BETWEEN $2 AND $3) as assigned,
         COUNT(*) FILTER (WHERE completed_at BETWEEN $2 AND $3) as completed
       FROM training_assignments WHERE tenant_id = $1`,
      [tenantId, startDate, endDate]
    );
    return {
      assigned: parseInt(result.rows[0].assigned) || 0,
      completed: parseInt(result.rows[0].completed) || 0
    };
  }

  // ============================================================================
  // REPORTS
  // ============================================================================

  async getReportDefinitions(tenantId) {
    const result = await this.pool.query(
      `SELECT * FROM report_definitions WHERE tenant_id = $1 AND is_active = TRUE ORDER BY category, name`,
      [tenantId]
    );
    return result.rows;
  }

  async getReportById(id, tenantId) {
    const result = await this.pool.query(
      'SELECT * FROM report_definitions WHERE id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    return result.rows[0] || null;
  }

  async executeReport(reportId, tenantId, parameters = {}, executedBy) {
    const report = await this.getReportById(reportId, tenantId);
    if (!report) throw new Error('Report not found');

    const startTime = Date.now();
    let data;

    switch (report.code) {
      case 'exec_dashboard':
        data = await this.getExecutiveDashboard(tenantId);
        break;
      case 'capa_summary':
        data = await this._getCapaSummaryReport(tenantId);
        break;
      case 'training_compliance':
        data = await this._getTrainingComplianceReport(tenantId);
        break;
      case 'supplier_scorecard':
        data = await this._getSupplierScorecardReport(tenantId);
        break;
      case 'doc_review_status':
        data = await this._getDocReviewStatusReport(tenantId);
        break;
      case 'monthly_quality':
        data = await this.getTrends(tenantId, { period: 'monthly', months: 12 });
        break;
      default:
        throw new Error('Unknown report type');
    }

    await this.pool.query(
      `INSERT INTO report_history (tenant_id, report_definition_id, report_name, executed_by, parameters, status, row_count, execution_time_ms)
       VALUES ($1, $2, $3, $4, $5, 'completed', $6, $7)`,
      [tenantId, reportId, report.name, executedBy, JSON.stringify(parameters),
        Array.isArray(data) ? data.length : 1, Date.now() - startTime]
    );

    return { report: report.name, generated_at: new Date().toISOString(), data };
  }

  async _getCapaSummaryReport(tenantId) {
    const result = await this.pool.query(
      `SELECT status, capa_type, priority, COUNT(*) as count
       FROM capas WHERE tenant_id = $1
       GROUP BY status, capa_type, priority
       ORDER BY status, capa_type`,
      [tenantId]
    );
    return result.rows;
  }

  async _getTrainingComplianceReport(tenantId) {
    const result = await this.pool.query(
      `SELECT 
         tc.title as course,
         COUNT(*) as total_assigned,
         COUNT(*) FILTER (WHERE ta.status = 'completed') as completed
       FROM training_assignments ta
       JOIN training_courses tc ON ta.course_id = tc.id
       WHERE ta.tenant_id = $1
       GROUP BY tc.title
       ORDER BY tc.title`,
      [tenantId]
    );
    return result.rows.map(r => ({
      ...r,
      compliance_rate: r.total_assigned > 0 ? Math.round((r.completed / r.total_assigned) * 100) : 0
    }));
  }

  async _getSupplierScorecardReport(tenantId) {
    const result = await this.pool.query(
      `SELECT category, score_grade, COUNT(*) as count
       FROM suppliers WHERE tenant_id = $1 AND status = 'approved'
       GROUP BY category, score_grade
       ORDER BY category, score_grade`,
      [tenantId]
    );
    return result.rows;
  }

  async _getDocReviewStatusReport(tenantId) {
    const result = await this.pool.query(
      `SELECT document_number, title, status, next_review_date,
              CASE 
                WHEN next_review_date < NOW() THEN 'overdue'
                WHEN next_review_date < NOW() + INTERVAL '30 days' THEN 'upcoming'
                ELSE 'current'
              END as review_status
       FROM documents 
       WHERE tenant_id = $1 AND status = 'effective'
       ORDER BY next_review_date NULLS LAST`,
      [tenantId]
    );
    return result.rows;
  }

  // ============================================================================
  // GLOBAL SEARCH
  // ============================================================================

  async globalSearch(query, tenantId, options = {}) {
    const es = getElasticsearchService();

    if (es.isConnected) {
      try {
        const esResult = await es.globalSearch(query, tenantId, options);
        // If ES returned results, use them
        if (esResult && esResult.total > 0) {
          return esResult;
        }
        // ES is connected but indices are empty (not yet indexed) → fall through to Postgres
        console.log('[Reporting] ES returned 0 results – falling back to PostgreSQL search');
      } catch (error) {
        // ES search threw – fall through to Postgres
        console.error('[Reporting] ES globalSearch error, falling back to PostgreSQL:', error.message);
      }
    }

    return this._postgresSearch(query, tenantId, options);
  }

  async _postgresSearch(query, tenantId, options = {}) {
    const { limit = 20 } = options;
    const searchTerm = `%${query}%`;

    const results = [];

    const capas = await this.pool.query(
      `SELECT id, 'capa' as type, capa_number as number, title, status
       FROM capas WHERE tenant_id = $1 AND (title ILIKE $2 OR capa_number ILIKE $2)
       LIMIT $3`,
      [tenantId, searchTerm, limit]
    );
    results.push(...capas.rows);

    const docs = await this.pool.query(
      `SELECT id, 'document' as type, document_number as number, title, status
       FROM documents WHERE tenant_id = $1 AND (title ILIKE $2 OR document_number ILIKE $2)
       LIMIT $3`,
      [tenantId, searchTerm, limit]
    );
    results.push(...docs.rows);

    const suppliers = await this.pool.query(
      `SELECT id, 'supplier' as type, supplier_code as number, name as title, status
       FROM suppliers WHERE tenant_id = $1 AND (name ILIKE $2 OR supplier_code ILIKE $2)
       LIMIT $3`,
      [tenantId, searchTerm, limit]
    );
    results.push(...suppliers.rows);

    // Training courses (was missing from original implementation)
    const training = await this.pool.query(
      `SELECT id, 'training' as type, course_code as number, title, status
       FROM training_courses WHERE tenant_id = $1 AND (title ILIKE $2 OR course_code ILIKE $2)
       LIMIT $3`,
      [tenantId, searchTerm, limit]
    );
    results.push(...training.rows);

    return { results, total: results.length };
  }
}

let instance = null;
const getReportingService = () => {
  if (!instance) instance = new ReportingService();
  return instance;
};

module.exports = { ReportingService, getReportingService };
