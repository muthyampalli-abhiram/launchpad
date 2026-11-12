import { formatAppError, requireSupabase } from '../lib/supabase';
import type {
  CertificationStatus,
  FeedbackCategory,
  FeedbackRecord,
  ImprovementPlan,
  ImprovementPlanStatus,
  KpiPillar,
  Mentor,
  MentorInternMessage,
  ProjectMilestone,
  ProjectReview,
  TimesheetEntry,
} from '../types/database';
import { createNotification, recordAuditLog } from './auditService';

// ============================================================================
// Projects, Milestones & Reviews
// ============================================================================
export async function reviewProblemStatement(params: {
  projectId: string;
  internProfileId?: string;
  mentorId: string;
  versionReviewed: number;
  decision: 'Approved' | 'Changes Requested';
  comments: string;
  actorProfileId: string;
}): Promise<void> {
  if (!params.comments.trim()) throw new Error('Please provide review comments.');
  const client = requireSupabase();

  const { error: projErr } = await client
    .from('projects')
    .update({
      problem_statement_status: params.decision,
      status: params.decision === 'Approved' ? 'In Progress' : 'Problem Statement Review',
      last_update: new Date().toISOString(),
      updated_by: params.actorProfileId,
    })
    .eq('id', params.projectId);

  if (projErr) throw new Error(formatAppError(projErr, 'Failed to update problem statement status.'));

  const { error: revErr } = await client.from('project_reviews').insert({
    project_id: params.projectId,
    mentor_id: params.mentorId,
    review_type: 'Problem Statement',
    comments: params.comments.trim(),
    decision: params.decision,
    version_reviewed: params.versionReviewed,
  });

  if (revErr) throw new Error(formatAppError(revErr, 'Failed to record problem statement review.'));

  await recordAuditLog({
    actorProfileId: params.actorProfileId,
    actorRole: 'MENTOR',
    action: 'REVIEW_PROBLEM_STATEMENT',
    entityType: 'project',
    entityId: params.projectId,
    newValues: { decision: params.decision },
  });

  if (params.internProfileId) {
    await createNotification({
      recipientProfileId: params.internProfileId,
      category: 'Project Review',
      title: `Problem Statement ${params.decision}`,
      message: params.comments.trim(),
      linkPath: `/intern/projects/${params.projectId}`,
      relatedEntityType: 'project',
      relatedEntityId: params.projectId,
    });
  }
}

export async function addProjectMilestone(params: {
  projectId: string;
  title: string;
  milestoneType: string;
  description: string;
  dueDate: string;
  sortOrder: number;
}): Promise<ProjectMilestone> {
  if (!params.title.trim()) throw new Error('Milestone title is required.');
  const client = requireSupabase();
  const { data, error } = await client
    .from('project_milestones')
    .insert({
      project_id: params.projectId,
      title: params.title.trim(),
      milestone_type: params.milestoneType,
      description: params.description.trim() || null,
      due_date: params.dueDate || null,
      sort_order: params.sortOrder,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(formatAppError(error, 'Failed to add project milestone.'));
  return data as ProjectMilestone;
}

export async function reviewProjectMilestone(params: {
  projectId: string;
  milestoneId: string;
  mentorId: string;
  internProfileId?: string;
  decision: 'Approved' | 'Changes Requested';
  feedback: string;
  actorProfileId: string;
}): Promise<void> {
  if (!params.feedback.trim()) throw new Error('Feedback is required when reviewing a milestone.');
  const client = requireSupabase();

  const { error: mErr } = await client
    .from('project_milestones')
    .update({
      status: params.decision,
      mentor_feedback: params.feedback.trim(),
      reviewed_by: params.mentorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', params.milestoneId);

  if (mErr) throw new Error(formatAppError(mErr, 'Failed to update milestone status.'));

  const { error: revErr } = await client.from('project_reviews').insert({
    project_id: params.projectId,
    milestone_id: params.milestoneId,
    mentor_id: params.mentorId,
    review_type: 'Milestone',
    comments: params.feedback.trim(),
    decision: params.decision,
    version_reviewed: 1,
  });

  if (revErr) throw new Error(formatAppError(revErr, 'Failed to record milestone review.'));

  await client
    .from('projects')
    .update({ last_update: new Date().toISOString(), updated_by: params.actorProfileId })
    .eq('id', params.projectId);

  if (params.internProfileId) {
    await createNotification({
      recipientProfileId: params.internProfileId,
      category: 'Milestone Reviewed',
      title: `Project Milestone ${params.decision}`,
      message: params.feedback.trim(),
      linkPath: `/intern/projects/${params.projectId}`,
      relatedEntityType: 'project',
      relatedEntityId: params.projectId,
    });
  }
}

export async function submitFinalProjectReview(params: {
  projectId: string;
  mentorId: string;
  technical_quality: string;
  problem_solving: string;
  implementation_notes: string;
  testing_validation: string;
  documentation_notes: string;
  presentation_notes: string;
  comments: string;
  decision: 'Approved' | 'Changes Requested' | 'Feedback Only';
  actorProfileId: string;
}): Promise<ProjectReview> {
  if (!params.comments.trim()) throw new Error('Reviewer comments are required.');
  const client = requireSupabase();

  const { data, error } = await client
    .from('project_reviews')
    .insert({
      project_id: params.projectId,
      mentor_id: params.mentorId,
      review_type: 'Final Evaluation',
      technical_quality: params.technical_quality.trim() || null,
      problem_solving: params.problem_solving.trim() || null,
      implementation_notes: params.implementation_notes.trim() || null,
      testing_validation: params.testing_validation.trim() || null,
      documentation_notes: params.documentation_notes.trim() || null,
      presentation_notes: params.presentation_notes.trim() || null,
      comments: params.comments.trim(),
      decision: params.decision,
      version_reviewed: 1,
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(formatAppError(error, 'Failed to save final project review.'));

  if (params.decision === 'Approved') {
    await client
      .from('projects')
      .update({ status: 'Completed', last_update: new Date().toISOString(), updated_by: params.actorProfileId })
      .eq('id', params.projectId);
  }

  return data as ProjectReview;
}

// ============================================================================
// Certifications (Week 12 & Week 24)
// ============================================================================
export async function verifyCertification(params: {
  certificationId: string;
  evidenceId?: string;
  internProfileId?: string;
  mentorId: string;
  decision: Extract<CertificationStatus, 'Verified' | 'Rejected' | 'Additional Evidence Requested'>;
  comments: string;
  actorProfileId: string;
}): Promise<void> {
  if (params.decision !== 'Verified' && !params.comments.trim()) {
    throw new Error('Comments are required when rejecting or requesting additional evidence.');
  }

  const client = requireSupabase();
  const now = new Date().toISOString();

  const { error: certErr } = await client
    .from('certifications')
    .update({
      status: params.decision,
      verified_by: params.mentorId,
      verified_at: now,
    })
    .eq('id', params.certificationId);

  if (certErr) throw new Error(formatAppError(certErr, 'Failed to update certification status.'));

  if (params.evidenceId) {
    const { error: evErr } = await client
      .from('certification_evidence')
      .update({
        verification_decision: params.decision,
        mentor_comments: params.comments.trim() || null,
        reviewed_by: params.mentorId,
        reviewed_at: now,
      })
      .eq('id', params.evidenceId);
    if (evErr) throw new Error(formatAppError(evErr, 'Failed to record evidence verification decision.'));
  }

  await recordAuditLog({
    actorProfileId: params.actorProfileId,
    actorRole: 'MENTOR',
    action: 'VERIFY_CERTIFICATION',
    entityType: 'certification',
    entityId: params.certificationId,
    newValues: { decision: params.decision },
  });

  if (params.internProfileId) {
    await createNotification({
      recipientProfileId: params.internProfileId,
      category: 'Certification Update',
      title: `Certification ${params.decision}`,
      message: params.comments.trim() || `Your certification evidence has been marked ${params.decision}.`,
      linkPath: `/intern/certifications`,
      relatedEntityType: 'certification',
      relatedEntityId: params.certificationId,
    });
  }
}

// ============================================================================
// Feedback & Messaging
// ============================================================================
export async function saveFeedbackRecord(params: {
  id?: string;
  internId: string;
  internProfileId?: string;
  mentorId: string;
  category: FeedbackCategory;
  title: string;
  content: string;
  isPrivateNote: boolean;
  isPublished: boolean;
  isImportant: boolean;
  linkedEntityType?: string;
  linkedEntityId?: string;
  actorProfileId: string;
}): Promise<FeedbackRecord> {
  if (!params.title.trim()) throw new Error('Feedback title is required.');
  if (!params.content.trim()) throw new Error('Feedback content is required.');
  if (params.isPrivateNote && params.isPublished) {
    throw new Error('Private mentor notes cannot be published directly to interns.');
  }

  const client = requireSupabase();
  const payload = {
    intern_id: params.internId,
    mentor_id: params.mentorId,
    category: params.category,
    title: params.title.trim(),
    content: params.content.trim(),
    is_private_note: params.isPrivateNote,
    is_published: params.isPublished,
    is_important: params.isImportant,
    linked_entity_type: params.linkedEntityType || null,
    linked_entity_id: params.linkedEntityId || null,
    updated_by: params.actorProfileId,
  };

  let data;
  let error;
  if (params.id) {
    const res = await client.from('feedback_records').update(payload).eq('id', params.id).select('*').single();
    data = res.data;
    error = res.error;
  } else {
    const res = await client
      .from('feedback_records')
      .insert({ ...payload, created_by: params.actorProfileId })
      .select('*')
      .single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) throw new Error(formatAppError(error, 'Failed to save feedback record.'));

  if (params.isPublished && !params.isPrivateNote && params.internProfileId) {
    await createNotification({
      recipientProfileId: params.internProfileId,
      category: 'New Feedback',
      title: `Mentor Feedback: ${params.title.trim()}`,
      message: params.content.trim().slice(0, 140),
      linkPath: `/intern/feedback`,
      relatedEntityType: 'feedback_record',
      relatedEntityId: data.id,
    });
  }

  return data as FeedbackRecord;
}

export async function fetchConversationMessages(mentorId: string, internId: string): Promise<MentorInternMessage[]> {
  const client = requireSupabase();
  const { data, error } = await client
    .from('mentor_intern_messages')
    .select('*')
    .eq('mentor_id', mentorId)
    .eq('intern_id', internId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(formatAppError(error, 'Failed to load messages.'));
  return (data ?? []) as MentorInternMessage[];
}

export async function sendMentorMessage(params: {
  mentorId: string;
  internId: string;
  senderProfileId: string;
  messageBody: string;
}): Promise<MentorInternMessage> {
  if (!params.messageBody.trim()) throw new Error('Message cannot be empty.');
  const client = requireSupabase();
  const { data, error } = await client
    .from('mentor_intern_messages')
    .insert({
      mentor_id: params.mentorId,
      intern_id: params.internId,
      sender_profile_id: params.senderProfileId,
      message_body: params.messageBody.trim(),
    })
    .select('*')
    .single();

  if (error || !data) throw new Error(formatAppError(error, 'Failed to send message.'));
  return data as MentorInternMessage;
}

// ============================================================================
// Improvement Plans
// ============================================================================
export async function saveImprovementPlan(params: {
  id?: string;
  internId: string;
  internProfileId?: string;
  mentorId: string;
  stageNumber: number;
  identifiedWeakness: string;
  kpiPillar: KpiPillar | '';
  evaluationMetric: string;
  improvementObjective: string;
  recommendedAction: string;
  learningResources: string;
  assignedTaskId?: string | null;
  targetCompletionDate: string;
  followUpDate: string;
  status: ImprovementPlanStatus;
  mentorComments: string;
  outcome: string;
  actorProfileId: string;
}): Promise<ImprovementPlan> {
  if (!params.identifiedWeakness.trim()) throw new Error('Identified weakness is required.');
  if (!params.improvementObjective.trim()) throw new Error('Improvement objective is required.');
  if (!params.recommendedAction.trim()) throw new Error('Recommended action is required.');
  if (!params.targetCompletionDate) throw new Error('Target completion date is required.');

  const client = requireSupabase();
  const payload = {
    intern_id: params.internId,
    mentor_id: params.mentorId,
    stage_number: params.stageNumber,
    identified_weakness: params.identifiedWeakness.trim(),
    kpi_pillar: params.kpiPillar || null,
    evaluation_metric: params.evaluationMetric.trim() || null,
    improvement_objective: params.improvementObjective.trim(),
    recommended_action: params.recommendedAction.trim(),
    learning_resources: params.learningResources.trim() || null,
    assigned_task_id: params.assignedTaskId || null,
    target_completion_date: params.targetCompletionDate,
    follow_up_date: params.followUpDate || null,
    status: params.status,
    mentor_comments: params.mentorComments.trim() || null,
    outcome: params.outcome.trim() || null,
    updated_by: params.actorProfileId,
  };

  let data;
  let error;
  if (params.id) {
    const res = await client.from('improvement_plans').update(payload).eq('id', params.id).select('*').single();
    data = res.data;
    error = res.error;
  } else {
    const res = await client
      .from('improvement_plans')
      .insert({ ...payload, created_by: params.actorProfileId })
      .select('*')
      .single();
    data = res.data;
    error = res.error;
  }

  if (error || !data) throw new Error(formatAppError(error, 'Failed to save improvement plan.'));

  await recordAuditLog({
    actorProfileId: params.actorProfileId,
    actorRole: 'MENTOR',
    action: params.id ? 'UPDATE_IMPROVEMENT_PLAN' : 'CREATE_IMPROVEMENT_PLAN',
    entityType: 'improvement_plan',
    entityId: data.id,
    newValues: { status: params.status, intern_id: params.internId },
  });

  if (!params.id && params.internProfileId) {
    await createNotification({
      recipientProfileId: params.internProfileId,
      category: 'Improvement Plan Created',
      title: 'New Improvement Plan Assigned',
      message: params.improvementObjective.trim(),
      linkPath: `/intern/improvement-plans`,
      relatedEntityType: 'improvement_plan',
      relatedEntityId: data.id,
    });
  }

  return data as ImprovementPlan;
}

// ============================================================================
// Notifications, Timesheets & Mentor Profile Settings
// ============================================================================
export async function fetchNotifications(profileId: string) {
  const client = requireSupabase();
  const { data, error } = await client
    .from('notifications')
    .select('*')
    .eq('recipient_profile_id', profileId)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(formatAppError(error, 'Failed to load notifications.'));
  return data ?? [];
}

export async function markNotificationRead(id: string, isRead = true): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('notifications')
    .update({ is_read: isRead, read_at: isRead ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw new Error(formatAppError(error, 'Failed to update notification state.'));
}

export async function markAllNotificationsRead(profileId: string): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('notifications')
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq('recipient_profile_id', profileId)
    .eq('is_read', false);
  if (error) throw new Error(formatAppError(error, 'Failed to mark notifications read.'));
}

export async function fetchAssignedTimesheets(internIds: string[]): Promise<TimesheetEntry[]> {
  if (internIds.length === 0) return [];
  const client = requireSupabase();
  const { data, error } = await client
    .from('timesheets')
    .select('*')
    .in('intern_id', internIds)
    .order('work_date', { ascending: false });
  if (error) throw new Error(formatAppError(error, 'Failed to load timesheets.'));
  return (data ?? []) as TimesheetEntry[];
}

export async function reviewTimesheetEntry(params: {
  timesheetId: string;
  mentorId: string;
  decision: 'Approved' | 'Returned';
  comments: string;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('timesheets')
    .update({
      status: params.decision,
      mentor_comments: params.comments.trim() || null,
      reviewed_by: params.mentorId,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', params.timesheetId);
  if (error) throw new Error(formatAppError(error, 'Failed to review timesheet entry.'));
}

export async function updateMentorOwnProfile(params: {
  profileId: string;
  mentorId: string;
  fullName: string;
  phone: string;
  technicalDomain: string;
  areasOfExpertise: string[];
  notificationPreferences: Mentor['notification_preferences'];
}): Promise<void> {
  const client = requireSupabase();
  const [profRes, mentorRes] = await Promise.all([
    client
      .from('profiles')
      .update({ full_name: params.fullName.trim(), phone: params.phone.trim() || null })
      .eq('id', params.profileId),
    client
      .from('mentors')
      .update({
        technical_domain: params.technicalDomain.trim(),
        areas_of_expertise: params.areasOfExpertise,
        notification_preferences: params.notificationPreferences,
        updated_by: params.profileId,
      })
      .eq('id', params.mentorId),
  ]);

  if (profRes.error) throw new Error(formatAppError(profRes.error, 'Failed to update profile details.'));
  if (mentorRes.error) throw new Error(formatAppError(mentorRes.error, 'Failed to update mentor preferences.'));
}

