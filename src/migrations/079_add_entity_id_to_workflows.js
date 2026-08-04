'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add entity_id to workflow_definitions
    await queryInterface.addColumn('workflow_definitions', 'entity_id', {
      type: Sequelize.UUID,
      allowNull: true,
      comment: 'Optional entity ID this workflow definition is specific to'
    });

    // Add index for entity_id
    await queryInterface.addIndex('workflow_definitions', ['entity_id'], {
      name: 'workflow_definitions_entity_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove index first
    await queryInterface.removeIndex('workflow_definitions', 'workflow_definitions_entity_id_idx');

    // Remove column
    await queryInterface.removeColumn('workflow_definitions', 'entity_id');
  }
};
