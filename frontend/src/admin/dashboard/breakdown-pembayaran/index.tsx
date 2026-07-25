// src/admin/dashboard/breakdown-pembayaran/index.tsx
import React, { useState, useEffect } from 'react';
import { AlertCircle, TrendingUp, CreditCard, Wallet, Landmark } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, type PieLabel } from 'recharts';
import LoadingSpinner from '../../../components/LoadingSpinner'; // Adjust path as needed
import { API_URL } from '../../../config/api';
import { getStoredToken } from '../../../auth/storage';
const API_KEY = import.meta.env.VITE_API_KEY;
interface PaymentBreakdown {
  [key: string]: number;
}

// Komponen Detail Pembayaran Terpisah
interface PaymentDetailTableProps {
  data: Array<{
    name: string;
    value: number;
    percentage: number;
  }>;
  colors: string[];
  total: number;
  formatRupiah: (amount: number) => string;
  getPaymentIcon: (method: string) => React.ReactNode;
}

const PaymentDetailTable: React.FC<PaymentDetailTableProps> = ({ 
  data, 
  colors, 
  formatRupiah, 
  getPaymentIcon 
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border">
      <h2 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4">Detail Pembayaran</h2>

      {/* ===== CARD LIST — tampil di mobile & tablet ===== */}
      <div className="md:hidden space-y-2">
        {data.map((item, index) => (
          <div 
            key={item.name} 
            className="flex items-center justify-between p-3 rounded-lg border border-gray-100 bg-gray-50"
          >
            <div className="flex items-center min-w-0">
              <div 
                className="w-3 h-3 rounded-full mr-3 flex-shrink-0" 
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <div className="flex items-center min-w-0">
                {getPaymentIcon(item.name)}
                <span className="ml-2 text-sm font-medium text-gray-900 truncate">{item.name}</span>
              </div>
            </div>
            <div className="text-right flex-shrink-0 ml-2">
              <div className="text-sm font-semibold text-gray-900">{formatRupiah(item.value)}</div>
              <div className="text-xs text-gray-500">{item.percentage.toFixed(1)}%</div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== TABEL — tampil dari md ke atas ===== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Metode Pembayaran
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jumlah
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Persentase
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item, index) => (
              <tr key={item.name}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-3" 
                      style={{ backgroundColor: colors[index % colors.length] }}
                    ></div>
                    <div className="flex items-center">
                      {getPaymentIcon(item.name)}
                      <span className="ml-2 text-sm font-medium text-gray-900">{item.name}</span>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                  {formatRupiah(item.value)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {item.percentage.toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const BreakdownPembayaran: React.FC = () => {
  const [data, setData] = useState<PaymentBreakdown | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [daftarBulan, setDaftarBulan] = useState<Array<{ id: string; nama_bulan: string; bulan: number; tahun: number }>>([]);
  const [selectedBulan, setSelectedBulan] = useState<string>('');
  const [loadingBulan, setLoadingBulan] = useState<boolean>(true);

  const getAuthHeaders = (): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };

  useEffect(() => {
    const fetchDaftarBulan = async () => {
      try {
        setLoadingBulan(true);
        const resp = await fetch(`${API_URL}/api/admin/laporan/bulan`, {
          headers: getAuthHeaders(),
        });
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        const json = await resp.json();
        setDaftarBulan(json.daftar_bulan || []);
        if (json.daftar_bulan && json.daftar_bulan.length > 0) setSelectedBulan(json.daftar_bulan[0].id);
      } catch (e) {
        console.error('Gagal mengambil daftar bulan:', e);
      } finally {
        setLoadingBulan(false);
      }
    };

    fetchDaftarBulan();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // compute start/end from selectedBulan
        let startDate = '';
        let endDate = '';
        if (selectedBulan) {
          const bulanObj = daftarBulan.find(b => b.id === selectedBulan);
          if (bulanObj) {
            const yyyy = String(bulanObj.tahun);
            const mm = String(bulanObj.bulan).padStart(2, '0');
            startDate = `${yyyy}-${mm}-01`;
            const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
            endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
          }
        }

        // fallback to current month if not selected
        if (!startDate || !endDate) {
          const now = new Date();
          const yyyy = now.getFullYear();
          const mm = String(now.getMonth() + 1).padStart(2, '0');
          startDate = `${yyyy}-${mm}-01`;
          const lastDay = new Date(yyyy, Number(mm), 0).getDate();
          endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
        }

        const resp = await fetch(`${API_URL}/api/admin/laporan/rekap-metode?start=${startDate}&end=${endDate}`, {
          headers: getAuthHeaders(),
        });
        if (!resp.ok) throw new Error(`HTTP error! status: ${resp.status}`);
        const json = await resp.json();

        // json.rekap is array of { metode, total }
        const map: PaymentBreakdown = {};
        (json.rekap || []).forEach((it: { metode?: string; _id?: string; total?: number | string }) => {
          map[it.metode || it._id || 'Unknown'] = Number(it.total || 0);
        });

        setData(map);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data');
      } finally {
        setLoading(false);
      }
    };

    // only fetch when daftarBulan loaded
    if (!loadingBulan) fetchData();
  }, [selectedBulan, loadingBulan, daftarBulan]);

  const handleBulanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBulan(e.target.value);
  };

  // Fungsi untuk mengelompokkan metode pembayaran yang serupa
  const groupPaymentMethods = (payments: PaymentBreakdown): PaymentBreakdown => {
    const grouped: PaymentBreakdown = {};
    
    Object.entries(payments).forEach(([method, amount]) => {
      const normalizedMethod = method.toLowerCase();
      
      if (normalizedMethod.includes('virtual account') || normalizedMethod.includes('va')) {
        grouped['Virtual Account'] = (grouped['Virtual Account'] || 0) + amount;
      } else if (normalizedMethod.includes('e-wallet') || normalizedMethod.includes('ewallet')) {
        grouped['E-Wallet'] = (grouped['E-Wallet'] || 0) + amount;
      } else if (normalizedMethod.includes('tunai') || normalizedMethod.includes('cash')) {
        grouped['Tunai'] = (grouped['Tunai'] || 0) + amount;
      } else if (normalizedMethod.includes('kartu kredit') || normalizedMethod.includes('credit')) {
        grouped['Kartu Kredit'] = (grouped['Kartu Kredit'] || 0) + amount;
      } else {
        grouped[method] = (grouped[method] || 0) + amount;
      }
    });
    
    return grouped;
  };

  // Format angka ke Rupiah
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Hitung total semua pembayaran
  const calculateTotal = (payments: PaymentBreakdown): number => {
    return Object.values(payments).reduce((total, amount) => total + amount, 0);
  };

  // Dapatkan icon berdasarkan metode pembayaran
  const getPaymentIcon = (method: string): React.ReactNode => {
    if (method.includes('Virtual Account')) return <Landmark className="h-5 w-5 text-blue-500 flex-shrink-0" />;
    if (method.includes('E-Wallet')) return <Wallet className="h-5 w-5 text-green-500 flex-shrink-0" />;
    if (method.includes('Tunai')) return <TrendingUp className="h-5 w-5 text-yellow-500 flex-shrink-0" />;
    if (method.includes('Kartu Kredit')) return <CreditCard className="h-5 w-5 text-purple-500 flex-shrink-0" />;
    return <CreditCard className="h-5 w-5 text-gray-500 flex-shrink-0" />;
  };

  // Warna untuk setiap metode pembayaran
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

  // Header + filter bulan, dipakai berulang di semua state (loading/error/empty/normal)
  const HeaderFilter = () => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Breakdown Pembayaran</h1>
        <p className="text-sm sm:text-base text-gray-600">Analisis metode pembayaran yang digunakan</p>
      </div>
      <div className="sm:ml-auto">
        <label className="text-xs sm:text-sm text-gray-700 mr-2">Pilih Bulan:</label>
        <select 
          value={selectedBulan} 
          onChange={handleBulanChange} 
          className="px-3 py-2 border rounded-md text-sm w-full sm:w-auto mt-1 sm:mt-0"
        >
          {daftarBulan.map(b => (
            <option key={b.id} value={b.id}>{b.nama_bulan}</option>
          ))}
        </select>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        <HeaderFilter />
        <div className="flex justify-center items-center h-64 sm:h-96">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        <HeaderFilter />
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
            <div className="text-red-700">
              <p className="font-medium text-sm sm:text-base">Error</p>
              <p className="text-xs sm:text-sm">Gagal memuat data: {error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
        <HeaderFilter />
        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm sm:text-base text-blue-700">Tidak ada data pembayaran yang tersedia.</p>
        </div>
      </div>
    );
  }

  const groupedData = groupPaymentMethods(data);
  const total = calculateTotal(groupedData);
  
  // Siapkan data untuk pie chart
  const pieData = Object.entries(groupedData).map(([name, value]) => ({
    name,
    value,
    percentage: total > 0 ? (value / total) * 100 : 0
  }));

  // Custom label renderer untuk pie chart — hanya persentase, dibuat singkat biar tidak tabrakan di layar sempit
  const renderLabel: PieLabel = (props) => {
    const { percent } = props as unknown as { name: string; percent: number };
    const percentage = percent * 100;
    return `${percentage.toFixed(0)}%`;
  };

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <HeaderFilter />
      
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border">
        <h2 className="text-base sm:text-xl font-semibold text-gray-800">
          Total Pembayaran: <span className="block sm:inline">{formatRupiah(total)}</span>
        </h2>
      </div>
      
      {/* Pie Chart */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border">
        <h2 className="text-base sm:text-xl font-semibold text-gray-800 mb-4">Distribusi Pembayaran</h2>
        <div className="h-64 sm:h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius="70%"
                fill="#8884d8"
                dataKey="value"
                label={renderLabel}
              >
                {pieData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatRupiah(Number(value))} />
              <Legend 
                wrapperStyle={{ fontSize: '12px' }}
                formatter={(value) => value}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Detail Pembayaran sebagai komponen terpisah */}
      <PaymentDetailTable 
        data={pieData}
        colors={COLORS}
        total={total}
        formatRupiah={formatRupiah}
        getPaymentIcon={getPaymentIcon}
      />
    </div>
  );
};

export default BreakdownPembayaran;