export type UserRole = 'ADMIN' | 'MENTOR' | 'INTERN';

export type KpiPillar = 'LEARN' | 'BUILD' | 'SHARE' | 'SHOWCASE';

export type TaskStatus =
  | 'Draft'
  | 'Assigned'
  | 'In Progress'
  | 'Submitted'
  | 'Under Review'
  | 'Revision Requested'
  | 'Resubmitted'
  | 'Reviewed'
  | 'Completed'
  | 'Overdue';

export type SubmissionStatus =
  | 'Submitted'
  | 'Under Review'
  | 'Revision Requested'
  | 'Resubmitted'
  | 'Approved';

export type MonthlyReportStatus =
  | 'Not Submitted'
  | 'Submitted'
  | 'Under Review'
  | 'Revision Requested'
  | 'Resubmitted'
  | 'Reviewed'
  | 'Approved';

export type StageEvaluationStatus = 'Draft' | 'Submitted' | 'Admin Reviewed';

export type CertificationMilestone = 'WEEK_12' | 'WEEK_24';

export type CertificationStatus =
  | 'Missing'
  | 'Pending Verification'
  | 'Verified'
  | 'Rejected'
  | 'Additional Evidence Requested';

export type ImprovementPlanStatus =
  | 'Open'
  | 'In Progress'
  | 'Under Review'
  | 'Completed'
  | 'Escalated';

export type FeedbackCategory =
  | 'Technical'
  | 'Task'
  | 'Project'
  | 'Monthly KPI'
  | 'Stage Evaluation'
  | 'Communication'
  | 'Professional Development'
  | 'Improvement Suggestions'
  | 'General';

export type ConfigApprovalStatus = 'PENDING_APPROVAL' | 'APPROVED';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: string;
  name: string;
  code: string;
  start_date: string;
  end_date: string;
  status: 'Upcoming' | 'Active' | 'Completed' | 'Archived';
}

export interface Mentor {
  id: string;
  profile_id: string;
  employee_id: string;
  department: string;
  designation: string;
  technical_domain: string;
  areas_of_expertise: string[];
  joining_date: string | null;
  notification_preferences: {
    in_app: boolean;
    email: boolean;
    task_submissions: boolean;
    monthly_reports: boolean;
    evaluations: boolean;
    certifications: boolean;
  };
  profile?: Profile;
}

export interface InternPersonalInfo {
  phone?: string;
  date_of_birth?: string;
  gender?: string;
  city?: string;
  state?: string;
  emergency_contact?: string;
  linkedin_url?: string;
  github_url?: string;
}

export interface InternAcademicInfo {
  institution?: string;
  degree?: string;
  branch?: string;
  graduation_year?: string;
  cgpa?: string;
  roll_number?: string;
}

export interface InternProgramInfo {
  program_name?: string;
  track?: string;
  cohort?: string;
  week_number?: number;
  attendance_mode?: string;
}

export interface Intern {
  id: string;
  profile_id: string;
  intern_code: string;
  batch_id: string | null;
  assigned_domain: string;
  current_stage: number;
  stage_start_date: string | null;
  stage_end_date: string | null;
  program_progress: number;
  joining_date: string;
  personal_info: InternPersonalInfo;
  academic_info: InternAcademicInfo;
  program_info: InternProgramInfo;
  status: 'Active' | 'Needs Attention' | 'On Hold' | 'Completed' | 'Inactive';
  created_at: string;
  updated_at: string;
  profile?: Profile;
  batch?: Batch | null;
}

export interface MentorAssignment {
  id: string;
  mentor_id: string;
  intern_id: string;
  is_active: boolean;
  historical_access_allowed: boolean;
  assigned_at: string;
  ended_at: string | null;
  notes: string | null;
}

export interface LaunchpadConfig<T = unknown> {
  id: string;
  config_key: string;
  config_value: T;
  approval_status: ConfigApprovalStatus;
  description: string | null;
  updated_at: string;
}

export interface BaselineSkillScore {
  skill: string;
  max_score: number;
  score: number;
  remarks?: string;
}

export interface BaselineAssessment {
  id: string;
  intern_id: string;
  assessed_by: string | null;
  assessment_date: string;
  skills_assessed: string[];
  criteria_scores: BaselineSkillScore[];
  total_score: number;
  comments: string | null;
  evidence_files: FileRef[];
  status: 'Pending' | 'Draft' | 'Submitted' | 'Reviewed';
  is_historical: boolean;
  created_at: string;
  updated_at: string;
  intern?: Intern;
}

export interface FileRef {
  path: string;
  name: string;
  size?: number;
  mime_type?: string;
  uploaded_at?: string;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  instructions: string | null;
  learning_objectives: string | null;
  category: string;
  stage_number: number;
  kpi_pillar: KpiPillar;
  mentor_id: string;
  intern_id: string;
  batch_id: string | null;
  start_date: string;
  due_date: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  attachment_path: string | null;
  submission_instructions: string | null;
  expected_deliverables: string | null;
  max_marks: number | null;
  status: TaskStatus;
  created_at: string;
  updated_at: string;
  intern?: Intern;
  submissions?: TaskSubmission[];
}

export interface TaskSubmission {
  id: string;
  task_id: string;
  intern_id: string;
  version_number: number;
  submission_notes: string | null;
  submission_url: string | null;
  attachment_paths: FileRef[];
  submitted_at: string;
  status: SubmissionStatus;
  reviews?: TaskReview[];
  task?: Task;
  intern?: Intern;
}

export interface TaskReview {
  id: string;
  submission_id: string;
  task_id: string;
  mentor_id: string;
  technical_correctness: string | null;
  quality_of_work: string | null;
  understanding: string | null;
  problem_solving: string | null;
  areas_of_improvement: string | null;
  general_comments: string | null;
  improvement_suggestions: string | null;
  marks_awarded: number | null;
  decision: 'Draft' | 'Approved' | 'Revision Requested' | 'Completed';
  is_complete: boolean;
  reviewed_at: string;
}

export interface MonthlyReport {
  id: string;
  intern_id: string;
  reporting_month: string;
  submission_date: string | null;
  work_completed: string | null;
  learning_activities: string | null;
  technical_skills: string | null;
  tasks_completed_summary: string | null;
  projects_milestones_summary: string | null;
  knowledge_sharing: string | null;
  demonstrations: string | null;
  supporting_evidence: FileRef[];
  self_assessment: string | null;
  intern_comments: string | null;
  status: MonthlyReportStatus;
  created_at: string;
  updated_at: string;
  intern?: Intern;
  evaluations?: KpiEvaluation[];
}

export interface KpiPillarDetail {
  intern_summary?: string;
  mentor_assessment?: string;
  comments?: string;
  improvement_suggestions?: string;
  supporting_evidence?: string;
}

export interface KpiEvaluation {
  id: string;
  monthly_report_id: string;
  intern_id: string;
  mentor_id: string;
  reporting_month: string;
  learn_score: number;
  build_score: number;
  share_score: number;
  showcase_score: number;
  overall_score: number;
  pillar_details: Partial<Record<KpiPillar, KpiPillarDetail>>;
  comments: string | null;
  improvement_suggestions: string | null;
  review_status: 'Draft' | 'Revision Requested' | 'Reviewed' | 'Approved';
  version_number: number;
  is_current: boolean;
  reviewed_at: string | null;
  created_at: string;
}

export interface StageMetricScore {
  metric_key: string;
  metric_name: string;
  weight: number;
  score: number;
  comments: string;
  evidence_ref?: string;
}

export interface StageEvaluation {
  id: string;
  intern_id: string;
  mentor_id: string;
  stage_number: 1 | 2 | 3 | 4;
  metric_scores: StageMetricScore[];
  total_score: number;
  classification_label: string | null;
  classification_approval_status: ConfigApprovalStatus;
  comments: string | null;
  recommendations: string | null;
  evidence_refs: FileRef[];
  status: StageEvaluationStatus;
  evaluation_date: string;
  submitted_at: string | null;
  version_number: number;
  is_historical: boolean;
  created_at: string;
  updated_at: string;
  intern?: Intern;
}

export interface ProgressionDecision {
  id: string;
  intern_id: string;
  stage_evaluation_id: string | null;
  from_stage: number;
  to_stage: number | null;
  mentor_recommendation:
    | 'Recommend Progression'
    | 'Recommend Conditional Progression'
    | 'Recommend Extension / Improvement Plan'
    | 'Pending'
    | null;
  mentor_recommended_by: string | null;
  mentor_recommended_at: string | null;
  admin_decision: 'Pending' | 'Approved' | 'Deferred' | 'Rejected';
  decided_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface ProblemStatementData {
  problem_definition?: string;
  objectives?: string;
  proposed_solution?: string;
  feasibility?: string;
  scope?: string;
  submitted_at?: string;
}

export interface Project {
  id: string;
  intern_id: string;
  mentor_id: string | null;
  title: string;
  domain: string;
  current_stage: number;
  problem_statement: ProblemStatementData;
  problem_statement_status: 'Draft' | 'Submitted' | 'Under Review' | 'Changes Requested' | 'Approved';
  problem_statement_version: number;
  repository_url: string | null;
  start_date: string | null;
  expected_completion_date: string | null;
  status: 'Planning' | 'Problem Statement Review' | 'In Progress' | 'Delayed' | 'Under Final Review' | 'Completed';
  last_update: string;
  intern?: Intern;
  milestones?: ProjectMilestone[];
  reviews?: ProjectReview[];
}

export interface ProjectMilestone {
  id: string;
  project_id: string;
  title: string;
  milestone_type: string;
  description: string | null;
  due_date: string | null;
  status: 'Not Started' | 'In Progress' | 'Submitted' | 'Changes Requested' | 'Approved';
  submission_notes: string | null;
  evidence_paths: FileRef[];
  mentor_feedback: string | null;
  reviewed_at: string | null;
  sort_order: number;
}

export interface ProjectReview {
  id: string;
  project_id: string;
  milestone_id: string | null;
  mentor_id: string;
  review_type: 'Problem Statement' | 'Milestone' | 'General' | 'Final Evaluation';
  technical_quality: string | null;
  problem_solving: string | null;
  implementation_notes: string | null;
  testing_validation: string | null;
  documentation_notes: string | null;
  presentation_notes: string | null;
  comments: string;
  decision: 'Approved' | 'Changes Requested' | 'Feedback Only';
  version_reviewed: number;
  reviewed_at: string;
}

export interface Certification {
  id: string;
  intern_id: string;
  milestone_type: CertificationMilestone;
  certification_name: string | null;
  issuing_organization: string | null;
  issue_date: string | null;
  status: CertificationStatus;
  verified_by: string | null;
  verified_at: string | null;
  admin_approved_at: string | null;
  created_at: string;
  updated_at: string;
  intern?: Intern;
  evidence?: CertificationEvidence[];
}

export interface CertificationEvidence {
  id: string;
  certification_id: string;
  intern_id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  mime_type: string;
  notes: string | null;
  uploaded_at: string;
  verification_decision: 'Pending' | 'Verified' | 'Rejected' | 'Additional Evidence Requested' | null;
  mentor_comments: string | null;
  reviewed_at: string | null;
}

export interface FeedbackRecord {
  id: string;
  intern_id: string;
  mentor_id: string;
  category: FeedbackCategory;
  title: string;
  content: string;
  is_private_note: boolean;
  is_published: boolean;
  is_important: boolean;
  linked_entity_type: string | null;
  linked_entity_id: string | null;
  viewed_by_intern_at: string | null;
  created_at: string;
  updated_at: string;
  intern?: Intern;
}

export interface MentorInternMessage {
  id: string;
  mentor_id: string;
  intern_id: string;
  sender_profile_id: string;
  message_body: string;
  attachment_paths: FileRef[];
  read_at: string | null;
  created_at: string;
}

export interface ImprovementPlan {
  id: string;
  intern_id: string;
  mentor_id: string;
  stage_number: number;
  identified_weakness: string;
  kpi_pillar: KpiPillar | null;
  evaluation_metric: string | null;
  improvement_objective: string;
  recommended_action: string;
  learning_resources: string | null;
  assigned_task_id: string | null;
  target_completion_date: string;
  follow_up_date: string | null;
  status: ImprovementPlanStatus;
  mentor_comments: string | null;
  outcome: string | null;
  created_at: string;
  updated_at: string;
  intern?: Intern;
}

export interface TimesheetEntry {
  id: string;
  intern_id: string;
  work_date: string;
  hours_worked: number;
  task_id: string | null;
  notes: string | null;
  status: 'Draft' | 'Submitted' | 'Returned' | 'Approved';
  mentor_comments: string | null;
  reviewed_at: string | null;
  intern?: Intern;
}

export interface AppNotification {
  id: string;
  recipient_profile_id: string;
  category: string;
  title: string;
  message: string;
  link_path: string | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  email_sent: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_profile_id: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  created_at: string;
}

