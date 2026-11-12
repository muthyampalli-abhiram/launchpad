import React, { useState } from 'react';
import { Award, CheckCircle2, FileWarning, XCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FileAttachmentButton } from '../../components/ui/FileAttachmentButton';
import { FormField, Select, Textarea } from '../../components/ui/FormControls';
import { ConfirmDialog, Modal } from '../../components/ui/Modal';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { verifyCertification } from '../../services/projectAndCertService';
import type { Certification, CertificationStatus } from '../../types/database';

export const CertificationsPage: React.FC = () => {
  const { profile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [milestoneFilter, setMilestoneFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [activeCert, setActiveCert] = useState<Certification | null>(null);
  const [comments, setComments] = useState('');
  const [pendingDecision, setPendingDecision] = useState<
    Extract<CertificationStatus, 'Verified' | 'Rejected' | 'Additional Evidence Requested'> | null
  >(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingPage message="Loading certification verification queue..." />;
  if (error || !bundle) return <ErrorState message={error ?? 'Unable to load certifications.'} onRetry={refresh} />;

  const certs = bundle.certifications.filter((c) => {
    if (milestoneFilter !== 'ALL' && c.milestone_type !== milestoneFilter) return false;
    if (statusFilter !== 'ALL' && c.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    pending: bundle.certifications.filter((c) => c.status === 'Pending Verification').length,
    verified: bundle.certifications.filter((c) => c.status === 'Verified').length,
    rejected: bundle.certifications.filter((c) => c.status === 'Rejected').length,
    missing: bundle.certifications.filter((c) => c.status === 'Missing').length,
  };

  const handleConfirmDecision = async () => {
    if (!profile || !activeCert || !pendingDecision) return;
    const latestEvidence = (activeCert.evidence ?? [])[0];
    setSaving(true);
    try {
      await verifyCertification({
        certificationId: activeCert.id,
        evidenceId: latestEvidence?.id,
        internProfileId: activeCert.intern?.profile_id,
        mentorId: bundle.mentor.id,
        decision: pendingDecision,
        comments,
        actorProfileId: profile.id,
      });
      showToast('success', 'Certification updated', `Status recorded as ${pendingDecision}.`);
      setPendingDecision(null);
      setActiveCert(null);
      setComments('');
      await refresh();
    } catch (err) {
      showToast('error', 'Verification failed', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Certification Verification</h1>
        <p className="text-sm text-[#64748B]">
          Verify mandatory Week 12 and Week 24 LAUNCHPAD certification evidence. Uploaded certificates require manual mentor verification.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <Card><CardContent className="p-4"><p className="text-xs text-[#64748B]">Pending Verification</p><p className="text-2xl font-bold text-[#F59E0B] mt-1">{stats.pending}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#64748B]">Verified Certificates</p><p className="text-2xl font-bold text-[#16A34A] mt-1">{stats.verified}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#64748B]">Rejected Certificates</p><p className="text-2xl font-bold text-[#DC2626] mt-1">{stats.rejected}</p></CardContent></Card>
        <Card><CardContent className="p-4"><p className="text-xs text-[#64748B]">Missing Evidence</p><p className="text-2xl font-bold text-[#172B4D] mt-1">{stats.missing}</p></CardContent></Card>
      </div>

      <Card>
        <CardContent className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Select value={milestoneFilter} onChange={(e) => setMilestoneFilter(e.target.value)}>
            <option value="ALL">All Milestones (Week 12 & Week 24)</option>
            <option value="WEEK_12">Week 12 Certification</option>
            <option value="WEEK_24">Week 24 Certification</option>
          </Select>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="ALL">All Verification Statuses</option>
            {['Missing', 'Pending Verification', 'Verified', 'Rejected', 'Additional Evidence Requested'].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>
        </CardContent>
      </Card>

      {certs.length === 0 ? (
        <EmptyState
          icon={<Award className="w-6 h-6" />}
          title="No certification records match"
          description="When assigned interns upload Week 12 or Week 24 certification evidence, they appear here for verification."
        />
      ) : (
        <Card>
          <CardHeader title="Assigned Intern Certification Records" />
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[#64748B] font-semibold">
                  <th className="py-3 px-4">Intern</th>
                  <th className="py-3 px-4">Milestone</th>
                  <th className="py-3 px-4">Certification Name</th>
                  <th className="py-3 px-4">Issuing Organization</th>
                  <th className="py-3 px-4">Issue Date</th>
                  <th className="py-3 px-4">Evidence</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {certs.map((c) => {
                  const evList = c.evidence ?? [];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-semibold text-[#172B4D]">{c.intern?.profile?.full_name}</td>
                      <td className="py-3 px-4 font-medium">{c.milestone_type.replace('_', ' ')}</td>
                      <td className="py-3 px-4">{c.certification_name || 'Not configured'}</td>
                      <td className="py-3 px-4">{c.issuing_organization || '—'}</td>
                      <td className="py-3 px-4 text-[#64748B]">{c.issue_date ?? '—'}</td>
                      <td className="py-3 px-4">{evList.length} file(s)</td>
                      <td className="py-3 px-4"><Badge status={c.status}>{c.status}</Badge></td>
                      <td className="py-3 px-4 text-right">
                        <Button size="sm" variant="primary" onClick={() => setActiveCert(c)}>
                          Inspect & Verify
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Certificate Inspection Modal */}
      <Modal
        open={activeCert !== null}
        onClose={() => setActiveCert(null)}
        title={`Certification Verification · ${activeCert?.intern?.profile?.full_name ?? ''}`}
        subtitle={`Milestone: ${activeCert?.milestone_type.replace('_', ' ') ?? ''}`}
        size="lg"
      >
        {activeCert && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div><span className="text-[#64748B]">Certification Name:</span> <strong className="text-[#172B4D]">{activeCert.certification_name || '—'}</strong></div>
              <div><span className="text-[#64748B]">Issuing Organization:</span> <strong className="text-[#172B4D]">{activeCert.issuing_organization || '—'}</strong></div>
              <div><span className="text-[#64748B]">Issue Date:</span> <strong className="text-[#172B4D]">{activeCert.issue_date || '—'}</strong></div>
              <div><span className="text-[#64748B]">Current Status:</span> <Badge status={activeCert.status}>{activeCert.status}</Badge></div>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-[#172B4D]">Uploaded Certificate Evidence (Signed Private Access)</p>
              {(activeCert.evidence ?? []).length === 0 ? (
                <p className="text-[#64748B]">No evidence files uploaded yet.</p>
              ) : (
                activeCert.evidence!.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-lg border border-slate-200 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <FileAttachmentButton storagePath={ev.file_path} fileName={ev.file_name} />
                      <p className="text-[11px] text-[#64748B] mt-1">
                        Uploaded {new Date(ev.uploaded_at).toLocaleString()} {ev.notes ? `· ${ev.notes}` : ''}
                      </p>
                      {ev.mentor_comments && (
                        <p className="text-[11px] text-[#172B4D] mt-1">Prior Decision ({ev.verification_decision}): {ev.mentor_comments}</p>
                      )}
                    </div>
                    {ev.verification_decision && <Badge status={ev.verification_decision}>{ev.verification_decision}</Badge>}
                  </div>
                ))
              )}
            </div>

            <FormField label="Verification Comments" hint="Required when rejecting or requesting additional evidence">
              <Textarea
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                placeholder="Record verification observations, certificate ID check, or reason for rejection..."
              />
            </FormField>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button
                variant="outline"
                icon={<FileWarning className="w-4 h-4 text-[#F59E0B]" />}
                onClick={() => setPendingDecision('Additional Evidence Requested')}
              >
                Request Additional Evidence
              </Button>
              <Button
                variant="danger"
                icon={<XCircle className="w-4 h-4" />}
                onClick={() => setPendingDecision('Rejected')}
              >
                Reject Evidence
              </Button>
              <Button
                variant="success"
                icon={<CheckCircle2 className="w-4 h-4" />}
                onClick={() => setPendingDecision('Verified')}
              >
                Verify Certificate
              </Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={pendingDecision !== null}
        title={`Confirm Certification ${pendingDecision}`}
        message={`Mark ${activeCert?.intern?.profile?.full_name}'s ${activeCert?.milestone_type.replace('_', ' ')} certificate as "${pendingDecision}"?`}
        confirmLabel={`Confirm ${pendingDecision}`}
        confirmVariant={pendingDecision === 'Rejected' ? 'danger' : pendingDecision === 'Verified' ? 'success' : 'primary'}
        loading={saving}
        onCancel={() => setPendingDecision(null)}
        onConfirm={handleConfirmDecision}
      />
    </div>
  );
};

