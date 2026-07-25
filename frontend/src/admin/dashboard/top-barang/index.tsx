import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Crown, Medal, Award, Star, TrendingUp, Package, DollarSign, BarChart3, PieChart } from 'lucide-react';
import { API_URL } from '../../../config/api';
import { getStoredToken } from '../../../auth/storage';
import { logPageView } from '../../../utils/logpageview';
const API_KEY = import.meta.env.VITE_API_KEY;

// Interface untuk produk dari API
interface ProdukApi {
  nama_produk: string;
  jumlah_terjual: number;
  hpp_per_porsi: number;
  hpp_total: number;
  pendapatan: number;
  laba_kotor: number;
  _id: string;
  harga_jual?: number;
}

// (Removed unused ApiResponse type)

// Tambahkan interface untuk produk item
interface ProdukItem {
  _id: string;
  kode_barang: string;
  nama_barang: string;
  kategori: string;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  stok_minimal: number;
  gambar_url: string;
  status: string;
  hargaFinal?: number;
}

const TopBarang: React.FC = () => {
  const [data, setData] = useState<ProdukApi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [produkList, setProdukList] = useState<ProdukItem[]>([]); // State untuk produk list
  const [loadingProduk, setLoadingProduk] = useState<boolean>(true); // State untuk loading produk
  const [totalPenjualan, setTotalPenjualan] = useState<number>(0); // State untuk total penjualan
  const [totalPendapatan, setTotalPendapatan] = useState<number>(0); // State untuk total pendapatan dari API
  const [selectedProduct, setSelectedProduct] = useState<ProdukApi | null>(null); // State untuk produk yang dipilih

  useEffect(() => {
    logPageView('Top-Barang', window.location.href);
  }, []);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  }, []);

  const authFetch = useCallback((url: string, init?: RequestInit) => {
    const headers = getAuthHeaders();
    return fetch(url, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers || {}),
      },
    });
  }, [getAuthHeaders]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Fetch top-barang from dashboard endpoint (server-side aggregation)
        const endpoint = `${API_URL}/api/admin/dashboard/top-barang`;

        const response = await authFetch(endpoint);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const raw = await response.json();

        // Normalize server response: { barang_terlaris: [...] } or top_barang
        const list = (raw && (raw.barang_terlaris || raw.top_barang))
          ? (raw.barang_terlaris || raw.top_barang)
          : (Array.isArray(raw) ? raw : []);

        // safe number parser
        const safeNumber = (v: unknown): number => {
          if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
          if (typeof v === 'string') {
            const n = parseFloat(v);
            return Number.isFinite(n) ? n : 0;
          }
          return 0;
        };

        // Map server items to ProdukApi-compatible shape (avoid `any` by using unknown)
        const items = Array.isArray(list) ? (list as unknown[]) : [];
        const mapped: ProdukApi[] = items.map((raw) => {
          const item = raw as Record<string, unknown>;
          const getStr = (k: string) => (typeof item[k] === 'string' ? (item[k] as string) : '');
          const id = getStr('_id') || getStr('nama_barang') || getStr('nama_produk') || String(getStr('nama')).replace(/\s+/g, '-').toLowerCase() || '';
          const jumlahVal = safeNumber(item['jumlah']);
          const jumlahTerjualVal = safeNumber(item['jumlah_terjual']);

          return {
            _id: id,
            nama_produk: getStr('nama_barang') || getStr('nama_produk') || getStr('nama') || 'Unknown',
            jumlah_terjual: jumlahVal || jumlahTerjualVal || 0,
            hpp_per_porsi: safeNumber(item['hpp_per_porsi'] ?? item['hpp_per_porsi']),
            hpp_total: safeNumber(item['hpp_total'] ?? item['hpp_total']),
            pendapatan: safeNumber(item['pendapatan'] ?? item['subtotal'] ?? 0),
            laba_kotor: safeNumber(item['laba_kotor'] ?? 0),
            harga_jual: safeNumber(item['harga_jual'] ?? item['harga_final'] ?? item['harga_satuan'] ?? 0),
          };
        });

        // Sort by pendapatan desc and take top 5
        const sortedProduk = mapped.sort((a, b) => safeNumber(b.pendapatan) - safeNumber(a.pendapatan));
        const top5Produk = sortedProduk.slice(0, 5);
        setData(top5Produk);
        if (top5Produk.length > 0) setSelectedProduct(top5Produk[0]);

        // Notify backend to update Best Seller category for current top-5
        try {
          authFetch(`${API_URL}/api/admin/dashboard/update-best-seller`, {
            method: 'POST'
          }).then(async (resp) => {
            if (!resp.ok) {
              const txt = await resp.text().catch(() => '');
              console.warn('update-best-seller failed', resp.status, txt);
            }
          }).catch((e) => console.warn('update-best-seller error', e));
        } catch (e) {
          console.warn('failed to call update-best-seller', e);
        }

        // totals
        const totalPendapatanBulan = mapped.reduce((s, p) => s + safeNumber(p.pendapatan), 0);
        setTotalPendapatan(totalPendapatanBulan);
        const totalJual = mapped.reduce((s, p) => s + (Number.isFinite(p.jumlah_terjual) ? p.jumlah_terjual : 0), 0);
        setTotalPenjualan(totalJual);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [authFetch]);

  // Fetch data produk untuk mendapatkan gambar
  useEffect(() => {
    const fetchProdukList = async () => {
      try {
        setLoadingProduk(true);
        const response = await authFetch(`${API_URL}/api/admin/stok-barang`);
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result: ProdukItem[] = await response.json();
        setProdukList(result);
      } catch (err) {
        console.error('Error fetching produk list:', err);
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data produk');
      } finally {
        setLoadingProduk(false);
      }
    };

    fetchProdukList();
  }, [authFetch]);

  // Format angka
  const formatAngka = (num: number): string => {
    return new Intl.NumberFormat('id-ID').format(num);
  };

  // Format Rupiah
  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Komponen Progress Bar
  const ProgressBar: React.FC<{ percentage: number; color: string }> = ({ percentage, color }) => {
    return (
      <div className="w-full bg-gray-200 rounded-full h-2.5 sm:h-3">
        <div 
          className={`h-2.5 sm:h-3 rounded-full ${color}`}
          style={{ width: `${percentage}%` }}
        ></div>
      </div>
    );
  };

  // Warna untuk progress bar
  const getProgressColor = (index: number): string => {
    const colors = [
      'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 
      'bg-purple-500', 'bg-pink-500', 'bg-indigo-500',
      'bg-red-500', 'bg-teal-500', 'bg-orange-500'
    ];
    return colors[index % colors.length];
  };

  // Fungsi untuk mendapatkan ikon peringkat
  const getRankingIcon = (index: number) => {
    switch(index) {
      case 0:
        return <Crown className="h-5 w-5 sm:h-6 sm:w-6 text-yellow-500" />;
      case 1:
        return <Medal className="h-5 w-5 sm:h-6 sm:w-6 text-gray-400" />;
      case 2:
        return <Award className="h-5 w-5 sm:h-6 sm:w-6 text-amber-700" />;
      default:
        return <Star className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />;
    }
  };

  // Fungsi untuk mendapatkan gambar produk
  const getProdukImage = (namaBarang: string) => {
    const produk = produkList.find(p => p.nama_barang === namaBarang);
    return produk ? produk.gambar_url : null;
  };

  // Fungsi untuk mendapatkan kategori produk
  const getProdukKategori = (namaBarang: string) => {
    const produk = produkList.find(p => p.nama_barang === namaBarang);
    return produk ? produk.kategori : 'Tidak diketahui';
  };

  // Fungsi untuk mendapatkan harga jual produk
  const getProdukHargaJual = (namaBarang: string) => {
    const produk = produkList.find(p => p.nama_barang === namaBarang);
    return produk ? produk.harga_jual : 0;
  };

  if (loading || loadingProduk) {
    return (
      <div className="p-3 sm:p-6">
        <div className="flex justify-center items-center h-64 sm:h-96">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-3 sm:p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-700">
              <p className="font-medium text-sm sm:text-base">Error</p>
              <p className="text-xs sm:text-sm">Gagal memuat data: {error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-800">Top 5 Barang Terlaris</h1>
        <p className="text-sm sm:text-base text-gray-600">Analisis produk paling populer berdasarkan pendapatan</p>
      </div>

      {/* Statistik Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Total Barang Terjual</h3>
          <p className="text-xl sm:text-2xl font-bold text-blue-600">{formatAngka(totalPenjualan)}</p>
          <p className="text-xs text-gray-500 mt-1">Periode: Bulan Ini</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Jenis Barang</h3>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{data.length}</p>
          <p className="text-xs text-gray-500 mt-1">Periode: Bulan Ini</p>
        </div>
        <div className="bg-white p-3 sm:p-4 rounded-lg shadow">
          <h3 className="text-xs sm:text-sm font-medium text-gray-500">Total Pendapatan</h3>
          <p className="text-xl sm:text-2xl font-bold text-purple-600">
            {formatRupiah(totalPendapatan)}
          </p>
          <p className="text-xs text-gray-500 mt-1">Periode: Bulan Ini</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Daftar Barang Terlaris - Diperluas ke kanan */}
        <div className="bg-white rounded-lg shadow lg:col-span-2">
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-800">Ranking 5 Barang Terlaris</h2>
            <p className="text-xs sm:text-sm text-gray-500">Berdasarkan pendapatan tertinggi</p>
          </div>
          <div className="p-4 sm:p-6">
            {data.length === 0 ? (
              <p className="text-gray-500 text-center text-sm">Tidak ada data barang untuk periode ini</p>
            ) : (
              <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
                {/* Kolom Kiri - Daftar Ranking */}
                <div className="lg:w-1/2">
                  <div className="space-y-3 sm:space-y-4">
                    {data.map((barang, index) => {
                      const totalPendapatanProduk = data.reduce((sum, item) => sum + item.pendapatan, 0);
                      const percentage = totalPendapatanProduk > 0 ? (barang.pendapatan / totalPendapatanProduk) * 100 : 0;
                      const color = getProgressColor(index);
                      const gambarUrl = getProdukImage(barang.nama_produk);
                      const isSelected = selectedProduct?._id === barang._id;
                      
                      return (
                        <div 
                              key={barang._id || `${barang.nama_produk}-${index}`} 
                          className={`flex items-center p-2.5 sm:p-3 rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-blue-50 border border-blue-200' : 'hover:bg-gray-50'
                          }`}
                          onClick={() => setSelectedProduct(barang)}
                        >
                          <div className="mr-2 sm:mr-3 flex-shrink-0">
                            {getRankingIcon(index)}
                          </div>
                          {gambarUrl ? (
                            <img 
                              src={gambarUrl} 
                              alt={barang.nama_produk}
                              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full object-cover mr-2 sm:mr-3 flex-shrink-0"
                            />
                          ) : (
                            <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-gray-200 flex items-center justify-center mr-2 sm:mr-3 flex-shrink-0">
                              <span className="text-[9px] sm:text-xs text-gray-500">No Img</span>
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col sm:flex-row sm:items-center mb-1">
                              <span className="text-xs sm:text-sm font-medium text-gray-900 sm:mr-2 truncate">
                                {barang.nama_produk}
                              </span>
                              <span className="text-xs text-gray-500 whitespace-nowrap">
                                ({formatAngka(barang.jumlah_terjual)} terjual)
                              </span>
                            </div>
                            <ProgressBar percentage={percentage} color={color} />
                          </div>
                          <div className="ml-2 sm:ml-4 text-right flex-shrink-0">
                            <span className="text-xs sm:text-sm font-medium text-gray-900 block">
                              {formatRupiah(barang.pendapatan)}
                            </span>
                            <div className="text-xs text-gray-500">
                              {percentage.toFixed(1)}%
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
                
                {/* Kolom Kanan - Detail Produk Terpilih */}
                <div className="lg:w-1/2">
                  {selectedProduct ? (
                    <div className="bg-gray-50 rounded-lg p-4 sm:p-5 border border-gray-200">
                      <div className="flex items-start mb-4">
                        {getProdukImage(selectedProduct.nama_produk) ? (
                          <img 
                            src={getProdukImage(selectedProduct.nama_produk) || ''} 
                            alt={selectedProduct.nama_produk}
                            className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg object-cover mr-3 sm:mr-4 flex-shrink-0"
                          />
                        ) : (
                          <div className="h-12 w-12 sm:h-16 sm:w-16 rounded-lg bg-gray-200 flex items-center justify-center mr-3 sm:mr-4 flex-shrink-0">
                            <span className="text-xs text-gray-500">No Img</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{selectedProduct.nama_produk}</h3>
                          <p className="text-xs sm:text-sm text-gray-500">Kategori: {getProdukKategori(selectedProduct.nama_produk)}</p>
                          <div className="flex items-center mt-1">
                            {getRankingIcon(data.findIndex(p => p._id === selectedProduct._id))}
                            <span className="ml-2 text-xs sm:text-sm font-medium text-gray-700">
                              Peringkat #{data.findIndex(p => p._id === selectedProduct._id) + 1}
                            </span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-4">
                        <div className="bg-white p-2.5 sm:p-3 rounded-lg shadow-sm">
                          <div className="flex items-center text-blue-600 mb-1">
                            <Package className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span className="text-[11px] sm:text-xs font-medium">Jumlah Terjual</span>
                          </div>
                          <p className="text-sm sm:text-lg font-bold text-gray-900">{formatAngka(selectedProduct.jumlah_terjual)} unit</p>
                        </div>
                        <div className="bg-white p-2.5 sm:p-3 rounded-lg shadow-sm">
                          <div className="flex items-center text-purple-600 mb-1">
                            <DollarSign className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span className="text-[11px] sm:text-xs font-medium">Harga Jual</span>
                          </div>
                          <p className="text-sm sm:text-lg font-bold text-gray-900">
                            {formatRupiah(selectedProduct.harga_jual ?? getProdukHargaJual(selectedProduct.nama_produk))}
                          </p>
                        </div>
                        <div className="bg-white p-2.5 sm:p-3 rounded-lg shadow-sm">
                          <div className="flex items-center text-green-600 mb-1">
                            <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span className="text-[11px] sm:text-xs font-medium">Pendapatan</span>
                          </div>
                          <p className="text-sm sm:text-lg font-bold text-gray-900">
                            {formatRupiah(selectedProduct.pendapatan)}
                          </p>
                        </div>
                        <div className={`bg-white p-2.5 sm:p-3 rounded-lg shadow-sm ${
                          selectedProduct.laba_kotor >= 0 ? 'border-l-4 border-green-500' : 'border-l-4 border-red-500'
                        }`}>
                          <div className={`flex items-center mb-1 ${
                            selectedProduct.laba_kotor >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            <BarChart3 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                            <span className="text-[11px] sm:text-xs font-medium">Laba Kotor</span>
                          </div>
                          <p className={`text-sm sm:text-lg font-bold ${
                            selectedProduct.laba_kotor >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {formatRupiah(selectedProduct.laba_kotor)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm mb-4">
                        <h4 className="text-xs sm:text-sm font-medium text-gray-700 mb-2">Analisis HPP</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-gray-600">HPP per Porsi</span>
                            <span className="font-medium">{formatRupiah(selectedProduct.hpp_per_porsi)}</span>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-gray-600">Total HPP</span>
                            <span className="font-medium">{formatRupiah(selectedProduct.hpp_total)}</span>
                          </div>
                          <div className="flex justify-between text-xs sm:text-sm">
                            <span className="text-gray-600">Margin</span>
                            <span className={`font-medium ${
                              selectedProduct.laba_kotor >= 0 ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {selectedProduct.pendapatan > 0 
                                ? `${((selectedProduct.laba_kotor / selectedProduct.pendapatan) * 100).toFixed(1)}%` 
                                : '0%'}
                            </span>
                          </div>
                        </div>
                      </div>

                    </div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6 sm:p-8 text-center border border-gray-200">
                      <PieChart className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm sm:text-base text-gray-500">Pilih produk untuk melihat detail analisis</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detail 5 Barang Terlaris */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mt-4 sm:mt-6">
        <div className="p-4 sm:p-6 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-gray-800">Detail 5 Barang Terlaris</h2>
          <p className="text-xs sm:text-sm text-gray-500">Berdasarkan pendapatan tertinggi</p>
        </div>

        {/* ===== CARD LIST — tampil di mobile & tablet ===== */}
        <div className="md:hidden p-4 space-y-3">
          {data.map((barang, index) => {
            const gambarUrl = getProdukImage(barang.nama_produk);
            return (
              <div
                key={barang._id || `${barang.nama_produk}-${index}`}
                className={`rounded-lg p-3 border border-gray-200 ${
                  index % 2 === 0 ? 'bg-white' : 'bg-amber-50'
                }`}
              >
                <div className="flex items-center mb-3">
                  <div className="mr-3 flex-shrink-0">
                    {getRankingIcon(index)}
                  </div>
                  {gambarUrl ? (
                    <img 
                      src={gambarUrl} 
                      alt={barang.nama_produk}
                      className="h-10 w-10 rounded-full object-cover mr-3 flex-shrink-0"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center mr-3 flex-shrink-0">
                      <span className="text-[9px] text-gray-500">No Img</span>
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{barang.nama_produk}</div>
                    <div className="text-xs text-gray-500">{formatAngka(barang.jumlah_terjual)} unit terjual</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Pendapatan</div>
                    <div className="font-medium text-gray-900">{formatRupiah(barang.pendapatan)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Laba Kotor</div>
                    <div className={`font-medium ${barang.laba_kotor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatRupiah(barang.laba_kotor)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ===== TABEL — tampil dari md ke atas ===== */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Peringkat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Gambar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nama Barang
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Jumlah Terjual
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pendapatan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Laba Kotor
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((barang, index) => {                 
                const gambarUrl = getProdukImage(barang.nama_produk);
                
                return (
                  <tr 
                    key={barang._id || `${barang.nama_produk}-${index}`} 
                    className={`transition-colors hover:bg-gray-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-amber-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {getRankingIcon(index)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex justify-center">
                        {gambarUrl ? (
                          <img 
                            src={gambarUrl} 
                            alt={barang.nama_produk}
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-xs text-gray-500">No Img</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {barang.nama_produk}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {formatAngka(barang.jumlah_terjual)} unit
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatRupiah(barang.pendapatan)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${barang.laba_kotor >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatRupiah(barang.laba_kotor)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TopBarang;