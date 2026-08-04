'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase22_system_configuration.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS smtp_configs CASCADE;
      DROP TABLE IF EXISTS email_templates CASCADE;
      DROP TABLE IF EXISTS webhook_delivery_logs CASCADE;
      DROP TABLE IF EXISTS webhook_configs CASCADE;
      DROP TABLE IF EXISTS feature_flags CASCADE;
      DROP TABLE IF EXISTS security_policies CASCADE;
      DROP TABLE IF EXISTS branding_config CASCADE;
      DROP TABLE IF EXISTS system_settings CASCADE;
    `);
    }
};
