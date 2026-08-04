-- ============================================================================
-- Phase 27: Departments, Designations & User Categories
-- QAssure Platform
-- Date: 2026-02-28
-- Description: Creates tenant-scoped master tables for departments (hierarchical),
--              designations, and user categories. Adds FK columns to users table.
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. DEPARTMENTS TABLE (Tenant-Scoped, Hierarchical)
-- Supports tree structure via self-referencing parent_id
-- ============================================================================
CREATE TABLE IF NOT EXISTS departments (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(100),
    description     TEXT,
    parent_id       UUID,
    level           INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID,
    updated_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_departments_tenant_id
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_departments_parent_id
        FOREIGN KEY (parent_id) REFERENCES departments(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_departments_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_departments_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Unique department name within same tenant and same parent level
    CONSTRAINT unique_department_name_per_tenant_parent
        UNIQUE (tenant_id, parent_id, name)
);

-- Department indexes
CREATE INDEX IF NOT EXISTS idx_departments_tenant_id ON departments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_departments_parent_id ON departments(parent_id);
CREATE INDEX IF NOT EXISTS idx_departments_tenant_active ON departments(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_departments_code ON departments(tenant_id, code);

COMMENT ON TABLE departments IS 'Tenant-scoped hierarchical department structure. Supports tree via parent_id self-reference.';
COMMENT ON COLUMN departments.parent_id IS 'Self-referencing FK for hierarchy. NULL = root department.';
COMMENT ON COLUMN departments.level IS 'Depth in hierarchy tree. 0 = root, 1 = child of root, etc.';
COMMENT ON COLUMN departments.code IS 'Optional short code for department (e.g., ENG, QA, HR). Tenant-scoped.';

-- ============================================================================
-- 2. DESIGNATIONS TABLE (Tenant-Scoped)
-- ============================================================================
CREATE TABLE IF NOT EXISTS designations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(100),
    description     TEXT,
    level           INTEGER NOT NULL DEFAULT 0,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID,
    updated_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_designations_tenant_id
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_designations_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_designations_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Unique designation name within same tenant
    CONSTRAINT unique_designation_name_per_tenant
        UNIQUE (tenant_id, name)
);

-- Designation indexes
CREATE INDEX IF NOT EXISTS idx_designations_tenant_id ON designations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_designations_tenant_active ON designations(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_designations_code ON designations(tenant_id, code);

COMMENT ON TABLE designations IS 'Tenant-scoped designation master. Examples: Quality Manager, Senior Engineer, Director.';
COMMENT ON COLUMN designations.level IS 'Seniority level for ordering. Higher number = more senior. Used for permission hierarchy.';

-- ============================================================================
-- 3. USER CATEGORIES TABLE (Tenant-Scoped)
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_categories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       UUID NOT NULL,
    name            VARCHAR(255) NOT NULL,
    code            VARCHAR(100),
    description     TEXT,
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT true,
    created_by      UUID,
    updated_by      UUID,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_user_categories_tenant_id
        FOREIGN KEY (tenant_id) REFERENCES tenants(id)
        ON UPDATE CASCADE ON DELETE CASCADE,

    CONSTRAINT fk_user_categories_created_by
        FOREIGN KEY (created_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    CONSTRAINT fk_user_categories_updated_by
        FOREIGN KEY (updated_by) REFERENCES users(id)
        ON UPDATE CASCADE ON DELETE SET NULL,

    -- Unique category name within same tenant
    CONSTRAINT unique_user_category_name_per_tenant
        UNIQUE (tenant_id, name)
);

-- User category indexes
CREATE INDEX IF NOT EXISTS idx_user_categories_tenant_id ON user_categories(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_categories_tenant_active ON user_categories(tenant_id, is_active);

COMMENT ON TABLE user_categories IS 'Tenant-scoped user category master. Examples: Internal User, External User, Contractor, Auditor, Guest.';

-- ============================================================================
-- 4. ALTER USERS TABLE — Add department_id, designation_id, user_category_id
-- ==========================================================================

-- Add department_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE users ADD CONSTRAINT fk_users_department_id
    FOREIGN KEY (department_id) REFERENCES departments(id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Add designation_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS designation_id UUID;
ALTER TABLE users ADD CONSTRAINT fk_users_designation_id
    FOREIGN KEY (designation_id) REFERENCES designations(id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Add user_category_id column
ALTER TABLE users ADD COLUMN IF NOT EXISTS user_category_id UUID;
ALTER TABLE users ADD CONSTRAINT fk_users_user_category_id
    FOREIGN KEY (user_category_id) REFERENCES user_categories(id)
    ON UPDATE CASCADE ON DELETE SET NULL;

-- Indexes on new user columns
CREATE INDEX IF NOT EXISTS idx_users_department_id ON users(department_id);
CREATE INDEX IF NOT EXISTS idx_users_designation_id ON users(designation_id);
CREATE INDEX IF NOT EXISTS idx_users_user_category_id ON users(user_category_id);

COMMENT ON COLUMN users.department_id IS 'FK to departments table. Tenant-scoped department assignment.';
COMMENT ON COLUMN users.designation_id IS 'FK to designations table. Tenant-scoped designation assignment.';
COMMENT ON COLUMN users.user_category_id IS 'FK to user_categories table. Tenant-scoped user category (Internal, External, Contractor, etc).';

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================
DO $$
BEGIN
    -- Verify tables created
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'departments') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'designations') AND
       EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_categories') THEN
        RAISE NOTICE '✅ Phase 27: All 3 master tables created successfully';
    ELSE
        RAISE EXCEPTION '❌ Phase 27: Table creation failed';
    END IF;

    -- Verify users columns added
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'department_id') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'designation_id') AND
       EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'user_category_id') THEN
        RAISE NOTICE '✅ Phase 27: All 3 FK columns added to users table';
    ELSE
        RAISE EXCEPTION '❌ Phase 27: Users table ALTER failed';
    END IF;

    RAISE NOTICE '✅ Phase 27: Departments, Designations & User Categories migration completed';
    RAISE NOTICE '   - departments table (hierarchical, tenant-scoped)';
    RAISE NOTICE '   - designations table (tenant-scoped)';
    RAISE NOTICE '   - user_categories table (tenant-scoped)';
    RAISE NOTICE '   - users.department_id, designation_id, user_category_id added';
END
$$;

COMMIT;
