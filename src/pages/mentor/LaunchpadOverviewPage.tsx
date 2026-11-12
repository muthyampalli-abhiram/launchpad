import React from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, ShieldCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { ErrorState, LoadingPage } from '../../components/ui/States';
import { getStageLabel, KPI_PILLARS, LAUNCHPAD_STAGES } from '../../constants/launchpad';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';

export const LaunchpadOverviewPage: React.FC = () => {
  const { bundle, loading, error, refresh } = useMentorWorkspace();

  if (loading) return <LoadingPage message="Loading LAUNCHPAD 24-week framework..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load LAUNCHPAD overview.'} onRetry={refresh} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">LAUNCHPAD 24-Week Program Monitoring</h1>
        <p className="text-sm text-[#64748B]">
          Track assigned interns across Week 0 Baseline and Stages 1–4. Progression relies on evaluation evidence and authorized administrative decisions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {LAUNCHPAD_STAGES.map((st) => (
          <Card key={st.stage}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between">
                <Badge tone="blue">{st.weeks}</Badge>
                <BookOpen className="w-4 h-4 text-[#64748B]" />
              </div>
              <h3 className="text-sm font-bold text-[#172B4D]">{st.name}</h3>
              <p className="text-xs text-[#64748B]">{st.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader title="Official KPI Pillar Weights" subtitle="Shared formula across Admin, Mentor, and Intern Portals" />
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {KPI_PILLARS.map((p) => (
            <div key={p.key} className="p-3.5 rounded-lg border border-slate-200 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-[#172B4D]">{p.label}</span>
                <Badge tone="navy">{p.weightPct}%</Badge>
              </div>
              <p className="text-xs text-[#64748B] mt-1.5">{p.description}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title="Assigned Intern Stage Readiness & Progression"
          subtitle="Mentors provide recommendations; authorized Admins record final progression decisions"
          action={
            <span className="inline-flex items-center gap-1.5 text-xs text-[#64748B]">
              <ShieldCheck className="w-4 h-4 text-[#16A34A]" /> Evidence-Based Progression Policy
            </span>
          }
        />
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                <th className="py-3 px-4">Intern</th>
                <th className="py-3 px-4">Current Stage</th>
                <th className="py-3 px-4">Stage Dates</th>
                <th className="py-3 px-4">Baseline</th>
                <th className="py-3 px-4">Latest KPI</th>
                <th className="py-3 px-4">Stage Evaluation</th>
                <th className="py-3 px-4">Admin Progression Decision</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bundle.interns.map((item) => {
                const baseline = bundle.baselineAssessments.find((b) => b.intern_id === item.intern.id);
                const stageEval = bundle.stageEvaluations.find(
                  (e) => e.intern_id === item.intern.id && e.stage_number === item.intern.current_stage
                );
                const decision = bundle.progressionDecisions.find((d) => d.intern_id === item.intern.id);
                return (
                  <tr key={item.intern.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">
                      <Link to={`/mentor/interns/${item.intern.id}`} className="hover:text-[#2563EB]">
                        {item.intern.profile?.full_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{getStageLabel(item.intern.current_stage)}</td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {item.intern.stage_start_date ?? '—'} → {item.intern.stage_end_date ?? '—'}
                    </td>
                    <td className="py-3 px-4">{baseline ? `${baseline.total_score}/100` : 'Pending'}</td>
                    <td className="py-3 px-4 font-semibold">
                      {item.latestKpi ? `${item.latestKpi.overall_score}/100` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {stageEval ? <Badge status={stageEval.status}>{stageEval.status} ({stageEval.total_score})</Badge> : 'Not Started'}
                    </td>
                    <td className="py-3 px-4">
                      {decision ? <Badge status={decision.admin_decision}>{decision.admin_decision}</Badge> : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link to="/mentor/evaluations">
                        <Button size="sm" variant="outline">Evaluate Stage</Button>
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
};

