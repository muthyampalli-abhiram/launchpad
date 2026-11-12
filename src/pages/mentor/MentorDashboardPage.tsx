import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  Award,
  BarChart3,
  CheckCircle2,
  ClipboardCheck,
  Clock,
  FileCheck2,
  Filter,
  FolderKanban,
  RotateCcw,
  Users,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { Input, Select } from '../../components/ui/FormControls';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { getStageLabel, LAUNCHPAD_STAGES } from '../../constants/launchpad';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';

const CHART_COLORS = ['#2563EB', '#16A34A', '#F59E0B', '#DC2626', '#172B4D'];

export const MentorDashboardPage: React.FC = () => {
  const { bundle, loading, error, refresh } = useMentorWorkspace();

  const [batchFilter, setBatchFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [internFilter, setInternFilter] = useState('ALL');
  const [taskStatusFilter, setTaskStatusFilter] = useState('ALL');
  const [evalStatusFilter, setEvalStatusFilter] = useState('ALL');
  const [certStatusFilter, setCertStatusFilter] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const resetFilters = () => {
    setBatchFilter('ALL');
    setStageFilter('ALL');
    setInternFilter('ALL');
    setTaskStatusFilter('ALL');
    setEvalStatusFilter('ALL');
    setCertStatusFilter('ALL');
    setDateFrom('');
    setDateTo('');
  };

  const filteredData = useMemo(() => {
    if (!bundle) return null;

    const inDateRange = (isoDate?: string | null) => {
      if (!isoDate) return !dateFrom && !dateTo;
      const day = isoDate.slice(0, 10);
      if (dateFrom && day < dateFrom) return false;
      if (dateTo && day > dateTo) return false;
      return true;
    };

    const filteredInterns = bundle.interns.filter((item) => {
      if (batchFilter !== 'ALL' && item.intern.batch_id !== batchFilter) return false;
      if (stageFilter !== 'ALL' && String(item.intern.current_stage) !== stageFilter) return false;
      if (internFilter !== 'ALL' && item.intern.id !== internFilter) return false;
      if (
        certStatusFilter !== 'ALL' &&
        item.week12CertStatus !== certStatusFilter &&
        item.week24CertStatus !== certStatusFilter
      ) {
        return false;
      }
      if (evalStatusFilter !== 'ALL') {
        const hasMatchingEval = bundle.stageEvaluations.some(
          (e) => e.intern_id === item.intern.id && e.status === evalStatusFilter
        );
        if (!hasMatchingEval) return false;
      }
      return true;
    });

    const internIds = new Set(filteredInterns.map((i) => i.intern.id));

    const tasks = bundle.tasks.filter(
      (t) =>
        internIds.has(t.intern_id) &&
        (taskStatusFilter === 'ALL' || t.status === taskStatusFilter) &&
        inDateRange(t.created_at)
    );

    const submissions = bundle.submissions.filter(
      (s) => internIds.has(s.intern_id) && inDateRange(s.submitted_at)
    );

    const reports = bundle.monthlyReports.filter(
      (r) => internIds.has(r.intern_id) && inDateRange(r.submission_date ?? r.created_at)
    );

    const kpis = bundle.kpiEvaluations.filter(
      (k) => internIds.has(k.intern_id) && k.is_current && inDateRange(k.created_at)
    );

    const evaluations = bundle.stageEvaluations.filter(
      (e) =>
        internIds.has(e.intern_id) &&
        (evalStatusFilter === 'ALL' || e.status === evalStatusFilter) &&
        inDateRange(e.evaluation_date)
    );

    const projects = bundle.projects.filter(
      (p) => internIds.has(p.intern_id) && inDateRange(p.last_update)
    );

    const certifications = bundle.certifications.filter(
      (c) =>
        internIds.has(c.intern_id) &&
        (certStatusFilter === 'ALL' || c.status === certStatusFilter)
    );

    return {
      interns: filteredInterns,
      tasks,
      submissions,
      reports,
      kpis,
      evaluations,
      projects,
      certifications,
    };
  }, [bundle, batchFilter, stageFilter, internFilter, taskStatusFilter, evalStatusFilter, certStatusFilter, dateFrom, dateTo]);

  if (loading) return <LoadingPage message="Loading Mentor Dashboard..." />;
  if (error || !bundle || !filteredData) {
    return <ErrorState message={error ?? 'Dashboard data unavailable.'} onRetry={refresh} />;
  }

  const todayIso = new Date().toISOString().slice(0, 10);

  // 10 Required Summary Cards (derived strictly from DB records)
  const pendingTaskReviews = filteredData.submissions.filter((s) =>
    ['Submitted', 'Under Review', 'Resubmitted'].includes(s.status)
  );
  const pendingMonthlyReports = filteredData.reports.filter((r) =>
    ['Submitted', 'Under Review', 'Resubmitted'].includes(r.status)
  );
  const pendingStageEvaluations = filteredData.interns.filter((item) => {
    if (item.intern.current_stage < 1 || item.intern.current_stage > 4) return false;
    return !bundle.stageEvaluations.some(
      (e) =>
        e.intern_id === item.intern.id &&
        e.stage_number === item.intern.current_stage &&
        e.status !== 'Draft'
    );
  });
  const pendingCerts = filteredData.certifications.filter((c) => c.status === 'Pending Verification');
  const pendingProjects = filteredData.projects.filter(
    (p) =>
      p.problem_statement_status === 'Submitted' ||
      p.problem_statement_status === 'Under Review' ||
      (p.milestones ?? []).some((m) => m.status === 'Submitted')
  );
  const overdueTasks = filteredData.tasks.filter(
    (t) => t.status === 'Overdue' || (t.due_date < todayIso && !['Reviewed', 'Completed', 'Draft'].includes(t.status))
  );
  const completedReviewsCount =
    filteredData.submissions.filter((s) => s.status === 'Approved').length +
    filteredData.reports.filter((r) => ['Reviewed', 'Approved'].includes(r.status)).length +
    filteredData.evaluations.filter((e) => e.status !== 'Draft').length +
    filteredData.certifications.filter((c) => c.status === 'Verified').length;

  const summaryCards = [
    { label: 'Total Assigned Interns', value: filteredData.interns.length, icon: <Users className="w-4 h-4 text-[#2563EB]" />, to: '/mentor/interns' },
    { label: 'Active Interns', value: filteredData.interns.filter((i) => i.intern.status === 'Active').length, icon: <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />, to: '/mentor/interns' },
    { label: 'Interns Requiring Attention', value: filteredData.interns.filter((i) => i.intern.status === 'Needs Attention' || i.overdueTasksCount > 0).length, icon: <AlertCircle className="w-4 h-4 text-[#DC2626]" />, to: '/mentor/interns' },
    { label: 'Pending Task Reviews', value: pendingTaskReviews.length, icon: <FileCheck2 className="w-4 h-4 text-[#F59E0B]" />, to: '/mentor/submissions' },
    { label: 'Pending Monthly KPI Reports', value: pendingMonthlyReports.length, icon: <BarChart3 className="w-4 h-4 text-[#F59E0B]" />, to: '/mentor/monthly-reports' },
    { label: 'Pending Stage Evaluations', value: pendingStageEvaluations.length, icon: <ClipboardCheck className="w-4 h-4 text-[#2563EB]" />, to: '/mentor/evaluations' },
    { label: 'Pending Cert Verifications', value: pendingCerts.length, icon: <Award className="w-4 h-4 text-[#F59E0B]" />, to: '/mentor/certifications' },
    { label: 'Pending Project Reviews', value: pendingProjects.length, icon: <FolderKanban className="w-4 h-4 text-[#2563EB]" />, to: '/mentor/projects' },
    { label: 'Overdue Tasks', value: overdueTasks.length, icon: <Clock className="w-4 h-4 text-[#DC2626]" />, to: '/mentor/tasks' },
    { label: 'Completed Reviews', value: completedReviewsCount, icon: <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />, to: '/mentor/reports' },
  ];

  // Chart 1: Average KPI Pillar Performance
  const kpiCount = filteredData.kpis.length || 1;
  const pillarChartData = [
    {
      pillar: 'LEARN (25%)',
      average: Math.round((filteredData.kpis.reduce((s, k) => s + Number(k.learn_score), 0) / kpiCount) * 10) / 10,
    },
    {
      pillar: 'BUILD (45%)',
      average: Math.round((filteredData.kpis.reduce((s, k) => s + Number(k.build_score), 0) / kpiCount) * 10) / 10,
    },
    {
      pillar: 'SHARE (15%)',
      average: Math.round((filteredData.kpis.reduce((s, k) => s + Number(k.share_score), 0) / kpiCount) * 10) / 10,
    },
    {
      pillar: 'SHOWCASE (15%)',
      average: Math.round((filteredData.kpis.reduce((s, k) => s + Number(k.showcase_score), 0) / kpiCount) * 10) / 10,
    },
  ];

  // Chart 2: Monthly Performance Trends
  const monthGroups = new Map<string, number[]>();
  filteredData.kpis.forEach((k) => {
    const arr = monthGroups.get(k.reporting_month) ?? [];
    arr.push(Number(k.overall_score));
    monthGroups.set(k.reporting_month, arr);
  });
  const monthlyTrendData = Array.from(monthGroups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, scores]) => ({
      month,
      avgOverall: Math.round((scores.reduce((s, v) => s + v, 0) / scores.length) * 10) / 10,
    }));

  // Chart 3: Stage-wise Intern Distribution
  const stageChartData = LAUNCHPAD_STAGES.filter((s) => s.stage >= 1).map((s) => ({
    stage: `Stage ${s.stage}`,
    interns: filteredData.interns.filter((i) => i.intern.current_stage === s.stage).length,
  }));

  // Chart 4: Task & Certification Status Breakdown
  const taskCompletionData = [
    { name: 'Completed/Reviewed', value: filteredData.tasks.filter((t) => ['Reviewed', 'Completed'].includes(t.status)).length },
    { name: 'Submitted/Reviewing', value: filteredData.tasks.filter((t) => ['Submitted', 'Under Review', 'Resubmitted'].includes(t.status)).length },
    { name: 'In Progress/Assigned', value: filteredData.tasks.filter((t) => ['Assigned', 'In Progress'].includes(t.status)).length },
    { name: 'Overdue/Revision', value: filteredData.tasks.filter((t) => ['Overdue', 'Revision Requested'].includes(t.status)).length },
  ].filter((d) => d.value > 0);

  const certBreakdownData = [
    { name: 'Verified', value: filteredData.certifications.filter((c) => c.status === 'Verified').length },
    { name: 'Pending Verification', value: filteredData.certifications.filter((c) => c.status === 'Pending Verification').length },
    { name: 'Rejected / More Evidence', value: filteredData.certifications.filter((c) => ['Rejected', 'Additional Evidence Requested'].includes(c.status)).length },
    { name: 'Missing', value: filteredData.certifications.filter((c) => c.status === 'Missing').length },
  ].filter((d) => d.value > 0);

  // Recent Activities built from live DB events
  const recentActivities = [
    ...filteredData.submissions.slice(0, 5).map((s) => ({
      id: `sub-${s.id}`,
      type: s.version_number > 1 ? 'Revision Submission' : 'Task Submission',
      title: `${s.intern?.profile?.full_name ?? 'Intern'} submitted ${s.task?.title ?? 'Task'} (v${s.version_number})`,
      timestamp: s.submitted_at,
      to: `/mentor/tasks/${s.task_id}`,
      status: s.status,
    })),
    ...filteredData.reports
      .filter((r) => r.submission_date)
      .slice(0, 5)
      .map((r) => ({
        id: `rep-${r.id}`,
        type: 'Monthly Report',
        title: `${r.intern?.profile?.full_name ?? 'Intern'} submitted ${r.reporting_month} KPI report`,
        timestamp: r.submission_date!,
        to: `/mentor/monthly-reports/${r.id}`,
        status: r.status,
      })),
    ...filteredData.projects.slice(0, 4).map((p) => ({
      id: `proj-${p.id}`,
      type: 'Project Update',
      title: `${p.intern?.profile?.full_name ?? 'Intern'} · ${p.title} (${p.problem_statement_status})`,
      timestamp: p.last_update,
      to: `/mentor/projects/${p.id}`,
      status: p.status,
    })),
    ...filteredData.certifications
      .filter((c) => c.status !== 'Missing')
      .slice(0, 4)
      .map((c) => ({
        id: `cert-${c.id}`,
        type: 'Certification Upload',
        title: `${c.intern?.profile?.full_name ?? 'Intern'} · ${c.milestone_type.replace('_', ' ')}`,
        timestamp: c.updated_at,
        to: '/mentor/certifications',
        status: c.status,
      })),
  ]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 10);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Mentor Dashboard</h1>
          <p className="text-sm text-[#64748B]">
            Workload overview, LAUNCHPAD progress, and pending evaluations for your assigned interns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/mentor/tasks">
            <Button variant="primary" size="sm">
              Assign New Task
            </Button>
          </Link>
          <Link to="/mentor/reports">
            <Button variant="outline" size="sm">
              Export Reports
            </Button>
          </Link>
        </div>
      </div>

      {/* Filters Bar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B] inline-flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5" /> Dashboard Filters
            </span>
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-[#2563EB] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" /> Reset Filters
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
            <Select value={batchFilter} onChange={(e) => setBatchFilter(e.target.value)} aria-label="Batch filter">
              <option value="ALL">All Batches</option>
              {bundle.batches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </Select>
            <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} aria-label="Stage filter">
              <option value="ALL">All Stages</option>
              {LAUNCHPAD_STAGES.map((s) => (
                <option key={s.stage} value={String(s.stage)}>
                  {s.name}
                </option>
              ))}
            </Select>
            <Select value={internFilter} onChange={(e) => setInternFilter(e.target.value)} aria-label="Intern filter">
              <option value="ALL">All Assigned Interns</option>
              {bundle.interns.map((i) => (
                <option key={i.intern.id} value={i.intern.id}>
                  {i.intern.profile?.full_name ?? i.intern.intern_code}
                </option>
              ))}
            </Select>
            <Select value={taskStatusFilter} onChange={(e) => setTaskStatusFilter(e.target.value)} aria-label="Task status filter">
              <option value="ALL">All Task Statuses</option>
              {['Draft', 'Assigned', 'In Progress', 'Submitted', 'Under Review', 'Revision Requested', 'Resubmitted', 'Reviewed', 'Completed', 'Overdue'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </Select>
            <Select value={evalStatusFilter} onChange={(e) => setEvalStatusFilter(e.target.value)} aria-label="Evaluation status filter">
              <option value="ALL">All Eval Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Submitted">Submitted</option>
              <option value="Admin Reviewed">Admin Reviewed</option>
            </Select>
            <Select value={certStatusFilter} onChange={(e) => setCertStatusFilter(e.target.value)} aria-label="Certification status filter">
              <option value="ALL">All Cert Statuses</option>
              <option value="Missing">Missing</option>
              <option value="Pending Verification">Pending Verification</option>
              <option value="Verified">Verified</option>
              <option value="Rejected">Rejected</option>
              <option value="Additional Evidence Requested">Additional Evidence Requested</option>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
          </div>
        </CardContent>
      </Card>

      {/* 10 Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {summaryCards.map((card) => (
          <Link
            key={card.label}
            to={card.to}
            className="bg-white rounded-xl border border-slate-200 p-4 hover:border-[#2563EB] hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#64748B]">{card.label}</span>
              <span className="p-1.5 rounded-lg bg-slate-50">{card.icon}</span>
            </div>
            <p className="text-2xl font-bold text-[#172B4D] mt-2">{card.value}</p>
          </Link>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="KPI Pillar Performance" subtitle="Average scores across LEARN (25%), BUILD (45%), SHARE (15%), SHOWCASE (15%)" />
          <CardContent className="h-64">
            {filteredData.kpis.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                No KPI evaluations recorded for the selected filters yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pillarChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="pillar" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Bar dataKey="average" name="Avg Score" fill="#2563EB" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Monthly Performance Trends" subtitle="Average Overall KPI score progression by reporting month" />
          <CardContent className="h-64">
            {monthlyTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-[#64748B]">
                No monthly KPI trend data available for the selected filters.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="avgOverall" name="Overall KPI" stroke="#16A34A" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Stage-wise Intern Distribution" subtitle="Assigned interns across LAUNCHPAD Stages 1–4" />
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="stage" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip />
                <Bar dataKey="interns" name="Assigned Interns" fill="#172B4D" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Task Completion & Certification Status" subtitle="Distribution across current filtered workload" />
          <CardContent className="h-64 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {taskCompletionData.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-[#64748B]">No tasks in filter</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={taskCompletionData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65}>
                    {taskCompletionData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            {certBreakdownData.length === 0 ? (
              <div className="flex items-center justify-center text-xs text-[#64748B]">No certification records</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={certBreakdownData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={65}>
                    {certBreakdownData.map((_, idx) => (
                      <Cell key={idx} fill={CHART_COLORS[(idx + 1) % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pending Actions & Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader
            title="Pending Mentor Actions"
            subtitle="Items requiring review, scoring, or verification"
          />
          <CardContent className="space-y-2.5 max-h-96 overflow-y-auto">
            {pendingTaskReviews.length === 0 &&
            pendingMonthlyReports.length === 0 &&
            pendingStageEvaluations.length === 0 &&
            pendingCerts.length === 0 &&
            pendingProjects.length === 0 ? (
              <p className="text-xs text-[#64748B] py-6 text-center">
                No pending reviews match the current filters.
              </p>
            ) : (
              <>
                {pendingTaskReviews.slice(0, 4).map((sub) => (
                  <Link
                    key={sub.id}
                    to={`/mentor/tasks/${sub.task_id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/30 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#172B4D]">
                        Task Review · {sub.task?.title ?? 'Task Submission'}
                      </p>
                      <p className="text-[11px] text-[#64748B]">
                        {sub.intern?.profile?.full_name} · Version {sub.version_number}
                      </p>
                    </div>
                    <Badge status={sub.status}>{sub.status}</Badge>
                  </Link>
                ))}
                {pendingMonthlyReports.slice(0, 4).map((rep) => (
                  <Link
                    key={rep.id}
                    to={`/mentor/monthly-reports/${rep.id}`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/30 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#172B4D]">
                        Monthly KPI Report · {rep.reporting_month}
                      </p>
                      <p className="text-[11px] text-[#64748B]">{rep.intern?.profile?.full_name}</p>
                    </div>
                    <Badge status={rep.status}>{rep.status}</Badge>
                  </Link>
                ))}
                {pendingStageEvaluations.slice(0, 3).map((item) => (
                  <Link
                    key={`eval-${item.intern.id}`}
                    to={`/mentor/evaluations`}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/30 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#172B4D]">
                        Pending Stage {item.intern.current_stage} Evaluation
                      </p>
                      <p className="text-[11px] text-[#64748B]">{item.intern.profile?.full_name}</p>
                    </div>
                    <Badge tone="amber">Action Needed</Badge>
                  </Link>
                ))}
                {pendingCerts.slice(0, 3).map((cert) => (
                  <Link
                    key={cert.id}
                    to="/mentor/certifications"
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-[#2563EB] hover:bg-blue-50/30 transition-colors"
                  >
                    <div>
                      <p className="text-xs font-semibold text-[#172B4D]">
                        Verify {cert.milestone_type.replace('_', ' ')} Certificate
                      </p>
                      <p className="text-[11px] text-[#64748B]">{cert.intern?.profile?.full_name}</p>
                    </div>
                    <Badge status={cert.status}>{cert.status}</Badge>
                  </Link>
                ))}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Recent Activities" subtitle="Latest submissions, reports, project updates, and uploads" />
          <CardContent className="space-y-2.5 max-h-96 overflow-y-auto">
            {recentActivities.length === 0 ? (
              <p className="text-xs text-[#64748B] py-6 text-center">No recent activity found.</p>
            ) : (
              recentActivities.map((act) => (
                <Link
                  key={act.id}
                  to={act.to}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold text-[#2563EB] uppercase tracking-wide">{act.type}</p>
                    <p className="text-xs font-medium text-[#172B4D] truncate">{act.title}</p>
                    <p className="text-[11px] text-[#64748B]">
                      {new Date(act.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge status={act.status}>{act.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Assigned Interns Overview Table */}
      <Card>
        <CardHeader
          title="Assigned Intern Overview"
          subtitle="Click any intern to open their complete 16-tab LAUNCHPAD profile"
          action={
            <Link to="/mentor/interns" className="text-xs font-medium text-[#2563EB] hover:underline">
              View All My Interns →
            </Link>
          }
        />
        <CardContent className="p-0 overflow-x-auto">
          {filteredData.interns.length === 0 ? (
            <div className="p-6">
              <EmptyState
                title="No assigned interns match the filters"
                description="When an Admin assigns interns to your mentor account, they will appear here automatically."
              />
            </div>
          ) : (
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Intern</th>
                  <th className="py-3 px-4">Batch & Domain</th>
                  <th className="py-3 px-4">LAUNCHPAD Stage</th>
                  <th className="py-3 px-4">Progress</th>
                  <th className="py-3 px-4">Latest KPI</th>
                  <th className="py-3 px-4">Pending Tasks</th>
                  <th className="py-3 px-4">Last Report</th>
                  <th className="py-3 px-4">Certifications (W12 / W24)</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.interns.map((row) => (
                  <tr key={row.intern.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <Link
                        to={`/mentor/interns/${row.intern.id}`}
                        className="flex items-center gap-2.5 group"
                      >
                        {row.intern.profile?.avatar_url ? (
                          <img
                            src={row.intern.profile.avatar_url}
                            alt={row.intern.profile.full_name}
                            className="w-8 h-8 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-[#172B4D] text-white flex items-center justify-center font-semibold text-[11px]">
                            {(row.intern.profile?.full_name ?? 'I').slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="font-semibold text-[#172B4D] group-hover:text-[#2563EB]">
                            {row.intern.profile?.full_name ?? 'Intern'}
                          </p>
                          <p className="text-[11px] text-[#64748B]">{row.intern.intern_code}</p>
                        </div>
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-medium text-[#172B4D]">{row.intern.batch?.name ?? 'Unassigned Batch'}</p>
                      <p className="text-[11px] text-[#64748B]">{row.intern.assigned_domain || '—'}</p>
                    </td>
                    <td className="py-3 px-4 text-[#172B4D] font-medium">
                      {getStageLabel(row.intern.current_stage)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="w-24">
                        <div className="flex justify-between text-[11px] mb-1">
                          <span>{row.intern.program_progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full"
                            style={{ width: `${Math.min(100, row.intern.program_progress)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">
                      {row.latestKpi ? `${row.latestKpi.overall_score}/100` : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-[#172B4D]">{row.pendingTasksCount}</span>
                      {row.overdueTasksCount > 0 && (
                        <span className="ml-1.5 text-[11px] text-[#DC2626] font-medium">
                          ({row.overdueTasksCount} overdue)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#64748B]">
                      {row.lastReportDate ? new Date(row.lastReportDate).toLocaleDateString() : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1">
                        <Badge status={row.week12CertStatus}>W12: {row.week12CertStatus}</Badge>
                        <Badge status={row.week24CertStatus}>W24: {row.week24CertStatus}</Badge>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge status={row.intern.status}>{row.intern.status}</Badge>
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

