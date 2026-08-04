'use strict';
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      await queryInterface.addColumn('api_keys', 'module_id', {
        type: Sequelize.UUID,
        allowNull: true,
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Column module_id already exists, skipping');
      } else {
        throw error;
      }
    }

    try {
      await queryInterface.addIndex('api_keys', ['module_id'], {
        name: 'idx_api_keys_module_id',
        unique: false,
      });
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('Index idx_api_keys_module_id already exists, skipping');
      } else {
        throw error;
      }
    }
  },

  async down(queryInterface, Sequelize) {
    try {
      await queryInterface.removeIndex('api_keys', 'idx_api_keys_module_id');
    } catch (error) {
      console.log('Index removal skipped:', error.message);
    }
    try {
      await queryInterface.removeColumn('api_keys', 'module_id');
    } catch (error) {
      console.log('Column removal skipped:', error.message);
    }
  }
};