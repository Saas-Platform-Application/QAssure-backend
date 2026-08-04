'use strict';

/**
 * Migration: Add idle timeout support to sessions table
 * - Adds last_activity_at column (tracks the most recent authenticated API request)
 * - Adds index for efficient idle queries during token refresh
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    const tableInfo = await queryInterface.describeTable('sessions');
    
    if (!tableInfo.last_activity_at) {
      // Add last_activity_at column — defaults to NOW() so existing sessions
      // are not immediately expired after the migration runs
      await queryInterface.addColumn('sessions', 'last_activity_at', {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'Timestamp of the last authenticated API request for idle timeout enforcement'
      });

      // Index for efficient lookup during refresh token checks
      await queryInterface.addIndex('sessions', {
        fields: ['last_activity_at'],
        where: { revoked_at: null },
        name: 'idx_sessions_last_activity_at'
      });
      console.log('[Migration 107] Added last_activity_at column and index to sessions table');
    } else {
      console.log('[Migration 107] Column last_activity_at already exists, skipping');
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('sessions', 'idx_sessions_last_activity_at');
    await queryInterface.removeColumn('sessions', 'last_activity_at');
    console.log('[Migration 107] Removed last_activity_at column from sessions table');
  }
};
