'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase17_capa_management.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS capa_metrics CASCADE;
      DROP TABLE IF EXISTS capa_8d_reports CASCADE;
      DROP TABLE IF EXISTS capa_related_records CASCADE;
      DROP TABLE IF EXISTS capa_actions CASCADE;
      DROP TABLE IF EXISTS capas CASCADE;
    `);
    }
};
