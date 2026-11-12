import React, { useState } from 'react';
import { Gauge, Plus, Trash2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormControls';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { saveBaselineAssessment } from '../../services/evaluationService';
import type { BaselineSkillScore } from '../../types/database';

const DEFAULT_BASELINE_SKILLS: BaselineSkillScore[] = [
  { skill: 'Programming Fundamentals', max_score: 25, score: 0, remarks: '' },
  { skill: 'Problem Solving & Logic', max_score: 25, score: 0, remarks: '' },
  { skill: 'Database & Web Concepts', max_score: 25, score: 0, remarks: '' },
  { skill: 'Communication & Learning Readiness', max_score: 25, score: 0, remarks: '' },
];

export const BaselineAssessmentsPage: React.FC = () => {
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [selectedInternId, setSelectedInternId] = useState('');
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 10));
  const [criteria, setCriteria] = useState<BaselineSkillScore[]>(DEFAULT_BASELINE_SKILLS);
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingPage message="Loading Week 0 Baseline Assessments..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load baseline assessments.'} onRetry={refresh} />;

  const activeInternId = selectedInternId || bundle.interns[0]?.intern.id || '';
  const existingEditable = bundle.baselineAssessments.find(
    (b) => b.intern_id === activeInternId && !b.is_historical && b.status === 'Draft'
  );

  const maxTotal = criteria.reduce((s, c) => s + Number(c.max_score || 0), 0);
  const currentTotal = criteria.reduce((s, c) => s + Number(c.score || 0), 0);
  const normalizedPct = maxTotal > 0 ? Math.round((currentTotal / maxTotal) * 10000) / 100 : 0;

  const updateCriterion = (idx: number, field: keyof BaselineSkillScore, val: string | number) => {
    setCriteria((prev) => prev.map((item, i) => (i === idx ? { ...item, [field]: val } : item)));
  };

  const handleSave = async (status: 'Draft' | 'Reviewed') => {
    if (!profile || !activeInternId) return;
    setSaving(true);
    try {
      await saveBaselineAssessment({
        existingId: existingEditable?.id,
        internId: activeInternId,
        mentorId: bundle.mentor.id,
        assessmentDate,
        criteriaScores: criteria,
        comments,
        status,
        actorProfileId: profile.id,
      });
      showToast('success', 'Baseline assessment saved', `Normalized Baseline Score: ${normalizedPct}/100`);
      await refresh();
    } catch (err) {
      showToast('error', 'Baseline validation failed', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Week 0 Baseline Assessment</h1>
        <p className="text-sm text-[#64748B]">
          Record and review starting skill benchmarks. Historical baseline records are preserved for longitudinal comparison.
        </p>
      </div>

      {bundle.interns.length === 0 ? (
        <EmptyState
          icon={<Gauge className="w-6 h-6" />}
          title="No assigned interns"
          description="Assign interns first to assess Week 0 baselines."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2">
            <CardHeader
              title="Assess / Review Week 0 Baseline"
              action={<Badge tone="navy">Normalized Score: {normalizedPct} / 100</Badge>}
            />
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Assigned Intern" required>
                  <Select value={activeInternId} onChange={(e) => setSelectedInternId(e.target.value)}>
                    {bundle.interns.map((i) => (
                      <option key={i.intern.id} value={i.intern.id}>
                        {i.intern.profile?.full_name} ({i.intern.intern_code})
                      </option>
                    ))}
                  </Select>
                </FormField>
                <FormField label="Assessment Date" required>
                  <Input type="date" value={assessmentDate} onChange={(e) => setAssessmentDate(e.target.value)} />
                </FormField>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#172B4D]">Skill Criteria & Scores</span>
                  <Button
                    variant="outline"
                    size="sm"
                    icon={<Plus className="w-3.5 h-3.5" />}
                    onClick={() =>
                      setCriteria((prev) => [...prev, { skill: '', max_score: 20, score: 0, remarks: '' }])
                    }
                  >
                    Add Skill
                  </Button>
                </div>

                {criteria.map((c, idx) => (
                  <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 p-3 rounded-lg bg-slate-50 border border-slate-200 items-center">
                    <div className="sm:col-span-5">
                      <Input
                        value={c.skill}
                        placeholder="Skill / Criterion"
                        onChange={(e) => updateCriterion(idx, 'skill', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={1}
                        value={c.max_score}
                        onChange={(e) => updateCriterion(idx, 'max_score', Number(e.target.value))}
                        title="Max Score"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        type="number"
                        min={0}
                        max={c.max_score}
                        value={c.score}
                        onChange={(e) => updateCriterion(idx, 'score', Number(e.target.value))}
                        title="Awarded Score"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Input
                        value={c.remarks ?? ''}
                        placeholder="Remarks"
                        onChange={(e) => updateCriterion(idx, 'remarks', e.target.value)}
                      />
                    </div>
                    <div className="sm:col-span-1 text-right">
                      {criteria.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setCriteria((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-[#DC2626] p-1 cursor-pointer"
                          aria-label="Remove criterion"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <FormField label="Reviewer Observations & Comments">
                <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
              </FormField>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => handleSave('Draft')} loading={saving}>
                  Save Draft
                </Button>
                <Button variant="primary" onClick={() => handleSave('Reviewed')} loading={saving}>
                  Submit Baseline Result
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader title="Historical Baseline Records" subtitle="Baseline vs. Current KPI Comparison" />
            <CardContent className="space-y-3 text-xs">
              {bundle.baselineAssessments.length === 0 ? (
                <p className="text-[#64748B]">No baseline records saved yet.</p>
              ) : (
                bundle.baselineAssessments.map((b) => {
                  const summary = bundle.interns.find((i) => i.intern.id === b.intern_id);
                  return (
                    <div key={b.id} className="p-3 rounded-lg border border-slate-200 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-[#172B4D]">{b.intern?.profile?.full_name}</span>
                        <Badge status={b.status}>{b.status}</Badge>
                      </div>
                      <p className="text-[#64748B]">Date: {b.assessment_date}</p>
                      <p className="font-medium text-[#172B4D]">
                        Baseline: {b.total_score}/100 · Latest KPI:{' '}
                        {summary?.latestKpi ? `${summary.latestKpi.overall_score}/100` : '—'}
                      </p>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};

