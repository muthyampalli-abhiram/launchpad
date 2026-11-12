import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FileAttachmentButton } from '../../components/ui/FileAttachmentButton';
import { FormField, Input, Textarea } from '../../components/ui/FormControls';
import { ConfirmDialog } from '../../components/ui/Modal';
import { ErrorState, LoadingPage } from '../../components/ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { submitTaskReview } from '../../services/taskService';

export const TaskDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [techCorrectness, setTechCorrectness] = useState('');
  const [qualityOfWork, setQualityOfWork] = useState('');
  const [understanding, setUnderstanding] = useState('');
  const [problemSolving, setProblemSolving] = useState('');
  const [areasOfImprovement, setAreasOfImprovement] = useState('');
  const [generalComments, setGeneralComments] = useState('');
  const [improvementSuggestions, setImprovementSuggestions] = useState('');
  const [marksAwarded, setMarksAwarded] = useState('');
  const [pendingDecision, setPendingDecision] = useState<'Approved' | 'Revision Requested' | 'Completed' | null>(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingPage message="Loading task and submission details..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load task.'} onRetry={refresh} />;

  const task = bundle.tasks.find((t) => t.id === id);
  if (!task) {
    return <ErrorState title="Task Not Found" message="This task does not exist or belongs to an unassigned intern." />;
  }

  const submissions = bundle.submissions
    .filter((s) => s.task_id === task.id)
    .sort((a, b) => b.version_number - a.version_number);

  const activeSub = submissions.find((s) => s.id === selectedSubId) ?? submissions[0];

  const executeReview = async (decision: 'Draft' | 'Approved' | 'Revision Requested' | 'Completed') => {
    if (!profile || !activeSub) return;
    const parsedMarks = marksAwarded.trim() ? Number(marksAwarded) : null;
    if (parsedMarks !== null && Number.isNaN(parsedMarks)) {
      showToast('error', 'Invalid marks', 'Please enter a valid numeric mark.');
      return;
    }

    setSaving(true);
    try {
      await submitTaskReview({
        submissionId: activeSub.id,
        taskId: task.id,
        mentorId: bundle.mentor.id,
        internProfileId: task.intern?.profile_id,
        maxMarks: task.max_marks,
        technical_correctness: techCorrectness,
        quality_of_work: qualityOfWork,
        understanding,
        problem_solving: problemSolving,
        areas_of_improvement: areasOfImprovement,
        general_comments: generalComments,
        improvement_suggestions: improvementSuggestions,
        marks_awarded: parsedMarks,
        decision,
        actorProfileId: profile.id,
      });
      showToast('success', 'Review recorded', `Task submission marked as ${decision}.`);
      setPendingDecision(null);
      await refresh();
    } catch (err) {
      showToast('error', 'Review validation failed', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/mentor/tasks">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Tasks
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D]">{task.title}</h1>
              <Badge status={task.status}>{task.status}</Badge>
            </div>
            <p className="text-xs text-[#64748B]">
              Assigned to {task.intern?.profile?.full_name} · Stage {task.stage_number} · {task.kpi_pillar} · Due{' '}
              {task.due_date}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Task Spec */}
        <Card className="lg:col-span-1">
          <CardHeader title="Task Specification" />
          <CardContent className="space-y-3 text-xs">
            <div>
              <p className="font-semibold text-[#64748B] uppercase text-[10px]">Description</p>
              <p className="text-[#172B4D] mt-1 whitespace-pre-wrap">{task.description}</p>
            </div>
            {task.instructions && (
              <div>
                <p className="font-semibold text-[#64748B] uppercase text-[10px]">Instructions</p>
                <p className="text-[#172B4D] mt-1 whitespace-pre-wrap">{task.instructions}</p>
              </div>
            )}
            {task.expected_deliverables && (
              <div>
                <p className="font-semibold text-[#64748B] uppercase text-[10px]">Expected Deliverables</p>
                <p className="text-[#172B4D] mt-1">{task.expected_deliverables}</p>
              </div>
            )}
            {task.max_marks !== null && (
              <div>
                <p className="font-semibold text-[#64748B] uppercase text-[10px]">Maximum Marks</p>
                <p className="text-sm font-bold text-[#172B4D]">{task.max_marks}</p>
              </div>
            )}
            {task.attachment_path && (
              <div>
                <p className="font-semibold text-[#64748B] uppercase text-[10px] mb-1">Mentor Attachment</p>
                <FileAttachmentButton storagePath={task.attachment_path} />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Submission & Review Workspace */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader title="Submission Version History" subtitle={`${submissions.length} version(s) submitted`} />
            <CardContent className="space-y-4">
              {submissions.length === 0 ? (
                <p className="text-xs text-[#64748B]">The intern has not submitted work for this task yet.</p>
              ) : (
                <>
                  <div className="flex flex-wrap gap-2">
                    {submissions.map((sub) => (
                      <button
                        key={sub.id}
                        type="button"
                        onClick={() => setSelectedSubId(sub.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border cursor-pointer ${
                          activeSub?.id === sub.id
                            ? 'bg-[#2563EB] text-white border-[#2563EB]'
                            : 'bg-white text-[#172B4D] border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        Version {sub.version_number} ({sub.status})
                      </button>
                    ))}
                  </div>

                  {activeSub && (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-[#172B4D]">
                          Submitted on {new Date(activeSub.submitted_at).toLocaleString()}
                        </span>
                        <Badge status={activeSub.status}>{activeSub.status}</Badge>
                      </div>
                      <p className="text-[#172B4D] whitespace-pre-wrap">
                        {activeSub.submission_notes || 'No submission notes provided.'}
                      </p>
                      {activeSub.submission_url && (
                        <div>
                          <a
                            href={activeSub.submission_url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#2563EB] hover:underline font-medium"
                          >
                            View External Submission Link →
                          </a>
                        </div>
                      )}
                      {activeSub.attachment_paths && activeSub.attachment_paths.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {activeSub.attachment_paths.map((file) => (
                            <FileAttachmentButton key={file.path} storagePath={file.path} fileName={file.name} />
                          ))}
                        </div>
                      )}

                      {(activeSub.reviews ?? []).length > 0 && (
                        <div className="pt-3 border-t border-slate-200 space-y-2">
                          <p className="font-semibold text-[#64748B] uppercase text-[10px]">Previous Review Logs</p>
                          {activeSub.reviews!.map((rev) => (
                            <div key={rev.id} className="bg-white p-3 rounded-lg border border-slate-200 space-y-1">
                              <div className="flex justify-between">
                                <Badge status={rev.decision}>{rev.decision}</Badge>
                                <span className="text-[#64748B]">{new Date(rev.reviewed_at).toLocaleString()}</span>
                              </div>
                              {rev.marks_awarded !== null && (
                                <p className="font-semibold text-[#172B4D]">
                                  Marks: {rev.marks_awarded}
                                  {task.max_marks ? ` / ${task.max_marks}` : ''}
                                </p>
                              )}
                              {rev.general_comments && <p className="text-[#172B4D]">{rev.general_comments}</p>}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>

          {activeSub && (
            <Card>
              <CardHeader title="Structured Task Feedback & Rubric Review" />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Technical Correctness">
                    <Textarea rows={2} value={techCorrectness} onChange={(e) => setTechCorrectness(e.target.value)} />
                  </FormField>
                  <FormField label="Quality of Work">
                    <Textarea rows={2} value={qualityOfWork} onChange={(e) => setQualityOfWork(e.target.value)} />
                  </FormField>
                  <FormField label="Conceptual Understanding">
                    <Textarea rows={2} value={understanding} onChange={(e) => setUnderstanding(e.target.value)} />
                  </FormField>
                  <FormField label="Problem-Solving">
                    <Textarea rows={2} value={problemSolving} onChange={(e) => setProblemSolving(e.target.value)} />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField label="Areas of Improvement">
                    <Textarea rows={2} value={areasOfImprovement} onChange={(e) => setAreasOfImprovement(e.target.value)} />
                  </FormField>
                  <FormField label="Improvement Suggestions">
                    <Textarea rows={2} value={improvementSuggestions} onChange={(e) => setImprovementSuggestions(e.target.value)} />
                  </FormField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <FormField label="General Comments">
                      <Textarea rows={2} value={generalComments} onChange={(e) => setGeneralComments(e.target.value)} />
                    </FormField>
                  </div>
                  <FormField
                    label={`Marks Awarded${task.max_marks ? ` (Max ${task.max_marks})` : ''}`}
                  >
                    <Input
                      type="number"
                      min={0}
                      max={task.max_marks ?? undefined}
                      value={marksAwarded}
                      onChange={(e) => setMarksAwarded(e.target.value)}
                      placeholder="0"
                    />
                  </FormField>
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => executeReview('Draft')} loading={saving}>
                    Save Draft Review
                  </Button>
                  <Button
                    variant="danger"
                    icon={<RotateCcw className="w-4 h-4" />}
                    onClick={() => setPendingDecision('Revision Requested')}
                    disabled={saving}
                  >
                    Request Revision
                  </Button>
                  <Button
                    variant="primary"
                    icon={<CheckCircle2 className="w-4 h-4" />}
                    onClick={() => setPendingDecision('Approved')}
                    disabled={saving}
                  >
                    Approve Submission
                  </Button>
                  <Button
                    variant="success"
                    onClick={() => setPendingDecision('Completed')}
                    disabled={saving}
                  >
                    Mark Completed
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={pendingDecision !== null}
        title={`Confirm ${pendingDecision}`}
        message={`Are you sure you want to mark this task submission as "${pendingDecision}"? The intern and Admin portal will see this status update immediately.`}
        confirmLabel={`Confirm ${pendingDecision}`}
        confirmVariant={pendingDecision === 'Revision Requested' ? 'danger' : 'success'}
        loading={saving}
        onCancel={() => setPendingDecision(null)}
        onConfirm={() => pendingDecision && executeReview(pendingDecision)}
      />
    </div>
  );
};

