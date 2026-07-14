import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import SuperAdminLayout from '../layout';
import SuperAdminDashboard from '../pages/Dashboard';
import SuperAdminLaporanKeuangan from '../pages/LaporanKeuangan';
import SuperAdminModalUtama from '../pages/ModalUtama';
import SuperAdminBiayaLayanan from '../pages/BiayaLayanan';
import SuperAdminUsersPage from '../pages/Users';
import SuperAdminSettingsPage from '../pages/Settings';
import SuperAdminAsetTetap from '../pages/asset-tetap';
import SuperAdminLiabilitas from '../pages/liabilitas';
import SuperAdminNeraca from '../pages/neraca';
import SuperAdmin404 from '../pages/404notfound';
import SuperAdminDashboardAnalytics from '../pages/DashboardAnalytics';
import SuperAdminProducts from '../pages/products';
import SuperAdminBranchPage from '../pages/branch'
import SuperAdminPermissions from '../pages/permissions'
import BIDashboard from '../bi/BIDashboard';

const SuperAdminRouter: React.FC = () => {
  return (
    <SuperAdminLayout>
      <Routes>
        {/* Dashboard Route */}
        <Route path="dashboard" element={<SuperAdminDashboard />} />

        {/** Laporan Keuangan Route */}
        <Route path="dashboard-analytics" element={<SuperAdminDashboardAnalytics />} />

        {/** BI Dashboard Route */}
        <Route path="bi-dashboard" element={<BIDashboard />} />
        
        {/* Laporan Keuangan Route */}
        <Route path="laporan-keuangan" element={<SuperAdminLaporanKeuangan />} />

        {/* Products Route */}
        <Route path="products" element={<SuperAdminProducts />} />

        {/* Neraca Route */}
        <Route path="neraca" element={<SuperAdminNeraca />} />
        
        {/* Modal Utama Route */}
        <Route path="modal-utama" element={<SuperAdminModalUtama />} />
        
        {/* Biaya Layanan Route */}
        <Route path="biaya-layanan" element={<SuperAdminBiayaLayanan />} />

        {/* Aset Tetap Route */}
        <Route path="aset-tetap" element={<SuperAdminAsetTetap />} />

        {/* Liabilitas Route */}
        <Route path="liabilitas" element={<SuperAdminLiabilitas />} />

        {/* Cabang Restoran */}
        <Route path="cabang" element={<SuperAdminBranchPage />} />

        {/* Permission User */}
        <Route path="permissions" element={<SuperAdminPermissions />} />
        
        {/* Users Route */}
        <Route path="users" element={<SuperAdminUsersPage />} />
        
        {/* Settings Route */}
        <Route path="settings" element={<SuperAdminSettingsPage />} />
        
        {/* 404 Route */}
        <Route path="*" element={<SuperAdmin404 />} />
        
        {/* Default route - redirect ke dashboard */}
        <Route path="/" element={<Navigate to="/super-admin/dashboard" replace />} />
      </Routes>
    </SuperAdminLayout>
  );
};

export default SuperAdminRouter;
