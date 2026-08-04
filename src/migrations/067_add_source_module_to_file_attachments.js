'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add source_module column to file_attachments table
        await queryInterface.addColumn('file_attachments', 'source_module', {
            type: Sequelize.STRING(100),
            allowNull: true,
            defaultValue: 'platform'
        });

        // Add index for source_module
        await queryInterface.addIndex('file_attachments', ['source_module'], {
            name: 'idx_file_attachments_source_module'
        });
    },

    async down(queryInterface, Sequelize) {
        // Remove index
        await queryInterface.removeIndex('file_attachments', 'idx_file_attachments_source_module');

        // Remove source_module column
        await queryInterface.removeColumn('file_attachments', 'source_module');
    }
};
