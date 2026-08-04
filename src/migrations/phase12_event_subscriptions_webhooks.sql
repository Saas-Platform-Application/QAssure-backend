-- =====================================================
-- Phase 12: Cross-Module Communication Tables
-- Event Subscriptions & Webhooks
-- =====================================================

-- Event Subscriptions: Modules/services subscribe to event types
CREATE TABLE IF NOT EXISTS event_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Subscriber Info
    module_code VARCHAR(100),
    subscriber_name VARCHAR(255) NOT NULL,
    
    -- Event Configuration
    event_pattern VARCHAR(255) NOT NULL,
    
    -- Delivery Configuration
    delivery_type VARCHAR(50) NOT NULL DEFAULT 'kafka',
    callback_url VARCHAR(500),
    kafka_topic VARCHAR(255),
    
    -- Filtering
    filters JSONB DEFAULT '{}',
    
    -- Status
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    
    -- Metadata
    description TEXT,
    metadata JSONB DEFAULT '{}',
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_event_sub_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_event_sub_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for event_subscriptions
CREATE INDEX idx_event_sub_tenant ON event_subscriptions(tenant_id);
CREATE INDEX idx_event_sub_module ON event_subscriptions(module_code);
CREATE INDEX idx_event_sub_pattern ON event_subscriptions(event_pattern);
CREATE INDEX idx_event_sub_status ON event_subscriptions(status);

-- Webhooks: External HTTP endpoints for event delivery
CREATE TABLE IF NOT EXISTS webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    
    -- Webhook Info
    name VARCHAR(255) NOT NULL,
    description TEXT,
    url VARCHAR(500) NOT NULL,
    
    -- Authentication
    secret VARCHAR(255),
    auth_type VARCHAR(50) DEFAULT 'none',
    auth_config JSONB DEFAULT '{}',
    
    -- Events to deliver
    events JSONB NOT NULL DEFAULT '[]',
    
    -- HTTP Configuration
    method VARCHAR(10) DEFAULT 'POST',
    headers JSONB DEFAULT '{}',
    timeout_ms INTEGER DEFAULT 30000,
    
    -- Retry Configuration
    retry_enabled BOOLEAN DEFAULT true,
    max_retries INTEGER DEFAULT 3,
    retry_delay_ms INTEGER DEFAULT 1000,
    
    -- Status & Stats
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    last_triggered_at TIMESTAMP WITH TIME ZONE,
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    
    -- Audit
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_webhook_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) ON DELETE CASCADE,
    CONSTRAINT fk_webhook_created_by FOREIGN KEY (created_by) 
        REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for webhooks
CREATE INDEX idx_webhook_tenant ON webhooks(tenant_id);
CREATE INDEX idx_webhook_status ON webhooks(status);
CREATE INDEX idx_webhook_events ON webhooks USING GIN(events);

-- Webhook Deliveries: Track webhook delivery attempts
CREATE TABLE IF NOT EXISTS webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL,
    tenant_id UUID NOT NULL,
    
    -- Event Info
    event_id VARCHAR(100),
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    
    -- Delivery Status
    status VARCHAR(50) NOT NULL DEFAULT 'pending',
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    
    -- Response Info
    response_status INTEGER,
    response_body TEXT,
    response_time_ms INTEGER,
    
    -- Error Info
    error_message TEXT,
    
    -- Timestamps
    scheduled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_delivery_webhook FOREIGN KEY (webhook_id) 
        REFERENCES webhooks(id) ON DELETE CASCADE,
    CONSTRAINT fk_delivery_tenant FOREIGN KEY (tenant_id) 
        REFERENCES tenants(id) ON DELETE CASCADE
);

-- Indexes for webhook_deliveries
CREATE INDEX idx_delivery_webhook ON webhook_deliveries(webhook_id);
CREATE INDEX idx_delivery_tenant ON webhook_deliveries(tenant_id);
CREATE INDEX idx_delivery_status ON webhook_deliveries(status);
CREATE INDEX idx_delivery_event_type ON webhook_deliveries(event_type);
CREATE INDEX idx_delivery_next_retry ON webhook_deliveries(next_retry_at) WHERE status = 'pending';

-- Add comments
COMMENT ON TABLE event_subscriptions IS 'Module subscriptions to event types for cross-module communication';
COMMENT ON TABLE webhooks IS 'External webhook endpoints for event delivery';
COMMENT ON TABLE webhook_deliveries IS 'Webhook delivery attempts and status tracking';

