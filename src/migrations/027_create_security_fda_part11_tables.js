'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Since this is a complex migration with many tables matching SQL exactly,
    // I'll use raw SQL execution to ensure 100% match with the SQL file
    const sql = require('fs').readFileSync(
      require('path').join(__dirname, 'phase13_security_fda_part11.sql'),
      'utf8'
    );
    
    // Execute the SQL file directly
    await queryInterface.sequelize.query(sql);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order
    await queryInterface.dropTable('security_settings');
    await queryInterface.dropTable('access_review_items');
    await queryInterface.dropTable('access_reviews');
    await queryInterface.dropTable('password_history');
    await queryInterface.dropTable('password_policies');
    await queryInterface.dropTable('electronic_signatures');
    
    // Remove columns from users table
    await queryInterface.removeColumn('users', 'last_password_check');
    await queryInterface.removeColumn('users', 'locked_until');
    await queryInterface.removeColumn('users', 'failed_login_attempts');
    await queryInterface.removeColumn('users', 'password_expires_at');
    await queryInterface.removeColumn('users', 'password_changed_at');
    await queryInterface.removeColumn('users', 'signature_pin_set_at');
    await queryInterface.removeColumn('users', 'signature_pin_hash');
  }
};

