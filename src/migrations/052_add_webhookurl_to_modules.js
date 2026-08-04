'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add webhookurl column to modules table
    await queryInterface.addColumn('modules', 'webhookurl', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Webhook URL for the module to receive notifications and events'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove webhookurl column
    await queryInterface.removeColumn('modules', 'webhookurl');
  }
};
