'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('documents', 'source_module', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'platform'
    });
    await queryInterface.addColumn('documents', 'source_module_id', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
    
    // Also add to document_versions for full audit
    await queryInterface.addColumn('document_versions', 'source_module', {
      type: Sequelize.STRING(50),
      allowNull: true,
      defaultValue: 'platform'
    });
    await queryInterface.addColumn('document_versions', 'source_module_id', {
      type: Sequelize.STRING(100),
      allowNull: true
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('documents', 'source_module');
    await queryInterface.removeColumn('documents', 'source_module_id');
    await queryInterface.removeColumn('document_versions', 'source_module');
    await queryInterface.removeColumn('document_versions', 'source_module_id');
  }
};
