// src/admin/bahan-baku/TambahBahanBakuForm.tsx

import React, { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { API_URL } from '../../../../config/api';
import type { ProdukBahan } from '../index';
import { getStoredToken } from '../../../../auth/storage';

// Definisikan tipe Bahan secara lokal di sini untuk memastikan inklusi 'satuan'
interface Bahan {
  nama: string;
  satuan: string; // Tambahkan field satuan
  harga: number;
  jumlah: number;
}

interface DataSatuan {
  _id?: string;
  nama: string;
  kode: string;
  tipe?: string;
  deskripsi?: string;
  isActive?: boolean;
}

interface TambahBahanBakuFormProps {
  bahanBaku: ProdukBahan[];
  setShowAddForm: React.Dispatch<React.SetStateAction<boolean>>;
  refreshData: () => Promise<void>;
}

const TambahBahanBakuForm: React.FC<TambahBahanBakuFormProps> = ({ 
  bahanBaku, 
  setShowAddForm,
  refreshData
}) => {
  const [newProduk, setNewProduk] = useState<string>('');
  // Perbarui state awal untuk menyertakan field 'satuan'
  const [newBahanList, setNewBahanList] = useState<Bahan[]>([{ nama: '', satuan: '', harga: 0, jumlah: 1 }]);
  const [satuanOptions, setSatuanOptions] = useState<{ nama: string; kode: string }[]>([]);

  const getAuthHeaders = (): HeadersInit => {
    const token = getStoredToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

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
          // set default on initial bahan if empty
          setNewBahanList(prev => prev.map(b => ({ ...b, satuan: b.satuan || (opts[0]?.kode || '') })));
        }
      } catch (err) {
        console.error('fetch satuan options', err);
      }
    };
    fetchSatuan();
  }, []);

  const getToken = () => {
    return getStoredToken();
  };

  const handleAddBahanField = () => {
    // Tambahkan field 'satuan' saat menambah bahan baru
    const defaultSatuan = satuanOptions.length ? satuanOptions[0].kode : '';
    const newBahan = { nama: '', satuan: defaultSatuan, harga: 0, jumlah: 1 };
    setNewBahanList(prevList => [...prevList, newBahan]);
  };

  const handleRemoveBahanField = (index: number) => {
    if (newBahanList.length > 1) {
      const updatedList = [...newBahanList];
      updatedList.splice(index, 1);
      setNewBahanList(updatedList);
    }
  };

  const handleBahanChange = (index: number, field: keyof Bahan, value: string | number) => {
    const updatedList = [...newBahanList];
    updatedList[index] = {
      ...updatedList[index],
      [field]: value
    };
    setNewBahanList(updatedList);
  };

  const handleAddBahanBaku = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newProduk) {
      Swal.fire({
        icon: 'warning',
        title: 'Validasi Gagal',
        text: 'Nama produk harus diisi',
        confirmButtonColor: '#3b82f6'
      });
      return;
    }

    // Perbarui validasi untuk memeriksa field 'satuan'
    for (const bahan of newBahanList) {
      if (!bahan.nama || !bahan.satuan || bahan.harga <= 0 || bahan.jumlah <= 0) {
        Swal.fire({
          icon: 'warning',
          title: 'Validasi Gagal',
          text: 'Semua field bahan (nama, satuan, harga, jumlah) harus diisi dengan benar',
          confirmButtonColor: '#3b82f6'
        });
        return;
      }
    }

    try {
      // Ensure payload bahan items always have satuan (fallback to first kode)
      if (satuanOptions.length) {
        newBahanList.forEach((b, i) => {
          if (!b.satuan) newBahanList[i].satuan = satuanOptions[0].kode;
        });
      }
      const existingProdukIndex = bahanBaku.findIndex(p => p.nama_produk === newProduk);
      
      if (existingProdukIndex !== -1) {
        const existingProduk = bahanBaku[existingProdukIndex];
        const produkId = existingProduk._id || '';
        const existingBahan = Array.isArray(existingProduk.bahan) ? [...existingProduk.bahan] : [];
        
        // Pastikan untuk menambahkan 'satuan' ke bahan yang ada
        for (const bahan of newBahanList) {
          existingBahan.push({
            nama: bahan.nama,
            satuan: bahan.satuan, // Kirim satuan
            harga: bahan.harga,
            jumlah: bahan.jumlah
          });
        }
        
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
            nama_produk: newProduk,
            bahan: existingBahan
          }),
        });
        
        if (!response.ok) {
          throw new Error('Gagal memperbarui produk');
        }
      } else {
        const payload = {
          nama_produk: newProduk,
          bahan: newBahanList // Payload sekarang sudah termasuk 'satuan' (kode)
        };
        
        const token = getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const response = await fetch(`${API_URL}/api/admin/bahan-baku`, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Gagal menambahkan bahan baku');
        }
      }

      await refreshData();
      
      // Reset form untuk menyertakan 'satuan'
      setNewProduk('');
      setNewBahanList([{ nama: '', satuan: '', harga: 0, jumlah: 1 }]);
      setShowAddForm(false);
      
      Swal.fire({
        icon: 'success',
        title: 'Berhasil',
        text: 'Bahan baku berhasil ditambahkan',
        confirmButtonColor: '#3b82f6'
      });
    } catch (err: unknown) {
      console.error('Error adding bahan baku:', err);
      const errorMessage = err instanceof Error ? err.message : 'Gagal menambahkan bahan baku';
      Swal.fire({
        icon: 'error',
        title: 'Gagal',
        text: errorMessage,
        confirmButtonColor: '#3b82f6'
      });
    }
  };

  return (
    // PERUBAHAN: Tingkatkan lebar maksimum form dari max-w-2xl menjadi max-w-5xl
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl mx-auto max-h-[95vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Tambah Bahan Baku Baru</h3>
              <p className="text-sm text-gray-600 mt-1">Tambahkan produk dan bahan-bahannya</p>
            </div>
            <button
              onClick={() => setShowAddForm(false)}
              className="p-2 hover:bg-white rounded-xl transition-all duration-200 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleAddBahanBaku} className="px-8 py-6 overflow-y-auto max-h-[70vh]">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-semibold text-gray-700">
                Nama Produk <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={newProduk}
                onChange={(e) => setNewProduk(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white"
                placeholder="Contoh: ChessBurger"
                required
              />
              
              {bahanBaku.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-gray-500 mb-1">Produk yang sudah ada:</p>
                  <div className="flex flex-wrap gap-2">
                    {bahanBaku.map((produk, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => setNewProduk(produk.nama_produk)}
                        className={`px-3 py-1 text-xs rounded-full transition-colors ${
                          newProduk === produk.nama_produk
                            ? 'bg-blue-100 text-blue-700 border border-blue-300'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                        }`}
                      >
                        {produk.nama_produk}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <label className="block text-sm font-semibold text-gray-700">Daftar Bahan</label>
                <button
                  type="button"
                  onClick={handleAddBahanField}
                  className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center space-x-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Tambah Bahan</span>
                </button>
              </div>
              
              <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
                {newBahanList.map((bahan, index) => (
                  <div key={index} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-medium text-gray-800">Bahan {index + 1}</h3>
                      {newBahanList.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveBahanField(index)}
                          className="text-red-500 hover:text-red-700 p-1 rounded-full hover:bg-red-50 transition-colors"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                    
                    {/* PERUBAHAN: Ubah grid menjadi 4 kolom agar semua field sejajar */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">Nama Bahan</label>
                        <input
                          type="text"
                          value={bahan.nama}
                          onChange={(e) => handleBahanChange(index, 'nama', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                          placeholder="Contoh: Daging"
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">Satuan</label>
                        <select
                          value={bahan.satuan}
                          onChange={(e) => handleBahanChange(index, 'satuan', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                          required
                        >
                          <option value="">Pilih satuan...</option>
                          {satuanOptions.map((opt) => (
                            <option key={opt.kode} value={opt.kode}>{opt.nama} ({opt.kode})</option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">Harga Per Satuan</label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-xs">Rp</span>
                          <input
                            type="number"
                            value={bahan.harga || ''}
                            onChange={(e) => handleBahanChange(index, 'harga', Number(e.target.value))}
                            className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                            placeholder="20000"
                            min="1"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="block text-xs font-medium text-gray-600">Stok</label>
                        <input
                          type="number"
                          value={bahan.jumlah || ''}
                          onChange={(e) => handleBahanChange(index, 'jumlah', Number(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white text-sm"
                          placeholder="30"
                          min="1"
                          required
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 shadow-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-green-600 to-green-700 rounded-xl hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg shadow-green-500/25 flex items-center space-x-2 min-w-[120px] justify-center"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
              <span>Simpan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TambahBahanBakuForm;
