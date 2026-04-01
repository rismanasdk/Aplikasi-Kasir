import React, { useState } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../../../../config/api';
import type { ProdukBahan } from '../index';
import { getStoredToken } from '../../../../auth/storage';

interface EditProdukFormProps {
  produk: ProdukBahan;
  setEditingProduk: React.Dispatch<React.SetStateAction<ProdukBahan | null>>;
  refreshData: () => Promise<void>;
}

const EditProdukForm: React.FC<EditProdukFormProps> = ({ 
  produk, 
  setEditingProduk,
  refreshData
}) => {
  const [editProdukData, setEditProdukData] = useState<ProdukBahan>(produk);

  // Fungsi untuk mendapatkan token dari localStorage
  const getToken = () => {
    return getStoredToken();
  };

  // Handle update produk
  const handleUpdateProduk = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editProdukData.nama_produk) {
      Swal.fire({
        icon: 'warning',
        title: 'Validasi Gagal',
        text: 'Nama produk harus diisi',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    try {
      const produkId = editProdukData._id || '';
      
      // Pastikan bahan adalah array
      const bahanList = Array.isArray(editProdukData.bahan) ? [...editProdukData.bahan] : [];
      
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`${API_URL}/api/admin/bahan-baku/${produkId}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          nama_produk: editProdukData.nama_produk,
          bahan: bahanList
        }),
      });

      if (!response.ok) {
        throw new Error('Gagal memperbarui produk');
      }

      // Refresh data
      await refreshData();
      setEditingProduk(null);
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Produk berhasil diperbarui',
        confirmButtonColor: '#3b82f6'
      });
    } catch (err: unknown) {
      console.error('Error updating produk:', err);
      const errorMessage = err instanceof Error ? err.message : 'Gagal memperbarui produk';
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: errorMessage,
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-auto max-h-[95vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Edit Produk</h3>
              <p className="text-sm text-gray-600 mt-1">Perbarui informasi produk</p>
            </div>
            <button
              onClick={() => setEditingProduk(null)}
              className="p-2 hover:bg-white rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleUpdateProduk} className="px-8 py-6 overflow-y-auto max-h-[60vh]">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editProdukData.nama_produk}
                onChange={(e) => setEditProdukData({...editProdukData, nama_produk: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                required
              />
            </div>

            {/* Info Bahan */}
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Informasi Bahan</h4>
              <p className="text-sm text-blue-700">
                Produk ini memiliki {Array.isArray(editProdukData.bahan) ? editProdukData.bahan.length : 0} bahan
              </p>
              <p className="text-sm text-blue-700 mt-1">
                Total Harga Bahan: Rp {editProdukData.total_harga?.toLocaleString('id-ID') || '0'}
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setEditingProduk(null)}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-500/25 flex items-center space-x-2 min-w-[120px] justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditProdukForm;
