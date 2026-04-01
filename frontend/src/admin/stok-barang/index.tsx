// src/admin/stok-barang/index.tsx
import React, { useState, useEffect, useCallback, useRef } from "react";
import BarangTable from "./BarangTable";
import ModalBarang, { type BahanBakuItem } from "./ModalBarang";
import ModalCategory from "./ModalCategory";
import ModalProduction from "./ModalProduction";
import type { BarangFormData } from "./ModalBarang";
import LoadingSpinner from "../../components/LoadingSpinner";
import { SweetAlert } from "../../components/SweetAlert";
import io, { Socket } from 'socket.io-client';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
const API_KEY = import.meta.env.VITE_API_KEY;


export interface BarangAPI {
  _id: string;
  kode_barang: string;
  nama_barang: string;
  kategori: string;
  harga_beli: number;
  harga_jual: number;
  stok: number;
  stok_awal: number;
  stok_minimal?: number;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
  hargaFinal?: number;
  gambar_url?: string;
  status?: string;
  status_publish?: string;
  status_stok?: string;
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

export interface Barang {
  _id: string;
  kode: string;
  nama: string;
  kategori: string;
  hargaBeli: number;
  hargaJual: number;
  stok: number;
  stok_awal: number
  stokMinimal?: number;
  hargaFinal?: number;
  gambarUrl?: string;
  status?: string;
  statusBarang?: string;
  useDiscount?: boolean;
  margin?: number;
  bahanBaku?: Array<{
    nama_produk: string;
    bahan: Array<{
      nama: string;
      harga: number;
      jumlah: number;
    }>;
  }>;
}

interface KategoriAPI {
  _id: string;
  nama: string;
  createdAt?: string;
  updatedAt?: string;
  __v?: number;
}

interface ListBarangProps {
  dataBarang: Barang[];
  setDataBarang: React.Dispatch<React.SetStateAction<Barang[]>>;
}

interface SettingsUpdate {
  lowStockAlert?: number
}

// Tambahkan definisi BahanBakuFormData
export interface BahanBakuFormData {
  nama_produk: string;
  bahan: Array<{
    nama: string;
    harga: number;
    jumlah: number;
  }>;
}

const KATEGORI_API_URL = `${API_URL}/api/admin/kategori`;
const SETTINGS_API_URL = `${API_URL}/api/admin/settings`;
const BAHAN_BAKU_API_URL = `${API_URL}/api/admin/modal-utama`;

interface ApiError extends Error {
  message: string;
}

interface BahanBakuAPI {
  nama_produk: string;
  total_porsi?: number;
  modal_per_porsi?: number;
  bahan: Array<{
    nama: string;
    harga: number;
    jumlah: number;
  }>;
}

// Production form type (matches ModalProduction)
interface ProductionFormData {
  bahan_baku: Array<{ nama: string; jumlah: number; harga: number }>;
  produk_jadi: { nama_barang: string; kode_barang: string; jumlah_produksi: number };
  chef_id: string;
}

const StokBarangAdmin: React.FC<ListBarangProps> = ({ dataBarang, setDataBarang }) => {
  const socketRef = useRef<Socket | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showProductionModal, setShowProductionModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [kategoriFilter, setKategoriFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [kategoriList, setKategoriList] = useState<string[]>([]);
  const [lowStockAlert, setLowStockAlert] = useState(5);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [bahanBakuList, setBahanBakuList] = useState<BahanBakuItem[]>([]);

  const getAuthHeaders = (json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };
  
  const [formData, setFormData] = useState<BarangFormData>({
    kode: "",
    nama: "",
    kategori: "",
    hargaBeli: "",
    hargaJual: "",
    stok: "",
    gambarUrl: "",
    gambar: null,
    useDiscount: true,
    bahanBaku: [],
    margin: 30 // Default 30%
  });

  const generateRandomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 9; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  };

  const fetchBahanBaku = useCallback(async () => {
    try {
      const response = await fetch(BAHAN_BAKU_API_URL, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data = await response.json();
      
      const bahanBakuData: BahanBakuItem[] = [];
      if (data.bahan_baku && Array.isArray(data.bahan_baku)) {
        data.bahan_baku.forEach((produk: BahanBakuAPI) => {
          if (produk.nama_produk && produk.bahan && Array.isArray(produk.bahan)) {
            bahanBakuData.push({
              nama_produk: produk.nama_produk,
              total_porsi: produk.total_porsi || 0,
              modal_per_porsi: produk.modal_per_porsi || 0,
              bahan: produk.bahan.map((b: { nama: string; harga: number; jumlah: number }) => ({
                nama: b.nama,
                harga: b.harga,
                jumlah: b.jumlah
              }))
            });
          }
        });
      }
      
      setBahanBakuList(bahanBakuData);
    } catch (err) {
      console.error("Gagal mengambil data bahan baku:", err);
    }
  }, []);

const [settings, setSettings] = useState({
  globalDiscount: 0,
  taxRate: 0,
  serviceCharge: 0
});

const fetchSettings = useCallback(async () => {
  try {
    const res = await fetch(SETTINGS_API_URL, {
      headers: getAuthHeaders(true)
    });
    
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const settingsData = await res.json();
    
    setSettings({
      globalDiscount: settingsData.globalDiscount || 10,
      taxRate: settingsData.taxRate || 6,
      serviceCharge: settingsData.serviceCharge || 5.26
    });
    
    // Set settingsLoaded ke true setelah berhasil mengambil data
    setSettingsLoaded(true);
  } catch (err) {
    console.error("Gagal mengambil pengaturan:", err);
    // Tetapkan nilai default jika gagal
    setSettings({
      globalDiscount: 10,
      taxRate: 6,
      serviceCharge: 5.26
    });
    
    // Tetap set settingsLoaded ke true meskipun gagal
    setSettingsLoaded(true);
  }
}, []);

  useEffect(() => {
  fetchSettings();
}, [fetchSettings]);

  const fetchKategori = useCallback(async () => {
    try {
      const res = await fetch(KATEGORI_API_URL, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: KategoriAPI[] = await res.json();
      
      const kategoriNames = data.map((item: KategoriAPI) => item.nama);
      setKategoriList(kategoriNames);
      
      if (kategoriNames.length > 0 && !formData.kategori) {
        setFormData(prev => ({
          ...prev,
          kategori: kategoriNames[0]
        }));
      }
    } catch (err) {
      console.error("Gagal ambil data kategori:", err);
      setKategoriList(["Makanan", "Minuman", "Cemilan", "Signature"]);
      if (!formData.kategori) {
        setFormData(prev => ({
          ...prev,
          kategori: "Makanan"
        }));
      }
    }
  }, [formData.kategori]);

  const fetchProductions = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/stok-barang/productions`, {
        headers: getAuthHeaders(true),
      });
      if (response.ok) {
        // productions fetched but not stored in state because it's unused
        await response.json();
      }
    } catch (error) {
      console.error('Error fetching productions:', error);
    }
  }, []);

  useEffect(() => {
    fetchProductions();
  }, [fetchProductions]);

  const fetchBarang = useCallback(async () => {
    setLoading(true);
    setServerError(false);
    try {
      const res = await fetch(`${API_URL}/api/admin/stok-barang`, {
        headers: getAuthHeaders(true),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: BarangAPI[] = await res.json();
      
      const mapped: Barang[] = data.map((item) => ({
        _id: item._id,
        kode: item.kode_barang,
        nama: item.nama_barang,
        kategori: item.kategori,
        hargaBeli: item.harga_beli,
        hargaJual: item.harga_jual,
        stok: item.stok,
        stok_awal: item.stok_awal,
        stokMinimal: item.stok_minimal || lowStockAlert,
        hargaFinal: item.hargaFinal,
        gambarUrl: item.gambar_url,
        status: item.status_stok || item.status || "aman",
        statusBarang: item.status_publish || item.status || "pending",
        useDiscount: typeof item.use_discount !== 'undefined' ? item.use_discount : true,
        margin: item.margin,
        bahanBaku: item.bahan_baku || []
      }));
      
      setDataBarang(mapped);
    } catch (err) {
      console.error("Gagal ambil data:", err);
      setServerError(true);
      SweetAlert.error("Gagal mengambil data barang");
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [setDataBarang, lowStockAlert]);

  useEffect(() => {
    if (!settingsLoaded) return;
    
    socketRef.current = io(`${API_URL}`);
    
    socketRef.current.on('barang:created', (newBarang: BarangAPI) => {
      const mappedBarang: Barang = {
        _id: newBarang._id,
        kode: newBarang.kode_barang,
        nama: newBarang.nama_barang,
        kategori: newBarang.kategori,
        hargaBeli: newBarang.harga_beli,
        hargaJual: newBarang.harga_jual,
        stok: newBarang.stok,
        stok_awal: newBarang.stok_awal,
        stokMinimal: newBarang.stok_minimal || lowStockAlert,
        hargaFinal: newBarang.hargaFinal,
        gambarUrl: newBarang.gambar_url,
        // status: newBarang.status,
        status: newBarang.status_stok || newBarang.status || "aman",
        statusBarang: newBarang.status_publish || newBarang.status || "pending",
        useDiscount: typeof newBarang.use_discount !== 'undefined' ? newBarang.use_discount : true,
        margin: newBarang.margin,
        bahanBaku: newBarang.bahan_baku || []
      };
      
      setDataBarang(prevData => [...prevData, mappedBarang]);
    });

    socketRef.current.on('barang:updated', (updatedBarang: BarangAPI) => {
      const mappedBarang: Barang = {
        _id: updatedBarang._id,
        kode: updatedBarang.kode_barang,
        nama: updatedBarang.nama_barang,
        kategori: updatedBarang.kategori,
        hargaBeli: updatedBarang.harga_beli,
        hargaJual: updatedBarang.harga_jual,
        stok: updatedBarang.stok,
        stok_awal: updatedBarang.stok_awal,
        stokMinimal: updatedBarang.stok_minimal || lowStockAlert,
        hargaFinal: updatedBarang.hargaFinal,
        gambarUrl: updatedBarang.gambar_url,
        // status: updatedBarang.status,
        status: updatedBarang.status_stok || updatedBarang.status || "aman",
        statusBarang: updatedBarang.status_publish || updatedBarang.status || "pending",
        useDiscount: typeof updatedBarang.use_discount !== 'undefined' ? updatedBarang.use_discount : true,
        margin: updatedBarang.margin,
        bahanBaku: updatedBarang.bahan_baku || []
      };
      
      setDataBarang(prevData => 
        prevData.map(item => item._id === updatedBarang._id ? mappedBarang : item)
      );
    });

    // --- PERBAIKAN DI SINI ---
    socketRef.current.on('barang:deleted', (payload: { id: string; nama?: string }) => {
      const { id } = payload;
      setDataBarang(prevData => 
        prevData.filter(item => item._id !== id)
      );
    });
    // --- AKHIR PERBAIKAN ---

    socketRef.current.on('stockUpdated', (data: { id: string; stok: number; status?: string }) => {
      setDataBarang(prevData => 
        prevData.map(item => {
          if (item._id === data.id) {
            return { 
              ...item, 
              stok: data.stok,
              status: data.status || item.status,
              statusBarang: data.status || item.statusBarang
            };
          }
          return item;
        })
      );
    });

    socketRef.current.on('settings:updated', (updatedSettings: SettingsUpdate) => {
      if (updatedSettings.lowStockAlert !== undefined) {
        const newLowStockAlert = updatedSettings.lowStockAlert;
        setLowStockAlert(newLowStockAlert);
        fetchBarang();
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off('barang:created');
        socketRef.current.off('barang:updated');
        socketRef.current.off('barang:deleted');
        socketRef.current.off('stockUpdated');
        socketRef.current.off('settings:updated');
        socketRef.current.disconnect();
      }
    };
  }, [setDataBarang, lowStockAlert, settingsLoaded, fetchBarang]);

  useEffect(() => {
    if (settingsLoaded) {
      fetchBarang();
      fetchKategori();
      fetchBahanBaku();
    }
  }, [fetchBarang, fetchKategori, fetchBahanBaku, settingsLoaded]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, kategoriFilter]);

  const filteredBarang = dataBarang.filter(
    (item) =>
      (item.nama ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.kode ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.kategori ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(
    (item) => kategoriFilter === "" || item.kategori === kategoriFilter
  );

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredBarang.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredBarang.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const resetForm = () => {
    setFormData({
      kode: "",
      nama: "",
      kategori: kategoriList.length > 0 ? kategoriList[0] : "",
      hargaBeli: "",
      hargaJual: "",
      stok: "",
      gambarUrl: "",
      gambar: null,
      useDiscount: true,
      bahanBaku: [],
      margin: 30 // Reset margin ke default
    });
    setIsEditing(false);
    setEditId(null);
  };

  const handleInputChange = (field: keyof BarangFormData, value: string | File | null | boolean | BahanBakuFormData[] | number) => {
    setFormData((prev: BarangFormData) => ({
      ...prev,
      [field]: value
    }));
  };

const handleEdit = (id: string) => {
  const barang = dataBarang.find((item) => item._id === id);
  if (barang) {
    setFormData({
      kode: barang.kode || "",
      nama: barang.nama || "",
      kategori: barang.kategori || (kategoriList.length > 0 ? kategoriList[0] : ""),
      hargaBeli: barang.hargaBeli?.toString() || "",
      hargaJual: barang.hargaJual?.toString() || "",
      stok: barang.stok?.toString() || "",
      gambarUrl: barang.gambarUrl || "",
      gambar: null,
      useDiscount: typeof barang.useDiscount !== 'undefined' ? barang.useDiscount : true,
      bahanBaku: barang.bahanBaku || [], // Pastikan bahanBaku dimuat
      margin: barang.margin || 30 // Gunakan margin dari data barang
    });
    setIsEditing(true);
    setEditId(id);
    setShowModal(true);
  }
};

  const handleDelete = async (id: string) => {
    try {
      const result = await SweetAlert.confirmDelete();
      
      if (result.isConfirmed) {
        await SweetAlert.loading("Menghapus barang...");
        
        const res = await fetch(`${API_URL}/api/admin/stok-barang/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        SweetAlert.close();
        setDataBarang(prevData => prevData.filter(item => item._id !== id));
        await SweetAlert.success("Barang berhasil dihapus");
      }
    } catch (err) {
      console.error("Gagal hapus:", err);
      SweetAlert.close();
      SweetAlert.error("Gagal menghapus barang");
    }
  };

  const handleUpdateStatus = async (id: string, status: string) => {
    try {
      await SweetAlert.loading(`Mengubah status barang ke ${status}...`);
      
      const res = await fetch(`${API_URL}/api/admin/stok-barang/${id}/status`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      SweetAlert.close();
      
      // Update local state
      setDataBarang(prevData => 
        prevData.map(item => 
          item._id === id 
            ? { ...item, status: status, statusBarang: status } 
            : item
        )
      );
      
      await SweetAlert.success(`Status barang berhasil diubah ke ${status}`);
    } catch (err) {
      console.error("Gagal update status:", err);
      SweetAlert.close();
      SweetAlert.error("Gagal mengubah status barang");
    }
  };

  const validateForm = () => {
    if (!formData.kode.trim()) {
      SweetAlert.error("Kode barang harus diisi");
      return false;
    }
    if (!formData.nama.trim()) {
      SweetAlert.error("Nama barang harus diisi");
      return false;
    }
    // Kategori bisa kosong untuk barang yang baru dibuat dari chef (akan diisi admin kemudian)
    // if (!formData.kategori) {
    //   SweetAlert.error("Kategori harus dipilih");
    //   return false;
    // }
    if (!formData.hargaBeli || isNaN(Number(formData.hargaBeli)) || Number(formData.hargaBeli) <= 0) {
      SweetAlert.error("Harga beli harus berupa angka yang valid");
      return false;
    }
    if (!formData.hargaJual || isNaN(Number(formData.hargaJual)) || Number(formData.hargaJual) <= 0) {
      SweetAlert.error("Harga jual harus berupa angka yang valid");
      return false;
    }
    if (!formData.stok || isNaN(Number(formData.stok)) || Number(formData.stok) < 0) {
      SweetAlert.error("Stok harus berupa angka yang valid");
      return false;
    }
    // Gambar bisa kosong untuk barang yang baru dibuat dari chef (akan diupload admin kemudian)
    // if (!isEditing && !formData.gambar) {
    //   SweetAlert.error("Gambar barang harus diunggah untuk barang baru");
    //   return false;
    // }
    return true;
  };

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  if (!validateForm()) {
    return;
  }
  
  setActionLoading(true);
  
  try {
    const payload = new FormData();
    payload.append("kode_barang", formData.kode.trim());
    payload.append("nama_barang", formData.nama.trim());
    payload.append("kategori", formData.kategori.trim());
    payload.append("harga_beli", formData.hargaBeli);
    payload.append("harga_jual", formData.hargaJual);
    payload.append("stok", formData.stok);
    // payload.append("stok_minimal", lowStockAlert.toString()); // Hapus sementara
    payload.append("use_discount", formData.useDiscount ? "true" : "false");
    payload.append("margin", formData.margin?.toString() || "30");
    
    // Tambahkan status - untuk barang baru selalu "pending", untuk update gunakan status yang ada
    if (isEditing && editId) {
      const existingBarang = dataBarang.find(item => item._id === editId);
      payload.append("status", existingBarang?.statusBarang || "pending");
    } else {
      payload.append("status", "pending");
    }
    
    // Perbaikan: Selalu kirim bahan_baku jika ada, bahkan saat update
    if (formData.bahanBaku && formData.bahanBaku.length > 0) {
      payload.append("bahan_baku", JSON.stringify(formData.bahanBaku));
    }

    if (formData.gambar) {
      payload.append("gambar", formData.gambar);
    }

    await SweetAlert.loading(isEditing ? "Mengupdate barang..." : "Menambahkan barang...");

    let res: Response;
    if (isEditing && editId) {
      res = await fetch(`${API_URL}/api/admin/stok-barang/${editId}`, {
        method: "PUT",
        headers: getAuthHeaders(),
        body: payload,
      });
    } else {
      res = await fetch(`${API_URL}/api/admin/stok-barang`, {
        method: "POST",
        headers: getAuthHeaders(),
        body: payload,
      });
    }

    if (!res.ok) {
      let errorMessage = "Gagal menyimpan barang";
      try {
        const errorData = await res.json();
        errorMessage = errorData.message || errorData.error || `HTTP ${res.status}: ${res.statusText}`;
      } catch {
        // Jika bukan JSON, gunakan text response
        const errorText = await res.text();
        errorMessage = errorText || `HTTP ${res.status}: ${res.statusText}`;
      }
      throw new Error(errorMessage);
    }

    SweetAlert.close();
    resetForm();
    setShowModal(false);
    await SweetAlert.success(isEditing ? "Barang berhasil diperbarui" : "Barang berhasil ditambahkan");
    
    fetchBarang();
  } catch (err: unknown) {
    console.error("Gagal submit:", err);
    const error = err as ApiError;
    SweetAlert.close();
    SweetAlert.error(error.message || "Gagal menyimpan barang");
  } finally {
    setActionLoading(false);
  }
};

const handleCreateProduction = async (productionData: ProductionFormData) => {
  try {
    const response = await fetch(`${API_URL}/api/admin/stok-barang/production`, {
      method: 'POST',
      headers: getAuthHeaders(true),
      body: JSON.stringify(productionData),
    });

    if (!response.ok) {
      throw new Error('Failed to create production');
    }
    await SweetAlert.success("Production berhasil dibuat");
    // refresh productions list
    fetchProductions();
  } catch (error) {
    console.error('Error creating production:', error);
    SweetAlert.error("Gagal membuat production");
  }
};

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LoadingSpinner />
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Daftar Barang</h1>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
              <div className="flex gap-2">
                <select
                  className="pl-3 pr-4 py-2 border border-gray-300 rounded-lg w-full"
                  value={kategoriFilter}
                  onChange={(e) => setKategoriFilter(e.target.value)}
                  disabled={actionLoading}
                >
                  <option value="">Semua Kategori</option>
                  {kategoriList.map((kategori) => (
                    <option key={kategori} value={kategori}>
                      {kategori}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Cari barang..."
                  className="pl-3 pr-4 py-2 border border-gray-300 rounded-lg w-full"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  disabled={actionLoading}
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCategoryModal(true)}
                  className="px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center"
                  disabled={actionLoading}
                >
                  Kategori
                </button>
              </div>
            </div>
          </div>

          {serverError ? (
            <div className="text-center py-8">
              <div className="flex justify-center mb-4">
                <img 
                  src="/images/nostokbarang.jpg" 
                  alt="Server Error" 
                  className="w-64 h-64 object-cover rounded-lg shadow-lg"
                />
              </div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">Server Tidak Dapat Dihubungi</h3>
              <p className="text-gray-500 mb-4">Tidak dapat mengambil data barang. Silakan periksa koneksi server atau coba lagi nanti.</p>
              <button
                onClick={fetchBarang}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Coba Lagi
              </button>
            </div>
          ) : loading && initialLoad ? (
            <div className="text-center py-8">
              <LoadingSpinner />
            </div>
          ) : loading ? (
            <div className="text-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>                     
              <BarangTable
                data={currentItems}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUpdateStatus={handleUpdateStatus}
                bahanBakuList={bahanBakuList}
              />
              
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
                  <div className="text-sm text-gray-600">
                    Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredBarang.length)}</span> dari{' '}
                    <span className="font-semibold text-gray-900">{filteredBarang.length}</span> barang
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
            </>
          )}
        </div>
      </div>

      <ModalBarang
        visible={showModal}
        isEditing={isEditing}
        formData={formData}
        onInputChange={handleInputChange}
        onSubmit={handleSubmit}
        onClose={() => {
          setShowModal(false);
          resetForm();
        }}
        loading={actionLoading}
        kategoriOptions={kategoriList}
        bahanBakuList={bahanBakuList}
        onGenerateCode={() => handleInputChange("kode", generateRandomCode())}
        globalDiscount={settings.globalDiscount}
      />

      <ModalCategory
        visible={showCategoryModal}
        onClose={() => {
          setShowCategoryModal(false);
          fetchKategori();
        }}
        onKategoriChange={fetchKategori}
      />

      <ModalProduction
        isOpen={showProductionModal}
        onClose={() => setShowProductionModal(false)}
        onSubmit={handleCreateProduction}
      />
    </div>
  );
};

export default StokBarangAdmin;
