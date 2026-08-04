'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('knowledge_collections', 'processing_mode', {
        type: Sequelize.STRING(20),
        defaultValue: 'text',
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
      await queryInterface.removeColumn('knowledge_collections', 'processing_mode');
    } catch (error) {
      // Column might not exist
    }
  }
};
