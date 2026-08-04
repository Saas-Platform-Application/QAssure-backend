'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase15_document_management.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS document_templates CASCADE;
      DROP TABLE IF EXISTS document_links CASCADE;
      DROP TABLE IF EXISTS document_training CASCADE;
      DROP TABLE IF EXISTS document_checkouts CASCADE;
      DROP TABLE IF EXISTS document_access_log CASCADE;
      DROP TABLE IF EXISTS document_versions CASCADE;
      DROP TABLE IF EXISTS documents CASCADE;
      DROP TABLE IF EXISTS document_categories CASCADE;
    `);
    }
};
