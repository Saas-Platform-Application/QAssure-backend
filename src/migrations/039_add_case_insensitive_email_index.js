'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add case-insensitive unique index on email
    // This ensures email uniqueness regardless of case, even if application layer is bypassed
    await queryInterface.sequelize.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower 
      ON users(LOWER(email));
    `);
  },

  async down(queryInterface, Sequelize) {
    // Remove the case-insensitive unique index
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_users_email_lower;
    `);
  }
};
