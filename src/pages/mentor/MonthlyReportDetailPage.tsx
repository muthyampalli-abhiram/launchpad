import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, RotateCcw } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FileAttachmentButton } from '../../components/ui/FileAttachmentButton';
import { FormField, Input, Textarea } from '../../components/ui/FormControls';
import { ConfirmDialog } from '../../components/ui/Modal';
import { ErrorState, LoadingPage } from '../../components/ui/States';
import { calculateOverallKpi, KPI_PILLARS } from '../../constants/launchpad';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { submitMonthlyKpiReview } from '../../services/evaluationService';
import type { KpiPillar, KpiPillarDetail } from '../../types/database';

export const MonthlyReportDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const report = bundle?.monthlyReports.find((r) => r.id === id);
  const currentEval = (report?.evaluations ?? []).find((e) => e.is_current) ?? report?.evaluations?.[0];

  const [learn, setLearn] = useState('0');
  const [build, setBuild] = useState('0');
  const [share, setShare] = useState('0');
  const [showcase, setShowcase] = useState('0');
  const [pillarDetails, setPillarDetails] = useState<Partial<Record<KpiPillar, KpiPillarDetail>>>({});
  const [comments, setComments] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [confirmAction, setConfirmAction] = useState<'Revision Requested' | 'Reviewed' | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (currentEval) {
      setLearn(String(currentEval.learn_score));
      setBuild(String(currentEval.build_score));
      setShare(String(currentEval.share_score));
      setShowcase(String(currentEval.showcase_score));
      setPillarDetails(currentEval.pillar_details ?? {});
      setComments(currentEval.comments ?? '');
      setSuggestions(currentEval.improvement_suggestions ?? '');
    }
  }, [currentEval]);

  if (loading) return <LoadingPage message="Loading monthly KPI report..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load report.'} onRetry={refresh} />;
  if (!report) {
    return <ErrorState title="Report Not Found" message="Monthly report not found or inaccessible." />;
  }

  const liveOverall = calculateOverallKpi(Number(learn), Number(build), Number(share), Number(showcase));

  const internHistory = bundle.kpiEvaluations
    .filter((k) => k.intern_id === report.intern_id && k.is_current)
    .sort((a, b) => a.reporting_month.localeCompare(b.reporting_month))
    .map((k) => ({ month: k.reporting_month, overall: Number(k.overall_score) }));

  const updatePillarField = (pillar: KpiPillar, field: keyof KpiPillarDetail, value: string) => {
    setPillarDetails((prev) => ({
      ...prev,
      [pillar]: {
        ...(prev[pillar] ?? {}),
        [field]: value,
      },
    }));
  };

  const handleSave = async (action: 'Draft' | 'Revision Requested' | 'Reviewed') => {
    if (!profile) return;
    setSaving(true);
    try {
      await submitMonthlyKpiReview({
        monthlyReportId: report.id,
        internId: report.intern_id,
        internProfileId: report.intern?.profile_id,
        mentorId: bundle.mentor.id,
        reportingMonth: report.reporting_month,
        learnScore: Number(learn),
        buildScore: Number(build),
        shareScore: Number(share),
        showcaseScore: Number(showcase),
        pillarDetails,
        comments,
        improvementSuggestions: suggestions,
        action,
        previousVersionCount: (report.evaluations ?? []).length,
        actorProfileId: profile.id,
      });
      showToast('success', 'Monthly KPI review saved', `Status: ${action} · Overall Score: ${liveOverall}/100`);
      setConfirmAction(null);
      await refresh();
    } catch (err) {
      showToast('error', 'Failed to save review', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  const scoreMap: Record<KpiPillar, { value: string; set: (v: string) => void; internText?: string | null }> = {
    LEARN: {
      value: learn,
      set: setLearn,
      internText: [report.learning_activities, report.technical_skills].filter(Boolean).join(' · '),
    },
    BUILD: {
      value: build,
      set: setBuild,
      internText: [report.work_completed, report.tasks_completed_summary, report.projects_milestones_summary]
        .filter(Boolean)
        .join(' · '),
    },
    SHARE: {
      value: share,
      set: setShare,
      internText: report.knowledge_sharing,
    },
    SHOWCASE: {
      value: showcase,
      set: setShowcase,
      internText: report.demonstrations,
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/mentor/monthly-reports">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D]">
                Monthly KPI Review · {report.intern?.profile?.full_name} ({report.reporting_month})
              </h1>
              <Badge status={report.status}>{report.status}</Badge>
            </div>
            <p className="text-xs text-[#64748B]">
              Official Formula: (LEARN × 0.25) + (BUILD × 0.45) + (SHARE × 0.15) + (SHOWCASE × 0.15) ={' '}
              <strong className="text-[#172B4D]">{liveOverall}/100</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Intern Submitted Details */}
      <Card>
        <CardHeader title="Intern Monthly Submission Details" />
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="font-semibold text-[#64748B] uppercase text-[10px]">Work Completed</p>
            <p className="text-[#172B4D] mt-1 whitespace-pre-wrap">{report.work_completed || '—'}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="font-semibold text-[#64748B] uppercase text-[10px]">Learning Activities & Technical Skills</p>
            <p className="text-[#172B4D] mt-1 whitespace-pre-wrap">
              {[report.learning_activities, report.technical_skills].filter(Boolean).join('\n') || '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="font-semibold text-[#64748B] uppercase text-[10px]">Tasks & Projects Summary</p>
            <p className="text-[#172B4D] mt-1 whitespace-pre-wrap">
              {[report.tasks_completed_summary, report.projects_milestones_summary].filter(Boolean).join('\n') || '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="font-semibold text-[#64748B] uppercase text-[10px]">Knowledge Sharing & Demonstrations</p>
            <p className="text-[#172B4D] mt-1 whitespace-pre-wrap">
              {[report.knowledge_sharing, report.demonstrations].filter(Boolean).join('\n') || '—'}
            </p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="font-semibold text-[#64748B] uppercase text-[10px]">Intern Self-Assessment</p>
            <p className="text-[#172B4D] mt-1">{report.self_assessment || '—'}</p>
          </div>
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
            <p className="font-semibold text-[#64748B] uppercase text-[10px]">Intern Comments & Evidence</p>
            <p className="text-[#172B4D] mt-1">{report.intern_comments || '—'}</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {(report.supporting_evidence ?? []).map((ev) => (
                <FileAttachmentButton key={ev.path} storagePath={ev.path} fileName={ev.name} compact />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4 KPI Pillar Review Form */}
      <Card>
        <CardHeader
          title="KPI Pillar Scoring & Mentor Assessment"
          subtitle="All four pillar scores are out of 100. Review history is preserved on every submission."
          action={<Badge tone="navy">Calculated Overall: {liveOverall} / 100</Badge>}
        />
        <CardContent className="space-y-5">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {KPI_PILLARS.map((pillar) => {
              const cfg = scoreMap[pillar.key];
              const detail = pillarDetails[pillar.key] ?? {};
              return (
                <div key={pillar.key} className="p-4 rounded-xl border border-slate-200 space-y-3 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-[#172B4D]">
                        {pillar.label} ({pillar.weightPct}%)
                      </h4>
                      <p className="text-[11px] text-[#64748B]">{pillar.description}</p>
                    </div>
                    <div className="w-24">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step="0.5"
                        value={cfg.value}
                        onChange={(e) => cfg.set(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-100">
                    <span className="font-semibold text-[#64748B]">Intern Info: </span>
                    <span className="text-[#172B4D]">{cfg.internText || 'No specific entry submitted'}</span>
                  </div>
                  <FormField label="Mentor Assessment">
                    <Textarea
                      rows={2}
                      value={detail.mentor_assessment ?? ''}
                      onChange={(e) => updatePillarField(pillar.key, 'mentor_assessment', e.target.value)}
                    />
                  </FormField>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <FormField label="Comments">
                      <Input
                        value={detail.comments ?? ''}
                        onChange={(e) => updatePillarField(pillar.key, 'comments', e.target.value)}
                      />
                    </FormField>
                    <FormField label="Improvement Suggestions">
                      <Input
                        value={detail.improvement_suggestions ?? ''}
                        onChange={(e) => updatePillarField(pillar.key, 'improvement_suggestions', e.target.value)}
                      />
                    </FormField>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Overall Review Comments">
              <Textarea rows={3} value={comments} onChange={(e) => setComments(e.target.value)} />
            </FormField>
            <FormField label="Overall Improvement Suggestions">
              <Textarea rows={3} value={suggestions} onChange={(e) => setSuggestions(e.target.value)} />
            </FormField>
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={() => handleSave('Draft')} loading={saving}>
              Save Draft Review
            </Button>
            <Button
              variant="danger"
              icon={<RotateCcw className="w-4 h-4" />}
              onClick={() => setConfirmAction('Revision Requested')}
              disabled={saving}
            >
              Request Revisions
            </Button>
            <Button
              variant="success"
              icon={<CheckCircle2 className="w-4 h-4" />}
              onClick={() => setConfirmAction('Reviewed')}
              disabled={saving}
            >
              Submit Review ({liveOverall}/100)
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Previous Reviews History & Monthly Performance Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Review Version History" subtitle="Prior reviews are preserved without silent overwrites" />
          <CardContent className="space-y-2.5 text-xs">
            {(report.evaluations ?? []).length === 0 ? (
              <p className="text-[#64748B]">No review versions saved yet.</p>
            ) : (
              report.evaluations!.map((ev) => (
                <div key={ev.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#172B4D]">
                      Version {ev.version_number} · Overall {ev.overall_score}/100
                    </p>
                    <p className="text-[#64748B]">
                      L: {ev.learn_score} · B: {ev.build_score} · S: {ev.share_score} · Sh: {ev.showcase_score}
                    </p>
                  </div>
                  <Badge status={ev.review_status}>{ev.review_status}</Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Month-over-Month KPI Comparison" />
          <CardContent className="h-56">
            {internHistory.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                No historical monthly KPI scores yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={internHistory}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="overall" stroke="#2563EB" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <ConfirmDialog
        open={confirmAction !== null}
        title={`Confirm ${confirmAction}`}
        message={`Submit this monthly KPI evaluation with Overall Score ${liveOverall}/100 and status "${confirmAction}"? Previous review versions will remain archived in history.`}
        confirmLabel={`Confirm ${confirmAction}`}
        confirmVariant={confirmAction === 'Revision Requested' ? 'danger' : 'success'}
        loading={saving}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => confirmAction && handleSave(confirmAction)}
      />
    </div>
  );
};

