import React from 'react';
import type { DaftarBulan } from '../types';

interface HeaderControlsProps {
  selectedBulan: string;
  selectedBulanName: string;
  daftarBulan: DaftarBulan[];
  onSelectBulan: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  onExport: (type: 'pdf' | 'excel') => void;
  onProfessionalExport: (type: 'pdf' | 'excel') => void;
  hasData: boolean;
}

const HeaderControls: React.FC<HeaderControlsProps> = ({
  selectedBulan,
  selectedBulanName,
  daftarBulan,
  onSelectBulan,
  onExport,
  onProfessionalExport,
  hasData,
}) => {
  return (
    <div className="mb-8 flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Laporan Penjualan</h1>
          <p className="text-gray-600 mt-1">Periode: {selectedBulanName}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full sm:w-auto">
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <label htmlFor="bulan" className="block text-sm font-medium text-gray-700 whitespace-nowrap">
              Pilih Bulan:
            </label>
            <select
              id="bulan"
              name="bulan"
              className="block w-full sm:w-[200px] pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
              value={selectedBulan}
              onChange={onSelectBulan}
            >
              {daftarBulan.map((bulan) => (
                <option key={bulan.id} value={bulan.id}>
                  {bulan.nama_bulan}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto border-t border-gray-200 pt-3 sm:border-t-0 sm:pt-0 sm:ml-2 sm:pl-2 sm:border-l sm:border-gray-300">
            <button
              onClick={() => onExport('pdf')}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all shadow-md flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Export PDF
            </button>
            <button
              onClick={() => onExport('excel')}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export Excel
            </button>
          </div>

          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <button
              onClick={() => onProfessionalExport('pdf')}
              disabled={!hasData}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-md hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Profesional PDF
            </button>
            <button
              onClick={() => onProfessionalExport('excel')}
              disabled={!hasData}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-md hover:from-violet-600 hover:to-violet-700 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
            >
              <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Profesional Excel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeaderControls;
