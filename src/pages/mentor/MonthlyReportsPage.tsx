import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/FormControls';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';

export const MonthlyReportsPage: React.FC = () => {
  const { bundle, loading, error, refresh } = useMentorWorkspace();

  const [internFilter, setInternFilter] = useState('ALL');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [monthFilter, setMonthFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [perfFilter, setPerfFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const rows = useMemo(() => {
    if (!bundle) return [];
    return bundle.monthlyReports.filter((rep) => {
      if (internFilter !== 'ALL' && rep.intern_id !== internFilter) return false;
      if (batchFilter !== 'ALL' && rep.intern?.batch_id !== batchFilter) return false;
      if (monthFilter && rep.reporting_month !== monthFilter) return false;
      if (statusFilter !== 'ALL' && rep.status !== statusFilter) return false;

      const currentEval = (rep.evaluations ?? []).find((e) => e.is_current) ?? rep.evaluations?.[0];
      const overall = currentEval ? Number(currentEval.overall_score) : null;
      if (perfFilter === 'HIGH' && (overall === null || overall < 85)) return false;
      if (perfFilter === 'MEDIUM' && (overall === null || overall < 60 || overall >= 85)) return false;
      if (perfFilter === 'LOW' && (overall === null || overall >= 60)) return false;

      const subDay = rep.submission_date?.slice(0, 10) ?? '';
      if (dateFrom && (!subDay || subDay < dateFrom)) return false;
      if (dateTo && (!subDay || subDay > dateTo)) return false;

      return true;
    });
  }, [bundle, internFilter, batchFilter, monthFilter, statusFilter, perfFilter, dateFrom, dateTo]);

  if (loading) return <LoadingPage message="Loading Monthly KPI Reports..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load monthly reports.'} onRetry={refresh} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Monthly KPI Reports</h1>
        <p className="text-sm text-[#64748B]">
          Review intern monthly reports using the official formula: (LEARN × 0.25) + (BUILD × 0.45) + (SHARE × 0.15) + (SHOWCASE × 0.15)
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
          <Select value={internFilter} onChange={(e) => setInternFilter(e.target.value)}>
            <option value="ALL">All Interns</option>
            {bundle.interns.map((i) => (
              <option key={i.intern.id} value={i.intern.id}>{i.intern.profile?.full_name}</option>
            ))}
          </Select>
          <Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
            <option value="ALL">All Batches</option>
            {bundle.batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </Select>
          <Input type="month" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)} title="Reporting Month" />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Statuses</option>
            {['Not Submitted', 'Submitted', 'Under Review', 'Revision Requested', 'Resubmitted', 'Reviewed', 'Approved'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={perfFilter} onChange={(e) => setPerfFilter(e.target.value)}>
            <option value="ALL">All KPI Levels</option>
            <option value="HIGH">High (&ge; 85)</option>
            <option value="MEDIUM">Standard (60–84.9)</option>
            <option value="LOW">Needs Support (&lt; 60)</option>
          </Select>
          <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
          <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<BarChart3 className="w-6 h-6" />}
          title="No monthly reports found"
          description="Monthly reports submitted by your assigned interns will appear here for KPI scoring and review."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Intern Name</th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">Month</th>
                  <th className="py-3 px-4">Submitted</th>
                  <th className="py-3 px-4">LEARN (25%)</th>
                  <th className="py-3 px-4">BUILD (45%)</th>
                  <th className="py-3 px-4">SHARE (15%)</th>
                  <th className="py-3 px-4">SHOWCASE (15%)</th>
                  <th className="py-3 px-4">Overall KPI</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((rep) => {
                  const kpi = (rep.evaluations ?? []).find((e) => e.is_current) ?? rep.evaluations?.[0];
                  return (
                    <tr key={rep.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-[#172B4D]">{rep.intern?.profile?.full_name ?? '—'}</td>
                      <td className="py-3 px-4">{rep.intern?.batch?.name ?? '—'}</td>
                      <td className="py-3 px-4 font-medium">{rep.reporting_month}</td>
                      <td className="py-3 px-4 text-[#64748B]">
                        {rep.submission_date ? new Date(rep.submission_date).toLocaleDateString() : '—'}
                      </td>
                      <td className="py-3 px-4">{kpi ? kpi.learn_score : '—'}</td>
                      <td className="py-3 px-4">{kpi ? kpi.build_score : '—'}</td>
                      <td className="py-3 px-4">{kpi ? kpi.share_score : '—'}</td>
                      <td className="py-3 px-4">{kpi ? kpi.showcase_score : '—'}</td>
                      <td className="py-3 px-4 font-bold text-[#172B4D]">
                        {kpi ? `${kpi.overall_score}/100` : '—'}
                      </td>
                      <td className="py-3 px-4"><Badge status={rep.status}>{rep.status}</Badge></td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/mentor/monthly-reports/${rep.id}`}>
                          <Button size="sm" variant="primary">Review Report</Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

