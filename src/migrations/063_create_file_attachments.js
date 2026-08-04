'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase21_file_attachments.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DROP TRIGGER IF EXISTS trg_update_storage_usage ON file_attachments;
      DROP FUNCTION IF EXISTS update_storage_usage();
      DROP TABLE IF EXISTS storage_quotas CASCADE;
      DROP TABLE IF EXISTS file_shares CASCADE;
      DROP TABLE IF EXISTS file_access_logs CASCADE;
      DROP TABLE IF EXISTS file_attachments CASCADE;
    `);
    }
};
