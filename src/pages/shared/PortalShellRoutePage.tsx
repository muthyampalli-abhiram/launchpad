import React from 'react';
import { Link } from 'react-router-dom';
import { LogOut, ShieldAlert } from 'lucide-react';
import { getRoleDashboardPath, useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Card, CardContent, CardHeader } from '../../components/ui/Card';

export const PortalShellRoutePage: React.FC<{ portalRole: 'ADMIN' | 'INTERN' }> = ({ portalRole }) => {
  const { profile, signOut } = useAuth();

  return (
    <div className="min-h-screen bg-[#F5F7FA] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between bg-white px-6 py-4 rounded-xl border border-slate-200">
          <div>
            <h1 className="text-lg font-bold text-[#172B4D]">
              SmartBridge InternFlow – {portalRole === 'ADMIN' ? 'Admin Portal' : 'Intern Portal'}
            </h1>
            <p className="text-xs text-[#64748B]">
              Signed in as {profile?.full_name} ({profile?.role})
            </p>
          </div>
          <Button variant="outline" size="sm" icon={<LogOut className="w-4 h-4" />} onClick={() => signOut()}>
            Logout
          </Button>
        </div>

        <Card>
          <CardHeader
            title={`${portalRole === 'ADMIN' ? 'Admin' : 'Intern'} Portal Integration Slot`}
            subtitle="Shared database, authentication, design tokens, and RLS contracts are active."
          />
          <CardContent className="space-y-3 text-sm text-[#64748B]">
            <p>
              This route is reserved for the <strong className="text-[#172B4D]">{portalRole}</strong> module inside the
              single unified InternFlow React application. All Mentor Portal workflows read and write against the same
              shared Supabase tables (<code className="text-[#172B4D]">tasks</code>,{' '}
              <code className="text-[#172B4D]">monthly_reports</code>,{' '}
              <code className="text-[#172B4D]">kpi_evaluations</code>,{' '}
              <code className="text-[#172B4D]">stage_evaluations</code>,{' '}
              <code className="text-[#172B4D]">projects</code>,{' '}
              <code className="text-[#172B4D]">certifications</code>,{' '}
              <code className="text-[#172B4D]">improvement_plans</code>).
            </p>
            <p className="text-xs">
              See <code className="text-[#172B4D]">docs/CROSS_PORTAL_INTEGRATION.md</code> for the shared database
              contracts and Admin/Intern developer handoff specification.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export const UnauthorizedPage: React.FC = () => {
  const { profile } = useAuth();
  return (
    <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl border border-slate-200 p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-red-50 text-[#DC2626] flex items-center justify-center mx-auto">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <h1 className="text-lg font-bold text-[#172B4D]">Access Restricted</h1>
        <p className="text-xs text-[#64748B]">
          You do not have permission to access this route. Access control is enforced by both route guards and Supabase
          Row Level Security.
        </p>
        <Link
          to={profile ? getRoleDashboardPath(profile.role) : '/login'}
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-[#2563EB] text-white text-sm font-medium hover:bg-blue-700"
        >
          Return to Authorized Dashboard
        </Link>
      </div>
    </div>
  );
};

