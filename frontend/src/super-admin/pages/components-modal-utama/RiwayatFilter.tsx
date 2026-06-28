import { Calendar, Search } from 'lucide-react';

interface RiwayatFilterProps {
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
}

const MONTH_LABELS: Record<number, string> = {
  1: 'Januari', 2: 'Februari', 3: 'Maret', 4: 'April',
  5: 'Mei', 6: 'Juni', 7: 'Juli', 8: 'Agustus',
  9: 'September', 10: 'Oktober', 11: 'November', 12: 'Desember',
};

export default function RiwayatFilter({
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
}: RiwayatFilterProps) {
  // Nav helper: pindah bulan ±1
  const navigateMonth = (direction: -1 | 1) => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const d = new Date(year, month - 1 + direction, 1);
    onSelectedMonthChange(
      `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    );
  };

  // Nav helper: pindah tahun ±1
  const navigateYear = (direction: -1 | 1) => {
    onSelectedYearChange(selectedYear + direction);
  };

  // Label bulan yang sedang aktif
  const activeMonthLabel = (() => {
    const [, m] = selectedMonth.split('-').map(Number);
    return MONTH_LABELS[m] ?? selectedMonth;
  })();

  return (
    <div className="space-y-4">
      {/* ── Baris 1: Pencarian + Filter Tipe + Periode ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Pencarian */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Pencarian</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari keterangan atau tanggal..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Filter Tipe */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Tipe</label>
          <select
            value={filterType}
            onChange={(e) => onFilterTypeChange(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="semua">Semua Tipe</option>
            <option value="pemasukan">Pemasukan</option>
            <option value="pengeluaran">Pengeluaran</option>
            <option value="prive">Prive</option>
            <option value="pembatalan_pengeluaran">Pembatalan Pengeluaran</option>
          </select>
        </div>

        {/* Filter Periode */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Filter Periode</label>
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {(
              [
                { key: 'bulanan', label: 'Bulanan' },
                { key: 'tahunan', label: 'Tahunan' },
                { key: 'custom', label: 'Custom' },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => onFilterPeriodChange(key)}
                className={`flex-1 py-2 text-sm font-medium rounded-md transition-all ${
                  filterPeriod === key
                    ? 'bg-white text-blue-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Baris 2: Date picker sesuai periode ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* BULANAN — month picker dengan navigasi */}
        {filterPeriod === 'bulanan' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Pilih Bulan
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="flex-shrink-0 p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Bulan sebelumnya"
                >
                  &lsaquo;
                </button>
                <select
                  value={selectedMonth}
                  onChange={(e) => onSelectedMonthChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {(() => {
                    const currentYear = new Date().getFullYear();
                    // Tampilkan 5 tahun ke belakang dari tahun sekarang
                    const startYear = currentYear - 4;
                    const options: { value: string; label: string }[] = [];
                    for (let y = currentYear; y >= startYear; y--) {
                      for (let m = 12; m >= 1; m--) {
                        const val = `${y}-${String(m).padStart(2, '0')}`;
                        options.push({ value: val, label: `${MONTH_LABELS[m]} ${y}` });
                      }
                    }
                    return options.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ));
                  })()}
                </select>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="flex-shrink-0 p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Bulan berikutnya"
                >
                  &rsaquo;
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <div className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                Menampilkan data: <span className="font-semibold">{activeMonthLabel} {selectedMonth.split('-')[0]}</span>
              </div>
            </div>
          </>
        )}

        {/* TAHUNAN — year picker dengan navigasi */}
        {filterPeriod === 'tahunan' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3.5 w-3.5" />
                  Pilih Tahun
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => navigateYear(-1)}
                  className="flex-shrink-0 p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Tahun sebelumnya"
                >
                  &lsaquo;
                </button>
                <select
                  value={selectedYear}
                  onChange={(e) => onSelectedYearChange(Number(e.target.value))}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {availableYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => navigateYear(1)}
                  className="flex-shrink-0 p-2 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-100 transition"
                  aria-label="Tahun berikutnya"
                >
                  &rsaquo;
                </button>
              </div>
            </div>

            <div className="flex items-end">
              <div className="w-full px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
                Menampilkan data: <span className="font-semibold">Tahun {selectedYear}</span>
              </div>
            </div>
          </>
        )}

        {/* CUSTOM — tanggal mulai & selesai */}
        {filterPeriod === 'custom' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Mulai</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => onStartDateChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tanggal Selesai</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => onEndDateChange(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}