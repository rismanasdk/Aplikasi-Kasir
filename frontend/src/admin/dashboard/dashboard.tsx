// index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import LoadingSpinner from './../../components/LoadingSpinner';
import OmzetCards from './cards';
import OmzetChart from './chart';
import OmzetTable from './table';
// import OmzetSummary from './components/OmzetSummary';
import { exportOmzetToCsv, exportOmzetToExcel, exportOmzetToPdf } from './../utils/OmzetExport';
import { formatRupiah } from '../../utils/formatRupiah';
import { API_URL } from './../../config/api';
import { getStoredToken } from './../../auth/storage';

  // Interface untuk respons endpoint admin omzet
  interface ApiOmzetResponse {
    omzet: {
      hari_ini: number;
      kemarin?: number;
      minggu_ini: number;
      minggu_lalu?: number;
      bulan_ini: number;
      bulan_lalu?: number;
      tahun_ini?: number;
      tahun_lalu?: number;
    };
  }

// Interface untuk data omzet
interface OmzetData {
  hari_ini: number;
  kemarin?: number;
  minggu_ini: number;
  minggu_lalu?: number;
  bulan_ini: number;
  bulan_lalu?: number;
  tahun_ini?: number;
  tahun_lalu?: number;
  // Tambahkan data detail untuk chart dan tabel
  detail_hari: {
    tanggal: string;
    omzet: number;
  }[];
  detail_minggu: {
    tanggal: string;
    omzet: number;
  }[];
  detail_bulan: {
    tanggal: string;
    omzet: number;
  }[];
}

const OmzetPage: React.FC = () => {
  const [omzetData, setOmzetData] = useState<OmzetData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'hari' | 'minggu' | 'bulan'>('hari');
  const [notification, setNotification] = useState<{message: string, type: 'success' | 'error'} | null>(null);

  const fetchOmzetData = useCallback(async (showNotification = false) => {
    try {
      setLoading(true);
      
      // Ambil data dari API admin omzet (samakan dengan manager)
      const response = await fetch(`${API_URL}/api/admin/dashboard/omzet`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getStoredToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data: ApiOmzetResponse = await response.json();

      if (!data || !data.omzet) {
        throw new Error('Data omzet tidak tersedia');
      }

      // Map respons menjadi format OmzetData yang dipakai komponen
      const processedData: OmzetData = {
        hari_ini: data.omzet.hari_ini || 0,
        kemarin: data.omzet.kemarin || 0,
        minggu_ini: data.omzet.minggu_ini || 0,
        minggu_lalu: data.omzet.minggu_lalu || 0,
        bulan_ini: data.omzet.bulan_ini || 0,
        bulan_lalu: data.omzet.bulan_lalu || 0,
        tahun_ini: data.omzet.tahun_ini || 0,
        tahun_lalu: data.omzet.tahun_lalu || 0,
        detail_hari: [],
        detail_minggu: [],
        detail_bulan: []
      };
      setOmzetData(processedData);
      
      if (showNotification) {
        setNotification({message: 'Data berhasil diperbarui', type: 'success'});
        setTimeout(() => setNotification(null), 3000);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data omzet';
      setError(errorMessage);
      
      if (showNotification) {
        setNotification({message: 'Gagal memperbarui data', type: 'error'});
        setTimeout(() => setNotification(null), 3000);
      }
    } finally {
      setLoading(false);
    }
  }, []); // PERBAIKAN: Hapus selectedPeriod dari dependency array karena tidak digunakan dalam fungsi

  // Jika kelak ingin detail per-hari/minggu/bulan, bisa panggil endpoint laporan
  // Untuk sekarang gunakan nilai agregat dari endpoint admin omzet

  useEffect(() => {
    fetchOmzetData();
  }, [fetchOmzetData]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-gray-800">Dashboard Admin</h1>
          <p className="text-gray-600">Analisis performa omzet toko</p>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="text-red-700">
              <p className="font-medium">Error</p>
              <p className="text-sm">Gagal memuat data: {error}</p>
            </div>
          </div>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-md text-sm hover:bg-red-700 transition-colors"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-md shadow-lg z-50 ${
          notification.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          {notification.message}
        </div>
      )}

      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Dashboard Admin</h1>
          <p className="text-gray-600 mt-1">Analisis performa omzet toko</p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 w-full md:w-auto">
          <button 
            onClick={() => exportOmzetToPdf(omzetData)}
            className="w-full px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all shadow-md flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
            </svg>
            Export PDF
          </button>
          <button 
            onClick={() => exportOmzetToExcel(omzetData)}
            className="w-full px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export Excel
          </button>
          <button 
            onClick={() => exportOmzetToCsv(omzetData)}
            className="w-full px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-md hover:from-blue-600 hover:to-blue-700 transition-all shadow-md flex items-center justify-center"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            Export CSV
          </button>
        </div>
      </div>

      {/* Kartu Statistik */}
      <OmzetCards 
        omzetData={omzetData} 
        formatRupiah={formatRupiah} 
      />

      {/* Grafik Omzet */}
      <OmzetChart 
        omzetData={omzetData} 
        selectedPeriod={selectedPeriod}
        setSelectedPeriod={setSelectedPeriod}
        formatRupiah={formatRupiah}
      />

      {/* Tabel Detail Omzet */}
      <OmzetTable 
        omzetData={omzetData} 
        formatRupiah={formatRupiah} 
      />

      {/* Ringkasan */}
      {/* <OmzetSummary 
        omzetData={omzetData}
        formatRupiah={formatRupiah}
      /> */}
      
    </div>
  );
};

export default OmzetPage;
