'use strict';

/**
 * Migration 070: Seed Default System Report Definitions
 *
 * The report_definitions table was created in migration 061 but never seeded
 * with built-in/system reports. As a result, GET /reporting/reports returns []
 * for every tenant. This migration inserts the standard system reports that
 * map 1-to-1 to the executeReport() switch-cases in reporting.service.js.
 */

const DEFAULT_REPORTS = [
    {
        name: 'Executive Dashboard',
        description: 'High-level overview of all quality modules including CAPA, Training, Documents, and Suppliers.',
        code: 'exec_dashboard',
        report_type: 'dashboard',
        category: 'executive',
        module: 'all',
        config: JSON.stringify({ layout: 'grid', refresh_interval: 300 }),
        chart_type: 'card',
        is_system: true,
        is_public: true,
        is_active: true,
    },
    {
        name: 'CAPA Summary Report',
        description: 'Summary of all CAPAs grouped by status, type, and priority.',
        code: 'capa_summary',
        report_type: 'summary',
        category: 'quality',
        module: 'capa',
        config: JSON.stringify({ groupBy: ['status', 'capa_type', 'priority'] }),
        chart_type: 'bar',
        is_system: true,
        is_public: true,
        is_active: true,
    },
    {
        name: 'Training Compliance Report',
        description: 'Training assignment compliance rates per course for the tenant.',
        code: 'training_compliance',
        report_type: 'compliance',
        category: 'training',
        module: 'training',
        config: JSON.stringify({ groupBy: ['course'], metrics: ['compliance_rate'] }),
        chart_type: 'table',
        is_system: true,
        is_public: true,
        is_active: true,
    },
    {
        name: 'Supplier Scorecard Report',
        description: 'Approved supplier scores grouped by category and grade.',
        code: 'supplier_scorecard',
        report_type: 'summary',
        category: 'supplier',
        module: 'suppliers',
        config: JSON.stringify({ groupBy: ['category', 'score_grade'], filter: { status: 'approved' } }),
        chart_type: 'bar',
        is_system: true,
        is_public: true,
        is_active: true,
    },
    {
        name: 'Document Review Status Report',
        description: 'List of effective documents with their review status (overdue, upcoming, current).',
        code: 'doc_review_status',
        report_type: 'list',
        category: 'quality',
        module: 'documents',
        config: JSON.stringify({ columns: ['document_number', 'title', 'status', 'next_review_date', 'review_status'] }),
        chart_type: 'table',
        is_system: true,
        is_public: true,
        is_active: true,
    },
    {
        name: 'Monthly Quality Trends',
        description: 'Month-by-month trend of CAPAs opened/closed and training assignments/completions over the last 12 months.',
        code: 'monthly_quality',
        report_type: 'trend',
        category: 'executive',
        module: 'all',
        config: JSON.stringify({ period: 'monthly', months: 12 }),
        chart_type: 'line',
        is_system: true,
        is_public: true,
        is_active: true,
    },
];

module.exports = {
    async up(queryInterface, Sequelize) {
        // Fetch all existing tenant IDs
        // sequelize.query with QueryTypes.SELECT returns [rows, metadata]; rows is the array
        const tenants = await queryInterface.sequelize.query(
            `SELECT id FROM tenants`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (!tenants || tenants.length === 0) {
            console.log('[Migration 070] No tenants found – skipping seed.');
            return;
        }

        const rows = [];
        const now = new Date().toISOString();

        for (const tenant of tenants) {
            for (const report of DEFAULT_REPORTS) {
                rows.push({
                    tenant_id: tenant.id,
                    name: report.name,
                    description: report.description,
                    code: report.code,
                    report_type: report.report_type,
                    category: report.category,
                    module: report.module,
                    config: report.config,
                    chart_type: report.chart_type,
                    is_system: report.is_system,
                    is_public: report.is_public,
                    is_active: report.is_active,
                    created_at: now,
                    updated_at: now,
                });
            }
        }

        // Use INSERT ... ON CONFLICT DO NOTHING to avoid duplicate errors
        // if this migration is re-run or the tenant already has entries.
        for (const row of rows) {
            await queryInterface.sequelize.query(
                `INSERT INTO report_definitions
           (tenant_id, name, description, code, report_type, category, module,
            config, chart_type, is_system, is_public, is_active, created_at, updated_at)
         VALUES
           (:tenant_id, :name, :description, :code, :report_type, :category, :module,
            :config::jsonb, :chart_type, :is_system, :is_public, :is_active, :created_at, :updated_at)
         ON CONFLICT (tenant_id, code) DO NOTHING`,
                {
                    replacements: row,
                    type: Sequelize.QueryTypes.INSERT,
                }
            );
        }

        console.log(
            `[Migration 070] Seeded ${DEFAULT_REPORTS.length} default report definitions for ${tenants.length} tenant(s).`
        );
    },

    async down(queryInterface, Sequelize) {
        // Remove only the system-seeded reports (is_system = true)
        await queryInterface.sequelize.query(
            `DELETE FROM report_definitions WHERE is_system = TRUE`
        );
        console.log('[Migration 070] Removed seeded system report definitions.');
    },
};
