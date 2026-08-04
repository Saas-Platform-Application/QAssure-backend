-- ============================================================================
-- PHASE 20: Notifications & Alerts Engine
-- ============================================================================

-- 1. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  notification_type VARCHAR(50) NOT NULL,
  category VARCHAR(100),
  priority VARCHAR(20) DEFAULT 'normal',
  entity_type VARCHAR(100),
  entity_id UUID,
  entity_name VARCHAR(255),
  action_url VARCHAR(500),
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  is_dismissed BOOLEAN DEFAULT FALSE,
  dismissed_at TIMESTAMPTZ,
  channels_sent JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_entity ON notifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- 2. NOTIFICATION PREFERENCES
CREATE TABLE IF NOT EXISTS notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  in_app_enabled BOOLEAN DEFAULT TRUE,
  email_enabled BOOLEAN DEFAULT TRUE,
  email_digest VARCHAR(20) DEFAULT 'instant',
  category_preferences JSONB DEFAULT '{"capa":{"in_app":true,"email":true},"document":{"in_app":true,"email":true},"training":{"in_app":true,"email":true},"supplier":{"in_app":true,"email":true},"workflow":{"in_app":true,"email":true},"system":{"in_app":true,"email":false}}',
  quiet_hours_enabled BOOLEAN DEFAULT FALSE,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON notification_preferences(user_id);

-- 3. NOTIFICATION TEMPLATES
CREATE TABLE IF NOT EXISTS notification_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  code VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  title_template VARCHAR(500) NOT NULL,
  message_template TEXT NOT NULL,
  email_subject_template VARCHAR(500),
  email_body_template TEXT,
  category VARCHAR(100) NOT NULL,
  default_priority VARCHAR(20) DEFAULT 'normal',
  channels VARCHAR(100)[] DEFAULT ARRAY['in_app', 'email'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_notification_templates_unique ON notification_templates(COALESCE(tenant_id, '00000000-0000-0000-0000-000000000000'::uuid), code);
CREATE INDEX IF NOT EXISTS idx_notification_templates_code ON notification_templates(code);
CREATE INDEX IF NOT EXISTS idx_notification_templates_category ON notification_templates(category);

-- 4. ESCALATION RULES
CREATE TABLE IF NOT EXISTS escalation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  entity_type VARCHAR(100) NOT NULL,
  condition_type VARCHAR(100) NOT NULL,
  condition_value INTEGER,
  escalate_to_role VARCHAR(100),
  escalate_to_user_id UUID REFERENCES users(id),
  notification_template_id UUID REFERENCES notification_templates(id),
  check_interval_hours INTEGER DEFAULT 24,
  last_checked_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_rules_tenant ON escalation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_entity ON escalation_rules(entity_type);
CREATE INDEX IF NOT EXISTS idx_escalation_rules_active ON escalation_rules(is_active) WHERE is_active = TRUE;

-- 5. ESCALATION HISTORY
CREATE TABLE IF NOT EXISTS escalation_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  escalation_rule_id UUID REFERENCES escalation_rules(id),
  entity_type VARCHAR(100) NOT NULL,
  entity_id UUID NOT NULL,
  entity_name VARCHAR(255),
  escalated_to_user_id UUID REFERENCES users(id),
  escalated_to_role VARCHAR(100),
  notification_id UUID REFERENCES notifications(id),
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_escalation_history_tenant ON escalation_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_entity ON escalation_history(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_escalation_history_date ON escalation_history(created_at DESC);

-- 6. NOTIFICATION DIGEST QUEUE
CREATE TABLE IF NOT EXISTS notification_digest_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  digest_type VARCHAR(20) NOT NULL,
  scheduled_for DATE NOT NULL,
  is_sent BOOLEAN DEFAULT FALSE,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_digest_queue_scheduled ON notification_digest_queue(scheduled_for, is_sent) WHERE is_sent = FALSE;
CREATE INDEX IF NOT EXISTS idx_digest_queue_user ON notification_digest_queue(user_id);

-- 7. ALERT RULES
CREATE TABLE IF NOT EXISTS alert_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  trigger_event VARCHAR(100) NOT NULL,
  trigger_conditions JSONB DEFAULT '{}',
  notification_template_id UUID REFERENCES notification_templates(id),
  notify_roles VARCHAR(100)[],
  notify_user_ids UUID[],
  notify_owner BOOLEAN DEFAULT TRUE,
  channels VARCHAR(50)[] DEFAULT ARRAY['in_app'],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_alert_rules_tenant ON alert_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_alert_rules_event ON alert_rules(trigger_event);
CREATE INDEX IF NOT EXISTS idx_alert_rules_active ON alert_rules(is_active) WHERE is_active = TRUE;

-- 8. DEFAULT NOTIFICATION TEMPLATES
INSERT INTO notification_templates (tenant_id, code, name, category, title_template, message_template, email_subject_template, email_body_template, default_priority) VALUES
(NULL, 'capa_assigned', 'CAPA Assigned', 'capa', 'CAPA Assigned: {{capa_number}}', 'You have been assigned as owner of {{capa_number}} - {{title}}', '[QAssure] CAPA Assigned: {{capa_number}}', 'You have been assigned as owner of CAPA {{capa_number}}.', 'normal'),
(NULL, 'capa_overdue', 'CAPA Overdue', 'capa', 'CAPA Overdue: {{capa_number}}', '{{capa_number}} - {{title}} is now {{days}} days overdue', '[QAssure] URGENT: CAPA Overdue', 'CAPA {{capa_number}} is now {{days}} days overdue.', 'urgent'),
(NULL, 'capa_closed', 'CAPA Closed', 'capa', 'CAPA Closed: {{capa_number}}', '{{capa_number}} - {{title}} has been closed', '[QAssure] CAPA Closed', 'CAPA {{capa_number}} has been closed.', 'low'),
(NULL, 'training_assigned', 'Training Assigned', 'training', 'Training Assigned: {{course_title}}', 'You have been assigned training: {{course_title}}. Due by {{due_date}}', '[QAssure] Training Assigned', 'You have been assigned training: {{course_title}}.', 'normal'),
(NULL, 'training_due_soon', 'Training Due Soon', 'training', 'Training Due Soon: {{course_title}}', 'Your training {{course_title}} is due in {{days}} days', '[QAssure] Training Due Soon', 'Your training is due soon.', 'high'),
(NULL, 'training_overdue', 'Training Overdue', 'training', 'Training Overdue: {{course_title}}', 'Your training {{course_title}} is {{days}} days overdue', '[QAssure] Training Overdue', 'Your training is overdue.', 'urgent'),
(NULL, 'document_review_due', 'Document Review Due', 'document', 'Document Review Due: {{document_number}}', '{{document_number}} - {{title}} is due for periodic review', '[QAssure] Document Review Due', 'A document is due for review.', 'normal'),
(NULL, 'document_approved', 'Document Approved', 'document', 'Document Approved: {{document_number}}', '{{document_number}} - {{title}} has been approved', '[QAssure] Document Approved', 'Your document has been approved.', 'normal'),
(NULL, 'document_rejected', 'Document Rejected', 'document', 'Document Rejected: {{document_number}}', '{{document_number}} - {{title}} has been rejected', '[QAssure] Document Rejected', 'Your document has been rejected.', 'high'),
(NULL, 'workflow_task_assigned', 'Workflow Task Assigned', 'workflow', 'Task Assigned: {{task_name}}', 'You have a new workflow task: {{task_name}}', '[QAssure] Task Assigned', 'You have been assigned a workflow task.', 'normal'),
(NULL, 'workflow_task_overdue', 'Workflow Task Overdue', 'workflow', 'Task Overdue: {{task_name}}', 'Your task {{task_name}} is {{days}} days overdue', '[QAssure] Task Overdue', 'Your workflow task is overdue.', 'urgent'),
(NULL, 'workflow_escalated', 'Task Escalated', 'workflow', 'Task Escalated: {{task_name}}', 'A task has been escalated to you: {{task_name}}', '[QAssure] Task Escalated', 'A task has been escalated to you.', 'urgent'),
(NULL, 'supplier_expiring', 'Supplier Approval Expiring', 'supplier', 'Supplier Expiring: {{supplier_name}}', 'Supplier {{supplier_code}} approval expires in {{days}} days', '[QAssure] Supplier Expiring', 'A supplier approval is expiring.', 'high'),
(NULL, 'supplier_score_dropped', 'Supplier Score Dropped', 'supplier', 'Supplier Score Alert: {{supplier_name}}', 'Supplier {{supplier_code}} score dropped to {{score}}', '[QAssure] Supplier Score Alert', 'A supplier score has dropped.', 'high'),
(NULL, 'welcome', 'Welcome', 'system', 'Welcome to QAssure!', 'Welcome to QAssure, {{user_name}}!', '[QAssure] Welcome', 'Welcome to QAssure!', 'low')
ON CONFLICT DO NOTHING;

-- VERIFICATION
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name IN ('notifications', 'notification_preferences', 'notification_templates', 'escalation_rules', 'escalation_history', 'notification_digest_queue', 'alert_rules');
  RAISE NOTICE '✅ Phase 20: Created % notification tables', table_count;
END $$;
