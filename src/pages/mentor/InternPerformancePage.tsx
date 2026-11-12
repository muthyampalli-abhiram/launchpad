import React from 'react';
import { Link } from 'react-router-dom';
import { Info } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { classifyPerformance, getStageLabel } from '../../constants/launchpad';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';

export const InternPerformancePage: React.FC = () => {
  const { bundle, loading, error, refresh } = useMentorWorkspace();

  if (loading) return <LoadingPage message="Loading intern performance & classifications..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load performance data.'} onRetry={refresh} />;

  const { thresholds, approvalStatus } = bundle.classificationConfig;

  const internRows = bundle.interns.map((item) => {
    const score = item.latestKpi ? Number(item.latestKpi.overall_score) : null;
    const classification =
      score !== null ? classifyPerformance(score, thresholds, approvalStatus) : null;
    return { ...item, score, classification };
  });

  const distributionData = thresholds.map((t) => ({
    band: t.label,
    count: internRows.filter((r) => r.classification?.label === t.label).length,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Intern Performance & L1 / L2 / L3 Classification</h1>
        <p className="text-sm text-[#64748B]">
          KPI comparisons and supporting performance classifications across your assigned interns
        </p>
      </div>

      {/* Mandatory Workbook Policy Approval Banner */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
        <div className="text-xs text-[#172B4D] space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold">Performance Classification Policy Status:</span>
            <Badge tone={approvalStatus === 'APPROVED' ? 'green' : 'amber'}>
              {approvalStatus === 'APPROVED' ? 'Approved Policy' : 'Proposed (Pending Management Approval)'}
            </Badge>
          </div>
          <p className="text-[#64748B]">
            Bands (&lt;60 Development Required, 60–69 L1, 70–84 L2, 85–100 L3) are loaded from shared configuration
            and serve as supporting performance indicators only. Final progression and certification decisions require
            authorized administrative review.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader title="Classification Distribution" subtitle="Count of assigned interns by latest Overall KPI band" />
        <CardContent className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={distributionData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
              <XAxis dataKey="band" tick={{ fontSize: 11, fill: '#64748B' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
              <Tooltip />
              <Bar dataKey="count" name="Interns" fill="#2563EB" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader title="Assigned Intern KPI & Classification Matrix" />
        <CardContent className="p-0 overflow-x-auto">
          {internRows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="No assigned interns" description="Performance rows appear once interns are assigned." />
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Intern</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">LEARN (25%)</th>
                  <th className="py-3 px-4">BUILD (45%)</th>
                  <th className="py-3 px-4">SHARE (15%)</th>
                  <th className="py-3 px-4">SHOWCASE (15%)</th>
                  <th className="py-3 px-4">Overall KPI</th>
                  <th className="py-3 px-4">Classification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {internRows.map((row) => (
                  <tr key={row.intern.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link to={`/mentor/interns/${row.intern.id}`} className="font-semibold text-[#172B4D] hover:text-[#2563EB]">
                        {row.intern.profile?.full_name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">{getStageLabel(row.intern.current_stage)}</td>
                    <td className="py-3 px-4">{row.latestKpi?.learn_score ?? '—'}</td>
                    <td className="py-3 px-4">{row.latestKpi?.build_score ?? '—'}</td>
                    <td className="py-3 px-4">{row.latestKpi?.share_score ?? '—'}</td>
                    <td className="py-3 px-4">{row.latestKpi?.showcase_score ?? '—'}</td>
                    <td className="py-3 px-4 font-bold text-[#172B4D]">
                      {row.score !== null ? `${row.score}/100` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      {row.classification ? (
                        <div className="flex items-center gap-1.5">
                          <Badge status={row.classification.label}>{row.classification.label}</Badge>
                          <span className="text-[10px] text-[#64748B]">
                            ({row.classification.approvalStatus === 'APPROVED' ? 'Approved' : 'Proposed'})
                          </span>
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

