import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpDown, ChevronLeft, ChevronRight, Users } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { SearchInput, Select } from '../../components/ui/FormControls';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { getStageLabel, LAUNCHPAD_STAGES } from '../../constants/launchpad';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';

type SortKey = 'name' | 'joining_date' | 'stage' | 'kpi';

export const MyInternsPage: React.FC = () => {
  const { bundle, loading, error, refresh } = useMentorWorkspace();

  const [search, setSearch] = useState('');
  const [batchFilter, setBatchFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<SortKey>('name');
  const [sortAsc, setSortAsc] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const rows = useMemo(() => {
    if (!bundle) return [];
    const q = search.trim().toLowerCase();

    const filtered = bundle.interns.filter((item) => {
      if (batchFilter !== 'ALL' && item.intern.batch_id !== batchFilter) return false;
      if (stageFilter !== 'ALL' && String(item.intern.current_stage) !== stageFilter) return false;
      if (statusFilter !== 'ALL' && item.intern.status !== statusFilter) return false;
      if (q) {
        const haystack = [
          item.intern.intern_code,
          item.intern.profile?.full_name ?? '',
          item.intern.profile?.email ?? '',
          item.intern.assigned_domain,
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === 'name') {
        cmp = (a.intern.profile?.full_name ?? '').localeCompare(b.intern.profile?.full_name ?? '');
      } else if (sortKey === 'joining_date') {
        cmp = a.intern.joining_date.localeCompare(b.intern.joining_date);
      } else if (sortKey === 'stage') {
        cmp = a.intern.current_stage - b.intern.current_stage;
      } else if (sortKey === 'kpi') {
        cmp = (a.latestKpi?.overall_score ?? -1) - (b.latestKpi?.overall_score ?? -1);
      }
      return sortAsc ? cmp : -cmp;
    });
  }, [bundle, search, batchFilter, stageFilter, statusFilter, sortKey, sortAsc]);

  if (loading) return <LoadingPage message="Loading assigned interns..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load interns.'} onRetry={refresh} />;

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedRows = rows.slice((safePage - 1) * pageSize, safePage * pageSize);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc(!sortAsc);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">My Interns</h1>
          <p className="text-sm text-[#64748B]">
            Assigned SmartBridge LAUNCHPAD interns ({rows.length} matching records)
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by ID, name, email, domain..."
          />
          <Select
            value={batchFilter}
            onChange={(e) => {
              setBatchFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Batches</option>
            {bundle.batches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </Select>
          <Select
            value={stageFilter}
            onChange={(e) => {
              setStageFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All LAUNCHPAD Stages</option>
            {LAUNCHPAD_STAGES.map((s) => (
              <option key={s.stage} value={String(s.stage)}>
                {s.name}
              </option>
            ))}
          </Select>
          <Select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="ALL">All Intern Statuses</option>
            {['Active', 'Needs Attention', 'On Hold', 'Completed', 'Inactive'].map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {pagedRows.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6" />}
          title="No assigned interns found"
          description="Only interns assigned to you by an Admin (or permitted historical assignments) are visible here."
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Intern ID</th>
                  <th className="py-3 px-4">
                    <button type="button" onClick={() => toggleSort('name')} className="inline-flex items-center gap-1 cursor-pointer hover:text-[#172B4D]">
                      Name & Email <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Batch</th>
                  <th className="py-3 px-4">
                    <button type="button" onClick={() => toggleSort('joining_date')} className="inline-flex items-center gap-1 cursor-pointer hover:text-[#172B4D]">
                      Joining Date <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button type="button" onClick={() => toggleSort('stage')} className="inline-flex items-center gap-1 cursor-pointer hover:text-[#172B4D]">
                      Current Stage <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">
                    <button type="button" onClick={() => toggleSort('kpi')} className="inline-flex items-center gap-1 cursor-pointer hover:text-[#172B4D]">
                      KPI Score <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="py-3 px-4">Task Completion</th>
                  <th className="py-3 px-4">Project Status</th>
                  <th className="py-3 px-4">Certifications</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pagedRows.map((row) => {
                  const totalTasks = row.completedTasksCount + row.pendingTasksCount;
                  const internProj = bundle.projects.find((p) => p.intern_id === row.intern.id);
                  return (
                    <tr key={row.intern.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#172B4D]">{row.intern.intern_code}</td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-[#172B4D]">{row.intern.profile?.full_name}</p>
                        <p className="text-[11px] text-[#64748B]">{row.intern.profile?.email}</p>
                      </td>
                      <td className="py-3 px-4">{row.intern.batch?.name ?? '—'}</td>
                      <td className="py-3 px-4 text-[#64748B]">{row.intern.joining_date}</td>
                      <td className="py-3 px-4 font-medium">{getStageLabel(row.intern.current_stage)}</td>
                      <td className="py-3 px-4 font-semibold">
                        {row.latestKpi ? `${row.latestKpi.overall_score}/100` : '—'}
                      </td>
                      <td className="py-3 px-4">
                        {row.completedTasksCount}/{totalTasks} completed
                      </td>
                      <td className="py-3 px-4">
                        {internProj ? <Badge status={internProj.status}>{internProj.status}</Badge> : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex flex-col gap-1">
                          <Badge status={row.week12CertStatus}>W12: {row.week12CertStatus}</Badge>
                          <Badge status={row.week24CertStatus}>W24: {row.week24CertStatus}</Badge>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge status={row.intern.status}>{row.intern.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/mentor/interns/${row.intern.id}`}>
                          <Button variant="outline" size="sm">
                            Open Profile
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-[#64748B]">
            <span>
              Page {safePage} of {totalPages} ({rows.length} interns)
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                icon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                icon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

