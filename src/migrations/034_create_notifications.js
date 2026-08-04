'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(
      path.join(__dirname, 'phase20_notifications.sql'),
      'utf8'
    );
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS notification_preferences CASCADE;
      DROP TABLE IF EXISTS notifications CASCADE;
    `);
  }
};

