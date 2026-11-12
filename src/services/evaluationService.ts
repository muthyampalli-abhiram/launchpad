import {
  calculateOverallKpi,
  classifyPerformance,
  STAGE_EVALUATION_RUBRICS,
  type ClassificationThreshold,
} from '../constants/launchpad';
import { formatAppError, requireSupabase } from '../lib/supabase';
import type {
  BaselineAssessment,
  BaselineSkillScore,
  ConfigApprovalStatus,
  KpiEvaluation,
  KpiPillar,
  KpiPillarDetail,
  ProgressionDecision,
  StageEvaluation,
  StageMetricScore,
} from '../types/database';
import { createNotification, recordAuditLog } from './auditService';

export async function saveBaselineAssessment(params: {
  existingId?: string;
  internId: string;
  mentorId: string;
  assessmentDate: string;
  criteriaScores: BaselineSkillScore[];
  comments: string;
  status: 'Draft' | 'Submitted' | 'Reviewed';
  actorProfileId: string;
}): Promise<BaselineAssessment> {
  if (params.criteriaScores.length === 0) {
    throw new Error('At least one technical skill criterion is required.');
  }
  for (const c of params.criteriaScores) {
    if (c.score < 0 || c.score > c.max_score) {
      throw new Error(`Score for "${c.skill}" must be between 0 and ${c.max_score}.`);
    }
  }

  const maxTotal = params.criteriaScores.reduce((sum, item) => sum + item.max_score, 0);
  const rawTotal = params.criteriaScores.reduce((sum, item) => sum + item.score, 0);
  const normalizedScore = maxTotal > 0 ? Math.round((rawTotal / maxTotal) * 10000) / 100 : 0;

  const client = requireSupabase();
  const payload = {
    intern_id: params.internId,
    assessed_by: params.mentorId,
    assessment_date: params.assessmentDate,
    skills_assessed: params.criteriaScores.map((c) => c.skill),
    criteria_scores: params.criteriaScores,
    total_score: normalizedScore,
    comments: params.comments.trim() || null,
    status: params.status,
    updated_by: params.actorProfileId,
  };

  let data;
  let error;
  if (params.existingId) {
    const res = await client
      .from('baseline_assessments')
      .update(payload)
      .eq('id', params.existingId)
      .eq('is_historical', false)
      .select('*')
      .single();
    data = res.data;
    error = res.error;
  } else {
    const res = await client
      .from('baseline_assessments')
      .insert({ ...payload, created_by: params.actorProfileId })
      .select('*')
      .single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) {
    throw new Error(formatAppError(error, 'Failed to save baseline assessment.'));
  }

  await recordAuditLog({
    actorProfileId: params.actorProfileId,
    actorRole: 'MENTOR',
    action: 'SAVE_BASELINE_ASSESSMENT',
    entityType: 'baseline_assessment',
    entityId: data.id,
    newValues: { total_score: normalizedScore, status: params.status },
  });

  return data as BaselineAssessment;
}

export interface SubmitMonthlyKpiReviewInput {
  monthlyReportId: string;
  internId: string;
  internProfileId?: string;
  mentorId: string;
  reportingMonth: string;
  learnScore: number;
  buildScore: number;
  shareScore: number;
  showcaseScore: number;
  pillarDetails: Partial<Record<KpiPillar, KpiPillarDetail>>;
  comments: string;
  improvementSuggestions: string;
  action: 'Draft' | 'Revision Requested' | 'Reviewed';
  previousVersionCount: number;
  actorProfileId: string;
}

export async function submitMonthlyKpiReview(input: SubmitMonthlyKpiReviewInput): Promise<KpiEvaluation> {
  const scores = [input.learnScore, input.buildScore, input.shareScore, input.showcaseScore];
  if (scores.some((s) => Number.isNaN(s) || s < 0 || s > 100)) {
    throw new Error('All KPI pillar scores must be between 0 and 100.');
  }
  if (input.action === 'Revision Requested' && !input.comments.trim() && !input.improvementSuggestions.trim()) {
    throw new Error('Comments or improvement suggestions are required when requesting revisions.');
  }

  const client = requireSupabase();
  // Preserve prior review history: mark existing current evaluations as historical before inserting next version
  await client
    .from('kpi_evaluations')
    .update({ is_current: false, updated_by: input.actorProfileId })
    .eq('monthly_report_id', input.monthlyReportId)
    .eq('is_current', true);

  const nextVersion = input.previousVersionCount + 1;
  const { data: evalData, error: evalErr } = await client
    .from('kpi_evaluations')
    .insert({
      monthly_report_id: input.monthlyReportId,
      intern_id: input.internId,
      mentor_id: input.mentorId,
      reporting_month: input.reportingMonth,
      learn_score: input.learnScore,
      build_score: input.buildScore,
      share_score: input.shareScore,
      showcase_score: input.showcaseScore,
      pillar_details: input.pillarDetails,
      comments: input.comments.trim() || null,
      improvement_suggestions: input.improvementSuggestions.trim() || null,
      review_status: input.action,
      version_number: nextVersion,
      is_current: true,
      reviewed_at: input.action === 'Draft' ? null : new Date().toISOString(),
      created_by: input.actorProfileId,
      updated_by: input.actorProfileId,
    })
    .select('*')
    .single();

  if (evalErr || !evalData) {
    throw new Error(formatAppError(evalErr, 'Failed to save monthly KPI evaluation.'));
  }

  const nextReportStatus =
    input.action === 'Reviewed'
      ? 'Reviewed'
      : input.action === 'Revision Requested'
        ? 'Revision Requested'
        : 'Under Review';

  const { error: repErr } = await client
    .from('monthly_reports')
    .update({ status: nextReportStatus })
    .eq('id', input.monthlyReportId);

  if (repErr) throw new Error(formatAppError(repErr, 'Failed to update monthly report status.'));

  const computed = calculateOverallKpi(
    input.learnScore,
    input.buildScore,
    input.shareScore,
    input.showcaseScore
  );

  await recordAuditLog({
    actorProfileId: input.actorProfileId,
    actorRole: 'MENTOR',
    action: 'MONTHLY_KPI_REVIEW',
    entityType: 'kpi_evaluation',
    entityId: evalData.id,
    newValues: { overall_score: computed, review_status: input.action, version_number: nextVersion },
  });

  if (input.action !== 'Draft' && input.internProfileId) {
    await createNotification({
      recipientProfileId: input.internProfileId,
      category: 'Monthly KPI Reviewed',
      title: `Monthly KPI Report ${input.action} (${input.reportingMonth})`,
      message: `Overall KPI Score: ${computed}/100.`,
      linkPath: `/intern/monthly-reports`,
      relatedEntityType: 'monthly_report',
      relatedEntityId: input.monthlyReportId,
    });
  }

  return evalData as KpiEvaluation;
}

export async function saveStageEvaluation(params: {
  existingDraftId?: string;
  internId: string;
  internProfileId?: string;
  mentorId: string;
  stageNumber: 1 | 2 | 3 | 4;
  metricScores: StageMetricScore[];
  comments: string;
  recommendations: string;
  evaluationDate: string;
  status: 'Draft' | 'Submitted';
  thresholds: ClassificationThreshold[];
  approvalStatus: ConfigApprovalStatus;
  actorProfileId: string;
  mentorRecommendation?: ProgressionDecision['mentor_recommendation'];
}): Promise<StageEvaluation> {
  const rubric = STAGE_EVALUATION_RUBRICS[params.stageNumber];
  if (params.metricScores.length !== rubric.metrics.length) {
    throw new Error('Evaluation metrics do not match the official LAUNCHPAD stage rubric.');
  }

  for (const official of rubric.metrics) {
    const entry = params.metricScores.find((m) => m.metric_key === official.metric_key);
    if (!entry) throw new Error(`Missing score for "${official.metric_name}".`);
    if (entry.score < 0 || entry.score > official.weight) {
      throw new Error(`"${official.metric_name}" score must be between 0 and ${official.weight}.`);
    }
    if (params.status === 'Submitted' && Number.isNaN(entry.score)) {
      throw new Error('Cannot submit incomplete evaluation.');
    }
  }

  const totalScore = Math.round(params.metricScores.reduce((sum, m) => sum + m.score, 0) * 100) / 100;
  if (totalScore < 0 || totalScore > 100) {
    throw new Error('Total stage evaluation score must be between 0 and 100.');
  }

  const classification = classifyPerformance(totalScore, params.thresholds, params.approvalStatus);
  const client = requireSupabase();

  const payload = {
    intern_id: params.internId,
    mentor_id: params.mentorId,
    stage_number: params.stageNumber,
    metric_scores: params.metricScores,
    total_score: totalScore,
    classification_label: classification.label,
    classification_approval_status: classification.approvalStatus,
    comments: params.comments.trim() || null,
    recommendations: params.recommendations.trim() || null,
    evaluation_date: params.evaluationDate,
    status: params.status,
    submitted_at: params.status === 'Submitted' ? new Date().toISOString() : null,
    updated_by: params.actorProfileId,
  };

  let data;
  let error;
  if (params.existingDraftId) {
    const res = await client
      .from('stage_evaluations')
      .update(payload)
      .eq('id', params.existingDraftId)
      .eq('status', 'Draft')
      .select('*')
      .single();
    data = res.data;
    error = res.error;
  } else {
    const res = await client
      .from('stage_evaluations')
      .insert({ ...payload, created_by: params.actorProfileId })
      .select('*')
      .single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) {
    throw new Error(formatAppError(error, 'Failed to save stage evaluation.'));
  }

  if (params.status === 'Submitted' && params.mentorRecommendation) {
    await client.from('progression_decisions').insert({
      intern_id: params.internId,
      stage_evaluation_id: data.id,
      from_stage: params.stageNumber,
      to_stage: params.stageNumber < 4 ? params.stageNumber + 1 : 4,
      mentor_recommendation: params.mentorRecommendation,
      mentor_recommended_by: params.mentorId,
      mentor_recommended_at: new Date().toISOString(),
      admin_decision: 'Pending',
      notes: params.recommendations.trim() || null,
    });
  }

  await recordAuditLog({
    actorProfileId: params.actorProfileId,
    actorRole: 'MENTOR',
    action: params.status === 'Submitted' ? 'SUBMIT_STAGE_EVALUATION' : 'SAVE_STAGE_EVALUATION_DRAFT',
    entityType: 'stage_evaluation',
    entityId: data.id,
    newValues: { stage_number: params.stageNumber, total_score: totalScore, status: params.status },
  });

  if (params.status === 'Submitted' && params.internProfileId) {
    await createNotification({
      recipientProfileId: params.internProfileId,
      category: 'Stage Evaluation Submitted',
      title: `Stage ${params.stageNumber} Evaluation Submitted`,
      message: `Your mentor has submitted your Stage ${params.stageNumber} evaluation (${totalScore}/100).`,
      linkPath: `/intern/evaluations`,
      relatedEntityType: 'stage_evaluation',
      relatedEntityId: data.id,
    });
  }

  return data as StageEvaluation;
}

