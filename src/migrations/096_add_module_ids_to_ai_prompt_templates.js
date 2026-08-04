'use strict';

/**
 * Migration 096 - Add module_ids column to ai_prompt_templates table as a UUID array
 * Includes a PostgreSQL trigger to mimic "ON DELETE SET NULL" (cascade clean-up) for array elements.
 */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Add module_ids column
      await queryInterface.sequelize.query(`
        ALTER TABLE ai_prompt_templates 
        ADD COLUMN IF NOT EXISTS module_ids UUID[];
      `, { transaction });

      // 2. Create cleanup function for trigger
      await queryInterface.sequelize.query(`
        CREATE OR REPLACE FUNCTION clean_deleted_module_from_prompts()
        RETURNS TRIGGER AS $$
        BEGIN
          UPDATE ai_prompt_templates
          SET module_ids = array_remove(module_ids, OLD.id)
          WHERE OLD.id = ANY(module_ids);
          RETURN OLD;
        END;
        $$ LANGUAGE plpgsql;
      `, { transaction });

      // 3. Bind trigger to modules table
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_clean_deleted_module_from_prompts ON modules;
        CREATE TRIGGER trigger_clean_deleted_module_from_prompts
        BEFORE DELETE ON modules
        FOR EACH ROW
        EXECUTE FUNCTION clean_deleted_module_from_prompts();
      `, { transaction });
    });
    console.log('Migration 096: module_ids column and cascade clean-up trigger created successfully');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // 1. Drop trigger
      await queryInterface.sequelize.query(`
        DROP TRIGGER IF EXISTS trigger_clean_deleted_module_from_prompts ON modules;
      `, { transaction });

      // 2. Drop function
      await queryInterface.sequelize.query(`
        DROP FUNCTION IF EXISTS clean_deleted_module_from_prompts();
      `, { transaction });

      // 3. Drop column
      await queryInterface.sequelize.query(`
        ALTER TABLE ai_prompt_templates 
        DROP COLUMN IF EXISTS module_ids;
      `, { transaction });
    });
    console.log('Migration 096: rolled back successfully');
  }
};
