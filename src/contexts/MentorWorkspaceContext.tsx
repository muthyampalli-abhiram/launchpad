import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { formatAppError, supabase } from '../lib/supabase';
import { fetchMentorWorkspaceBundle, type MentorWorkspaceBundle } from '../services/mentorDataService';
import { fetchNotifications } from '../services/projectAndCertService';
import type { AppNotification } from '../types/database';
import { useAuth } from './AuthContext';

interface MentorWorkspaceContextValue {
  bundle: MentorWorkspaceBundle | null;
  notifications: AppNotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const MentorWorkspaceContext = createContext<MentorWorkspaceContextValue | undefined>(undefined);

export const MentorWorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile } = useAuth();
  const [bundle, setBundle] = useState<MentorWorkspaceBundle | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!profile || profile.role !== 'MENTOR') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [workspaceData, notifData] = await Promise.all([
        fetchMentorWorkspaceBundle(profile.id),
        fetchNotifications(profile.id),
      ]);
      setBundle(workspaceData);
      setNotifications(notifData as AppNotification[]);
    } catch (err) {
      setError(formatAppError(err, 'Failed to load mentor workspace data.'));
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Real-time cross-portal synchronization for assigned interns, submissions, reports, certs & notifications
  useEffect(() => {
    if (!supabase || !profile || profile.role !== 'MENTOR') return;
    const channel = supabase
      .channel(`mentor-workspace-realtime-${profile.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_assignments' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'task_submissions' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'monthly_reports' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'certifications' }, () => refresh())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => refresh())
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `recipient_profile_id=eq.${profile.id}`,
        },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [profile, refresh]);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <MentorWorkspaceContext.Provider
      value={{
        bundle,
        notifications,
        unreadCount,
        loading,
        error,
        refresh,
      }}
    >
      {children}
    </MentorWorkspaceContext.Provider>
  );
};

export function useMentorWorkspace(): MentorWorkspaceContextValue {
  const ctx = useContext(MentorWorkspaceContext);
  if (!ctx) throw new Error('useMentorWorkspace must be used inside MentorWorkspaceProvider');
  return ctx;
}

