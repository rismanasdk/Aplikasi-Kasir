import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './hooks/useAuth';
import PublicHome from '../pages/PublicHome';
import type { Barang } from '../admin/stok-barang';

interface DashboardRedirectProps {
  dataBarang: Barang[];
}

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

const DashboardRedirect: React.FC<DashboardRedirectProps> = ({ dataBarang }) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const lastRedirectTarget = useRef<string | null>(null);

  useEffect(() => {
    if (!auth.isLoading && auth.user) {
      const roleCode = (auth.role?.code || auth.user?.role || '').toLowerCase();
      const target = resolveDashboardPath(roleCode);

      if (target && window.location.pathname !== target && lastRedirectTarget.current !== target) {
        lastRedirectTarget.current = target;
        navigate(target, { replace: true });
      }
    }
  }, [auth.user, auth.isLoading, auth.role?.code, auth.user?.role, navigate]);
  if (auth.isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  const currentRole = auth.role?.code || auth.user?.role;
  if (!auth.user || currentRole === 'user' || !resolveDashboardPath(currentRole)) {
    return <PublicHome dataBarang={dataBarang} />;
  }

  return null;
};

export default DashboardRedirect;
