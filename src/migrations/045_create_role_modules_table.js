'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Create role_modules junction table for many-to-many relationship
    await queryInterface.createTable('role_modules', {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.literal('gen_random_uuid()'),
        allowNull: false,
      },
      role_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      module_id: {
        type: Sequelize.UUID,
        allowNull: false,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add foreign key constraints (with error handling for idempotency)
    try {
      await queryInterface.addConstraint('role_modules', {
        fields: ['role_id'],
        type: 'foreign key',
        name: 'fk_role_modules_role_id',
        references: {
          table: 'roles',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    try {
      await queryInterface.addConstraint('role_modules', {
        fields: ['module_id'],
        type: 'foreign key',
        name: 'fk_role_modules_module_id',
        references: {
          table: 'modules',
          field: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    // Create unique constraint to prevent duplicate assignments
    try {
      await queryInterface.addConstraint('role_modules', {
        fields: ['role_id', 'module_id'],
        type: 'unique',
        name: 'unique_role_module'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    // Create indexes for better query performance
    try {
      await queryInterface.addIndex('role_modules', ['role_id'], {
        name: 'idx_role_modules_role_id'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }

    try {
      await queryInterface.addIndex('role_modules', ['module_id'], {
        name: 'idx_role_modules_module_id'
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes
    await queryInterface.removeIndex('role_modules', 'idx_role_modules_module_id');
    await queryInterface.removeIndex('role_modules', 'idx_role_modules_role_id');
    
    // Remove foreign key constraints
    await queryInterface.removeConstraint('role_modules', 'fk_role_modules_module_id');
    await queryInterface.removeConstraint('role_modules', 'fk_role_modules_role_id');
    
    // Remove unique constraint
    await queryInterface.removeConstraint('role_modules', 'unique_role_module');
    
    // Drop table
    await queryInterface.dropTable('role_modules');
  }
};
