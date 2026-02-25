// src/admin/biaya/biaya-layanan/components/biaya-operasional.tsx
import React, { useState, useEffect, useCallback } from 'react';
import SweetAlert from '../../../../components/SweetAlert';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import { API_URL } from '../../../../config/api';
import Tabs from './tab-2/tabs';
import InputBiaya from './input-biaya';
import { Edit, Trash2, Plus, X, FolderOpen } from 'lucide-react';

const ApiKey = import.meta.env.VITE_API_KEY;

interface Kategori {
  _id: string;
  nama: string;
  isActive: boolean;
  createdAt?: string;
}

const BASE = `${API_URL}/api/admin/biaya-operasional`;

interface BiayaOperasionalProps {
  refreshTrigger?: number;
  onTotalChange?: (n: number) => void;
}

const BiayaOperasional: React.FC<BiayaOperasionalProps> = ({
  refreshTrigger,
  onTotalChange,
}) => {
  const [categories, setCategories] = useState<Kategori[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('daftar-biaya');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');

  // 🔐 Helper header (biar gak ngulang)
  const buildHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    const headers: HeadersInit = { 'Content-Type': 'application/json' };

    if (ApiKey) headers['x-api-key'] = ApiKey;
    if (token) headers['Authorization'] = `Bearer ${token}`;

    return headers;
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(BASE, {
        headers: buildHeaders(),
      });

      if (!res.ok) throw new Error('HTTP error');

      const data = await res.json();
      setCategories((data || []).filter((c: Kategori) => c.isActive));
    } catch (err) {
      console.error(err);
      SweetAlert.error('Gagal memuat kategori');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories, refreshTrigger]);

  // nanti bisa diganti hitung real total biaya
  useEffect(() => {
    if (typeof onTotalChange === 'function') {
      onTotalChange(0);
    }
  }, [categories, onTotalChange]);

  const openAdd = () => {
    setEditId(null);
    setName('');
    setShowForm(true);
  };

  const openEdit = (c: Kategori) => {
    setEditId(c._id);
    setName(c.nama);
    setShowForm(true);
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();

    if (!name.trim()) return SweetAlert.error('Nama wajib diisi');

    try {
      await SweetAlert.loading(editId ? 'Menyimpan perubahan...' : 'Membuat kategori...');

      const url = editId ? `${BASE}/${editId}` : BASE;
      const method = editId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: buildHeaders(),
        body: JSON.stringify({ nama: name }),
      });

      if (!res.ok) throw new Error('HTTP error');

      SweetAlert.close();
      await fetchCategories();
      setShowForm(false);
      SweetAlert.success('Berhasil disimpan');
    } catch (err) {
      SweetAlert.close();
      console.error(err);
      SweetAlert.error('Gagal menyimpan kategori');
    }
  };

  const deleteCategory = async (id: string) => {
    const ok = window.confirm('Yakin ingin menghapus kategori ini?');
    if (!ok) return;

    try {
      await SweetAlert.loading('Menghapus...');

      const res = await fetch(`${BASE}/${id}`, {
        method: 'DELETE',
        headers: buildHeaders(),
      });

      if (!res.ok) throw new Error('HTTP error');

      SweetAlert.close();
      SweetAlert.success('Kategori dihapus');
      await fetchCategories();
    } catch (err) {
      SweetAlert.close();
      console.error(err);
      SweetAlert.error('Gagal menghapus kategori');
    }
  };

  if (loading) return <div className="p-6"><LoadingSpinner /></div>;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex justify-between items-center">
          <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
          {activeTab === 'daftar-biaya' && (
            <button 
              onClick={openAdd} 
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Kategori</span>
            </button>
          )}
        </div>
      </div>
      
      <div className="p-6">
        {activeTab === 'daftar-biaya' && (
          <>
            {categories.length === 0 ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-full mb-6">
                  <FolderOpen className="w-10 h-10 text-blue-600" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Belum ada kategori</h3>
                <p className="text-gray-500 mb-6 max-w-sm mx-auto">
                  Mulai dengan menambahkan kategori biaya operasional untuk mengelola pengeluaran Anda
                </p>
                <button 
                  onClick={openAdd} 
                  className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                >
                  <Plus className="w-5 h-5" />
                  <span>Tambah Kategori Pertama</span>
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                        <th className="px-6 py-4 text-left">
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Nama Biaya</span>
                        </th>
                        <th className="px-6 py-4 text-right">
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Aksi</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {categories.map((c, index) => (
                        <tr 
                          key={c._id} 
                          className={`transition-all duration-200 ${
                            index % 2 === 0 
                              ? 'bg-white hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50' 
                              : 'bg-gradient-to-r from-orange-25 to-amber-25 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50'
                          } group`}
                        >
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-lg flex items-center justify-center mr-4 group-hover:from-blue-200 group-hover:to-indigo-200 transition-colors duration-200">
                                <FolderOpen className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <div className="text-sm font-semibold text-gray-900">{c.nama}</div>
                                <div className="text-xs text-gray-500 mt-0.5">Kategori Biaya Operasional</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => openEdit(c)}
                                className="inline-flex items-center justify-center w-9 h-9 text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white rounded-lg border border-blue-200 hover:border-blue-600 transition-all duration-200 group"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                              </button>
                              <button
                                type="button"
                                onClick={() => deleteCategory(c._id)}
                                className="inline-flex items-center justify-center w-9 h-9 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200 group"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4 group-hover:scale-110 transition-transform duration-200" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                {/* Footer dengan informasi tambahan */}
                <div className="px-6 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Menampilkan {categories.length} kategori
                    </span>
                    <span className="text-xs font-medium text-gray-700">
                      Total Kategori Aktif
                    </span>
                  </div>
                </div>
              </div>
            )}

            {showForm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md transform transition-all">
                  <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {editId ? 'Edit Kategori' : 'Tambah Kategori Baru'}
                    </h3>
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="inline-flex items-center justify-center w-8 h-8 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-all duration-200"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <form onSubmit={submit} className="p-6">
                    <div className="mb-6">
                      <label htmlFor="nama" className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Kategori
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FolderOpen className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                          id="nama"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors duration-200"
                          placeholder="Masukkan nama kategori"
                          autoFocus
                        />
                      </div>
                    </div>

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-all duration-200"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
                      >
                        {editId ? 'Simpan Perubahan' : 'Tambah Kategori'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === 'input-biaya' && (
          <div className="mt-6">
            <InputBiaya />
          </div>
        )}
      </div>
    </div>
  );
};

export default BiayaOperasional;