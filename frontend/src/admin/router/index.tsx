// src/admin/AdminRouter.tsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from '../layout';
import AdminDashboard from '../dashboard/dashboard';
import BreakdownPembayaran from '../dashboard/breakdown-pembayaran';
import StatusPesanan from '../dashboard/status-pesanan';
import TopBarang from '../dashboard/top-barang';
import Transaksi from '../dashboard/transaksi';
import InputPenjualan from '../dashboard/input-penjualan'; // Tambahkan import ini
import ModalBahanBaku from '../biaya/modal-bahanbaku/'; 
import StokBarangAdmin from '../stok-barang';
import StatusPesananAdmin from '../status-pesanan';
import Admin404 from '../notif/404notfound';
import ProcessMemasak from '../process-memasak';
import type { Barang } from '../stok-barang';

interface AdminRouterProps {
  dataBarang: Barang[];
  setDataBarang: React.Dispatch<React.SetStateAction<Barang[]>>;
}

const AdminRouter: React.FC<AdminRouterProps> = ({ dataBarang, setDataBarang }) => {
  return (
    <AdminLayout>
      <Routes>
        {/* Dashboard Routes */}
        <Route path="dashboard">
          <Route index element={<AdminDashboard />} />
          <Route path="status-pesanan" element={<StatusPesanan />} />
          <Route path="top-barang" element={<TopBarang />} />
          <Route path="breakdown-pembayaran" element={<BreakdownPembayaran />} />
          <Route path="transaksi" element={<Transaksi />} />
          <Route path="input-penjualan" element={<InputPenjualan />} /> {/* Tambahkan route ini */}
        </Route>
        
        {/* Stok Barang Route */}
        <Route path="stok-barang" element={<StokBarangAdmin dataBarang={dataBarang} setDataBarang={setDataBarang} />} />
        
        {/* Process Memasak Route */}
        <Route path="process-memasak" element={<ProcessMemasak />} />
        
        {/* Modal Bahan Baku Route */}
        <Route path="modal-bahanbaku" element={<ModalBahanBaku />} />
        
        {/* Status Pesanan Route */}
        <Route path="status-pesanan" element={<StatusPesananAdmin />} />
        
        {/* 404 Route */}
        <Route path="*" element={<Admin404 />} />
        
        {/* Default route - redirect ke dashboard */}
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </AdminLayout>
  );
};

export default AdminRouter;