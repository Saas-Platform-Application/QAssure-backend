'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase27_departments_designations_user_categories.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      -- Remove FK columns from users table
      ALTER TABLE users DROP COLUMN IF EXISTS user_category_id;
      ALTER TABLE users DROP COLUMN IF EXISTS designation_id;
      ALTER TABLE users DROP COLUMN IF EXISTS department_id;

      -- Drop tables
      DROP TABLE IF EXISTS user_categories CASCADE;
      DROP TABLE IF EXISTS designations CASCADE;
      DROP TABLE IF EXISTS departments CASCADE;
    `);
    }
};
