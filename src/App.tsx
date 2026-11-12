import React from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MentorAppShell } from './components/layout/AppShell';
import { AuthProvider, getRoleDashboardPath, useAuth } from './contexts/AuthContext';
import { MentorWorkspaceProvider } from './contexts/MentorWorkspaceContext';
import { ToastProvider } from './contexts/ToastContext';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';
import { BaselineAssessmentsPage } from './pages/mentor/BaselineAssessmentsPage';
import { CertificationsPage } from './pages/mentor/CertificationsPage';
import { FeedbackPage } from './pages/mentor/FeedbackPage';
import { ImprovementPlansPage } from './pages/mentor/ImprovementPlansPage';
import { InternPerformancePage } from './pages/mentor/InternPerformancePage';
import { InternProfilePage } from './pages/mentor/InternProfilePage';
import { LaunchpadOverviewPage } from './pages/mentor/LaunchpadOverviewPage';
import { MentorDashboardPage } from './pages/mentor/MentorDashboardPage';
import { MonthlyReportDetailPage } from './pages/mentor/MonthlyReportDetailPage';
import { MonthlyReportsPage } from './pages/mentor/MonthlyReportsPage';
import { MyInternsPage } from './pages/mentor/MyInternsPage';
import { NotificationsPage } from './pages/mentor/NotificationsPage';
import { MentorProfilePage, MentorSettingsPage } from './pages/mentor/ProfileAndSettingsPage';
import { ProjectDetailPage } from './pages/mentor/ProjectDetailPage';
import { ProjectsPage } from './pages/mentor/ProjectsPage';
import { ReportsPage } from './pages/mentor/ReportsPage';
import { StageEvaluationDetailPage } from './pages/mentor/StageEvaluationDetailPage';
import { StageEvaluationsPage } from './pages/mentor/StageEvaluationsPage';
import { TaskDetailPage } from './pages/mentor/TaskDetailPage';
import { TasksPage } from './pages/mentor/TasksPage';
import { TaskSubmissionsPage } from './pages/mentor/TaskSubmissionsPage';
import { PortalShellRoutePage, UnauthorizedPage } from './pages/shared/PortalShellRoutePage';

const MentorLayoutRoute: React.FC = () => (
  <MentorWorkspaceProvider>
    <MentorAppShell>
      <Outlet />
    </MentorAppShell>
  </MentorWorkspaceProvider>
);

const RootRedirect: React.FC = () => {
  const { profile, loading } = useAuth();
  if (loading) return null;
  return <Navigate to={profile ? getRoleDashboardPath(profile.role) : '/login'} replace />;
};

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<RootRedirect />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />

            {/* Admin Portal Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/admin/dashboard" element={<PortalShellRoutePage portalRole="ADMIN" />} />
              <Route path="/admin/*" element={<PortalShellRoutePage portalRole="ADMIN" />} />
            </Route>

            {/* Intern Portal Route Guard */}
            <Route element={<ProtectedRoute allowedRoles={['INTERN']} />}>
              <Route path="/intern/dashboard" element={<PortalShellRoutePage portalRole="INTERN" />} />
              <Route path="/intern/*" element={<PortalShellRoutePage portalRole="INTERN" />} />
            </Route>

            {/* Mentor Portal Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={['MENTOR']} />}>
              <Route path="/mentor" element={<MentorLayoutRoute />}>
                <Route index element={<Navigate to="dashboard" replace />} />
                <Route path="dashboard" element={<MentorDashboardPage />} />
                <Route path="interns" element={<MyInternsPage />} />
                <Route path="interns/:id" element={<InternProfilePage />} />
                <Route path="performance" element={<InternPerformancePage />} />
                <Route path="tasks" element={<TasksPage />} />
                <Route path="tasks/:id" element={<TaskDetailPage />} />
                <Route path="submissions" element={<TaskSubmissionsPage />} />
                <Route path="monthly-reports" element={<MonthlyReportsPage />} />
                <Route path="monthly-reports/:id" element={<MonthlyReportDetailPage />} />
                <Route path="launchpad" element={<LaunchpadOverviewPage />} />
                <Route path="baseline" element={<BaselineAssessmentsPage />} />
                <Route path="evaluations" element={<StageEvaluationsPage />} />
                <Route path="evaluations/:id" element={<StageEvaluationDetailPage />} />
                <Route path="projects" element={<ProjectsPage />} />
                <Route path="projects/:id" element={<ProjectDetailPage />} />
                <Route path="certifications" element={<CertificationsPage />} />
                <Route path="improvement-plans" element={<ImprovementPlansPage />} />
                <Route path="feedback" element={<FeedbackPage />} />
                <Route path="notifications" element={<NotificationsPage />} />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="profile" element={<MentorProfilePage />} />
                <Route path="settings" element={<MentorSettingsPage />} />
              </Route>
            </Route>

            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </AuthProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

export default App;

