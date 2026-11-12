-- SmartBridge InternFlow - LAUNCHPAD Shared Database Schema
-- Migration 001: Core tables, constraints, indexes, and updated_at triggers

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- Helper trigger for automatic updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 1. Profiles & Roles (linked 1:1 with auth.users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MENTOR', 'INTERN')),
  avatar_url TEXT,
  phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 2. Batches
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Upcoming', 'Active', 'Completed', 'Archived')),
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_batch_dates CHECK (end_date >= start_date)
);

CREATE TRIGGER trg_batches_updated_at
  BEFORE UPDATE ON public.batches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 3. Mentors
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mentors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL UNIQUE,
  department TEXT NOT NULL DEFAULT '',
  designation TEXT NOT NULL DEFAULT '',
  technical_domain TEXT NOT NULL DEFAULT '',
  areas_of_expertise TEXT[] NOT NULL DEFAULT '{}',
  joining_date DATE,
  notification_preferences JSONB NOT NULL DEFAULT '{"in_app": true, "email": true, "task_submissions": true, "monthly_reports": true, "evaluations": true, "certifications": true}'::jsonb,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_mentors_updated_at
  BEFORE UPDATE ON public.mentors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 4. Interns
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.interns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  intern_code TEXT NOT NULL UNIQUE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  assigned_domain TEXT NOT NULL DEFAULT '',
  current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 0 AND 4),
  stage_start_date DATE,
  stage_end_date DATE,
  program_progress NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (program_progress BETWEEN 0 AND 100),
  joining_date DATE NOT NULL DEFAULT CURRENT_DATE,
  personal_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  academic_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  program_info JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'Active' CHECK (status IN ('Active', 'Needs Attention', 'On Hold', 'Completed', 'Inactive')),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interns_batch ON public.interns(batch_id);
CREATE INDEX IF NOT EXISTS idx_interns_stage ON public.interns(current_stage);

CREATE TRIGGER trg_interns_updated_at
  BEFORE UPDATE ON public.interns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 5. Mentor Assignments (Admin-managed mapping)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mentor_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  historical_access_allowed BOOLEAN NOT NULL DEFAULT FALSE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  assigned_by UUID REFERENCES public.profiles(id),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mentor_assignments_mentor ON public.mentor_assignments(mentor_id, is_active);
CREATE INDEX IF NOT EXISTS idx_mentor_assignments_intern ON public.mentor_assignments(intern_id, is_active);

CREATE TRIGGER trg_mentor_assignments_updated_at
  BEFORE UPDATE ON public.mentor_assignments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 6. Shared LAUNCHPAD Configuration (KPI Weights, Stages, L1/L2/L3 Thresholds)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.launchpad_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  config_value JSONB NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (approval_status IN ('PENDING_APPROVAL', 'APPROVED')),
  description TEXT,
  updated_by UUID REFERENCES public.profiles(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. Week 0 Baseline Assessments
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.baseline_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  assessed_by UUID REFERENCES public.mentors(id),
  assessment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  skills_assessed JSONB NOT NULL DEFAULT '[]'::jsonb,
  criteria_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  comments TEXT,
  evidence_files JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Draft', 'Submitted', 'Reviewed')),
  is_historical BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_baseline_intern ON public.baseline_assessments(intern_id);

CREATE TRIGGER trg_baseline_updated_at
  BEFORE UPDATE ON public.baseline_assessments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 8. Tasks, Task Submissions & Task Reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  instructions TEXT,
  learning_objectives TEXT,
  category TEXT NOT NULL DEFAULT 'Technical',
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 0 AND 4),
  kpi_pillar TEXT NOT NULL CHECK (kpi_pillar IN ('LEARN', 'BUILD', 'SHARE', 'SHOWCASE')),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  batch_id UUID REFERENCES public.batches(id) ON DELETE SET NULL,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  priority TEXT NOT NULL DEFAULT 'Medium' CHECK (priority IN ('Low', 'Medium', 'High', 'Critical')),
  attachment_path TEXT,
  submission_instructions TEXT,
  expected_deliverables TEXT,
  max_marks NUMERIC(6,2) CHECK (max_marks IS NULL OR max_marks > 0),
  status TEXT NOT NULL DEFAULT 'Assigned' CHECK (status IN (
    'Draft', 'Assigned', 'In Progress', 'Submitted', 'Under Review',
    'Revision Requested', 'Resubmitted', 'Reviewed', 'Completed', 'Overdue'
  )),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_task_dates CHECK (due_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_tasks_mentor_intern ON public.tasks(mentor_id, intern_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status_due ON public.tasks(status, due_date);

CREATE TRIGGER trg_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.task_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL DEFAULT 1 CHECK (version_number >= 1),
  submission_notes TEXT,
  submission_url TEXT,
  attachment_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'Under Review', 'Revision Requested', 'Resubmitted', 'Approved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (task_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_task_submissions_task ON public.task_submissions(task_id, version_number DESC);

CREATE TABLE IF NOT EXISTS public.task_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID NOT NULL REFERENCES public.task_submissions(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  technical_correctness TEXT,
  quality_of_work TEXT,
  understanding TEXT,
  problem_solving TEXT,
  areas_of_improvement TEXT,
  general_comments TEXT,
  improvement_suggestions TEXT,
  marks_awarded NUMERIC(6,2) CHECK (marks_awarded IS NULL OR marks_awarded >= 0),
  decision TEXT NOT NULL CHECK (decision IN ('Draft', 'Approved', 'Revision Requested', 'Completed')),
  is_complete BOOLEAN NOT NULL DEFAULT FALSE,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_task_reviews_submission ON public.task_reviews(submission_id);

CREATE TRIGGER trg_task_reviews_updated_at
  BEFORE UPDATE ON public.task_reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 9. Monthly Reports & KPI Evaluations (Exact formula enforced in DB)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.monthly_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  reporting_month TEXT NOT NULL, -- YYYY-MM format
  submission_date TIMESTAMPTZ,
  work_completed TEXT,
  learning_activities TEXT,
  technical_skills TEXT,
  tasks_completed_summary TEXT,
  projects_milestones_summary TEXT,
  knowledge_sharing TEXT,
  demonstrations TEXT,
  supporting_evidence JSONB NOT NULL DEFAULT '[]'::jsonb,
  self_assessment TEXT,
  intern_comments TEXT,
  status TEXT NOT NULL DEFAULT 'Not Submitted' CHECK (status IN (
    'Not Submitted', 'Submitted', 'Under Review', 'Revision Requested', 'Resubmitted', 'Reviewed', 'Approved'
  )),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (intern_id, reporting_month)
);

CREATE INDEX IF NOT EXISTS idx_monthly_reports_intern_month ON public.monthly_reports(intern_id, reporting_month);

CREATE TRIGGER trg_monthly_reports_updated_at
  BEFORE UPDATE ON public.monthly_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.kpi_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  monthly_report_id UUID NOT NULL REFERENCES public.monthly_reports(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  reporting_month TEXT NOT NULL,
  learn_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (learn_score BETWEEN 0 AND 100),
  build_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (build_score BETWEEN 0 AND 100),
  share_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (share_score BETWEEN 0 AND 100),
  showcase_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (showcase_score BETWEEN 0 AND 100),
  overall_score NUMERIC(6,2) GENERATED ALWAYS AS (
    ROUND((learn_score * 0.25) + (build_score * 0.45) + (share_score * 0.15) + (showcase_score * 0.15), 2)
  ) STORED,
  pillar_details JSONB NOT NULL DEFAULT '{}'::jsonb,
  comments TEXT,
  improvement_suggestions TEXT,
  review_status TEXT NOT NULL DEFAULT 'Draft' CHECK (review_status IN ('Draft', 'Revision Requested', 'Reviewed', 'Approved')),
  version_number INTEGER NOT NULL DEFAULT 1,
  is_current BOOLEAN NOT NULL DEFAULT TRUE,
  reviewed_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_evaluations_report ON public.kpi_evaluations(monthly_report_id, version_number DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_evaluations_intern ON public.kpi_evaluations(intern_id, is_current);

CREATE TRIGGER trg_kpi_evaluations_updated_at
  BEFORE UPDATE ON public.kpi_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 10. Stage Evaluations & Progression Decisions
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.stage_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 1 AND 4),
  metric_scores JSONB NOT NULL DEFAULT '[]'::jsonb,
  total_score NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (total_score BETWEEN 0 AND 100),
  classification_label TEXT,
  classification_approval_status TEXT NOT NULL DEFAULT 'PENDING_APPROVAL' CHECK (classification_approval_status IN ('PENDING_APPROVAL', 'APPROVED')),
  comments TEXT,
  recommendations TEXT,
  evidence_refs JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL DEFAULT 'Draft' CHECK (status IN ('Draft', 'Submitted', 'Admin Reviewed')),
  evaluation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  submitted_at TIMESTAMPTZ,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_historical BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_stage_evaluations_intern ON public.stage_evaluations(intern_id, stage_number);

CREATE TRIGGER trg_stage_evaluations_updated_at
  BEFORE UPDATE ON public.stage_evaluations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.progression_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  stage_evaluation_id UUID REFERENCES public.stage_evaluations(id) ON DELETE SET NULL,
  from_stage INTEGER NOT NULL CHECK (from_stage BETWEEN 0 AND 4),
  to_stage INTEGER CHECK (to_stage BETWEEN 1 AND 4),
  mentor_recommendation TEXT CHECK (mentor_recommendation IN ('Recommend Progression', 'Recommend Conditional Progression', 'Recommend Extension / Improvement Plan', 'Pending')),
  mentor_recommended_by UUID REFERENCES public.mentors(id),
  mentor_recommended_at TIMESTAMPTZ,
  admin_decision TEXT NOT NULL DEFAULT 'Pending' CHECK (admin_decision IN ('Pending', 'Approved', 'Deferred', 'Rejected')),
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER trg_progression_decisions_updated_at
  BEFORE UPDATE ON public.progression_decisions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 11. Projects, Milestones & Reviews
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES public.mentors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  domain TEXT NOT NULL DEFAULT '',
  current_stage INTEGER NOT NULL DEFAULT 1 CHECK (current_stage BETWEEN 1 AND 4),
  problem_statement JSONB NOT NULL DEFAULT '{}'::jsonb,
  problem_statement_status TEXT NOT NULL DEFAULT 'Draft' CHECK (problem_statement_status IN ('Draft', 'Submitted', 'Under Review', 'Changes Requested', 'Approved')),
  problem_statement_version INTEGER NOT NULL DEFAULT 1,
  repository_url TEXT,
  start_date DATE,
  expected_completion_date DATE,
  status TEXT NOT NULL DEFAULT 'Planning' CHECK (status IN ('Planning', 'Problem Statement Review', 'In Progress', 'Delayed', 'Under Final Review', 'Completed')),
  last_update TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_projects_intern ON public.projects(intern_id);

CREATE TRIGGER trg_projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN (
    'Research and Analysis', 'Problem Definition', 'Solution Design', 'Development',
    'Implementation', 'Testing', 'Validation', 'Documentation', 'Demonstration', 'Final Defence', 'Custom'
  )),
  description TEXT,
  due_date DATE,
  status TEXT NOT NULL DEFAULT 'Not Started' CHECK (status IN ('Not Started', 'In Progress', 'Submitted', 'Changes Requested', 'Approved')),
  submission_notes TEXT,
  evidence_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  mentor_feedback TEXT,
  reviewed_by UUID REFERENCES public.mentors(id),
  reviewed_at TIMESTAMPTZ,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_milestones_project ON public.project_milestones(project_id, sort_order);

CREATE TRIGGER trg_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.project_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  milestone_id UUID REFERENCES public.project_milestones(id) ON DELETE SET NULL,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  review_type TEXT NOT NULL CHECK (review_type IN ('Problem Statement', 'Milestone', 'General', 'Final Evaluation')),
  technical_quality TEXT,
  problem_solving TEXT,
  implementation_notes TEXT,
  testing_validation TEXT,
  documentation_notes TEXT,
  presentation_notes TEXT,
  comments TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('Approved', 'Changes Requested', 'Feedback Only')),
  version_reviewed INTEGER NOT NULL DEFAULT 1,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 12. Certifications (Week 12 & Week 24 Milestones)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.certifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  milestone_type TEXT NOT NULL CHECK (milestone_type IN ('WEEK_12', 'WEEK_24')),
  certification_name TEXT,
  issuing_organization TEXT,
  issue_date DATE,
  status TEXT NOT NULL DEFAULT 'Missing' CHECK (status IN ('Missing', 'Pending Verification', 'Verified', 'Rejected', 'Additional Evidence Requested')),
  verified_by UUID REFERENCES public.mentors(id),
  verified_at TIMESTAMPTZ,
  admin_approved_by UUID REFERENCES public.profiles(id),
  admin_approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (intern_id, milestone_type)
);

CREATE TRIGGER trg_certifications_updated_at
  BEFORE UPDATE ON public.certifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.certification_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  certification_id UUID NOT NULL REFERENCES public.certifications(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL DEFAULT 0,
  mime_type TEXT NOT NULL DEFAULT 'application/pdf',
  notes TEXT,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  verification_decision TEXT CHECK (verification_decision IN ('Pending', 'Verified', 'Rejected', 'Additional Evidence Requested')),
  mentor_comments TEXT,
  reviewed_by UUID REFERENCES public.mentors(id),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cert_evidence_cert ON public.certification_evidence(certification_id, uploaded_at DESC);

-- ============================================================================
-- 13. Feedback & Mentor-Intern Messages
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.feedback_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN (
    'Technical', 'Task', 'Project', 'Monthly KPI', 'Stage Evaluation',
    'Communication', 'Professional Development', 'Improvement Suggestions', 'General'
  )),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_private_note BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  is_important BOOLEAN NOT NULL DEFAULT FALSE,
  linked_entity_type TEXT,
  linked_entity_id UUID,
  viewed_by_intern_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feedback_intern ON public.feedback_records(intern_id, is_published);

CREATE TRIGGER trg_feedback_records_updated_at
  BEFORE UPDATE ON public.feedback_records
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.mentor_intern_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  sender_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_body TEXT NOT NULL,
  attachment_paths JSONB NOT NULL DEFAULT '[]'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_pair ON public.mentor_intern_messages(mentor_id, intern_id, created_at);

-- ============================================================================
-- 14. Improvement Plans
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.improvement_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
  stage_number INTEGER NOT NULL CHECK (stage_number BETWEEN 0 AND 4),
  identified_weakness TEXT NOT NULL,
  kpi_pillar TEXT CHECK (kpi_pillar IN ('LEARN', 'BUILD', 'SHARE', 'SHOWCASE')),
  evaluation_metric TEXT,
  improvement_objective TEXT NOT NULL,
  recommended_action TEXT NOT NULL,
  learning_resources TEXT,
  assigned_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  target_completion_date DATE NOT NULL,
  follow_up_date DATE,
  status TEXT NOT NULL DEFAULT 'Open' CHECK (status IN ('Open', 'In Progress', 'Under Review', 'Completed', 'Escalated')),
  mentor_comments TEXT,
  outcome TEXT,
  created_by UUID REFERENCES public.profiles(id),
  updated_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_improvement_plans_intern ON public.improvement_plans(intern_id, status);

CREATE TRIGGER trg_improvement_plans_updated_at
  BEFORE UPDATE ON public.improvement_plans
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 15. Optional Attendance / Timesheets (gated by config)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.timesheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intern_id UUID NOT NULL REFERENCES public.interns(id) ON DELETE CASCADE,
  work_date DATE NOT NULL,
  hours_worked NUMERIC(4,2) NOT NULL CHECK (hours_worked >= 0 AND hours_worked <= 24),
  task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Draft', 'Submitted', 'Returned', 'Approved')),
  mentor_comments TEXT,
  reviewed_by UUID REFERENCES public.mentors(id),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (intern_id, work_date)
);

CREATE TRIGGER trg_timesheets_updated_at
  BEFORE UPDATE ON public.timesheets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============================================================================
-- 16. Notifications, Documents & Audit Logs
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link_path TEXT,
  related_entity_type TEXT,
  related_entity_id UUID,
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  email_sent BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON public.notifications(recipient_profile_id, is_read, created_at DESC);

CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  intern_id UUID REFERENCES public.interns(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  storage_bucket TEXT NOT NULL DEFAULT 'internflow-documents',
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  file_size BIGINT NOT NULL CHECK (file_size > 0),
  version_number INTEGER NOT NULL DEFAULT 1,
  uploaded_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_profile_id UUID REFERENCES public.profiles(id),
  actor_role TEXT,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id, created_at DESC);

