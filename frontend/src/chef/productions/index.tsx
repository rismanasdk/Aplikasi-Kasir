// src/chef/productions/index.tsx
import React, { useState, useEffect } from 'react';
import { CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';

interface BahanBaku {
  _id: string;
  nama: string;
  kategori: string;
  stok: number;
  satuan: string;
  is_bahan_siapp: boolean;
}

interface Production {
  _id: string;
  bahan_baku_id: BahanBaku;
  jumlah_diproses: number;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
  waktu_mulai?: Date;
  waktu_selesai?: Date;
  catatan?: string;
  createdAt: Date;
}

import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

const Productions: React.FC = () => {
  const [productions, setProductions] = useState<Production[]>([]);
  const [loading, setLoading] = useState(true);
  // State untuk pagination
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10; // 10 data per halaman

  useEffect(() => {
    fetchProductions();
  }, []);

  const fetchProductions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/chef/productions`, {
        headers: {
          'Authorization': `Bearer ${getStoredToken()}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setProductions(data);
        // Reset ke halaman pertama saat data berubah
        setCurrentPage(1);
      }
    } catch (error) {
      console.error('Error fetching productions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (id: string, status: 'approved' | 'cancelled', catatan?: string) => {
    try {
      const response = await fetch(`${API_URL}/api/chef/productions/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredToken()}`,
        },
        body: JSON.stringify({ status, catatan }),
      });
      if (response.ok) {
        fetchProductions();
      }
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="text-yellow-500" size={20} />;
      case 'approved':
        return <CheckCircle className="text-green-500" size={20} />;
      case 'completed':
        return <CheckCircle className="text-blue-500" size={20} />;
      case 'cancelled':
        return <XCircle className="text-red-500" size={20} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'approved':
        return 'bg-green-100 text-green-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Fungsi untuk pagination
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  // Hitung data untuk halaman saat ini
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = productions.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(productions.length / itemsPerPage);

  if (loading) {
    return (
      <div className="p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-8">
            <div className="flex flex-col items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mb-4"></div>
              <p className="text-gray-500">Memuat data produksi...</p>
            </div>
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
            <h1 className="text-3xl font-bold text-gray-800">Data Produksi</h1>
            <p className="text-gray-500 mt-1">Kelola status produksi bahan baku</p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
            <p className="text-sm text-gray-500">Total Produksi</p>
            <p className="text-2xl font-bold text-orange-500">{productions.length}</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nama Produk
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Jumlah Diproses
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Waktu Mulai
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {currentItems.map((prod) => (
                  <tr key={prod._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {prod.bahan_baku_id ? (
                          <div>
                            <div className="font-medium">{prod.bahan_baku_id.nama}</div>
                            <div className="text-gray-500">{prod.bahan_baku_id.kategori}</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">Bahan baku tidak ditemukan</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prod.jumlah_diproses} {prod.bahan_baku_id?.satuan || ''}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(prod.status)}`}>
                        {getStatusIcon(prod.status)}
                        <span className="ml-1 capitalize">{prod.status}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prod.waktu_mulai ? new Date(prod.waktu_mulai).toLocaleString('id-ID') : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {prod.status === 'pending' ? (
                        <button
                          onClick={() => updateStatus(prod._id, 'approved')}
                          className="text-green-600 hover:text-green-900 font-medium"
                        >
                          Approve
                        </button>
                      ) : prod.status === 'approved' ? (
                        <span className="text-green-600">Approved - Menunggu Admin</span>
                      ) : prod.status === 'completed' ? (
                        <span className="text-blue-600">Selesai</span>
                      ) : (
                        <span className="text-red-600">Dibatalkan</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {/* Pagination UI */}
          {productions.length > itemsPerPage && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-gray-50 border-t border-gray-200 p-4 sm:p-6">
              <div className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, productions.length)}</span> dari{' '}
                <span className="font-semibold text-gray-900">{productions.length}</span> produksi
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
        </div>
      </div>
    </div>
  );
};

export default Productions;
