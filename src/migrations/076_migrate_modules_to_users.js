"use strict";
const { v4: uuidv4 } = require("uuid");

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const sequelize = queryInterface.sequelize;
    console.log("🚀 Starting migration: roles -> user_modules table");

    // 1. Create user_modules table if not exists
    console.log("--- Step 1: Ensuring user_modules table exists ---");
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS user_modules (
        id UUID PRIMARY KEY,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        module_id UUID NOT NULL REFERENCES modules(id) ON DELETE CASCADE,
        tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(user_id, module_id, tenant_id)
      )
    `);

    // 2. Check for column existence before fetching assignments
    console.log("--- Step 2: Checking schema and fetching assignments ---");

    // Check if roles.modules column exists
    const [rolesColumns] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'roles' AND column_name = 'modules'
    `);
    const hasRolesModules = rolesColumns.length > 0;

    let queryStr = `
      -- A. From role_modules
      SELECT DISTINCT ur.user_id, rm.module_id, ur.tenant_id, ur.assigned_by
      FROM user_roles ur
      JOIN role_modules rm ON ur.role_id = rm.role_id
      WHERE rm.module_id IS NOT NULL
    `;

    if (hasRolesModules) {
      queryStr += `
        UNION
        -- B. From roles.modules JSONB
        SELECT DISTINCT ur.user_id, m.id as module_id, ur.tenant_id, ur.assigned_by
        FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN modules m ON m.id::text IN (SELECT jsonb_array_elements_text(COALESCE(r.modules, '[]'::jsonb)))
        WHERE r.modules IS NOT NULL
      `;
    }

    queryStr += `
      UNION
      -- C. Direct assignments in user_roles
      SELECT DISTINCT ur.user_id, ur.module_id, ur.tenant_id, ur.assigned_by
      FROM user_roles ur
      WHERE ur.module_id IS NOT NULL
    `;

    const [assignments] = await sequelize.query(queryStr);
    console.log(`Found ${assignments.length} assignments to process.`);

    // 3. Insert into user_modules
    console.log("--- Step 3: Inserting into user_modules ---");
    for (const row of assignments) {
      const { user_id, module_id, tenant_id, assigned_by } = row;

      await sequelize.query(
        `
        INSERT INTO user_modules (id, user_id, module_id, tenant_id, assigned_by, assigned_at)
        VALUES ($1, $2, $3, $4, $5, NOW())
        ON CONFLICT (user_id, module_id, tenant_id) DO NOTHING
      `,
        {
          bind: [uuidv4(), user_id, module_id, tenant_id, assigned_by],
        },
      );
    }

    console.log(`✅ Successfully processed module assignments.`);

    // 4. Cleanup roles.modules column if it exists
    if (hasRolesModules) {
      console.log("--- Step 4: Removing modules column from roles table ---");
      await sequelize.query(`ALTER TABLE roles DROP COLUMN IF EXISTS modules`);
      console.log("✅ Removed modules column from roles table.");
    }

    // 5. Remove modules column from users if it exists
    console.log("--- Step 5: Removing modules column from users table ---");
    try {
      await sequelize.query(`ALTER TABLE users DROP COLUMN IF EXISTS modules`);
      console.log("✅ Removed modules column from users table.");
    } catch (err) {
      console.warn(
        "⚠️ Could not remove modules column from users:",
        err.message,
      );
    }

    console.log("✨ Migration completed successfully!");
  },

  down: async (queryInterface, Sequelize) => {
    console.log("Down migration not fully implemented to prevent data loss.");
  },
};
