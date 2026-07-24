// src/admin/biaya/biaya-layanan/components/biaya-lanjutan.tsx
import React from 'react';
import { formatRupiahRP } from '../../utils/formatRupiah'

interface BiayaLanjutanProps {
  taxRate: number;
  globalDiscount: number;
  serviceCharge: number;
  lowStockAlert: number;
  kasWarning: number;
  totalBiayaOperasional: number;
  targetOmzetBulanan: number;
  roundingMode?: string;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onGunakanRekomendasi?: () => void; 
  loadingRekomendasi?: boolean;
}


const BiayaLanjutan: React.FC<BiayaLanjutanProps> = ({ 
  taxRate, 
  globalDiscount, 
  serviceCharge, 
  lowStockAlert,
  kasWarning,
  targetOmzetBulanan,
  onInputChange,
  onGunakanRekomendasi,
  loadingRekomendasi,
  roundingMode,
}) => {
  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Pengaturan Harga Section */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center mb-6">
          <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-indigo-600 rounded-full mr-3 shrink-0"></div>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Pengaturan Biaya</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Pajak */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
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
        <div className="mt-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">Mode Pembulatan</label>
          <select
            name="roundingMode"
            value={roundingMode}
            onChange={onInputChange}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all duration-200 bg-white"
          >
            <option value="up">Ke Atas (Pembulatan ke atas)</option>
            <option value="nearest">Ke Tengah (Pembulatan ke terdekat)</option>
            <option value="down">Ke Bawah (Pembulatan ke bawah)</option>
          </select>
          <p className="text-xs text-gray-500 mt-2">Pilih cara pembulatan harga final pada perhitungan backend.</p>
        </div>
      </div>
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="flex items-center mb-6">
          <div className="w-2 h-8 bg-gradient-to-b from-orange-500 to-red-600 rounded-full mr-3 shrink-0"></div>
          <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Pengaturan Inventaris</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              Peringatan Stok Rendah
            </label>
            <div className="relative">
              <input
                type="number"
                name="lowStockAlert"
                value={lowStockAlert}
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
            <p className="text-xs text-gray-500 mt-2">Notifikasi akan muncul ketika stok mencapai angka ini.</p>
          </div>

          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              Peringatan Uang Kas Rendah
            </label>
            <div className="relative">
              <input
                type="text"
                name="kasWarning"
                value={formatRupiahRP(kasWarning)}
                onChange={onInputChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white group-hover:border-gray-300"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">Notifikasi akan muncul ketika uang kas mencapai nominal ini.</p>
          </div>

          {/* Biaya Operasional */}
          <div className="group">
            <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center">
              Target Omzet Bulanan
            </label>
            <div className="relative">
              <input
                type="text"
                name="targetOmzetBulanan"
                value={formatRupiahRP(targetOmzetBulanan)}
                onChange={onInputChange}
                min="0"
                max="100"
                step="0.1"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white group-hover:border-gray-300"
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Bisa diisi manual, atau gunakan rekomendasi otomatis dari rata-rata omzet 90 hari terakhir.
            </p>
            <button
              type="button"
              onClick={onGunakanRekomendasi}
              disabled={loadingRekomendasi}
              className="mt-2 text-xs font-medium text-orange-600 hover:text-orange-700 underline disabled:opacity-50"
            >
              {loadingRekomendasi ? "Menghitung..." : "Gunakan rekomendasi otomatis"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BiayaLanjutan;