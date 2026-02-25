// src/admin/biaya/biaya-layanan/components/biaya-lanjutan.tsx
import React from 'react';

interface BiayaLanjutanProps {
  taxRate: number;
  globalDiscount: number;
  serviceCharge: number;
  lowStockAlert: number;
  totalBiayaOperasional: number;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const BiayaLanjutan: React.FC<BiayaLanjutanProps> = ({ 
  taxRate, 
  globalDiscount, 
  serviceCharge, 
  lowStockAlert,
  totalBiayaOperasional,
  onInputChange
}) => {
  const estimatedServiceCharge = Math.round(totalBiayaOperasional * (serviceCharge / 100));

  return (
    <div className="space-y-8">
      {/* Pengaturan Harga Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:p-8">
        <div className="flex items-center mb-6">
          <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-3"></div>
          <h2 className="text-2xl font-bold text-gray-900">Pengaturan Harga</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pajak */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5 5.5l4.9 4.9M12 12l4.5-4.5M12 12l-4.5 4.5" />
              </svg>
              Pajak (%)
            </label>
            <div className="relative">
              <input
                type="number"
                name="taxRate"
                value={taxRate}
                onChange={onInputChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white group-hover:border-gray-300"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 text-sm font-medium">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Persentase pajak yang diterapkan</p>
          </div>

          {/* Diskon Global */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 14l6-6m-5.5 5.5l4.9 4.9M12 12l4.5-4.5M12 12l-4.5 4.5" />
              </svg>
              Diskon Global (%)
            </label>
            <div className="relative">
              <input
                type="number"
                name="globalDiscount"
                value={globalDiscount}
                onChange={onInputChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white group-hover:border-gray-300"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-gray-500 text-sm font-medium">%</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">Diskon global untuk semua produk</p>
          </div>

          {/* Biaya Operasional */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v1m0 6v1m0-1v1" />
              </svg>
              Biaya Operasional (%)
            </label>
            <div className="relative">
              <input
                type="number"
                name="serviceCharge"
                value={serviceCharge}
                readOnly
                min="0"
                max="100"
                step="0.01"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-blue-50 text-blue-700 font-medium cursor-not-allowed transition-all duration-200"
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                <span className="text-blue-600 text-sm font-medium">%</span>
              </div>
            </div>
            <p className="text-xs text-blue-600 mt-2">Dihitung otomatis dari biaya operasional</p>
          </div>
        </div>
      </div>

      {/* Pengaturan Inventaris Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 lg:p-8">
        <div className="flex items-center mb-6">
          <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-red-500 rounded-full mr-3"></div>
          <h2 className="text-2xl font-bold text-gray-900">Pengaturan Inventaris</h2>
        </div>
        
        <div className="max-w-md">
          <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Peringatan Stok Rendah
          </label>
          <div className="relative">
            <input
              type="number"
              name="lowStockAlert"
              value={lowStockAlert}
              onChange={onInputChange}
              min="0"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white"
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              <span className="text-gray-500 text-sm font-medium">item</span>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Notifikasi akan muncul ketika stok mencapai angka ini
          </p>
        </div>
      </div>
        </div>
  );
};

export default BiayaLanjutan;