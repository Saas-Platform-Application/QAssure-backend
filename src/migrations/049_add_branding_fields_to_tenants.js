'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add branding fields to tenants table
    try {
      await queryInterface.addColumn('tenants', 'logo_file_path', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    try {
      await queryInterface.addColumn('tenants', 'favicon_file_path', {
        type: Sequelize.STRING(500),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    try {
      await queryInterface.addColumn('tenants', 'primary_color', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    try {
      await queryInterface.addColumn('tenants', 'secondary_color', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    try {
      await queryInterface.addColumn('tenants', 'accent_color', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeColumn('tenants', 'logo_file_path');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('tenants', 'favicon_file_path');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('tenants', 'primary_color');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('tenants', 'secondary_color');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('tenants', 'accent_color');
    } catch (error) {
      // Column might not exist
    }
  }
};
