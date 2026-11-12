import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { formatAppError, isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Profile, UserRole } from '../types/database';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  isConfigured: boolean;
  signIn: (email: string, password: string) => Promise<Profile>;
  signUp: (params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    accountType?: 'INTERN' | 'MENTOR';
    inviteCode?: string;
    domain?: string;
  }) => Promise<{
    needsEmailVerification: boolean;
  }>;
  signOut: () => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function getRoleDashboardPath(role: UserRole): string {
  switch (role) {
    case 'ADMIN':
      return '/admin/dashboard';
    case 'MENTOR':
      return '/mentor/dashboard';
    case 'INTERN':
      return '/intern/dashboard';
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrustedProfile = useCallback(async (userId: string): Promise<Profile> => {
    if (!supabase) {
      throw new Error('Supabase environment variables are not configured.');
    }
    const { data, error: profErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (profErr || !data) {
      throw new Error('Your account profile or role could not be verified in the database.');
    }
    const typed = data as Profile;
    if (!typed.is_active) {
      throw new Error('Your account is currently inactive. Contact an administrator.');
    }
    return typed;
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!session?.user) return;
    const prof = await loadTrustedProfile(session.user.id);
    setProfile(prof);
  }, [session?.user, loadTrustedProfile]);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        if (data.session?.user) {
          try {
            const prof = await loadTrustedProfile(data.session.user.id);
            if (mounted) setProfile(prof);
          } catch (err) {
            if (mounted) {
              setError(formatAppError(err));
              setProfile(null);
            }
          }
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setError(null);
      if (nextSession?.user) {
        try {
          const prof = await loadTrustedProfile(nextSession.user.id);
          if (mounted) setProfile(prof);
        } catch (err) {
          if (mounted) {
            setError(formatAppError(err));
            setProfile(null);
          }
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadTrustedProfile]);

  // Real-time authorization listener: react immediately if Admin revokes access or updates role
  useEffect(() => {
    if (!supabase || !session?.user) return;
    const userId = session.user.id;
    const channel = supabase
      .channel(`profile-auth-sync-${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        async (payload) => {
          const updated = payload.new as Profile;
          if (!updated.is_active) {
            setError('Your account has been deactivated by an administrator.');
            await supabase?.auth.signOut();
            setProfile(null);
            setSession(null);
          } else {
            setProfile(updated);
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [session?.user]);

  const signIn = async (email: string, password: string): Promise<Profile> => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Configure .env before signing in.');
    }
    setError(null);
    const { data, error: signInErr } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (signInErr || !data.user) {
      const msg = formatAppError(signInErr, 'Invalid email or password.');
      setError(msg);
      throw new Error(msg);
    }

    const prof = await loadTrustedProfile(data.user.id);
    setSession(data.session);
    setProfile(prof);
    return prof;
  };

  const signUp = async (params: {
    email: string;
    password: string;
    fullName: string;
    phone?: string;
    accountType?: 'INTERN' | 'MENTOR';
    inviteCode?: string;
    domain?: string;
  }): Promise<{ needsEmailVerification: boolean }> => {
    if (!supabase) {
      throw new Error('Supabase is not configured. Configure .env before registering.');
    }
    setError(null);
    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: params.email.trim(),
      password: params.password,
      options: {
        data: {
          full_name: params.fullName.trim(),
          phone: params.phone?.trim() || null,
          account_type: params.accountType ?? 'INTERN',
          invite_code: params.inviteCode?.trim() || null,
          domain: params.domain?.trim() || null,
        },
        emailRedirectTo: `${window.location.origin}/login`,
      },
    });
    if (signUpErr) {
      throw new Error(formatAppError(signUpErr, 'Unable to complete registration.'));
    }
    return {
      needsEmailVerification: !data.session,
    };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setError(null);
  };

  const resendVerificationEmail = async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: resendErr } = await supabase.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });
    if (resendErr) throw new Error(formatAppError(resendErr, 'Unable to resend verification email.'));
  };

  const sendPasswordReset = async (email: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (resetErr) throw new Error(formatAppError(resetErr, 'Unable to send password reset email.'));
  };

  const updatePassword = async (newPassword: string) => {
    if (!supabase) throw new Error('Supabase is not configured.');
    if (newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters long.');
    }
    const { error: updErr } = await supabase.auth.updateUser({ password: newPassword });
    if (updErr) throw new Error(formatAppError(updErr, 'Failed to update password.'));
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        profile,
        loading,
        error,
        isConfigured: isSupabaseConfigured,
        signIn,
        signUp,
        signOut,
        resendVerificationEmail,
        sendPasswordReset,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

