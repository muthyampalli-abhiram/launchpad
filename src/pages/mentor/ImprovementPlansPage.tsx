import React, { useState } from 'react';
import { Plus, Target } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { FormField, Input, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { KPI_PILLARS, LAUNCHPAD_STAGES } from '../../constants/launchpad';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { saveImprovementPlan } from '../../services/projectAndCertService';
import type { ImprovementPlan, ImprovementPlanStatus, KpiPillar } from '../../types/database';

export const ImprovementPlansPage: React.FC = () => {
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [statusFilter, setStatusFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ImprovementPlan | null>(null);
  const [saving, setSaving] = useState(false);

  // Form fields (Section 16)
  const [internId, setInternId] = useState('');
  const [stageNumber, setStageNumber] = useState('1');
  const [weakness, setWeakness] = useState('');
  const [kpiPillar, setKpiPillar] = useState<KpiPillar | ''>('BUILD');
  const [metric, setMetric] = useState('');
  const [objective, setObjective] = useState('');
  const [action, setAction] = useState('');
  const [resources, setResources] = useState('');
  const [assignedTaskId, setAssignedTaskId] = useState('');
  const [targetDate, setTargetDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
  const [followUpDate, setFollowUpDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [planStatus, setPlanStatus] = useState<ImprovementPlanStatus>('Open');
  const [comments, setComments] = useState('');
  const [outcome, setOutcome] = useState('');

  if (loading) return <LoadingPage message="Loading improvement plans..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load improvement plans.'} onRetry={refresh} />;

  const plans = bundle.improvementPlans.filter(
    (p) => statusFilter === 'ALL' || p.status === statusFilter
  );

  const openCreateModal = () => {
    setEditing(null);
    setInternId(bundle.interns[0]?.intern.id ?? '');
    setStageNumber(String(bundle.interns[0]?.intern.current_stage ?? 1));
    setWeakness('');
    setKpiPillar('BUILD');
    setMetric('');
    setObjective('');
    setAction('');
    setResources('');
    setAssignedTaskId('');
    setTargetDate(new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10));
    setFollowUpDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setPlanStatus('Open');
    setComments('');
    setOutcome('');
    setModalOpen(true);
  };

  const openEditModal = (plan: ImprovementPlan) => {
    setEditing(plan);
    setInternId(plan.intern_id);
    setStageNumber(String(plan.stage_number));
    setWeakness(plan.identified_weakness);
    setKpiPillar(plan.kpi_pillar ?? '');
    setMetric(plan.evaluation_metric ?? '');
    setObjective(plan.improvement_objective);
    setAction(plan.recommended_action);
    setResources(plan.learning_resources ?? '');
    setAssignedTaskId(plan.assigned_task_id ?? '');
    setTargetDate(plan.target_completion_date);
    setFollowUpDate(plan.follow_up_date ?? '');
    setPlanStatus(plan.status);
    setComments(plan.mentor_comments ?? '');
    setOutcome(plan.outcome ?? '');
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!profile) return;
    const internObj = bundle.interns.find((i) => i.intern.id === internId);
    setSaving(true);
    try {
      await saveImprovementPlan({
        id: editing?.id,
        internId,
        internProfileId: internObj?.intern.profile_id,
        mentorId: bundle.mentor.id,
        stageNumber: Number(stageNumber),
        identifiedWeakness: weakness,
        kpiPillar,
        evaluationMetric: metric,
        improvementObjective: objective,
        recommendedAction: action,
        learningResources: resources,
        assignedTaskId: assignedTaskId || null,
        targetCompletionDate: targetDate,
        followUpDate,
        status: planStatus,
        mentorComments: comments,
        outcome,
        actorProfileId: profile.id,
      });
      showToast('success', editing ? 'Improvement plan updated' : 'Improvement plan created');
      setModalOpen(false);
      await refresh();
    } catch (err) {
      showToast('error', 'Unable to save plan', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Improvement Plan Management</h1>
          <p className="text-sm text-[#64748B]">
            Identify skill gaps and guide assigned interns through structured remediation. Creating a plan supports development and does not mark an intern unsuccessful.
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={openCreateModal}
          disabled={bundle.interns.length === 0}
        >
          Create Improvement Plan
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-center justify-between">
          <div className="w-full sm:w-64">
            <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="ALL">All Plan Statuses</option>
              {['Open', 'In Progress', 'Under Review', 'Completed', 'Escalated'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
          </div>
          <span className="text-xs text-[#64748B]">{plans.length} plan(s) shown</span>
        </CardContent>
      </Card>

      {plans.length === 0 ? (
        <EmptyState
          icon={<Target className="w-6 h-6" />}
          title="No improvement plans found"
          description="Create a structured improvement plan whenever an assigned intern needs targeted coaching on a KPI pillar or evaluation metric."
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {plans.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-5 space-y-3 text-xs">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-[#172B4D]">{p.improvement_objective}</p>
                    <p className="text-[#64748B]">
                      {p.intern?.profile?.full_name} · Stage {p.stage_number} {p.kpi_pillar ? `· ${p.kpi_pillar}` : ''}
                    </p>
                  </div>
                  <Badge status={p.status}>{p.status}</Badge>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 space-y-1">
                  <p><strong className="text-[#172B4D]">Identified Weakness:</strong> {p.identified_weakness}</p>
                  <p><strong className="text-[#172B4D]">Recommended Action:</strong> {p.recommended_action}</p>
                  {p.learning_resources && <p><strong className="text-[#172B4D]">Resources:</strong> {p.learning_resources}</p>}
                  {p.outcome && <p><strong className="text-[#172B4D]">Outcome:</strong> {p.outcome}</p>}
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[#64748B]">
                    Target: {p.target_completion_date} {p.follow_up_date ? `· Follow-up: ${p.follow_up_date}` : ''}
                  </span>
                  <Button size="sm" variant="outline" onClick={() => openEditModal(p)}>
                    Update Progress
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Update Improvement Plan' : 'Create Improvement Plan'}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Save Plan</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <FormField label="Assigned Intern" required>
              <Select value={internId} disabled={Boolean(editing)} onChange={(e) => setInternId(e.target.value)}>
                {bundle.interns.map((i) => (
                  <option key={i.intern.id} value={i.intern.id}>{i.intern.profile?.full_name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="LAUNCHPAD Stage" required>
              <Select value={stageNumber} onChange={(e) => setStageNumber(e.target.value)}>
                {LAUNCHPAD_STAGES.map((s) => (
                  <option key={s.stage} value={String(s.stage)}>{s.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Status" required>
              <Select value={planStatus} onChange={(e) => setPlanStatus(e.target.value as ImprovementPlanStatus)}>
                {['Open', 'In Progress', 'Under Review', 'Completed', 'Escalated'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Related KPI Pillar">
              <Select value={kpiPillar} onChange={(e) => setKpiPillar(e.target.value as KpiPillar | '')}>
                <option value="">None / General</option>
                {KPI_PILLARS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Related Evaluation Metric">
              <Input value={metric} onChange={(e) => setMetric(e.target.value)} placeholder="e.g., Troubleshooting and Independent Application" />
            </FormField>
          </div>

          <FormField label="Identified Weakness / Performance Gap" required>
            <Textarea rows={2} value={weakness} onChange={(e) => setWeakness(e.target.value)} />
          </FormField>
          <FormField label="Improvement Objective" required>
            <Textarea rows={2} value={objective} onChange={(e) => setObjective(e.target.value)} />
          </FormField>
          <FormField label="Recommended Action" required>
            <Textarea rows={2} value={action} onChange={(e) => setAction(e.target.value)} />
          </FormField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Required Learning Resources">
              <Textarea rows={2} value={resources} onChange={(e) => setResources(e.target.value)} />
            </FormField>
            <FormField label="Link Assigned Task (Optional)">
              <Select value={assignedTaskId} onChange={(e) => setAssignedTaskId(e.target.value)}>
                <option value="">No linked task</option>
                {bundle.tasks
                  .filter((t) => t.intern_id === internId)
                  .map((t) => (
                    <option key={t.id} value={t.id}>{t.title}</option>
                  ))}
              </Select>
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Target Completion Date" required>
              <Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
            </FormField>
            <FormField label="Follow-up Date">
              <Input type="date" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Mentor Comments">
              <Textarea rows={2} value={comments} onChange={(e) => setComments(e.target.value)} />
            </FormField>
            <FormField label="Outcome">
              <Textarea rows={2} value={outcome} onChange={(e) => setOutcome(e.target.value)} />
            </FormField>
          </div>
        </div>
      </Modal>
    </div>
  );
};

