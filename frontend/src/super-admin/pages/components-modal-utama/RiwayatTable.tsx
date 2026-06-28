import { ChevronLeft, ChevronRight, CreditCard } from 'lucide-react';
import type { ModalUtama, Riwayat } from '../utils-modal/types';
import RiwayatFilter from './RiwayatFilter';

interface RiwayatTableProps {
  modalData: ModalUtama | null;
  currentItems: Riwayat[];
  currentPage: number;
  totalPages: number;
  indexOfFirstItem: number;
  indexOfLastItem: number;
  totalItems: number;
  searchTerm: string;
  filterType: string;
  startDate: string;
  endDate: string;
  filterPeriod: 'custom' | 'bulanan' | 'tahunan';
  selectedMonth: string;
  selectedYear: number;
  availableYears: number[];
  onSearchChange: (value: string) => void;
  onFilterTypeChange: (value: string) => void;
  onStartDateChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onFilterPeriodChange: (value: 'custom' | 'bulanan' | 'tahunan') => void;
  onSelectedMonthChange: (value: string) => void;
  onSelectedYearChange: (value: number) => void;
  formatDate: (dateString: string) => string;
  formatCurrency: (amount: number) => string;
  onPrevPage: () => void;
  onNextPage: () => void;
  onPaginate: (pageNumber: number) => void;
}

const getTipeBadgeStyle = (tipe: string): string => {
  switch (tipe) {
    case 'pemasukan':
      return 'bg-green-100 text-green-800';
    case 'pengeluaran':
      return 'bg-red-100 text-red-800';
    case 'prive':
      return 'bg-purple-100 text-purple-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTipeAmountStyle = (tipe: string): string => {
  switch (tipe) {
    case 'pemasukan':
      return 'text-green-600';
    case 'pengeluaran':
      return 'text-red-600';
    case 'prive':
      return 'text-purple-600';
    default:
      return 'text-gray-600';
  }
};

const getTipePrefix = (tipe: string): string => {
  return tipe === 'pemasukan' ? '+' : '-';
};

export default function RiwayatTable({
  modalData,
  currentItems,
  currentPage,
  totalPages,
  indexOfFirstItem,
  indexOfLastItem,
  totalItems,
  formatDate,
  formatCurrency,
  onPrevPage,
  onNextPage,
  onPaginate,
  searchTerm,
  filterType,
  startDate,
  endDate,
  filterPeriod,
  selectedMonth,
  selectedYear,
  availableYears,
  onSearchChange,
  onFilterTypeChange,
  onStartDateChange,
  onEndDateChange,
  onFilterPeriodChange,
  onSelectedMonthChange,
  onSelectedYearChange,
}: RiwayatTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <CreditCard className="h-5 w-5 mr-2 text-gray-600" />
          Riwayat Modal Transaksi
        </h2>
        <p className="text-sm text-gray-600 mt-1">Daftar semua transaksi modal</p>
      </div>

      {/* Filter Section — pakai komponen RiwayatFilter dengan props baru */}
      <div className="p-6 border-b border-gray-200">
        <RiwayatFilter
          searchTerm={searchTerm}
          filterType={filterType}
          startDate={startDate}
          endDate={endDate}
          filterPeriod={filterPeriod}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          availableYears={availableYears}
          onSearchChange={onSearchChange}
          onFilterTypeChange={onFilterTypeChange}
          onStartDateChange={onStartDateChange}
          onEndDateChange={onEndDateChange}
          onFilterPeriodChange={onFilterPeriodChange}
          onSelectedMonthChange={onSelectedMonthChange}
          onSelectedYearChange={onSelectedYearChange}
        />
      </div>

      {/* Table Section */}
      {currentItems.length > 0 ? (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipe</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Jumlah</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo Setelah</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.map((item, index) => (
                  <tr 
                    key={item._id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-amber-50'} hover:bg-amber-100 transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(item.tanggal)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{item.keterangan}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getTipeBadgeStyle(item.tipe)}`}>
                        {item.tipe}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">
                      <span className={getTipeAmountStyle(item.tipe)}>
                        {getTipePrefix(item.tipe)}{formatCurrency(item.jumlah)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">
                      {formatCurrency(item.saldo_setelah)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                Menampilkan <span className="font-semibold text-gray-900">{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, totalItems)}</span> dari{' '}
                <span className="font-semibold text-gray-900">{totalItems}</span> riwayat
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={onPrevPage}
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
                        onClick={() => onPaginate(pageNum)}
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
                  onClick={onNextPage}
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
        <div className="text-center py-12 text-gray-500">
          <CreditCard className="h-12 w-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">
            {modalData && modalData.riwayat.length > 0
              ? 'Tidak ada riwayat yang sesuai dengan filter'
              : 'Belum ada riwayat transaksi'}
          </p>
          <p className="text-sm text-gray-400 mt-1">
            {modalData && modalData.riwayat.length > 0
              ? 'Coba ubah kriteria pencarian atau periode filter'
              : 'Transaksi akan muncul di sini setelah ada penambahan modal'}
          </p>
        </div>
      )}
    </div>
  );
}