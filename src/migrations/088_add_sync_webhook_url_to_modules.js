'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add sync_webhook_url column to modules table
    await queryInterface.addColumn('modules', 'sync_webhook_url', {
      type: Sequelize.STRING(500),
      allowNull: true,
      comment: 'Webhook URL specifically for syncing identity data'
    });

    // Copy existing webhookurl to sync_webhook_url for backward compatibility
    await queryInterface.sequelize.query(
      'UPDATE modules SET sync_webhook_url = webhookurl WHERE sync_webhook_url IS NULL'
    );
  },

  async down(queryInterface, Sequelize) {
    // Remove sync_webhook_url column
    await queryInterface.removeColumn('modules', 'sync_webhook_url');
  }
};
