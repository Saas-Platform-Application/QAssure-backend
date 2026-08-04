'use strict';

/**
 * Migration 108: Add workflow task reminder support
 * - Add overdue_reminder_sent_at column to workflow_tasks
 * - Register 'workflow_task_due_soon' notification code and default template
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add overdue_reminder_sent_at column to workflow_tasks if not exists
    const taskInfo = await queryInterface.describeTable('workflow_tasks');
    if (!taskInfo.overdue_reminder_sent_at) {
      await queryInterface.addColumn('workflow_tasks', 'overdue_reminder_sent_at', {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Timestamp when the last overdue reminder was sent to prevent duplicate notifications'
      });
    }

    // 2. Register 'workflow_task_due_soon' in notification_codes
    await queryInterface.sequelize.query(`
      INSERT INTO notification_codes (id, category_id, code, name, variables)
      VALUES (gen_random_uuid(), '10000000-0000-0000-0000-000000000004', 'workflow_task_due_soon', 'Workflow Task Due Soon', '["task_name","due_date"]'::jsonb)
      ON CONFLICT (code) DO NOTHING;
    `);

    // 3. Register 'workflow_task_due_soon' template in notification_templates
    await queryInterface.sequelize.query(`
      INSERT INTO notification_templates 
        (id, tenant_id, code, name, category, title_template, message_template, email_subject_template, email_body_template, default_priority, channels, is_active, created_at)
      SELECT 
        gen_random_uuid(), NULL, 'workflow_task_due_soon', 'Workflow Task Due Soon', 'workflow', 
        'Task Due Soon: {{task_name}}', 
        'Your task {{task_name}} is due soon on {{due_date}}', 
        '[QAssure] Task Due Soon: {{task_name}}', 
        '<p>Your workflow task <b>{{task_name}}</b> is due soon on <b>{{due_date}}</b>.</p>', 
        'high', ARRAY['in_app','email']::varchar[], TRUE, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_templates WHERE code = 'workflow_task_due_soon' AND tenant_id IS NULL
      );
    `);

    console.log('Migration 108: Added overdue_reminder_sent_at column and registered due soon template.');
  },

  async down(queryInterface, Sequelize) {
    // 1. Remove column
    await queryInterface.removeColumn('workflow_tasks', 'overdue_reminder_sent_at');

    // 2. Remove template
    await queryInterface.sequelize.query(`
      DELETE FROM notification_templates WHERE code = 'workflow_task_due_soon' AND tenant_id IS NULL;
    `);

    // 3. Remove code
    await queryInterface.sequelize.query(`
      DELETE FROM notification_codes WHERE code = 'workflow_task_due_soon';
    `);

    console.log('Migration 108: Rolled back workflow task reminder support.');
  }
};
