'use strict';

/**
 * Migration 085: Add `variables` JSONB column to notification_codes
 *   - Each code defines its "variable contract" (list of variable names the caller will pass)
 *   - Seeds variables for all platform codes based on actual sendFromTemplate() usage
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    const codesInfo = await queryInterface.describeTable('notification_codes');

    // 1. Add the variables column if it doesn't exist yet
    if (!codesInfo.variables) {
      await queryInterface.addColumn('notification_codes', 'variables', {
        type: Sequelize.JSONB,
        allowNull: false,
        defaultValue: []
      });
      console.log('✅ Added `variables` column to notification_codes');
    }

    // 2. Populate variables for all seeded platform codes (based on sendFromTemplate usage)
    await queryInterface.sequelize.query(`
      UPDATE notification_codes SET variables = v.vars::jsonb
      FROM (VALUES
        -- System
        ('welcome',              '["user_name"]'::jsonb),
        -- CAPA
        ('capa_assigned',        '["capa_number","title","priority","target_date","status"]'::jsonb),
        ('capa_overdue',         '["capa_number","title","priority","target_date"]'::jsonb),
        ('capa_closed',          '["capa_number","title","priority","target_date","status"]'::jsonb),
        -- Document
        ('document_submitted',   '["document_number","title"]'::jsonb),
        ('document_effective',   '["document_number","title","effective_date"]'::jsonb),
        ('document_approved',    '["document_number","title"]'::jsonb),
        ('document_rejected',    '["document_number","title","reason"]'::jsonb),
        ('document_review_due',  '["document_number","title","next_review_date"]'::jsonb),
        -- Training
        ('training_assigned',    '["course_title","due_date"]'::jsonb),
        ('training_due_soon',    '["course_title","due_date"]'::jsonb),
        ('training_overdue',     '["course_title","due_date"]'::jsonb),
        ('training_completed',   '["course_title","user_name"]'::jsonb),
        -- Workflow
        ('workflow_task_assigned','["role","step_name"]'::jsonb),
        ('workflow_task_overdue', '["step_name","due_date"]'::jsonb),
        ('workflow_escalated',    '["step_name","escalated_to"]'::jsonb),
        ('workflow_completed',    '["entity_name","action"]'::jsonb),
        ('workflow_cancelled',    '["entity_name","reason"]'::jsonb),
        ('project_assigned',      '["project_name","role"]'::jsonb),
        -- Supplier
        ('supplier_expiring',     '["supplier_name","expiry_date"]'::jsonb),
        ('supplier_score_dropped','["supplier_name","old_score","new_score"]'::jsonb),
        -- System / Other
        ('file_shared',           '["file_name"]'::jsonb)
      ) AS v(code, vars)
      WHERE notification_codes.code = v.code
        AND (notification_codes.variables IS NULL OR notification_codes.variables = '[]'::jsonb);
    `);

    console.log('✅ Migration 085: notification_codes.variables seeded for all platform codes');
  },

  async down(queryInterface, Sequelize) {
    const codesInfo = await queryInterface.describeTable('notification_codes');
    if (codesInfo.variables) {
      await queryInterface.removeColumn('notification_codes', 'variables');
    }
  }
};
