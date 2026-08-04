'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        // 1. Remove global unique indexes created in 005_create_roles_table.js
        try {
            await queryInterface.removeIndex('roles', 'idx_roles_name');
        } catch (error) {
            console.log('Skipping removal of idx_roles_name as it might not exist');
        }

        try {
            await queryInterface.removeIndex('roles', 'idx_roles_code');
        } catch (error) {
            console.log('Skipping removal of idx_roles_code as it might not exist');
        }

        // 2. Remove default unique constraints if they exist (sometimes named roles_name_key, etc.)
        try {
            await queryInterface.removeConstraint('roles', 'roles_name_key');
        } catch (error) {
            // Ignore if it doesn't exist
        }

        try {
            await queryInterface.removeConstraint('roles', 'roles_code_key');
        } catch (error) {
            // Ignore if it doesn't exist
        }

        // 3. Add composite unique indexes (tenant_id, name) and (tenant_id, code)
        // This covers the case where tenant_id is NOT NULL. 
        // Note: In most DBs, (NULL, 'name') is not considered equal to (NULL, 'name') in a composite unique index.
        await queryInterface.addIndex('roles', ['tenant_id', 'name'], {
            name: 'idx_roles_tenant_name',
            unique: true,
        });

        await queryInterface.addIndex('roles', ['tenant_id', 'code'], {
            name: 'idx_roles_tenant_code',
            unique: true,
        });

        // 4. Add partial unique indexes for the NULL tenant case (platform-level roles)
        // This ensures that even system roles are unique among themselves.
        try {
            await queryInterface.addIndex('roles', ['name'], {
                name: 'idx_roles_name_null_tenant',
                unique: true,
                where: {
                    tenant_id: null
                }
            });
        } catch (error) {
            console.log('Partial index idx_roles_name_null_tenant might not be supported or already exists');
        }

        try {
            await queryInterface.addIndex('roles', ['code'], {
                name: 'idx_roles_code_null_tenant',
                unique: true,
                where: {
                    tenant_id: null
                }
            });
        } catch (error) {
            console.log('Partial index idx_roles_code_null_tenant might not be supported or already exists');
        }
    },

    async down(queryInterface, Sequelize) {
        // 1. Remove composite and partial unique indexes
        await queryInterface.removeIndex('roles', 'idx_roles_tenant_name');
        await queryInterface.removeIndex('roles', 'idx_roles_tenant_code');
        try {
            await queryInterface.removeIndex('roles', 'idx_roles_name_null_tenant');
            await queryInterface.removeIndex('roles', 'idx_roles_code_null_tenant');
        } catch (error) {
            // Ignore
        }

        // 2. Add back global unique indexes
        await queryInterface.addIndex('roles', {
            fields: ['name'],
            unique: true,
            name: 'idx_roles_name'
        });
        await queryInterface.addIndex('roles', {
            fields: ['code'],
            unique: true,
            name: 'idx_roles_code'
        });
    }
};
