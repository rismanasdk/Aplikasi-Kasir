import { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';

import type {
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import type { Riwayat } from './utils-modal/types';

// ── Registrasi modul Chart.js ──
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartLineProps {
  filteredRiwayat: Riwayat[];
  filterPeriod: 'custom' | 'bulanan' | 'tahunan';
  selectedMonth: string;   // "YYYY-MM"
  selectedYear: number;
  formatCurrency: (amount: number) => string;
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun',
  'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des',
];

/**
 * Helper: ambil label & aggregasi per periode dari array riwayat.
 * - bulanan  → per hari dalam bulan terpilih
 * - tahunan  → per bulan dalam tahun terpilih
 * - custom   → per bulan dalam range tanggal
 */
function aggregateByPeriod(
  riwayat: Riwayat[],
  period: ChartLineProps['filterPeriod'],
  selectedMonth: string,
) {
  const pemasukanMap = new Map<string, number>();
  const pengeluaranMap = new Map<string, number>();
  const labels: string[] = [];

  if (period === 'bulanan') {
    // Group per hari dalam 1 bulan
    const [year, month] = selectedMonth.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const key = String(d);
      labels.push(`${d}`);
      pemasukanMap.set(key, 0);
      pengeluaranMap.set(key, 0);
    }

    riwayat.forEach((item) => {
      const dt = new Date(item.tanggal);
      const day = dt.getDate();
      const key = String(day);
      if (!pemasukanMap.has(key)) return;

      if (item.tipe === 'pemasukan') {
        pemasukanMap.set(key, (pemasukanMap.get(key) ?? 0) + item.jumlah);
      } else {
        pengeluaranMap.set(key, (pengeluaranMap.get(key) ?? 0) + item.jumlah);
      }
    });
  } else if (period === 'tahunan') {
    // Group per bulan dalam 1 tahun
    for (let m = 1; m <= 12; m++) {
      const key = String(m);
      labels.push(MONTH_SHORT[m - 1]);
      pemasukanMap.set(key, 0);
      pengeluaranMap.set(key, 0);
    }

    riwayat.forEach((item) => {
      const dt = new Date(item.tanggal);
      const month = dt.getMonth() + 1;
      const key = String(month);

      if (item.tipe === 'pemasukan') {
        pemasukanMap.set(key, (pemasukanMap.get(key) ?? 0) + item.jumlah);
      } else {
        pengeluaranMap.set(key, (pengeluaranMap.get(key) ?? 0) + item.jumlah);
      }
    });
  } else {
    // custom → group per bulan
    const monthSet = new Set<string>();
    riwayat.forEach((item) => {
      const dt = new Date(item.tanggal);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(key);
      if (!pemasukanMap.has(key)) pemasukanMap.set(key, 0);
      if (!pengeluaranMap.has(key)) pengeluaranMap.set(key, 0);
    });

    // Sort bulan secara kronologis
    const sortedMonths = Array.from(monthSet).sort();
    sortedMonths.forEach((key) => {
      const [y, m] = key.split('-').map(Number);
      labels.push(`${MONTH_SHORT[m - 1]} ${y}`);
    });

    riwayat.forEach((item) => {
      const dt = new Date(item.tanggal);
      const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;

      if (item.tipe === 'pemasukan') {
        pemasukanMap.set(key, (pemasukanMap.get(key) ?? 0) + item.jumlah);
      } else {
        pengeluaranMap.set(key, (pengeluaranMap.get(key) ?? 0) + item.jumlah);
      }
    });
  }

  const pemasukanData = labels.map((_, i) => {
    const key = period === 'bulanan' ? String(i + 1) : period === 'tahunan' ? String(i + 1) : undefined;
    if (key) return pemasukanMap.get(key) ?? 0;
    // custom
    return pemasukanMap.get(Array.from(pemasukanMap.keys()).sort()[i]) ?? 0;
  });

  const pengeluaranData = labels.map((_, i) => {
    const key = period === 'bulanan' ? String(i + 1) : period === 'tahunan' ? String(i + 1) : undefined;
    if (key) return pengeluaranMap.get(key) ?? 0;
    // custom
    return pengeluaranMap.get(Array.from(pengeluaranMap.keys()).sort()[i]) ?? 0;
  });

  return { labels, pemasukanData, pengeluaranData };
}

export default function ChartLine({
  filteredRiwayat,
  filterPeriod,
  selectedMonth,
  selectedYear,
}: ChartLineProps) {
  const { labels, pemasukanData, pengeluaranData } = useMemo(
    () => aggregateByPeriod(filteredRiwayat, filterPeriod, selectedMonth),
    [filteredRiwayat, filterPeriod, selectedMonth]
  );

  const data = {
    labels,
    datasets: [
      {
        label: 'Pemasukan',
        data: pemasukanData,
        borderColor: 'rgb(34, 197, 94)',       // hijau
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      },
      {
        label: 'Pengeluaran',
        data: pengeluaranData,
        borderColor: 'rgb(239, 68, 68)',       // merah
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.3,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        borderWidth: 2.5,
      },
    ],
  };

const options: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,

  interaction: {
    mode: 'index',
    intersect: false,
  },

  plugins: {
    legend: {
      position: 'top',
      labels: {
        usePointStyle: true,
        pointStyle: 'circle',
        padding: 20,
        font: {
          size: 13,
          weight: 500,
        },
      },
    },

    title: {
      display: true,
      text:
        filterPeriod === 'bulanan'
          ? `Trend Cash Flow — ${
              MONTH_SHORT[
                parseInt(selectedMonth.split('-')[1], 10) - 1
              ]
            } ${selectedMonth.split('-')[0]}`
          : filterPeriod === 'tahunan'
          ? `Trend Cash Flow — Tahun ${selectedYear}`
          : 'Trend Cash Flow — Periode Custom',

      font: {
        size: 16,
        weight: 600,
      },

      padding: {
        bottom: 16,
      },
    },

    tooltip: {
      backgroundColor: 'rgba(0,0,0,.8)',
      titleFont: {
        size: 13,
      },

      bodyFont: {
        size: 12,
      },

      padding: 12,
      cornerRadius: 8,

      callbacks: {
        label(context: TooltipItem<'line'>) {
          const value = new Intl.NumberFormat('id-ID', {
            style: 'currency',
            currency: 'IDR',
            minimumFractionDigits: 0,
          }).format(context.parsed.y ?? 0);

          return `${context.dataset.label ?? ''}: ${value}`;
        },
      },
    },
  },

  scales: {
    x: {
      grid: {
        display: false,
      },

      ticks: {
        font: {
          size: 11,
        },

        maxRotation: 45,
        minRotation: 0,
      },
    },

    y: {
      beginAtZero: true,

      grid: {
        color: 'rgba(0,0,0,.06)',
      },

      ticks: {
        font: {
          size: 11,
        },

        callback(value) {
          const number = Number(value);

          if (number >= 1_000_000) {
            return `Rp ${(number / 1_000_000).toFixed(1)}jt`;
          }

          if (number >= 1_000) {
            return `Rp ${(number / 1_000).toFixed(0)}rb`;
          }

          return `Rp ${number}`;
        },
      },
    },
  },
};

  // Jika tidak ada data sama sekali, tampilkan pesan kosong
  const hasData = pemasukanData.some((v) => v > 0) || pengeluaranData.some((v) => v > 0);

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
      <div className="p-6">
        {!hasData ? (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <p className="text-sm font-medium">Belum ada data transaksi pada periode ini</p>
            <p className="text-xs mt-1">Chart akan muncul setelah ada transaksi</p>
          </div>
        ) : (
          <div className="relative" style={{ height: '360px' }}>
            <Line data={data} options={options} />
          </div>
        )}
      </div>
    </div>
  );
}