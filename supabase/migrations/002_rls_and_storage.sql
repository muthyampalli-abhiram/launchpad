-- SmartBridge InternFlow - Row Level Security & Private Storage Policies
-- Migration 002: Enforce role-based and assignment-based access control at DB level

-- ============================================================================
-- Helper Security Functions
-- ============================================================================
CREATE OR REPLACE FUNCTION public.current_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid() AND is_active = TRUE;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_mentor_id()
RETURNS UUID AS $$
  SELECT id FROM public.mentors WHERE profile_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.current_intern_id()
RETURNS UUID AS $$
  SELECT id FROM public.interns WHERE profile_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.mentor_can_access_intern(target_intern_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.mentor_assignments ma
    WHERE ma.intern_id = target_intern_id
      AND ma.mentor_id = public.current_mentor_id()
      AND (ma.is_active = TRUE OR ma.historical_access_allowed = TRUE)
  );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- Enable RLS on all tables
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.launchpad_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.baseline_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stage_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progression_decisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certification_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentor_intern_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.improvement_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Profiles (prevent role self-escalation!)
-- ============================================================================
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (
    id = auth.uid()
    OR public.current_user_role() = 'ADMIN'
    OR (
      public.current_user_role() = 'MENTOR'
      AND id IN (
        SELECT i.profile_id FROM public.interns i WHERE public.mentor_can_access_intern(i.id)
      )
    )
    OR (
      public.current_user_role() = 'INTERN'
      AND id IN (
        SELECT m.profile_id
        FROM public.mentors m
        JOIN public.mentor_assignments ma ON ma.mentor_id = m.id
        WHERE ma.intern_id = public.current_intern_id() AND ma.is_active = TRUE
      )
    )
  );

CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.current_user_role() = 'ADMIN')
  WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR (id = auth.uid() AND role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid()))
  );

CREATE POLICY profiles_admin_insert ON public.profiles
  FOR INSERT WITH CHECK (public.current_user_role() = 'ADMIN');

-- ============================================================================
-- Batches & Configs
-- ============================================================================
CREATE POLICY batches_read ON public.batches FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY batches_admin_write ON public.batches FOR ALL USING (public.current_user_role() = 'ADMIN');

CREATE POLICY configs_read ON public.launchpad_configs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY configs_admin_write ON public.launchpad_configs FOR ALL USING (public.current_user_role() = 'ADMIN');

-- ============================================================================
-- Mentors & Interns & Assignments
-- ============================================================================
CREATE POLICY mentors_select ON public.mentors
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR profile_id = auth.uid()
    OR (
      public.current_user_role() = 'INTERN'
      AND id IN (
        SELECT ma.mentor_id FROM public.mentor_assignments ma
        WHERE ma.intern_id = public.current_intern_id() AND ma.is_active = TRUE
      )
    )
  );

CREATE POLICY mentors_update_own ON public.mentors
  FOR UPDATE USING (profile_id = auth.uid() OR public.current_user_role() = 'ADMIN')
  WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR (
      profile_id = auth.uid()
      AND employee_id = (SELECT m.employee_id FROM public.mentors m WHERE m.id = id)
    )
  );

CREATE POLICY mentors_admin_insert ON public.mentors
  FOR INSERT WITH CHECK (public.current_user_role() = 'ADMIN');

CREATE POLICY interns_select ON public.interns
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR profile_id = auth.uid()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(id))
  );

CREATE POLICY interns_admin_write ON public.interns
  FOR ALL USING (public.current_user_role() = 'ADMIN');

CREATE POLICY assignments_select ON public.mentor_assignments
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR mentor_id = public.current_mentor_id()
    OR intern_id = public.current_intern_id()
  );

CREATE POLICY assignments_admin_write ON public.mentor_assignments
  FOR ALL USING (public.current_user_role() = 'ADMIN');

-- ============================================================================
-- Baseline Assessments
-- ============================================================================
CREATE POLICY baseline_select ON public.baseline_assessments
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY baseline_mentor_write ON public.baseline_assessments
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY baseline_mentor_update ON public.baseline_assessments
  FOR UPDATE USING (
    public.current_user_role() = 'ADMIN'
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id) AND is_historical = FALSE)
  );

-- ============================================================================
-- Tasks, Submissions, Reviews
-- ============================================================================
CREATE POLICY tasks_select ON public.tasks
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY tasks_mentor_insert ON public.tasks
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR (
      public.current_user_role() = 'MENTOR'
      AND mentor_id = public.current_mentor_id()
      AND public.mentor_can_access_intern(intern_id)
    )
  );

CREATE POLICY tasks_mentor_update ON public.tasks
  FOR UPDATE USING (
    public.current_user_role() = 'ADMIN'
    OR (public.current_user_role() = 'MENTOR' AND mentor_id = public.current_mentor_id() AND public.mentor_can_access_intern(intern_id))
    OR (public.current_user_role() = 'INTERN' AND intern_id = public.current_intern_id())
  );

CREATE POLICY task_submissions_select ON public.task_submissions
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY task_submissions_intern_insert ON public.task_submissions
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR (public.current_user_role() = 'INTERN' AND intern_id = public.current_intern_id())
  );

CREATE POLICY task_submissions_update ON public.task_submissions
  FOR UPDATE USING (
    public.current_user_role() = 'ADMIN'
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY task_reviews_select ON public.task_reviews
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND t.intern_id = public.current_intern_id())
    OR (public.current_user_role() = 'MENTOR' AND mentor_id = public.current_mentor_id())
  );

CREATE POLICY task_reviews_mentor_write ON public.task_reviews
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR (
      public.current_user_role() = 'MENTOR'
      AND mentor_id = public.current_mentor_id()
      AND EXISTS (SELECT 1 FROM public.tasks t WHERE t.id = task_id AND public.mentor_can_access_intern(t.intern_id))
    )
  );

-- ============================================================================
-- Monthly Reports & KPI Evaluations
-- ============================================================================
CREATE POLICY monthly_reports_select ON public.monthly_reports
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY monthly_reports_write ON public.monthly_reports
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY kpi_evals_select ON public.kpi_evaluations
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR (intern_id = public.current_intern_id() AND review_status IN ('Reviewed', 'Approved', 'Revision Requested'))
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY kpi_evals_mentor_write ON public.kpi_evaluations
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR (
      public.current_user_role() = 'MENTOR'
      AND mentor_id = public.current_mentor_id()
      AND public.mentor_can_access_intern(intern_id)
    )
  );

-- ============================================================================
-- Stage Evaluations & Progression Decisions
-- ============================================================================
CREATE POLICY stage_evals_select ON public.stage_evaluations
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR (intern_id = public.current_intern_id() AND status IN ('Submitted', 'Admin Reviewed'))
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY stage_evals_mentor_insert ON public.stage_evaluations
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR (
      public.current_user_role() = 'MENTOR'
      AND mentor_id = public.current_mentor_id()
      AND public.mentor_can_access_intern(intern_id)
    )
  );

CREATE POLICY stage_evals_mentor_update ON public.stage_evaluations
  FOR UPDATE USING (
    public.current_user_role() = 'ADMIN'
    OR (
      public.current_user_role() = 'MENTOR'
      AND mentor_id = public.current_mentor_id()
      AND public.mentor_can_access_intern(intern_id)
      AND status = 'Draft'
    )
  );

CREATE POLICY progression_select ON public.progression_decisions
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

-- Mentor can recommend progression, but only ADMIN can set non-Pending admin_decision
CREATE POLICY progression_mentor_recommend ON public.progression_decisions
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR (
      public.current_user_role() = 'MENTOR'
      AND public.mentor_can_access_intern(intern_id)
      AND admin_decision = 'Pending'
    )
  );

CREATE POLICY progression_admin_decide ON public.progression_decisions
  FOR UPDATE USING (public.current_user_role() = 'ADMIN');

-- ============================================================================
-- Projects, Milestones, Reviews
-- ============================================================================
CREATE POLICY projects_select ON public.projects
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY projects_write ON public.projects
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY milestones_select ON public.project_milestones
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          public.current_user_role() = 'ADMIN'
          OR p.intern_id = public.current_intern_id()
          OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(p.intern_id))
        )
    )
  );

CREATE POLICY milestones_write ON public.project_milestones
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          public.current_user_role() = 'ADMIN'
          OR p.intern_id = public.current_intern_id()
          OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(p.intern_id))
        )
    )
  );

CREATE POLICY project_reviews_select ON public.project_reviews
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_id
        AND (
          public.current_user_role() = 'ADMIN'
          OR p.intern_id = public.current_intern_id()
          OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(p.intern_id))
        )
    )
  );

CREATE POLICY project_reviews_mentor_insert ON public.project_reviews
  FOR INSERT WITH CHECK (
    public.current_user_role() = 'ADMIN'
    OR (
      public.current_user_role() = 'MENTOR'
      AND mentor_id = public.current_mentor_id()
      AND EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id AND public.mentor_can_access_intern(p.intern_id))
    )
  );

-- ============================================================================
-- Certifications & Evidence
-- ============================================================================
CREATE POLICY certs_select ON public.certifications
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY certs_write ON public.certifications
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY cert_evidence_select ON public.certification_evidence
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY cert_evidence_write ON public.certification_evidence
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

-- ============================================================================
-- Feedback (private mentor notes strictly hidden from interns & other mentors)
-- ============================================================================
CREATE POLICY feedback_select ON public.feedback_records
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR (intern_id = public.current_intern_id() AND is_published = TRUE AND is_private_note = FALSE)
    OR (public.current_user_role() = 'MENTOR' AND mentor_id = public.current_mentor_id() AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY feedback_write ON public.feedback_records
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR (public.current_user_role() = 'MENTOR' AND mentor_id = public.current_mentor_id() AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY messages_select ON public.mentor_intern_messages
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR (public.current_user_role() = 'MENTOR' AND mentor_id = public.current_mentor_id() AND public.mentor_can_access_intern(intern_id))
    OR (public.current_user_role() = 'INTERN' AND intern_id = public.current_intern_id())
  );

CREATE POLICY messages_insert ON public.mentor_intern_messages
  FOR INSERT WITH CHECK (
    sender_profile_id = auth.uid()
    AND (
      (public.current_user_role() = 'MENTOR' AND mentor_id = public.current_mentor_id() AND public.mentor_can_access_intern(intern_id))
      OR (public.current_user_role() = 'INTERN' AND intern_id = public.current_intern_id())
    )
  );

-- ============================================================================
-- Improvement Plans & Timesheets
-- ============================================================================
CREATE POLICY plans_select ON public.improvement_plans
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY plans_write ON public.improvement_plans
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR (public.current_user_role() = 'MENTOR' AND mentor_id = public.current_mentor_id() AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY timesheets_select ON public.timesheets
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY timesheets_write ON public.timesheets
  FOR ALL USING (
    public.current_user_role() = 'ADMIN'
    OR intern_id = public.current_intern_id()
    OR (public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

-- ============================================================================
-- Notifications, Documents, Audit Logs
-- ============================================================================
CREATE POLICY notifications_select ON public.notifications
  FOR SELECT USING (recipient_profile_id = auth.uid() OR public.current_user_role() = 'ADMIN');

CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (recipient_profile_id = auth.uid() OR public.current_user_role() = 'ADMIN');

CREATE POLICY notifications_insert_auth ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY documents_select ON public.documents
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR owner_profile_id = auth.uid()
    OR (intern_id IS NOT NULL AND intern_id = public.current_intern_id())
    OR (intern_id IS NOT NULL AND public.current_user_role() = 'MENTOR' AND public.mentor_can_access_intern(intern_id))
  );

CREATE POLICY documents_insert ON public.documents
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND uploaded_by = auth.uid());

CREATE POLICY audit_logs_select ON public.audit_logs
  FOR SELECT USING (
    public.current_user_role() = 'ADMIN'
    OR actor_profile_id = auth.uid()
  );

CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND actor_profile_id = auth.uid());

-- ============================================================================
-- Private Storage Bucket (internflow-documents)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('internflow-documents', 'internflow-documents', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY storage_documents_read ON storage.objects
  FOR SELECT USING (
    bucket_id = 'internflow-documents'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY storage_documents_insert ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'internflow-documents'
    AND auth.uid() IS NOT NULL
  );

