'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // We use a subquery check instead of ON CONFLICT to avoid dependency on 
    // exact unique index definitions (which use COALESCE for null tenant_id)
    await queryInterface.sequelize.query(`
      INSERT INTO notification_templates 
        (id, tenant_id, code, name, category, title_template, message_template, email_subject_template, email_body_template, default_priority, channels, is_active, created_at)
      SELECT 
        gen_random_uuid(), NULL, 'role_task_assigned', 'Task Assigned to Role', 'workflow', 
        'New Role Task: {{step_name}}', 
        'A new workflow task is available for your role ({{role}}): {{step_name}}', 
        '[QAssure] New Task for {{role}}: {{step_name}}', 
        '<p>A new workflow task is available for your role (<b>{{role}}</b>): <b>{{step_name}}</b>.</p>', 
        'high', ARRAY['in_app','email']::varchar[], TRUE, NOW()
      WHERE NOT EXISTS (
        SELECT 1 FROM notification_templates WHERE code = 'role_task_assigned' AND tenant_id IS NULL
      );
    `);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DELETE FROM notification_templates WHERE code = 'role_task_assigned' AND tenant_id IS NULL;
    `);
  }
};
