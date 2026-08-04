-- ============================================================================
-- PHASE 22: System Configuration
-- Platform settings, branding, security policies, feature flags
-- ============================================================================

-- ============================================================================
-- 1. SYSTEM SETTINGS (Platform-wide configuration)
-- ============================================================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global
  
  -- Setting Identity
  category VARCHAR(100) NOT NULL,  -- general, security, email, integration, branding
  setting_key VARCHAR(255) NOT NULL,
  setting_value TEXT,
  value_type VARCHAR(50) DEFAULT 'string',  -- string, number, boolean, json, encrypted
  
  -- Metadata
  display_name VARCHAR(255),
  description TEXT,
  is_sensitive BOOLEAN DEFAULT FALSE,
  is_readonly BOOLEAN DEFAULT FALSE,
  
  -- Validation
  validation_rules JSONB,  -- {min, max, pattern, options}
  default_value TEXT,
  
  -- Audit
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_system_settings_unique 
  ON system_settings(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), category, setting_key);
CREATE INDEX IF NOT EXISTS idx_system_settings_tenant ON system_settings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_system_settings_category ON system_settings(category);

-- ============================================================================
-- 2. BRANDING CONFIGURATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS branding_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  
  -- Logo & Images
  logo_url VARCHAR(500),
  logo_dark_url VARCHAR(500),
  favicon_url VARCHAR(500),
  login_background_url VARCHAR(500),
  
  -- Colors
  primary_color VARCHAR(20) DEFAULT '#1976d2',
  secondary_color VARCHAR(20) DEFAULT '#dc004e',
  accent_color VARCHAR(20) DEFAULT '#ff9800',
  background_color VARCHAR(20) DEFAULT '#ffffff',
  text_color VARCHAR(20) DEFAULT '#333333',
  
  -- Typography
  font_family VARCHAR(100) DEFAULT 'Inter, sans-serif',
  heading_font_family VARCHAR(100),
  
  -- Custom CSS
  custom_css TEXT,
  
  -- Footer & Legal
  footer_text VARCHAR(500),
  copyright_text VARCHAR(255),
  privacy_policy_url VARCHAR(500),
  terms_of_service_url VARCHAR(500),
  
  -- Email Branding
  email_header_html TEXT,
  email_footer_html TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_branding_config_tenant ON branding_config(tenant_id);

-- ============================================================================
-- 3. SECURITY POLICIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS security_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  
  -- Password Policies
  password_min_length INTEGER DEFAULT 8,
  password_require_uppercase BOOLEAN DEFAULT TRUE,
  password_require_lowercase BOOLEAN DEFAULT TRUE,
  password_require_numbers BOOLEAN DEFAULT TRUE,
  password_require_special BOOLEAN DEFAULT TRUE,
  password_expiry_days INTEGER DEFAULT 90,
  password_history_count INTEGER DEFAULT 5,
  
  -- MFA Settings
  mfa_required BOOLEAN DEFAULT FALSE,
  mfa_methods TEXT[] DEFAULT ARRAY['totp'],  -- totp, sms, email
  mfa_grace_period_days INTEGER DEFAULT 7,
  
  -- Session Settings
  session_timeout_minutes INTEGER DEFAULT 480,
  max_concurrent_sessions INTEGER DEFAULT 5,
  session_extend_on_activity BOOLEAN DEFAULT TRUE,
  
  -- Login Security
  max_login_attempts INTEGER DEFAULT 5,
  lockout_duration_minutes INTEGER DEFAULT 30,
  require_captcha_after_attempts INTEGER DEFAULT 3,
  
  -- IP Restrictions
  ip_allowlist_enabled BOOLEAN DEFAULT FALSE,
  ip_allowlist TEXT[],
  ip_blocklist TEXT[],
  
  -- API Security
  api_rate_limit_per_minute INTEGER DEFAULT 100,
  api_rate_limit_per_hour INTEGER DEFAULT 1000,
  require_api_key_for_public BOOLEAN DEFAULT TRUE,
  
  -- Data Retention
  audit_log_retention_days INTEGER DEFAULT 2555,  -- 7 years
  session_log_retention_days INTEGER DEFAULT 90,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_policies_tenant ON security_policies(tenant_id);

-- ============================================================================
-- 4. FEATURE FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global
  
  -- Flag Identity
  flag_key VARCHAR(100) NOT NULL,
  flag_name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- State
  is_enabled BOOLEAN DEFAULT FALSE,
  
  -- Rollout Configuration
  rollout_percentage INTEGER DEFAULT 100,  -- 0-100
  rollout_strategy VARCHAR(50) DEFAULT 'all',  -- all, percentage, user_ids, roles
  rollout_config JSONB,  -- {user_ids: [], roles: [], conditions: {}}
  
  -- Scheduling
  enabled_from TIMESTAMPTZ,
  enabled_until TIMESTAMPTZ,
  
  -- Metadata
  category VARCHAR(100),
  tags TEXT[],
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_feature_flags_unique 
  ON feature_flags(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), flag_key);
CREATE INDEX IF NOT EXISTS idx_feature_flags_tenant ON feature_flags(tenant_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled) WHERE is_enabled = TRUE;

-- ============================================================================
-- 5. WEBHOOK CONFIGURATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Webhook Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Endpoint
  url VARCHAR(1000) NOT NULL,
  http_method VARCHAR(10) DEFAULT 'POST',
  
  -- Authentication
  auth_type VARCHAR(50) DEFAULT 'none',  -- none, bearer, basic, api_key, hmac
  auth_config JSONB,  -- {token, username, password, api_key, secret}
  
  -- Events
  events TEXT[] NOT NULL,  -- ['capa.created', 'document.approved', ...]
  
  -- Headers
  custom_headers JSONB,
  
  -- Retry Configuration
  retry_count INTEGER DEFAULT 3,
  retry_delay_seconds INTEGER DEFAULT 60,
  timeout_seconds INTEGER DEFAULT 30,
  
  -- State
  is_active BOOLEAN DEFAULT TRUE,
  last_triggered_at TIMESTAMPTZ,
  last_status VARCHAR(50),
  failure_count INTEGER DEFAULT 0,
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_configs_tenant ON webhook_configs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_configs_active ON webhook_configs(tenant_id, is_active) WHERE is_active = TRUE;

-- ============================================================================
-- 6. WEBHOOK DELIVERY LOGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS webhook_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  webhook_id UUID NOT NULL REFERENCES webhook_configs(id) ON DELETE CASCADE,
  
  -- Event Info
  event_type VARCHAR(100) NOT NULL,
  event_id UUID,
  payload JSONB,
  
  -- Delivery Info
  request_url VARCHAR(1000),
  request_headers JSONB,
  request_body TEXT,
  
  -- Response Info
  response_status INTEGER,
  response_headers JSONB,
  response_body TEXT,
  
  -- Timing
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  
  -- Status
  status VARCHAR(50) NOT NULL,  -- pending, success, failed, retrying
  attempt_number INTEGER DEFAULT 1,
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_webhook ON webhook_delivery_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_status ON webhook_delivery_logs(status);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_created ON webhook_delivery_logs(created_at DESC);

-- ============================================================================
-- 7. EMAIL TEMPLATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,  -- NULL = global
  
  -- Template Identity
  template_code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Content
  subject_template VARCHAR(500) NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  
  -- Variables
  variables JSONB,  -- [{name, description, required}]
  
  -- Metadata
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT TRUE,
  
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_email_templates_unique 
  ON email_templates(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), template_code);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);

-- ============================================================================
-- 8. SMTP CONFIGURATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS smtp_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  
  -- SMTP Server
  host VARCHAR(255) NOT NULL,
  port INTEGER DEFAULT 587,
  secure BOOLEAN DEFAULT FALSE,
  
  -- Authentication
  username VARCHAR(255),
  password_encrypted VARCHAR(500),
  
  -- Sender
  from_email VARCHAR(255) NOT NULL,
  from_name VARCHAR(255),
  reply_to_email VARCHAR(255),
  
  -- Settings
  max_connections INTEGER DEFAULT 5,
  rate_limit_per_minute INTEGER DEFAULT 100,
  
  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_tested_at TIMESTAMPTZ,
  last_test_status VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smtp_configs_tenant ON smtp_configs(tenant_id);

-- ============================================================================
-- 9. DEFAULT SETTINGS INSERTS
-- ============================================================================

-- Global System Settings
INSERT INTO system_settings (tenant_id, category, setting_key, setting_value, value_type, display_name, description) VALUES
-- General
(NULL, 'general', 'platform_name', 'QAssure.ai', 'string', 'Platform Name', 'Name displayed in UI and emails'),
(NULL, 'general', 'default_timezone', 'UTC', 'string', 'Default Timezone', 'Default timezone for new tenants'),
(NULL, 'general', 'default_language', 'en', 'string', 'Default Language', 'Default language code'),
(NULL, 'general', 'date_format', 'YYYY-MM-DD', 'string', 'Date Format', 'Default date display format'),
(NULL, 'general', 'time_format', 'HH:mm:ss', 'string', 'Time Format', 'Default time display format'),
(NULL, 'general', 'maintenance_mode', 'false', 'boolean', 'Maintenance Mode', 'Enable maintenance mode'),
(NULL, 'general', 'maintenance_message', 'System is under maintenance', 'string', 'Maintenance Message', 'Message shown during maintenance'),

-- Session
(NULL, 'session', 'session_timeout_minutes', '480', 'number', 'Session Timeout', 'Minutes until session expires'),
(NULL, 'session', 'refresh_token_days', '7', 'number', 'Refresh Token Validity', 'Days refresh token is valid'),
(NULL, 'session', 'max_concurrent_sessions', '5', 'number', 'Max Concurrent Sessions', 'Maximum active sessions per user'),

-- File Upload
(NULL, 'files', 'max_file_size_mb', '100', 'number', 'Max File Size (MB)', 'Maximum upload file size'),
(NULL, 'files', 'allowed_extensions', '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt,.csv', 'string', 'Allowed Extensions', 'Comma-separated list of allowed extensions'),

-- Notifications
(NULL, 'notifications', 'email_enabled', 'true', 'boolean', 'Email Notifications', 'Enable email notifications'),
(NULL, 'notifications', 'digest_time', '08:00', 'string', 'Daily Digest Time', 'Time to send daily digest emails')
ON CONFLICT DO NOTHING;

-- Default Security Policy
INSERT INTO security_policies (tenant_id) VALUES (NULL) ON CONFLICT DO NOTHING;

-- Default Feature Flags
INSERT INTO feature_flags (tenant_id, flag_key, flag_name, description, is_enabled, category) VALUES
(NULL, 'ai_assistant', 'AI Assistant', 'Enable AI-powered assistant features', TRUE, 'ai'),
(NULL, 'rag_search', 'RAG Search', 'Enable knowledge base search with RAG', TRUE, 'ai'),
(NULL, 'document_ocr', 'Document OCR', 'Enable OCR for uploaded documents', TRUE, 'documents'),
(NULL, 'real_time_sync', 'Real-Time QMS Sync', 'Enable real-time sync with external QMS', FALSE, 'integration'),
(NULL, 'advanced_analytics', 'Advanced Analytics', 'Enable advanced analytics dashboards', TRUE, 'reporting'),
(NULL, 'bulk_operations', 'Bulk Operations', 'Enable bulk create/update/delete', TRUE, 'general'),
(NULL, 'export_to_excel', 'Excel Export', 'Enable export to Excel format', TRUE, 'reporting'),
(NULL, 'scheduled_reports', 'Scheduled Reports', 'Enable scheduled report delivery', TRUE, 'reporting'),
(NULL, 'webhooks', 'Webhooks', 'Enable outgoing webhooks', TRUE, 'integration'),
(NULL, 'audit_log_export', 'Audit Log Export', 'Enable audit log export', TRUE, 'security')
ON CONFLICT DO NOTHING;

-- Default Email Templates
INSERT INTO email_templates (tenant_id, template_code, name, subject_template, body_html, category) VALUES
(NULL, 'welcome', 'Welcome Email', 'Welcome to {{platform_name}}!', 
 '<h1>Welcome {{user_name}}!</h1><p>Your account has been created on {{platform_name}}.</p><p>Click <a href="{{login_url}}">here</a> to login.</p>', 'onboarding'),
(NULL, 'password_reset', 'Password Reset', 'Reset your {{platform_name}} password',
 '<h1>Password Reset Request</h1><p>Hi {{user_name}},</p><p>Click <a href="{{reset_url}}">here</a> to reset your password. This link expires in {{expiry_hours}} hours.</p>', 'auth'),
(NULL, 'mfa_code', 'MFA Verification Code', 'Your verification code: {{code}}',
 '<h1>Verification Code</h1><p>Your verification code is: <strong>{{code}}</strong></p><p>This code expires in {{expiry_minutes}} minutes.</p>', 'auth'),
(NULL, 'task_assigned', 'Task Assigned', 'New task assigned: {{task_name}}',
 '<h1>New Task Assigned</h1><p>Hi {{user_name}},</p><p>You have been assigned: <strong>{{task_name}}</strong></p><p>Due: {{due_date}}</p>', 'workflow'),
(NULL, 'capa_overdue', 'CAPA Overdue', 'CAPA {{capa_number}} is overdue',
 '<h1>CAPA Overdue Alert</h1><p>CAPA <strong>{{capa_number}}</strong> was due on {{due_date}} and is now overdue.</p>', 'capa'),
(NULL, 'daily_digest', 'Daily Digest', 'Your {{platform_name}} Daily Digest',
 '<h1>Daily Digest</h1><p>Hi {{user_name}},</p><p>Here is your summary for {{date}}:</p>{{digest_content}}', 'notifications')
ON CONFLICT DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' 
  AND table_name IN ('system_settings', 'branding_config', 'security_policies', 
                     'feature_flags', 'webhook_configs', 'webhook_delivery_logs',
                     'email_templates', 'smtp_configs');
  
  RAISE NOTICE '✅ Phase 22: Created % system configuration tables', table_count;
END $$;
