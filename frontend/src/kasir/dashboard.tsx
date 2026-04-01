import type { Barang } from "../admin/stok-barang";
import MainLayout from "./layout";
import { useState, useEffect, useRef, useCallback } from "react";
import io, { Socket } from 'socket.io-client';
import LoadingSpinner from "../components/LoadingSpinner";
import { Search, Package, DollarSign, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Minus, FileText, FolderOpen, Box, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '../config/api';
import { getStoredToken } from '../auth/storage';

const API_BASE_URL = `${API_URL}`;

// Define interfaces for socket data
interface SocketBarangData {
  _id?: string;
  kode?: string;
  kode_barang?: string;
  nama?: string;
  nama_barang?: string;
  kategori?: string;
  hargaBeli?: number;
  harga_beli?: number;
  hargaJual?: number;
  harga_jual?: number;
  stok?: number;
  stokMinimal?: number;
  stok_minimal?: number;
  hargaFinal?: number;
  gambarUrl?: string;
  gambar_url?: string;
  status?: string;
  status_publish?: string;
  status_stok?: string;
  useDiscount?: boolean;
  use_discount?: boolean;
  margin?: number;
  bahan_baku?: Array<{
    nama_produk: string;
    bahan: Array<{
      nama: string;
      harga: number;
      jumlah: number;
    }>;
  }>;
}

interface StockUpdateData {
  id: string;
  stok: number;
}

interface DeletedBarangData {
  id: string;
  nama?: string;
}

interface SettingsUpdate {
  lowStockAlert?: number;
}

// Komponen StokCard
interface StokCardProps {
  item: Barang;
  onSelect: (item: Barang) => void;
}

const StokCard = ({ item, onSelect }: StokCardProps) => {
  const getStockStatus = (stok: number, stokMinimal: number = 5) => {
    if (stok === 0)
      return { 
        text: "Stok Habis", 
        color: "bg-red-100 text-red-800",
        icon: <XCircle className="h-4 w-4" />
      };
    if (stok <= stokMinimal)
      return { 
        text: "Stok Terbatas", 
        color: "bg-yellow-100 text-yellow-800",
        icon: <AlertTriangle className="h-4 w-4" />
      };
    return { 
      text: "Stok Tersedia", 
      color: "bg-green-100 text-green-800",
      icon: <CheckCircle className="h-4 w-4" />
    };
  };

  const stockStatus = getStockStatus(item.stok, item.stokMinimal);

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100 hover:shadow-md transition-all flex flex-col group">
      {/* Gambar Barang */}
      <div className="h-48 overflow-hidden bg-gray-100 relative">
        {item.gambarUrl ? (
          <img
            src={item.gambarUrl}
            alt={item.nama}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/300x200?text=No+Image";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <Package className="h-16 w-16 text-gray-400" />
          </div>
        )}
        
        {/* Status Badge Overlay */}
        <div className="absolute top-3 right-3">
          <span
            className={`px-2 py-1 text-xs font-medium rounded-full flex items-center gap-1 ${stockStatus.color}`}
          >
            {stockStatus.icon}
            {stockStatus.text}
          </span>
        </div>
      </div>
      
      <div className="p-5 flex-1">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">
            {item.nama}
          </h3>
          {item.kode && (
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded whitespace-nowrap">
              #{item.kode}
            </span>
          )}
        </div>
        
        <p className="text-sm text-gray-500 mb-3 capitalize flex items-center gap-1">
          <FolderOpen className="h-3 w-3" />
          {item.kategori}
        </p>

        <div className="flex justify-between items-center mb-3">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-blue-500" />
            <div>
              <p className="text-xs text-gray-500">Stok</p>
              <p className="text-lg font-bold">{item.stok} unit</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 flex items-center justify-end gap-1">
              Harga
            </p>
            <p className="text-lg font-bold text-blue-600">
              Rp {item.hargaFinal?.toLocaleString("id-ID")}
            </p>
          </div>
        </div>

        {item.stok > 0 && (
          <div className="w-full bg-gray-200 rounded-full h-2 mb-1">
            <div
              className={`h-2 rounded-full transition-all duration-500 ${
                item.stok <= (item.stokMinimal || 5) ? "bg-yellow-500" : "bg-green-500"
              }`}
              style={{
                width: `${Math.min(100, (item.stok / 50) * 100)}%`,
              }}
            ></div>
          </div>
        )}
      </div>

      <div className="px-5 pb-5">
        <button
          onClick={() => onSelect(item)}
          className="w-full px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 flex items-center justify-center gap-2 transition-colors group-hover:bg-blue-50 group-hover:text-blue-700"
        >
          <FileText className="h-4 w-4" />
          Lihat Detail
        </button>
      </div>
    </div>
  );
};

// Komponen DetailModal
interface DetailModalProps {
  item: Barang | null;
  onClose: () => void;
}

const DetailModal = ({ item, onClose }: DetailModalProps) => {
  if (!item) return null;

  const getStockStatus = (stok: number, stokMinimal: number = 5) => {
    if (stok === 0)
      return { 
        text: "Stok Habis", 
        color: "bg-red-100 text-red-800", 
        icon: <XCircle className="h-5 w-5" />
      };
    if (stok <= stokMinimal)
      return { 
        text: "Stok Terbatas", 
        color: "bg-yellow-100 text-yellow-800", 
        icon: <AlertTriangle className="h-5 w-5" />
      };
    return { 
      text: "Stok Tersedia", 
      color: "bg-green-100 text-green-800", 
      icon: <CheckCircle className="h-5 w-5" />
    };
  };

  const stockStatus = getStockStatus(item.stok, item.stokMinimal);

  // Fungsi untuk mendapatkan warna progress bar
  const getProgressBarColor = (stok: number, stokMinimal: number = 5) => {
    return stok <= stokMinimal ? "bg-yellow-500" : "bg-green-500";
  };

  // Menghitung lebar progress bar
  const getProgressBarWidth = (stok: number) => {
    return `${Math.min(100, (stok / 50) * 100)}%`;
  };

  const progressBarColor = getProgressBarColor(item.stok, item.stokMinimal || 5);
  const progressBarWidth = getProgressBarWidth(item.stok);

  // Fungsi untuk mendapatkan status profit
  const getProfitStatus = (hargaBeli: number, hargaJual: number) => {
    const profit = hargaJual - hargaBeli;
    const profitPercentage = (profit / hargaBeli) * 100;
    
    if (profitPercentage < 10) return { 
      text: "Rendah", 
      color: "text-red-600", 
      icon: <TrendingDown className="h-4 w-4" />
    };
    if (profitPercentage < 30) return { 
      text: "Sedang", 
      color: "text-yellow-600", 
      icon: <Minus className="h-4 w-4" />
    };
    return { 
      text: "Tinggi", 
      color: "text-green-600", 
      icon: <TrendingUp className="h-4 w-4" />
    };
  };

  const profitStatus = getProfitStatus(item.hargaBeli, item.hargaJual);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header - Fixed */}
        <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center">
            <div className={`p-2 rounded-lg mr-3 ${stockStatus.color} text-2xl`}>
              {stockStatus.icon}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">Detail Barang</h3>
              <p className="text-sm text-gray-600">Informasi lengkap tentang produk</p>
            </div>
          </div>
        </div>
        
        {/* Konten Modal - Scrollable */}
        <div className="flex-1 overflow-y-auto">
          {/* Gambar Barang - Full width on mobile */}
          <div className="bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4 md:p-8">
            {item.gambarUrl ? (
              <div className="relative max-w-xs w-full">
                <img
                  src={item.gambarUrl}
                  alt={item.nama}
                  className="w-full h-48 md:h-64 object-contain rounded-lg shadow-lg"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/600x400?text=No+Image";
                  }}
                />
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg text-xl">
                  {stockStatus.icon}
                </div>
              </div>
            ) : (
              <div className="relative max-w-xs w-full">
                <div className="w-full h-48 md:h-64 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg shadow-lg">
                  <Package className="h-24 w-24 text-gray-400" />
                </div>
                <div className="absolute -bottom-2 -right-2 bg-white rounded-full p-2 shadow-lg text-xl">
                  {stockStatus.icon}
                </div>
              </div>
            )}
          </div>
          
          {/* Informasi Barang */}
          <div className="p-4 md:p-8 bg-white">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h4 className="text-xl md:text-2xl font-bold text-gray-900 mb-1">{item.nama}</h4>
                {item.kode && (
                  <p className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded inline-block">
                    #{item.kode}
                  </p>
                )}
              </div>
              <span
                className={`px-3 py-1 text-sm font-semibold rounded-full ${stockStatus.color} flex items-center gap-1`}
              >
                {stockStatus.icon}
                {stockStatus.text}
              </span>
            </div>

            {/* Kategori */}
            <div className="mb-6">
              <p className="text-sm text-gray-500 mb-1">Kategori</p>
              <div className="flex items-center">
                <FolderOpen className="h-5 w-5 mr-2 text-gray-600" />
                <p className="text-base md:text-lg font-medium capitalize bg-gray-50 px-3 py-1.5 rounded-lg inline-block">
                  {item.kategori}
                </p>
              </div>
            </div>

            {/* Informasi Stok */}
            <div className="mb-6 md:mb-8">
              <h5 className="text-base md:text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <Box className="h-5 w-5 mr-2 text-blue-600" />
                Informasi Stok
              </h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Stok Tersedia</p>
                  <p className="text-xl md:text-2xl font-bold text-blue-700">{item.stok} unit</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-xl border border-purple-100">
                  <p className="text-sm text-gray-600 mb-1">Stok Minimal</p>
                  <p className="text-xl md:text-2xl font-bold text-purple-700">{item.stokMinimal || 5} unit</p>
                </div>
              </div>

              {/* Progress Bar Stok */}
              {item.stok > 0 && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-gray-600 mb-1">
                    <span>Ketersediaan Stok</span>
                    <span>{Math.round((item.stok / 50) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${progressBarColor}`}
                      style={{ width: progressBarWidth }}
                    ></div>
                  </div>
                </div>
              )}
            </div>

            {/* Informasi Harga */}
            <div className="mb-6 md:mb-8">
              <h5 className="text-base md:text-lg font-semibold text-gray-800 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                Informasi Harga
              </h5>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                  <p className="text-sm text-gray-600 mb-1">Harga Beli</p>
                  <p className="text-lg md:text-xl font-bold text-green-700">Rp {item.hargaBeli.toLocaleString("id-ID")}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                  <p className="text-sm text-gray-600 mb-1">Harga Jual</p>
                  <p className="text-lg md:text-xl font-bold text-blue-700">Rp {item.hargaFinal?.toLocaleString("id-ID")}</p>
                </div>
              </div>

              {/* Margin/Profit */}
              <div className="mt-4 bg-yellow-50 p-4 rounded-xl border border-yellow-100">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-sm text-gray-600">Margin Keuntungan</p>
                    <p className="text-lg md:text-xl font-bold text-yellow-700">
                      Rp {(item.hargaJual - item.hargaBeli).toLocaleString("id-ID")}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold ${profitStatus.color} flex items-center gap-1`}>
                    {profitStatus.icon}
                    {profitStatus.text}
                  </span>
                </div>
              </div>
            </div>

            {/* Status */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <p className="text-sm text-gray-600 mb-1">Status</p>
              <div className="flex items-center">
                <span className="text-xl mr-2">
                  {item.stok === 0 ? <XCircle className="h-5 w-5 text-red-500" /> : 
                  item.stok <= (item.stokMinimal || 5) ? <AlertTriangle className="h-5 w-5 text-yellow-500" /> : 
                  <CheckCircle className="h-5 w-5 text-green-500" />}
                </span>
                <p className="text-gray-800 capitalize">
                  {item.status || (item.stok === 0 
                    ? "stok habis" 
                    : item.stok <= (item.stokMinimal || 5) 
                      ? "stok hampir habis" 
                      : "stok aman")}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer - Fixed */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <XCircle className="h-4 w-4" />
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

interface DashboardProps {
  dataBarang: Barang[];
}

const KasirDashboard = ({ dataBarang: initialDataBarang }: DashboardProps) => {
  console.log('Initial data barang:', initialDataBarang);
  const getAuthHeaders = (withJson = false): Record<string, string> => {
    const token = getStoredToken();
    const headers: Record<string, string> = withJson ? { 'Content-Type': 'application/json' } : {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };
  
  const [dataBarang, setDataBarang] = useState<Barang[]>(initialDataBarang || []);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedItem, setSelectedItem] = useState<Barang | null>(null);
  const [isLoading, setIsLoading] = useState(!initialDataBarang || initialDataBarang.length === 0);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState(false);
  const [lowStockAlert, setLowStockAlert] = useState(5);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(12);
  const socketRef = useRef<Socket | null>(null);

  // Fungsi untuk normalisasi data
  const normalizeBarangData = useCallback((barang: SocketBarangData): Barang => {
    return {
      _id: barang._id || '',
      kode: barang.kode || barang.kode_barang || '',
      nama: barang.nama || barang.nama_barang || 'Tanpa Nama',
      kategori: barang.kategori || 'Lainnya',
      hargaBeli: barang.hargaBeli || barang.harga_beli || 0,
      hargaJual: barang.hargaJual || barang.harga_jual || 0,
      stok: barang.stok || 0,
      stok_awal: barang.stok || 0,
      stokMinimal: barang.stokMinimal || barang.stok_minimal || lowStockAlert,
      hargaFinal: barang.hargaFinal || 0,
      gambarUrl: barang.gambarUrl || barang.gambar_url || '',
      status: barang.status_stok || barang.status || 'aman',
      useDiscount: barang.useDiscount || barang.use_discount || true,
      margin: barang.margin || 30,
      bahanBaku: barang.bahan_baku || []
    };
  }, [lowStockAlert]);

  // Fetch settings
  const fetchSettings = useCallback(async () => {
    try {
      console.log("Mengambil data settings...");
      const SETTINGS_API_URL = `${API_BASE_URL}/api/common/settings`;
      const res = await fetch(SETTINGS_API_URL, {
        headers: getAuthHeaders(true)
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const settingsData = await res.json();
      
      console.log("Data settings yang diterima:", settingsData);
      
      if (settingsData.lowStockAlert !== undefined) {
        setLowStockAlert(settingsData.lowStockAlert);
        console.log("Low stock alert set to:", settingsData.lowStockAlert);
      }
      
      setSettingsLoaded(true);
    } catch (err) {
      console.error("Gagal mengambil pengaturan:", err);
      setLowStockAlert(5);
      setSettingsLoaded(true);
    }
  }, []);

  const initializeSocket = useCallback(() => {
    try {
      const token = getStoredToken();
      console.log('Initializing socket with token:', token ? 'Present' : 'Missing');
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      socketRef.current = io(API_BASE_URL, {
        auth: {
          token: token
        }
      });
      
      socketRef.current.on('connect', () => {
        console.log('Socket connected with ID:', socketRef.current?.id);
        socketRef.current?.emit('joinRoom', 'barang');
      });
      
      socketRef.current.on('disconnect', (reason) => {
        console.log('Socket disconnected. Reason:', reason);
      });
      
      socketRef.current.on('connect_error', (error) => {
        console.error('Socket connection error:', error);
      });
      
      socketRef.current.on('barang:updated', (updatedBarang: SocketBarangData) => {
        console.log('Received barang:updated event:', updatedBarang);
        const normalizedBarang = normalizeBarangData(updatedBarang);
        setDataBarang(prevList => 
          prevList.map(item => item._id === normalizedBarang._id ? normalizedBarang : item)
        );
      });
      
      socketRef.current.on('stockUpdated', (data: StockUpdateData) => {
        console.log('Received stockUpdated event:', data);
        setDataBarang(prevList => 
          prevList.map(item => {
            if (item._id === data.id) {
              const newStok = data.stok;
              const status = newStok <= 0 
                ? "habis" 
                : newStok <= (item.stokMinimal || lowStockAlert) 
                  ? "hampir habis" 
                  : "aman";
              return { 
                ...item, 
                stok: newStok,
                status
              };
            }
            return item;
          })
        );
      });
      
      socketRef.current.on('barang:created', (newBarang: SocketBarangData) => {
        console.log('Received barang:created event:', newBarang);
        const normalizedBarang = normalizeBarangData(newBarang);
        setDataBarang(prevList => [...prevList, normalizedBarang]);
      });
      
      socketRef.current.on('barang:deleted', (payload: DeletedBarangData) => {
        console.log('Received barang:deleted event:', payload);
        setDataBarang(prevList => prevList.filter(item => item._id !== payload.id));
      });
      
      socketRef.current.on('settings:updated', (updatedSettings: SettingsUpdate) => {
        console.log('Received settings:updated event:', updatedSettings);
        
        if (updatedSettings.lowStockAlert !== undefined) {
          const newLowStockAlert = updatedSettings.lowStockAlert;
          setLowStockAlert(newLowStockAlert);
          console.log("Low stock alert updated to:", newLowStockAlert);
          
          setDataBarang(prevData => 
            prevData.map(item => ({
              ...item,
              stokMinimal: newLowStockAlert
            }))
          );
        }
      });
      
    } catch (socketError) {
      console.error('Error initializing socket:', socketError);
    }
  }, [lowStockAlert, normalizeBarangData]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      setServerError(false);
      
      console.log('Fetching data from:', `${API_BASE_URL}/api/barang`);
      
      const response = await fetch(`${API_BASE_URL}/api/barang`, { headers: getAuthHeaders(true) });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Data received:', data);
      
      const normalizedData = Array.isArray(data) ? data.map(normalizeBarangData) : [];
      setDataBarang(normalizedData);
      setIsLoading(false);
      
      initializeSocket();
      
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Gagal memuat data barang. Silakan coba lagi.');
      setServerError(true);
      setIsLoading(false);
      
      if (initialDataBarang && initialDataBarang.length > 0) {
        setDataBarang(initialDataBarang);
      }
    }
  }, [initializeSocket, initialDataBarang, normalizeBarangData]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    if (settingsLoaded) {
      if (initialDataBarang && initialDataBarang.length > 0) {
        setIsLoading(false);
        initializeSocket();
        return;
      }
      
      fetchData();
      
      const interval = setInterval(fetchData, 30000);
      
      return () => {
        if (socketRef.current) {
          socketRef.current.off('barang:created');
          socketRef.current.off('barang:updated');
          socketRef.current.off('barang:deleted');
          socketRef.current.off('stockUpdated');
          socketRef.current.off('settings:updated');
          socketRef.current.disconnect();
        }
        clearInterval(interval);
      };
    }
  }, [initialDataBarang, fetchData, initializeSocket, settingsLoaded]);

  const filteredBarang = dataBarang.filter(item =>
    item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (item.kode?.toLowerCase().includes(searchTerm.toLowerCase()) || false) ||
    item.kategori.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBarang.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBarang.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  const openDetail = (item: Barang) => {
    setSelectedItem(item);
  };

  const closeDetail = () => {
    setSelectedItem(null);
  };

  // Tampilkan loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <LoadingSpinner />
          </div>
        </div>
      </MainLayout>
    );
  }

  // Tampilkan error state
  if (serverError) {
    return (
      <MainLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Terjadi Kesalahan</h3>
            <p className="text-gray-500 mb-4">{error || 'Gagal terhubung ke server'}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Muat Ulang
            </button>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">Kasir Dashboard</h2>
          <p className="text-gray-600">Daftar barang yang tersedia</p>
        </div>
        
        {/* Info Jumlah Barang */}
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <p className="text-blue-800 font-medium">
            Total: <span className="font-bold">{filteredBarang.length}</span> barang
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative w-full">
          <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Search className="w-5 h-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Cari nama, kode, atau kategori barang..."
            className="block w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 focus:ring-blue-500 focus:border-blue-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Barang Grid - Menggunakan StokCard */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {currentItems.map(item => (
          <StokCard
            key={item._id}
            item={item}
            onSelect={openDetail}
          />
        ))}
      </div>

      {/* AWAL: PERUBAAN PAGINATION */}
        {/* Pagination */}
      {filteredBarang.length > itemsPerPage && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-6">
          <div className="text-sm text-gray-600">
            Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredBarang.length)}</span> dari{' '}
            <span className="font-semibold text-gray-900">{filteredBarang.length}</span> barang
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => paginate(currentPage - 1)}
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
              onClick={() => paginate(currentPage + 1)}
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
      {/* AKHIR: PERUBAAN PAGINATION */}

      {/* Empty State */}
      {filteredBarang.length === 0 && !isLoading && (
        <div className="text-center py-12">
          <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-700 mb-2">Tidak ada barang yang ditemukan</h3>
          <p className="text-gray-500">Coba gunakan kata kunci pencarian yang berbeda</p>
        </div>
      )}

      {/* Modal Detail Barang - Menggunakan DetailModal */}
      {selectedItem && (
        <DetailModal
          item={selectedItem}
          onClose={closeDetail}
        />
      )}
    </MainLayout>
  );
};

export default KasirDashboard;
