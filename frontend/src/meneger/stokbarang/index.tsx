import type { Barang } from "../../admin/stok-barang";
import MenegerLayout from "../layout";
import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import LoadingSpinner from "../../components/LoadingSpinner";
import StokCard from "./StokCard";
import DetailModal from "./DetailModal";
import StokSummary from "./StokSummary";
import StokFilter from "./StokFilter";
import io, { Socket } from 'socket.io-client';
import { 
  Package, 
  Search, 
  XCircle, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight 
} from 'lucide-react';
import { API_URL } from '../../config/api';

const API_BASE_URL = `${API_URL}`;

// Definisikan tipe untuk data yang diterima dari API
interface ApiBarang {
  _id: string;
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

interface UpdateStokData {
  id: string;
  stok: number;
}

interface BarangDihapusData {
  id: string;
  nama?: string;
}

interface UpdatePengaturan {
  lowStockAlert?: number;
}

interface StokBarangManagerProps {
  dataBarang: Barang[];
  isLoading?: boolean;
}

export default function StokBarangManager({
  dataBarang: dataAwalBarang,
  isLoading = false,
}: StokBarangManagerProps) {
  const getAuthHeaders = (withJson = false): Record<string, string> => {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = withJson ? { 'Content-Type': 'application/json' } : {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return headers;
  };

  const [dataBarang, setDataBarang] = useState<Barang[]>(dataAwalBarang || []);
  const [produkDipilih, setProdukDipilih] = useState<Barang | null>(null);
  const [kataPencarian, setKataPencarian] = useState("");
  const [filterKategori, setFilterKategori] = useState("");
  const [filterStatusStok, setFilterStatusStok] = useState("");
  const [sedangMemuatSocket, setSedangMemuatSocket] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serverError, setServerError] = useState(false);
  const [batasStokRendah, setBatasStokRendah] = useState(5);
  const [pengaturanDimuat, setPengaturanDimuat] = useState(false);
  const [halamanAktif, setHalamanAktif] = useState(1);
  const [itemPerHalaman] = useState(12);
  const socketRef = useRef<Socket | null>(null);

  // Fungsi untuk normalisasi data
  const normalisasiDataBarang = useCallback((barang: ApiBarang): Barang => {
    return {
      _id: barang._id || '',
      kode: barang.kode || barang.kode_barang || '',
      nama: barang.nama || barang.nama_barang || 'Tanpa Nama',
      kategori: barang.kategori || 'Lainnya',
      hargaBeli: barang.hargaBeli || barang.harga_beli || 0,
      hargaJual: barang.hargaJual || barang.harga_jual || 0,
      stok: barang.stok || 0,
      stok_awal: barang.stok || 0,
      stokMinimal: barang.stokMinimal || barang.stok_minimal || batasStokRendah,
      hargaFinal: barang.hargaFinal || 0,
      gambarUrl: barang.gambarUrl || barang.gambar_url || '',
      status: barang.status || 'aman',
      useDiscount: barang.useDiscount || barang.use_discount || true,
      margin: barang.margin || 30,
      bahanBaku: barang.bahan_baku || []
    };
  }, [batasStokRendah]);

  // Fetch pengaturan
  const ambilPengaturan = useCallback(async () => {
    try {
      console.log("Mengambil data pengaturan...");
      const PENGATURAN_API_URL = `${API_BASE_URL}/api/manager/settings`;
      const res = await fetch(PENGATURAN_API_URL, {
        headers: getAuthHeaders(true)
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const dataPengaturan = await res.json();
      
      console.log("Data pengaturan yang diterima:", dataPengaturan);
      
      if (dataPengaturan.lowStockAlert !== undefined) {
        setBatasStokRendah(dataPengaturan.lowStockAlert);
        console.log("Batas stok rendah diset ke:", dataPengaturan.lowStockAlert);
      }
      
      setPengaturanDimuat(true);
    } catch (err) {
      console.error("Gagal mengambil pengaturan:", err);
      setBatasStokRendah(5);
      setPengaturanDimuat(true);
    }
  }, []);

  // Inisialisasi Socket.io
  const inisialisasiSocket = useCallback(() => {
    try {
      const token = localStorage.getItem('token');
      console.log('Menginisialisasi socket dengan token:', token ? 'Ada' : 'Tidak ada');
      
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
      
      socketRef.current = io(API_BASE_URL, {
        auth: {
          token: token
        }
      });
      
      socketRef.current.on('connect', () => {
        console.log('Socket terhubung dengan ID:', socketRef.current?.id);
        socketRef.current?.emit('joinRoom', 'barang');
      });
      
      socketRef.current.on('disconnect', (alasan) => {
        console.log('Socket terputus. Alasan:', alasan);
      });
      
      socketRef.current.on('connect_error', (error) => {
        console.error('Kesalahan koneksi socket:', error);
      });
      
      // Listener untuk perubahan barang
      socketRef.current.on('barang:updated', (barangDiperbarui: ApiBarang) => {
        console.log('Menerima event barang:updated:', barangDiperbarui);
        const barangNormalisasi = normalisasiDataBarang(barangDiperbarui);
        setDataBarang(daftarSebelumnya => 
          daftarSebelumnya.map(item => item._id === barangNormalisasi._id ? barangNormalisasi : item)
        );
      });
      
      // Listener untuk perubahan stok
      socketRef.current.on('stockUpdated', (data: UpdateStokData) => {
        console.log('Menerima event stockUpdated:', data);
        setDataBarang(daftarSebelumnya => 
          daftarSebelumnya.map(item => {
            if (item._id === data.id) {
              const stokBaru = data.stok;
              const status = stokBaru <= 0 
                ? "habis" 
                : stokBaru <= (item.stokMinimal || batasStokRendah) 
                  ? "hampir habis" 
                  : "aman";
              return { 
                ...item, 
                stok: stokBaru,
                status
              };
            }
            return item;
          })
        );
      });
      
      // Listener untuk barang baru
      socketRef.current.on('barang:created', (barangBaru: ApiBarang) => {
        console.log('Menerima event barang:created:', barangBaru);
        const barangNormalisasi = normalisasiDataBarang(barangBaru);
        setDataBarang(daftarSebelumnya => [...daftarSebelumnya, barangNormalisasi]);
      });
      
      // Listener untuk barang yang dihapus
      socketRef.current.on('barang:deleted', (payload: BarangDihapusData) => {
        console.log('Menerima event barang:deleted:', payload);
        setDataBarang(daftarSebelumnya => daftarSebelumnya.filter(item => item._id !== payload.id));
      });
      
      // Listener untuk perubahan pengaturan
      socketRef.current.on('settings:updated', (pengaturanDiperbarui: UpdatePengaturan) => {
        console.log('Menerima event settings:updated:', pengaturanDiperbarui);
        
        if (pengaturanDiperbarui.lowStockAlert !== undefined) {
          const batasStokRendahBaru = pengaturanDiperbarui.lowStockAlert;
          setBatasStokRendah(batasStokRendahBaru);
          console.log("Batas stok rendah diperbarui ke:", batasStokRendahBaru);
          
          setDataBarang(dataSebelumnya => 
            dataSebelumnya.map(item => ({
              ...item,
              stokMinimal: batasStokRendahBaru
            }))
          );
        }
      });
      
    } catch (socketError) {
      console.error('Kesalahan saat menginisialisasi socket:', socketError);
    }
  }, [batasStokRendah, normalisasiDataBarang]);

  // Fetch data dari server
  const ambilData = useCallback(async () => {
    try {
      setSedangMemuatSocket(true);
      setError(null);
      setServerError(false);
      
      console.log('Mengambil data dari:', `${API_BASE_URL}/api/manager/stok-barang`);
      
      const response = await fetch(`${API_BASE_URL}/api/manager/stok-barang`, {
        headers: getAuthHeaders(true)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Data diterima:', data);
      
      // Normalisasi data
      const dataNormalisasi = Array.isArray(data) ? data.map(normalisasiDataBarang) : [];
      setDataBarang(dataNormalisasi);
      setSedangMemuatSocket(false);
      
      // Inisialisasi socket setelah data berhasil dimuat
      inisialisasiSocket();
      
    } catch (error) {
      console.error('Kesalahan saat mengambil data:', error);
      setError('Gagal memuat data barang. Silakan coba lagi.');
      setServerError(true);
      setSedangMemuatSocket(false);
      
      // Gunakan data awal jika ada
      if (dataAwalBarang && dataAwalBarang.length > 0) {
        setDataBarang(dataAwalBarang);
      }
    }
  }, [inisialisasiSocket, normalisasiDataBarang, dataAwalBarang]);

  useEffect(() => {
    // Ambil pengaturan terlebih dahulu
    ambilPengaturan();
  }, [ambilPengaturan]);

  useEffect(() => {
    // Hanya jalankan jika pengaturan sudah dimuat
    if (pengaturanDimuat) {
      // Jika sudah ada data awal, tidak perlu loading
      if (dataAwalBarang && dataAwalBarang.length > 0) {
        inisialisasiSocket();
        return;
      }
      
      // Ambil data dari server
      ambilData();
      
      // Ambil data setiap 30 detik sebagai cadangan
      const interval = setInterval(ambilData, 30000);
      
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
  }, [ambilData, inisialisasiSocket, dataAwalBarang, pengaturanDimuat]);

  // Dapatkan semua kategori unik dari dataBarang
  const kategoriUnik = useMemo(() => {
    return Array.from(
      new Set(dataBarang.map((item) => item.kategori.toLowerCase()))
    );
  }, [dataBarang]);

  const barangTersaring = useMemo(() => {
    return dataBarang.filter((item) => {
      // Filter berdasarkan pencarian
      const cocokPencarian =
        item.nama.toLowerCase().includes(kataPencarian.toLowerCase()) ||
        (item.kode?.toLowerCase().includes(kataPencarian.toLowerCase()) || false) ||
        item.kategori.toLowerCase().includes(kataPencarian.toLowerCase());
      
      // Filter berdasarkan kategori
      const cocokKategori = 
        filterKategori === "" || 
        item.kategori.toLowerCase() === filterKategori.toLowerCase();
      
      // Filter berdasarkan status stok
      let cocokStatusStok = true;
      if (filterStatusStok === "tersedia") {
        cocokStatusStok = item.stok > batasStokRendah;
      } else if (filterStatusStok === "terbatas") {
        cocokStatusStok = item.stok > 0 && item.stok <= batasStokRendah;
      } else if (filterStatusStok === "habis") {
        cocokStatusStok = item.stok === 0;
      }
      
      return cocokPencarian && cocokKategori && cocokStatusStok;
    });
  }, [dataBarang, kataPencarian, filterKategori, filterStatusStok, batasStokRendah]);

  // Logika pagination
  const indeksItemTerakhir = halamanAktif * itemPerHalaman;
  const indeksItemPertama = indeksItemTerakhir - itemPerHalaman;
  const itemSaatIni = barangTersaring.slice(indeksItemPertama, indeksItemTerakhir);
  const totalHalaman = Math.ceil(barangTersaring.length / itemPerHalaman);

  const paginasi = (nomorHalaman: number) => setHalamanAktif(nomorHalaman);

  // 🔹 Kalau masih loading → tampilkan spinner overlay
  if (isLoading || sedangMemuatSocket) {
    return (
      <MenegerLayout>
        <div className="fixed inset-0 flex items-center justify-center bg-white bg-opacity-80 z-50">
          <LoadingSpinner />
        </div>
      </MenegerLayout>
    );
  }

  // 🔹 Cek apakah server mati (dataBarang kosong)
  const serverMati = dataBarang.length === 0;

  // 🔹 Tampilkan error state jika ada
  if (serverError) {
    return (
      <MenegerLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <XCircle className="h-16 w-16 mx-auto text-red-500 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">Terjadi Kesalahan</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="h-4 w-4" />
              Muat Ulang
            </button>
          </div>
        </div>
      </MenegerLayout>
    );
  }

  return (
    <MenegerLayout>
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-gray-800 mb-2">
            Stok Barang
          </h2>
          <p className="text-gray-600">Monitor dan kelola stok barang</p>
        </div>
        
        {/* Info Jumlah Barang */}
        <div className="bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 flex items-center gap-2">
          <Package className="h-5 w-5 text-blue-600" />
          <p className="text-blue-800 font-medium">
            Total: <span className="font-bold">{barangTersaring.length}</span> barang
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
            value={kataPencarian}
            onChange={(e) => setKataPencarian(e.target.value)}
          />
        </div>
      </div>

      {/* Filter Komponen - Hanya tampilkan jika server tidak mati */}
      {!serverMati && (
        <StokFilter
          uniqueCategories={kategoriUnik}
          onSearchChange={setKataPencarian}
          onCategoryChange={setFilterKategori}
          onStockStatusChange={setFilterStatusStok}
        />
      )}

      {/* Ringkasan Stok - Hanya tampilkan jika server tidak mati */}
      {!serverMati && <StokSummary dataBarang={dataBarang} />}

      {/* Barang Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {serverMati ? (
          // Tampilan ketika server mati
          <div className="col-span-full flex flex-col items-center justify-center py-12">
            <img
              src="../images/nostokbarang.jpg"
              alt="Server tidak tersedia"
              className="max-w-md w-full h-auto rounded-lg shadow-lg mb-6"
            />
            <h3 className="text-xl font-medium text-gray-700 mb-2">
              Server Tidak Tersedia
            </h3>
            <p className="text-gray-500 text-center max-w-md">
              Tidak dapat terhubung ke server. Silakan periksa koneksi internet Anda atau hubungi administrator.
            </p>
          </div>
        ) : itemSaatIni.length > 0 ? (
          // Tampilkan barang jika ada hasil filter
          itemSaatIni.map((item) => (
            <StokCard
              key={item._id}
              item={item}
              onSelect={setProdukDipilih}
            />
          ))
        ) : (
          // Tampilkan pesan tidak ada hasil filter
          <div className="col-span-full text-center py-12">
            <Package className="h-16 w-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-700 mb-2">
              Barang tidak ditemukan
            </h3>
            <p className="text-gray-500">
              Coba gunakan kata kunci pencarian yang berbeda
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalHalaman > 1 && (
  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-6">
    {/* Teks Informasi - Ganti dengan variabel yang sesuai */}
    <div className="text-sm text-gray-600">
      Menampilkan <span className="font-semibold text-gray-900">{indeksItemPertama + 1}-{Math.min(indeksItemTerakhir, barangTersaring.length)}</span> dari{' '}
      <span className="font-semibold text-gray-900">{barangTersaring.length}</span> barang
    </div>
    
    {/* Kontrol Pagination */}
    <div className="flex items-center gap-2">
      <button
        onClick={() => paginasi(halamanAktif - 1)}
        disabled={halamanAktif === 1}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
          halamanAktif === 1 
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
            : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
        }`}
      >
        <ChevronLeft className="h-4 w-4" />
        <span className="hidden sm:inline">Sebelumnya</span>
      </button>
      
      <div className="flex items-center gap-1">
        {Array.from({ length: Math.min(5, totalHalaman) }, (_, i) => {
          let nomorHalaman;
          if (totalHalaman <= 5) {
            nomorHalaman = i + 1;
          } else if (halamanAktif <= 3) {
            nomorHalaman = i + 1;
          } else if (halamanAktif >= totalHalaman - 2) {
            nomorHalaman = totalHalaman - 4 + i;
          } else {
            nomorHalaman = halamanAktif - 2 + i;
          }
          
          return (
            <button
              key={nomorHalaman}
              onClick={() => paginasi(nomorHalaman)}
              className={`w-9 h-9 rounded-lg font-medium text-sm transition-all ${
                halamanAktif === nomorHalaman 
                  ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md scale-105' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {nomorHalaman}
            </button>
          );
        })}
      </div>
      
      <button
        onClick={() => paginasi(halamanAktif + 1)}
        disabled={halamanAktif === totalHalaman}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
          halamanAktif === totalHalaman 
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

      {/* Modal Detail Barang */}
      <DetailModal
        item={produkDipilih}
        onClose={() => setProdukDipilih(null)}
      />
    </MenegerLayout>
  );
}
