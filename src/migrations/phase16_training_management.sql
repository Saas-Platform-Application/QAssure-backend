-- ============================================================================
-- PHASE 16: Training Management (AiTM - AI Training Manager)
-- Employee training, competency tracking, and certification management
-- ============================================================================

-- ============================================================================
-- 1. TRAINING COURSES
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Course Identity
  course_code VARCHAR(100) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,
  
  -- Classification
  course_type VARCHAR(50) NOT NULL,  -- online, classroom, on_the_job, self_study, external
  category VARCHAR(100),  -- compliance, technical, safety, quality, leadership
  
  -- Content
  duration_hours DECIMAL(5,2),
  passing_score INTEGER DEFAULT 80,
  max_attempts INTEGER DEFAULT 3,
  
  -- Requirements
  prerequisites TEXT[],  -- Array of course IDs
  required_for_roles TEXT[],  -- Roles that must complete this
  required_for_departments TEXT[],
  
  -- Status
  status VARCHAR(50) DEFAULT 'draft',  -- draft, active, archived
  version VARCHAR(20) DEFAULT '1.0',
  
  -- Recertification
  requires_recertification BOOLEAN DEFAULT FALSE,
  recertification_months INTEGER,
  
  -- Content References
  content_url VARCHAR(1000),
  document_id UUID REFERENCES documents(id),  -- Link to controlled document
  
  -- Audit
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, course_code)
);

CREATE INDEX IF NOT EXISTS idx_training_courses_tenant ON training_courses(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_courses_status ON training_courses(status);
CREATE INDEX IF NOT EXISTS idx_training_courses_type ON training_courses(course_type);

-- ============================================================================
-- 2. TRAINING CURRICULA (Groups of courses)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_curricula (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Target Audience
  target_roles TEXT[],
  target_departments TEXT[],
  
  -- Status
  status VARCHAR(50) DEFAULT 'active',
  
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curricula_tenant ON training_curricula(tenant_id);

-- ============================================================================
-- 3. CURRICULUM COURSES (Courses in a curriculum)
-- ============================================================================

CREATE TABLE IF NOT EXISTS curriculum_courses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  curriculum_id UUID NOT NULL REFERENCES training_curricula(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  
  sequence INTEGER NOT NULL,
  is_required BOOLEAN DEFAULT TRUE,
  
  UNIQUE(curriculum_id, course_id)
);

-- ============================================================================
-- 4. TRAINING ASSIGNMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- What
  course_id UUID NOT NULL REFERENCES training_courses(id),
  curriculum_id UUID REFERENCES training_curricula(id),
  
  -- Who
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Assignment Info
  assigned_by UUID REFERENCES users(id),
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  reason VARCHAR(255),  -- new_hire, recertification, document_update, role_change
  
  -- Dates
  due_date DATE,
  extended_due_date DATE,
  extension_reason TEXT,
  
  -- Status
  status VARCHAR(50) DEFAULT 'assigned',  -- assigned, in_progress, completed, overdue, waived
  
  -- Progress
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  attempts INTEGER DEFAULT 0,
  
  -- Results
  score DECIMAL(5,2),
  passed BOOLEAN,
  
  -- Waiver (if training was waived)
  waived_by UUID REFERENCES users(id),
  waived_at TIMESTAMPTZ,
  waiver_reason TEXT,
  
  -- Workflow
  workflow_instance_id UUID REFERENCES workflow_instances(id),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_assignments_tenant ON training_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_user ON training_assignments(user_id, status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_course ON training_assignments(course_id);
CREATE INDEX IF NOT EXISTS idx_training_assignments_status ON training_assignments(status);
CREATE INDEX IF NOT EXISTS idx_training_assignments_due ON training_assignments(due_date) WHERE status IN ('assigned', 'in_progress');

-- ============================================================================
-- 5. TRAINING RECORDS (Completed training history)
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES training_assignments(id),
  
  -- What
  course_id UUID NOT NULL REFERENCES training_courses(id),
  course_code VARCHAR(100),  -- Denormalized for history
  course_title VARCHAR(500),
  course_version VARCHAR(20),
  
  -- Who
  user_id UUID NOT NULL REFERENCES users(id),
  
  -- Completion
  completed_at TIMESTAMPTZ NOT NULL,
  score DECIMAL(5,2),
  passed BOOLEAN NOT NULL,
  
  -- Certification
  certificate_number VARCHAR(100),
  expires_at DATE,
  
  -- Evidence
  signature_id UUID,  -- E-signature acknowledgment
  instructor_id UUID REFERENCES users(id),
  instructor_name VARCHAR(255),
  
  -- External Training
  external_provider VARCHAR(255),
  external_certificate_url VARCHAR(1000),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_training_records_tenant ON training_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_training_records_user ON training_records(user_id);
CREATE INDEX IF NOT EXISTS idx_training_records_course ON training_records(course_id);
CREATE INDEX IF NOT EXISTS idx_training_records_expiry ON training_records(expires_at) WHERE expires_at IS NOT NULL;

-- ============================================================================
-- 6. QUIZ QUESTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES training_courses(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  question_text TEXT NOT NULL,
  question_type VARCHAR(50) DEFAULT 'multiple_choice',  -- multiple_choice, true_false, multi_select
  
  options JSONB NOT NULL,  -- [{id: 'a', text: 'Option A'}, ...]
  correct_answers TEXT[] NOT NULL,  -- ['a'] or ['a', 'c'] for multi-select
  
  points INTEGER DEFAULT 1,
  explanation TEXT,  -- Shown after answering
  
  sequence INTEGER,
  is_active BOOLEAN DEFAULT TRUE,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_course ON training_quiz_questions(course_id);

-- ============================================================================
-- 7. QUIZ ATTEMPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS training_quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id UUID NOT NULL REFERENCES training_assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  attempt_number INTEGER NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  answers JSONB,  -- {question_id: selected_answers}
  score DECIMAL(5,2),
  passed BOOLEAN,
  
  time_spent_seconds INTEGER
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_assignment ON training_quiz_attempts(assignment_id);
CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON training_quiz_attempts(user_id);

-- ============================================================================
-- 8. COMPETENCY MATRIX
-- ============================================================================

CREATE TABLE IF NOT EXISTS competency_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100),
  
  -- Levels
  levels JSONB DEFAULT '[
    {"level": 1, "name": "Awareness", "description": "Basic understanding"},
    {"level": 2, "name": "Knowledge", "description": "Working knowledge"},
    {"level": 3, "name": "Skill", "description": "Can perform independently"},
    {"level": 4, "name": "Mastery", "description": "Expert level"}
  ]',
  
  -- Required for roles
  role_requirements JSONB,  -- {role_name: required_level}
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_competency_defs_tenant ON competency_definitions(tenant_id);

-- ============================================================================
-- 9. USER COMPETENCIES
-- ============================================================================

CREATE TABLE IF NOT EXISTS user_competencies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  competency_id UUID NOT NULL REFERENCES competency_definitions(id) ON DELETE CASCADE,
  
  current_level INTEGER NOT NULL,
  target_level INTEGER,
  
  assessed_at TIMESTAMPTZ DEFAULT NOW(),
  assessed_by UUID REFERENCES users(id),
  
  evidence TEXT,  -- Notes on how competency was demonstrated
  training_record_id UUID REFERENCES training_records(id),
  
  expires_at DATE,
  
  UNIQUE(user_id, competency_id)
);

CREATE INDEX IF NOT EXISTS idx_user_competencies_user ON user_competencies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_competencies_competency ON user_competencies(competency_id);



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
    'training_courses', 'training_curricula', 'curriculum_courses',
    'training_assignments', 'training_records', 'training_quiz_questions',
    'training_quiz_attempts', 'competency_definitions', 'user_competencies'
  );
  
  RAISE NOTICE '✅ Phase 16: Created % training management tables', table_count;
END $$;
