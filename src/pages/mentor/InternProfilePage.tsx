import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Shield } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FileAttachmentButton } from '../../components/ui/FileAttachmentButton';
import { ErrorState, LoadingPage } from '../../components/ui/States';
import { getStageLabel, LAUNCHPAD_STAGES } from '../../constants/launchpad';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';

const PROFILE_TABS = [
  'Overview',
  'Personal Information',
  'Academic Information',
  'Program Information',
  'LAUNCHPAD Journey',
  'Baseline Assessment',
  'KPI Performance',
  'Tasks',
  'Task Submissions',
  'Projects',
  'Monthly Reports',
  'Stage Evaluations',
  'Certifications',
  'Feedback',
  'Improvement Plans',
  'Activity History',
] as const;

type ProfileTab = (typeof PROFILE_TABS)[number];

export const InternProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const [activeTab, setActiveTab] = useState<ProfileTab>('Overview');

  if (loading) return <LoadingPage message="Loading intern 360 profile..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Failed to load profile.'} onRetry={refresh} />;

  const summary = bundle.interns.find((i) => i.intern.id === id);
  if (!summary) {
    return (
      <ErrorState
        title="Intern Access Denied or Not Found"
        message="You can only view interns currently assigned to you or permitted by historical access policy."
      />
    );
  }

  const { intern } = summary;
  const internTasks = bundle.tasks.filter((t) => t.intern_id === intern.id);
  const internSubs = bundle.submissions.filter((s) => s.intern_id === intern.id);
  const internReports = bundle.monthlyReports.filter((r) => r.intern_id === intern.id);
  const internKpis = bundle.kpiEvaluations.filter((k) => k.intern_id === intern.id);
  const internStageEvals = bundle.stageEvaluations.filter((e) => e.intern_id === intern.id);
  const internBaselines = bundle.baselineAssessments.filter((b) => b.intern_id === intern.id);
  const internProjects = bundle.projects.filter((p) => p.intern_id === intern.id);
  const internCerts = bundle.certifications.filter((c) => c.intern_id === intern.id);
  const internFeedback = bundle.feedbackRecords.filter((f) => f.intern_id === intern.id);
  const internPlans = bundle.improvementPlans.filter((p) => p.intern_id === intern.id);
  const internProgression = bundle.progressionDecisions.filter((p) => p.intern_id === intern.id);

  const latestBaseline = internBaselines[0];
  const latestKpi = internKpis.find((k) => k.is_current);

  const renderFieldGrid = (entries: [string, string | number | undefined | null][]) => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {entries.map(([label, val]) => (
        <div key={label} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">{label}</p>
          <p className="text-sm font-medium text-[#172B4D] mt-1 break-words">{val ?? '—'}</p>
        </div>
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link to="/mentor/interns">
            <Button variant="outline" size="sm" icon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-[#172B4D]">{intern.profile?.full_name}</h1>
              <Badge status={intern.status}>{intern.status}</Badge>
            </div>
            <p className="text-xs text-[#64748B]">
              {intern.intern_code} · {intern.profile?.email} · {getStageLabel(intern.current_stage)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#64748B] bg-white px-3 py-1.5 rounded-lg border border-slate-200">
          <Shield className="w-3.5 h-3.5 text-[#2563EB]" />
          Admin-owned profile fields are read-only
        </div>
      </div>

      {/* 16 Tabs Navigation */}
      <div className="bg-white rounded-xl border border-slate-200 p-2 flex flex-wrap gap-1.5">
        {PROFILE_TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              activeTab === tab
                ? 'bg-[#2563EB] text-white'
                : 'text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'Overview' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[#64748B]">Week 0 Baseline Score</p>
              <p className="text-2xl font-bold text-[#172B4D] mt-1">
                {latestBaseline ? `${latestBaseline.total_score}/100` : 'Pending'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[#64748B]">Latest Overall KPI</p>
              <p className="text-2xl font-bold text-[#172B4D] mt-1">
                {latestKpi ? `${latestKpi.overall_score}/100` : 'No Reviews'}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[#64748B]">Tasks (Completed / Pending)</p>
              <p className="text-2xl font-bold text-[#172B4D] mt-1">
                {summary.completedTasksCount} / {summary.pendingTasksCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[#64748B]">Active Improvement Plans</p>
              <p className="text-2xl font-bold text-[#172B4D] mt-1">
                {internPlans.filter((p) => p.status !== 'Completed').length}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'Personal Information' && (
        <Card>
          <CardHeader title="Personal Information" subtitle="Read-only fields managed by Admin and Intern" />
          <CardContent>
            {renderFieldGrid([
              ['Full Name', intern.profile?.full_name],
              ['Email', intern.profile?.email],
              ['Phone', intern.personal_info?.phone ?? intern.profile?.phone],
              ['City / State', [intern.personal_info?.city, intern.personal_info?.state].filter(Boolean).join(', ') || '—'],
              ['GitHub URL', intern.personal_info?.github_url],
              ['LinkedIn URL', intern.personal_info?.linkedin_url],
            ])}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Academic Information' && (
        <Card>
          <CardHeader title="Academic Information" subtitle="Read-only academic background" />
          <CardContent>
            {renderFieldGrid([
              ['Institution', intern.academic_info?.institution],
              ['Degree', intern.academic_info?.degree],
              ['Branch / Specialization', intern.academic_info?.branch],
              ['Graduation Year', intern.academic_info?.graduation_year],
              ['CGPA / Percentage', intern.academic_info?.cgpa],
              ['University Roll No', intern.academic_info?.roll_number],
            ])}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Program Information' && (
        <Card>
          <CardHeader title="Program Information" subtitle="Admin-managed LAUNCHPAD enrollment fields" />
          <CardContent>
            {renderFieldGrid([
              ['Intern Code', intern.intern_code],
              ['Batch', intern.batch?.name],
              ['Assigned Domain', intern.assigned_domain],
              ['Joining Date', intern.joining_date],
              ['Current Stage', getStageLabel(intern.current_stage)],
              ['Program Progress', `${intern.program_progress}%`],
              ['Attendance Mode', intern.program_info?.attendance_mode],
              ['Assignment Active', summary.assignment.is_active ? 'Active Assignment' : 'Historical Access'],
            ])}
          </CardContent>
        </Card>
      )}

      {activeTab === 'LAUNCHPAD Journey' && (
        <Card>
          <CardHeader title="24-Week LAUNCHPAD Journey" subtitle="Stage milestones and authorized progression decisions" />
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
              {LAUNCHPAD_STAGES.map((st) => {
                const isCurrent = intern.current_stage === st.stage;
                const evalRecord = internStageEvals.find((e) => e.stage_number === st.stage);
                return (
                  <div
                    key={st.stage}
                    className={`p-3.5 rounded-xl border ${
                      isCurrent ? 'border-[#2563EB] bg-blue-50/40' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <p className="text-[11px] font-semibold text-[#2563EB]">{st.weeks}</p>
                    <p className="text-sm font-bold text-[#172B4D] mt-0.5">{st.name}</p>
                    <p className="text-xs text-[#64748B] mt-1">{st.description}</p>
                    {evalRecord && (
                      <div className="mt-2">
                        <Badge status={evalRecord.status}>
                          Score: {evalRecord.total_score}/100 ({evalRecord.status})
                        </Badge>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {internProgression.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[#172B4D] uppercase">Progression Decisions</h4>
                {internProgression.map((pd) => (
                  <div key={pd.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <span>
                      Stage {pd.from_stage} → Stage {pd.to_stage ?? '?'} · Mentor Rec: {pd.mentor_recommendation ?? '—'}
                    </span>
                    <Badge status={pd.admin_decision}>Admin: {pd.admin_decision}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Baseline Assessment' && (
        <Card>
          <CardHeader
            title="Week 0 Baseline Assessments"
            action={
              <Link to="/mentor/baseline">
                <Button size="sm">Open Baseline Module</Button>
              </Link>
            }
          />
          <CardContent className="space-y-3">
            {internBaselines.length === 0 ? (
              <p className="text-xs text-[#64748B]">No baseline assessments recorded yet.</p>
            ) : (
              internBaselines.map((b) => (
                <div key={b.id} className="p-4 rounded-lg border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#172B4D]">
                      Date: {b.assessment_date} · Total Score: {b.total_score}/100
                    </span>
                    <Badge status={b.status}>{b.status}</Badge>
                  </div>
                  <p className="text-[#64748B]">{b.comments || 'No reviewer comments.'}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'KPI Performance' && (
        <Card>
          <CardHeader title="Monthly KPI Performance History" subtitle="Overall KPI = (LEARN × 0.25) + (BUILD × 0.45) + (SHARE × 0.15) + (SHOWCASE × 0.15)" />
          <CardContent className="overflow-x-auto">
            {internKpis.length === 0 ? (
              <p className="text-xs text-[#64748B]">No KPI evaluations recorded yet.</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-[#64748B]">
                    <th className="py-2 px-3">Month</th>
                    <th className="py-2 px-3">LEARN (25%)</th>
                    <th className="py-2 px-3">BUILD (45%)</th>
                    <th className="py-2 px-3">SHARE (15%)</th>
                    <th className="py-2 px-3">SHOWCASE (15%)</th>
                    <th className="py-2 px-3">Overall</th>
                    <th className="py-2 px-3">Version</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {internKpis.map((k) => (
                    <tr key={k.id}>
                      <td className="py-2 px-3 font-medium">{k.reporting_month}</td>
                      <td className="py-2 px-3">{k.learn_score}</td>
                      <td className="py-2 px-3">{k.build_score}</td>
                      <td className="py-2 px-3">{k.share_score}</td>
                      <td className="py-2 px-3">{k.showcase_score}</td>
                      <td className="py-2 px-3 font-bold text-[#172B4D]">{k.overall_score}</td>
                      <td className="py-2 px-3">v{k.version_number} {k.is_current ? '(Current)' : '(History)'}</td>
                      <td className="py-2 px-3"><Badge status={k.review_status}>{k.review_status}</Badge></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Tasks' && (
        <Card>
          <CardHeader title="Assigned Tasks" action={<Link to="/mentor/tasks"><Button size="sm">Manage Tasks</Button></Link>} />
          <CardContent className="space-y-2">
            {internTasks.length === 0 ? (
              <p className="text-xs text-[#64748B]">No tasks assigned to this intern yet.</p>
            ) : (
              internTasks.map((t) => (
                <Link key={t.id} to={`/mentor/tasks/${t.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-[#2563EB] text-xs">
                  <div>
                    <p className="font-semibold text-[#172B4D]">{t.title}</p>
                    <p className="text-[#64748B]">Due: {t.due_date} · Pillar: {t.kpi_pillar} · Stage {t.stage_number}</p>
                  </div>
                  <Badge status={t.status}>{t.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Task Submissions' && (
        <Card>
          <CardHeader title="Task Submissions" />
          <CardContent className="space-y-3">
            {internSubs.length === 0 ? (
              <p className="text-xs text-[#64748B]">No task submissions recorded.</p>
            ) : (
              internSubs.map((s) => (
                <div key={s.id} className="p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-semibold text-[#172B4D]">{s.task?.title ?? 'Task'} · v{s.version_number}</p>
                    <p className="text-[#64748B]">Submitted {new Date(s.submitted_at).toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={s.status}>{s.status}</Badge>
                    <Link to={`/mentor/tasks/${s.task_id}`}><Button size="sm" variant="outline">Review</Button></Link>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Projects' && (
        <Card>
          <CardHeader title="Projects & Milestones" />
          <CardContent className="space-y-3">
            {internProjects.length === 0 ? (
              <p className="text-xs text-[#64748B]">No projects found for this intern.</p>
            ) : (
              internProjects.map((p) => (
                <Link key={p.id} to={`/mentor/projects/${p.id}`} className="block p-4 rounded-lg border border-slate-200 hover:border-[#2563EB] text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-[#172B4D]">{p.title}</span>
                    <Badge status={p.status}>{p.status}</Badge>
                  </div>
                  <p className="text-[#64748B]">Domain: {p.domain} · Problem Statement: {p.problem_statement_status} · {(p.milestones ?? []).length} milestones</p>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Monthly Reports' && (
        <Card>
          <CardHeader title="Monthly Reports" />
          <CardContent className="space-y-2">
            {internReports.length === 0 ? (
              <p className="text-xs text-[#64748B]">No monthly reports yet.</p>
            ) : (
              internReports.map((r) => (
                <Link key={r.id} to={`/mentor/monthly-reports/${r.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-[#2563EB] text-xs">
                  <div>
                    <p className="font-semibold text-[#172B4D]">Month: {r.reporting_month}</p>
                    <p className="text-[#64748B]">Submitted: {r.submission_date ? new Date(r.submission_date).toLocaleDateString() : 'Not Submitted'}</p>
                  </div>
                  <Badge status={r.status}>{r.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Stage Evaluations' && (
        <Card>
          <CardHeader title="Stage Evaluations" action={<Link to="/mentor/evaluations"><Button size="sm">Evaluate Stage</Button></Link>} />
          <CardContent className="space-y-2">
            {internStageEvals.length === 0 ? (
              <p className="text-xs text-[#64748B]">No stage evaluations recorded.</p>
            ) : (
              internStageEvals.map((e) => (
                <Link key={e.id} to={`/mentor/evaluations/${e.id}`} className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-[#2563EB] text-xs">
                  <div>
                    <p className="font-semibold text-[#172B4D]">Stage {e.stage_number} Evaluation · {e.total_score}/100</p>
                    <p className="text-[#64748B]">Date: {e.evaluation_date} · Classification: {e.classification_label ?? '—'} ({e.classification_approval_status})</p>
                  </div>
                  <Badge status={e.status}>{e.status}</Badge>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Certifications' && (
        <Card>
          <CardHeader title="Week 12 & Week 24 Certifications" action={<Link to="/mentor/certifications"><Button size="sm">Verify Evidence</Button></Link>} />
          <CardContent className="space-y-3">
            {internCerts.length === 0 ? (
              <p className="text-xs text-[#64748B]">No certification records uploaded yet.</p>
            ) : (
              internCerts.map((c) => (
                <div key={c.id} className="p-3 rounded-lg border border-slate-200 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#172B4D]">{c.milestone_type.replace('_', ' ')} · {c.certification_name || 'Pending Official Name'}</span>
                    <Badge status={c.status}>{c.status}</Badge>
                  </div>
                  {(c.evidence ?? []).map((ev) => (
                    <FileAttachmentButton key={ev.id} storagePath={ev.file_path} fileName={ev.file_name} compact />
                  ))}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Feedback' && (
        <Card>
          <CardHeader title="Feedback History" action={<Link to="/mentor/feedback"><Button size="sm">Add Feedback</Button></Link>} />
          <CardContent className="space-y-2">
            {internFeedback.length === 0 ? (
              <p className="text-xs text-[#64748B]">No feedback records created yet.</p>
            ) : (
              internFeedback.map((fb) => (
                <div key={fb.id} className="p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#172B4D]">{fb.title}</span>
                    <div className="flex gap-1.5">
                      <Badge tone={fb.is_private_note ? 'amber' : fb.is_published ? 'green' : 'slate'}>
                        {fb.is_private_note ? 'Private Note' : fb.is_published ? 'Published' : 'Draft'}
                      </Badge>
                      {fb.viewed_by_intern_at && <Badge tone="blue">Viewed</Badge>}
                    </div>
                  </div>
                  <p className="text-[#64748B]">{fb.content}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Improvement Plans' && (
        <Card>
          <CardHeader title="Improvement Plans" action={<Link to="/mentor/improvement-plans"><Button size="sm">Manage Plans</Button></Link>} />
          <CardContent className="space-y-2">
            {internPlans.length === 0 ? (
              <p className="text-xs text-[#64748B]">No improvement plans created for this intern.</p>
            ) : (
              internPlans.map((ip) => (
                <div key={ip.id} className="p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#172B4D]">{ip.improvement_objective}</span>
                    <Badge status={ip.status}>{ip.status}</Badge>
                  </div>
                  <p className="text-[#64748B]">Weakness: {ip.identified_weakness} · Target: {ip.target_completion_date}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      )}

      {activeTab === 'Activity History' && (
        <Card>
          <CardHeader title="Activity History" />
          <CardContent className="space-y-2">
            {[
              ...internTasks.map((t) => ({ id: t.id, text: `Task "${t.title}" (${t.status})`, at: t.updated_at })),
              ...internSubs.map((s) => ({ id: s.id, text: `Task submission v${s.version_number} (${s.status})`, at: s.submitted_at })),
              ...internStageEvals.map((e) => ({ id: e.id, text: `Stage ${e.stage_number} evaluation (${e.status})`, at: e.updated_at })),
            ]
              .sort((a, b) => b.at.localeCompare(a.at))
              .map((item) => (
                <div key={item.id} className="p-2.5 rounded-lg border border-slate-100 flex justify-between text-xs">
                  <span className="text-[#172B4D]">{item.text}</span>
                  <span className="text-[#64748B]">{new Date(item.at).toLocaleString()}</span>
                </div>
              ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

