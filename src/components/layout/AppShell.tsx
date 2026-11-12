import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import {
  Award,
  BarChart3,
  Bell,
  BookOpen,
  CheckSquare,
  ClipboardCheck,
  FileBarChart2,
  FileCheck2,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  LogOut,
  Menu,
  MessageSquare,
  RefreshCw,
  Settings,
  ShieldCheck,
  Target,
  TrendingUp,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useMentorWorkspace } from '../../contexts/MentorWorkspaceContext';
import { Badge } from '../ui/Badge';

interface NavGroup {
  group: string;
  items: { label: string; to: string; icon: React.ReactNode; badge?: number }[];
}

export const MentorAppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { profile, signOut } = useAuth();
  const { unreadCount, refresh, loading } = useMentorWorkspace();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const navigate = useNavigate();

  const navGroups: NavGroup[] = [
    {
      group: 'Main',
      items: [{ label: 'Dashboard', to: '/mentor/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> }],
    },
    {
      group: 'Intern Management',
      items: [
        { label: 'My Interns', to: '/mentor/interns', icon: <Users className="w-4 h-4" /> },
        { label: 'Intern Performance', to: '/mentor/performance', icon: <TrendingUp className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Work Management',
      items: [
        { label: 'Tasks', to: '/mentor/tasks', icon: <CheckSquare className="w-4 h-4" /> },
        { label: 'Task Submissions', to: '/mentor/submissions', icon: <FileCheck2 className="w-4 h-4" /> },
        { label: 'Projects', to: '/mentor/projects', icon: <FolderKanban className="w-4 h-4" /> },
      ],
    },
    {
      group: 'LAUNCHPAD',
      items: [
        { label: 'Program Overview', to: '/mentor/launchpad', icon: <BookOpen className="w-4 h-4" /> },
        { label: 'Baseline Assessments', to: '/mentor/baseline', icon: <Gauge className="w-4 h-4" /> },
        { label: 'Monthly KPI Reports', to: '/mentor/monthly-reports', icon: <BarChart3 className="w-4 h-4" /> },
        { label: 'Stage Evaluations', to: '/mentor/evaluations', icon: <ClipboardCheck className="w-4 h-4" /> },
        { label: 'Certifications', to: '/mentor/certifications', icon: <Award className="w-4 h-4" /> },
        { label: 'Improvement Plans', to: '/mentor/improvement-plans', icon: <Target className="w-4 h-4" /> },
      ],
    },
    {
      group: 'Communication',
      items: [
        { label: 'Feedback', to: '/mentor/feedback', icon: <MessageSquare className="w-4 h-4" /> },
        {
          label: 'Notifications',
          to: '/mentor/notifications',
          icon: <Bell className="w-4 h-4" />,
          badge: unreadCount > 0 ? unreadCount : undefined,
        },
      ],
    },
    {
      group: 'Reports',
      items: [{ label: 'Reports & Analytics', to: '/mentor/reports', icon: <FileBarChart2 className="w-4 h-4" /> }],
    },
    {
      group: 'Account',
      items: [
        { label: 'My Profile', to: '/mentor/profile', icon: <UserCircle className="w-4 h-4" /> },
        { label: 'Settings', to: '/mentor/settings', icon: <Settings className="w-4 h-4" /> },
      ],
    },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#172B4D] text-slate-200">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <Link to="/mentor/dashboard" className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#2563EB] flex items-center justify-center text-white font-bold text-sm shadow-sm">
            SB
          </div>
          <div>
            <div className="text-sm font-bold text-white leading-tight">INTERNFLOW</div>
            <div className="text-[11px] text-blue-200 leading-tight">LAUNCHPAD · Mentor Portal</div>
          </div>
        </Link>
        <button
          type="button"
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden text-slate-300 hover:text-white p-1"
          aria-label="Close navigation menu"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {navGroups.map((group) => (
          <div key={group.group}>
            <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              {group.group}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setSidebarOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-[#2563EB] text-white shadow-xs'
                        : 'text-slate-300 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.badge !== undefined && (
                    <span className="px-1.5 py-0.5 text-[10px] font-bold rounded-full bg-[#F59E0B] text-white">
                      {item.badge}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <div className="px-3 py-2 rounded-lg bg-white/5 flex items-center gap-2.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-white truncate">{profile?.full_name}</p>
            <p className="text-[11px] text-slate-400 truncate">Role: MENTOR (RLS Enforced)</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-[#F5F7FA]">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 sticky top-0 h-screen">{sidebarContent}</aside>

      {/* Mobile Drawer */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-900/50" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-64 max-w-[80vw] h-full z-10">{sidebarContent}</aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-lg text-[#172B4D] hover:bg-slate-100"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#64748B]">
                SmartBridge InternFlow
              </span>
              <span className="text-slate-300">/</span>
              <Badge tone="blue">LAUNCHPAD 24-Week Program</Badge>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => refresh()}
              disabled={loading}
              className="p-2 rounded-lg text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100 transition-colors cursor-pointer"
              title="Refresh workspace data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#2563EB]' : ''}`} />
            </button>

            <Link
              to="/mentor/notifications"
              className="relative p-2 rounded-lg text-[#64748B] hover:text-[#172B4D] hover:bg-slate-100 transition-colors"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#DC2626]" />
              )}
            </Link>

            <div className="h-6 w-px bg-slate-200 hidden sm:block" />

            <Link
              to="/mentor/profile"
              className="hidden sm:flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-slate-100"
            >
              <div className="w-8 h-8 rounded-full bg-[#172B4D] text-white text-xs font-semibold flex items-center justify-center">
                {(profile?.full_name || 'M')
                  .split(' ')
                  .map((p) => p[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase()}
              </div>
              <div className="text-left">
                <p className="text-xs font-semibold text-[#172B4D] leading-tight">{profile?.full_name}</p>
                <p className="text-[11px] text-[#64748B] leading-tight">{profile?.email}</p>
              </div>
            </Link>

            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#64748B] hover:text-[#DC2626] hover:bg-red-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 max-w-[1600px] w-full mx-auto">{children}</main>
      </div>
    </div>
  );
};

