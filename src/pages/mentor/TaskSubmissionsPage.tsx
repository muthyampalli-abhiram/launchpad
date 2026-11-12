import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { FileCheck2 } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { SearchInput, Select } from '../../components/ui/FormControls';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';

export const TaskSubmissionsPage: React.FC = () => {
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const rows = useMemo(() => {
    if (!bundle) return [];
    const q = search.trim().toLowerCase();
    return bundle.submissions.filter((sub) => {
      if (statusFilter !== 'ALL' && sub.status !== statusFilter) return false;
      if (q) {
        const hay = `${sub.task?.title ?? ''} ${sub.intern?.profile?.full_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bundle, search, statusFilter]);

  if (loading) return <LoadingPage message="Loading task submissions..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load submissions.'} onRetry={refresh} />;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Task Submissions Queue</h1>
        <p className="text-sm text-[#64748B]">
          Review intern task submissions, inspect attachments, and provide structured rubric feedback
        </p>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search task or intern..." />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Submission Statuses</option>
            {['Submitted', 'Under Review', 'Resubmitted', 'Revision Requested', 'Approved'].map((st) => (
              <option key={st} value={st}>{st}</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FileCheck2 className="w-6 h-6" />}
          title="No task submissions match"
          description="Submissions uploaded by assigned interns in the Intern Portal appear here for review."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Intern</th>
                  <th className="py-3 px-4">Version</th>
                  <th className="py-3 px-4">Submitted At</th>
                  <th className="py-3 px-4">Attachments</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((sub) => (
                  <tr key={sub.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-semibold text-[#172B4D]">{sub.task?.title ?? 'Task'}</td>
                    <td className="py-3 px-4">{sub.intern?.profile?.full_name ?? '—'}</td>
                    <td className="py-3 px-4">v{sub.version_number}</td>
                    <td className="py-3 px-4 text-[#64748B]">{new Date(sub.submitted_at).toLocaleString()}</td>
                    <td className="py-3 px-4">{sub.attachment_paths?.length ?? 0} file(s)</td>
                    <td className="py-3 px-4"><Badge status={sub.status}>{sub.status}</Badge></td>
                    <td className="py-3 px-4 text-right">
                      <Link to={`/mentor/tasks/${sub.task_id}`}>
                        <Button size="sm" variant="primary">Review Submission</Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
};

