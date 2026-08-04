'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add foreign key constraint with CASCADE delete for api_keys.module_id
    // This ensures api_keys are automatically deleted when a module is deleted
    await queryInterface.addConstraint('api_keys', {
      fields: ['module_id'],
      type: 'foreign key',
      name: 'fk_api_keys_module_id',
      references: {
        table: 'modules',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove the foreign key constraint
    await queryInterface.removeConstraint('api_keys', 'fk_api_keys_module_id');
  }
};
