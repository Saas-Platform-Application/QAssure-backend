/**
 * Migration: Create File Categories Master Table
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. Create file_categories table
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS file_categories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        
        name VARCHAR(255) NOT NULL,
        code VARCHAR(100) NOT NULL,
        description TEXT,
        
        -- Validation rules stored as JSONB
        -- e.g., { "allowed_extensions": [".pdf", ".docx"], "max_size_mb": 10, "requires_approval": true }
        validation_rules JSONB DEFAULT '{}',
        
        is_system_defined BOOLEAN DEFAULT FALSE,
        
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        
        UNIQUE(tenant_id, code)
      );
    `);

    // 2. Add category_id to file_attachments
    await queryInterface.sequelize.query(`
      ALTER TABLE file_attachments 
      ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES file_categories(id) ON DELETE SET NULL;
    `);

    // 3. Create indexes
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_file_categories_tenant ON file_categories(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_file_attachments_category ON file_attachments(category_id);
    `);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      ALTER TABLE file_attachments DROP COLUMN IF EXISTS category_id;
      DROP TABLE IF EXISTS file_categories;
    `);
  }
};
