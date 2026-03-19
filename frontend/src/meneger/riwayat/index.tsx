import { useState, useEffect } from "react";
import MenegerLayout from "../layout";
import LoadingSpinner from "../../components/LoadingSpinner";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { API_URL } from '../../config/api';

interface BarangDibeli {
  kode_barang: string;
  nama_barang: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  _id: string;
  gambar_url?: string;
}

interface Kasir {
  _id: string;
  nama_lengkap: string;
  username: string;
}

interface RiwayatTransaksiAPI {
  _id: string;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  barang_dibeli: BarangDibeli[];
  total_harga: number;
  metode_pembayaran: string;
  kasir_id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface RiwayatTransaksi {
  id: string;
  tanggal: string;
  items: number;
  total: number;
  status: string;
  nomor_transaksi: string;
  metode_pembayaran: string;
  kasir?: Kasir;
  detail?: BarangDibeli[];
  originalDate: Date;
  bulan: string;
  tahun: string;
  hari: string;
}

interface StokBarang {
  _id: string;
  kode_barang: string;
  nama_barang: string;
  gambar_url?: string;
}

const MenegerRiwayatPage = () => {
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [filterBulan, setFilterBulan] = useState<string>("semua");
  const [filterTahun, setFilterTahun] = useState<string>("semua");
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [filterHari, setFilterHari] = useState<string>("semua");
  const [filterPayment, setFilterPayment] = useState<string>("semua");
  const [filterKasir, setFilterKasir] = useState<string>("semua");
  const [dataRiwayat, setDataRiwayat] = useState<RiwayatTransaksi[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [detailVisible, setDetailVisible] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage] = useState<number>(10);

  useEffect(() => {
    fetchRiwayatData();
  }, []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const fetchRiwayatData = async () => {
    try {
      setLoading(true);
      
      // Fetch stok barang data
      const stokUrl = `${API_URL}/api/manager/stok-barang`;
      const stokResponse = await fetch(stokUrl, {
        headers: getAuthHeaders(),
      });
      
      const stokMap: Record<string, string> = {};
      
      if (stokResponse.ok) {
        const stokData: StokBarang[] = await stokResponse.json();
        
        // Create mapping from kode_barang to gambar_url
        stokData.forEach((item: StokBarang) => {
          if (item.kode_barang && item.gambar_url) {
            stokMap[item.kode_barang] = item.gambar_url;
          }
        });
      }
      
      // Fetch riwayat data
      const response = await fetch(`${API_URL}/api/manager/riwayat`, {
        headers: getAuthHeaders(),
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: RiwayatTransaksiAPI[] = await response.json();
      
      const transformedData: RiwayatTransaksi[] = data.map(item => {
        const originalDate = new Date(item.tanggal_transaksi);
        const bulan = originalDate.toLocaleString("id-ID", { month: "long" }).toLowerCase();
        const tahun = originalDate.getFullYear().toString();
        const hari = originalDate.toLocaleDateString("id-ID", { weekday: "long" }).toLowerCase();

        const kasirObj: Kasir = {
          _id: item.kasir_id,
          nama_lengkap: item.kasir_id,
          username: item.kasir_id
        };

        const barangDibeliWithImages = item.barang_dibeli.map(barang => ({
          ...barang,
          gambar_url: stokMap[barang.kode_barang] || undefined
        }));

        return {
          id: item._id,
          nomor_transaksi: item.nomor_transaksi,
          tanggal: originalDate.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "long",
            year: "numeric",
          }),
          items: item.barang_dibeli.reduce((total, barang) => total + barang.jumlah, 0),
          total: item.total_harga,
          status: item.status,
          metode_pembayaran: item.metode_pembayaran,
          kasir: kasirObj,
          detail: barangDibeliWithImages,
          originalDate,
          bulan,
          tahun,
          hari,
        };
      });
      
      transformedData.sort((a, b) => b.originalDate.getTime() - a.originalDate.getTime());
      setDataRiwayat(transformedData);
      setError(null);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching riwayat data:', err);
      setError('Gagal memuat data riwayat transaksi. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const formatRupiah = (angka: number): string =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(angka);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "selesai":
      case "completed":
        return "bg-green-100 text-green-800";
      case "diproses":
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "dibatalkan":
      case "cancelled":
      case "expire":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusText = (status: string): string => {
    switch (status) {
      case "completed":
        return "selesai";
      case "pending":
        return "pending";
      case "cancelled":
        return "dibatalkan";
      case "expire":
        return "expired";
      default:
        return status;
    }
  };

  const toggleDetail = (id: string) => {
    setDetailVisible(prev => prev === id ? null : id);
  };

  const BarangImage: React.FC<{ url?: string; name: string }> = ({ url, name }) => {
    const [imgError, setImgError] = useState(false);
    
    if (imgError || !url) {
      return (
        <div className="w-10 h-10 bg-gray-200 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      );
    }
    
    return (
      <img 
        src={url} 
        alt={name}
        className="w-10 h-10 object-cover rounded-lg"
        onError={() => setImgError(true)}
      />
    );
  };

  const filteredData = dataRiwayat.filter(trx => {
    const yearMatch = filterTahun === "semua" || trx.tahun === filterTahun;
    const monthMatch = filterBulan === "semua" || trx.bulan === filterBulan;
    
    const statusMatch = filterStatus === "semua" || 
      (filterStatus === "selesai" && (trx.status === "selesai" || trx.status === "completed")) ||
      (filterStatus === "pending" && (trx.status === "diproses" || trx.status === "pending")) ||
      (filterStatus === "expired" && (trx.status === "expire")) ||
      (filterStatus === "dibatalkan" && (trx.status === "dibatalkan" || trx.status === "cancelled"));
    
    const paymentMatch = filterPayment === "semua" || trx.metode_pembayaran === filterPayment;
    
    const kasirMatch = filterKasir === "semua" || trx.kasir?._id === filterKasir;
    
    let dayMatch = true;
    if (filterHari !== "semua") {
      const today = new Date();
      const transactionDate = trx.originalDate;
      
      switch (filterHari) {
        case "hari_ini":
          dayMatch = transactionDate.toDateString() === today.toDateString();
          break;
        case "kemarin": {
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          dayMatch = transactionDate.toDateString() === yesterday.toDateString();
          break;
        }
        case "7_hari_terakhir": {
          const sevenDaysAgo = new Date(today);
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          dayMatch = transactionDate >= sevenDaysAgo;
          break;
        }
        case "30_hari_terakhir": {
          const thirtyDaysAgo = new Date(today);
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          dayMatch = transactionDate >= thirtyDaysAgo;
          break;
        }
        default:
          dayMatch = trx.hari === filterHari;
      }
    }
    
    return yearMatch && monthMatch && statusMatch && dayMatch && paymentMatch && kasirMatch;
  });

  const tahunOptions = Array.from(
    new Set(dataRiwayat.map(trx => trx.tahun))
  ).sort((a, b) => parseInt(b) - parseInt(a));

  const paymentOptions = Array.from(
    new Set(dataRiwayat.map(trx => trx.metode_pembayaran))
  ).map(payment => ({ value: payment, label: payment }));

  const kasirOptions = Array.from(
    new Set(
      dataRiwayat
        .filter(trx => trx.kasir)
        .map(trx => trx.kasir!._id)
    )
  ).map(kasirId => {
    const kasir = dataRiwayat.find(trx => trx.kasir?._id === kasirId)?.kasir;
    return kasir ? { _id: kasirId, nama_lengkap: kasir.nama_lengkap } : null;
  }).filter(Boolean) as { _id: string; nama_lengkap: string }[];

  const hariOptions = [
    { value: "semua", label: "Semua Hari" },
    { value: "hari_ini", label: "Hari Ini" },
    { value: "kemarin", label: "Kemarin" },
    { value: "7_hari_terakhir", label: "7 Hari Terakhir" },
    { value: "30_hari_terakhir", label: "30 Hari Terakhir" },
    { value: "senin", label: "Senin" },
    { value: "selasa", label: "Selasa" },
    { value: "rabu", label: "Rabu" },
    { value: "kamis", label: "Kamis" },
    { value: "jumat", label: "Jumat" },
    { value: "sabtu", label: "Sabtu" },
    { value: "minggu", label: "Minggu" }
  ];

  const statusOptions = [
    { value: "semua", label: "Semua Status" },
    { value: "selesai", label: "Selesai" },
    { value: "pending", label: "Pending" },
    { value: "expired", label: "Expired" },
    { value: "dibatalkan", label: "Dibatalkan" },
  ];

  const bulanOptions = [
    { value: "semua", label: "Semua Bulan" },
    { value: "januari", label: "Januari" },
    { value: "februari", label: "Februari" },
    { value: "maret", label: "Maret" },
    { value: "april", label: "April" },
    { value: "mei", label: "Mei" },
    { value: "juni", label: "Juni" },
    { value: "juli", label: "Juli" },
    { value: "agustus", label: "Agustus" },
    { value: "september", label: "September" },
    { value: "oktober", label: "Oktober" },
    { value: "november", label: "November" },
    { value: "desember", label: "Desember" }
  ];

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  if (loading) {
    return (
      <MenegerLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      </MenegerLayout>
    );
  }

  return (
    <MenegerLayout>
      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Riwayat Transaksi Manager
          </h1>
          <p className="text-gray-600 text-sm md:text-base">
            Lihat semua riwayat transaksi yang dikelola manager
          </p>
        </div>

        {/* Filter Section */}
        <div className="bg-white p-4 md:p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Filter Transaksi</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            {/* Filter Bulan */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bulan</label>
              <select
                value={filterBulan}
                onChange={(e) => {
                  setFilterBulan(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {bulanOptions.map(bulan => (
                  <option key={bulan.value} value={bulan.value}>{bulan.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Tahun */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tahun</label>
              <select
                value={filterTahun}
                onChange={(e) => {
                  setFilterTahun(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="semua">Semua Tahun</option>
                {tahunOptions.map(tahun => (
                  <option key={tahun} value={tahun}>{tahun}</option>
                ))}
              </select>
            </div>

            {/* Filter Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {statusOptions.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Hari */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Hari/Periode</label>
              <select
                value={filterHari}
                onChange={(e) => {
                  setFilterHari(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                {hariOptions.map(hari => (
                  <option key={hari.value} value={hari.value}>{hari.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Payment */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Metode Pembayaran</label>
              <select
                value={filterPayment}
                onChange={(e) => {
                  setFilterPayment(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="semua">Semua Metode</option>
                {paymentOptions.map(payment => (
                  <option key={payment.value} value={payment.value}>{payment.label}</option>
                ))}
              </select>
            </div>

            {/* Filter Kasir */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kasir</label>
              <select
                value={filterKasir}
                onChange={(e) => {
                  setFilterKasir(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="semua">Semua Kasir</option>
                {kasirOptions.map(kasir => (
                  <option key={kasir._id} value={kasir._id}>{kasir.nama_lengkap}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <button 
              onClick={fetchRiwayatData}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 transition flex items-center"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Refresh Data
            </button>
            
            {!loading && !error && filteredData.length > 0 && (
              <p className="text-sm text-gray-600 hidden md:block">
                Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredData.length)} dari {filteredData.length} transaksi
              </p>
            )}
          </div>
        </div>

        {/* Info hasil filter untuk mobile */}
        {!loading && !error && filteredData.length > 0 && (
          <div className="mb-4 md:hidden bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800 text-center">
              Menampilkan {indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredData.length)} dari {filteredData.length} transaksi
            </p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 p-4 rounded-lg shadow-sm mb-6">
            <div className="flex items-center mb-2">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <p className="text-red-800 font-medium">{error}</p>
            </div>
            <button 
              onClick={fetchRiwayatData}
              className="mt-2 px-4 py-2 bg-red-100 text-red-800 rounded-lg text-sm hover:bg-red-200 transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Daftar riwayat */}
        {!loading && !error && (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6">
            {currentItems.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {currentItems.map((trx) => (
                  <div key={trx.id} className="p-4 md:p-6 hover:bg-gray-50 transition">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base md:text-lg font-semibold text-gray-900">{trx.nomor_transaksi}</h3>
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                              trx.status
                            )}`}
                          >
                            {getStatusText(trx.status)}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-sm text-gray-600">
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {trx.tanggal}
                          </div>
                          
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            {trx.items} item
                          </div>
                          
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                            </svg>
                            {trx.metode_pembayaran}
                          </div>
                          
                          <div className="flex items-center">
                            <svg className="w-4 h-4 mr-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            {trx.kasir?.nama_lengkap || "-"}
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-2">
                        <p className="text-lg font-bold text-gray-900">
                          {formatRupiah(trx.total)}
                        </p>
                        <button
                          onClick={() => toggleDetail(trx.id)}
                          className="flex items-center text-sm text-blue-600 hover:text-blue-800 transition"
                        >
                          {detailVisible === trx.id ? (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                              Sembunyikan
                            </>
                          ) : (
                            <>
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                              Lihat Detail
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {detailVisible === trx.id && trx.detail && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-medium text-gray-700 mb-3 flex items-center">
                          <svg className="w-5 h-5 mr-2 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                          </svg>
                          Detail Barang
                        </h4>
                        <div className="overflow-x-auto rounded-lg border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Nama Barang
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Jumlah
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Harga Satuan
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Subtotal
                                </th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {trx.detail.map((barang, index) => (
                                <tr key={index} className="hover:bg-gray-50">
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    <div className="flex items-center">
                                      <BarangImage url={barang.gambar_url} name={barang.nama_barang} />
                                      <span className="ml-3">{barang.nama_barang}</span>
                                    </div>
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {barang.jumlah}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {formatRupiah(barang.harga_satuan)}
                                  </td>
                                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 font-medium">
                                    {formatRupiah(barang.subtotal)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500">
                <svg className="w-16 h-16 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                {filterBulan !== "semua" || filterTahun !== "semua" || filterStatus !== "semua" || filterHari !== "semua" || filterPayment !== "semua" || filterKasir !== "semua"
                  ? "Tidak ada transaksi pada filter yang dipilih"
                  : "Belum ada riwayat transaksi"}
              </div>
            )}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && !error && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
            <div className="text-sm text-gray-600">
              Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredData.length)}</span> dari{' '}
              <span className="font-semibold text-gray-900">{filteredData.length}</span> transaksi
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
      </div>
    </MenegerLayout>
  );
};

export default MenegerRiwayatPage;
