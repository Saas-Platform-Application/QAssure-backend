-- QMS Connections Table
CREATE TABLE IF NOT EXISTS qms_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    system_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    credentials TEXT NOT NULL,  -- Encrypted
    settings JSONB DEFAULT '{}',
    sync_config JSONB DEFAULT '{}',
    status VARCHAR(50) DEFAULT 'pending',
    last_connected_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qms_connections_tenant ON qms_connections(tenant_id);
CREATE INDEX IF NOT EXISTS idx_qms_connections_status ON qms_connections(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_qms_connections_system ON qms_connections(system_type);

-- QMS Entity Mappings Table
CREATE TABLE IF NOT EXISTS qms_entity_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES qms_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    source_field VARCHAR(255) NOT NULL,
    target_field VARCHAR(255) NOT NULL,
    transformation VARCHAR(100),
    is_required BOOLEAN DEFAULT false,
    default_value TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qms_entity_mappings_connection ON qms_entity_mappings(connection_id);
CREATE INDEX IF NOT EXISTS idx_qms_entity_mappings_entity ON qms_entity_mappings(connection_id, entity_type);

-- QMS Sync Jobs Table
CREATE TABLE IF NOT EXISTS qms_sync_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES qms_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    job_type VARCHAR(50) NOT NULL,  -- 'full', 'incremental'
    direction VARCHAR(50) NOT NULL,  -- 'inbound', 'outbound', 'bidirectional'
    entity_types JSONB DEFAULT '[]',
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    progress_message TEXT,
    total_records INTEGER DEFAULT 0,
    synced_records INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    errors JSONB DEFAULT '[]',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_qms_sync_jobs_connection ON qms_sync_jobs(connection_id);
CREATE INDEX IF NOT EXISTS idx_qms_sync_jobs_status ON qms_sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_qms_sync_jobs_tenant ON qms_sync_jobs(tenant_id);

-- QMS Sync Conflicts Table
CREATE TABLE IF NOT EXISTS qms_sync_conflicts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES qms_connections(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    source_data JSONB NOT NULL,
    target_data JSONB NOT NULL,
    conflict_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    resolution VARCHAR(50),
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_qms_sync_conflicts_connection ON qms_sync_conflicts(connection_id);
CREATE INDEX IF NOT EXISTS idx_qms_sync_conflicts_status ON qms_sync_conflicts(status);
CREATE INDEX IF NOT EXISTS idx_qms_sync_conflicts_tenant ON qms_sync_conflicts(tenant_id);
