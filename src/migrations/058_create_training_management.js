'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const fs = require('fs');
        const path = require('path');
        const sql = fs.readFileSync(
            path.join(__dirname, 'phase16_training_management.sql'),
            'utf8'
        );
        await queryInterface.sequelize.query(sql);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS user_competencies CASCADE;
      DROP TABLE IF EXISTS competency_definitions CASCADE;
      DROP TABLE IF EXISTS training_quiz_attempts CASCADE;
      DROP TABLE IF EXISTS training_quiz_questions CASCADE;
      DROP TABLE IF EXISTS training_records CASCADE;
      DROP TABLE IF EXISTS training_assignments CASCADE;
      DROP TABLE IF EXISTS curriculum_courses CASCADE;
      DROP TABLE IF EXISTS training_curricula CASCADE;
      DROP TABLE IF EXISTS training_courses CASCADE;
    `);
    }
};
