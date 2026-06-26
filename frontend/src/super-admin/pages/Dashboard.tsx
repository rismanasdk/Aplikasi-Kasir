import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, AlertCircle, Shield, ClipboardList, ChefHat, ShoppingCart, Eye } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
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

// ✅ Interface baru untuk role stats
interface RoleStats {
  role: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  borderColor: string;
  active: number;
  nonactive: number;
  total: number;
}

const API_KEY = import.meta.env.VITE_API_KEY;

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({});
  const [roleStats, setRoleStats] = useState<RoleStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [roleLoading, setRoleLoading] = useState(true);
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

  // ✅ Fetch data role stats
  useEffect(() => {
    const fetchRoleStats = async () => {
      try {
        const token = getStoredToken();
        if (!token) return;

        const res = await fetch(`${API_URL}/api/super-admin/users`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { "x-api-key": API_KEY } : {}),
          },
        });

        if (!res.ok) return;

        const usersData = await res.json();
        
        // Definisi role yang ingin ditampilkan
        const roleConfig = [
          { role: 'admin', label: 'Admin', icon: <Shield size={20} />, color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
          { role: 'manajer', label: 'Manager', icon: <ClipboardList size={20} />, color: 'text-blue-600', bgColor: 'bg-blue-50', borderColor: 'border-blue-200' },
          { role: 'kasir', label: 'Kasir', icon: <ShoppingCart size={20} />, color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
          { role: 'chef', label: 'Chef', icon: <ChefHat size={20} />, color: 'text-orange-600', bgColor: 'bg-orange-50', borderColor: 'border-orange-200' },
          { role: 'security', label: 'Security', icon: <Eye size={20} />, color: 'text-purple-600', bgColor: 'bg-purple-50', borderColor: 'border-purple-200' },
        ];

        // Hitung active dan nonactive per role
        const processedStats: RoleStats[] = roleConfig.map(config => {
          const usersInRole = Array.isArray(usersData) 
            ? usersData.filter((user: { role?: string; status?: string }) => user.role === config.role)
            : [];

          const active = usersInRole.filter((user: { status?: string }) => user.status === 'active' || user.status === 'aktif').length;
          const nonactive = usersInRole.filter((user: { status?: string }) => user.status === 'nonactive' || user.status === 'nonaktif' || user.status === 'inactive').length;

          return {
            ...config,
            active,
            nonactive,
            total: usersInRole.length,
          };
        });

        setRoleStats(processedStats);
      } catch (err) {
        console.error('Error fetching role stats:', err);
      } finally {
        setRoleLoading(false);
      }
    };

    fetchRoleStats();
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
          <LoadingSpinner />
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

      {/* ✅ CONTAINER BARU: Status User per Role */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Status User per Role</h3>
            <p className="text-sm text-gray-500 mt-1">Jumlah user aktif dan nonaktif berdasarkan role</p>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <span className="text-gray-600">Active</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-300"></div>
              <span className="text-gray-600">Nonactive</span>
            </div>
          </div>
        </div>

        {roleLoading ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner/>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {roleStats.map((role) => (
              <div
                key={role.role}
                className={`rounded-xl border-2 ${role.borderColor} ${role.bgColor} p-5 transition-all hover:shadow-md`}
              >
                {/* Header */}
                <div className={`flex items-center gap-3 mb-4 ${role.color}`}>
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    {role.icon}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{role.label}</h4>
                    <p className="text-xs text-gray-500">{role.total} user</p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden flex">
                    {role.total > 0 ? (
                      <>
                        <div
                          className="bg-green-500 h-full transition-all duration-500"
                          style={{ width: `${(role.active / role.total) * 100}%` }}
                        ></div>
                        <div
                          className="bg-gray-300 h-full transition-all duration-500"
                          style={{ width: `${(role.nonactive / role.total) * 100}%` }}
                        ></div>
                      </>
                    ) : (
                      <div className="bg-gray-200 h-full w-full"></div>
                    )}
                  </div>
                </div>

                {/* Stats */}
                <div className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-gray-600">Active:</span>
                    <span className="font-semibold text-green-700">{role.active}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                    <span className="text-gray-600">Off:</span>
                    <span className="font-semibold text-gray-600">{role.nonactive}</span>
                  </div>
                </div>

                {/* Empty state */}
                {role.total === 0 && (
                  <p className="text-center text-xs text-gray-400 mt-3 italic">
                    Belum ada user
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Summary Row */}
        {!roleLoading && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="flex flex-wrap justify-between items-center gap-4 text-sm">
              <div className="flex items-center gap-6">
                <span className="text-gray-500">Total Semua Role:</span>
                <span className="font-bold text-gray-900">{roleStats.reduce((sum, r) => sum + r.total, 0)} user</span>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Active:</span>
                  <span className="font-bold text-green-600">{roleStats.reduce((sum, r) => sum + r.active, 0)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">Nonactive:</span>
                  <span className="font-bold text-gray-500">{roleStats.reduce((sum, r) => sum + r.nonactive, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;