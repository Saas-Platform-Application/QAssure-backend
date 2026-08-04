'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add contact_phone field (string, nullable)
    try {
      await queryInterface.addColumn('users', 'contact_phone', {
        type: Sequelize.STRING(50),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    // Add address_line1 field (string, nullable)
    try {
      await queryInterface.addColumn('users', 'address_line1', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    // Add address_line2 field (string, nullable)
    try {
      await queryInterface.addColumn('users', 'address_line2', {
        type: Sequelize.STRING(255),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    // Add city field (string, nullable)
    try {
      await queryInterface.addColumn('users', 'city', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    // Add state field (string, nullable)
    try {
      await queryInterface.addColumn('users', 'state', {
        type: Sequelize.STRING(100),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    // Add postal_code field (string, nullable)
    try {
      await queryInterface.addColumn('users', 'postal_code', {
        type: Sequelize.STRING(20),
        allowNull: true,
      });
    } catch (error) {
      if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
        throw error;
      }
    }

    // Add country field (string, nullable)
    try {
      await queryInterface.addColumn('users', 'country', {
        type: Sequelize.STRING(100),
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
      await queryInterface.removeColumn('users', 'contact_phone');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('users', 'address_line1');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('users', 'address_line2');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('users', 'city');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('users', 'state');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('users', 'postal_code');
    } catch (error) {
      // Column might not exist
    }

    try {
      await queryInterface.removeColumn('users', 'country');
    } catch (error) {
      // Column might not exist
    }
  }
};
