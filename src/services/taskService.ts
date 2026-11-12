import { formatAppError, requireSupabase, uploadPrivateFile } from '../lib/supabase';
import type { KpiPillar, Task, TaskReview, TaskStatus, UserRole } from '../types/database';
import { createNotification, recordAuditLog } from './auditService';

export interface CreateTaskInput {
  title: string;
  description: string;
  instructions?: string;
  learning_objectives?: string;
  category: string;
  stage_number: number;
  kpi_pillar: KpiPillar;
  mentor_id: string;
  intern_ids: string[];
  batch_id?: string | null;
  start_date: string;
  due_date: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  attachmentFile?: File | null;
  submission_instructions?: string;
  expected_deliverables?: string;
  max_marks?: number | null;
  status: 'Draft' | 'Assigned';
  actorProfileId: string;
  internProfileMap: Map<string, string>;
}

export async function createTasksForAssignedInterns(input: CreateTaskInput): Promise<Task[]> {
  if (!input.title.trim()) throw new Error('Task title is required.');
  if (!input.description.trim()) throw new Error('Task description is required.');
  if (input.intern_ids.length === 0) throw new Error('Select at least one assigned intern.');
  if (input.due_date < input.start_date) throw new Error('Due date must be on or after the start date.');
  if (input.max_marks !== null && input.max_marks !== undefined && input.max_marks <= 0) {
    throw new Error('Maximum marks must be greater than zero.');
  }

  const client = requireSupabase();
  let attachmentPath: string | null = null;
  if (input.attachmentFile) {
    const uploaded = await uploadPrivateFile(`tasks/${input.mentor_id}`, input.attachmentFile);
    attachmentPath = uploaded.path;
  }

  const payloads = input.intern_ids.map((internId) => ({
    title: input.title.trim(),
    description: input.description.trim(),
    instructions: input.instructions?.trim() || null,
    learning_objectives: input.learning_objectives?.trim() || null,
    category: input.category,
    stage_number: input.stage_number,
    kpi_pillar: input.kpi_pillar,
    mentor_id: input.mentor_id,
    intern_id: internId,
    batch_id: input.batch_id ?? null,
    start_date: input.start_date,
    due_date: input.due_date,
    priority: input.priority,
    attachment_path: attachmentPath,
    submission_instructions: input.submission_instructions?.trim() || null,
    expected_deliverables: input.expected_deliverables?.trim() || null,
    max_marks: input.max_marks ?? null,
    status: input.status,
    created_by: input.actorProfileId,
    updated_by: input.actorProfileId,
  }));

  const { data, error } = await client.from('tasks').insert(payloads).select('*');
  if (error || !data) {
    throw new Error(formatAppError(error, 'Unable to create task. Verify intern assignment permissions.'));
  }

  const created = data as Task[];
  await Promise.all(
    created.map(async (task) => {
      await recordAuditLog({
        actorProfileId: input.actorProfileId,
        actorRole: 'MENTOR',
        action: 'CREATE_TASK',
        entityType: 'task',
        entityId: task.id,
        newValues: { title: task.title, intern_id: task.intern_id, status: task.status },
      });
      const recipientProfileId = input.internProfileMap.get(task.intern_id);
      if (task.status === 'Assigned' && recipientProfileId) {
        await createNotification({
          recipientProfileId,
          category: 'Task Assigned',
          title: `New Task Assigned: ${task.title}`,
          message: `Due ${task.due_date} (${task.kpi_pillar} pillar).`,
          linkPath: `/intern/tasks/${task.id}`,
          relatedEntityType: 'task',
          relatedEntityId: task.id,
        });
      }
    })
  );

  return created;
}

export async function updateTaskStatus(params: {
  taskId: string;
  status: TaskStatus;
  actorProfileId: string;
  actorRole: UserRole;
}): Promise<void> {
  const client = requireSupabase();
  const { error } = await client
    .from('tasks')
    .update({ status: params.status, updated_by: params.actorProfileId })
    .eq('id', params.taskId);

  if (error) throw new Error(formatAppError(error, 'Failed to update task status.'));
  await recordAuditLog({
    actorProfileId: params.actorProfileId,
    actorRole: params.actorRole,
    action: 'UPDATE_TASK_STATUS',
    entityType: 'task',
    entityId: params.taskId,
    newValues: { status: params.status },
  });
}

export interface SubmitTaskReviewInput {
  submissionId: string;
  taskId: string;
  mentorId: string;
  internProfileId?: string;
  maxMarks?: number | null;
  technical_correctness: string;
  quality_of_work: string;
  understanding: string;
  problem_solving: string;
  areas_of_improvement: string;
  general_comments: string;
  improvement_suggestions: string;
  marks_awarded: number | null;
  decision: 'Draft' | 'Approved' | 'Revision Requested' | 'Completed';
  actorProfileId: string;
}

export async function submitTaskReview(input: SubmitTaskReviewInput): Promise<TaskReview> {
  if (input.marks_awarded !== null) {
    if (input.marks_awarded < 0) throw new Error('Marks cannot be negative.');
    if (input.maxMarks !== null && input.maxMarks !== undefined && input.marks_awarded > input.maxMarks) {
      throw new Error(`Marks awarded (${input.marks_awarded}) cannot exceed maximum marks (${input.maxMarks}).`);
    }
  }
  if (input.decision === 'Revision Requested' && !input.areas_of_improvement.trim() && !input.general_comments.trim()) {
    throw new Error('Provide improvement areas or comments when requesting a revision.');
  }

  const client = requireSupabase();
  const isComplete = input.decision === 'Approved' || input.decision === 'Completed';

  const { data: reviewData, error: reviewErr } = await client
    .from('task_reviews')
    .insert({
      submission_id: input.submissionId,
      task_id: input.taskId,
      mentor_id: input.mentorId,
      technical_correctness: input.technical_correctness.trim() || null,
      quality_of_work: input.quality_of_work.trim() || null,
      understanding: input.understanding.trim() || null,
      problem_solving: input.problem_solving.trim() || null,
      areas_of_improvement: input.areas_of_improvement.trim() || null,
      general_comments: input.general_comments.trim() || null,
      improvement_suggestions: input.improvement_suggestions.trim() || null,
      marks_awarded: input.marks_awarded,
      decision: input.decision,
      is_complete: isComplete,
      created_by: input.actorProfileId,
      updated_by: input.actorProfileId,
    })
    .select('*')
    .single();

  if (reviewErr || !reviewData) {
    throw new Error(formatAppError(reviewErr, 'Failed to save task review.'));
  }

  const nextTaskStatus: TaskStatus =
    input.decision === 'Completed'
      ? 'Completed'
      : input.decision === 'Approved'
        ? 'Reviewed'
        : input.decision === 'Revision Requested'
          ? 'Revision Requested'
          : 'Under Review';

  const nextSubStatus =
    input.decision === 'Approved' || input.decision === 'Completed'
      ? 'Approved'
      : input.decision === 'Revision Requested'
        ? 'Revision Requested'
        : 'Under Review';

  const [subRes, taskRes] = await Promise.all([
    client.from('task_submissions').update({ status: nextSubStatus }).eq('id', input.submissionId),
    client.from('tasks').update({ status: nextTaskStatus, updated_by: input.actorProfileId }).eq('id', input.taskId),
  ]);

  if (subRes.error) throw new Error(formatAppError(subRes.error, 'Failed to update submission status.'));
  if (taskRes.error) throw new Error(formatAppError(taskRes.error, 'Failed to update task status.'));

  await recordAuditLog({
    actorProfileId: input.actorProfileId,
    actorRole: 'MENTOR',
    action: 'REVIEW_TASK_SUBMISSION',
    entityType: 'task_review',
    entityId: reviewData.id,
    newValues: { task_id: input.taskId, decision: input.decision, marks_awarded: input.marks_awarded },
  });

  if (input.decision !== 'Draft' && input.internProfileId) {
    await createNotification({
      recipientProfileId: input.internProfileId,
      category: 'Task Reviewed',
      title: `Task Review Update: ${input.decision}`,
      message: input.general_comments.trim() || `Your submission status is now ${nextTaskStatus}.`,
      linkPath: `/intern/tasks/${input.taskId}`,
      relatedEntityType: 'task',
      relatedEntityId: input.taskId,
    });
  }

  return reviewData as TaskReview;
}

