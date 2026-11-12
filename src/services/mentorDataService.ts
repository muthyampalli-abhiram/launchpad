import { DEFAULT_CLASSIFICATION_THRESHOLDS, type ClassificationThreshold } from '../constants/launchpad';
import { formatAppError, requireSupabase } from '../lib/supabase';
import type {
  AuditLog,
  BaselineAssessment,
  Batch,
  Certification,
  ConfigApprovalStatus,
  FeedbackRecord,
  ImprovementPlan,
  Intern,
  KpiEvaluation,
  LaunchpadConfig,
  Mentor,
  MentorAssignment,
  MonthlyReport,
  ProgressionDecision,
  Project,
  StageEvaluation,
  Task,
  TaskSubmission,
} from '../types/database';

export interface AssignedInternSummary {
  intern: Intern;
  assignment: MentorAssignment;
  latestKpi: KpiEvaluation | null;
  pendingTasksCount: number;
  completedTasksCount: number;
  overdueTasksCount: number;
  lastReportDate: string | null;
  week12CertStatus: string;
  week24CertStatus: string;
}

export interface MentorWorkspaceBundle {
  mentor: Mentor;
  assignments: MentorAssignment[];
  interns: AssignedInternSummary[];
  batches: Batch[];
  tasks: Task[];
  submissions: TaskSubmission[];
  monthlyReports: MonthlyReport[];
  kpiEvaluations: KpiEvaluation[];
  stageEvaluations: StageEvaluation[];
  baselineAssessments: BaselineAssessment[];
  projects: Project[];
  certifications: Certification[];
  improvementPlans: ImprovementPlan[];
  progressionDecisions: ProgressionDecision[];
  feedbackRecords: FeedbackRecord[];
  auditLogs: AuditLog[];
  classificationConfig: {
    thresholds: ClassificationThreshold[];
    approvalStatus: ConfigApprovalStatus;
  };
  timesheetsEnabled: boolean;
}

export async function fetchMentorByProfileId(profileId: string): Promise<Mentor> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('mentors')
    .select('*, profile:profiles(*)')
    .eq('profile_id', profileId)
    .single();

  if (error || !data) {
    throw new Error(formatAppError(error, 'Mentor profile record not found. Contact an administrator.'));
  }
  return data as Mentor;
}

export async function fetchLaunchpadConfigs(): Promise<{
  classificationConfig: { thresholds: ClassificationThreshold[]; approvalStatus: ConfigApprovalStatus };
  timesheetsEnabled: boolean;
}> {
  const client = requireSupabase();
  const { data, error } = await client.from('launchpad_configs').select('*');
  if (error) {
    throw new Error(formatAppError(error, 'Failed to load LAUNCHPAD configuration.'));
  }
  const configs = (data ?? []) as LaunchpadConfig[];
  const l1l2l3 = configs.find((c) => c.config_key === 'l1_l2_l3_thresholds');
  const timesheetCfg = configs.find((c) => c.config_key === 'attendance_timesheets_enabled');

  const thresholds = Array.isArray(l1l2l3?.config_value)
    ? (l1l2l3.config_value as ClassificationThreshold[])
    : DEFAULT_CLASSIFICATION_THRESHOLDS;

  const timesheetsEnabled = Boolean(
    (timesheetCfg?.config_value as { enabled?: boolean } | undefined)?.enabled ||
      import.meta.env.VITE_ENABLE_TIMESHEETS === 'true'
  );

  return {
    classificationConfig: {
      thresholds,
      approvalStatus: l1l2l3?.approval_status ?? 'PENDING_APPROVAL',
    },
    timesheetsEnabled,
  };
}

export async function fetchMentorWorkspaceBundle(profileId: string): Promise<MentorWorkspaceBundle> {
  const client = requireSupabase();
  const mentor = await fetchMentorByProfileId(profileId);
  const { classificationConfig, timesheetsEnabled } = await fetchLaunchpadConfigs();

  const { data: assignmentsData, error: assignErr } = await client
    .from('mentor_assignments')
    .select('*')
    .eq('mentor_id', mentor.id)
    .order('assigned_at', { ascending: false });

  if (assignErr) throw new Error(formatAppError(assignErr, 'Failed to load mentor assignments.'));

  const assignments = ((assignmentsData ?? []) as MentorAssignment[]).filter(
    (a) => a.is_active || a.historical_access_allowed
  );
  const internIds = Array.from(new Set(assignments.map((a) => a.intern_id)));

  if (internIds.length === 0) {
    return {
      mentor,
      assignments: [],
      interns: [],
      batches: [],
      tasks: [],
      submissions: [],
      monthlyReports: [],
      kpiEvaluations: [],
      stageEvaluations: [],
      baselineAssessments: [],
      projects: [],
      certifications: [],
      improvementPlans: [],
      progressionDecisions: [],
      feedbackRecords: [],
      auditLogs: [],
      classificationConfig,
      timesheetsEnabled,
    };
  }

  const [
    internsRes,
    batchesRes,
    tasksRes,
    submissionsRes,
    reportsRes,
    kpiRes,
    stageEvalRes,
    baselineRes,
    projectsRes,
    certsRes,
    plansRes,
    progRes,
    feedbackRes,
    auditRes,
  ] = await Promise.all([
    client.from('interns').select('*, profile:profiles(*), batch:batches(*)').in('id', internIds),
    client.from('batches').select('*').order('start_date', { ascending: false }),
    client.from('tasks').select('*').in('intern_id', internIds).order('created_at', { ascending: false }),
    client.from('task_submissions').select('*, reviews:task_reviews(*)').in('intern_id', internIds).order('submitted_at', { ascending: false }),
    client.from('monthly_reports').select('*').in('intern_id', internIds).order('reporting_month', { ascending: false }),
    client.from('kpi_evaluations').select('*').in('intern_id', internIds).order('reporting_month', { ascending: false }),
    client.from('stage_evaluations').select('*').in('intern_id', internIds).order('created_at', { ascending: false }),
    client.from('baseline_assessments').select('*').in('intern_id', internIds).order('assessment_date', { ascending: false }),
    client.from('projects').select('*, milestones:project_milestones(*), reviews:project_reviews(*)').in('intern_id', internIds).order('last_update', { ascending: false }),
    client.from('certifications').select('*, evidence:certification_evidence(*)').in('intern_id', internIds),
    client.from('improvement_plans').select('*').in('intern_id', internIds).order('created_at', { ascending: false }),
    client.from('progression_decisions').select('*').in('intern_id', internIds).order('created_at', { ascending: false }),
    client.from('feedback_records').select('*').in('intern_id', internIds).eq('mentor_id', mentor.id).order('created_at', { ascending: false }),
    client.from('audit_logs').select('*').eq('actor_profile_id', profileId).order('created_at', { ascending: false }).limit(50),
  ]);

  const errors = [
    internsRes.error,
    batchesRes.error,
    tasksRes.error,
    submissionsRes.error,
    reportsRes.error,
    kpiRes.error,
    stageEvalRes.error,
    baselineRes.error,
    projectsRes.error,
    certsRes.error,
    plansRes.error,
    progRes.error,
    feedbackRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    throw new Error(formatAppError(errors[0], 'Failed to synchronize assigned intern records.'));
  }

  const interns = (internsRes.data ?? []) as Intern[];
  const internMap = new Map(interns.map((i) => [i.id, i]));
  const tasks = ((tasksRes.data ?? []) as Task[]).map((t) => ({ ...t, intern: internMap.get(t.intern_id) }));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));
  const submissions = ((submissionsRes.data ?? []) as TaskSubmission[]).map((s) => ({
    ...s,
    intern: internMap.get(s.intern_id),
    task: taskMap.get(s.task_id),
  }));
  const kpiEvaluations = (kpiRes.data ?? []) as KpiEvaluation[];
  const monthlyReports = ((reportsRes.data ?? []) as MonthlyReport[]).map((r) => ({
    ...r,
    intern: internMap.get(r.intern_id),
    evaluations: kpiEvaluations.filter((k) => k.monthly_report_id === r.id),
  }));
  const stageEvaluations = ((stageEvalRes.data ?? []) as StageEvaluation[]).map((e) => ({
    ...e,
    intern: internMap.get(e.intern_id),
  }));
  const baselineAssessments = ((baselineRes.data ?? []) as BaselineAssessment[]).map((b) => ({
    ...b,
    intern: internMap.get(b.intern_id),
  }));
  const projects = ((projectsRes.data ?? []) as Project[]).map((p) => ({
    ...p,
    intern: internMap.get(p.intern_id),
  }));
  const certifications = ((certsRes.data ?? []) as Certification[]).map((c) => ({
    ...c,
    intern: internMap.get(c.intern_id),
  }));
  const improvementPlans = ((plansRes.data ?? []) as ImprovementPlan[]).map((ip) => ({
    ...ip,
    intern: internMap.get(ip.intern_id),
  }));
  const feedbackRecords = ((feedbackRes.data ?? []) as FeedbackRecord[]).map((fb) => ({
    ...fb,
    intern: internMap.get(fb.intern_id),
  }));

  const todayIso = new Date().toISOString().slice(0, 10);
  const internSummaries: AssignedInternSummary[] = interns.map((intern) => {
    const assignment = assignments.find((a) => a.intern_id === intern.id)!;
    const internTasks = tasks.filter((t) => t.intern_id === intern.id);
    const internKpis = kpiEvaluations.filter((k) => k.intern_id === intern.id && k.is_current);
    const internReports = monthlyReports.filter((r) => r.intern_id === intern.id && r.submission_date);
    const week12 = certifications.find((c) => c.intern_id === intern.id && c.milestone_type === 'WEEK_12');
    const week24 = certifications.find((c) => c.intern_id === intern.id && c.milestone_type === 'WEEK_24');

    return {
      intern,
      assignment,
      latestKpi: internKpis[0] ?? null,
      pendingTasksCount: internTasks.filter((t) =>
        ['Assigned', 'In Progress', 'Submitted', 'Under Review', 'Revision Requested', 'Resubmitted'].includes(t.status)
      ).length,
      completedTasksCount: internTasks.filter((t) => ['Reviewed', 'Completed'].includes(t.status)).length,
      overdueTasksCount: internTasks.filter(
        (t) => t.status === 'Overdue' || (t.due_date < todayIso && !['Reviewed', 'Completed', 'Draft'].includes(t.status))
      ).length,
      lastReportDate: internReports[0]?.submission_date ?? null,
      week12CertStatus: week12?.status ?? 'Missing',
      week24CertStatus: week24?.status ?? 'Missing',
    };
  });

  return {
    mentor,
    assignments,
    interns: internSummaries,
    batches: (batchesRes.data ?? []) as Batch[],
    tasks,
    submissions,
    monthlyReports,
    kpiEvaluations,
    stageEvaluations,
    baselineAssessments,
    projects,
    certifications,
    improvementPlans,
    progressionDecisions: (progRes.data ?? []) as ProgressionDecision[],
    feedbackRecords,
    auditLogs: (auditRes.data ?? []) as AuditLog[],
    classificationConfig,
    timesheetsEnabled,
  };
}

