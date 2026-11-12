import React, { useMemo, useState } from 'react';
import { Download, FileBarChart2 } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormField, Select } from '../../components/ui/FormControls';
import { ErrorState, LoadingPage } from '../../components/ui/States';
import { getStageLabel } from '../../constants/launchpad';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { exportToCsv, exportToExcel, exportToPdf } from '../../lib/export';

type ReportKind = 'INDIVIDUAL_INTERN' | 'MENTOR_WORKLOAD' | 'KPI_PERFORMANCE';

export const ReportsPage: React.FC = () => {
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();

  const [reportKind, setReportKind] = useState<ReportKind>('INDIVIDUAL_INTERN');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [internFilter, setInternFilter] = useState('ALL');

  const reportData = useMemo((): { title: string; rows: Record<string, string | number>[] } => {
    if (!bundle) return { title: '', rows: [] };

    const matchingInterns = bundle.interns.filter((i) => {
      if (batchFilter !== 'ALL' && i.intern.batch_id !== batchFilter) return false;
      if (internFilter !== 'ALL' && i.intern.id !== internFilter) return false;
      return true;
    });

    if (reportKind === 'INDIVIDUAL_INTERN') {
      return {
        title: 'Individual Intern Summary Report',
        rows: matchingInterns.map((item) => {
          const baseline = bundle.baselineAssessments.find((b) => b.intern_id === item.intern.id);
          const stageEval = bundle.stageEvaluations.find(
            (e) => e.intern_id === item.intern.id && e.stage_number === item.intern.current_stage
          );
          const proj = bundle.projects.find((p) => p.intern_id === item.intern.id);
          const activePlans = bundle.improvementPlans.filter(
            (p) => p.intern_id === item.intern.id && p.status !== 'Completed'
          ).length;

          return {
            'Intern Code': item.intern.intern_code,
            'Intern Name': item.intern.profile?.full_name ?? '',
            Batch: item.intern.batch?.name ?? '—',
            'Current Stage': getStageLabel(item.intern.current_stage),
            'Baseline Score': baseline ? baseline.total_score : 'Pending',
            'Latest KPI': item.latestKpi ? item.latestKpi.overall_score : '—',
            'Latest Stage Eval': stageEval ? `${stageEval.total_score} (${stageEval.status})` : '—',
            'Tasks Done / Pending': `${item.completedTasksCount} / ${item.pendingTasksCount}`,
            'Project Status': proj?.status ?? '—',
            'Week 12 Cert': item.week12CertStatus,
            'Week 24 Cert': item.week24CertStatus,
            'Active Improvement Plans': activePlans,
          };
        }),
      };
    }

    if (reportKind === 'MENTOR_WORKLOAD') {
      const pendingTaskReviews = bundle.submissions.filter((s) =>
        ['Submitted', 'Under Review', 'Resubmitted'].includes(s.status)
      ).length;
      const pendingReports = bundle.monthlyReports.filter((r) =>
        ['Submitted', 'Under Review', 'Resubmitted'].includes(r.status)
      ).length;
      const pendingCerts = bundle.certifications.filter((c) => c.status === 'Pending Verification').length;
      const overdueTasks = bundle.tasks.filter((t) => t.status === 'Overdue').length;
      const completedReviews =
        bundle.submissions.filter((s) => s.status === 'Approved').length +
        bundle.monthlyReports.filter((r) => ['Reviewed', 'Approved'].includes(r.status)).length +
        bundle.stageEvaluations.filter((e) => e.status !== 'Draft').length;

      return {
        title: 'Mentor Workload Report',
        rows: [
          {
            Mentor: profile?.full_name ?? '',
            'Total Assigned Interns': bundle.interns.length,
            'Active Assigned Interns': bundle.interns.filter((i) => i.intern.status === 'Active').length,
            'Pending Task Reviews': pendingTaskReviews,
            'Pending Monthly Reports': pendingReports,
            'Pending Cert Verifications': pendingCerts,
            'Overdue Tasks': overdueTasks,
            'Completed Reviews': completedReviews,
          },
        ],
      };
    }

    const internIds = new Set(matchingInterns.map((i) => i.intern.id));
    return {
      title: 'LAUNCHPAD KPI Performance Report',
      rows: bundle.kpiEvaluations
        .filter((k) => internIds.has(k.intern_id) && k.is_current)
        .map((k) => {
          const internName =
            bundle.interns.find((i) => i.intern.id === k.intern_id)?.intern.profile?.full_name ?? k.intern_id;
          return {
            Intern: internName,
            Month: k.reporting_month,
            'LEARN (25%)': k.learn_score,
            'BUILD (45%)': k.build_score,
            'SHARE (15%)': k.share_score,
            'SHOWCASE (15%)': k.showcase_score,
            'Overall KPI': k.overall_score,
            Status: k.review_status,
          };
        }),
    };
  }, [bundle, reportKind, batchFilter, internFilter, profile?.full_name]);

  if (loading) return <LoadingPage message="Preparing Mentor Reports..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load report data.'} onRetry={refresh} />;

  const filterSummary = `Batch: ${batchFilter}, Intern: ${internFilter}`;
  const metadata = {
    reportTitle: reportData.title,
    generatedBy: `${profile?.full_name ?? 'Mentor'} (${profile?.email ?? ''})`,
    filterSummary,
  };

  const headers = reportData.rows.length > 0 ? Object.keys(reportData.rows[0]) : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Reports & Analytics</h1>
          <p className="text-sm text-[#64748B]">
            Generate and export authorized reports (Excel, CSV, PDF) scoped strictly to your assigned interns
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToCsv(reportData.rows, metadata)}>
            Export CSV
          </Button>
          <Button variant="outline" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToExcel(reportData.rows, metadata)}>
            Export Excel (.xlsx)
          </Button>
          <Button variant="primary" size="sm" icon={<Download className="w-3.5 h-3.5" />} onClick={() => exportToPdf(reportData.rows, metadata)}>
            Export PDF
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Report Type">
            <Select value={reportKind} onChange={(e) => setReportKind(e.target.value as ReportKind)}>
              <option value="INDIVIDUAL_INTERN">Individual Intern Summary Report</option>
              <option value="MENTOR_WORKLOAD">Mentor Workload Report</option>
              <option value="KPI_PERFORMANCE">KPI Performance Report</option>
            </Select>
          </FormField>
          <FormField label="Batch Filter">
            <Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)}>
              <option value="ALL">All Assigned Batches</option>
              {bundle.batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </FormField>
          <FormField label="Intern Filter">
            <Select value={internFilter} onChange={(e) => setInternFilter(e.target.value)}>
              <option value="ALL">All Assigned Interns</option>
              {bundle.interns.map((i) => (
                <option key={i.intern.id} value={i.intern.id}>{i.intern.profile?.full_name}</option>
              ))}
            </Select>
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          title={reportData.title}
          subtitle={`${reportData.rows.length} row(s) · Includes report date, filters, and mentor attribution on export`}
          action={<FileBarChart2 className="w-4 h-4 text-[#2563EB]" />}
        />
        <CardContent className="p-0 overflow-x-auto">
          {reportData.rows.length === 0 ? (
            <p className="p-6 text-xs text-[#64748B] text-center">No authorized records matched the selected report filters.</p>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  {headers.map((h) => (
                    <th key={h} className="py-3 px-4 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reportData.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    {headers.map((h) => (
                      <td key={h} className="py-3 px-4 whitespace-nowrap text-[#172B4D]">{row[h]}</td>
                    ))}
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
