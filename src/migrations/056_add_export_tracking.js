'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'migration_add_export_tracking.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_report_history_executed_at;
      DROP INDEX IF EXISTS idx_report_history_tenant_output;
      ALTER TABLE report_history DROP COLUMN IF EXISTS file_size_bytes;
      ALTER TABLE report_history DROP COLUMN IF EXISTS output_format;
    `);
    }
};
