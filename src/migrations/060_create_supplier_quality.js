'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase18_supplier_quality.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS approved_supplier_list CASCADE;
      DROP TABLE IF EXISTS supplier_issues CASCADE;
      DROP TABLE IF EXISTS supplier_documents CASCADE;
      DROP TABLE IF EXISTS supplier_scorecards CASCADE;
      DROP TABLE IF EXISTS audit_findings CASCADE;
      DROP TABLE IF EXISTS supplier_audits CASCADE;
      DROP TABLE IF EXISTS supplier_contacts CASCADE;
      DROP TABLE IF EXISTS suppliers CASCADE;
    `);
    }
};
