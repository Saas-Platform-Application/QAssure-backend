'use strict';

/**
 * Migration 092 - Update Workflow Assignees to support multiple users and roles
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Update workflow_steps table
    await queryInterface.sequelize.query(`
      ALTER TABLE workflow_steps
        ADD COLUMN IF NOT EXISTS assignee_user_ids UUID[],
        ADD COLUMN IF NOT EXISTS assignee_role_ids UUID[];
    `);

    // 2. Update workflow_tasks table
    await queryInterface.sequelize.query(`
      ALTER TABLE workflow_tasks
        ADD COLUMN IF NOT EXISTS assigned_user_ids UUID[],
        ADD COLUMN IF NOT EXISTS assigned_role_ids UUID[];
    `);

    // Optional: Migrate existing single assignments to the new array columns
    await queryInterface.sequelize.query(`
      UPDATE workflow_steps 
      SET assignee_user_ids = ARRAY[assignee_id] 
      WHERE assignee_id IS NOT NULL AND assignee_user_ids IS NULL;
    `);

    await queryInterface.sequelize.query(`
      UPDATE workflow_tasks 
      SET assigned_user_ids = ARRAY[assigned_to] 
      WHERE assigned_to IS NOT NULL AND assigned_user_ids IS NULL;
    `);

    console.log('Migration 092: Workflow assignee columns updated to support multiple IDs');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS assigned_user_ids;
      ALTER TABLE workflow_tasks DROP COLUMN IF EXISTS assigned_role_ids;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE workflow_steps DROP COLUMN IF EXISTS assignee_user_ids;
      ALTER TABLE workflow_steps DROP COLUMN IF EXISTS assignee_role_ids;
    `);
  }
};
