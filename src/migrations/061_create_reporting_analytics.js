'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase19_reporting_analytics.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS user_dashboards CASCADE;
      DROP TABLE IF EXISTS dashboard_widgets CASCADE;
      DROP TABLE IF EXISTS kpi_values CASCADE;
      DROP TABLE IF EXISTS kpi_definitions CASCADE;
      DROP TABLE IF EXISTS report_history CASCADE;
      DROP TABLE IF EXISTS scheduled_reports CASCADE;
      DROP TABLE IF EXISTS report_definitions CASCADE;
    `);
    }
};
