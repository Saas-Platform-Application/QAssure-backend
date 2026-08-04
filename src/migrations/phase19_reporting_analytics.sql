-- ============================================================================
-- PHASE 19: Reporting & Analytics Engine
-- Centralized reporting, KPIs, dashboards, and scheduled reports
-- ============================================================================

-- ============================================================================
-- 1. REPORT DEFINITIONS (Saved/Custom Reports)
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Report Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,
  code VARCHAR(100),
  
  -- Type & Category
  report_type VARCHAR(50) NOT NULL,  -- dashboard, list, summary, trend, compliance
  category VARCHAR(100),  -- quality, training, supplier, capa, executive
  module VARCHAR(100),  -- documents, training, capa, suppliers, all
  
  -- Configuration
  config JSONB NOT NULL DEFAULT '{}',  -- filters, columns, grouping, sorting
  chart_type VARCHAR(50),  -- bar, line, pie, table, card
  
  -- Access
  is_system BOOLEAN DEFAULT FALSE,  -- Built-in reports
  is_public BOOLEAN DEFAULT FALSE,  -- Available to all users in tenant
  owner_id UUID REFERENCES users(id),
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, code) 
);

CREATE INDEX IF NOT EXISTS idx_report_defs_tenant ON report_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_defs_category ON report_definitions(category);
CREATE INDEX IF NOT EXISTS idx_report_defs_module ON report_definitions(module);

-- ============================================================================
-- 2. SCHEDULED REPORTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS scheduled_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_definition_id UUID NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE,
  
  -- Schedule
  name VARCHAR(255) NOT NULL,
  schedule_type VARCHAR(50) NOT NULL,  -- daily, weekly, monthly, quarterly
  schedule_config JSONB,  -- {day_of_week: 1, hour: 8, day_of_month: 1}
  
  -- Recipients
  recipients JSONB NOT NULL,  -- [{user_id, email}]
  
  -- Output
  output_format VARCHAR(50) DEFAULT 'pdf',  -- pdf, excel, csv
  include_charts BOOLEAN DEFAULT TRUE,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_tenant ON scheduled_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_next ON scheduled_reports(next_run_at) WHERE is_active = TRUE;

-- ============================================================================
-- 3. REPORT EXECUTION HISTORY
-- ============================================================================

CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  report_definition_id UUID REFERENCES report_definitions(id),
  scheduled_report_id UUID REFERENCES scheduled_reports(id),
  
  -- Execution Info
  report_name VARCHAR(255) NOT NULL,
  executed_by UUID REFERENCES users(id),
  executed_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Parameters used
  parameters JSONB,
  
  -- Results
  status VARCHAR(50) DEFAULT 'completed',  -- running, completed, failed
  row_count INTEGER,
  execution_time_ms INTEGER,
  
  -- Output
  output_path VARCHAR(1000),
  output_format VARCHAR(50),
  file_size BIGINT,
  
  -- Error (if failed)
  error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_report_history_tenant ON report_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_report_history_date ON report_history(executed_at);

-- ============================================================================
-- 4. KPI DEFINITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS kpi_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- KPI Identity
  name VARCHAR(255) NOT NULL,
  code VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Configuration
  module VARCHAR(100) NOT NULL,
  calculation_type VARCHAR(50) NOT NULL,  -- count, percentage, average, sum, ratio
  query_config JSONB NOT NULL,  -- SQL or query parameters
  
  -- Targets
  target_value DECIMAL(15,4),
  target_direction VARCHAR(20),  -- higher_better, lower_better, target
  warning_threshold DECIMAL(15,4),
  critical_threshold DECIMAL(15,4),
  
  -- Display
  unit VARCHAR(50),  -- %, days, count, $
  decimal_places INTEGER DEFAULT 0,
  
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, code)
);

CREATE INDEX IF NOT EXISTS idx_kpi_defs_tenant ON kpi_definitions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_defs_module ON kpi_definitions(module);

-- ============================================================================
-- 5. KPI VALUES (Historical snapshots)
-- ============================================================================

CREATE TABLE IF NOT EXISTS kpi_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  kpi_definition_id UUID NOT NULL REFERENCES kpi_definitions(id) ON DELETE CASCADE,
  
  -- Period
  period_type VARCHAR(20) NOT NULL,  -- daily, weekly, monthly, quarterly, yearly
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Value
  value DECIMAL(15,4) NOT NULL,
  previous_value DECIMAL(15,4),
  change_percent DECIMAL(10,4),
  
  -- Status
  status VARCHAR(20),  -- on_target, warning, critical
  
  calculated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(kpi_definition_id, period_type, period_start)
);

CREATE INDEX IF NOT EXISTS idx_kpi_values_kpi ON kpi_values(kpi_definition_id);
CREATE INDEX IF NOT EXISTS idx_kpi_values_period ON kpi_values(period_start, period_end);

-- ============================================================================
-- 6. DASHBOARD WIDGETS
-- ============================================================================

CREATE TABLE IF NOT EXISTS dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Widget Config
  name VARCHAR(255) NOT NULL,
  widget_type VARCHAR(50) NOT NULL,  -- kpi_card, chart, table, counter, list
  
  -- Data Source
  data_source VARCHAR(100) NOT NULL,  -- kpi, report, query
  source_id UUID,  -- kpi_definition_id or report_definition_id
  query_config JSONB,
  
  -- Display
  size VARCHAR(20) DEFAULT 'medium',  -- small, medium, large, full
  chart_config JSONB,
  
  -- Position (for user dashboards)
  position INTEGER DEFAULT 0,
  
  -- Access
  is_system BOOLEAN DEFAULT FALSE,
  is_default BOOLEAN DEFAULT FALSE,  -- Show by default
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_widgets_tenant ON dashboard_widgets(tenant_id);

-- ============================================================================
-- 7. USER DASHBOARD PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_dashboards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Dashboard Config
  name VARCHAR(255) DEFAULT 'My Dashboard',
  is_default BOOLEAN DEFAULT TRUE,
  
  -- Widgets
  widgets JSONB DEFAULT '[]',  -- [{widget_id, position, size}]
  
  -- Preferences
  refresh_interval INTEGER DEFAULT 300,  -- seconds
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_user_dashboards_user ON user_dashboards(user_id);


-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name IN (
    'report_definitions', 'scheduled_reports', 'report_history',
    'kpi_definitions', 'kpi_values', 'dashboard_widgets', 'user_dashboards'
  );
  
  RAISE NOTICE '✅ Phase 19: Created % reporting & analytics tables', table_count;
END $$;
