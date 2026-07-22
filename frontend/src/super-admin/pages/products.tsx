// Halaman products.tsx
import React, { useState, useEffect, useCallback, useRef, useMemo } from "react";
import BarangTable from "./component-products/BarangTable";
import ModalBarang, { type BahanBakuItem } from "./component-products/ModalBarang";
import ModalCategory from "./component-products/ModalCategory";
import ModalProduction from "./component-products/ModalProduction";
import type { BarangFormData } from "./component-products/ModalBarang";
import LoadingSpinner from "../../components/LoadingSpinner";
import { SweetAlert } from "../../components/SweetAlert";
import io, { Socket } from 'socket.io-client';
import { ChevronLeft, ChevronRight, TrendingDown, Ban, AlertTriangle, PackageCheck } from "lucide-react";
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import { useSearchParams } from "react-router-dom";  
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

interface SettingsUpdate {
  lowStockAlert?: number
}

export interface BahanBakuFormData {
  nama_produk: string;
  bahan: Array<{
    nama: string;
    harga: number;
    jumlah: number;
  }>;
}

interface SalesStatsItem {
  barang_id: string;
  nama_barang: string;
  total_sold: number;
}

const KATEGORI_API_URL = `${API_URL}/api/super-admin/kategori`;
const SETTINGS_API_URL = `${API_URL}/api/common/settings`;
const BAHAN_BAKU_API_URL = `${API_URL}/api/super-admin/modal-utama`;

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

interface ProductionFormData {
  bahan_baku: Array<{ nama: string; jumlah: number; harga: number }>;
  produk_jadi: { nama_barang: string; kode_barang: string; jumlah_produksi: number };
  chef_id: string;
}

const SuperAdminProducts: React.FC = () => {
  const [dataBarang, setDataBarang] = useState<Barang[]>([]);
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
  const [salesFilter, setSalesFilter] = useState<"all" | "slow-moving" | "never-sold">("all");
  const [salesData, setSalesData] = useState<Map<string, number>>(new Map());
  const [salesLoading, setSalesLoading] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [stockFilter, setStockFilter] = useState<"all" | "low-stock" | "available">(
    () => (searchParams.get('filter') === 'low-stock' ? 'low-stock' : 'all')
  );

  // Tambahkan useEffect ini untuk membersihkan URL setelah state terbaca
  useEffect(() => {
    if (searchParams.get('filter')) {
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    margin: 30
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
      
      setSettingsLoaded(true);
    } catch (err) {
      console.error("Gagal mengambil pengaturan:", err);
      setSettings({
        globalDiscount: 10,
        taxRate: 6,
        serviceCharge: 5.26
      });
      setSettingsLoaded(true);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const fetchSalesStats = useCallback(async () => {
    setSalesLoading(true);
    try {
      const response = await fetch(
        `${API_URL}/api/super-admin/stok-barang/sales-stats?days=30`,
        {
          headers: getAuthHeaders(true),
        }
      );
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      const data: SalesStatsItem[] = await response.json();

      const salesMap = new Map<string, number>();
      data.forEach((item) => {
        salesMap.set(item.barang_id, item.total_sold);
      });
      setSalesData(salesMap);
    } catch (err) {
      console.error("Gagal mengambil data penjualan:", err);
    } finally {
      setSalesLoading(false);
    }
  }, []);

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
      const response = await fetch(`${API_URL}/api/super-admin/stok-barang/productions`, {
        headers: getAuthHeaders(true),
      });
      if (response.ok) {
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
      const res = await fetch(`${API_URL}/api/super-admin/stok-barang`, {
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

    socketRef.current.on('barang:deleted', (payload: { id: string; nama?: string }) => {
      const { id } = payload;
      setDataBarang(prevData => 
        prevData.filter(item => item._id !== id)
      );
    });

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
      fetchSalesStats();
    }
  }, [fetchBarang, fetchKategori, fetchBahanBaku, fetchSalesStats, settingsLoaded]);

  // ===== Reset page saat ganti filter =====
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, kategoriFilter, salesFilter, stockFilter]);

  // ===== Filter logic =====
  const filteredBarang = (() => {
    // Step 1: Filter pencarian & kategori
    let result = dataBarang.filter(
      (item) =>
        (item.nama ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.kode ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.kategori ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(
      (item) => kategoriFilter === "" || item.kategori === kategoriFilter
    );

    // Step 2: Filter berdasarkan status stok (BARU)
    if (stockFilter === "low-stock") {
      result = result.filter((item) => {
        return item.status === "hampir habis" || item.status === "habis" ||
               (item.stok <= (item.stokMinimal || lowStockAlert));
      });
    } else if (stockFilter === "available") {
      result = result.filter((item) => {
        return item.status === "aman" && item.stok > (item.stokMinimal || lowStockAlert);
      });
    }

    // Step 3: Filter berdasarkan penjualan
    if (salesFilter === "never-sold") {
      result = result.filter((item) => {
        const sold = salesData.get(item._id);
        return sold === undefined || sold === 0;
      });
    } else if (salesFilter === "slow-moving") {
      const productsWithSales = result
        .map((item) => ({
          ...item,
          totalSold: salesData.get(item._id) ?? 0,
        }))
        .filter((item) => item.totalSold > 0);

      productsWithSales.sort((a, b) => a.totalSold - b.totalSold);

      const bottomCount = Math.max(1, Math.ceil(productsWithSales.length * 0.2));
      const bottomProducts = new Set(
        productsWithSales.slice(0, bottomCount).map((p) => p._id)
      );

      result = result.filter((item) => bottomProducts.has(item._id));
    }

    return result;
  })();

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
      margin: 30
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
        bahanBaku: barang.bahanBaku || [],
        margin: barang.margin || 30
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
        
        const res = await fetch(`${API_URL}/api/super-admin/stok-barang/${id}`, {
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
      
      const res = await fetch(`${API_URL}/api/super-admin/stok-barang/${id}/status`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status }),
      });
      
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      
      SweetAlert.close();
      
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
      payload.append("use_discount", formData.useDiscount ? "true" : "false");
      payload.append("margin", formData.margin?.toString() || "30");
      
      if (isEditing && editId) {
        const existingBarang = dataBarang.find(item => item._id === editId);
        payload.append("status", existingBarang?.statusBarang || "pending");
      } else {
        payload.append("status", "pending");
      }
      
      if (formData.bahanBaku && formData.bahanBaku.length > 0) {
        payload.append("bahan_baku", JSON.stringify(formData.bahanBaku));
      }

      if (formData.gambar) {
        payload.append("gambar", formData.gambar);
      }

      await SweetAlert.loading(isEditing ? "Mengupdate barang..." : "Menambahkan barang...");

      let res: Response;
      if (isEditing && editId) {
        res = await fetch(`${API_URL}/api/super-admin/stok-barang/${editId}`, {
          method: "PUT",
          headers: getAuthHeaders(),
          body: payload,
        });
      } else {
        res = await fetch(`${API_URL}/api/super-admin/stok-barang`, {
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
      const response = await fetch(`${API_URL}/api/super-admin/stok-barang/production`, {
        method: 'POST',
        headers: getAuthHeaders(true),
        body: JSON.stringify(productionData),
      });

      if (!response.ok) {
        throw new Error('Failed to create production');
      }
      await SweetAlert.success("Production berhasil dibuat");
      fetchProductions();
    } catch (error) {
      console.error('Error creating production:', error);
      SweetAlert.error("Gagal membuat production");
    }
  };

  // Helper: hitung jumlah per status untuk badge
  const stockCounts = useMemo(() => {
    const base = dataBarang.filter(
      (item) =>
        (item.nama ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.kode ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.kategori ?? "").toLowerCase().includes(searchTerm.toLowerCase())
    ).filter(
      (item) => kategoriFilter === "" || item.kategori === kategoriFilter
    );

    return {
      lowStock: base.filter((item) =>
        item.status === "hampir habis" || item.status === "habis" ||
        item.stok <= (item.stokMinimal || lowStockAlert)
      ).length,
      available: base.filter((item) =>
        item.status === "aman" && item.stok > (item.stokMinimal || lowStockAlert)
      ).length,
    };
  }, [dataBarang, searchTerm, kategoriFilter, lowStockAlert]);

  return (
    <div className="p-3 sm:p-6 bg-gray-50 min-h-screen">
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <LoadingSpinner />
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 mb-6">
            <div className="mb-6">
              <h1 className="text-xl sm:text-3xl font-bold text-gray-800">Daftar Barang</h1>
            </div>
          <div className="flex flex-col gap-4 mb-6">
  {/* Baris 1: Search & Kategori */}
  <div className="flex flex-col sm:flex-row gap-3">
    <select
      className="px-3 py-2 border border-gray-300 rounded-lg w-full sm:w-48 text-sm"
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
      className="px-3 py-2 border border-gray-300 rounded-lg w-auto text-sm"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value)}
      disabled={actionLoading}
    />
    <button
      onClick={() => setShowCategoryModal(true)}
      className="w-full sm:w-auto px-5 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center"
      disabled={actionLoading}
    >
      Tambah Kategori
    </button>
  </div>

  {/* Baris 2: Filter grup + tombol kategori */}
  <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:flex-wrap">
    {/* ===== FILTER STOK STATUS ===== */}
    <div className="grid grid-cols-3 sm:flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200 gap-0.5">
      <button
        onClick={() => setStockFilter("all")}
        className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          stockFilter === "all"
            ? "bg-white text-gray-800 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Semua
      </button>
      <button
        onClick={() => setStockFilter("low-stock")}
        className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          stockFilter === "low-stock"
            ? "bg-yellow-500 text-white shadow-sm"
            : "text-gray-500 hover:text-yellow-600"
        }`}
        title="Produk dengan stok di bawah batas minimum"
      >
        <AlertTriangle className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Hampir Habis</span>
        <span className="sm:hidden">Low</span>
        {stockCounts.lowStock > 0 && stockFilter !== "low-stock" && (
          <span className="ml-0.5 min-w-[16px] h-[16px] px-1 flex items-center justify-center text-[9px] font-bold text-yellow-700 bg-yellow-100 rounded-full">
            {stockCounts.lowStock > 9 ? '9+' : stockCounts.lowStock}
          </span>
        )}
      </button>
      <button
        onClick={() => setStockFilter("available")}
        className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          stockFilter === "available"
            ? "bg-green-500 text-white shadow-sm"
            : "text-gray-500 hover:text-green-600"
        }`}
        title="Produk dengan stok di atas batas minimum"
      >
        <PackageCheck className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Tersedia</span>
        <span className="sm:hidden">Ok</span>
      </button>
    </div>

    {/* ===== FILTER SALES PERFORMANCE ===== */}
    <div className="grid grid-cols-3 sm:flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200 gap-0.5">
      <button
        onClick={() => setSalesFilter("all")}
        disabled={salesLoading}
        className={`px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          salesFilter === "all"
            ? "bg-white text-gray-800 shadow-sm"
            : "text-gray-500 hover:text-gray-700"
        }`}
      >
        Semua
      </button>
      <button
        onClick={() => setSalesFilter("slow-moving")}
        disabled={salesLoading}
        className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          salesFilter === "slow-moving"
            ? "bg-amber-500 text-white shadow-sm"
            : "text-gray-500 hover:text-amber-600"
        }`}
        title="20% produk dengan penjualan paling sedikit dalam 30 hari"
      >
        <TrendingDown className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Slow Moving</span>
        <span className="sm:hidden">Slow</span>
      </button>
      <button
        onClick={() => setSalesFilter("never-sold")}
        disabled={salesLoading}
        className={`flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
          salesFilter === "never-sold"
            ? "bg-red-500 text-white shadow-sm"
            : "text-gray-500 hover:text-red-600"
        }`}
        title="Produk yang tidak terjual sama sekali dalam 30 hari"
      >
        <Ban className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Never Sold</span>
        <span className="sm:hidden">0 Sold</span>
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
              {/* ===== INFO BADGE FILTER AKTIF ===== */}
              <div className="flex flex-col gap-2 mb-4">
                {stockFilter !== "all" && (
                  <div className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                    stockFilter === "low-stock"
                      ? "bg-yellow-50 border border-yellow-200"
                      : "bg-green-50 border border-green-200"
                  }`}>
                    {stockFilter === "low-stock" ? (
                      <>
                        <AlertTriangle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                        <span className="text-sm text-yellow-700">
                          Menampilkan <strong>Hampir Habis</strong> — produk dengan stok di bawah batas minimum
                          ({filteredBarang.length} produk)
                        </span>
                      </>
                    ) : (
                      <>
                        <PackageCheck className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm text-green-700">
                          Menampilkan <strong>Tersedia</strong> — produk dengan stok aman di atas batas minimum
                          ({filteredBarang.length} produk)
                        </span>
                      </>
                    )}
                  </div>
                )}
                {salesFilter !== "all" && (
                  <div className={`px-4 py-3 rounded-lg flex items-center gap-2 ${
                    salesFilter === "slow-moving"
                      ? "bg-amber-50 border border-amber-200"
                      : "bg-red-50 border border-red-200"
                  }`}>
                    {salesFilter === "slow-moving" ? (
                      <>
                        <TrendingDown className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <span className="text-sm text-amber-700">
                          Menampilkan <strong>Slow Moving</strong> — 20% produk dengan penjualan paling sedikit dalam 30 hari terakhir
                          ({filteredBarang.length} produk)
                        </span>
                      </>
                    ) : (
                      <>
                        <Ban className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700">
                          Menampilkan <strong>Never Sold</strong> — produk yang tidak terjual sama sekali dalam 30 hari terakhir
                          ({filteredBarang.length} produk)
                        </span>
                      </>
                    )}
                  </div>
                )}
              </div>

              <BarangTable
                data={currentItems}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onUpdateStatus={handleUpdateStatus}
                bahanBakuList={bahanBakuList}
                salesData={salesData}
                activeSalesFilter={salesFilter}
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
                    
                    <div className="flex items-center gap-1 flex-wrap justify-center">
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
        className={`w-8 h-8 sm:w-10 sm:h-10 text-sm sm:text-base rounded-lg font-medium transition-all ${
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

export default SuperAdminProducts;