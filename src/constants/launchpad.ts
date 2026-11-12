import type { ConfigApprovalStatus, KpiPillar } from '../types/database';

export interface LaunchpadStageInfo {
  stage: 0 | 1 | 2 | 3 | 4;
  name: string;
  title: string;
  weeks: string;
  weekStart: number;
  weekEnd: number;
  description: string;
}

export const LAUNCHPAD_STAGES: LaunchpadStageInfo[] = [
  {
    stage: 0,
    name: 'Week 0 – Baseline',
    title: 'Baseline Assessment',
    weeks: 'Week 0',
    weekStart: 0,
    weekEnd: 0,
    description: 'Initial technical skill assessment establishing the intern starting baseline.',
  },
  {
    stage: 1,
    name: 'Stage 1 – Learner',
    title: 'Learner',
    weeks: 'Weeks 1–6',
    weekStart: 1,
    weekEnd: 6,
    description: 'Technical fundamentals, research comprehension, practical exercises, and foundational KT.',
  },
  {
    stage: 2,
    name: 'Stage 2 – Practitioner',
    title: 'Practitioner',
    weeks: 'Weeks 7–12',
    weekStart: 7,
    weekEnd: 12,
    description: 'Case-study research, independent implementation, troubleshooting, and Week 12 certification.',
  },
  {
    stage: 3,
    name: 'Stage 3 – Developer',
    title: 'Developer',
    weeks: 'Weeks 13–18',
    weekStart: 13,
    weekEnd: 18,
    description: 'Real-world problem analysis, solution design, software development, testing, and structured peer KT.',
  },
  {
    stage: 4,
    name: 'Stage 4 – Professional',
    title: 'Professional',
    weeks: 'Weeks 19–24',
    weekStart: 19,
    weekEnd: 24,
    description: 'Technical depth, handover readiness, lead KT workshops, Week 24 certification, and final defence.',
  },
];

export const KPI_PILLARS: { key: KpiPillar; label: string; weight: number; weightPct: number; description: string }[] = [
  {
    key: 'LEARN',
    label: 'LEARN',
    weight: 0.25,
    weightPct: 25,
    description: 'Learning activities, conceptual mastery, research, and technical skill acquisition.',
  },
  {
    key: 'BUILD',
    label: 'BUILD',
    weight: 0.45,
    weightPct: 45,
    description: 'Hands-on tasks, labs, software implementation, problem-solving, and project execution.',
  },
  {
    key: 'SHARE',
    label: 'SHARE',
    weight: 0.15,
    weightPct: 15,
    description: 'Knowledge-transfer sessions, peer mentoring, documentation, and collaboration.',
  },
  {
    key: 'SHOWCASE',
    label: 'SHOWCASE',
    weight: 0.15,
    weightPct: 15,
    description: 'Technical presentations, demonstrations, solution walkthroughs, and defence.',
  },
];

/**
 * Official SmartBridge LAUNCHPAD Overall KPI Formula (consistent across Admin, Mentor, Intern Portals):
 * Overall KPI Score = (LEARN * 0.25) + (BUILD * 0.45) + (SHARE * 0.15) + (SHOWCASE * 0.15)
 */
export function calculateOverallKpi(
  learn: number,
  build: number,
  share: number,
  showcase: number
): number {
  const clamp = (val: number) => Math.max(0, Math.min(100, Number.isFinite(val) ? val : 0));
  const raw =
    clamp(learn) * 0.25 +
    clamp(build) * 0.45 +
    clamp(share) * 0.15 +
    clamp(showcase) * 0.15;
  return Math.round(raw * 100) / 100;
}

export interface StageRubricMetric {
  metric_key: string;
  metric_name: string;
  weight: number;
}

export const STAGE_EVALUATION_RUBRICS: Record<1 | 2 | 3 | 4, { stageName: string; metrics: StageRubricMetric[] }> = {
  1: {
    stageName: 'Stage 1 – Learner Evaluation',
    metrics: [
      { metric_key: 's1_tech_fundamentals', metric_name: 'Technical Fundamentals and Learning Assessments', weight: 25 },
      { metric_key: 's1_research_conceptual', metric_name: 'Research and Conceptual Understanding', weight: 15 },
      { metric_key: 's1_practical_labs', metric_name: 'Practical Exercises and Lab Completion', weight: 30 },
      { metric_key: 's1_comm_kt_receptivity', metric_name: 'Communication, Active KT Participation and Peer Mentoring Receptivity', weight: 15 },
      { metric_key: 's1_intro_presentation', metric_name: 'Introductory Presentation and Knowledge Sharing Explanation', weight: 15 },
    ],
  },
  2: {
    stageName: 'Stage 2 – Practitioner Evaluation',
    metrics: [
      { metric_key: 's2_tech_case_study', metric_name: 'Technical Knowledge and Case-study Research', weight: 20 },
      { metric_key: 's2_practical_impl', metric_name: 'Practical Assignments and Implementation', weight: 30 },
      { metric_key: 's2_troubleshooting', metric_name: 'Troubleshooting and Independent Application', weight: 20 },
      { metric_key: 's2_comm_collab_kt', metric_name: 'Communication, Collaboration and Foundational Peer Mentoring / KT Sharing', weight: 15 },
      { metric_key: 's2_tech_presentation', metric_name: 'Technical Presentation and Practical Demonstration', weight: 15 },
    ],
  },
  3: {
    stageName: 'Stage 3 – Developer Evaluation',
    metrics: [
      { metric_key: 's3_problem_research', metric_name: 'Real-world Problem Research and Analysis', weight: 20 },
      { metric_key: 's3_problem_design', metric_name: 'Problem Definition and Solution Design', weight: 15 },
      { metric_key: 's3_dev_impl', metric_name: 'Development and Implementation', weight: 30 },
      { metric_key: 's3_testing_docs', metric_name: 'Testing, Validation and Documentation', weight: 20 },
      { metric_key: 's3_team_ownership_kt', metric_name: 'Team Coordination, Ownership, Structured Peer KT and Project Mentoring', weight: 15 },
    ],
  },
  4: {
    stageName: 'Stage 4 – Professional Evaluation',
    metrics: [
      { metric_key: 's4_tech_depth', metric_name: 'Technical Depth and Solution Quality', weight: 25 },
      { metric_key: 's4_testing_improvement', metric_name: 'Testing, Validation and Improvement', weight: 20 },
      { metric_key: 's4_docs_handover', metric_name: 'Documentation and Handover Readiness', weight: 20 },
      { metric_key: 's4_lead_kt_mentoring', metric_name: 'Lead KT Workshops, Student Mentoring and Leadership Ownership', weight: 15 },
      { metric_key: 's4_final_defence', metric_name: 'Final Project Demonstration and Defence', weight: 20 },
    ],
  },
};

export interface ClassificationThreshold {
  label: string;
  min: number;
  max: number;
}

export const DEFAULT_CLASSIFICATION_THRESHOLDS: ClassificationThreshold[] = [
  { label: 'Development Required', min: 0, max: 59.99 },
  { label: 'L1', min: 60, max: 69.99 },
  { label: 'L2', min: 70, max: 84.99 },
  { label: 'L3', min: 85, max: 100 },
];

export function classifyPerformance(
  score: number,
  thresholds: ClassificationThreshold[] = DEFAULT_CLASSIFICATION_THRESHOLDS,
  approvalStatus: ConfigApprovalStatus = 'PENDING_APPROVAL'
): { label: string; approvalStatus: ConfigApprovalStatus } {
  const safeScore = Math.max(0, Math.min(100, score));
  const match = thresholds.find((band) => safeScore >= band.min && safeScore <= band.max);
  return {
    label: match?.label ?? (safeScore < 60 ? 'Development Required' : safeScore < 70 ? 'L1' : safeScore < 85 ? 'L2' : 'L3'),
    approvalStatus,
  };
}

export const PROJECT_MILESTONE_TYPES = [
  'Research and Analysis',
  'Problem Definition',
  'Solution Design',
  'Development',
  'Implementation',
  'Testing',
  'Validation',
  'Documentation',
  'Demonstration',
  'Final Defence',
  'Custom',
] as const;

export function getStageLabel(stage: number): string {
  return LAUNCHPAD_STAGES.find((s) => s.stage === stage)?.name ?? `Stage ${stage}`;
}

