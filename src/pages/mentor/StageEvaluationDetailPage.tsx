import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Lock } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormControls';
import { ConfirmDialog } from '../../components/ui/Modal';
import { ErrorState, LoadingPage } from '../../components/ui/States';
import { classifyPerformance, STAGE_EVALUATION_RUBRICS } from '../../constants/launchpad';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { saveStageEvaluation } from '../../services/evaluationService';
import type { ProgressionDecision, StageMetricScore } from '../../types/database';

export const StageEvaluationDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const evaluation = bundle?.stageEvaluations.find((e) => e.id === id);

  const [metricScores, setMetricScores] = useState<StageMetricScore[]>([]);
  const [comments, setComments] = useState('');
  const [recommendations, setRecommendations] = useState('');
  const [evaluationDate, setEvaluationDate] = useState(new Date().toISOString().slice(0, 10));
  const [mentorRecommendation, setMentorRecommendation] =
    useState<NonNullable<ProgressionDecision['mentor_recommendation']>>('Recommend Progression');
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!evaluation) return;
    const rubric = STAGE_EVALUATION_RUBRICS[evaluation.stage_number];
    const normalized = rubric.metrics.map((official) => {
      const existing = evaluation.metric_scores.find((m) => m.metric_key === official.metric_key);
      return {
        metric_key: official.metric_key,
        metric_name: official.metric_name,
        weight: official.weight,
        score: existing?.score ?? 0,
        comments: existing?.comments ?? '',
        evidence_ref: existing?.evidence_ref ?? '',
      };
    });
    setMetricScores(normalized);
    setComments(evaluation.comments ?? '');
    setRecommendations(evaluation.recommendations ?? '');
    setEvaluationDate(evaluation.evaluation_date);
  }, [evaluation]);

  if (loading) return <LoadingPage message="Loading stage evaluation form..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load stage evaluation.'} onRetry={refresh} />;
  if (!evaluation) return <ErrorState title="Evaluation Not Found" message="Stage evaluation not found." />;

  const isLocked = evaluation.status !== 'Draft';
  const rubric = STAGE_EVALUATION_RUBRICS[evaluation.stage_number];
  const liveTotal = Math.round(metricScores.reduce((sum, m) => sum + Number(m.score || 0), 0) * 100) / 100;
  const classification = classifyPerformance(
    liveTotal,
    bundle.classificationConfig.thresholds,
    bundle.classificationConfig.approvalStatus
  );

  const updateMetric = (key: string, field: 'score' | 'comments' | 'evidence_ref', value: string | number) => {
    setMetricScores((prev) => prev.map((m) => (m.metric_key === key ? { ...m, [field]: value } : m)));
  };

  const handleSave = async (status: 'Draft' | 'Submitted') => {
    if (!profile) return;
    setSaving(true);
    try {
      await saveStageEvaluation({
        existingDraftId: evaluation.id,
        internId: evaluation.intern_id,
        internProfileId: evaluation.intern?.profile_id,
        mentorId: bundle.mentor.id,
        stageNumber: evaluation.stage_number,
        metricScores,
        comments,
        recommendations,
        evaluationDate,
        status,
        thresholds: bundle.classificationConfig.thresholds,
        approvalStatus: bundle.classificationConfig.approvalStatus,
        actorProfileId: profile.id,
        mentorRecommendation: status === 'Submitted' ? mentorRecommendation : undefined,
      });
      showToast(
        'success',
        status === 'Submitted' ? 'Stage evaluation submitted' : 'Draft saved',
        `Total Score: ${liveTotal}/100`
      );
      setConfirmSubmit(false);
      await refresh();
    } catch (err) {
      showToast('error', 'Evaluation validation failed', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/mentor/evaluations">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D]">
                {rubric.stageName} · {evaluation.intern?.profile?.full_name}
              </h1>
              <Badge status={evaluation.status}>{evaluation.status}</Badge>
            </div>
            <p className="text-xs text-[#64748B]">
              Reviewer: {profile?.full_name} · Official Rubric Total: 100
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge tone="navy">Total: {liveTotal} / 100</Badge>
          <Badge status={classification.label}>
            {classification.label} ({classification.approvalStatus === 'APPROVED' ? 'Approved' : 'Proposed'})
          </Badge>
        </div>
      </div>

      {isLocked && (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 flex items-center gap-2.5 text-xs text-[#64748B]">
          <Lock className="w-4 h-4 text-[#172B4D]" />
          Submitted evaluations are locked to preserve evaluation history and audit integrity. Admin reviews and records final progression decisions.
        </div>
      )}

      <Card>
        <CardHeader title="Official Stage Evaluation Metrics" subtitle="Scores must be non-negative and within each metric weight" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Evaluation Date" required>
              <Input
                type="date"
                value={evaluationDate}
                disabled={isLocked}
                onChange={(e) => setEvaluationDate(e.target.value)}
              />
            </FormField>
            <FormField label="Mentor Progression Recommendation" hint="Admin makes final progression decision">
              <Select
                value={mentorRecommendation}
                disabled={isLocked}
                onChange={(e) =>
                  setMentorRecommendation(e.target.value as NonNullable<ProgressionDecision['mentor_recommendation']>)
                }
              >
                <option value="Recommend Progression">Recommend Progression</option>
                <option value="Recommend Conditional Progression">Recommend Conditional Progression</option>
                <option value="Recommend Extension / Improvement Plan">Recommend Extension / Improvement Plan</option>
              </Select>
            </FormField>
          </div>

          <div className="space-y-3">
            {metricScores.map((m) => (
              <div key={m.metric_key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[#172B4D]">{m.metric_name}</p>
                    <p className="text-xs text-[#64748B]">Maximum Weight: {m.weight}</p>
                  </div>
                  <div className="w-28">
                    <Input
                      type="number"
                      min={0}
                      max={m.weight}
                      step="0.5"
                      disabled={isLocked}
                      value={m.score}
                      onChange={(e) => updateMetric(m.metric_key, 'score', Number(e.target.value))}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <FormField label="Metric Comments">
                    <Input
                      disabled={isLocked}
                      value={m.comments}
                      placeholder="Evidence-backed justification..."
                      onChange={(e) => updateMetric(m.metric_key, 'comments', e.target.value)}
                    />
                  </FormField>
                  <FormField label="Evidence Reference / Link">
                    <Input
                      disabled={isLocked}
                      value={m.evidence_ref ?? ''}
                      placeholder="Task, project milestone, or document ref"
                      onChange={(e) => updateMetric(m.metric_key, 'evidence_ref', e.target.value)}
                    />
                  </FormField>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Overall Evaluator Comments">
              <Textarea rows={3} disabled={isLocked} value={comments} onChange={(e) => setComments(e.target.value)} />
            </FormField>
            <FormField label="Recommendations & Next Steps">
              <Textarea rows={3} disabled={isLocked} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} />
            </FormField>
          </div>

          {!isLocked && (
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => handleSave('Draft')} loading={saving}>
                Save Draft
              </Button>
              <Button
                variant="success"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => setConfirmSubmit(true)}
                disabled={saving}
              >
                Submit Stage Evaluation ({liveTotal}/100)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmSubmit}
        title="Submit Stage Evaluation"
        message={`Once submitted (${liveTotal}/100), this evaluation will be shared with Admin for progression review and visible to the intern. Historical records are preserved.`}
        confirmLabel="Submit Evaluation"
        confirmVariant="success"
        loading={saving}
        onCancel={() => setConfirmSubmit(false)}
        onConfirm={() => handleSave('Submitted')}
      />
    </div>
  );
};

