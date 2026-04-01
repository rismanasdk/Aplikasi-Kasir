// src/admin/dashboard/input-penjualan/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../../../config/api';

interface Produk {
  nama_produk: string;
  jumlah_terjual: number;
}

interface HppProduk {
  nama_produk: string;
  jumlah_terjual: number;
  hpp_per_porsi: number;
  hpp_total: number;
  pendapatan: number;
  laba_kotor: number;
  _id: string;
}

interface HppData {
  _id: string;
  tanggal: string;
  produk: HppProduk[];
  total_hpp: number;
  total_pendapatan: number;
  total_laba_kotor: number;
  createdAt: string;
  updatedAt: string;
  __v: number;
}

interface HppResponse {
  success: boolean;
  data: HppData;
}

const InputPenjualan: React.FC = () => {
  const [produkList, setProdukList] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hppData, setHppData] = useState<HppResponse | null>(null);
  const [showData, setShowData] = useState(false);
  const [loadingProduk, setLoadingProduk] = useState(true);
  
  const fetchHppData = useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/api/admin/hpp-total`);
      const data: HppResponse = await response.json();
      
      if (response.ok) {
        setHppData(data);
      } else {
        setError('Gagal mengambil data HPP');
      }
    } catch {
      setError('Gagal mengambil data HPP');
    }
  }, []);

  useEffect(() => {
    const fetchProduk = async () => {
      try {
        setLoadingProduk(true);
        const response = await fetch(`${API_URL}/api/admin/hpp-total`);
        const data: HppResponse = await response.json();
        
        if (response.ok && data.data) {
          const latestHpp = data.data;
          const produkFromApi = latestHpp.produk.map(p => ({
            nama_produk: p.nama_produk,
            jumlah_terjual: 0
          }));
          setProdukList(produkFromApi);
        } else {
          setProdukList([
            { nama_produk: "Udang Crispy", jumlah_terjual: 0 },
            { nama_produk: "Cheese Burger", jumlah_terjual: 0 },
          ]);
        }
      } catch {
        console.error('Error fetching produk:');
        setProdukList([
          { nama_produk: "Udang Crispy", jumlah_terjual: 0 },
          { nama_produk: "Cheese Burger", jumlah_terjual: 0 },
        ]);
      } finally {
        setLoadingProduk(false);
      }
    };

    fetchProduk();
  }, []);

  const handleJumlahChange = (index: number, value: number) => {
    const updatedList = [...produkList];
    updatedList[index].jumlah_terjual = value;
    setProdukList(updatedList);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);
    
    try {
      const response = await fetch(`${API_URL}/api/admin/hpp-total`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          penjualanProduk: produkList
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Gagal mengirim data');
      }
      
      setSuccess(true);
      setProdukList(produkList.map(p => ({ ...p, jumlah_terjual: 0 })));
      fetchHppData();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showData) {
      fetchHppData();
    }
  }, [showData, fetchHppData]);

  const totalTerjualHariIni = produkList.reduce((total, produk) => total + produk.jumlah_terjual, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-3">Input Penjualan Harian</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Catat penjualan produk Anda setiap hari untuk melacak HPP (Harga Pokok Penjualan) secara akurat
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-blue-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Produk</p>
                <p className="text-2xl font-bold text-gray-800">{produkList.length}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-green-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Terjual Hari Ini</p>
                <p className="text-2xl font-bold text-gray-800">{totalTerjualHariIni}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-6 border-l-4 border-purple-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Status Data</p>
                <p className="text-lg font-bold text-gray-800">
                  {hppData ? '1 Periode' : 'Loading...'}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Form Input Penjualan</h2>
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            </div>
            
            {success && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-green-700 font-medium">Data penjualan berhasil disimpan!</span>
              </div>
            )}
            
            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-red-700 font-medium">{error}</span>
              </div>
            )}
            
            {loadingProduk ? (
              <div className="flex flex-col items-center justify-center h-40">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
                <p className="text-gray-600">Memuat data produk...</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div className="space-y-4">
                  {produkList.map((produk, index) => (
                    <div key={index} className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-xl border border-blue-100 transition-all duration-200 hover:shadow-md">
                      <label className="block text-sm font-semibold text-gray-700 mb-3">
                        {produk.nama_produk}
                      </label>
                      <div className="flex items-center space-x-3">
                        <div className="flex-1">
                          <input
                            type="number"
                            min="0"
                            value={produk.jumlah_terjual}
                            onChange={(e) => handleJumlahChange(index, parseInt(e.target.value) || 0)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                            placeholder="Masukkan jumlah terjual"
                            required
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-600 bg-white px-3 py-2 rounded-lg border border-gray-200">
                          pcs
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 flex justify-end space-x-4">
                  <button
                    type="button"
                    onClick={() => setProdukList(produkList.map(p => ({ ...p, jumlah_terjual: 0 })))}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500 transition-all duration-200 font-medium"
                  >
                    Reset Form
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
                  >
                    {loading ? (
                      <span className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Menyimpan...
                      </span>
                    ) : (
                      <span className="flex items-center">
                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Simpan Data
                      </span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-800">Data HPP</h2>
              <button
                onClick={() => setShowData(!showData)}
                className={`px-6 py-2 rounded-xl font-medium transition-all duration-200 ${
                  showData 
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200' 
                    : 'bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700 shadow-lg'
                }`}
              >
                {showData ? (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Sembunyikan
                  </span>
                ) : (
                  <span className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Lihat Data
                  </span>
                )}
              </button>
            </div>
            
            {showData && hppData && (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-gray-50 to-blue-50 p-6 rounded-xl border border-gray-200">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 space-y-3 lg:space-y-0">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">
                        Tanggal: {new Date(hppData.data.tanggal).toLocaleDateString('id-ID', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Diperbarui: {new Date(hppData.data.updatedAt).toLocaleString('id-ID')}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full font-semibold shadow-lg">
                        Total HPP: Rp {hppData.data.total_hpp.toLocaleString('id-ID')}
                      </div>
                      <div className={`px-4 py-2 rounded-full font-semibold shadow-lg ${
                        hppData.data.total_laba_kotor >= 0 
                          ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' 
                          : 'bg-gradient-to-r from-red-500 to-orange-500 text-white'
                      }`}>
                        Laba: Rp {hppData.data.total_laba_kotor.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gradient-to-r from-gray-100 to-gray-200">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Produk</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Terjual</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">HPP/Porsi</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Total HPP</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Pendapatan</th>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider whitespace-nowrap">Laba Kotor</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {hppData.data.produk.map((produk, idx) => (
                          <tr key={idx} className="hover:bg-gray-50 transition-colors duration-150">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                                <span className="font-medium text-gray-900">{produk.nama_produk}</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                                {produk.jumlah_terjual} pcs
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">
                              Rp {produk.hpp_per_porsi.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-bold text-gray-900">
                              Rp {produk.hpp_total.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                              Rp {produk.pendapatan.toLocaleString('id-ID')}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                                produk.laba_kotor >= 0 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                Rp {produk.laba_kotor.toLocaleString('id-ID')}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div className="mt-3 text-xs text-gray-500 flex items-center">
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                    Geser ke kanan untuk melihat data lengkap
                  </div>
                </div>
              </div>
            )}
            
            {showData && !hppData && (
              <div className="flex flex-col items-center justify-center h-40 bg-gray-50 rounded-xl">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mb-4"></div>
                <p className="text-gray-600">Memuat data HPP...</p>
              </div>
            )}
            
            {!showData && (
              <div className="text-center py-12 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl border-2 border-dashed border-blue-200">
                <svg className="w-16 h-16 text-blue-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Data HPP Tersembunyi</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Klik tombol "Lihat Data" di atas untuk menampilkan informasi HPP dan analisis penjualan
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InputPenjualan;
