import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Plus } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { FormField, Input, SearchInput, Select, Textarea } from '../../components/ui/FormControls';
import { Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { KPI_PILLARS, LAUNCHPAD_STAGES } from '../../constants/launchpad';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { createTasksForAssignedInterns } from '../../services/taskService';
import type { KpiPillar } from '../../types/database';

export const TasksPage: React.FC = () => {
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [stageFilter, setStageFilter] = useState('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Task creation form state (Section 7A)
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [instructions, setInstructions] = useState('');
  const [learningObjectives, setLearningObjectives] = useState('');
  const [category, setCategory] = useState('Technical Assignment');
  const [stageNumber, setStageNumber] = useState('1');
  const [kpiPillar, setKpiPillar] = useState<KpiPillar>('BUILD');
  const [selectedInternIds, setSelectedInternIds] = useState<string[]>([]);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [priority, setPriority] = useState<'Low' | 'Medium' | 'High' | 'Critical'>('Medium');
  const [submissionInstructions, setSubmissionInstructions] = useState('');
  const [expectedDeliverables, setExpectedDeliverables] = useState('');
  const [maxMarks, setMaxMarks] = useState('100');
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTasks = useMemo(() => {
    if (!bundle) return [];
    const q = search.trim().toLowerCase();
    return bundle.tasks.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (stageFilter !== 'ALL' && String(t.stage_number) !== stageFilter) return false;
      if (q) {
        const hay = `${t.title} ${t.intern?.profile?.full_name ?? ''} ${t.kpi_pillar}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [bundle, search, statusFilter, stageFilter]);

  if (loading) return <LoadingPage message="Loading mentor tasks..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load tasks.'} onRetry={refresh} />;

  const toggleInternSelection = (id: string) => {
    setSelectedInternIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setInstructions('');
    setLearningObjectives('');
    setCategory('Technical Assignment');
    setStageNumber('1');
    setKpiPillar('BUILD');
    setSelectedInternIds([]);
    setStartDate(new Date().toISOString().slice(0, 10));
    setDueDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
    setPriority('Medium');
    setSubmissionInstructions('');
    setExpectedDeliverables('');
    setMaxMarks('100');
    setAttachmentFile(null);
    setFormError(null);
  };

  const handleCreate = async (status: 'Draft' | 'Assigned') => {
    setFormError(null);
    if (!profile) return;
    const parsedMax = maxMarks.trim() ? Number(maxMarks) : null;
    if (parsedMax !== null && (Number.isNaN(parsedMax) || parsedMax <= 0)) {
      setFormError('Maximum marks must be a positive number.');
      return;
    }

    setSubmitting(true);
    try {
      const internProfileMap = new Map(
        bundle.interns.map((i) => [i.intern.id, i.intern.profile_id])
      );
      await createTasksForAssignedInterns({
        title,
        description,
        instructions,
        learning_objectives: learningObjectives,
        category,
        stage_number: Number(stageNumber),
        kpi_pillar: kpiPillar,
        mentor_id: bundle.mentor.id,
        intern_ids: selectedInternIds,
        start_date: startDate,
        due_date: dueDate,
        priority,
        attachmentFile,
        submission_instructions: submissionInstructions,
        expected_deliverables: expectedDeliverables,
        max_marks: parsedMax,
        status,
        actorProfileId: profile.id,
        internProfileMap,
      });
      showToast('success', status === 'Draft' ? 'Draft saved' : 'Task assigned', `Task "${title}" saved.`);
      resetForm();
      setModalOpen(false);
      await refresh();
    } catch (err) {
      setFormError(formatAppError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Task Management</h1>
          <p className="text-sm text-[#64748B]">
            Create tasks for assigned interns and track submission & review workflows
          </p>
        </div>
        <Button
          variant="primary"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setModalOpen(true)}
          disabled={bundle.interns.length === 0}
        >
          Create Task
        </Button>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SearchInput value={search} onChange={setSearch} placeholder="Search task title or intern..." />
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Task Statuses</option>
            {['Draft', 'Assigned', 'In Progress', 'Submitted', 'Under Review', 'Revision Requested', 'Resubmitted', 'Reviewed', 'Completed', 'Overdue'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
          <Select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)}>
            <option value="ALL">All Stages</option>
            {LAUNCHPAD_STAGES.map((s) => (
              <option key={s.stage} value={String(s.stage)}>{s.name}</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {filteredTasks.length === 0 ? (
        <EmptyState
          icon={<CheckSquare className="w-6 h-6" />}
          title="No tasks found"
          description="Create a task for one or more assigned interns to initiate the cross-portal submission workflow."
          action={
            bundle.interns.length > 0 ? (
              <Button onClick={() => setModalOpen(true)} icon={<Plus className="w-4 h-4" />}>
                Create First Task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Task Title</th>
                  <th className="py-3 px-4">Assigned Intern</th>
                  <th className="py-3 px-4">Stage / Pillar</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Task Status</th>
                  <th className="py-3 px-4">Latest Submission</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.map((task) => {
                  const latestSub = bundle.submissions.find((s) => s.task_id === task.id);
                  return (
                    <tr key={task.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-[#172B4D]">{task.title}</td>
                      <td className="py-3 px-4">{task.intern?.profile?.full_name ?? '—'}</td>
                      <td className="py-3 px-4">
                        Stage {task.stage_number} · <span className="font-semibold">{task.kpi_pillar}</span>
                      </td>
                      <td className="py-3 px-4 text-[#64748B]">{task.created_at.slice(0, 10)}</td>
                      <td className="py-3 px-4 font-medium">{task.due_date}</td>
                      <td className="py-3 px-4"><Badge status={task.priority}>{task.priority}</Badge></td>
                      <td className="py-3 px-4"><Badge status={task.status}>{task.status}</Badge></td>
                      <td className="py-3 px-4">
                        {latestSub ? <Badge status={latestSub.status}>{latestSub.status} (v{latestSub.version_number})</Badge> : 'Not Submitted'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link to={`/mentor/tasks/${task.id}`}>
                          <Button variant="outline" size="sm">Open / Review</Button>
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

      {/* Task Creation Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create & Assign Task"
        subtitle="Tasks can only be assigned to interns authorized under your mentor assignments"
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button variant="secondary" onClick={() => handleCreate('Draft')} loading={submitting}>
              Save as Draft
            </Button>
            <Button variant="primary" onClick={() => handleCreate('Assigned')} loading={submitting}>
              Assign Task
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {formError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-[#DC2626]">{formError}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Task Title" required>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g., Build REST API Integration Module" />
            </FormField>
            <FormField label="Task Category" required>
              <Select value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="Technical Assignment">Technical Assignment</option>
                <option value="Practical Lab">Practical Lab</option>
                <option value="Research & Case Study">Research & Case Study</option>
                <option value="KT / Presentation">KT / Presentation</option>
                <option value="Project Deliverable">Project Deliverable</option>
              </Select>
            </FormField>
          </div>

          <FormField label="Description" required>
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Clear overview of the task scope..." />
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Instructions">
              <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="Step-by-step execution instructions..." />
            </FormField>
            <FormField label="Learning Objectives">
              <Textarea value={learningObjectives} onChange={(e) => setLearningObjectives(e.target.value)} placeholder="Competencies gained from this task..." />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <FormField label="LAUNCHPAD Stage" required>
              <Select value={stageNumber} onChange={(e) => setStageNumber(e.target.value)}>
                {LAUNCHPAD_STAGES.map((s) => (
                  <option key={s.stage} value={String(s.stage)}>{s.name}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Related KPI Pillar" required>
              <Select value={kpiPillar} onChange={(e) => setKpiPillar(e.target.value as KpiPillar)}>
                {KPI_PILLARS.map((p) => (
                  <option key={p.key} value={p.key}>{p.label} ({p.weightPct}%)</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Priority" required>
              <Select value={priority} onChange={(e) => setPriority(e.target.value as typeof priority)}>
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
                <option value="Critical">Critical</option>
              </Select>
            </FormField>
            <FormField label="Maximum Marks" hint="Optional rubric ceiling">
              <Input type="number" min={1} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} />
            </FormField>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Start Date" required>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </FormField>
            <FormField label="Due Date" required>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </FormField>
          </div>

          <FormField label="Assign to Intern(s)" required hint="Only your currently assigned interns are selectable">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 border border-slate-200 rounded-lg bg-slate-50">
              {bundle.interns.map((item) => (
                <label key={item.intern.id} className="flex items-center gap-2 text-xs text-[#172B4D] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedInternIds.includes(item.intern.id)}
                    onChange={() => toggleInternSelection(item.intern.id)}
                    className="rounded border-slate-300 text-[#2563EB]"
                  />
                  <span>
                    {item.intern.profile?.full_name} ({item.intern.intern_code})
                  </span>
                </label>
              ))}
            </div>
          </FormField>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Submission Instructions">
              <Textarea rows={2} value={submissionInstructions} onChange={(e) => setSubmissionInstructions(e.target.value)} placeholder="Repo link, PDF report, etc." />
            </FormField>
            <FormField label="Expected Deliverables">
              <Textarea rows={2} value={expectedDeliverables} onChange={(e) => setExpectedDeliverables(e.target.value)} placeholder="Working code, unit tests, demo video..." />
            </FormField>
          </div>

          <FormField label="Task Attachment (Optional)" hint="Stored securely in private Supabase Storage (max 15 MB)">
            <Input
              type="file"
              onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
            />
          </FormField>
        </div>
      </Modal>
    </div>
  );
};

