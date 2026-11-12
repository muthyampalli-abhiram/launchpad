import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, Database, Eye, EyeOff, Lock, Mail, ShieldCheck } from 'lucide-react';
import { getRoleDashboardPath, useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { Button } from '../../components/ui/Button';
import { FormField, Input } from '../../components/ui/FormControls';

export const LoginPage: React.FC = () => {
  const { signIn, resendVerificationEmail, profile, isConfigured, error: authError } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (profile) {
      navigate(getRoleDashboardPath(profile.role), { replace: true });
    }
  }, [profile, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    if (!email.trim() || !password) {
      setLocalError('Please enter both your email address and password.');
      return;
    }

    setSubmitting(true);
    try {
      const signedInProfile = await signIn(email, password);
      navigate(getRoleDashboardPath(signedInProfile.role), { replace: true });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = localError || authError;
  const needsConfirmation = Boolean(displayError && displayError.toLowerCase().includes('confirm'));

  const handleResend = async () => {
    if (!email.trim()) return;
    setResending(true);
    try {
      await resendVerificationEmail(email);
      showToast('success', 'Verification email sent', `Check ${email} to confirm your account.`);
    } catch (err) {
      showToast('error', 'Resend failed', err instanceof Error ? err.message : 'Unable to resend.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-[#172B4D] text-white flex items-center justify-center font-bold text-lg shadow-sm">
          SB
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#172B4D]">SmartBridge InternFlow</h1>
        <p className="mt-1 text-sm text-[#64748B]">
          LAUNCHPAD Management System · Unified Admin, Mentor & Intern Access
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-8 space-y-6">
          {!isConfigured && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Database className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="text-xs text-[#172B4D] space-y-1">
                <p className="font-semibold">Supabase Environment Configuration Required</p>
                <p className="text-[#64748B]">
                  Copy <code className="bg-white px-1 py-0.5 rounded border">.env.example</code> to{' '}
                  <code className="bg-white px-1 py-0.5 rounded border">.env</code>, set{' '}
                  <code className="bg-white px-1 py-0.5 rounded border">VITE_SUPABASE_URL</code> and{' '}
                  <code className="bg-white px-1 py-0.5 rounded border">VITE_SUPABASE_ANON_KEY</code>, and apply
                  the SQL migrations in <code className="bg-white px-1 py-0.5 rounded border">supabase/migrations/</code>.
                </p>
              </div>
            </div>
          )}

          {displayError && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3.5 flex items-start gap-2.5 text-xs text-[#DC2626]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <span>{displayError}</span>
                {needsConfirmation && email.trim() && (
                  <div>
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={resending}
                      className="font-semibold text-[#2563EB] hover:underline cursor-pointer"
                    >
                      {resending ? 'Sending verification email...' : 'Resend verification email'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField label="Work Email" required>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="mentor@smartbridge.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  disabled={submitting}
                />
              </div>
            </FormField>

            <FormField label="Password" required>
              <div className="relative">
                <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 pr-10"
                  disabled={submitting}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#172B4D] cursor-pointer"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </FormField>

            <div className="flex items-center justify-between text-xs">
              <span className="text-[#64748B] inline-flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-[#16A34A]" /> Role verified via Supabase
              </span>
              <Link to="/forgot-password" className="text-[#2563EB] hover:underline font-medium">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full"
              loading={submitting}
            >
              Sign in to InternFlow
            </Button>
          </form>

          <div className="pt-4 border-t border-slate-100 space-y-2 text-[11px] text-[#64748B] text-center">
            <p>
              New to InternFlow?{' '}
              <Link to="/register" className="text-[#2563EB] font-semibold hover:underline">
                Register an account
              </Link>
            </p>
            <p>
              Authenticated users are automatically routed to <code className="text-[#172B4D]">/admin/dashboard</code>,{' '}
              <code className="text-[#172B4D]">/mentor/dashboard</code>, or{' '}
              <code className="text-[#172B4D]">/intern/dashboard</code> based on their verified database role.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

