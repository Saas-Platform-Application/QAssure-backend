'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add domain field (string, nullable)
    try {
      await queryInterface.addColumn('tenants', 'domain', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    // Add enable_sso field (boolean, default false)
    try {
      await queryInterface.addColumn('tenants', 'enable_sso', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    // Add enable_2fa field (boolean, default false)
    try {
      await queryInterface.addColumn('tenants', 'enable_2fa', {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('tenants', 'domain');
    await queryInterface.removeColumn('tenants', 'enable_sso');
    await queryInterface.removeColumn('tenants', 'enable_2fa');
  }
};
