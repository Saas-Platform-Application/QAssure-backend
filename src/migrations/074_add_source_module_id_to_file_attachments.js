'use strict';

/**
 * Migration 074: Add source_module_id to file_attachments
 *
 * We already store source_module (code string e.g. 'capa', 'documents').
 * This adds source_module_id (UUID of the module) so files can be
 * filtered/joined by the actual module record, not just its code string.
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add source_module_id column
    await queryInterface.addColumn('file_attachments', 'source_module_id', {
      type: Sequelize.UUID,
      allowNull: true,
      defaultValue: null,
      comment: 'UUID of the module that uploaded the file (from API key moduleId)'
    });

    // Index for fast filtering by module ID
    await queryInterface.addIndex('file_attachments', ['source_module_id'], {
      name: 'idx_file_attachments_source_module_id'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('file_attachments', 'idx_file_attachments_source_module_id');
    await queryInterface.removeColumn('file_attachments', 'source_module_id');
  }
};
