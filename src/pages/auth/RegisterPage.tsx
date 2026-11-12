import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Database, Eye, EyeOff, KeyRound, Lock, Mail, Phone, ShieldCheck, User } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { FormField, Input, Select } from '../../components/ui/FormControls';
import { useAuth } from '../../contexts/AuthContext';

function validateStrongPassword(password: string): string | null {
  if (password.length < 8) return 'Password must be at least 8 characters long.';
  if (!/[A-Z]/.test(password)) return 'Password must include at least one uppercase letter.';
  if (!/[a-z]/.test(password)) return 'Password must include at least one lowercase letter.';
  if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
  if (!/[^A-Za-z0-9]/.test(password)) return 'Password must include at least one special character.';
  return null;
}

export const RegisterPage: React.FC = () => {
  const { signUp, isConfigured } = useAuth();
  const [accountType, setAccountType] = useState<'INTERN' | 'MENTOR'>('MENTOR');
  const [inviteCode, setInviteCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [domain, setDomain] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMessage, setDoneMessage] = useState<string | null>(null);

  const passwordRules = [
    { label: '8+ characters', met: password.length >= 8 },
    { label: 'Uppercase (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Lowercase (a-z)', met: /[a-z]/.test(password) },
    { label: 'Number (0-9)', met: /[0-9]/.test(password) },
    { label: 'Special char (!@#...)', met: /[^A-Za-z0-9]/.test(password) },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (accountType === 'MENTOR' && !inviteCode.trim()) {
      setError('A Mentor Invite Code (issued by Admin) is required for Mentor registration.');
      return;
    }
    const pwdErr = validateStrongPassword(password);
    if (pwdErr) {
      setError(pwdErr);
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await signUp({
        email,
        password,
        fullName,
        phone,
        accountType,
        inviteCode: accountType === 'MENTOR' ? inviteCode : undefined,
        domain,
      });
      setDoneMessage(
        res.needsEmailVerification
          ? `Account created for ${email}. Please check your inbox and click the Supabase verification link before signing in.`
          : `Account registered and synced to PostgreSQL! You can now sign in.`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-[#172B4D] text-white flex items-center justify-center font-bold text-lg shadow-sm">
          SB
        </div>
        <h1 className="mt-4 text-2xl font-bold text-[#172B4D]">Create InternFlow Account</h1>
        <p className="mt-1 text-xs text-[#64748B]">
          Real-time registration with strong authentication & PostgreSQL role verification
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-7 px-6 shadow-sm rounded-xl border border-slate-200 sm:px-8 space-y-5">
          {!isConfigured && (
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 flex items-start gap-3">
              <Database className="w-5 h-5 text-[#F59E0B] shrink-0 mt-0.5" />
              <div className="text-xs text-[#172B4D] space-y-1">
                <p className="font-semibold">Supabase Environment Configuration Required</p>
                <p className="text-[#64748B]">
                  Create <code className="bg-white px-1 py-0.5 rounded border">.env</code> next to{' '}
                  <code className="bg-white px-1 py-0.5 rounded border">.env.example</code> with your{' '}
                  <code className="bg-white px-1 py-0.5 rounded border">VITE_SUPABASE_URL</code> and{' '}
                  <code className="bg-white px-1 py-0.5 rounded border">VITE_SUPABASE_ANON_KEY</code>, then restart
                  the dev server.
                </p>
              </div>
            </div>
          )}

          {doneMessage ? (
            <div className="rounded-lg bg-green-50 border border-green-200 p-4 flex items-start gap-3 text-xs text-[#16A34A]">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div className="space-y-2">
                <p className="font-semibold">Registration Complete</p>
                <p className="text-[#172B4D]">{doneMessage}</p>
                <Link to="/login" className="inline-block font-semibold text-[#2563EB] hover:underline">
                  Proceed to Sign In →
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2 text-xs text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <FormField label="Registration Role" required>
                <Select
                  value={accountType}
                  onChange={(e) => setAccountType(e.target.value as 'INTERN' | 'MENTOR')}
                  disabled={loading}
                >
                  <option value="MENTOR">Mentor (Requires Admin Invite Code)</option>
                  <option value="INTERN">Intern</option>
                </Select>
              </FormField>

              {accountType === 'MENTOR' && (
                <FormField label="Mentor Invite Code" required hint="Verified server-side by PostgreSQL against mentor_invite_codes">
                  <div className="relative">
                    <KeyRound className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter Admin-issued Mentor Invite Code"
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                </FormField>
              )}

              <FormField label="Full Name" required>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </FormField>

              <FormField label="Work Email" required>
                <div className="relative">
                  <Mail className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@smartbridge.com"
                    className="pl-9"
                    disabled={loading}
                  />
                </div>
              </FormField>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <FormField label="Phone Number">
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 ..."
                      className="pl-9"
                      disabled={loading}
                    />
                  </div>
                </FormField>
                <FormField label="Technical Domain">
                  <Input
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="e.g., Full-Stack"
                    disabled={loading}
                  />
                </FormField>
              </div>

              <FormField label="Strong Password" required>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    className="pl-9 pr-10"
                    disabled={loading}
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
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {passwordRules.map((rule) => (
                    <span
                      key={rule.label}
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${
                        rule.met
                          ? 'bg-green-50 text-[#16A34A] border-green-200'
                          : 'bg-slate-50 text-[#64748B] border-slate-200'
                      }`}
                    >
                      {rule.label}
                    </span>
                  ))}
                </div>
              </FormField>

              <FormField label="Confirm Password" required>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={loading}
                />
              </FormField>

              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-[11px] text-[#64748B] flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#2563EB] shrink-0 mt-0.5" />
                <span>
                  Mentor accounts require a database-verified invite code. Admin accounts can only be provisioned by an
                  Administrator.
                </span>
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                Register Account
              </Button>
            </form>
          )}

          <div className="pt-3 border-t border-slate-100 text-xs text-center text-[#64748B]">
            Already registered?{' '}
            <Link to="/login" className="text-[#2563EB] font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
