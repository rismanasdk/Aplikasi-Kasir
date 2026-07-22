import React from 'react';
import LoadingSpinner from '../../../../components/LoadingSpinner';
import type { BiayaOperasionalData } from '../types';

interface BiayaOperasionalTableProps {
  loadingBiayaOperasional: boolean;
  biayaOperasional: BiayaOperasionalData;
  formatRupiah: (amount: number) => string;
}

const BiayaOperasionalTable: React.FC<BiayaOperasionalTableProps> = ({
  loadingBiayaOperasional,
  biayaOperasional,
  formatRupiah,
}) => {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          </svg>
          Detail Biaya Operasional (Per Bulan)
        </h2>
        <p className="text-sm text-gray-600 mt-1">Rincian biaya operasional periode ini</p>
      </div>
      <div className="overflow-x-auto">
        {loadingBiayaOperasional ? (
          <div className="flex justify-center items-center h-40">
            <LoadingSpinner />
          </div>
        ) : biayaOperasional.rincian_biaya.length === 0 ? (
          <div className="text-center py-8">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-gray-500 mt-2">Tidak ada data biaya operasional</p>
          </div>
        ) : (
          <table className="min-w-[560px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Kategori</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Persentase</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {biayaOperasional.rincian_biaya.map((item, index) => (
                <tr key={item._id || index} className={`transition-colors hover:bg-gray-50 ${index % 2 === 0 ? 'bg-white' : 'bg-amber-50'}`}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{item.nama}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatRupiah(item.jumlah)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{((item.jumlah / biayaOperasional.total) * 100).toFixed(2)}%</div>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 border-t-2 border-gray-300">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">Total</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">{formatRupiah(biayaOperasional.total)}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-bold text-gray-900">100.00%</div>
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default BiayaOperasionalTable;
