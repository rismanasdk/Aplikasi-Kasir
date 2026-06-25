// omzetcards.tsx
import React from 'react';

interface OmzetData {
  hari_ini: number;
  minggu_ini: number;
  bulan_ini: number;
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

interface OmzetCardsProps {
  omzetData: OmzetData | null;
  formatRupiah: (amount: number) => string;
}

const OmzetCards: React.FC<OmzetCardsProps> = ({ omzetData, formatRupiah }) => {
  // Hitung persentase perubahan
  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  // Dapatkan data kemarin untuk perbandingan
  const getYesterdayOmzet = () => {
    if (!omzetData || !omzetData.detail_hari || omzetData.detail_hari.length < 2) return 0;
    return omzetData.detail_hari[omzetData.detail_hari.length - 2]?.omzet || 0;
  };

  // Dapatkan data minggu lalu untuk perbandingan
  const getLastWeekOmzet = () => {
    if (!omzetData || !omzetData.detail_minggu || omzetData.detail_minggu.length < 7) return 0;
    return omzetData.detail_minggu.slice(0, 7).reduce((sum, item) => sum + item.omzet, 0);
  };

  // Dapatkan data bulan lalu untuk perbandingan
  const getLastMonthOmzet = () => {
    if (!omzetData || !omzetData.detail_bulan || omzetData.detail_bulan.length < 30) return 0;
    return omzetData.detail_bulan.slice(0, 30).reduce((sum, item) => sum + item.omzet, 0);
  };

  const yesterdayOmzet = getYesterdayOmzet();
  const lastWeekOmzet = getLastWeekOmzet();
  const lastMonthOmzet = getLastMonthOmzet();

  const dayChange = calculateChange(omzetData?.hari_ini || 0, yesterdayOmzet);
  const weekChange = calculateChange(omzetData?.minggu_ini || 0, lastWeekOmzet);
  const monthChange = calculateChange(omzetData?.bulan_ini || 0, lastMonthOmzet);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {/* Kartu Hari Ini */}
      <div className="bg-gradient-to-r from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white transform transition-transform hover:scale-105">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium opacity-80">Omzet Hari Ini</h3>
            <p className="text-3xl font-bold mt-2">
              {omzetData ? formatRupiah(omzetData.hari_ini) : 'Rp 0'}
            </p>
          </div>
          <div className="p-3 rounded-full bg-blue-400 bg-opacity-30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-xs ${dayChange >= 0 ? 'text-green-100' : 'text-red-100'}`}>
            {dayChange >= 0 ? (
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {Math.abs(dayChange).toFixed(1)}% dari kemarin
          </span>
        </div>
      </div>

      {/* Kartu Minggu Ini */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white transform transition-transform hover:scale-105">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium opacity-80">Omzet Minggu Ini</h3>
            <p className="text-3xl font-bold mt-2">
              {omzetData ? formatRupiah(omzetData.minggu_ini) : 'Rp 0'}
            </p>
          </div>
          <div className="p-3 rounded-full bg-green-400 bg-opacity-30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-xs ${weekChange >= 0 ? 'text-green-100' : 'text-red-100'}`}>
            {weekChange >= 0 ? (
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {Math.abs(weekChange).toFixed(1)}% dari minggu lalu
          </span>
        </div>
      </div>

      {/* Kartu Bulan Ini */}
      <div className="bg-gradient-to-r from-purple-500 to-purple-600 p-6 rounded-xl shadow-lg text-white transform transition-transform hover:scale-105">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-sm font-medium opacity-80">Omzet Bulan Ini</h3>
            <p className="text-3xl font-bold mt-2">
              {omzetData ? formatRupiah(omzetData.bulan_ini) : 'Rp 0'}
            </p>
          </div>
          <div className="p-3 rounded-full bg-purple-400 bg-opacity-30">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
        </div>
        <div className="mt-4 flex items-center">
          <span className={`text-xs ${monthChange >= 0 ? 'text-green-100' : 'text-red-100'}`}>
            {monthChange >= 0 ? (
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M14.707 10.293a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 111.414-1.414L9 12.586V5a1 1 0 012 0v7.586l2.293-2.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            )}
            {Math.abs(monthChange).toFixed(1)}% dari bulan lalu
          </span>
        </div>
      </div>
    </div>
  );
};

export default OmzetCards;