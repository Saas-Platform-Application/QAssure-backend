'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('users', 'force_password_reset', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('users', 'force_password_reset');
    } catch (error) {
      // Column might not exist
    }
  }
};
