'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // Add logo_file_attachment_uuid to tenants table
        try {
            await queryInterface.addColumn('tenants', 'logo_file_attachment_uuid', {
                type: Sequelize.UUID,
                allowNull: true,
            });
        } catch (error) {
            if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
                throw error;
            }
        }

        // Add favicon_file_attachment_uuid to tenants table
        try {
            await queryInterface.addColumn('tenants', 'favicon_file_attachment_uuid', {
                type: Sequelize.UUID,
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
            await queryInterface.removeColumn('tenants', 'logo_file_attachment_uuid');
        } catch (error) {
            // Column might not exist
        }

        try {
            await queryInterface.removeColumn('tenants', 'favicon_file_attachment_uuid');
        } catch (error) {
            // Column might not exist
        }
    }
};
