import React, { useState, useEffect, useCallback } from "react";
import PesananTable from "./PesananTable";
import StatusModal from "./StatusModal";
import LoadingSpinner from "../../components/LoadingSpinner";
import { SweetAlert } from "../../components/SweetAlert";
import { API_URL } from "../../config/api";
import { getStoredToken } from "../../auth/storage";
const API_KEY = import.meta.env.VITE_API_KEY;

export interface BarangDibeli {
  kode_barang: string;
  nama_barang: string;
  jumlah: number;
  harga_satuan: number;
  subtotal: number;
  _id: string;
  harga_beli?: number;
  gambar_url?: string; // Tambahkan properti gambar
}

export interface PesananAPI {
  _id: string;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  barang_dibeli: BarangDibeli[];
  total_harga: number;
  metode_pembayaran: string;
  status: string;
  kasir_id: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

export interface Pesanan {
  _id: string;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  barang_dibeli: BarangDibeli[];
  total_harga: number;
  metode_pembayaran: string;
  status: string;
  kasir_id: string;
  createdAt: string;
  updatedAt: string;
}

// Interface untuk data stok barang
interface StokBarang {
  _id: string;
  kode_barang: string;
  nama_barang: string;
  gambar_url?: string;
  // tambahkan properti lain sesuai kebutuhan
}

const STATUS_PESANAN_API_URL = `${API_URL}/api/admin/status-pesanan`;
const STOK_BARANG_URL = `${API_URL}/api/admin/stok-barang`;

const StatusPesananAdmin: React.FC = () => {
  const [pesananData, setPesananData] = useState<Pesanan[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [selectedPesanan, setSelectedPesanan] = useState<{ id: string; status: string } | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const getAuthHeaders = (json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { "x-api-key": API_KEY } : {}),
    };
  };

  // Fungsi untuk mengambil data stok barang
  const fetchStokBarang = useCallback(async () => {
    try {
      const response = await fetch(STOK_BARANG_URL, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      const data: StokBarang[] = await response.json();
      return data;
    } catch (err) {
      console.error("Error fetching stok barang:", err);
      SweetAlert.error("Gagal mengambil data stok barang");
      return [];
    }
  }, []);

  // Fungsi untuk mengambil data pesanan dan menggabungkan dengan data stok barang
  const fetchPesanan = useCallback(async () => {
    setLoading(true);
    try {
      // Ambil data stok barang terlebih dahulu
      const stokBarang = await fetchStokBarang();
      
      // Buat mapping dari kode_barang ke gambar_url
      const stokMap: Record<string, string> = {};
      stokBarang.forEach(item => {
        if (item.kode_barang && item.gambar_url) {
          stokMap[item.kode_barang] = item.gambar_url;
        }
      });

      // Ambil data pesanan
      const response = await fetch(`${STATUS_PESANAN_API_URL}/all`, {
        headers: getAuthHeaders(),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      const data: PesananAPI[] = await response.json();
      
      // Gabungkan data pesanan dengan gambar dari stok barang
      const pesananWithImages = data.map(pesanan => {
        const barangDibeliWithImages = pesanan.barang_dibeli.map(barang => ({
          ...barang,
          gambar_url: stokMap[barang.kode_barang] // Ambil gambar dari mapping
        }));
        
        return {
          ...pesanan,
          barang_dibeli: barangDibeliWithImages
        };
      });
      
      setPesananData(pesananWithImages);
    } catch (err) {
      console.error("Error fetching pesanan:", err);
      SweetAlert.error("Gagal mengambil data pesanan");
    } finally {
      setLoading(false);
    }
  }, [fetchStokBarang]);

  useEffect(() => {
    fetchPesanan();
  }, [fetchPesanan]);

  const filteredPesanan = pesananData.filter(
    (item) =>
      (item.nomor_transaksi ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.metode_pembayaran ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.status ?? "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barang_dibeli?.some(barang => 
        barang.nama_barang.toLowerCase().includes(searchTerm.toLowerCase())
      ) ?? false)
  );

  const handleUpdateStatus = async (id: string, status: string) => {
    setActionLoading(true);
    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "PUT",
        headers: getAuthHeaders(true),
        body: JSON.stringify({ status }),
      });

      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      
      // Update local state
      setPesananData(prevData =>
        prevData.map(item =>
          item._id === id ? { ...item, status } : item
        )
      );
      
      SweetAlert.success("Status berhasil diperbarui");
    } catch (err) {
      console.error("Error updating status:", err);
      SweetAlert.error("Gagal memperbarui status");
    } finally {
      setActionLoading(false);
    }
  };

  const openStatusModal = (id: string, currentStatus: string) => {
    setSelectedPesanan({ id, status: currentStatus });
    setShowModal(true);
  };

  const closeStatusModal = () => {
    setShowModal(false);
    setSelectedPesanan(null);
  };

  // Summary statistics
  const totalPesanan = pesananData.length;
  const pendingPesanan = pesananData.filter(item => item.status === "pending").length;
  const diprosesPesanan = pesananData.filter(item => item.status === "diproses").length;
  const selesaiPesanan = pesananData.filter(item => item.status === "selesai").length;
  const dibatalkanPesanan = pesananData.filter(item => item.status === "dibatalkan").length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Overlay loading */}
      {actionLoading && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <LoadingSpinner />
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Status Pesanan</h1>
              <p className="text-gray-500 mt-1">Kelola status pesanan pelanggan</p>
            </div>
            <div className="mt-4 md:mt-0 flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="Cari pesanan..."
                className="pl-3 pr-4 border border-gray-300 rounded-lg w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={actionLoading}
              />
              <button
                onClick={fetchPesanan}
                className="px-5 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                disabled={actionLoading}
              >
                Refresh Data
              </button>
            </div>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-5 mb-6">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Pesanan</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{totalPesanan}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-yellow-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-yellow-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Pending</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{pendingPesanan}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Diproses</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{diprosesPesanan}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-green-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-green-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Selesai</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{selesaiPesanan}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                    <svg className="h-6 w-6 text-red-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Dibatalkan</dt>
                      <dd className="flex items-baseline">
                        <div className="text-2xl font-semibold text-gray-900">{dibatalkanPesanan}</div>
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <PesananTable
              data={filteredPesanan}
              onUpdateStatus={openStatusModal}
              loading={actionLoading}
            />
          )}
        </div>
      </div>

      <StatusModal
        visible={showModal}
        pesananId={selectedPesanan?.id || ""}
        currentStatus={selectedPesanan?.status || ""}
        onClose={closeStatusModal}
        onUpdateStatus={handleUpdateStatus}
        loading={actionLoading}
      />
    </div>
  );
};

export default StatusPesananAdmin;
