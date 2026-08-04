/**
 * Scheduled Reports Service
 * Handles scheduled report generation and delivery
 * 
 * Changes from original:
 * - _executeScheduledReport now generates export file (PDF/Excel) and saves output_path
 * - report_history records link to actual files via output_path
 * - Cleanup integration with export service
 */

const cron = require('node-cron');
const { pool } = require('../config/database');
const { getReportingService } = require('./reporting.service');
const { getExportService } = require('./export.service');

class ScheduledReportsService {
  constructor() {
    this.pool = pool;
    this.jobs = new Map();
    this.isRunning = false;
  }

  // ============================================================================
  // SCHEDULER MANAGEMENT
  // ============================================================================

  start() {
    if (this.isRunning) return;
    
    console.log('[ScheduledReports] Starting scheduler...');
    
    // Check for due reports every hour
    cron.schedule('0 * * * *', async () => {
      await this.processScheduledReports();
    });

    // Daily reports at 6 AM
    cron.schedule('0 6 * * *', async () => {
      await this._processReportsBySchedule('daily');
    });

    // Weekly reports on Monday at 6 AM
    cron.schedule('0 6 * * 1', async () => {
      await this._processReportsBySchedule('weekly');
    });

    // Monthly reports on 1st at 6 AM
    cron.schedule('0 6 1 * *', async () => {
      await this._processReportsBySchedule('monthly');
    });

    // Cleanup old exports daily at midnight
    cron.schedule('0 0 * * *', async () => {
      try {
        const exportService = getExportService();
        await exportService.cleanupOldExports(30);
      } catch (error) {
        console.error('[ScheduledReports] Cleanup error:', error.message);
      }
    });

    this.isRunning = true;
    console.log('[ScheduledReports] ✅ Scheduler started (with daily export cleanup)');
  }

  stop() {
    this.jobs.forEach(job => job.stop());
    this.jobs.clear();
    this.isRunning = false;
    console.log('[ScheduledReports] Scheduler stopped');
  }

  // ============================================================================
  // CRUD OPERATIONS
  // ============================================================================

  async create(tenantId, data, createdBy) {
    const nextRun = this._calculateNextRun(data.schedule_type, data.schedule_config);
    
    const result = await this.pool.query(
      `INSERT INTO scheduled_reports (
        tenant_id, report_definition_id, name, schedule_type, schedule_config,
        recipients, output_format, include_charts, next_run_at, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        tenantId, data.report_definition_id, data.name, data.schedule_type,
        JSON.stringify(data.schedule_config || {}), JSON.stringify(data.recipients || []),
        data.output_format || 'pdf', data.include_charts !== false, nextRun, createdBy
      ]
    );
    return this._formatScheduledReport(result.rows[0]);
  }

  async getById(id, tenantId) {
    const result = await this.pool.query(
      `SELECT sr.*, rd.name as report_name, rd.code as report_code
       FROM scheduled_reports sr
       JOIN report_definitions rd ON sr.report_definition_id = rd.id
       WHERE sr.id = $1 AND sr.tenant_id = $2`,
      [id, tenantId]
    );
    return result.rows[0] ? this._formatScheduledReport(result.rows[0]) : null;
  }

  async list(tenantId, options = {}) {
    const { is_active, limit = 50, offset = 0 } = options;
    
    let query = `
      SELECT sr.*, rd.name as report_name, rd.code as report_code
      FROM scheduled_reports sr
      JOIN report_definitions rd ON sr.report_definition_id = rd.id
      WHERE sr.tenant_id = $1
    `;
    const params = [tenantId];
    
    if (is_active !== undefined) {
      params.push(is_active);
      query += ` AND sr.is_active = $${params.length}`;
    }
    
    query += ` ORDER BY sr.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);
    
    const result = await this.pool.query(query, params);
    return result.rows.map(r => this._formatScheduledReport(r));
  }

  async update(id, tenantId, data) {
    const setClauses = [];
    const params = [id, tenantId];
    let paramIndex = 3;

    const allowedFields = ['name', 'schedule_type', 'schedule_config', 'recipients', 
                          'output_format', 'include_charts', 'is_active'];

    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        const value = ['schedule_config', 'recipients'].includes(field) 
          ? JSON.stringify(data[field]) 
          : data[field];
        setClauses.push(`${field} = $${paramIndex}`);
        params.push(value);
        paramIndex++;
      }
    }

    if (data.schedule_type || data.schedule_config) {
      const current = await this.getById(id, tenantId);
      const scheduleType = data.schedule_type || current.schedule_type;
      const nextRun = this._calculateNextRun(scheduleType, data.schedule_config || current.schedule_config);
      setClauses.push(`next_run_at = $${paramIndex}`);
      params.push(nextRun);
    }

    if (setClauses.length === 0) return this.getById(id, tenantId);

    await this.pool.query(
      `UPDATE scheduled_reports SET ${setClauses.join(', ')} WHERE id = $1 AND tenant_id = $2`,
      params
    );

    return this.getById(id, tenantId);
  }

  async delete(id, tenantId) {
    // Delete report_history records first (FK has no CASCADE)
    await this.pool.query(
      'DELETE FROM report_history WHERE scheduled_report_id = $1 AND tenant_id = $2',
      [id, tenantId]
    );
    
    const result = await this.pool.query(
      'DELETE FROM scheduled_reports WHERE id = $1 AND tenant_id = $2 RETURNING id',
      [id, tenantId]
    );
    return result.rowCount > 0;
  }

  // ============================================================================
  // REPORT EXECUTION (now generates export files)
  // ============================================================================

  async processScheduledReports() {
    console.log('[ScheduledReports] Checking for due reports...');
    
    const dueReports = await this.pool.query(
      `SELECT sr.*, rd.code as report_code
       FROM scheduled_reports sr
       JOIN report_definitions rd ON sr.report_definition_id = rd.id
       WHERE sr.is_active = TRUE AND sr.next_run_at <= NOW()`
    );

    console.log(`[ScheduledReports] Found ${dueReports.rows.length} due reports`);

    for (const scheduled of dueReports.rows) {
      try {
        await this._executeScheduledReport(scheduled);
      } catch (error) {
        console.error(`[ScheduledReports] Error executing ${scheduled.name}:`, error.message);
      }
    }
  }

  async _processReportsBySchedule(scheduleType) {
    console.log(`[ScheduledReports] Processing ${scheduleType} reports...`);
    
    const reports = await this.pool.query(
      `SELECT sr.*, rd.code as report_code
       FROM scheduled_reports sr
       JOIN report_definitions rd ON sr.report_definition_id = rd.id
       WHERE sr.is_active = TRUE AND sr.schedule_type = $1`,
      [scheduleType]
    );

    for (const report of reports.rows) {
      try {
        await this._executeScheduledReport(report);
      } catch (error) {
        console.error(`[ScheduledReports] Error:`, error.message);
      }
    }
  }

  async _executeScheduledReport(scheduled) {
    console.log(`[ScheduledReports] Executing: ${scheduled.name}`);
    const startTime = Date.now();
    
    try {
      const reportingService = getReportingService();
      const exportService = getExportService();

      // Step 1: Execute the report query
      const reportData = await reportingService.executeReport(
        scheduled.report_definition_id,
        scheduled.tenant_id,
        {},
        scheduled.created_by
      );

      // Step 2: Generate export file in tenant-isolated directory + track in DB
      const outputFormat = scheduled.output_format || 'pdf';
      const exportResult = await exportService.exportAndTrack(
        reportData,
        outputFormat,
        scheduled.tenant_id,
        {
          reportDefinitionId: scheduled.report_definition_id,
          scheduledReportId: scheduled.id,
          executedBy: scheduled.created_by,
          reportName: scheduled.name
        }
      );

      // Step 3: Update scheduled report's last_run and next_run
      const nextRun = this._calculateNextRun(scheduled.schedule_type, scheduled.schedule_config);
      await this.pool.query(
        `UPDATE scheduled_reports SET last_run_at = NOW(), next_run_at = $1 WHERE id = $2`,
        [nextRun, scheduled.id]
      );

      console.log(`[ScheduledReports] ✅ Completed: ${scheduled.name} → ${exportResult.filename} (${exportResult.fileSize} bytes)`);
      
      return {
        ...reportData,
        export: {
          filename: exportResult.filename,
          format: outputFormat,
          size_bytes: exportResult.fileSize,
          history_id: exportResult.historyId,
          download_path: `/api/v1/reporting/exports/download/${exportResult.filename}`
        }
      };

    } catch (error) {
      // Log failure to report_history
      await this.pool.query(
        `INSERT INTO report_history (tenant_id, scheduled_report_id, report_name, status, error_message, execution_time_ms)
         VALUES ($1, $2, $3, 'failed', $4, $5)`,
        [scheduled.tenant_id, scheduled.id, scheduled.name, error.message, Date.now() - startTime]
      );
      throw error;
    }
  }

  // Manual trigger
  async runNow(id, tenantId) {
    const scheduled = await this.getById(id, tenantId);
    if (!scheduled) throw new Error('Scheduled report not found');
    
    const result = await this.pool.query(
      `SELECT sr.*, rd.code as report_code FROM scheduled_reports sr
       JOIN report_definitions rd ON sr.report_definition_id = rd.id
       WHERE sr.id = $1`, [id]
    );
    
    return this._executeScheduledReport(result.rows[0]);
  }

  // ============================================================================
  // HELPERS
  // ============================================================================

  _calculateNextRun(scheduleType, config = {}) {
    const now = new Date();
    const hour = config.hour || 6;
    const minute = config.minute || 0;

    switch (scheduleType) {
      case 'daily':
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(hour, minute, 0, 0);
        return tomorrow;

      case 'weekly':
        const nextWeek = new Date(now);
        const dayOfWeek = config.day_of_week || 1;
        const daysUntilTarget = (dayOfWeek - now.getDay() + 7) % 7 || 7;
        nextWeek.setDate(nextWeek.getDate() + daysUntilTarget);
        nextWeek.setHours(hour, minute, 0, 0);
        return nextWeek;

      case 'monthly':
        const nextMonth = new Date(now);
        nextMonth.setMonth(nextMonth.getMonth() + 1);
        nextMonth.setDate(config.day_of_month || 1);
        nextMonth.setHours(hour, minute, 0, 0);
        return nextMonth;

      case 'quarterly':
        const nextQuarter = new Date(now);
        const currentQuarter = Math.floor(now.getMonth() / 3);
        nextQuarter.setMonth((currentQuarter + 1) * 3);
        nextQuarter.setDate(config.day_of_month || 1);
        nextQuarter.setHours(hour, minute, 0, 0);
        return nextQuarter;

      default:
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    }
  }

  _formatScheduledReport(row) {
    return {
      ...row,
      schedule_config: typeof row.schedule_config === 'string' 
        ? JSON.parse(row.schedule_config) : row.schedule_config,
      recipients: typeof row.recipients === 'string' 
        ? JSON.parse(row.recipients) : row.recipients
    };
  }
}

let instance = null;
const getScheduledReportsService = () => {
  if (!instance) instance = new ScheduledReportsService();
  return instance;
};

module.exports = { ScheduledReportsService, getScheduledReportsService };