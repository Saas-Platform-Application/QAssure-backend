/**
 * Migration 073: Remove file_categories master table
 * - Drop FK constraint on file_attachments.category_id (was UUID → file_categories.id)
 * - Change category_id from UUID to VARCHAR(255) (plain string, no FK)
 * - Drop file_categories table entirely
 *
 * Rationale: category management is now handled by the consuming module application.
 * We only store category (label) and category_id (string) for filtering purposes.
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {

    // 1. Drop the foreign-key constraint on file_attachments.category_id
    //    (constraint name was auto-generated; we use IF EXISTS to be safe)
    await queryInterface.sequelize.query(`
      ALTER TABLE file_attachments
        DROP CONSTRAINT IF EXISTS file_attachments_category_id_fkey;
    `);

    // 2. Change column type from UUID to VARCHAR(255)
    //    Cast existing UUID values to text so no data is lost.
    await queryInterface.sequelize.query(`
      ALTER TABLE file_attachments
        ALTER COLUMN category_id TYPE VARCHAR(255)
        USING category_id::TEXT;
    `);

    // 3. Drop index that referenced the old UUID column (recreate as plain text index)
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_file_attachments_category;
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_file_attachments_category_id
        ON file_attachments(category_id);
    `);

    // 4. Add an index on the 'category' (name) column for fast filter queries
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_file_attachments_category_name
        ON file_attachments(category);
    `);

    // 5. Drop file_categories table (and its index)
    await queryInterface.sequelize.query(`
      DROP INDEX IF EXISTS idx_file_categories_tenant;
      DROP TABLE IF EXISTS file_categories CASCADE;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // Reverse: re-create file_categories, restore FK (best-effort; existing string data may not be valid UUIDs)
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS file_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        validation_rules JSONB DEFAULT '{}',
        is_system_defined BOOLEAN DEFAULT FALSE,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(tenant_id, code)
      );
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_file_categories_tenant ON file_categories(tenant_id);
    `);

    // Note: we cannot restore the FK constraint because the string values are not UUIDs.
    // The column stays as VARCHAR(255).
  }
};
