import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, AlertCircle } from 'lucide-react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

interface DashboardStats {
  omzet?: {
    hari_ini: number;
    minggu_ini: number;
    bulan_ini: number;
  };
  userCount?: number;
  modalUtama?: number;
  transactionCount?: number;
}

const API_KEY = import.meta.env.VITE_API_KEY;

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = getStoredToken();
        if (!token) {
          setError('Token tidak ditemukan');
          setLoading(false);
          return;
        }

        // Fetch omzet data
        const omzetRes = await fetch(`${API_URL}/api/super-admin/dashboard/omzet`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { "x-api-key": API_KEY } : {}),
          },
        });

        if (omzetRes.ok) {
          const omzetData = await omzetRes.json();
          setStats(prev => ({ ...prev, omzet: omzetData.omzet }));
        }

        // Fetch users count
        const usersRes = await fetch(`${API_URL}/api/super-admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { "x-api-key": API_KEY } : {}),
          },
        });

        if (usersRes.ok) {
          const usersData = await usersRes.json();
          setStats(prev => ({ ...prev, userCount: Array.isArray(usersData) ? usersData.length : 0 }));
        }

        // Fetch modal utama
        const modalRes = await fetch(`${API_URL}/api/super-admin/modal-utama`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { "x-api-key": API_KEY } : {}),
          },
        });

        if (modalRes.ok) {
          const modalData = await modalRes.json();
          setStats(prev => ({ ...prev, modalUtama: modalData.total_modal || 0 }));
        }

        setLoading(false);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Gagal mengambil data dashboard');
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Super Admin Dashboard</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Omzet Hari Ini</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.omzet?.hari_ini || 0)}
              </p>
            </div>
            <DollarSign className="text-green-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Total Users</p>
              <p className="text-2xl font-bold text-gray-900">{stats.userCount || 0}</p>
            </div>
            <Users className="text-blue-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Modal Utama</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.modalUtama || 0)}
              </p>
            </div>
            <DollarSign className="text-purple-500" size={32} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Omzet Bulan Ini</p>
              <p className="text-2xl font-bold text-gray-900">
                {formatCurrency(stats.omzet?.bulan_ini || 0)}
              </p>
            </div>
            <TrendingUp className="text-orange-500" size={32} />
          </div>
        </div>
      </div>

      {/* Welcome Message */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg shadow p-8 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome to Super Admin Portal</h2>
        <p className="opacity-90">Anda memiliki akses penuh untuk mengelola biaya, user management, dan konfigurasi sistem.</p>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Ringkasan Pendapatan</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-green-50 rounded-lg">
            <p className="text-gray-600 text-sm">Minggu Ini</p>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.omzet?.minggu_ini || 0)}
            </p>
          </div>
          <div className="p-4 bg-blue-50 rounded-lg">
            <p className="text-gray-600 text-sm">Bulan Ini</p>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.omzet?.bulan_ini || 0)}
            </p>
          </div>
          <div className="p-4 bg-orange-50 rounded-lg">
            <p className="text-gray-600 text-sm">Hari Ini</p>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.omzet?.hari_ini || 0)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
