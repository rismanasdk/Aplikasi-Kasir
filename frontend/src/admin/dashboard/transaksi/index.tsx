// src/admin/dashboard/transaksi/index.tsx
import React, { useState, useEffect } from 'react';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Landmark, Wallet, TrendingUp, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';

const ipbe = import.meta.env.VITE_IPBE;

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
  
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 8;

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        const [transaksiResponse, stokResponse] = await Promise.all([
          fetch(`${ipbe}/api/admin/riwayat`),
          fetch(`${ipbe}/api/admin/stok-barang`)
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
      case 'selesai': return '';
      case 'pending': return '⏳';
      case 'dibatalkan': return '';
      default: return '📄';
    }
  };

  const getPaymentIcon = (method: string): React.ReactNode => {
    if (method.toLowerCase().includes('virtual')) return <Landmark className="h-5 w-5 text-blue-500" />;
    if (method.toLowerCase().includes('e-wallet')) return <Wallet className="h-5 w-5 text-green-500" />;
    if (method.toLowerCase().includes('tunai')) return <TrendingUp className="h-5 w-5 text-yellow-500" />;
    if (method.toLowerCase().includes('kartu')) return <CreditCard className="h-5 w-5 text-purple-500" />;
    return <CreditCard className="h-5 w-5 text-gray-500" />;
  };

  const getRowColor = (index: number): string => {
    return index % 2 === 0 
      ? 'bg-white hover:bg-gray-50' 
      : 'bg-amber-50 hover:bg-amber-100';
  };

  const TransactionModal: React.FC<{ transaction: Transaksi; onClose: () => void }> = ({ transaction, onClose }) => {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-gray-800">Detail Transaksi</h2>
                <p className="text-gray-600 mt-1">{transaction.nomor_transaksi}</p>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white rounded-full transition-all duration-200 hover:scale-110"
              >
                <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Tanggal Transaksi</label>
                    <p className="text-sm text-gray-900 font-medium">{formatTanggal(transaction.tanggal_transaksi)}</p>
                  </div>
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Metode Pembayaran</label>
                    <div className="flex items-center gap-2">
                      {getPaymentIcon(transaction.metode_pembayaran)}
                      <p className="text-sm text-gray-900 font-medium">{transaction.metode_pembayaran}</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-white rounded-xl border border-gray-200 p-4">
                    <label className="block text-sm font-medium text-gray-500 mb-2">Status Transaksi</label>
                    <div className="flex items-center gap-2">
                      <span>{getStatusIcon(transaction.status)}</span>
                      <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                        {transaction.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl p-4">
                    <label className="block text-sm font-medium text-white mb-2">Total Pembayaran</label>
                    <p className="text-2xl font-bold text-white">{formatRupiah(transaction.total_harga)}</p>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
                  <span className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">📦</span>
                  Barang Dibeli ({transaction.barang_dibeli.length} items)
                </h3>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {transaction.barang_dibeli.map((item) => (
                    <div key={item._id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200 hover:bg-white transition-colors">
                      <div className="flex-shrink-0">
                        {item.gambar_url ? (
                          <img 
                            src={item.gambar_url} 
                            alt={item.nama_barang}
                            className="w-16 h-16 rounded-lg object-cover shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                              const parent = target.parentNode as HTMLElement;
                              const placeholder = document.createElement('div');
                              placeholder.className = 'w-16 h-16 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-sm';
                              placeholder.innerHTML = '<span class="text-xs text-gray-500">No Image</span>';
                              parent.appendChild(placeholder);
                            }}
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-sm">
                            <span className="text-xs text-gray-500">No Image</span>
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.nama_barang}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            Qty: {item.jumlah}
                          </span>
                          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                            {formatRupiah(item.harga_satuan)}/item
                          </span>
                          {item.kode_barang && (
                            <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                              Kode: {item.kode_barang}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-gray-900">{formatRupiah(item.subtotal)}</p>
                        <p className="text-xs text-gray-500 mt-1">Subtotal</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-gray-200 p-6 bg-gray-50">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-bold text-gray-800">Total Amount</span>
                <p className="text-sm text-gray-600 mt-1">Termasuk pajak dan biaya lainnya</p>
              </div>
              <span className="text-3xl font-bold text-blue-600">{formatRupiah(transaction.total_harga)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">⚠️</span>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Error Loading Data</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors text-sm font-medium"
                >
                  Coba Lagi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Transaksi
              </h1>
              <p className="text-gray-600 mt-2 text-lg">Monitor dan kelola semua transaksi toko</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-2">
                <span className="text-sm text-gray-500">Total: </span>
                <span className="font-semibold text-gray-900">{transaksi.length} Transaksi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Statistics Grid */}
        {/* <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">💰</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Total Pendapatan</p>
                <p className="text-2xl font-bold text-gray-900">{formatRupiah(0)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">📊</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Rata-rata Transaksi</p>
                <p className="text-2xl font-bold text-gray-900">{formatRupiah(0)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">✅</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Selesai</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                <span className="text-2xl">X</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">Dibatalkan</p>
                <p className="text-2xl font-bold text-gray-900">0</p>
              </div>
            </div>
          </div>
        </div> */}

        {/* Filter Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">Cari Transaksi</label>
              <input
                type="text"
                placeholder="Cari no. transaksi atau nama barang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="semua">Semua Status</option>
                <option value="selesai">Selesai</option>
                <option value="dibatalkan">dibatalkan</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Metode Bayar</label>
              <select
                value={filterMetode}
                onChange={(e) => setFilterMetode(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              >
                <option value="semua">Semua Metode</option>
                <option value="tunai">Tunai</option>
                <option value="virtual">Virtual Account</option>
                <option value="e-wallet">E-Wallet</option>
                <option value="kartu">Kartu Kredit/Debit</option>
              </select>
            </div>

            <div className="flex items-end">
              <button 
                onClick={() => {
                  setFilterStatus('semua');
                  setFilterMetode('semua');
                  setSearchTerm('');
                }}
                className="w-full px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
              >
                Reset Filter
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Transaksi
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Items
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Total
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Pembayaran
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">📭</span>
                        </div>
                        <div>
                          <p className="text-gray-900 font-medium">Tidak ada transaksi ditemukan</p>
                          <p className="text-gray-500 text-sm mt-1">Coba ubah filter atau kata kunci pencarian</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  currentItems.map((trans, index) => (
                    <tr 
                      key={trans._id} 
                      className={`transition-colors group ${getRowColor(index)}`}
                    >
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                            {trans.nomor_transaksi}
                          </div>
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                            <span>📅</span>
                            {new Date(trans.tanggal_transaksi).toLocaleDateString('id-ID')}
                          </div>
                          <div className="lg:hidden mt-2">
                            <div className="flex items-center gap-2 text-xs text-gray-600">
                              <span>🛒</span>
                              {trans.barang_dibeli.length} items • {trans.metode_pembayaran}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <div className="flex items-center gap-3">
                          <div className="flex -space-x-2">
                            {trans.barang_dibeli.slice(0, 4).map((item) => (
                              <div key={item._id} className="relative">
                                {item.gambar_url ? (
                                  <img 
                                    src={item.gambar_url} 
                                    alt={item.nama_barang}
                                    className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-sm"
                                    title={item.nama_barang}
                                  />
                                ) : (
                                  <div 
                                    className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center shadow-sm"
                                    title={item.nama_barang}
                                  >
                                    <span className="text-xs text-gray-500">📦</span>
                                  </div>
                                )}
                              </div>
                            ))}
                            {trans.barang_dibeli.length > 4 && (
                              <div 
                                className="w-8 h-8 rounded-full border-2 border-white bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium shadow-sm"
                                title={`${trans.barang_dibeli.length - 4} item lainnya`}
                              >
                                +{trans.barang_dibeli.length - 4}
                              </div>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {trans.barang_dibeli.length} items
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-bold text-gray-900">
                          {formatRupiah(trans.total_harga)}
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(trans.metode_pembayaran)}
                          <span className="text-sm text-gray-600">{trans.metode_pembayaran}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">{getStatusIcon(trans.status)}</span>
                          <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusColor(trans.status)}`}>
                            {trans.status.charAt(0).toUpperCase() + trans.status.slice(1)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setSelectedTransaction(trans)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all duration-200 font-medium text-sm group"
                        >
                          {/* <span>👁️</span> */}
                          <span className="hidden sm:inline">Detail</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
            <div className="text-sm text-gray-600">
              Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredTransaksi.length)}</span> dari{' '}
              <span className="font-semibold text-gray-900">{filteredTransaksi.length}</span> transaksi
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={prevPage}
                disabled={currentPage === 1}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  currentPage === 1 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
                }`}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Sebelumnya</span>
              </button>
              
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (currentPage <= 3) {
                    pageNum = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = currentPage - 2 + i;
                  }
                  
                  return (
                    <button
                      key={pageNum}
                      onClick={() => paginate(pageNum)}
                      className={`w-10 h-10 rounded-lg font-medium transition-all ${
                        currentPage === pageNum 
                          ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md scale-105' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={nextPage}
                disabled={currentPage === totalPages}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  currentPage === totalPages 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
                }`}
              >
                <span className="hidden sm:inline">Selanjutnya</span>
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Modal Detail */}
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