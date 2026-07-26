// src/meneger/laporan/index.tsx
import { useState, useEffect, useCallback } from 'react';
import MenegerLayout from "../layout";
import LoadingSpinner from "../../components/LoadingSpinner";
import SummaryCards from './components/SummaryCards';
import TransactionChart from './components/TransactionChart';
import TransactionTable from './components/TransactionTable';
import { API_URL } from '../../config/api';
import { getAuthHeaders as getStoredAuthHeaders } from '../../auth/storage';

interface ProdukItem {
  nama_produk: string;
  jumlah_terjual: number;
  hpp_per_porsi: number;
  hpp_total: number;
  pendapatan: number;
  laba_kotor: number;
  _id: string;
}

interface LaporanData {
  _id: string;
  tanggal: string;
  produk: ProdukItem[];
  total_hpp: number;
  total_pendapatan: number;
  total_laba_kotor: number;
  total_beban: number;
  laba_bersih: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface FilterOptions {
  produk: string;
  sortBy: 'nama_produk' | 'jumlah_terjual' | 'pendapatan' | 'laba_kotor';
  sortOrder: 'asc' | 'desc';
  itemsPerPage: number;
}

const LaporanPage = () => {
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [daftarBulan, setDaftarBulan] = useState<Array<{ id: string; nama_bulan: string; bulan: number; tahun: number }>>([]);
  const [selectedBulan, setSelectedBulan] = useState<string>('');
  const [loadingBulan, setLoadingBulan] = useState<boolean>(true);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({
    produk: 'semua',
    sortBy: 'pendapatan', // Default sort by pendapatan
    sortOrder: 'desc',    // Default sort descending
    itemsPerPage: 10
  });

  // Fetch available months for filtering
  useEffect(() => {
    const fetchMonths = async () => {
      try {
        setLoadingBulan(true);
        const resp = await fetch(`${API_URL}/api/admin/laporan/bulan`, {
          headers: getStoredAuthHeaders(),
        });
        if (!resp.ok) throw new Error('Failed to fetch bulan');
        const json = await resp.json();
        const list = json?.daftar_bulan || [];
        setDaftarBulan(list);
        if (list.length > 0) setSelectedBulan(list[0].id);
      } catch (e) {
        console.warn('Gagal ambil daftar bulan', e);
      } finally {
        setLoadingBulan(false);
      }
    };
    fetchMonths();
  }, []);

  // Fetch ringkasan + detail for selected month and normalize to same shape as admin
  const fetchReport = useCallback(async (bulanId?: string) => {
    if (!bulanId) return;
    setLoading(true);
    setError(null);
    try {
      const bulanObj = daftarBulan.find(b => b.id === bulanId);
      let startDate: string;
      let endDate: string;
      if (bulanObj) {
        const yyyy = String(bulanObj.tahun);
        const mm = String(bulanObj.bulan).padStart(2, '0');
        startDate = `${yyyy}-${mm}-01`;
        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
        endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      } else {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        startDate = `${yyyy}-${mm}-01`;
        const lastDay = new Date(yyyy, Number(mm), 0).getDate();
        endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      }

      const ringkasanResp = await fetch(`${API_URL}/api/admin/laporan/ringkasan?start=${startDate}&end=${endDate}`, {
        headers: getStoredAuthHeaders(),
      });
      const ringkasanJson = ringkasanResp.ok ? await ringkasanResp.json() : null;

      const detailResp = await fetch(`${API_URL}/api/admin/laporan/detail-laba?start=${startDate}&end=${endDate}`, {
        headers: getStoredAuthHeaders(),
      });
      const detailJson = detailResp.ok ? await detailResp.json() : null;

      const summary = ringkasanJson?.ringkasan || {};

      // Aggregate produk across days into monthly produk list
      const produkMap: Record<string, ProdukItem> = {};
      const detailData = detailJson?.data || [];
      if (Array.isArray(detailData)) {
        detailData.forEach((day: { produk?: ProdukItem[] }) => {
          if (!Array.isArray(day.produk)) return;
          day.produk.forEach((p: ProdukItem) => {
            const key = String(p.nama_produk).toLowerCase().trim();
            if (!produkMap[key]) {
              produkMap[key] = {
                _id: p._id || key,
                nama_produk: p.nama_produk,
                jumlah_terjual: Number(p.jumlah_terjual || 0),
                hpp_per_porsi: Number(p.hpp_per_porsi || 0),
                hpp_total: Number(p.hpp_total || 0),
                pendapatan: Number(p.pendapatan || 0),
                laba_kotor: Number(p.laba_kotor || 0),
              };
            } else {
              produkMap[key].jumlah_terjual += Number(p.jumlah_terjual || 0);
              produkMap[key].hpp_total += Number(p.hpp_total || 0);
              produkMap[key].pendapatan += Number(p.pendapatan || 0);
              produkMap[key].laba_kotor += Number(p.laba_kotor || 0);
            }
          });
        });
      }

      const produkList = Object.values(produkMap);

      const laporanForUI: LaporanData = {
        _id: bulanId,
        tanggal: `${startDate} to ${endDate}`,
        produk: produkList,
        total_hpp: Number(summary.total_hpp || 0),
        total_pendapatan: Number(summary.total_pendapatan || 0),
        total_laba_kotor: Number(summary.total_laba_kotor || 0),
        total_beban: Number(summary.total_biaya_operasional || summary.total_beban || 0),
        laba_bersih: Number(summary.total_laba_bersih || 0),
        createdAt: '',
        updatedAt: '',
        __v: 0
      };

      setData(laporanForUI);
      // Fetch riwayat once to preserve existing side effect path.
      try {
        const trxResp = await fetch(`${API_URL}/api/manager/riwayat`, {
          headers: getStoredAuthHeaders(),
        });
        if (trxResp.ok) {
          await trxResp.json();
        }
      } catch (e) {
        console.warn('Gagal ambil total transaksi:', e);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal mengambil data laporan');
    } finally {
      setLoading(false);
    }
  }, [daftarBulan]);

  useEffect(() => {
    if (selectedBulan) fetchReport(selectedBulan);
  }, [selectedBulan, fetchReport]);

  const products = data?.produk?.map(item => item.nama_produk) || [];
  const uniqueProducts = ['semua', ...new Set(products)];

  const tableData = (data?.produk?.map((produk) => {
    return {
      id: produk._id,
      nama_produk: produk.nama_produk,
      jumlah_terjual: produk.jumlah_terjual,
      hpp_per_porsi: produk.hpp_per_porsi,
      pendapatan: produk.pendapatan,
      laba_kotor: produk.laba_kotor,
      tanggal: data?.tanggal || 'Tanggal tidak tersedia'
    };
  }) || [])
  .filter(item => 
    filterOptions.produk === 'semua' || 
    item.nama_produk === filterOptions.produk
  )
  .sort((a, b) => {
    const modifier = filterOptions.sortOrder === 'asc' ? 1 : -1;
    
    switch (filterOptions.sortBy) {
      case 'nama_produk':
        return a.nama_produk.localeCompare(b.nama_produk) * modifier;
      case 'jumlah_terjual':
        return (a.jumlah_terjual - b.jumlah_terjual) * modifier;
      case 'pendapatan':
        return (a.pendapatan - b.pendapatan) * modifier;
      case 'laba_kotor':
        return (a.laba_kotor - b.laba_kotor) * modifier;
      default:
        return 0;
    }
  });

  const handleFilterChange = (key: keyof FilterOptions, value: string | number) => {
    setFilterOptions(prev => ({
      ...prev,
      [key]: value
    }));
  };

  if (loading) {
    return (
      <MenegerLayout>
        <LoadingSpinner />
      </MenegerLayout>
    );
  }

  if (error) {
    return (
      <MenegerLayout>
        <div className="p-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
            <button 
              className="mt-2 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-4 rounded"
              onClick={() => window.location.reload()}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </MenegerLayout>
    );
  }

  return (
    <MenegerLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Laporan HPP dan Laba</h1>
          <p className="text-sm text-gray-600 mt-1">Analisis pendapatan, HPP, dan laba kotor per periode.</p>
        </div>
        
        {/* FILTER BAR - Semua kontrol filter dipindahkan ke sini */}
        <div className="bg-gray-50 p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            {/* Periode Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Periode</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={selectedBulan}
                onChange={(e) => setSelectedBulan(e.target.value)}
                disabled={loadingBulan}
              >
                {loadingBulan ? <option>Memuat...</option> : (
                  daftarBulan.map(b => (
                    <option key={b.id} value={b.id}>{b.nama_bulan}</option>
                  ))
                )}
              </select>
            </div>

            {/* Produk Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Filter Produk</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={filterOptions.produk}
                onChange={(e) => handleFilterChange('produk', e.target.value)}
              >
                <option value="semua">Semua Produk</option>
                {uniqueProducts.filter(p => p !== 'semua').map((product) => (
                  <option key={product} value={product}>
                    {product}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urutkan</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={filterOptions.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value as FilterOptions['sortBy'])}
              >
                <option value="pendapatan">Pendapatan</option>
                <option value="laba_kotor">Laba Kotor</option>
                <option value="jumlah_terjual">Jumlah Terjual</option>
                <option value="nama_produk">Nama Produk</option>
              </select>
            </div>
            
            {/* Sort Order Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Urutan</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={filterOptions.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value as FilterOptions['sortOrder'])}
              >
                <option value="desc">Terbesar ke Terkecil</option>
                <option value="asc">Terkecil ke Terbesar</option>
              </select>
            </div>

            {/* Items Per Page Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data per Halaman</label>
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white"
                value={filterOptions.itemsPerPage}
                onChange={(e) => handleFilterChange('itemsPerPage', parseInt(e.target.value))}
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
          </div>
        </div>

        {/* Summary Cards - sekarang memanfaatkan lebar penuh */}
        <div className="mb-6">
          <SummaryCards 
            totalLaba={data?.laba_bersih || 0}
            totalPendapatan={data?.total_pendapatan || 0}
            totalBeban={data?.total_beban || 0}
            totalLabaKotor={data?.total_laba_kotor || 0}
            periode={data?.tanggal || ''}
          />
        </div>

        <TransactionChart 
          produk={data?.produk || []}
        />

        <TransactionTable tableData={tableData} itemsPerPage={filterOptions.itemsPerPage} />
      </div>
    </MenegerLayout>
  );
};

export default LaporanPage;
