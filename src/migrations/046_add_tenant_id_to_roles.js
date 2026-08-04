// 'use strict';

// /** @type {import('sequelize-cli').Migration} */
// module.exports = {
//   async up(queryInterface, Sequelize) {
//     // Add tenant_id column to roles table
//     await queryInterface.addColumn('roles', 'tenant_id', {
//       type: Sequelize.UUID,
//       allowNull: true,
//       references: {
//         table: 'tenants',
//         field: 'id'
//       },
//       onDelete: 'CASCADE',
//       onUpdate: 'CASCADE'
//     });

//     // Add index for tenant_id
//     await queryInterface.addIndex('roles', ['tenant_id'], {
//       name: 'idx_roles_tenant_id',
//       unique: false,
//     });

//     // Update unique constraint on code to be tenant-scoped (if tenant_id is provided)
//     // Note: We'll keep the global unique constraint but allow same code for different tenants
//     // This is handled at application level
//   },

//   async down(queryInterface, Sequelize) {
//     // Remove index
//     await queryInterface.removeIndex('roles', 'idx_roles_tenant_id');

//     // Remove tenant_id column
//     await queryInterface.removeColumn('roles', 'tenant_id');
//   }
// };

'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        try {
            await queryInterface.addColumn('roles', 'tenant_id', {
                type: Sequelize.UUID,
                allowNull: true,
            });
        } catch (error) {
            if (!error.message.includes('already exists') && !error.message.includes('duplicate column')) {
                throw error;
            }
        }

        // Add foreign key constraint
        try {
            await queryInterface.addConstraint('roles', {
                fields: ['tenant_id'],
                type: 'foreign key',
                name: 'fk_roles_tenant_id',
                references: {
                    table: 'tenants',
                    field: 'id'
                },
                onDelete: 'CASCADE',
                onUpdate: 'CASCADE'
            });
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
        }

        // Add index for tenant_id
        try {
            await queryInterface.addIndex('roles', ['tenant_id'], {
                name: 'idx_roles_tenant_id',
                unique: false,
            });
        } catch (error) {
            if (!error.message.includes('already exists')) throw error;
        }

        // Update unique constraint on code to be tenant-scoped (if tenant_id is provided)
        // Note: We'll keep the global unique constraint but allow same code for different tenants
        // This is handled at application level
    },

    async down(queryInterface, Sequelize) {
        // Remove index
        try {
            await queryInterface.removeIndex('roles', 'idx_roles_tenant_id');
        } catch (error) {
            // Index might not exist
        }

        // Remove foreign key constraint
        try {
            await queryInterface.removeConstraint('roles', 'fk_roles_tenant_id');
        } catch (error) {
            // Constraint might not exist
        }

        // Remove tenant_id column
        await queryInterface.removeColumn('roles', 'tenant_id');
    }
};