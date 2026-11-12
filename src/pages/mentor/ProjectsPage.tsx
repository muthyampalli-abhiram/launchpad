import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FolderKanban } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { SearchInput, Select } from '../../components/ui/FormControls';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { getStageLabel } from '../../constants/launchpad';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';

export const ProjectsPage: React.FC = () => {
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const projects = useMemo(() => {
    if (!bundle) return [];
    const q = search.trim().toLowerCase();
    return bundle.projects.filter((p) => {
      if (statusFilter !== 'ALL' && p.status !== statusFilter) return false;
      if (q) {
        const hay = `${p.title} ${p.domain} ${p.intern?.profile?.full_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bundle, search, statusFilter]);

  if (loading) return <LoadingPage message="Loading assigned projects..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load projects.'} onRetry={refresh} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Project Management</h1>
        <p className="text-sm text-[#64748B]">
          Review problem statements, monitor project milestones, inspect repositories, and record technical evaluations
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search project title, domain, or intern..." />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Project Statuses</option>
            {['Planning', 'Problem Statement Review', 'In Progress', 'Delayed', 'Under Final Review', 'Completed'].map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {projects.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-6 h-6" />}
          title="No projects found"
          description="Projects initiated by your assigned interns appear here for problem statement and milestone review."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Project Title</th>
                  <th className="py-3 px-4">Intern</th>
                  <th className="py-3 px-4">Domain</th>
                  <th className="py-3 px-4">Stage</th>
                  <th className="py-3 px-4">Target Completion</th>
                  <th className="py-3 px-4">Problem Statement</th>
                  <th className="py-3 px-4">Milestones</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => {
                  const approvedMilestones = (p.milestones ?? []).filter((m) => m.status === 'Approved').length;
                  const totalMilestones = (p.milestones ?? []).length;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-[#172B4D]">{p.title}</td>
                      <td className="py-3 px-4">{p.intern?.profile?.full_name ?? '—'}</td>
                      <td className="py-3 px-4">{p.domain || '—'}</td>
                      <td className="py-3 px-4">{getStageLabel(p.current_stage)}</td>
                      <td className="py-3 px-4 text-[#64748B]">{p.expected_completion_date ?? '—'}</td>
                      <td className="py-3 px-4">
                        <Badge status={p.problem_statement_status}>{p.problem_statement_status}</Badge>
                      </td>
                      <td className="py-3 px-4">
                        {approvedMilestones}/{totalMilestones} approved
                      </td>
                      <td className="py-3 px-4"><Badge status={p.status}>{p.status}</Badge></td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/mentor/projects/${p.id}`}>
                          <Button size="sm" variant="primary">Open Project</Button>
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

