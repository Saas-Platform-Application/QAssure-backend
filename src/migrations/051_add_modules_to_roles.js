'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Add modules column to roles table (JSONB array of module IDs)
    await queryInterface.addColumn('roles', 'modules', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: Sequelize.literal("'[]'::jsonb"),
      comment: 'Array of module IDs that this role has access to. Only modules enabled for the tenant can be assigned.'
    });

    // Add index for JSONB queries (GIN index for efficient JSONB queries)
    try {
      await queryInterface.addIndex('roles', ['modules'], {
        name: 'idx_roles_modules',
        using: 'GIN',
        unique: false,
      });
    } catch (error) {
      if (!error.message.includes('already exists')) throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Remove index
    try {
      await queryInterface.removeIndex('roles', 'idx_roles_modules');
    } catch (error) {
      // Index might not exist
    }

    // Remove modules column
    await queryInterface.removeColumn('roles', 'modules');
  }
};
