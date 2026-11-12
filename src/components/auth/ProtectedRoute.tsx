import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { getRoleDashboardPath, useAuth } from '../../contexts/AuthContext';
import type { UserRole } from '../../types/database';
import { LoadingPage } from '../ui/States';

interface ProtectedRouteProps {
  allowedRoles: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ allowedRoles }) => {
  const { session, profile, loading, isConfigured } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <LoadingPage message="Verifying authenticated session and role..." />
      </div>
    );
  }

  if (!isConfigured || !session || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!allowedRoles.includes(profile.role)) {
    return <Navigate to={getRoleDashboardPath(profile.role)} replace />;
  }

  return <Outlet />;
};

