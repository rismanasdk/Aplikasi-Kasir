import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../../../../config/api';
import type {Bahan, ProdukBahan} from '../index';

interface EditBahanBakuFormProps {
  bahan: Bahan;
  produk: ProdukBahan; 
  bahanIndex: number;
  setEditingBahan: React.Dispatch<React.SetStateAction<{produkIndex: number, bahanIndex: number} | null>>;
  refreshData: () => Promise<void>;
}

const EditBahanBakuForm: React.FC<EditBahanBakuFormProps> = ({ 
  bahan, 
  produk,
  bahanIndex,
  setEditingBahan,
  refreshData
}) => {
  const [editBahanData, setEditBahanData] = useState<Bahan>({ nama: '', satuan: '', harga: 0, jumlah: 1 });
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [satuanOptions, setSatuanOptions] = useState<{ nama: string; kode: string }[]>([]);

  interface DataSatuan {
    _id?: string;
    nama: string;
    kode: string;
    tipe?: string;
    deskripsi?: string;
    isActive?: boolean;
  }

  // Fungsi untuk mendapatkan token dari localStorage
  const getToken = () => {
    return localStorage.getItem('token');
  };

  const getAuthHeaders = (): HeadersInit => {
    const token = getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    setEditBahanData(bahan);
  }, [bahan]);

  useEffect(() => {
    const fetchSatuan = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/data-satuan`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json)) {
          const data = json as DataSatuan[];
          const opts = data.map((s) => ({ nama: s.nama, kode: s.kode }));
          setSatuanOptions(opts);
          // ensure editBahanData has a satuan value
          setEditBahanData(prev => ({ ...prev, satuan: prev.satuan || opts[0]?.kode || '' }));
        }
      } catch (err) {
        console.error('fetch satuan options', err);
      }
    };
    fetchSatuan();
  }, []);

  // Handle update bahan
  const handleUpdateBahan = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editBahanData.nama || !editBahanData.satuan || editBahanData.harga <= 0 || editBahanData.jumlah <= 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Validasi Gagal',
        text: 'Semua field harus diisi dengan benar',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Buat salinan array bahan dengan bahan yang diperbarui
      const updatedBahanList = [...produk.bahan];
      updatedBahanList[bahanIndex] = {
        ...updatedBahanList[bahanIndex],
        nama: editBahanData.nama,
        satuan: editBahanData.satuan,
        harga: editBahanData.harga,
        jumlah: editBahanData.jumlah
      };

      // Logging untuk debugging
      const produkId = produk._id || '';
      const apiUrl = `${API_URL}/api/admin/bahan-baku/${produkId}`;
      console.log('API URL:', apiUrl);
      console.log('Request data:', {
        nama_produk: produk.nama_produk,
        bahan: updatedBahanList
      });
      
      // Kirim update ke API - update seluruh produk
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nama_produk: produk.nama_produk,
          bahan: updatedBahanList
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        // Dapatkan response text untuk debugging
        const responseText = await response.text();
        console.log('Response text:', responseText);
        
        try {
          // Coba parse sebagai JSON
          const errorData = JSON.parse(responseText);
          throw new Error(errorData.message || 'Gagal memperbarui bahan');
        } catch {
          // Jika bukan JSON, gunakan response text sebagai error
          throw new Error(responseText || 'Gagal memperbarui bahan');
        }
      }

      // Tampilkan loading toast
      Swal.fire({
        title: 'Memperbarui data...',
        text: 'Mohon tunggu sebentar',
        icon: 'info',
        timer: 1000,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false
      });

      // Refresh data dari server
      await refreshData();
      
      // Tambahkan jeda untuk memastikan state diperbarui
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Tampilkan success message
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Bahan berhasil diperbarui',
        confirmButtonColor: '#3b82f6',
        timer: 1500,
        showConfirmButton: false
      });
      
      // Tutup form setelah delay singkat
      setTimeout(() => {
        setEditingBahan(null);
      }, 1600);
      
    } catch (err: unknown) {
      console.error('Error updating bahan:', err);
      const errorMessage = err instanceof Error ? err.message : 'Gagal memperbarui bahan';
      
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: errorMessage,
        confirmButtonColor: '#3b82f6'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[95vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Edit Bahan</h3>
              <p className="text-sm text-gray-600 mt-1">Perbarui informasi bahan baku</p>
            </div>
            <button
              onClick={() => setEditingBahan(null)}
              className="p-2 hover:bg-white rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-600"
              disabled={isSubmitting}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdateBahan} className="px-8 py-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Nama Bahan
              </label>
              <input
                type="text"
                value={editBahanData.nama}
                onChange={(e) => setEditBahanData({...editBahanData, nama: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                required
                disabled={isSubmitting}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Harga Per Satuan 
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-500 font-medium">Rp</span>
                  <input
                    type="number"
                    value={editBahanData.harga || ''}
                    onChange={(e) => setEditBahanData({...editBahanData, harga: Number(e.target.value)})}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                    min="1"
                    required
                    disabled={isSubmitting}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Stok
                </label>
                <input
                  type="number"
                  value={editBahanData.jumlah || ''}
                  onChange={(e) => setEditBahanData({...editBahanData, jumlah: Number(e.target.value)})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  min="1"
                  required
                  disabled={isSubmitting}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">Satuan</label>
                <select
                  value={editBahanData.satuan}
                  onChange={(e) => setEditBahanData({...editBahanData, satuan: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                  required
                  disabled={isSubmitting}
                >
                  <option value="">Pilih satuan...</option>
                  {satuanOptions.map(opt => (
                    <option key={opt.kode} value={opt.kode}>{opt.nama} ({opt.kode})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setEditingBahan(null)}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
              disabled={isSubmitting}
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-500/25 flex items-center space-x-2 min-w-[120px] justify-center"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span>Simpan</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditBahanBakuForm;
