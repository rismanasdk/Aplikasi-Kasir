import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';

const resolveDashboardPath = (roleCode?: string | null): string | null => {
  const normalized = (roleCode || '').toLowerCase();
  if (normalized === 'admin') return '/admin/dashboard';
  if (normalized === 'super-admin' || normalized === 'super_admin') return '/super-admin/dashboard';
  if (normalized === 'manajer' || normalized === 'manager') return '/meneger/dashboard';
  if (normalized === 'kasir') return '/kasir/dashboard';
  if (normalized === 'chef') return '/chef/bahan-baku';
  if (normalized === 'security') return '/security/dashboard';
  return null;
};

interface AuthOnlyRouteProps {
  children: React.ReactNode;
}

const AuthOnlyRoute: React.FC<AuthOnlyRouteProps> = ({ children }) => {
  const auth = useAuth();
  const location = useLocation();

  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (auth.user) {
    const roleCode = (auth.role?.code || auth.user?.role || '').toLowerCase();
    const redirectPath = resolveDashboardPath(roleCode);

    const isAuthPage = location.pathname === '/login' || location.pathname === '/register';
    if (isAuthPage && redirectPath && redirectPath !== location.pathname) {
      return <Navigate to={redirectPath} replace />;
    }
  }

  return <>{children}</>;
};

export default AuthOnlyRoute;