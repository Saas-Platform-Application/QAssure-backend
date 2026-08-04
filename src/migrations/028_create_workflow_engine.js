'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(
      path.join(__dirname, 'phase14_workflow_engine.sql'),
      'utf8'
    );
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, Sequelize) {
    // Drop workflow tables (adjust based on actual SQL file content)
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS workflow_instances CASCADE;
      DROP TABLE IF EXISTS workflow_steps CASCADE;
      DROP TABLE IF EXISTS workflow_definitions CASCADE;
    `);
  }
};

