import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardCheck, Plus } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardHeader } from '../../components/ui/Card';
import { FormField, Select } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { STAGE_EVALUATION_RUBRICS } from '../../constants/launchpad';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { saveStageEvaluation } from '../../services/evaluationService';

export const StageEvaluationsPage: React.FC = () => {
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [internId, setInternId] = useState('');
  const [stageNumber, setStageNumber] = useState<1 | 2 | 3 | 4>(1);
  const [creating, setCreating] = useState(false);

  if (loading) return <LoadingPage message="Loading LAUNCHPAD stage evaluations..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load stage evaluations.'} onRetry={refresh} />;

  const handleStartDraft = async () => {
    if (!profile) return;
    const targetInternId = internId || bundle.interns[0]?.intern.id;
    if (!targetInternId) return;

    const rubric = STAGE_EVALUATION_RUBRICS[stageNumber];
    setCreating(true);
    try {
      const created = await saveStageEvaluation({
        internId: targetInternId,
        mentorId: bundle.mentor.id,
        stageNumber,
        metricScores: rubric.metrics.map((m) => ({
          metric_key: m.metric_key,
          metric_name: m.metric_name,
          weight: m.weight,
          score: 0,
          comments: '',
        })),
        comments: '',
        recommendations: '',
        evaluationDate: new Date().toISOString().slice(0, 10),
        status: 'Draft',
        thresholds: bundle.classificationConfig.thresholds,
        approvalStatus: bundle.classificationConfig.approvalStatus,
        actorProfileId: profile.id,
      });
      setModalOpen(false);
      await refresh();
      navigate(`/mentor/evaluations/${created.id}`);
    } catch (err) {
      showToast('error', 'Could not create evaluation draft', formatAppError(err));
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Stage-Wise Evaluations</h1>
          <p className="text-sm text-[#64748B]">
            Official LAUNCHPAD Stage 1–4 evaluation forms with fixed rubric weights (Total = 100)
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          disabled={bundle.interns.length === 0}
        >
          New Stage Evaluation
        </Button>
      </div>

      {bundle.stageEvaluations.length === 0 ? (
        <EmptyState
          icon={<ClipboardCheck className="w-6 h-6" />}
          title="No stage evaluations recorded yet"
          description="Start a Stage 1, 2, 3, or 4 evaluation using the official SmartBridge LAUNCHPAD rubrics."
          action={
            bundle.interns.length > 0 ? (
              <Button onClick={() => setModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                Start Stage Evaluation
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <CardHeader title="Evaluation History & Drafts" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Intern</th>
                  <th className="py-3 px-4">Stage Rubric</th>
                  <th className="py-3 px-4">Evaluation Date</th>
                  <th className="py-3 px-4">Total Score</th>
                  <th className="py-3 px-4">Classification</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bundle.stageEvaluations.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">{ev.intern?.profile?.full_name}</td>
                    <td className="py-3 px-4">{STAGE_EVALUATION_RUBRICS[ev.stage_number].stageName}</td>
                    <td className="py-3 px-4 text-[#64748B]">{ev.evaluation_date}</td>
                    <td className="py-3 px-4 font-bold text-[#172B4D]">{ev.total_score} / 100</td>
                    <td className="py-3 px-4">
                      {ev.classification_label ? (
                        <Badge status={ev.classification_label}>
                          {ev.classification_label} ({ev.classification_approval_status === 'APPROVED' ? 'Approved' : 'Proposed'})
                        </Badge>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="py-3 px-4"><Badge status={ev.status}>{ev.status}</Badge></td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/mentor/evaluations/${ev.id}`}>
                        <Button size="sm" variant={ev.status === 'Draft' ? 'primary' : 'outline'}>
                          {ev.status === 'Draft' ? 'Continue Draft' : 'View Submitted'}
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Start Official Stage Evaluation"
        subtitle="Select an assigned intern and LAUNCHPAD stage rubric"
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleStartDraft} loading={creating}>Create Draft</Button>
          </>
        }
      >
        <div className="space-y-4">
          <FormField label="Assigned Intern" required>
            <Select
              value={internId || bundle.interns[0]?.intern.id || ''}
              onChange={(e) => setInternId(e.target.value)}
            >
              {bundle.interns.map((i) => (
                <option key={i.intern.id} value={i.intern.id}>
                  {i.intern.profile?.full_name} ({i.intern.intern_code})
                </option>
              ))}
            </Select>
          </FormField>
          <FormField label="Stage Evaluation Rubric" required>
            <Select
              value={String(stageNumber)}
              onChange={(e) => setStageNumber(Number(e.target.value) as 1 | 2 | 3 | 4)}
            >
              <option value="1">Stage 1 – Learner Evaluation (Weeks 1–6)</option>
              <option value="2">Stage 2 – Practitioner Evaluation (Weeks 7–12)</option>
              <option value="3">Stage 3 – Developer Evaluation (Weeks 13–18)</option>
              <option value="4">Stage 4 – Professional Evaluation (Weeks 19–24)</option>
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  );
};
