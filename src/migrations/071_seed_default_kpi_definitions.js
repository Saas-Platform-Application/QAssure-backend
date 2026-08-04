'use strict';

/**
 * Migration 071: Seed Default System KPI Definitions
 *
 * The kpi_definitions table was created in migration 061 but never seeded.
 * As a result, GET /reporting/kpis returns [] for every tenant.
 *
 * This migration inserts the 10 standard KPIs that map exactly to the
 * switch-cases in ReportingService._calculateKPIValue() in reporting.service.js.
 */

const DEFAULT_KPIS = [
    // ─── CAPA ────────────────────────────────────────────────────────────────
    {
        code: 'capa_open_count',
        name: 'Open CAPAs',
        description: 'Total number of CAPAs currently open (not closed or cancelled).',
        module: 'capa',
        calculation_type: 'count',
        query_config: JSON.stringify({ source: 'capas', filter: { status: 'not_closed' } }),
        target_value: null,
        target_direction: 'lower_better',
        warning_threshold: 20,
        critical_threshold: 50,
        unit: 'count',
        decimal_places: 0,
        is_active: true,
    },
    {
        code: 'capa_overdue_count',
        name: 'Overdue CAPAs',
        description: 'Number of open CAPAs whose target date has passed.',
        module: 'capa',
        calculation_type: 'count',
        query_config: JSON.stringify({ source: 'capas', filter: { status: 'not_closed', target_date: 'past' } }),
        target_value: 0,
        target_direction: 'lower_better',
        warning_threshold: 5,
        critical_threshold: 15,
        unit: 'count',
        decimal_places: 0,
        is_active: true,
    },
    {
        code: 'capa_ontime_rate',
        name: 'CAPA On-Time Closure Rate',
        description: 'Percentage of open CAPAs that are not yet overdue.',
        module: 'capa',
        calculation_type: 'percentage',
        query_config: JSON.stringify({ source: 'capas', metric: 'on_time_rate' }),
        target_value: 90,
        target_direction: 'higher_better',
        warning_threshold: 75,
        critical_threshold: 50,
        unit: '%',
        decimal_places: 0,
        is_active: true,
    },

    // ─── TRAINING ────────────────────────────────────────────────────────────
    {
        code: 'training_compliance',
        name: 'Training Compliance Rate',
        description: 'Percentage of training assignments that have been completed.',
        module: 'training',
        calculation_type: 'percentage',
        query_config: JSON.stringify({ source: 'training_assignments', metric: 'compliance_rate' }),
        target_value: 95,
        target_direction: 'higher_better',
        warning_threshold: 80,
        critical_threshold: 60,
        unit: '%',
        decimal_places: 0,
        is_active: true,
    },
    {
        code: 'training_overdue_count',
        name: 'Overdue Training Assignments',
        description: 'Number of training assignments that are overdue or past their due date.',
        module: 'training',
        calculation_type: 'count',
        query_config: JSON.stringify({ source: 'training_assignments', filter: { status: 'overdue' } }),
        target_value: 0,
        target_direction: 'lower_better',
        warning_threshold: 10,
        critical_threshold: 30,
        unit: 'count',
        decimal_places: 0,
        is_active: true,
    },

    // ─── DOCUMENTS ───────────────────────────────────────────────────────────
    {
        code: 'docs_due_review',
        name: 'Documents Due for Review',
        description: 'Number of effective documents whose next review date has passed.',
        module: 'documents',
        calculation_type: 'count',
        query_config: JSON.stringify({ source: 'documents', filter: { status: 'effective', next_review_date: 'past' } }),
        target_value: 0,
        target_direction: 'lower_better',
        warning_threshold: 5,
        critical_threshold: 15,
        unit: 'count',
        decimal_places: 0,
        is_active: true,
    },
    {
        code: 'docs_currency_rate',
        name: 'Document Currency Rate',
        description: 'Percentage of effective documents that are current (not overdue for review).',
        module: 'documents',
        calculation_type: 'percentage',
        query_config: JSON.stringify({ source: 'documents', metric: 'currency_rate' }),
        target_value: 95,
        target_direction: 'higher_better',
        warning_threshold: 80,
        critical_threshold: 60,
        unit: '%',
        decimal_places: 0,
        is_active: true,
    },

    // ─── SUPPLIERS ───────────────────────────────────────────────────────────
    {
        code: 'supplier_approved_count',
        name: 'Approved Suppliers',
        description: 'Total number of suppliers with an approved status.',
        module: 'suppliers',
        calculation_type: 'count',
        query_config: JSON.stringify({ source: 'suppliers', filter: { status: 'approved' } }),
        target_value: null,
        target_direction: 'higher_better',
        warning_threshold: null,
        critical_threshold: null,
        unit: 'count',
        decimal_places: 0,
        is_active: true,
    },
    {
        code: 'supplier_avg_score',
        name: 'Average Supplier Score',
        description: 'Average quality score across all approved suppliers.',
        module: 'suppliers',
        calculation_type: 'average',
        query_config: JSON.stringify({ source: 'suppliers', field: 'current_score', filter: { status: 'approved' } }),
        target_value: 75,
        target_direction: 'higher_better',
        warning_threshold: 60,
        critical_threshold: 40,
        unit: 'score',
        decimal_places: 1,
        is_active: true,
    },
    {
        code: 'supplier_expiring',
        name: 'Suppliers Expiring Soon',
        description: 'Number of approved suppliers whose certification/approval expires within 30 days.',
        module: 'suppliers',
        calculation_type: 'count',
        query_config: JSON.stringify({ source: 'suppliers', filter: { status: 'approved', expiry_date: 'within_30_days' } }),
        target_value: 0,
        target_direction: 'lower_better',
        warning_threshold: 3,
        critical_threshold: 10,
        unit: 'count',
        decimal_places: 0,
        is_active: true,
    },
];

module.exports = {
    async up(queryInterface, Sequelize) {
        // Fetch all existing tenants
        const tenants = await queryInterface.sequelize.query(
            `SELECT id FROM tenants`,
            { type: Sequelize.QueryTypes.SELECT }
        );

        if (!tenants || tenants.length === 0) {
            console.log('[Migration 071] No tenants found – skipping seed.');
            return;
        }

        const now = new Date().toISOString();

        for (const tenant of tenants) {
            for (const kpi of DEFAULT_KPIS) {
                await queryInterface.sequelize.query(
                    `INSERT INTO kpi_definitions
             (tenant_id, code, name, description, module, calculation_type, query_config,
              target_value, target_direction, warning_threshold, critical_threshold,
              unit, decimal_places, is_active, created_at)
           VALUES
             (:tenant_id, :code, :name, :description, :module, :calculation_type, :query_config::jsonb,
              :target_value, :target_direction, :warning_threshold, :critical_threshold,
              :unit, :decimal_places, :is_active, :created_at)
           ON CONFLICT (tenant_id, code) DO NOTHING`,
                    {
                        replacements: {
                            tenant_id: tenant.id,
                            code: kpi.code,
                            name: kpi.name,
                            description: kpi.description,
                            module: kpi.module,
                            calculation_type: kpi.calculation_type,
                            query_config: kpi.query_config,
                            target_value: kpi.target_value,
                            target_direction: kpi.target_direction,
                            warning_threshold: kpi.warning_threshold,
                            critical_threshold: kpi.critical_threshold,
                            unit: kpi.unit,
                            decimal_places: kpi.decimal_places,
                            is_active: kpi.is_active,
                            created_at: now,
                        },
                        type: Sequelize.QueryTypes.INSERT,
                    }
                );
            }
        }

        console.log(
            `[Migration 071] Seeded ${DEFAULT_KPIS.length} default KPI definitions for ${tenants.length} tenant(s).`
        );
    },

    async down(queryInterface, Sequelize) {
        const codes = DEFAULT_KPIS.map(k => `'${k.code}'`).join(', ');
        await queryInterface.sequelize.query(
            `DELETE FROM kpi_definitions WHERE code IN (${codes})`
        );
        console.log('[Migration 071] Removed seeded default KPI definitions.');
    },
};
