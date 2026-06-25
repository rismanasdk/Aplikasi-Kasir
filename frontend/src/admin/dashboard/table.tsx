// omzettable.tsx
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

interface OmzetTableProps {
  omzetData: OmzetData | null;
  formatRupiah: (amount: number) => string;
}

const OmzetTable: React.FC<OmzetTableProps> = ({ omzetData, formatRupiah: formatRupiahFn }) => {
  // Data untuk setiap baris dengan ikon dan warna
  const tableData = [
    {
      id: 'hari_ini',
      title: 'Hari Ini',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
      ),
      color: 'blue',
      value: omzetData?.hari_ini || 0
    },
    {
      id: 'minggu_ini',
      title: 'Minggu Ini',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
        </svg>
      ),
      color: 'green',
      value: omzetData?.minggu_ini || 0
    },
    {
      id: 'bulan_ini',
      title: 'Bulan Ini',
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path>
        </svg>
      ),
      color: 'purple',
      value: omzetData?.bulan_ini || 0
    }
  ];

  // Fungsi untuk mendapatkan kelas background berdasarkan warna
  const getBgColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'bg-blue-50';
      case 'green': return 'bg-green-50';
      case 'purple': return 'bg-purple-50';
      default: return 'bg-gray-50';
    }
  };

  // Fungsi untuk mendapatkan kelas teks berdasarkan warna
  const getTextColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-600';
      case 'green': return 'text-green-600';
      case 'purple': return 'text-purple-600';
      default: return 'text-gray-600';
    }
  };

  // Dapatkan data detail berdasarkan periode
  const getDetailData = () => {
    if (!omzetData) return [];
    
    switch (omzetData) {
      default:
        return omzetData.detail_bulan || [];
    }
  };

  const detailData = getDetailData();

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 transition-all duration-300 hover:shadow-xl">
      <div className="p-6 border-b-2 border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Detail Omzet</h2>
            <p className="text-sm text-gray-600 mt-1">Ringkasan performa omzet toko</p>
          </div>
          <div className="bg-indigo-100 p-2 rounded-lg">
            <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
            </svg>
          </div>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b-2 border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-r border-gray-200">
                Periode
              </th>
              <th className="px-6 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Omzet
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {tableData.map((row, index) => (
              <tr 
                key={row.id} 
                className={`transition-all duration-200 hover:${getBgColorClass(row.color)} cursor-pointer ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
              >
                <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                  <div className="flex items-center">
                    <div className={`p-2 rounded-lg ${getBgColorClass(row.color)} mr-3`}>
                      <div className={getTextColorClass(row.color)}>
                        {row.icon}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900">{row.title}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-lg font-bold ${getTextColorClass(row.color)}`}>
                    {formatRupiahFn(row.value)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Tabel Detail Per Tanggal */}
      {detailData.length > 0 && (
        <div className="border-t-2 border-gray-200">
          <div className="px-6 py-4 bg-gray-50">
            <h3 className="text-sm font-medium text-gray-700">Detail Per Tanggal</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tanggal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Omzet
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {detailData.map((item, index) => (
                  <tr 
                    key={index} 
                    className={`transition-colors hover:bg-gray-50 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{item.tanggal}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {formatRupiahFn(item.omzet)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      
      <div className="bg-gray-50 px-6 py-3 text-xs text-gray-500 border-t-2 border-gray-200">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
          Data diperbarui setiap harinya
        </div>
      </div>
    </div>
  );
};

export default OmzetTable;