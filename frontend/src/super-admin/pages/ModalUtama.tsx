import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle } from 'lucide-react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

interface ModalData {
  _id: string;
  total_modal: number;
  saldo_kas: number;
  riwayat?: Array<{
    tanggal: string;
    keterangan: string;
    jumlah: number;
  }>;
}

const API_KEY = import.meta.env.VITE_API_KEY;

const ModalUtama: React.FC = () => {
  const [modal, setModal] = useState<ModalData | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    total_modal: 0,
    keterangan: '',
  });

  useEffect(() => {
    fetchModalUtama();
  }, []);

  const fetchModalUtama = async () => {
    try {
      const token = getStoredToken();
      if (!token) {
        setError('Token tidak ditemukan');
        setLoading(false);
        return;
      }

      const res = await fetch(`${API_URL}/api/super-admin/modal-utama`, {
        headers: {
          Authorization: `Bearer ${token}`,
          ...(API_KEY ? { "x-api-key": API_KEY } : {}),
        },
      });

      if (res.ok) {
        const data = await res.json();
        setModal(data);
        setError(null);
      } else if (res.status === 404) {
        setError('Modal utama belum dibuat');
      } else {
        setError('Gagal mengambil data modal utama');
      }

      setLoading(false);
    } catch (err) {
      console.error('Error fetching modal utama:', err);
      setError('Gagal mengambil data modal utama');
      setLoading(false);
    }
  };

  const handleAddModal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getStoredToken();
      if (!token) {
        setError('Token tidak ditemukan');
        return;
      }

      const res = await fetch(`${API_URL}/api/super-admin/modal-utama`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          ...(API_KEY ? { "x-api-key": API_KEY } : {}),
        },
        body: JSON.stringify({ total_modal: formData.total_modal }),
      });

      if (res.ok) {
        setFormData({ total_modal: 0, keterangan: '' });
        setShowForm(false);
        fetchModalUtama();
      } else {
        const errorData = await res.json();
        setError(errorData.message || 'Gagal menambah modal');
      }
    } catch (err) {
      console.error('Error adding modal:', err);
      setError('Gagal menambah modal');
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading modal utama...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Modal Utama Management</h1>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          <Plus size={20} />
          <span>Tambah Modal</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="text-red-600" size={20} />
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAddModal} className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Form Tambah Modal</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Modal</label>
              <input 
                type="number" 
                required
                value={formData.total_modal}
                onChange={(e) => setFormData({...formData, total_modal: Number(e.target.value)})}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Masukkan jumlah modal"
              />
            </div>

            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Simpan
              </button>
              <button 
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400"
              >
                Batal
              </button>
            </div>
          </div>
        </form>
      )}

      {modal && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informasi Modal</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Total Modal</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(modal.total_modal)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Saldo Kas</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(modal.saldo_kas)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Riwayat Modal</h2>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Tanggal</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Keterangan</th>
                <th className="px-4 py-2 text-left text-sm font-semibold text-gray-900">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              {modal?.riwayat && modal.riwayat.length > 0 ? (
                modal.riwayat.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm text-gray-600">{new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
                    <td className="px-4 py-2 text-sm text-gray-600">{item.keterangan}</td>
                    <td className="px-4 py-2 text-sm font-medium text-gray-900">{formatCurrency(item.jumlah)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-sm text-gray-600 text-center">
                    Tidak ada riwayat modal
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ModalUtama;
