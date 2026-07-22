// src/super-admin/pages/component-products/ModalProduction.tsx
import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';
import { API_URL } from '../../../config/api';
import { getStoredToken } from '../../../auth/storage';

interface BahanBaku {
  nama: string;
  jumlah: number;
  harga: number;
}

interface ProdukJadi {
  nama_barang: string;
  kode_barang: string;
  jumlah_produksi: number;
}

interface ProductionFormData {
  bahan_baku: BahanBaku[];
  produk_jadi: ProdukJadi;
  chef_id: string;
}

interface User {
  _id: string;
  nama_lengkap: string;
  username: string;
  role: string;
}

interface ModalProductionProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ProductionFormData) => Promise<void> | void;
}

const ModalProduction: React.FC<ModalProductionProps> = ({ isOpen, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<ProductionFormData>({
    bahan_baku: [{ nama: '', jumlah: 1, harga: 0 }],
    produk_jadi: { nama_barang: '', kode_barang: '', jumlah_produksi: 1 },
    chef_id: '',
  });
  const [chefs, setChefs] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchChefs();
    }
  }, [isOpen]);

  const fetchChefs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/users?role=chef`, {
        headers: {
          'Authorization': `Bearer ${getStoredToken()}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setChefs(data);
      }
    } catch (error) {
      console.error('Error fetching chefs:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
      setFormData({
        bahan_baku: [{ nama: '', jumlah: 1, harga: 0 }],
        produk_jadi: { nama_barang: '', kode_barang: '', jumlah_produksi: 1 },
        chef_id: '',
      });
    } catch (error) {
      console.error('Error creating production:', error);
    } finally {
      setLoading(false);
    }
  };

  const addBahanBaku = () => {
    setFormData({
      ...formData,
      bahan_baku: [...formData.bahan_baku, { nama: '', jumlah: 1, harga: 0 }],
    });
  };

  const removeBahanBaku = (index: number) => {
    setFormData({
      ...formData,
      bahan_baku: formData.bahan_baku.filter((_, i) => i !== index),
    });
  };

  const updateBahanBaku = (index: number, field: keyof BahanBaku, value: string | number) => {
    const updated = formData.bahan_baku.map((b, i) =>
      i === index ? { ...b, [field]: value } : b
    );
    setFormData({ ...formData, bahan_baku: updated });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Create Production</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Chef Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select Chef
            </label>
            <select
              value={formData.chef_id}
              onChange={(e) => setFormData({ ...formData, chef_id: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Select Chef</option>
              {chefs.map((chef) => (
                <option key={chef._id} value={chef._id}>
                  {chef.nama_lengkap} ({chef.username})
                </option>
              ))}
            </select>
          </div>

          {/* Bahan Baku */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bahan Baku
            </label>
            {formData.bahan_baku.map((bahan, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <input
                  type="text"
                  placeholder="Nama Bahan"
                  value={bahan.nama}
                  onChange={(e) => updateBahanBaku(index, 'nama', e.target.value)}
                  className="flex-1 p-2 border border-gray-300 rounded-md"
                  required
                />
                <input
                  type="number"
                  placeholder="Jumlah"
                  value={bahan.jumlah}
                  onChange={(e) => updateBahanBaku(index, 'jumlah', parseInt(e.target.value))}
                  className="w-20 p-2 border border-gray-300 rounded-md"
                  min="1"
                  required
                />
                <input
                  type="number"
                  placeholder="Harga"
                  value={bahan.harga}
                  onChange={(e) => updateBahanBaku(index, 'harga', parseFloat(e.target.value))}
                  className="w-24 p-2 border border-gray-300 rounded-md"
                  min="0"
                  step="0.01"
                  required
                />
                {formData.bahan_baku.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeBahanBaku(index)}
                    className="p-2 text-red-500 hover:text-red-700"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addBahanBaku}
              className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
            >
              <Plus size={16} />
              Add Bahan Baku
            </button>
          </div>

          {/* Produk Jadi */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Produk Jadi
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <input
                type="text"
                placeholder="Nama Barang"
                value={formData.produk_jadi.nama_barang}
                onChange={(e) => setFormData({
                  ...formData,
                  produk_jadi: { ...formData.produk_jadi, nama_barang: e.target.value }
                })}
                className="p-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="text"
                placeholder="Kode Barang"
                value={formData.produk_jadi.kode_barang}
                onChange={(e) => setFormData({
                  ...formData,
                  produk_jadi: { ...formData.produk_jadi, kode_barang: e.target.value }
                })}
                className="p-2 border border-gray-300 rounded-md"
                required
              />
              <input
                type="number"
                placeholder="Jumlah Produksi"
                value={formData.produk_jadi.jumlah_produksi}
                onChange={(e) => setFormData({
                  ...formData,
                  produk_jadi: { ...formData.produk_jadi, jumlah_produksi: parseInt(e.target.value) }
                })}
                className="p-2 border border-gray-300 rounded-md"
                min="1"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Production'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalProduction;
