import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Mail } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { FormField, Input } from '../../components/ui/FormControls';

export const ForgotPasswordPage: React.FC = () => {
  const { sendPasswordReset, isConfigured } = useAuth();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim()) {
      setError('Enter your registered email address.');
      return;
    }
    setLoading(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send reset link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-5">
        <div>
          <h1 className="text-xl font-bold text-[#172B4D]">Reset Password</h1>
          <p className="text-xs text-[#64748B] mt-1">
            Receive a secure Supabase password recovery link at your registered email address.
          </p>
        </div>

        {sent ? (
          <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3 text-xs text-[#16A34A]">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>
              <p className="font-semibold">Password reset link sent</p>
              <p className="text-[#172B4D] mt-0.5">Check your inbox for {email} and follow the recovery link.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-[#DC2626]">
                {error}
              </div>
            )}
            <FormField label="Registered Email" required>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="mentor@smartbridge.com"
                  className="pl-9"
                  disabled={!isConfigured}
                />
              </div>
            </FormField>
            <Button type="submit" className="w-full" loading={loading} disabled={!isConfigured}>
              Send Recovery Email
            </Button>
          </form>
        )}

        <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2563EB] hover:underline">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Sign In
        </Link>
      </div>
    </div>
  );
};

