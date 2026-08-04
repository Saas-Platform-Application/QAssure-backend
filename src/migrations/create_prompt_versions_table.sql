-- Prompt Versions Table (for version history)
CREATE TABLE IF NOT EXISTS ai_prompt_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES ai_prompt_templates(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    template TEXT NOT NULL,
    system_message TEXT,
    variables JSONB DEFAULT '[]',
    default_parameters JSONB DEFAULT '{}',
    change_notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prompt_versions_prompt ON ai_prompt_versions(prompt_id);
CREATE INDEX idx_prompt_versions_version ON ai_prompt_versions(prompt_id, version);

-- Prompt Test Cases Table
CREATE TABLE IF NOT EXISTS ai_prompt_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prompt_id UUID NOT NULL REFERENCES ai_prompt_templates(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    input_variables JSONB NOT NULL DEFAULT '{}',
    expected_output TEXT,
    tags JSONB DEFAULT '[]',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prompt_test_cases_prompt ON ai_prompt_test_cases(prompt_id);
CREATE INDEX idx_prompt_test_cases_tenant ON ai_prompt_test_cases(tenant_id);

-- Prompt Test Results Table
CREATE TABLE IF NOT EXISTS ai_prompt_test_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_id UUID NOT NULL REFERENCES ai_prompt_test_cases(id) ON DELETE CASCADE,
    prompt_version INTEGER NOT NULL,
    provider VARCHAR(100),
    model VARCHAR(100),
    input_variables JSONB,
    output TEXT,
    tokens_used INTEGER,
    cost_usd NUMERIC(10, 6),
    latency_ms INTEGER,
    passed BOOLEAN,
    score NUMERIC(5, 2),
    feedback TEXT,
    run_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_prompt_test_results_case ON ai_prompt_test_results(test_case_id);
CREATE INDEX idx_prompt_test_results_version ON ai_prompt_test_results(prompt_version);
