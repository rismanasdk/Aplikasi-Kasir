import { useState, useEffect } from 'react';
import { useLocation } from "react-router-dom";
import MainLayout from '../../components/MainLayout';
import Sidebar from "../componentUtama/Sidebar";
import { customStyles } from '../CssHalamanUtama';
import { API_URL } from '../../config/api';

import {  
  Eye, 
  RefreshCw, 
  Calendar,
  CreditCard,
  CheckCircle,
  Clock,
  XCircle,
  X,
  // Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  CalendarDays
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Variants } from 'framer-motion';

interface BarangDibeli {
  kode_barang: string;
  nama_barang: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  _id: string;
  harga_beli?: number;
}

interface PesananAPI {
  order_id: string;
  nama_barang: BarangDibeli[];
  status: string;
  metode_pembayaran: string;
  total_harga: number;
  kasir_id: string;
  createdAt: string;
}

interface Pesanan {
  order_id: string;
  nama_barang: BarangDibeli[];
  status: string;
  metode_pembayaran: string;
  total_harga: number;
  kasir_id: string;
  createdAt: string;
}

interface Kasir {
  _id: string;
  nama: string;
  username: string;
  email: string;
  role: string;
}

interface Settings {
  receiptHeader: string;
  receiptFooter: string;
}

interface BiayaLayananItem {
  persen: number;
}

interface LocationState {
  transaksiTerbaru?: Pesanan;
  message?: string;
}

interface ApiResponse {
  message: string;
  riwayat: PesananAPI[];
}

const API_URL_HISTORY = `${API_URL}/api/users/history`;
const SETTINGS_URL = `${API_URL}/api/admin/settings`;
const BIAYA_LAYANAN_URL = `${API_URL}/api/admin/biaya-layanan`;

const StatusPesananPage = () => {
  const [filterStatus, setFilterStatus] = useState<string>("semua");
  const [filterDate, setFilterDate] = useState<string>("hari-ini"); // Default: hari ini
  const [pesananList, setPesananList] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPesanan, setSelectedPesanan] = useState<Pesanan | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [kasir, setKasir] = useState<Kasir | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [settings, setSettings] = useState<Settings>({ receiptHeader: "", receiptFooter: "" });
  const [showDateFilter, setShowDateFilter] = useState(false); // Kontrol visibilitas filter tanggal
  const [showPaymentFilter, setShowPaymentFilter] = useState(false); // Kontrol visibilitas filter metode pembayaran
  const [filterPayment, setFilterPayment] = useState<string>("semua"); // Filter metode pembayaran
  const [totalBiayaLayanan, setTotalBiayaLayanan] = useState(0); // State untuk total biaya layanan
  const itemsPerPage = 10;
 
  const location = useLocation();
  const locationState = location.state as LocationState | null;

  // Fetch data pesanan dari API
  const fetchPesanan = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(API_URL_HISTORY, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      
      const data: ApiResponse = await response.json();
      
      // Periksa apakah data memiliki properti riwayat dan itu adalah array
      if (data && data.riwayat && Array.isArray(data.riwayat)) {
        setPesananList(data.riwayat);
      } else {
        console.error("Data format is invalid:", data);
        setPesananList([]);
      }
    } catch (error) {
      console.error("Error:", error);
      setPesananList([]); // Set ke array kosong saat error
    } finally {
      setLoading(false);
    }
  };

  // Fetch settings dari API
  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(SETTINGS_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSettings({
          receiptHeader: data.receiptHeader || "",
          receiptFooter: data.receiptFooter || ""
        });
      }
    } catch (error) {
      console.error("Gagal mengambil data settings:", error);
    }
  };

  // Fetch biaya layanan dari API
  const fetchBiayaLayanan = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(BIAYA_LAYANAN_URL, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data: BiayaLayananItem[] = await response.json();
        // Hitung total persentase dari semua biaya layanan
        const total = data.reduce((sum: number, item: BiayaLayananItem) => sum + item.persen, 0);
        setTotalBiayaLayanan(total);
      }
    } catch (error) {
      console.error("Gagal mengambil data biaya layanan:", error);
    }
  };

  // Fetch kasir data by ID
  const fetchKasirById = async (kasirId: string) => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/kasir/${kasirId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const kasirData = await response.json();
        return kasirData;
      }
      return null;
    } catch (err) {
      console.error("Gagal fetch data kasir:", err);
      return null;
    }
  };

  // Fungsi untuk memfilter pesanan berdasarkan tanggal
  // Fungsi untuk mendapatkan metode pembayaran unik
  const getUniquePaymentMethods = () => {
    if (!Array.isArray(pesananList)) return [];
    const methods = Array.from(new Set(pesananList.map(p => p.metode_pembayaran)));
    return methods.sort();
  };

  const filterByDate = (pesanan: Pesanan, filter: string) => {
    const today = new Date();
    const pesananDate = new Date(pesanan.createdAt);
    
    // Reset waktu untuk perbandingan yang akurat
    today.setHours(0, 0, 0, 0);
    pesananDate.setHours(0, 0, 0, 0);
    
    switch (filter) {
      case "hari-ini": {
        return pesananDate.getTime() === today.getTime();
      }
      case "kemarin": {
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return pesananDate.getTime() === yesterday.getTime();
      }
      case "7-hari": {
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        return pesananDate >= sevenDaysAgo;
      }
      case "30-hari": {
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return pesananDate >= thirtyDaysAgo;
      }
      case "bulan-ini": {
        return pesananDate.getMonth() === today.getMonth() && 
               pesananDate.getFullYear() === today.getFullYear();
      }
      case "bulan-lalu": {
        const lastMonth = new Date(today);
        lastMonth.setMonth(lastMonth.getMonth() - 1);
        return pesananDate.getMonth() === lastMonth.getMonth() && 
               pesananDate.getFullYear() === lastMonth.getFullYear();
      }
      default: {
        return true; // "semua" tanggal
      }
    }
  };

  useEffect(() => {
    fetchPesanan();
    fetchSettings();
    fetchBiayaLayanan();
  }, []);

  // Ambil data transaksi terbaru dari state navigasi
  useEffect(() => {
    if (locationState?.transaksiTerbaru) {
      setPesananList(prev => {
        // Pastikan prev adalah array
        const prevArray = Array.isArray(prev) ? prev : [];
        
        // Cek apakah transaksi sudah ada untuk menghindari duplikat
        const alreadyExists = prevArray.some(item => item.order_id === locationState.transaksiTerbaru?.order_id);
        if (alreadyExists) {
          return prevArray.map(item => 
            item.order_id === locationState.transaksiTerbaru?.order_id 
              ? locationState.transaksiTerbaru 
              : item
          );
        }
        return [locationState.transaksiTerbaru as Pesanan, ...prevArray];
      });
    }
  }, [locationState]);

  // Reset halaman saat filter atau pencarian berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, searchTerm, filterDate, filterPayment]);

  // Filter pesanan berdasarkan status dan tanggal
  const filteredByStatus = filterStatus === "semua" 
    ? (Array.isArray(pesananList) ? pesananList : [])
    : (Array.isArray(pesananList) ? pesananList.filter(pesanan => pesanan.status === filterStatus) : []);

  // Filter berdasarkan tanggal
  const filteredByDate = Array.isArray(filteredByStatus) 
    ? filteredByStatus.filter(pesanan => filterByDate(pesanan, filterDate))
    : [];

  // Filter berdasarkan metode pembayaran
  const filteredByPayment = filterPayment === "semua"
    ? filteredByDate
    : filteredByDate.filter(pesanan => pesanan.metode_pembayaran === filterPayment);

  // Filter berdasarkan pencarian
  const searchedPesanan = Array.isArray(filteredByPayment) 
    ? filteredByPayment.filter(
        (item) =>
          (item.order_id ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.metode_pembayaran ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.status ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
          (item.nama_barang?.some(barang => 
            barang.nama_barang.toLowerCase().includes(searchTerm.toLowerCase())
          ) ?? false)
      )
    : [];

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = Array.isArray(searchedPesanan) ? searchedPesanan.slice(indexOfFirstItem, indexOfLastItem) : [];
  const totalPages = Array.isArray(searchedPesanan) ? Math.ceil(searchedPesanan.length / itemsPerPage) : 0;

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Fungsi untuk mendapatkan class warna berdasarkan status
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-yellow-100 text-yellow-800";
      case "diproses": return "bg-blue-100 text-blue-800";
      case "dikirim": return "bg-indigo-100 text-indigo-800";
      case "selesai": return "bg-green-100 text-green-800";
      case "dibatalkan": return "bg-red-100 text-red-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  // Fungsi untuk mendapatkan ikon berdasarkan status
  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'selesai': case 'success': case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      case 'diproses':
        return <Clock className="w-4 h-4" />;
      case 'dikirim':
        return <Clock className="w-4 h-4" />;
      case 'failed': case 'cancelled': case 'dibatalkan':
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Fungsi untuk format tanggal dengan penanganan error yang lebih baik
  const formatTanggal = (dateString: string) => {
    try {
      // Coba parsing tanggal
      const date = new Date(dateString);
      
      // Periksa apakah tanggal valid
      if (isNaN(date.getTime())) {
        console.error("Invalid date:", dateString);
        return "Tanggal tidak valid";
      }
      
      const options: Intl.DateTimeFormatOptions = { 
        weekday: 'short', 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      };
      
      return date.toLocaleDateString('id-ID', options);
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Format tanggal error";
    }
  };

  // Format currency
  const formatCurrency = (value: number | undefined | null): string => {
    if (!value || isNaN(value)) return "Rp 0";
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  // Fungsi untuk menghitung subtotal dari barang yang dibeli
  const calculateSubtotalFromItems = (items: BarangDibeli[]): number => {
    return items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  // Fungsi untuk menghitung biaya layanan dari total dan persentase
  const calculateBiayaLayanan = (total: number, percentage: number): number => {
    return Math.round(total * percentage / 100);
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleViewReceipt = async (pesanan: Pesanan) => {
    // Fetch kasir data when viewing receipt
    if (pesanan.kasir_id) {
      const kasirData = await fetchKasirById(pesanan.kasir_id);
      setKasir(kasirData);
    } else {
      setKasir(null);
    }
    
    setSelectedPesanan(pesanan);
    setIsReceiptModalOpen(true);
  };

  // const handlePrintReceipt = () => {
  //   window.print();
  // };

  // Animasi variants
  const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  const modalVariants: Variants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        duration: 0.3,
        ease: "easeOut" as const
      }
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: 20,
      transition: {
        duration: 0.2,
        ease: "easeIn" as const
      }
    }
  };

  return (
    <MainLayout>
      <div className="bg-white shadow-md rounded-b-xl">
        <div className="max-w-8x4 mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button onClick={toggleSidebar} className="md:hidden mr-2 p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              
              <div className="flex-shrink-0 flex items-center">
                <div className="bg-amber-500 p-2 rounded-xl shadow-md">
                  <span className="text-white text-xl font-bold">K+</span>
                </div>
                <div className="ml-3">
                  <h1 className="text-xl font-bold text-gray-900">KasirPlus</h1>
                  <p className="text-xs text-gray-500">Point of Sale System</p>
                </div>
              </div>
              
              <div className="hidden md:ml-10 md:flex md:items-center">
                <nav className="flex" aria-label="Breadcrumb">
                  <ol className="inline-flex items-center space-x-1 md:space-x-3">
                    <li className="inline-flex items-center" key="breadcrumb-home">
                      <a href="/" className="inline-flex items-center text-sm font-medium text-gray-700 hover:text-amber-600">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        Dashboard
                      </a>
                    </li>
                    <li key="breadcrumb-pesanan">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="ml-1 text-sm font-medium text-gray-500">Status Pesanan</span>
                      </div>
                    </li>
                  </ol>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex h-[calc(100vh-120px)] mt-4 gap-4">
        <Sidebar isOpen={sidebarOpen} onToggle={toggleSidebar} />
        
        <div className="flex-1 bg-white rounded-2xl shadow-md p-6 overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Status Pesanan</h1>
              <p className="text-gray-600">Lihat status dan riwayat pesanan Anda</p>
            </div>
            <div className="flex gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Cari pesanan..."
                  className="pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-amber-500 focus:border-amber-500 transition-all"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-2.5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button onClick={fetchPesanan} className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 flex items-center">
                <RefreshCw className="h-5 w-5 mr-1" />
                Refresh
              </button>
            </div>
          </div>

          {/* Pesan Sukses dari Transaksi */}
          {locationState?.message && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {locationState.message}
            </div>
          )}

          {/* Filter Status dan Tanggal */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filter Status:</span>
              <div className="flex flex-wrap gap-2">
                {["semua", "selesai", "dibatalkan"].map(
                  (status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        filterStatus === status
                          ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md"
                          : "bg-white text-gray-700 hover:bg-gray-200 border border-gray-200"
                      }`}
                    >
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  )
                )}
              </div>
              
              {/* Filter Tanggal dan Metode Pembayaran */}
              <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Tanggal:</span>
                  <button 
                    onClick={() => setShowDateFilter(!showDateFilter)}
                    className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <CalendarDays className="h-4 w-4" />
                    {filterDate === "hari-ini" && "Hari Ini"}
                    {filterDate === "kemarin" && "Kemarin"}
                    {filterDate === "7-hari" && "7 Hari Terakhir"}
                    {filterDate === "30-hari" && "30 Hari Terakhir"}
                    {filterDate === "bulan-ini" && "Bulan Ini"}
                    {filterDate === "bulan-lalu" && "Bulan Lalu"}
                    {filterDate === "semua" && "Semua Tanggal"}
                    <Filter className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-700">Metode Pembayaran:</span>
                  <button 
                    onClick={() => setShowPaymentFilter(!showPaymentFilter)}
                    className="flex items-center gap-1 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                  >
                    <CreditCard className="h-4 w-4" />
                    {filterPayment === "semua" ? "Semua Metode" : filterPayment}
                    <Filter className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            
            {/* Dropdown Filter Tanggal */}
            {showDateFilter && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {[
                    { value: "hari-ini", label: "Hari Ini" },
                    { value: "kemarin", label: "Kemarin" },
                    { value: "7-hari", label: "7 Hari Terakhir" },
                    { value: "30-hari", label: "30 Hari Terakhir" },
                    { value: "bulan-ini", label: "Bulan Ini" },
                    { value: "bulan-lalu", label: "Bulan Lalu" },
                    { value: "semua", label: "Semua Tanggal" }
                  ].map((option) => (
                    <button
                      key={option.value}
                      onClick={() => {
                        setFilterDate(option.value);
                        setShowDateFilter(false);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterDate === option.value
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Dropdown Filter Metode Pembayaran */}
            {showPaymentFilter && (
              <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  <button
                    onClick={() => {
                      setFilterPayment("semua");
                      setShowPaymentFilter(false);
                    }}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterPayment === "semua"
                        ? "bg-amber-500 text-white"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    Semua Metode
                  </button>
                  {getUniquePaymentMethods().map((method) => (
                    <button
                      key={method}
                      onClick={() => {
                        setFilterPayment(method);
                        setShowPaymentFilter(false);
                      }}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                        filterPayment === method
                          ? "bg-amber-500 text-white"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          

          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-500"></div>
            </div>
          ) : searchedPesanan.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📝</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {filterDate === "hari-ini" && filterStatus === "semua" && searchTerm === ""
                  ? "Tidak Ada Transaksi Hari Ini" 
                  : "Tidak Ada Pesanan"}
              </h3>
              <p className="text-gray-500">
                {filterDate === "hari-ini" && filterStatus === "semua" && searchTerm === ""
                  ? "Belum ada transaksi pada hari ini" 
                  : "Tidak ada pesanan yang sesuai dengan filter"}
              </p>
            </div>
          ) : (
            /* Daftar Pesanan */
            <>
              <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr key="table-header">
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Item</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Metode Pembayaran</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((pesanan) => (
                      <tr key={pesanan.order_id} className="hover:bg-gray-50 transition-colors duration-150">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-700">
                            <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                            <div>
                              <div>{formatTanggal(pesanan.createdAt).split(',')[0]}</div>
                              <div className="text-xs text-gray-500">{formatTanggal(pesanan.createdAt).split(',')[1]}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 max-w-xs">
                            {pesanan.nama_barang && pesanan.nama_barang.length > 0 ? (
                              <div className="space-y-1">
                                {pesanan.nama_barang.slice(0, 2).map((item, index) => (
                                  <div key={`${pesanan.order_id}-item-${index}`} className="flex justify-between">
                                    <span className="font-medium">{item.nama_barang}</span>
                                    <span className="text-gray-500 text-xs">
                                      {item.jumlah} x {formatCurrency(item.harga_satuan)}
                                    </span>
                                  </div>
                                ))}
                                {pesanan.nama_barang.length > 2 && (
                                  <div className="text-xs text-gray-500 italic">
                                    +{pesanan.nama_barang.length - 2} item lainnya
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="text-gray-500 text-sm">Tidak ada item</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-semibold text-gray-900">
                            {formatCurrency(pesanan.total_harga)}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center text-sm text-gray-700">
                            <CreditCard className="h-4 w-4 mr-2 text-gray-400" />
                            {pesanan.metode_pembayaran}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(pesanan.status)}`}>
                            <div className="flex items-center">
                              {getStatusIcon(pesanan.status)}
                              <span className="ml-1 capitalize">{pesanan.status}</span>
                            </div>
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            <button 
                              onClick={() => handleViewReceipt(pesanan)}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center transition-colors"
                              title="Lihat Detail"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              <span>Lihat</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6">
                  <div className="text-sm text-gray-700">
                    Menampilkan <span className="font-medium">{indexOfFirstItem + 1}</span> hingga{" "}
                    <span className="font-medium">
                      {Math.min(indexOfLastItem, searchedPesanan.length)}
                    </span>{" "}
                    dari <span className="font-medium">{searchedPesanan.length}</span> hasil
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={prevPage}
                      disabled={currentPage === 1}
                      className={`px-3 py-1 rounded-md ${
                        currentPage === 1
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    
                    <div className="flex space-x-1">
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
                            className={`px-3 py-1 rounded-md ${
                              currentPage === pageNum
                                ? "bg-amber-500 text-white"
                                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
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
                      className={`px-3 py-1 rounded-md ${
                        currentPage === totalPages
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      }`}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal untuk menampilkan struk */}
      <AnimatePresence>
        {isReceiptModalOpen && selectedPesanan && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              variants={backdropVariants}
              initial="hidden"
              animate="visible"
              exit="hidden"
              onClick={() => setIsReceiptModalOpen(false)}
            />
            
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <div 
                className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-2 text-white">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h1 className="text-lg font-bold">Riwayat Pesanan</h1>
                      </div>
                    </div>
                    <button 
                      onClick={() => setIsReceiptModalOpen(false)}
                      className="p-2 rounded-full hover:bg-white/20 transition-colors"
                    >
                      <X className="w-6 h-6" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                  <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6 print:w-full print:shadow-none print:mt-0">
                    {/* Header dari API */}
                    <div className="text-center mb-4 whitespace-pre-line">
                      {settings.receiptHeader}
                    </div>
                    
                    <h2 className="text-xl font-bold text-center mb-2">STRUK PEMBELIAN</h2>
                    <p className="text-center text-sm text-gray-600 mb-4">
                      #{selectedPesanan.order_id}
                    </p>

                    <div className="border-t border-b py-2 mb-4 text-sm">
                      <p>
                        <span className="font-semibold">Tanggal:</span>{" "}
                        {formatTanggal(selectedPesanan.createdAt)}
                      </p>
                      <p>
                        <span className="font-semibold">Metode:</span>{" "}
                        {selectedPesanan.metode_pembayaran || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Kasir:</span>{" "}
                        {kasir?.nama || kasir?.username || selectedPesanan.kasir_id || "-"}
                      </p>
                      <p>
                        <span className="font-semibold">Status:</span>{" "}
                        <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(selectedPesanan.status)}`}>
                          {selectedPesanan.status}
                        </span>
                      </p>
                    </div>

                    <table className="w-full text-sm mb-4">
                      <thead className="border-b">
                        <tr>
                          <th className="text-left py-1">Barang</th>
                          <th className="text-center py-1">Qty</th>
                          <th className="text-right py-1">Harga</th>
                          <th className="text-right py-1">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedPesanan.nama_barang && selectedPesanan.nama_barang.length > 0 ? (
                          selectedPesanan.nama_barang.map((item: BarangDibeli, idx: number) => (
                            <tr key={`${selectedPesanan.order_id}-receipt-item-${idx}`} className="border-b">
                              <td className="py-1">{item.nama_barang}</td>
                              <td className="py-1 text-center">{item.jumlah}</td>
                              <td className="py-1 text-right">
                                {formatCurrency(item.harga_satuan)}
                              </td>
                              <td className="py-1 text-right">
                                {formatCurrency(item.subtotal)}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr key="no-items">
                            <td colSpan={4} className="py-2 text-center text-gray-500">
                              Tidak ada data barang
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>

                    {/* Garis pembatas di atas subtotal */}
                    <div className="border-t border-gray-300 my-3"></div>

                    <div className="flex justify-between items-center text-sm mb-2">
                      <span>Subtotal</span>
                      <span>{formatCurrency(calculateSubtotalFromItems(selectedPesanan.nama_barang))}</span>
                    </div>

                    {totalBiayaLayanan > 0 && (
                      <div className="flex justify-between items-center text-sm mb-2">
                        <span>Biaya Layanan ({totalBiayaLayanan}%)</span>
                        <span>{formatCurrency(calculateBiayaLayanan(calculateSubtotalFromItems(selectedPesanan.nama_barang), totalBiayaLayanan))}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center text-lg font-bold mb-6">
                      <span>Total Pembayaran</span>
                      <span className="text-green-600">
                        {formatCurrency(
                          calculateSubtotalFromItems(selectedPesanan.nama_barang) + 
                          calculateBiayaLayanan(calculateSubtotalFromItems(selectedPesanan.nama_barang), totalBiayaLayanan)
                        )}
                      </span>
                    </div>

                    {/* Footer dari API */}
                    <div className="text-center mt-6 whitespace-pre-line text-sm">
                      {settings.receiptFooter}
                    </div>

                    <div className="flex gap-3 mt-6 print:hidden">
                      <button
                        onClick={() => setIsReceiptModalOpen(false)}
                        className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                      >
                        Tutup
                      </button>
                      {/* <button
                        onClick={handlePrintReceipt}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4 mr-1" />
                        Cetak Struk
                      </button> */}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      
      <style>{customStyles}</style>
    </MainLayout>
  );
};

export default StatusPesananPage;