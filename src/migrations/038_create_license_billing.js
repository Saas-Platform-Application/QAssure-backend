'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const fs = require('fs');
    const path = require('path');
    const sql = fs.readFileSync(
      path.join(__dirname, 'phase24_license_billing.sql'),
      'utf8'
    );
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS invoice_line_items CASCADE;
      DROP TABLE IF EXISTS invoices CASCADE;
      DROP TABLE IF EXISTS license_usage CASCADE;
      DROP TABLE IF EXISTS licenses CASCADE;
    `);
  }
};

