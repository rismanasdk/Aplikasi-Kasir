import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { ChevronLeft, ChevronRight, Wallet, TrendingUp, CreditCard, Package, ShoppingCart, TrendingDown, CircleDollarSign } from 'lucide-react';
import { API_URL } from '../../../config/api';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { exportToExcel, exportToPDF } from './utils';
import type { ModalUtama, AddModalResponse } from './types';
import { getStoredToken } from '../../../auth/storage';
const API_KEY = import.meta.env.VITE_API_KEY;

const PenjualanPage: React.FC = () => {
  const [modalData, setModalData] = useState<ModalUtama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    jumlah: '',
    keterangan: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  // State untuk pagination dan search
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('semua');
  const itemsPerPage = 10;
  
  // State untuk filter tanggal dengan default hari ini
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const getAuthHeaders = () => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };

  // Fetch modal data
  useEffect(() => {
    const fetchModalData = async () => {
      try {
        const response = await axios.get<ModalUtama>(`${API_URL}/api/admin/modal-utama`, {
          headers: getAuthHeaders(),
        });
        setModalData(response.data);
      } catch (err) {
        setError('Gagal memuat data modal');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchModalData();
  }, []);

  // Set default filter ke hari ini saat komponen dimuat
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  // Reset ke halaman pertama saat filter berubah
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, startDate, endDate]);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitSuccess(false);
    setSubmitError(null);

    try {
      await axios.post<AddModalResponse>(
        `${API_URL}/api/admin/modal-utama/tambah-modal`,
        {
          jumlah: Number(formData.jumlah),
          keterangan: formData.keterangan,
        },
        {
          headers: getAuthHeaders(),
        }
      );
      
      setSubmitSuccess(true);
      setFormData({ jumlah: '', keterangan: '' });
      
      // Refresh data setelah menambah modal
      const refreshResponse = await axios.get<ModalUtama>(`${API_URL}/api/admin/modal-utama`, {
        headers: getAuthHeaders(),
      });
      setModalData(refreshResponse.data);
    } catch (err) {
      setSubmitError('Gagal menambah penjualan');
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Tanggal tidak valid';
      }
      return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Tanggal tidak valid';
    }
  };

  // Filter riwayat berdasarkan search term, filter type, dan tanggal
 const filteredRiwayat = modalData ? modalData.riwayat.filter(item => {
  const matchesSearch = searchTerm === '' || 
    item.keterangan.toLowerCase().includes(searchTerm.toLowerCase()) ||
    formatDate(item.tanggal).toLowerCase().includes(searchTerm.toLowerCase());
  
  const matchesType = filterType === 'semua' || item.tipe === filterType;
  
  // Filter berdasarkan tanggal
  let matchesDate = true;
  if (startDate && endDate) {
    const itemDate = new Date(item.tanggal);
    const start = new Date(startDate);
    const end = new Date(endDate);
    // Tambahkan 1 hari ke end untuk inklusif
    end.setDate(end.getDate() + 1);
    matchesDate = itemDate >= start && itemDate < end;
  }
  
  return matchesSearch && matchesType && matchesDate;
}).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()) : [];

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRiwayat.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRiwayat.length / itemsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Handle export functions
  const handleExportExcel = () => {
    exportToExcel({ modalData, startDate, endDate });
  };

  const handleExportPDF = () => {
    exportToPDF({ modalData, startDate, endDate });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  // Hitung total pemasukan dan pengeluaran
  const totalPemasukan = filteredRiwayat
    .filter(item => item.tipe === 'pemasukan')
    .reduce((sum, item) => sum + item.jumlah, 0);

  const totalPengeluaran = filteredRiwayat
    .filter(item => item.tipe === 'pengeluaran')
    .reduce((sum, item) => sum + item.jumlah, 0);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Halaman Penjualan</h1>
          <p className="text-gray-600 mt-1">Kelola modal dan pantau transaksi keuangan</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all shadow-md flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export Excel
          </button>
        </div>
      </div>
      
      {/* Modal Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* PERUBAAN DIMULAI DI SINI */}
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-100 hover:shadow-lg transition-all lg:col-span-2">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4 flex-shrink-0">
              <CircleDollarSign className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-blue-800">Modal Utama</h3>
              <p className="text-xl font-bold text-blue-700 truncate">
                {modalData ? formatCurrency(modalData.sisa_modal) : '-'}
              </p>
              <p className="text-xs text-blue-600">periode terpilih</p>
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-100 hover:shadow-lg transition-all lg:col-span-2">
          <div className="flex items-center">
            <div className="rounded-full bg-blue-100 p-3 mr-4 flex-shrink-0">
              <Wallet className="h-6 w-6 text-blue-600" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium text-blue-800">Kas</h3>
              <p className="text-xl font-bold text-blue-700 truncate">
                {modalData ? formatCurrency(modalData.saldo_kas) : '-'}
              </p>
              <p className="text-xs text-blue-600">periode terpilih</p>
            </div>
          </div>
        </div>
        {/* PERUBAAN SELESAI DI SINI */}
        
        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border border-green-100 hover:shadow-lg transition-all lg:col-span-2">
          <div className="flex items-center">
            <div className="rounded-full bg-green-100 p-3 mr-4">
              <TrendingUp className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">Total Pemasukan</h3>
              <p className="text-xl font-bold text-green-700">
                {formatCurrency(totalPemasukan)}
              </p>
              <p className="text-xs text-green-600">periode terpilih</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-md p-6 border border-amber-100 hover:shadow-lg transition-all lg:col-span-2">
          <div className="flex items-center">
            <div className="rounded-full bg-amber-100 p-3 mr-4">
              <TrendingDown className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800">Total Pengeluaran</h3>
              <p className="text-xl font-bold text-amber-700">
                {formatCurrency(totalPengeluaran)}
              </p>
              <p className="text-xs text-amber-600">periode terpilih</p>
            </div>
          </div>
        </div>
      </div>

      {/* Add Sale Form */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <Package className="h-5 w-5 mr-2 text-gray-600" />
            Tambah Modal
          </h2>
          <p className="text-sm text-gray-600 mt-1">Tambahkan modal baru ke sistem</p>
        </div>
        <div className="p-6">
          {submitSuccess && (
            <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
              Modal Berhasil Ditambahkan!
            </div>
          )}
          
          {submitError && (
            <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
              {submitError}
            </div>
          )}
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="jumlah">
                  Nominal Modal (Rp)
                </label>
                <input
                  type="number"
                  id="jumlah"
                  name="jumlah"
                  value={formData.jumlah}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: 1000000"
                  required
                  min="1"
                />
              </div>
              
              <div>
                <label className="block text-gray-700 mb-2" htmlFor="keterangan">
                  Keterangan
                </label>
                <input
                  type="text"
                  id="keterangan"
                  name="keterangan"
                  value={formData.keterangan}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Contoh: Dana Tambahan"
                  required
                />
              </div>
            </div>
            
            <button
              type="submit"
              disabled={submitLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
            >
              {submitLoading ? 'Menyimpan...' : 'Tambah Modal'}
            </button>
          </form>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2 text-gray-600" />
            Filter Riwayat Transaksi
          </h2>
          <p className="text-sm text-gray-600 mt-1">Cari dan filter transaksi berdasarkan kriteria</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pencarian</label>
              <input
                type="text"
                placeholder="Cari berdasarkan tanggal atau keterangan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Filter Tipe</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="semua">Semua Tipe</option>
                <option value="pemasukan">Pemasukan</option>
                <option value="pengeluaran">Pengeluaran</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200">
        <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-gray-600" />
            Riwayat Transaksi
          </h2>
          <p className="text-sm text-gray-600 mt-1">Daftar semua transaksi modal</p>
        </div>
        
        {currentItems.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tanggal
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Keterangan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tipe
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Jumlah
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Saldo Setelah
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentItems.map((item) => (
                    <tr key={item._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(item.tanggal)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.keterangan}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          item.tipe === 'pemasukan' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {item.tipe}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <span className={item.tipe === 'pemasukan' ? 'text-green-600' : 'text-red-600'}>
                          {item.tipe === 'pemasukan' ? '+' : '-'}{formatCurrency(item.jumlah)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.saldo_setelah)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t border-gray-200 p-6">
                <div className="text-sm text-gray-600">
                  Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredRiwayat.length)}</span> dari{' '}
                  <span className="font-semibold text-gray-900">{filteredRiwayat.length}</span> riwayat
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={prevPage}
                    disabled={currentPage === 1}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
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
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
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
                    onClick={nextPage}
                    disabled={currentPage === totalPages}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium text-sm transition-all ${
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
          </>
        ) : (
          <div className="text-center py-8 text-gray-500">
            {modalData && modalData.riwayat.length > 0 
              ? 'Tidak ada riwayat yang sesuai dengan filter' 
              : 'Belum ada riwayat transaksi'}
          </div>
        )}
      </div>
    </div>
  );
};

export default PenjualanPage;
