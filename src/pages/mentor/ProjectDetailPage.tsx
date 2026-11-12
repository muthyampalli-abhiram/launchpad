import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, ExternalLink, Plus, RotateCcw } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FileAttachmentButton } from '../../components/ui/FileAttachmentButton';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormControls';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { ErrorState, LoadingPage } from '../../components/ui/States';
import { PROJECT_MILESTONE_TYPES } from '../../constants/launchpad';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import {
  addProjectMilestone,
  reviewProblemStatement,
  reviewProjectMilestone,
  submitFinalProjectReview,
} from '../../services/projectAndCertService';

export const ProjectDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [psComments, setPsComments] = useState('');
  const [psDecisionConfirm, setPsDecisionConfirm] = useState<'Approved' | 'Changes Requested' | null>(null);
  const [milestoneModal, setMilestoneModal] = useState(false);
  const [mTitle, setMTitle] = useState('');
  const [mType, setMType] = useState<string>(PROJECT_MILESTONE_TYPES[0]);
  const [mDesc, setMDesc] = useState('');
  const [mDue, setMDue] = useState('');
  const [milestoneFeedbackMap, setMilestoneFeedbackMap] = useState<Record<string, string>>({});

  // Final evaluation fields (Section 13E)
  const [techQuality, setTechQuality] = useState('');
  const [problemSolving, setProblemSolving] = useState('');
  const [implNotes, setImplNotes] = useState('');
  const [testNotes, setTestNotes] = useState('');
  const [docNotes, setDocNotes] = useState('');
  const [presNotes, setPresNotes] = useState('');
  const [finalComments, setFinalComments] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingPage message="Loading project workspace..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load project.'} onRetry={refresh} />;

  const project = bundle.projects.find((p) => p.id === id);
  if (!project) return <ErrorState title="Project Not Found" message="Project not found or unauthorized." />;

  const milestones = [...(project.milestones ?? [])].sort((a, b) => a.sort_order - b.sort_order);

  const handleProblemStatementReview = async (decision: 'Approved' | 'Changes Requested') => {
    if (!profile) return;
    setSaving(true);
    try {
      await reviewProblemStatement({
        projectId: project.id,
        internProfileId: project.intern?.profile_id,
        mentorId: bundle.mentor.id,
        versionReviewed: project.problem_statement_version,
        decision,
        comments: psComments,
        actorProfileId: profile.id,
      });
      showToast('success', 'Problem statement reviewed', `Marked as ${decision}.`);
      setPsComments('');
      setPsDecisionConfirm(null);
      await refresh();
    } catch (err) {
      showToast('error', 'Review error', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleAddMilestone = async () => {
    setSaving(true);
    try {
      await addProjectMilestone({
        projectId: project.id,
        title: mTitle,
        milestoneType: mType,
        description: mDesc,
        dueDate: mDue,
        sortOrder: milestones.length + 1,
      });
      showToast('success', 'Milestone added', mTitle);
      setMilestoneModal(false);
      setMTitle('');
      setMDesc('');
      setMDue('');
      await refresh();
    } catch (err) {
      showToast('error', 'Unable to add milestone', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleMilestoneReview = async (milestoneId: string, decision: 'Approved' | 'Changes Requested') => {
    if (!profile) return;
    setSaving(true);
    try {
      await reviewProjectMilestone({
        projectId: project.id,
        milestoneId,
        mentorId: bundle.mentor.id,
        internProfileId: project.intern?.profile_id,
        decision,
        feedback: milestoneFeedbackMap[milestoneId] ?? '',
        actorProfileId: profile.id,
      });
      showToast('success', 'Milestone updated', `Milestone marked ${decision}.`);
      await refresh();
    } catch (err) {
      showToast('error', 'Milestone review error', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleFinalEvaluation = async (decision: 'Approved' | 'Changes Requested') => {
    if (!profile) return;
    setSaving(true);
    try {
      await submitFinalProjectReview({
        projectId: project.id,
        mentorId: bundle.mentor.id,
        technical_quality: techQuality,
        problem_solving: problemSolving,
        implementation_notes: implNotes,
        testing_validation: testNotes,
        documentation_notes: docNotes,
        presentation_notes: presNotes,
        comments: finalComments,
        decision,
        actorProfileId: profile.id,
      });
      showToast('success', 'Final project evaluation recorded', `Decision: ${decision}`);
      await refresh();
    } catch (err) {
      showToast('error', 'Final evaluation error', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/mentor/projects">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Projects
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D]">{project.title}</h1>
              <Badge status={project.status}>{project.status}</Badge>
            </div>
            <p className="text-xs text-[#64748B]">
              {project.intern?.profile?.full_name} · Domain: {project.domain} · Target: {project.expected_completion_date ?? '—'}
            </p>
          </div>
        </div>

        {project.repository_url && (
          <a
            href={project.repository_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 text-xs font-medium text-[#2563EB] hover:bg-blue-50"
          >
            Open Authorized Repository <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Problem Statement Review */}
      <Card>
        <CardHeader
          title={`Problem Statement Review (v${project.problem_statement_version})`}
          action={<Badge status={project.problem_statement_status}>{project.problem_statement_status}</Badge>}
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {[
              ['Problem Definition', project.problem_statement?.problem_definition],
              ['Objectives', project.problem_statement?.objectives],
              ['Proposed Solution', project.problem_statement?.proposed_solution],
              ['Feasibility', project.problem_statement?.feasibility],
              ['Scope', project.problem_statement?.scope],
            ].map(([label, val]) => (
              <div key={label} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                <p className="font-semibold text-[#64748B] uppercase text-[10px]">{label}</p>
                <p className="text-[#172B4D] mt-1 whitespace-pre-wrap">{val || 'Not provided yet.'}</p>
              </div>
            ))}
          </div>

          <FormField label="Problem Statement Review Comments" required>
            <Textarea
              rows={2}
              value={psComments}
              onChange={(e) => setPsComments(e.target.value)}
              placeholder="Evaluate clarity, feasibility, and scope..."
            />
          </FormField>

          <div className="flex justify-end gap-2">
            <Button
              variant="danger"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setPsDecisionConfirm('Changes Requested')}
              disabled={saving}
            >
              Request Changes
            </Button>
            <Button
              variant="success"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => setPsDecisionConfirm('Approved')}
              disabled={saving}
            >
              Approve Problem Statement
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Milestones */}
      <Card>
        <CardHeader
          title="Project Milestones"
          subtitle="Configurable project milestones without altering official LAUNCHPAD stage weights"
          action={
            <Button size="sm" variant="outline" icon={<Plus className="w-3.5 h-3.5" />} onClick={() => setMilestoneModal(true)}>
              Add Milestone
            </Button>
          }
        />
        <CardContent className="space-y-3">
          {milestones.length === 0 ? (
            <p className="text-xs text-[#64748B]">No milestones configured for this project yet.</p>
          ) : (
            milestones.map((m) => (
              <div key={m.id} className="p-4 rounded-xl border border-slate-200 space-y-3 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-[#172B4D]">
                      {m.title} <span className="text-xs font-normal text-[#64748B]">({m.milestone_type})</span>
                    </p>
                    <p className="text-[#64748B]">Due: {m.due_date ?? 'Not set'}</p>
                  </div>
                  <Badge status={m.status}>{m.status}</Badge>
                </div>
                {m.description && <p className="text-[#172B4D]">{m.description}</p>}
                {m.submission_notes && (
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                    <span className="font-semibold text-[#64748B]">Intern Submission Notes: </span>
                    {m.submission_notes}
                  </div>
                )}
                {m.evidence_paths && m.evidence_paths.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {m.evidence_paths.map((f) => (
                      <FileAttachmentButton key={f.path} storagePath={f.path} fileName={f.name} compact />
                    ))}
                  </div>
                )}
                <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-end pt-2 border-t border-slate-100">
                  <div className="flex-1">
                    <Input
                      value={milestoneFeedbackMap[m.id] ?? m.mentor_feedback ?? ''}
                      onChange={(e) =>
                        setMilestoneFeedbackMap((prev) => ({ ...prev, [m.id]: e.target.value }))
                      }
                      placeholder="Enter technical feedback for this milestone..."
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleMilestoneReview(m.id, 'Changes Requested')}
                    disabled={saving}
                  >
                    Request Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="success"
                    onClick={() => handleMilestoneReview(m.id, 'Approved')}
                    disabled={saving}
                  >
                    Approve Milestone
                  </Button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Final Project Evaluation */}
      <Card>
        <CardHeader
          title="Final Project Evaluation"
          subtitle="Structured technical review aligned with the official Stage 4 Professional rubric (use Stage Evaluations for official numeric scoring)"
          action={
            <Link to="/mentor/evaluations">
              <Button size="sm" variant="outline">Open Official Stage 4 Evaluation</Button>
            </Link>
          }
        />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <FormField label="Technical Quality">
              <Textarea rows={2} value={techQuality} onChange={(e) => setTechQuality(e.target.value)} />
            </FormField>
            <FormField label="Problem-Solving">
              <Textarea rows={2} value={problemSolving} onChange={(e) => setProblemSolving(e.target.value)} />
            </FormField>
            <FormField label="Implementation">
              <Textarea rows={2} value={implNotes} onChange={(e) => setImplNotes(e.target.value)} />
            </FormField>
            <FormField label="Testing & Validation">
              <Textarea rows={2} value={testNotes} onChange={(e) => setTestNotes(e.target.value)} />
            </FormField>
            <FormField label="Documentation">
              <Textarea rows={2} value={docNotes} onChange={(e) => setDocNotes(e.target.value)} />
            </FormField>
            <FormField label="Presentation & Demonstration">
              <Textarea rows={2} value={presNotes} onChange={(e) => setPresNotes(e.target.value)} />
            </FormField>
          </div>
          <FormField label="Reviewer Comments" required>
            <Textarea rows={3} value={finalComments} onChange={(e) => setFinalComments(e.target.value)} />
          </FormField>
          <div className="flex justify-end gap-2">
            <Button variant="danger" onClick={() => handleFinalEvaluation('Changes Requested')} loading={saving}>
              Request Final Changes
            </Button>
            <Button variant="success" onClick={() => handleFinalEvaluation('Approved')} loading={saving}>
              Approve Final Project
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Project Review History */}
      {(project.reviews ?? []).length > 0 && (
        <Card>
          <CardHeader title="Project Review History" />
          <CardContent className="space-y-2 text-xs">
            {project.reviews!.map((rev) => (
              <div key={rev.id} className="p-3 rounded-lg border border-slate-200 flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-[#172B4D]">
                    {rev.review_type} · {rev.decision}
                  </p>
                  <p className="text-[#64748B] mt-0.5">{rev.comments}</p>
                </div>
                <span className="text-[#64748B] whitespace-nowrap">
                  {new Date(rev.reviewed_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Modal
        open={milestoneModal}
        onClose={() => setMilestoneModal(false)}
        title="Add Project Milestone"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setMilestoneModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddMilestone} loading={saving}>Add Milestone</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Milestone Title" required>
            <Input value={mTitle} onChange={(e) => setMTitle(e.target.value)} placeholder="e.g., Architecture & API Design" />
          </FormField>
          <FormField label="Milestone Type" required>
            <Select value={mType} onChange={(e) => setMType(e.target.value)}>
              {PROJECT_MILESTONE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Target Due Date">
            <Input type="date" value={mDue} onChange={(e) => setMDue(e.target.value)} />
          </FormField>
          <FormField label="Description">
            <Textarea rows={2} value={mDesc} onChange={(e) => setMDesc(e.target.value)} />
          </FormField>
        </div>
      </Modal>

      <ConfirmDialog
        open={psDecisionConfirm !== null}
        title={`Confirm Problem Statement ${psDecisionConfirm}`}
        message={`Record "${psDecisionConfirm}" for this problem statement (v${project.problem_statement_version})?`}
        confirmLabel={`Confirm ${psDecisionConfirm}`}
        confirmVariant={psDecisionConfirm === 'Changes Requested' ? 'danger' : 'success'}
        loading={saving}
        onCancel={() => setPsDecisionConfirm(null)}
        onConfirm={() => psDecisionConfirm && handleProblemStatementReview(psDecisionConfirm)}
      />
    </div>
  );
};

