// src/admin/process-memasak/index.tsx
import { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Clock, XCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

interface Production {
  _id: string;
  bahan_baku_id: {
    _id: string;
    nama: string;
    kategori: string;
    stok: number;
    satuan: string;
  };
  jumlah_diproses: number;
  status: 'pending' | 'approved' | 'cancelled' | 'completed';
  waktu_mulai?: Date;
  waktu_selesai?: Date;
  chef_id: {
    _id: string;
    nama_lengkap: string;
  };
  catatan?: string;
  createdAt: Date;
}

interface PaginationData {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  limit: number;
}

const ProcessMemasak = () => {
  const [allProductions, setAllProductions] = useState<Production[]>([]); // Menyimpan semua data dari API
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    limit: 10,
  });
  const [filters, setFilters] = useState({
    namaBahan: '',
    chef: '',
  });

  // Effect untuk mengambil data awal dari API
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const prodResponse = await fetch(`${API_URL}/api/admin/stok-barang/productions`, {
          headers: {
            Authorization: `Bearer ${getStoredToken()}`,
          },
        });

        if (prodResponse.ok) {
          const prodData = await prodResponse.json();
          setAllProductions(prodData);
        } else {
          // Handle error, maybe show a message
          console.error('Failed to fetch productions');
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []); // Hanya dijalankan sekali saat komponen dimuat

  // Effect untuk menangani filter dan pagination
  useEffect(() => {
    // 1. Filter data berdasarkan filter yang dipilih
    let filteredData = allProductions;

    if (filters.namaBahan) {
      filteredData = filteredData.filter(
        (prod) => prod.bahan_baku_id?.nama.toLowerCase() === filters.namaBahan.toLowerCase()
      );
    }

    if (filters.chef) {
      filteredData = filteredData.filter(
        (prod) => prod.chef_id?.nama_lengkap.toLowerCase() === filters.chef.toLowerCase()
      );
    }

    // 2. Update state pagination berdasarkan data yang sudah difilter
    const totalItems = filteredData.length;
    const totalPages = Math.ceil(totalItems / pagination.limit);

    setPagination((prev) => ({
      ...prev,
      totalItems,
      totalPages,
    }));

    // 3. Lakukan pagination pada data yang sudah difilter
    const startIndex = (pagination.currentPage - 1) * pagination.limit;
    const endIndex = startIndex + pagination.limit;
    const paginatedData = filteredData.slice(startIndex, endIndex);

    setProductions(paginatedData);
  }, [allProductions, filters, pagination.currentPage, pagination.limit]); // Dependency array

  // State untuk data yang akan ditampilkan di tabel
  const [productions, setProductions] = useState<Production[]>([]);

  // Buat opsi untuk dropdown filter menggunakan useMemo agar tidak dihitung ulang setiap render
  const filterOptions = useMemo(() => {
    const bahanSet = new Set<string>();
    const chefSet = new Set<string>();

    allProductions.forEach((prod) => {
      if (prod.bahan_baku_id?.nama) {
        bahanSet.add(prod.bahan_baku_id.nama);
      }
      if (prod.chef_id?.nama_lengkap) {
        chefSet.add(prod.chef_id.nama_lengkap);
      }
    });

    return {
      bahans: Array.from(bahanSet).sort(),
      chefs: Array.from(chefSet).sort(),
    };
  }, [allProductions]);


  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      setPagination((prev) => ({ ...prev, currentPage: newPage }));
    }
  };

  const handleFilterChange = (field: string, value: string) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
    // Reset ke halaman pertama saat filter berubah
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
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

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Monitoring Proses Memasak</h1>

      {/* Filter Section dengan Dropdown */}
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="filter-bahan" className="block text-sm font-medium text-gray-700 mb-1">
            Filter Nama Bahan
          </label>
          <select
            id="filter-bahan"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={filters.namaBahan}
            onChange={(e) => handleFilterChange('namaBahan', e.target.value)}
          >
            <option value="">Semua Bahan</option>
            {filterOptions.bahans.map((bahan) => (
              <option key={bahan} value={bahan}>
                {bahan}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="filter-chef" className="block text-sm font-medium text-gray-700 mb-1">
            Filter Chef
          </label>
          <select
            id="filter-chef"
            className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={filters.chef}
            onChange={(e) => handleFilterChange('chef', e.target.value)}
          >
            <option value="">Semua Chef</option>
            {filterOptions.chefs.map((chef) => (
              <option key={chef} value={chef}>
                {chef}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ==================== DESKTOP VIEW (Tabel) ==================== */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full table-auto">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Bahan Baku
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Chef
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Jumlah Diproses
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status & Aksi
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Waktu Mulai
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productions.map((prod, index) => (
              <tr key={prod._id || index}
                   className={`transition-colors hover:bg-gray-50 ${
                   index % 2 === 0 ? 'bg-white' : 'bg-amber-50'
                  }`}
                >    
                <td className="px-4 py-4 whitespace-nowrap">
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
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {prod.chef_id?.nama_lengkap || 'Unknown'}
                </td>
                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {prod.jumlah_diproses} {prod.bahan_baku_id?.satuan || ''}
                </td>
                
                {/* STATUS & AKSI DIGABUNG */}
                <td className="px-4 py-4">
                  <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(prod.status)}`}>
                    {getStatusIcon(prod.status)}
                    <span className="ml-1 capitalize">{prod.status}</span>
                  </div>
                  
                  {/* Tombol muncul hanya jika Pending */}
                  {prod.status === 'pending' && (
                    <div className="flex gap-2 mt-2">
                      <button 
                        onClick={() => alert('Approve untuk: ' + prod.bahan_baku_id?.nama)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-md transition-colors"
                      >
                        <CheckCircle size={14} />
                        Approve
                      </button>
                      <button 
                        onClick={() => alert('Tolak untuk: ' + prod.bahan_baku_id?.nama)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-md transition-colors border border-red-200"
                      >
                        <XCircle size={14} />
                        Tolak
                      </button>
                    </div>
                  )}
                </td>

                <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                  {prod.waktu_mulai ? new Date(prod.waktu_mulai).toLocaleString('id-ID') : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ==================== MOBILE VIEW (Kartu) ==================== */}
      <div className="md:hidden space-y-4">
        {productions.map((prod, index) => (
          <div key={prod._id || index} className={`border rounded-xl p-4 shadow-sm ${
            index % 2 === 0 ? 'bg-white border-gray-200' : 'bg-amber-50 border-amber-200'
          }`}>
            {/* Header Kartu: Nama & Status */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1 mr-3">
                <h3 className="text-sm font-bold text-gray-900">
                  {prod.bahan_baku_id?.nama || 'Bahan baku tidak ditemukan'}
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  {prod.bahan_baku_id?.kategori || '-'}
                </p>
              </div>
              
              {/* Status & Aksi Digabung di pojok kanan */}
              <div className="flex-shrink-0 flex flex-col items-end gap-2">
                <div className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(prod.status)}`}>
                  {getStatusIcon(prod.status)}
                  <span className="ml-1 capitalize">{prod.status}</span>
                </div>
                
                {/* Tombol muncul hanya jika Pending */}
                {prod.status === 'pending' && (
                  <div className="flex gap-1.5">
                    <button 
                      onClick={() => alert('Approve untuk: ' + prod.bahan_baku_id?.nama)}
                      className="flex items-center gap-1 px-3 py-2 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      <CheckCircle size={14} />
                      Approve
                    </button>
                    <button 
                      onClick={() => alert('Tolak untuk: ' + prod.bahan_baku_id?.nama)}
                      className="flex items-center gap-1 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-medium rounded-lg transition-colors border border-red-200"
                    >
                      <XCircle size={14} />
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Detail Kartu */}
            <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Chef</p>
                <p className="font-medium text-gray-800">{prod.chef_id?.nama_lengkap || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Jumlah Diproses</p>
                <p className="font-medium text-gray-800">{prod.jumlah_diproses} {prod.bahan_baku_id?.satuan || ''}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Waktu Mulai</p>
                <p className="font-medium text-gray-800">{prod.waktu_mulai ? new Date(prod.waktu_mulai).toLocaleString('id-ID') : '-'}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* <!-- DIUBAH --> Pagination Section */}
      {pagination.totalItems > pagination.limit && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mt-6">
          <div className="text-sm text-gray-600">
            Menampilkan <span className="font-semibold text-gray-900">{(pagination.currentPage - 1) * pagination.limit + 1}-{Math.min(pagination.currentPage * pagination.limit, pagination.totalItems)}</span> dari{' '}
            <span className="font-semibold text-gray-900">{pagination.totalItems}</span> hasil
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.currentPage - 1)}
              disabled={pagination.currentPage === 1}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                pagination.currentPage === 1 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
              }`}
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let pageNum;
                if (pagination.totalPages <= 5) {
                  pageNum = i + 1;
                } else if (pagination.currentPage <= 3) {
                  pageNum = i + 1;
                } else if (pagination.currentPage >= pagination.totalPages - 2) {
                  pageNum = pagination.totalPages - 4 + i;
                } else {
                  pageNum = pagination.currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    onClick={() => handlePageChange(pageNum)}
                    className={`w-10 h-10 rounded-lg font-medium transition-all ${
                      pagination.currentPage === pageNum 
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
              onClick={() => handlePageChange(pagination.currentPage + 1)}
              disabled={pagination.currentPage === pagination.totalPages}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                pagination.currentPage === pagination.totalPages 
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
      {/* <!-- AKHIR DIUBAH --> */}
    </div>
  );
};

export default ProcessMemasak;