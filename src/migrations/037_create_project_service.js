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
      DROP TABLE IF EXISTS project_activity_log CASCADE;
      DROP TABLE IF EXISTS project_modules CASCADE;
      DROP TABLE IF EXISTS project_milestones CASCADE;
      DROP TABLE IF EXISTS project_members CASCADE;
      DROP TABLE IF EXISTS projects CASCADE;
    `);
  }
};

