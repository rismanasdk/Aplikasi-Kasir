// src/admin/dashboard/transaksi/index.tsx
import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Landmark, Wallet, TrendingUp, CreditCard, ChevronLeft, ChevronRight, Eye, ChevronDown } from 'lucide-react';
import { API_URL } from '../../../config/api';
import { getStoredToken } from '../../../auth/storage';
const API_KEY = import.meta.env.VITE_API_KEY;

// ... (Interface tetap sama, tidak diubah)
interface StokBarang {
  _id: string;
  kode_barang: string;
  nama_barang: string;
  gambar_url: string;
}

interface BarangDibeli {
  kode_barang?: string;
  nama_barang: string;
  jumlah: number;
  harga_satuan: number;
  harga_beli?: number;
  subtotal: number;
  _id: string;
  gambar_url?: string;
}

interface Transaksi {
  _id: string;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  barang_dibeli: BarangDibeli[];
  total_harga: number;
  metode_pembayaran: string;
  status: 'selesai' | 'dibatalkan';
  kasir_id?: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

const Transaksi: React.FC = () => {
  const [transaksi, setTransaksi] = useState<Transaksi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('semua');
  const [filterMetode, setFilterMetode] = useState<string>('semua');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTransaction, setSelectedTransaction] = useState<Transaksi | null>(null);
  
  // STATE BARU UNTUK EXPAND CARD DI MOBILE
  const [expandedCardId, setExpandedCardId] = useState<string | null>(null);
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

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
    const fetchData = async () => {
      try {
        setLoading(true);
        const headers = getAuthHeaders();
        
        const [transaksiResponse, stokResponse] = await Promise.all([
          fetch(`${API_URL}/api/admin/riwayat`, { headers }),
          fetch(`${API_URL}/api/admin/stok-barang`, { headers })
        ]);
        
        if (!transaksiResponse.ok || !stokResponse.ok) {
          throw new Error('Gagal mengambil data');
        }
        
        const transaksiData: Transaksi[] = await transaksiResponse.json();
        const stokData: StokBarang[] = await stokResponse.json();
        
        const transaksiWithGambar = transaksiData.map(trans => ({
          ...trans,
          barang_dibeli: trans.barang_dibeli.map(barang => {
            const stok = stokData.find(item => item.kode_barang === barang.kode_barang);
            return {
              ...barang,
              gambar_url: stok?.gambar_url
            };
          })
        }));
        
        setTransaksi(transaksiWithGambar);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterMetode, searchTerm]);

  const filteredTransaksi = transaksi.filter(trans => {
    const matchesStatus = filterStatus === 'semua' || trans.status === filterStatus;
    const matchesMetode = filterMetode === 'semua' || trans.metode_pembayaran.toLowerCase().includes(filterMetode.toLowerCase());
    const matchesSearch = trans.nomor_transaksi.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         trans.barang_dibeli.some(item => 
                           item.nama_barang.toLowerCase().includes(searchTerm.toLowerCase())
                         );
    
    return matchesStatus && matchesMetode && matchesSearch;
  });

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTransaksi.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredTransaksi.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const formatRupiah = (amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatTanggal = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'selesai': return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'pending': return 'bg-amber-50 text-amber-700 border border-amber-200';
      case 'dibatalkan': return 'bg-red-50 text-red-700 border border-red-200';
      default: return 'bg-gray-50 text-gray-700 border border-gray-200';
    }
  };

  const getStatusIcon = (status: string): string => {
    switch (status) {
      case 'selesai': return '✅';
      case 'pending': return '⏳';
      case 'dibatalkan': return '❌';
      default: return '📄';
    }
  };

  const getPaymentIcon = (method: string): React.ReactNode => {
    if (method.toLowerCase().includes('virtual')) return <Landmark className="h-4 w-4 sm:h-5 sm:w-5 text-blue-500" />;
    if (method.toLowerCase().includes('e-wallet')) return <Wallet className="h-4 w-4 sm:h-5 sm:w-5 text-green-500" />;
    if (method.toLowerCase().includes('tunai')) return <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-yellow-500" />;
    if (method.toLowerCase().includes('kartu')) return <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-purple-500" />;
    return <CreditCard className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />;
  };

  const getRowColor = (index: number): string => {
    return index % 2 === 0 
      ? 'bg-white hover:bg-gray-50' 
      : 'bg-amber-50 hover:bg-amber-100';
  };

  // Modal hanya digunakan untuk DESKTOP
  const TransactionModal: React.FC<{ transaction: Transaksi; onClose: () => void }> = ({ transaction, onClose }) => {
    return (
      <div className="hidden lg:flex fixed inset-0 bg-black bg-opacity-50 items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Detail Transaksi</h2>
                <p className="text-gray-600 mt-1 text-sm">{transaction.nomor_transaksi}</p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-white rounded-full transition-all duration-200 hover:scale-110">
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Tanggal</label>
                <p className="text-sm text-gray-900 font-medium">{formatTanggal(transaction.tanggal_transaksi)}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Metode</label>
                <div className="flex items-center gap-2">
                  {getPaymentIcon(transaction.metode_pembayaran)}
                  <p className="text-sm text-gray-900 font-medium">{transaction.metode_pembayaran}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                <span className={`px-3 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1 ${getStatusColor(transaction.status)}`}>
                  <span className="text-xs">{getStatusIcon(transaction.status)}</span>
                  {transaction.status.toUpperCase()}
                </span>
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4">
                <label className="block text-xs font-medium text-white mb-1">Total</label>
                <p className="text-2xl font-bold text-white">{formatRupiah(transaction.total_harga)}</p>
              </div>
            </div>

            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-sm">📦</span>
              Barang Dibeli ({transaction.barang_dibeli.length} items)
            </h3>
            <div className="space-y-3">
              {transaction.barang_dibeli.map((item) => (
                <div key={item._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="flex-shrink-0">
                    {item.gambar_url ? (
                      <img src={item.gambar_url} alt={item.nama_barang} className="w-16 h-16 rounded-lg object-cover shadow-sm" onError={(e) => { const target = e.target as HTMLImageElement; target.onerror = null; target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='64' height='64'%3E%3Crect width='100%25' height='100%25' fill='%23e5e7eb'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%236b7280'%3ENo Image%3C/text%3E%3C/svg%3E"; }} />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-xs text-gray-500">No Img</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.nama_barang}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Qty: {item.jumlah}</span>
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">{formatRupiah(item.harga_satuan)}</span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-lg font-bold text-gray-900">{formatRupiah(item.subtotal)}</p>
                    <p className="text-xs text-gray-500">Subtotal</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center"><span className="text-xl">⚠️</span></div>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Error</h3>
              <p className="text-red-600 mt-1 text-sm">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium">Coba Lagi</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header & Filter (Tetap) */}
        {/* ... Saya singkat bagian ini agar tidak terlalu panjang, sama persis seperti kode sebelumnya ... */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl font-bold text-gray-800">Riwayat Transaksi</h1>
            <div className="w-full sm:w-auto bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-2 text-center sm:text-left">
              <span className="text-sm text-gray-500">Total: </span>
              <span className="font-semibold text-gray-900">{transaksi.length} Transaksi</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6 mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="sm:col-span-2 lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cari Transaksi</label>
              <input type="text" placeholder="No. transaksi / barang..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="semua">Semua Status</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">Dibatalkan</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metode Bayar</label>
              <select value={filterMetode} onChange={(e) => setFilterMetode(e.target.value)} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm">
                <option value="semua">Semua Metode</option>
                <option value="tunai">Tunai</option>
                <option value="virtual">Virtual Account</option>
                <option value="e-wallet">E-Wallet</option>
                <option value="kartu">Kartu Kredit/Debit</option>
              </select>
            </div>
            <div className="flex items-end">
              <button onClick={() => { setFilterStatus('semua'); setFilterMetode('semua'); setSearchTerm(''); }} className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-medium text-sm">Reset Filter</button>
            </div>
          </div>
        </div>

        {/* ==================== DESKTOP VIEW (Tabel + Modal) ==================== */}
        <div className="hidden lg:block bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Transaksi</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Items</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Total</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Pembayaran</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Status</th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {currentItems.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-500">Tidak ada data ditemukan</td></tr>
              ) : (
                currentItems.map((trans, index) => (
                  <tr key={trans._id} className={`transition-colors ${getRowColor(index)}`}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{trans.nomor_transaksi}</div>
                      <div className="text-xs text-gray-500 mt-1">📅 {new Date(trans.tanggal_transaksi).toLocaleDateString('id-ID')}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex -space-x-2">
                          {trans.barang_dibeli.slice(0, 3).map((item) => (
                            item.gambar_url ? <img key={item._id} src={item.gambar_url} className="w-8 h-8 rounded-full border-2 border-white object-cover" /> : <div key={item._id} className="w-8 h-8 rounded-full border-2 border-white bg-gray-200 flex items-center justify-center text-xs">📦</div>
                          ))}
                        </div>
                        <span className="text-sm text-gray-600">{trans.barang_dibeli.length} items</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-gray-900">{formatRupiah(trans.total_harga)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        {getPaymentIcon(trans.metode_pembayaran)}
                        {trans.metode_pembayaran}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full inline-flex items-center gap-1 ${getStatusColor(trans.status)}`}>
                        {getStatusIcon(trans.status)} {trans.status.charAt(0).toUpperCase() + trans.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => setSelectedTransaction(trans)} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 text-sm font-medium">
                        <Eye size={16} /> Detail
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ==================== MOBILE VIEW (Expandable Card) ==================== */}
        <div className="lg:hidden space-y-3 mb-8">
          {currentItems.length === 0 ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center text-gray-500">
              <p className="font-medium">Tidak ada transaksi ditemukan</p>
            </div>
          ) : (
            currentItems.map((trans, index) => (
              <div 
                key={trans._id} 
                className={`border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
                  expandedCardId === trans._id ? 'bg-white border-blue-300 shadow-md' : (index % 2 === 0 ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200')
                }`}
              >
                {/* Bagian Utama Kartu (Selalu Terlihat) */}
                <div 
                  className="p-4 cursor-pointer flex justify-between items-center"
                  onClick={() => setExpandedCardId(expandedCardId === trans._id ? null : trans._id)}
                >
                  <div className="flex-1 min-w-0 mr-3">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-bold text-gray-900 truncate">{trans.nomor_transaksi}</h3>
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full flex-shrink-0 ${getStatusColor(trans.status)}`}>
                        {trans.status.charAt(0).toUpperCase() + trans.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">📅 {new Date(trans.tanggal_transaksi).toLocaleDateString('id-ID')}</p>
                    <p className="text-base font-bold text-gray-900 mt-1">{formatRupiah(trans.total_harga)}</p>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      {getPaymentIcon(trans.metode_pembayaran)}
                      <span className="max-w-[80px] truncate">{trans.metode_pembayaran}</span>
                    </div>
                    {/* Ikon Panah untuk menandakan bisa di-expand */}
                    <ChevronDown size={20} className={`text-gray-400 transition-transform duration-300 ${expandedCardId === trans._id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Bagian Expanded (Muncul saat diklik) */}
                <div className={`overflow-hidden transition-all duration-300 ${expandedCardId === trans._id ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}>
                  <div className="px-4 pb-4 border-t border-gray-100 pt-3">
                    <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">
                      Detail Barang ({trans.barang_dibeli.length} items)
                    </h4>
                    <div className="space-y-2">
                      {trans.barang_dibeli.map((item) => (
                        <div key={item._id} className="flex justify-between items-center text-sm bg-gray-50 rounded-lg p-2.5 border border-gray-100">
                          <div className="flex items-center gap-2 min-w-0">
                            {item.gambar_url ? (
                              <img src={item.gambar_url} alt={item.nama_barang} className="w-8 h-8 rounded-md object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 rounded-md bg-gray-200 flex items-center justify-center flex-shrink-0 text-[10px]">📦</div>
                            )}
                            <div className="min-w-0">
                              <p className="font-medium text-gray-800 truncate text-xs sm:text-sm">{item.nama_barang}</p>
                              <p className="text-[10px] text-gray-500">{item.jumlah} x {formatRupiah(item.harga_satuan)}</p>
                            </div>
                          </div>
                          <p className="font-semibold text-gray-900 text-xs sm:text-sm flex-shrink-0 ml-2">{formatRupiah(item.subtotal)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Pagination (Tetap) */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="text-sm text-gray-600 text-center sm:text-left">
              Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTransaksi.length)}</span> dari <span className="font-semibold text-gray-900">{filteredTransaksi.length}</span> transaksi
            </div>
            <div className="flex items-center gap-2">
              <button onClick={prevPage} disabled={currentPage === 1} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
                <ChevronLeft className="h-4 w-4" /><span className="hidden sm:inline">Sebelumnya</span>
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) pageNum = i + 1;
                  else if (currentPage <= 3) pageNum = i + 1;
                  else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                  else pageNum = currentPage - 2 + i;
                  return (
                    <button key={pageNum} onClick={() => paginate(pageNum)} className={`w-10 h-10 rounded-lg font-medium transition-all ${currentPage === pageNum ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md scale-105' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              <button onClick={nextPage} disabled={currentPage === totalPages} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-orange-50 text-orange-600 hover:bg-orange-100'}`}>
                <span className="hidden sm:inline">Selanjutnya</span><ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Hanya Muncul Untuk Desktop */}
        {selectedTransaction && (
          <TransactionModal 
            transaction={selectedTransaction} 
            onClose={() => setSelectedTransaction(null)} 
          />
        )}
      </div>
    </div>
  );
};

export default Transaksi;