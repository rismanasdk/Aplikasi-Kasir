// omzetchart.tsx
import React from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import type { ChartData, ChartOptions, TooltipItem } from 'chart.js';

// Registrasi komponen Chart.js
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

interface OmzetData {
  hari_ini: number;
  minggu_ini: number;
  bulan_ini: number;
  tahun_ini: number;
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
  detail_tahun: {
    bulan: string;
    omzet: number;
  }[];
}

interface OmzetChartProps {
  omzetData: OmzetData | null;
  selectedPeriod: 'hari' | 'minggu' | 'bulan' | 'tahun';
  setSelectedPeriod: (period: 'hari' | 'minggu' | 'bulan' | 'tahun') => void;
  formatRupiah: (amount: number) => string;
}

const OmzetChart: React.FC<OmzetChartProps> = ({ 
  omzetData, 
  selectedPeriod, 
  setSelectedPeriod,
  formatRupiah
}) => {
  // Data untuk chart berdasarkan periode yang dipilih
  const getChartData = () => {
    if (!omzetData) {
      return {
        labels: [],
        values: []
      };
    }

    switch (selectedPeriod) {
      case 'hari':
        // Data untuk hari ini (per jam)
        return {
          labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
          values: [
            omzetData.hari_ini * 0.05,
            omzetData.hari_ini * 0.1,
            omzetData.hari_ini * 0.25,
            omzetData.hari_ini * 0.4,
            omzetData.hari_ini * 0.7,
            omzetData.hari_ini * 0.9,
            omzetData.hari_ini
          ]
        };
      case 'minggu':
        // Data untuk minggu ini (per hari)
        return {
          labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'],
          values: [
            omzetData.minggu_ini * 0.1,
            omzetData.minggu_ini * 0.2,
            omzetData.minggu_ini * 0.3,
            omzetData.minggu_ini * 0.5,
            omzetData.minggu_ini * 0.7,
            omzetData.minggu_ini * 0.85,
            omzetData.minggu_ini
          ]
        };
      case 'bulan':
        // Data untuk bulan ini (per minggu)
        return {
          labels: ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'],
          values: [
            omzetData.bulan_ini * 0.2,
            omzetData.bulan_ini * 0.5,
            omzetData.bulan_ini * 0.75,
            omzetData.bulan_ini
          ]
        };
      case 'tahun':
        return {
          labels: ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'],
          values: [
            omzetData.tahun_ini * 0.08,
            omzetData.tahun_ini * 0.15,
            omzetData.tahun_ini * 0.25,
            omzetData.tahun_ini * 0.4,
            omzetData.tahun_ini * 0.6,
            omzetData.tahun_ini * 0.8,
            omzetData.tahun_ini * 0.9,
            omzetData.tahun_ini * 0.95,
            omzetData.tahun_ini * 0.98,
            omzetData.tahun_ini * 0.99,
            omzetData.tahun_ini * 0.995,
            omzetData.tahun_ini
          ]
        };
      default:
        return {
          labels: [],
          values: []
        };
    }
  };

  const chartData = getChartData();

  // Konfigurasi diagram garis
  const lineChartData: ChartData<'line'> = {
    labels: chartData.labels,
    datasets: [
      {
        label: 'Omzet (Rp)',
        data: chartData.values,
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)',
        pointRadius: 6,
        pointHoverRadius: 8,
        fill: true,
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
            const value = context.parsed.y;
            if (value === null) return 'Omzet: Rp 0';
            return `Omzet: ${formatRupiah(value)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: function(value) {
            if (typeof value === 'number') {
              return formatRupiah(value);
            }
            return value;
          },
          // Sedikit lebih kecil di layar sempit biar label tidak numpuk
          font: {
            size: 11
          }
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)',
        }
      },
      x: {
        ticks: {
          font: {
            size: 11
          },
          maxRotation: 0,
          autoSkip: true,
          autoSkipPadding: 8
        },
        grid: {
          display: false,
        }
      }
    },
    animation: {
      duration: 1000,
      easing: 'easeOutQuart' as const
    }
  };

  // Warna tombol berdasarkan periode yang dipilih
  const getButtonClass = (period: 'hari' | 'minggu' | 'bulan' | 'tahun') => {
    const baseClass = "px-3 py-1.5 md:px-4 md:py-2 text-xs md:text-sm rounded-md transition-colors whitespace-nowrap flex-shrink-0";
    
    if (selectedPeriod === period) {
      switch (period) {
        case 'hari':
          return `${baseClass} bg-blue-500 text-white shadow-md`;
        case 'minggu':
          return `${baseClass} bg-green-500 text-white shadow-md`;
        case 'bulan':
          return `${baseClass} bg-purple-500 text-white shadow-md`;
        case 'tahun':
          return `${baseClass} bg-red-500 text-white shadow-md`;
      }
    } else {
      return `${baseClass} bg-gray-100 text-gray-700 hover:bg-gray-200`;
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-4 md:p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-800">Grafik Omzet</h2>

        {/* Tombol periode: bisa di-scroll horizontal di mobile agar tidak wrap berantakan */}
        <div className="flex space-x-2 overflow-x-auto pb-1 -mx-1 px-1 sm:mx-0 sm:px-0 sm:pb-0 scrollbar-hide">
          <button
            onClick={() => setSelectedPeriod('hari')}
            className={getButtonClass('hari')}
          >
            Hari Ini
          </button>
          <button
            onClick={() => setSelectedPeriod('minggu')}
            className={getButtonClass('minggu')}
          >
            Minggu Ini
          </button>
          <button
            onClick={() => setSelectedPeriod('bulan')}
            className={getButtonClass('bulan')}
          >
            Bulan Ini
          </button>
          <button
            onClick={() => setSelectedPeriod('tahun')}
            className={getButtonClass('tahun')}
          >
            Tahun Ini
          </button>
        </div>
      </div>

      {/* Diagram Garis menggunakan Chart.js */}
      <div className="h-56 sm:h-64 md:h-80">
        <Line data={lineChartData} options={lineChartOptions} />
      </div>
      
      {/* Info tambahan berdasarkan periode yang dipilih */}
      <div className="mt-4 text-xs md:text-sm text-gray-600">
        {selectedPeriod === 'hari' && (
          <p>Grafik menampilkan proyeksi omzet per jam untuk hari ini</p>
        )}
        {selectedPeriod === 'minggu' && (
          <p>Grafik menampilkan proyeksi omzet per hari untuk minggu ini</p>
        )}
        {selectedPeriod === 'bulan' && (
          <p>Grafik menampilkan proyeksi omzet per minggu untuk bulan ini</p>
        )}
        {selectedPeriod === 'tahun' && (
          <p>Grafik menampilkan proyeksi omzet per bulan untuk tahun ini</p>
        )}
      </div>
    </div>
  );
};

export default OmzetChart;