'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add source_module and source_module_id to workflow_definitions as ARRAYS
    await queryInterface.addColumn('workflow_definitions', 'source_module', {
      type: Sequelize.ARRAY(Sequelize.STRING(100)),
      allowNull: true,
      defaultValue: ['platform']
    });
    await queryInterface.addColumn('workflow_definitions', 'source_module_id', {
      type: Sequelize.ARRAY(Sequelize.UUID),
      allowNull: true,
      defaultValue: []
    });

    // Add GIN indexes for array columns in workflow_definitions
    await queryInterface.addIndex('workflow_definitions', ['source_module'], {
      using: 'gin',
      name: 'workflow_definitions_source_module_gin'
    });
    await queryInterface.addIndex('workflow_definitions', ['source_module_id'], {
      using: 'gin',
      name: 'workflow_definitions_source_module_id_gin'
    });

    // Add source_module and source_module_id to workflow_instances as SINGLE values
    await queryInterface.addColumn('workflow_instances', 'source_module', {
      type: Sequelize.STRING(100),
      allowNull: true,
      defaultValue: 'platform'
    });
    await queryInterface.addColumn('workflow_instances', 'source_module_id', {
      type: Sequelize.UUID,
      allowNull: true
    });

    // Add B-tree indexes for single columns in workflow_instances
    await queryInterface.addIndex('workflow_instances', ['source_module'], {
      name: 'workflow_instances_source_module_idx'
    });
    await queryInterface.addIndex('workflow_instances', ['source_module_id'], {
      name: 'workflow_instances_source_module_id_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('workflow_definitions', 'workflow_definitions_source_module_gin');
    await queryInterface.removeIndex('workflow_definitions', 'workflow_definitions_source_module_id_gin');
    await queryInterface.removeIndex('workflow_instances', 'workflow_instances_source_module_idx');
    await queryInterface.removeIndex('workflow_instances', 'workflow_instances_source_module_id_idx');

    // Remove columns
    await queryInterface.removeColumn('workflow_definitions', 'source_module');
    await queryInterface.removeColumn('workflow_definitions', 'source_module_id');
    await queryInterface.removeColumn('workflow_instances', 'source_module');
    await queryInterface.removeColumn('workflow_instances', 'source_module_id');
  }
};
