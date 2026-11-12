import React, { useEffect, useState } from 'react';
import { Clock, Lock, Shield, UserCircle } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';
import { FormField, Input } from '../../components/ui/FormControls';
import { ErrorState, LoadingPage } from '../../components/ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import {
  fetchAssignedTimesheets,
  reviewTimesheetEntry,
  updateMentorOwnProfile,
} from '../../services/projectAndCertService';
import type { TimesheetEntry } from '../../types/database';

export const MentorProfilePage: React.FC = () => {
  const { profile, refreshProfile } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [domain, setDomain] = useState('');
  const [expertise, setExpertise] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bundle || !profile) return;
    setFullName(profile.full_name);
    setPhone(profile.phone ?? '');
    setDomain(bundle.mentor.technical_domain ?? '');
    setExpertise((bundle.mentor.areas_of_expertise ?? []).join(', '));
  }, [bundle, profile]);

  if (loading) return <LoadingPage message="Loading mentor profile..." />;
  if (error || !bundle || !profile) return <ErrorState message={error ?? 'Profile unavailable.'} onRetry={refresh} />;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await updateMentorOwnProfile({
        profileId: profile.id,
        mentorId: bundle.mentor.id,
        fullName,
        phone,
        technicalDomain: domain,
        areasOfExpertise: expertise
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        notificationPreferences: bundle.mentor.notification_preferences,
      });
      await Promise.all([refreshProfile(), refresh()]);
      showToast('success', 'Profile updated');
    } catch (err) {
      showToast('error', 'Update failed', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">My Mentor Profile</h1>
        <p className="text-sm text-[#64748B]">
          Update permitted mentor details. Administrative fields (Role, Employee ID, Department, Designation) are controlled by Admin.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card>
          <CardHeader title="Administrative Summary" action={<UserCircle className="w-5 h-5 text-[#2563EB]" />} />
          <CardContent className="space-y-3 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[#64748B]">Role</p>
              <p className="font-bold text-[#172B4D] mt-0.5">{profile.role} (Read-only)</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[#64748B]">Employee ID</p>
              <p className="font-bold text-[#172B4D] mt-0.5">{bundle.mentor.employee_id}</p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[#64748B]">Department & Designation</p>
              <p className="font-bold text-[#172B4D] mt-0.5">
                {bundle.mentor.department || '—'} · {bundle.mentor.designation || '—'}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-100">
              <p className="text-[#64748B]">Assigned Interns / Joining Date</p>
              <p className="font-bold text-[#172B4D] mt-0.5">
                {bundle.interns.length} intern(s) · Joined {bundle.mentor.joining_date ?? '—'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Permitted Profile Information" />
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField label="Full Name" required>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </FormField>
                <FormField label="Email (Managed by Auth)">
                  <Input value={profile.email} disabled />
                </FormField>
                <FormField label="Phone">
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </FormField>
                <FormField label="Technical Domain">
                  <Input value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="e.g., Full-Stack Cloud & AI" />
                </FormField>
              </div>
              <FormField label="Areas of Expertise" hint="Comma-separated skills">
                <Input value={expertise} onChange={(e) => setExpertise(e.target.value)} placeholder="React, TypeScript, PostgreSQL, System Design" />
              </FormField>
              <div className="flex justify-end">
                <Button type="submit" loading={saving}>Save Profile Changes</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const MentorSettingsPage: React.FC = () => {
  const { profile, session, updatePassword, signOut } = useAuth();
  const { bundle, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();

  const [prefs, setPrefs] = useState(bundle?.mentor.notification_preferences);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [timesheets, setTimesheets] = useState<TimesheetEntry[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!bundle) return;
    setPrefs(bundle.mentor.notification_preferences);
    if (bundle.timesheetsEnabled) {
      fetchAssignedTimesheets(bundle.interns.map((i) => i.intern.id))
        .then(setTimesheets)
        .catch(() => {});
    }
  }, [bundle]);

  if (loading) return <LoadingPage message="Loading mentor settings..." />;
  if (error || !bundle || !profile) return <ErrorState message={error ?? 'Settings unavailable.'} onRetry={refresh} />;

  const activePrefs = prefs ?? bundle.mentor.notification_preferences;

  const handleSavePrefs = async () => {
    setSaving(true);
    try {
      await updateMentorOwnProfile({
        profileId: profile.id,
        mentorId: bundle.mentor.id,
        fullName: profile.full_name,
        phone: profile.phone ?? '',
        technicalDomain: bundle.mentor.technical_domain,
        areasOfExpertise: bundle.mentor.areas_of_expertise,
        notificationPreferences: activePrefs,
      });
      await refresh();
      showToast('success', 'Notification preferences saved');
    } catch (err) {
      showToast('error', 'Failed to save preferences', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('error', 'Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      await updatePassword(newPassword);
      setNewPassword('');
      setConfirmPassword('');
      showToast('success', 'Password updated securely');
    } catch (err) {
      showToast('error', 'Password update failed', formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  const handleTimesheetReview = async (id: string, decision: 'Approved' | 'Returned') => {
    try {
      await reviewTimesheetEntry({
        timesheetId: id,
        mentorId: bundle.mentor.id,
        decision,
        comments: `Reviewed by ${profile.full_name}`,
      });
      setTimesheets((prev) => prev.map((t) => (t.id === id ? { ...t, status: decision } : t)));
      showToast('success', `Timesheet ${decision}`);
    } catch (err) {
      showToast('error', 'Timesheet action failed', formatAppError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#172B4D]">Mentor Settings & Security</h1>
        <p className="text-sm text-[#64748B]">
          Manage notification preferences, password security, and active session
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card>
          <CardHeader title="Notification & Email Preferences" />
          <CardContent className="space-y-3 text-xs">
            {(
              [
                ['in_app', 'In-App Notifications'],
                ['email', 'Email Notifications (when EmailJS/SMTP configured)'],
                ['task_submissions', 'Task Submission Alerts'],
                ['monthly_reports', 'Monthly KPI Report Alerts'],
                ['evaluations', 'Stage Evaluation Deadline Alerts'],
                ['certifications', 'Certification Upload Alerts'],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 cursor-pointer">
                <span className="font-medium text-[#172B4D]">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(activePrefs[key])}
                  onChange={(e) => setPrefs({ ...activePrefs, [key]: e.target.checked })}
                />
              </label>
            ))}
            <div className="flex justify-end pt-2">
              <Button onClick={handleSavePrefs} loading={saving}>Save Preferences</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Password Reset & Session Management" action={<Lock className="w-4 h-4 text-[#2563EB]" />} />
          <CardContent className="space-y-5">
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <FormField label="New Password">
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimum 8 characters" />
              </FormField>
              <FormField label="Confirm New Password">
                <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Repeat new password" />
              </FormField>
              <Button type="submit" variant="primary" loading={saving}>Update Password</Button>
            </form>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-[#172B4D] flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-[#16A34A]" /> Active Supabase Session
                </p>
                <p className="text-[#64748B]">
                  Expires: {session?.expires_at ? new Date(session.expires_at * 1000).toLocaleString() : 'Active'}
                </p>
              </div>
              <Button variant="danger" size="sm" onClick={() => signOut()}>
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Optional Timesheets Review (Section 17 - gated strictly by approved config flag) */}
      <Card>
        <CardHeader
          title="Attendance & Timesheets"
          subtitle="Controlled by SmartBridge shared policy configuration (launchpad_configs.attendance_timesheets_enabled)"
          action={
            <Badge tone={bundle.timesheetsEnabled ? 'green' : 'slate'}>
              <Clock className="w-3 h-3 mr-1" /> {bundle.timesheetsEnabled ? 'Enabled' : 'Disabled by Policy'}
            </Badge>
          }
        />
        <CardContent className="text-xs text-[#64748B]">
          {!bundle.timesheetsEnabled ? (
            <p>
              Attendance and timesheet review is currently disabled in shared configuration pending approved SmartBridge
              policy. No unofficial attendance rules are enforced.
            </p>
          ) : timesheets.length === 0 ? (
            <p>No timesheet submissions from assigned interns yet.</p>
          ) : (
            <div className="space-y-2">
              {timesheets.map((ts) => (
                <div key={ts.id} className="p-3 rounded-lg border border-slate-200 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-[#172B4D]">
                      Date: {ts.work_date} · {ts.hours_worked} hrs
                    </p>
                    <p>{ts.notes || '—'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge status={ts.status}>{ts.status}</Badge>
                    {ts.status === 'Submitted' && (
                      <>
                        <Button size="sm" variant="outline" onClick={() => handleTimesheetReview(ts.id, 'Returned')}>
                          Return
                        </Button>
                        <Button size="sm" variant="success" onClick={() => handleTimesheetReview(ts.id, 'Approved')}>
                          Approve
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

