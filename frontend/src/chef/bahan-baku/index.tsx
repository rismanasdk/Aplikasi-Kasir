// src/chef/bahan-baku/index.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Swal from 'sweetalert2';
import type { SweetAlertOptions } from 'sweetalert2';
import { Package, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../../auth/hooks/useAuth';
import { getStoredToken } from '../../auth/storage';

interface BahanItem {
  nama: string;
  harga: number;
  jumlah: number;
}

interface BahanBaku {
  _id: string;
  nama: string;
  bahan: BahanItem[];
  total_stok: number;
}

import { API_URL } from '../../config/api';

const BahanBakuTersedia: React.FC = () => {
  const [bahanBaku, setBahanBaku] = useState<BahanBaku[]>([]);
  const [loading, setLoading] = useState(true);
  const [ambilLoading, setAmbilLoading] = useState<string | null>(null);
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 9; // 9 data per halaman
  
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    fetchBahanBakuTersedia();
  }, []);

  // Reset ke halaman pertama saat data berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [bahanBaku]);

  const fetchBahanBakuTersedia = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chef/bahan-baku`, {
        headers: {
          'Authorization': `Bearer ${getStoredToken()}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setBahanBaku(data);
      }
    } catch (error) {
      console.error('Error fetching bahan baku:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Gagal memuat data bahan baku',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk pagination
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Hitung data untuk halaman saat ini
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = bahanBaku.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(bahanBaku.length / itemsPerPage);

  const ambilBahanBaku = async (bahanBakuId: string, stokTersedia: number, namaBahan: string) => {
    const options: SweetAlertOptions = {
      title: `Ambil Bahan Baku`,
      html: `
        <div class="text-left">
          <div class="bg-gray-100 p-3 rounded mb-3">
            <p class="font-semibold">${namaBahan}</p>
            <p class="text-sm text-gray-600">Stok tersedia: <span class="font-bold text-blue-600">${stokTersedia}</span></p>
          </div>
          <p class="mb-2">Masukkan jumlah yang ingin diambil:</p>
        </div>
      `,
      input: 'number',
      inputPlaceholder: 'Jumlah',
      inputAttributes: {
        min: '1',
        max: String(stokTersedia),
        step: '1',
        class: 'swal2-input'
      },
      showCancelButton: true,
      confirmButtonColor: '#3b82f6',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Ambil',
      cancelButtonText: 'Batal',
      preConfirm: (value) => {
        if (!value || isNaN(Number(value)) || Number(value) <= 0) {
          Swal.showValidationMessage('Jumlah tidak valid');
          return false;
        }
        if (Number(value) > stokTersedia) {
          Swal.showValidationMessage('Jumlah melebihi stok tersedia');
          return false;
        }
        return value;
      }
    };
    const { value: jumlah } = await Swal.fire(options);

    if (!jumlah) return;

    setAmbilLoading(bahanBakuId);
    try {
      const response = await fetch(`${API_URL}/api/chef/bahan-baku/ambil`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify({
          bahan_baku_id: bahanBakuId,
          jumlah_diproses: Number(jumlah)
        }),
      });

      if (response.ok) {
        await Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: 'Bahan baku berhasil diambil.',
          confirmButtonColor: ''
        });

        if (user?.role === 'admin') {
          navigate('/admin/stok-barang');
          return;
        }

        // Refresh data untuk update UI stok
        await fetchBahanBakuTersedia();
      } else {
        const error = await response.json();
        Swal.fire({
          icon: 'error',
          title: 'Gagal',
          text: error.message || 'Terjadi kesalahan saat mengambil bahan baku',
          confirmButtonColor: '#3b82f6'
        });
      }
    } catch (error) {
      console.error('Error taking bahan baku:', error);
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: 'Terjadi kesalahan saat mengambil bahan baku',
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setAmbilLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Bahan Baku Tersedia</h1>
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
            <p className="text-gray-500">Memuat data bahan baku...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Bahan Baku Tersedia</h1>
            <p className="text-gray-500 mt-1">Kelola dan ambil bahan baku untuk produksi</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Bahan</p>
            <p className="text-2xl font-bold text-orange-500">{bahanBaku.length}</p>
          </div>
        </div>

        {bahanBaku.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12">
            <div className="text-center py-8">
              <div className="mx-auto w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <Package className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Tidak ada bahan baku tersedia</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Semua bahan baku sudah diambil chef lain atau belum dipublish admin.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {currentItems.map((item) => (
                <div 
                  key={item._id} 
                  className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-200 hover:border-gray-300"
                >
                  <div className="p-6 flex flex-col h-full">
                    {/* Bagian Header */}
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">{item.nama}</h3>
                          <div className="flex items-center mt-1">
                            <span className="text-sm text-gray-500 mr-2">Stok:</span>
                            <span className="font-bold text-lg">
                              {item.total_stok}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-xs text-gray-500">Status Ketersediaan</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        item.total_stok > 10 
                          ? 'bg-green-100 text-green-800' 
                          : item.total_stok > 5 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-red-100 text-red-800'
                      }`}>
                        {item.total_stok > 10 
                          ? 'Tersedia' 
                          : item.total_stok > 5 
                            ? 'Terbatas' 
                            : 'Sedikit'
                        }
                      </span>
                    </div>

                    {/* Detail Bahan - Container dengan flex untuk memastikan tombol tetap di bawah */}
                    <div className="flex flex-col flex-grow">
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h4 className="font-bold text-gray-700 mb-3 flex items-center">
                          <span className="inline-flex items-center justify-center w-6 h-6 text-xl font-bold text-black rounded-full mr-1">
                            {item.bahan.length}
                          </span>
                          Daftar Bahan
                        </h4>
                        {/* Container scroll untuk daftar bahan */}
                        <div className="space-y-3 mb-4 max-h-48 overflow-y-auto pr-2">
                          {/* Render semua bahan, bukan hanya 2 pertama */}
                          {item.bahan.map((bahan, index) => (
                            <div key={index} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                              <div className="flex justify-between items-start mb-1">
                                <span className="font-medium text-gray-800">{bahan.nama}</span>
                                <span className="text-sm font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                                  x{bahan.jumlah}
                                </span>
                              </div>
                              <div className="text-sm text-gray-600">
                                Harga: <span className="font-medium">Rp {bahan.harga.toLocaleString()}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Tombol Ambil Bahan - SELALU DI BAWAH */}
                    <div className="mt-auto pt-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          ambilBahanBaku(item._id, item.total_stok, item.nama);
                        }}
                        disabled={ambilLoading === item._id}
                        className={`w-full py-3 px-4 rounded-lg font-medium transition-all duration-200 flex items-center justify-center ${
                          ambilLoading === item._id
                            ? 'bg-gray-300 cursor-not-allowed'
                            : 'bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                        }`}
                      >
                        {ambilLoading === item._id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Memproses...
                          </>
                        ) : (
                          <>
                            <ShoppingCart size={18} className="mr-2" />
                            Ambil Bahan Baku
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Pagination UI */}
            {bahanBaku.length > itemsPerPage && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-6">
                <div className="text-sm text-gray-600">
                  Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, bahanBaku.length)}</span> dari{' '}
                  <span className="font-semibold text-gray-900">{bahanBaku.length}</span> bahan baku
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
          </>
        )}
      </div>
    </div>
  );
};

export default BahanBakuTersedia;
