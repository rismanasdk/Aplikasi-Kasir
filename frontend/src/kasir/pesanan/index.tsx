import { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import MainLayout from "../layout";
import { getSocket } from "../../utils/socket";
import LoadingSpinner from "../../components/LoadingSpinner";
import { Landmark, Wallet, TrendingUp, CreditCard, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from "lucide-react";
import { API_URL } from '../../config/api';
const ApiKey = import.meta.env.VITE_API_KEY;

interface BarangDibeli {
  kode_barang?: string;
  nama_barang?: string;
  jumlah?: number;
  harga_satuan?: number;
  harga_beli?: number;
  subtotal?: number;
  _id?: string;
}

interface PesananItem {
  _id: string;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  barang_dibeli: BarangDibeli[];
  total_harga: number;
  metode_pembayaran: string;
  status: string;
  kasir_id: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface LocationState {
  transaksiTerbaru?: PesananItem;
  message?: string;
}

interface StatusUpdateData {
  _id: string;
  status: string;
  updatedAt: string;
}

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

const PesananKasirPage = () => {
  const [pesananList, setPesananList] = useState<PesananItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [kasirId, setKasirId] = useState<string | null>(null);
  const [loadingKasir, setLoadingKasir] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // State untuk pagination - DIUBAH MENJADI 10 DATA PER HALAMAN
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10); // DIUBAH DARI 8 MENJADI 10
  const [totalItems, setTotalItems] = useState(0);
  
  // State untuk produk list
  const [produkList, setProdukList] = useState<ProdukItem[]>([]);
  const [loadingProduk, setLoadingProduk] = useState(true);

  // State untuk expanded items
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const location = useLocation();
  const locationState = location.state as LocationState | null;

  // Toggle expanded state untuk barang dibeli
  const toggleExpand = (pesananId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(pesananId)) {
        newSet.delete(pesananId);
      } else {
        newSet.add(pesananId);
      }
      return newSet;
    });
  };

  // Fetch kasir ID dari localStorage atau API
  useEffect(() => {
    const fetchKasirId = async () => {
      try {
        const storedKasirId = localStorage.getItem('kasirId');
        
        if (storedKasirId) {
          setKasirId(storedKasirId);
        } else {
          const storedUser = localStorage.getItem('user');
          if (!storedUser) {
            throw new Error('Data user tidak ditemukan. Silakan login kembali.');
          }
          const currentUser = JSON.parse(storedUser) as { _id?: string; id?: string };
          const resolvedKasirId = currentUser._id || currentUser.id;
          if (!resolvedKasirId) {
            throw new Error('ID kasir tidak ditemukan pada sesi login.');
          }
          setKasirId(resolvedKasirId);
          localStorage.setItem('kasirId', resolvedKasirId);
        }
      } catch (err) {
        console.error("Gagal ambil data kasir:", err);
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data kasir');
      } finally {
        setLoadingKasir(false);
      }
    };

    fetchKasirId();
  }, []);

  // Fetch data produk untuk mendapatkan gambar
  useEffect(() => {
    const fetchProdukList = async () => {
      try {
        setLoadingProduk(true);
        const response = await fetch(`${API_URL}/api/barang`);
        
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
  }, []);

  // Fetch data pesanan berdasarkan kasir ID dengan pagination
  const fetchPesanan = useCallback(async () => {
    if (!kasirId) return;
    
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token tidak ditemukan. Silakan login kembali.');
      }

      // PERBAIKAN: Menggunakan page parameter instead of offset
      const url = `${API_URL}/api/transaksi?kasir_id=${kasirId}&page=${currentPage}&limit=${itemsPerPage}&sort=-tanggal_transaksi`;
      const headers = {
        'Authorization': `Bearer ${token}`,
        'x-api-key': ApiKey || ''
      };

      console.debug('Fetching transaksi', { url, headers: { Authorization: !!token, 'x-api-key': !!headers['x-api-key'] } });

      try {
        const res = await fetch(url, { headers });

        if (res.ok) {
          const data = await res.json();
          // PERBAIKAN: Menyesuaikan dengan struktur response dari backend
          const dataArray: PesananItem[] = Array.isArray(data.data) ? data.data : [];
          
          // MEMASTIKAN DATA TERBARU DI PALING ATAS
          dataArray.sort((a: PesananItem, b: PesananItem) => {
            const dateA = new Date(a.tanggal_transaksi).getTime();
            const dateB = new Date(b.tanggal_transaksi).getTime();
            return dateB - dateA; // DESCENDING (terbaru dulu)
          });
          
          setPesananList(dataArray);
          
          // PERBAIKAN: Menggunakan totalData dari response backend
          if (data.totalData) {
            setTotalItems(data.totalData);
          } else {
            setTotalItems(dataArray.length);
          }
        } else {
          let body = null;
          try { body = await res.text(); } catch { /* ignore */ }
          throw new Error(`Gagal mengambil data pesanan: ${res.status} ${res.statusText} ${body ? '- ' + body : ''}`);
        }
      } catch (fetchErr) {
        console.error('Fetch transaksi failed detailed:', fetchErr);
        throw fetchErr;
      }
    } catch (err) {
      console.error("Gagal ambil pesanan:", err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data pesanan');
    } finally {
      setLoading(false);
    }
  }, [kasirId, currentPage, itemsPerPage]);

  useEffect(() => {
    if (kasirId) {
      fetchPesanan();
      
      const socket = getSocket();

      const handleStatusUpdated = (data: StatusUpdateData) => {
        setPesananList(prev =>
          prev.map(p =>
            p._id === data._id ? { ...p, status: data.status, updatedAt: data.updatedAt } : p
          )
        );
      };

      const handleNewTransaction = (data: PesananItem) => {
        if (data.kasir_id === kasirId) {
          setPesananList(prev => {
            const exists = prev.some(item => item._id === data._id);
            
            if (exists) {
              return prev.map(item => 
                item._id === data._id ? { ...item, ...data } : item
              );
            } else {
              // MENAMBAHKAN DATA BARU DI PALING ATAS
              return [data, ...prev];
            }
          });
        }
      };

      socket.on("statusUpdated", handleStatusUpdated);
      socket.on("newTransaction", handleNewTransaction);

      return () => {
        socket.off("statusUpdated", handleStatusUpdated);
        socket.off("newTransaction", handleNewTransaction);
      };
    }
  }, [kasirId, fetchPesanan]);

  useEffect(() => {
    if (locationState?.transaksiTerbaru && kasirId) {
      if (locationState.transaksiTerbaru.kasir_id === kasirId) {
        setPesananList(prev => {
          const exists = prev.some(p => p._id === locationState.transaksiTerbaru?._id);
          
          if (exists) {
            return prev.map(item => 
              item._id === locationState.transaksiTerbaru?._id 
                ? { ...item, ...locationState.transaksiTerbaru! } 
                : item
            );
          } else {
            // MENAMBAHKAN TRANSAKSI TERBARU DI PALING ATAS
            return [locationState.transaksiTerbaru!, ...prev];
          }
        });
      }
    }
  }, [locationState, kasirId]);

  useEffect(() => {
    setCurrentPage(1);
  }, [kasirId]);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  const nextPage = () => {
    if (currentPage < Math.ceil(totalItems / itemsPerPage)) {
      setCurrentPage(currentPage + 1);
    }
  };
  
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const formatTanggal = (dateString: string) =>
    new Date(dateString).toLocaleString("id-ID", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800 border border-yellow-200";
      case "selesai":
        return "bg-green-100 text-green-800 border border-green-200";
      case "dibatalkan":
        return "bg-red-100 text-red-800 border border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border border-gray-200";
    }
  };

  const getPaymentIcon = (method: string) => {
    if (method.includes('Virtual Account')) return <Landmark className="h-4 w-4 text-blue-500" />;
    if (method.includes('E-Wallet')) return <Wallet className="h-4 w-4 text-green-500" />;
    if (method.includes('Tunai')) return <TrendingUp className="h-4 w-4 text-yellow-500" />;
    if (method.includes('Kartu Kredit')) return <CreditCard className="h-4 w-4 text-purple-500" />;
    return <CreditCard className="h-4 w-4 text-gray-500" />;
  };

  const getProdukImage = (kodeBarang?: string) => {
    if (!kodeBarang) return null;
    const produk = produkList.find(p => p.kode_barang === kodeBarang);
    return produk ? produk.gambar_url : null;
  };

  if (loadingKasir || loadingProduk) {
    return (
      <MainLayout>
        <LoadingSpinner />
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">{error}</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  if (!kasirId) {
    return (
      <MainLayout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg">
            <strong className="font-bold">Error! </strong>
            <span className="block sm:inline">Tidak dapat mengidentifikasi kasir. Silakan login kembali.</span>
          </div>
        </div>
      </MainLayout>
    );
  }

  const totalPages = Math.ceil(totalItems / itemsPerPage);

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Pesanan Kasir</h1>
        </div>

        {loading ? (
          <LoadingSpinner />
        ) : pesananList.length === 0 ? (
          <div className="bg-white shadow-sm rounded-lg border border-gray-200 p-8 text-center">
            <p className="text-gray-500 text-lg">Belum ada pesanan untuk kasir ini</p>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {pesananList.map(pesanan => {
                const isExpanded = expandedItems.has(pesanan._id);
                const maxVisibleItems = 2;
                const visibleBarang = isExpanded 
                  ? pesanan.barang_dibeli 
                  : pesanan.barang_dibeli.slice(0, maxVisibleItems);
                const hasMoreItems = pesanan.barang_dibeli.length > maxVisibleItems;

                return (
                  <div key={pesanan._id} className="bg-white shadow-sm rounded-xl border border-gray-200 transition-all duration-200 hover:shadow-md">
                    <div className="p-4 sm:p-5">
                      {/* Header */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h2 className="text-lg font-semibold text-gray-800">#{pesanan.nomor_transaksi}</h2>
                            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(pesanan.status)}`}>
                              {pesanan.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-500">{formatTanggal(pesanan.tanggal_transaksi)}</p>
                        </div>
                        
                        {/* Total Harga dengan desain baru */}
                        <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-3 min-w-[140px] text-center shadow-sm">
                          <p className="text-xs text-green-100 font-medium mb-1">TOTAL</p>
                          <p className="font-bold text-lg text-white">{formatCurrency(pesanan.total_harga)}</p>
                        </div>
                      </div>

                      {/* Info Metode Pembayaran dan Kasir */}
                      <div className="flex flex-wrap gap-3 mb-4">
                        <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                          {getPaymentIcon(pesanan.metode_pembayaran)}
                          <span className="text-sm font-medium text-gray-700">{pesanan.metode_pembayaran}</span>
                        </div>
                        <div className="bg-gray-50 px-3 py-2 rounded-lg">
                          <p className="text-xs text-gray-500">Kasir ID</p>
                          <p className="text-sm font-medium text-gray-700">{pesanan.kasir_id}</p>
                        </div>
                      </div>

                      {/* Barang Dibeli */}
                      <div className="border-t border-gray-100 pt-4">
                        <div className="flex justify-between items-center mb-3">
                          <h3 className="font-medium text-gray-700 text-sm">Barang Dibeli ({pesanan.barang_dibeli.length} item)</h3>
                          {hasMoreItems && (
                            <button
                              onClick={() => toggleExpand(pesanan._id)}
                              className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-sm font-medium transition-all duration-200 hover:shadow-sm border border-blue-200"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Sembunyikan</span>
                                  <ChevronUp className="h-4 w-4" />
                                </>
                              ) : (
                                <>
                                  <span>Lihat {pesanan.barang_dibeli.length - maxVisibleItems} lainnya</span>
                                  <ChevronDown className="h-4 w-4" />
                                </>
                              )}
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          {visibleBarang.map((barang, index) => {
                            const gambarUrl = getProdukImage(barang.kode_barang);
                            return (
                              <div key={barang._id || index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  {gambarUrl ? (
                                    <img 
                                      src={gambarUrl} 
                                      alt={barang.nama_barang}
                                      className="h-10 w-10 rounded-lg object-cover flex-shrink-0 border border-gray-200"
                                    />
                                  ) : (
                                    <div className="h-10 w-10 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0 border border-gray-300">
                                      <span className="text-xs text-gray-500">No Img</span>
                                    </div>
                                  )}
                                  <div className="min-w-0 flex-1">
                                    <p className="font-medium text-gray-800 text-sm truncate">{barang.nama_barang}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <p className="text-gray-500 text-xs">{barang.kode_barang}</p>
                                      <span className="text-gray-300">•</span>
                                      <p className="text-gray-600 text-xs font-medium">
                                        {barang.jumlah} × {formatCurrency(barang.harga_satuan || 0)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0 ml-3">
                                  <div className="font-semibold text-gray-800 text-sm bg-white px-2 py-1 rounded border border-gray-200">
                                    {formatCurrency(barang.subtotal || 0)}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Updated At */}
                      {pesanan.updatedAt && (
                        <div className="mt-3 text-xs text-gray-500 flex items-center">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Diperbarui: {formatTanggal(pesanan.updatedAt)}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-6">
                <div className="text-sm text-gray-600">
                  Menampilkan <span className="font-semibold text-gray-900">{(currentPage - 1) * itemsPerPage + 1}-{Math.min(currentPage * itemsPerPage, totalItems)}</span> dari{' '}
                  <span className="font-semibold text-gray-900">{totalItems}</span> pesanan
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
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
                          className={`w-9 h-9 rounded-lg font-medium text-sm transition-all ${
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
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
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
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default PesananKasirPage;
