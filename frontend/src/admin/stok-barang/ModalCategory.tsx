// ModalCategory.tsx
import React, { useState, useEffect, useCallback } from "react";
import { SweetAlert } from "../../components/SweetAlert";
import LoadingSpinner from "../../components/LoadingSpinner";
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

interface KategoriAPI {
  _id: string;
  nama: string;
  deskripsi: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface CategoryFormData {
  nama: string;
  deskripsi: string;
}

interface ModalCategoryProps {
  visible: boolean;
  onClose: () => void;
  onKategoriChange: () => void;
}


const ModalCategory: React.FC<ModalCategoryProps> = ({ visible, onClose, onKategoriChange }) => {
  const [categories, setCategories] = useState<KategoriAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [serverError, setServerError] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [formData, setFormData] = useState<CategoryFormData>({
    nama: "",
    deskripsi: "",
  });

  const getAuthHeaders = (json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }

    return {
      ...(json ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${token}`,
    };
  };

  const fetchCategories = useCallback(async () => {
    setLoading(true);
    setServerError(false);
    try {
      console.log("Fetching categories...");
      const res = await fetch(`${API_URL}/api/admin/kategori`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data: KategoriAPI[] = await res.json();
      console.log("Categories fetched:", data);
      setCategories(data);
    } catch (err) {
      console.error("Gagal ambil data kategori:", err);
      setServerError(true);
      SweetAlert.error("Gagal mengambil data kategori");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      fetchCategories();
    }
  }, [visible, fetchCategories]);

  const resetForm = () => {
    setFormData({
      nama: "",
      deskripsi: "",
    });
    setIsEditing(false);
    setEditId(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof CategoryFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleAdd = () => {
    resetForm();
    setShowForm(true);
  };

  const handleEdit = (id: string) => {
    const category = categories.find((item) => item._id === id);
    if (category) {
      setFormData({
        nama: category.nama,
        deskripsi: category.deskripsi,
      });
      setIsEditing(true);
      setEditId(id);
      setShowForm(true);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const result = await SweetAlert.confirmDelete();
      
      if (result.isConfirmed) {
        await SweetAlert.loading("Menghapus kategori...");
        
        const res = await fetch(`${API_URL}/api/admin/kategori/${id}`, {
          method: "DELETE",
          headers: getAuthHeaders(),
        });
        
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        
        SweetAlert.close();
        await fetchCategories();
        onKategoriChange();
        await SweetAlert.success("Kategori berhasil dihapus");
      }
    } catch (err) {
      console.error("Gagal hapus kategori:", err);
      SweetAlert.close();
      SweetAlert.error("Gagal menghapus kategori");
    }
  };

  const validateForm = () => {
    if (!formData.nama.trim()) {
      SweetAlert.error("Nama kategori harus diisi");
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
      const payload = {
        nama: formData.nama.trim(),
        deskripsi: formData.deskripsi.trim(),
      };

      await SweetAlert.loading(isEditing ? "Mengupdate kategori..." : "Menambahkan kategori...");

      let res: Response;
      if (isEditing && editId) {
        res = await fetch(`${API_URL}/api/admin/kategori/${editId}`, {
          method: "PUT",
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/api/admin/kategori`, {
          method: "POST",
          headers: getAuthHeaders(true),
          body: JSON.stringify(payload),
        });
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`HTTP error! status: ${res.status}, message: ${errorText}`);
      }

      SweetAlert.close();
      await fetchCategories();
      onKategoriChange();
      resetForm();
      await SweetAlert.success(isEditing ? "Kategori berhasil diperbarui" : "Kategori berhasil ditambahkan");
    } catch (err: unknown) {
      console.error("Gagal submit kategori:", err);
      SweetAlert.close();
      SweetAlert.error("Gagal menyimpan kategori");
    } finally {
      setActionLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-auto max-h-[95vh] overflow-hidden border border-gray-200">
        {/* Header */}
        <div className="px-8 py-6 border-b border-gray-100 bg-gradient-to-r from-purple-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="p-3 rounded-2xl bg-purple-100 text-purple-600">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  Manajemen Kategori
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  Kelola kategori produk Anda
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-3 hover:bg-white rounded-2xl transition-all duration-200 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 overflow-y-auto max-h-[70vh]">
          {showForm ? (
            // Form Tambah/Edit Kategori
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.nama}
                  onChange={(e) => handleInputChange("nama", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 disabled:opacity-50 bg-white"
                  required
                  disabled={actionLoading}
                  placeholder="Masukkan nama kategori"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Deskripsi
                </label>
                <textarea
                  value={formData.deskripsi}
                  onChange={(e) => handleInputChange("deskripsi", e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 disabled:opacity-50 bg-white resize-none"
                  rows={4}
                  disabled={actionLoading}
                  placeholder="Masukkan deskripsi kategori (opsional)"
                />
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-6 py-3 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 shadow-sm"
                  disabled={actionLoading}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="px-8 py-3 text-sm font-medium text-white bg-gradient-to-r from-purple-600 to-purple-700 rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 disabled:opacity-50 shadow-lg shadow-purple-500/25 flex items-center space-x-2 min-w-[120px] justify-center"
                >
                  {actionLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      <span>{isEditing ? "Memperbarui..." : "Menyimpan..."}</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isEditing ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"} />
                      </svg>
                      <span>{isEditing ? "Update" : "Simpan"}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            // Daftar Kategori
            <>
              <div className="flex justify-between items-center mb-8">
                <div>
                  <h4 className="text-xl font-bold text-gray-900">Daftar Kategori</h4>
                  <p className="text-gray-600 mt-1">
                    {categories.length} kategori tersedia
                  </p>
                </div>
                <button
                  onClick={handleAdd}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-500/25 flex items-center space-x-2 font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>Tambah Kategori</span>
                </button>
              </div>

              {serverError ? (
                <div className="text-center py-12 bg-gradient-to-br from-red-50 to-red-100 rounded-2xl border border-red-200">
                  <div className="p-3 rounded-full bg-red-100 text-red-600 inline-flex mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">Koneksi Terputus</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">Tidak dapat terhubung ke server. Periksa koneksi internet Anda.</p>
                  <button
                    onClick={fetchCategories}
                    className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-xl hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-lg shadow-red-500/25 font-medium"
                  >
                    Coba Lagi
                  </button>
                </div>
              ) : loading ? (
                <div className="text-center py-16">
                  <div className="inline-flex items-center justify-center mb-4">
                    <LoadingSpinner />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Memuat Kategori</h3>
                  <p className="text-gray-600">Sedang mengambil data kategori...</p>
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                  <div className="p-4 rounded-full bg-gray-100 text-gray-600 inline-flex mb-4">
                    <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">Belum Ada Kategori</h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">Mulai dengan menambahkan kategori pertama untuk mengorganisir produk Anda.</p>
                  <button
                    onClick={handleAdd}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-xl hover:from-purple-700 hover:to-purple-800 transition-all duration-200 shadow-lg shadow-purple-500/25 font-semibold text-lg"
                  >
                    Tambah Kategori Pertama
                  </button>
                </div>
              ) : (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-50 to-gray-100/50">
                        <tr>
                          <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            Nama Kategori
                          </th>
                          <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            Deskripsi
                          </th>
                          <th className="px-8 py-4 text-left text-sm font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200">
                            Aksi
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 bg-white">
                        {categories.map((category) => (
                          <tr 
                            key={category._id}
                            className="transition-all duration-200 hover:bg-purple-50/30 group"
                          >
                            <td className="px-8 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 rounded-lg bg-purple-100 text-purple-600 group-hover:bg-purple-200 transition-colors">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                  </svg>
                                </div>
                                <div>
                                  <div className="text-base font-semibold text-gray-900">
                                    {category.nama}
                                  </div>
                                  <div className="text-xs text-gray-500 mt-1">
                                    Dibuat: {new Date(category.createdAt).toLocaleDateString('id-ID')}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5">
                              <div className="max-w-md">
                                <div className="text-sm text-gray-600 line-clamp-2">
                                  {category.deskripsi || (
                                    <span className="text-gray-400 italic">Tidak ada deskripsi</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-5 whitespace-nowrap">
                              <div className="flex items-center space-x-3">
                                <button
                                  onClick={() => handleEdit(category._id)}
                                  className="inline-flex items-center justify-center w-10 h-10 text-blue-600 hover:text-white hover:bg-blue-600 rounded-xl border border-blue-200 hover:border-blue-600 transition-all duration-200 group/edit"
                                  title="Edit kategori"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDelete(category._id)}
                                  className="inline-flex items-center justify-center w-10 h-10 text-red-600 hover:text-white hover:bg-red-600 rounded-xl border border-red-200 hover:border-red-600 transition-all duration-200 group/delete"
                                  title="Hapus kategori"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ModalCategory;
