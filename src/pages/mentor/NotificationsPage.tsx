import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { Card, CardContent } from '../../components/ui/Card';
import { Select } from '../../components/ui/FormControls';
import { EmptyState, ErrorState, LoadingPage } from '../../components/ui/States';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { useToast } from '../../contexts/ToastContext';
import { formatAppError } from '../../lib/supabase';
import { markAllNotificationsRead, markNotificationRead } from '../../services/projectAndCertService';

export const NotificationsPage: React.FC = () => {
  const { profile } = useAuth();
  const { notifications, unreadCount, loading, error, refresh } = useMentorWorkspace();
  const { showToast } = useToast();
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL');
  const [busy, setBusy] = useState(false);

  if (loading) return <LoadingPage message="Loading notifications..." />;
  if (error) return <ErrorState message={error} onRetry={refresh} />;

  const items = notifications.filter((n) => (filter === 'UNREAD' ? !n.is_read : true));

  const handleToggleRead = async (id: string, nextState: boolean) => {
    try {
      await markNotificationRead(id, nextState);
      await refresh();
    } catch (err) {
      showToast('error', 'Update failed', formatAppError(err));
    }
  };

  const handleMarkAll = async () => {
    if (!profile) return;
    setBusy(true);
    try {
      await markAllNotificationsRead(profile.id);
      showToast('success', 'All notifications marked read');
      await refresh();
    } catch (err) {
      showToast('error', 'Action failed', formatAppError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#172B4D]">Notifications</h1>
          <p className="text-sm text-[#64748B]">
            Updates for your assigned interns ({unreadCount} unread)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-40">
            <Select value={filter} onChange={(e) => setFilter(e.target.value as 'ALL' | 'UNREAD')}>
              <option value="ALL">All Notifications</option>
              <option value="UNREAD">Unread Only</option>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<CheckCheck className="w-4 h-4" />}
            onClick={handleMarkAll}
            loading={busy}
            disabled={unreadCount === 0}
          >
            Mark All Read
          </Button>
        </div>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell className="w-6 h-6" />}
          title="No notifications"
          description="You will receive notifications for intern assignments, task submissions, monthly reports, evaluations, projects, and certifications."
        />
      ) : (
        <div className="space-y-2.5">
          {items.map((n) => (
            <Card key={n.id} className={n.is_read ? 'opacity-80' : 'border-l-4 border-l-[#2563EB]'}>
              <CardContent className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1 flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2">
                    <Badge tone={n.is_read ? 'slate' : 'blue'}>{n.category}</Badge>
                    <span className="text-[#64748B]">{new Date(n.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-sm font-semibold text-[#172B4D]">{n.title}</p>
                  <p className="text-[#64748B]">{n.message}</p>
                </div>
                <div className="flex items-center gap-2">
                  {n.link_path && (
                    <Link to={n.link_path}>
                      <Button size="sm" variant="primary">Open Record</Button>
                    </Link>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleRead(n.id, !n.is_read)}
                  >
                    {n.is_read ? 'Mark Unread' : 'Mark Read'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

