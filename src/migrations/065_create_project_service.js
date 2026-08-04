'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase23_project_service.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      -- Remove project_id columns from existing tables
      ALTER TABLE suppliers DROP COLUMN IF EXISTS project_id;
      ALTER TABLE training_assignments DROP COLUMN IF EXISTS project_id;
      ALTER TABLE capas DROP COLUMN IF EXISTS project_id;
      ALTER TABLE documents DROP COLUMN IF EXISTS project_id;
      ALTER TABLE workflow_instances DROP COLUMN IF EXISTS project_id;

      -- Drop project tables
      DROP TABLE IF EXISTS project_activity_log CASCADE;
      DROP TABLE IF EXISTS project_modules CASCADE;
      DROP TABLE IF EXISTS project_milestones CASCADE;
      DROP TABLE IF EXISTS project_members CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
    `);
    }
};
