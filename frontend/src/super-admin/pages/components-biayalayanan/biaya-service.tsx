// src/admin/biaya/biaya-layanan/components/biaya-service.tsx
import React, { useState, useEffect, useCallback } from 'react';
import SweetAlert from '../../../components/SweetAlert';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { Edit, Trash2, Plus } from 'lucide-react'; // Mengganti Pencil dengan Edit
import { API_URL } from '../../../config/api';
import { getStoredToken } from '../../../auth/storage';

const ApiKey = import.meta.env.VITE_API_KEY;

export interface BiayaServiceItem {
  _id: string;
  nama: string;
  persen: number;
  deskripsi: string;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface BiayaServiceProps {
  refreshTrigger?: number;
}

const BiayaService: React.FC<BiayaServiceProps> = ({ refreshTrigger }) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [data, setData] = useState<BiayaServiceItem[]>([]);
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [editingItem, setEditingItem] = useState<BiayaServiceItem | null>(null);
  const [newItem, setNewItem] = useState({
    nama: '',
    persen: 0,
    deskripsi: ''
  });

  const BASE_API_URL = `${API_URL}/api/admin/biaya-layanan`;
  const API_KEY = `${ApiKey}`;

  // Fungsi untuk mendapatkan token dari localStorage
  const getToken = () => {
    return getStoredToken();
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }

      const response = await fetch(BASE_API_URL, { headers });
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data biaya layanan');
      }
      
      const result = await response.json();
      setData(result);
    } catch (error) {
      SweetAlert.error('Gagal memuat data biaya layanan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [BASE_API_URL, API_KEY]);

  useEffect(() => {
    fetchData();
  }, [fetchData, refreshTrigger]);

  const handleAddItem = async () => {
    if (!newItem.nama.trim()) {
      SweetAlert.error('Nama biaya layanan tidak boleh kosong');
      return;
    }

    try {
      setSaving(true);
      SweetAlert.loading('Menambah biaya layanan...');
      
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }
      
      const response = await fetch(BASE_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(newItem)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Gagal menambah biaya layanan');
      }
      
      SweetAlert.close();
      SweetAlert.success('Biaya layanan berhasil ditambahkan');
      
      // Reset form dan tutup modal
      setNewItem({
        nama: '',
        persen: 0,
        deskripsi: ''
      });
      setShowAddModal(false);
      
      // Refresh data
      fetchData();
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal menambah biaya layanan');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !editingItem._id) return;
    
    try {
      setSaving(true);
      SweetAlert.loading('Memperbarui biaya layanan...');
      
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }
      
      const response = await fetch(`${BASE_API_URL}/${editingItem._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(editingItem)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Gagal memperbarui biaya layanan');
      }
      
      SweetAlert.close();
      SweetAlert.success('Biaya layanan berhasil diperbarui');
      
      // Tutup modal dan refresh data
      setShowEditModal(false);
      setEditingItem(null);
      fetchData();
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal memperbarui biaya layanan');
      console.error(error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    const result = await SweetAlert.fire({
      title: 'Apakah Anda yakin?',
      text: 'Biaya layanan akan dihapus',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Ya, hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        setSaving(true);
        SweetAlert.loading('Menghapus biaya layanan...');
        
        const token = getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-api-key'] = API_KEY;
        }

        const response = await fetch(`${BASE_API_URL}/${id}`, {
          method: 'DELETE',
          headers
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          throw new Error(errorData.message || 'Gagal menghapus biaya layanan');
        }
        
        SweetAlert.close();
        SweetAlert.success('Biaya layanan berhasil dihapus');
        
        // Refresh data
        fetchData();
      } catch (error) {
        SweetAlert.close();
        SweetAlert.error(error instanceof Error ? error.message : 'Gagal menghapus biaya layanan');
        console.error(error);
      } finally {
        setSaving(false);
      }
    }
  };

  const openEditModal = (item: BiayaServiceItem) => {
    setEditingItem({ ...item });
    setShowEditModal(true);
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Biaya Layanan</h2>
            <p className="text-gray-600 mt-1">Kelola persentase biaya layanan</p>
          </div>
          
          <div className="flex items-center space-x-3 mt-4 sm:mt-0">
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center disabled:opacity-50"
            >
              <Plus className="h-5 w-5 mr-2" />
              Tambah Biaya Layanan
            </button>
          </div>
        </div>

        {/* Content Section */}
        {data.length === 0 ? (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-6">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-medium text-yellow-800">Belum ada data biaya layanan</h3>
                <p className="text-yellow-700 mt-2">
                  Silakan tambahkan biaya layanan menggunakan tombol "Tambah Biaya Layanan" di atas.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="overflow-hidden bg-white shadow-sm ring-1 ring-gray-200 sm:rounded-lg">
            <table className="min-w-full divide-y divide-gray-300">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">
                    Nama
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Persen
                  </th>
                  <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Deskripsi
                  </th>
                   <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {data.map((item) => (
                  <tr key={item._id}>
                    <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                      {item.nama}
                    </td>
                    <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                      {item.persen}%
                    </td>
                    <td className="px-3 py-4 text-sm text-gray-500">
                      {item.deskripsi}
                    </td>
                    <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(item)}
                          disabled={saving || !item._id}
                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg border border-blue-200 hover:border-blue-600 transition-all duration-200"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item._id)}
                          disabled={saving || !item._id}
                          className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tambah Biaya Layanan */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowAddModal(false);
                setNewItem({
                  nama: '',
                  persen: 0,
                  deskripsi: ''
                });
              }}
            ></div>

            {/* Modal container */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Tambah Biaya Layanan Baru</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewItem({
                        nama: '',
                        persen: 0,
                        deskripsi: ''
                      });
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Biaya Layanan
                    </label>
                    <input
                      type="text"
                      value={newItem.nama}
                      onChange={(e) => setNewItem({...newItem, nama: e.target.value})}
                      placeholder="Masukkan nama biaya layanan..."
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Persen (%)
                    </label>
                    <input
                      type="number"
                      value={newItem.persen}
                      onChange={(e) => setNewItem({...newItem, persen: parseFloat(e.target.value) || 0})}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      value={newItem.deskripsi}
                      onChange={(e) => setNewItem({...newItem, deskripsi: e.target.value})}
                      placeholder="Masukkan deskripsi biaya layanan..."
                      rows={3}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddModal(false);
                        setNewItem({
                          nama: '',
                          persen: 0,
                          deskripsi: ''
                        });
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleAddItem}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50"
                    >
                      {saving ? 'Menyimpan...' : 'Tambah'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Edit Biaya Layanan */}
      {showEditModal && editingItem && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            {/* Background overlay */}
            <div 
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setShowEditModal(false);
                setEditingItem(null);
              }}
            ></div>

            {/* Modal container */}
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-800">Edit Biaya Layanan</h3>
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingItem(null);
                    }}
                    className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nama Biaya Layanan
                    </label>
                    <input
                      type="text"
                      value={editingItem.nama}
                      onChange={(e) => setEditingItem({...editingItem, nama: e.target.value})}
                      placeholder="Masukkan nama biaya layanan..."
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                      autoFocus
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Persen (%)
                    </label>
                    <input
                      type="number"
                      value={editingItem.persen}
                      onChange={(e) => setEditingItem({...editingItem, persen: parseFloat(e.target.value) || 0})}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deskripsi
                    </label>
                    <textarea
                      value={editingItem.deskripsi}
                      onChange={(e) => setEditingItem({...editingItem, deskripsi: e.target.value})}
                      placeholder="Masukkan deskripsi biaya layanan..."
                      rows={3}
                      className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
                    />
                  </div>
                  
                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowEditModal(false);
                        setEditingItem(null);
                      }}
                      className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateItem}
                      disabled={saving}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50"
                    >
                      {saving ? 'Menyimpan...' : 'Simpan'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BiayaService;
