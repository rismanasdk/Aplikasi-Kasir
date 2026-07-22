import React from 'react';
import { TrendingUp, DollarSign, ShoppingCart, TrendingDown, Package } from 'lucide-react';

interface SummaryCardsProps {
  formatRupiah: (amount: number) => string;
  totalLabaKotor: number;
  totalPendapatan: number;
  totalBarangTerjualHariIni: number;
  labaBersih: number;
  totalHpp: number;
  totalBebanPerhari: number;
  totalBebanPerbulan: number;
}

const SummaryCards: React.FC<SummaryCardsProps> = ({
  formatRupiah,
  totalLabaKotor,
  totalPendapatan,
  totalBarangTerjualHariIni,
  labaBersih,
  totalHpp,
  totalBebanPerhari,
  totalBebanPerbulan,
}) => {
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-100 hover:shadow-lg transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-blue-100 p-3">
              <TrendingUp className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-blue-800">Total Laba Kotor</h3>
              <p className={`text-2xl font-bold ${totalLabaKotor >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{formatRupiah(totalLabaKotor)}</p>
              <p className="text-xs text-blue-600">periode terpilih</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border border-green-100 hover:shadow-lg transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-green-100 p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-green-800">Total Pendapatan</h3>
              <p className="text-2xl font-bold text-green-700">{formatRupiah(totalPendapatan)}</p>
              <p className="text-xs text-green-600">periode terpilih</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-md p-6 border border-amber-100 hover:shadow-lg transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-amber-100 p-3">
              <ShoppingCart className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-amber-800">Total Barang Terjual</h3>
              <p className="text-2xl font-bold text-amber-700">{totalBarangTerjualHariIni}</p>
              <p className="text-xs text-amber-600">per bulan</p>
            </div>
          </div>
        </div>

        <div className={`bg-gradient-to-br ${labaBersih >= 0 ? 'from-purple-50 to-purple-100' : 'from-red-50 to-red-100'} rounded-xl shadow-md p-6 border ${labaBersih >= 0 ? 'border-purple-100' : 'border-red-100'} hover:shadow-lg transition-all min-h-[160px]`}>
          <div className="flex flex-col h-full justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`rounded-full ${labaBersih >= 0 ? 'bg-purple-100' : 'bg-red-100'} p-3`}>
                {labaBersih >= 0 ? <TrendingUp className="h-6 w-6 text-purple-600" /> : <TrendingDown className="h-6 w-6 text-red-600" />}
              </div>
              <h3 className={`text-sm font-medium ${labaBersih >= 0 ? 'text-purple-800' : 'text-red-800'}`}>Laba Bersih</h3>
            </div>
            <div>
              <p className={`text-2xl md:text-3xl font-bold ${labaBersih >= 0 ? 'text-purple-700' : 'text-red-600'} break-words leading-tight`}>{formatRupiah(labaBersih)}</p>
            </div>
            <p className={`text-xs ${labaBersih >= 0 ? 'text-purple-600' : 'text-red-600'}`}>periode terpilih</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-md p-6 border border-indigo-100 hover:shadow-lg transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-indigo-100 p-3">
              <Package className="h-6 w-6 text-indigo-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-indigo-800">Total HPP</h3>
              <p className="text-2xl font-bold text-indigo-700">{formatRupiah(totalHpp)}</p>
              <p className="text-xs text-indigo-600">periode terpilih</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl shadow-md p-6 border border-rose-100 hover:shadow-lg transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-rose-100 p-3">
              <TrendingDown className="h-6 w-6 text-rose-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-rose-800">Total Beban (Hari Ini)</h3>
              <p className="text-2xl font-bold text-rose-700">{formatRupiah(totalBebanPerhari)}</p>
              <p className="text-xs text-rose-600">hari ini</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md p-6 border border-red-100 hover:shadow-lg transition-all">
          <div className="flex items-center gap-4">
            <div className="rounded-full bg-red-100 p-3">
              <TrendingDown className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Total Beban (Perbulan)</h3>
              <p className="text-2xl font-bold text-red-700">{formatRupiah(totalBebanPerbulan)}</p>
              <p className="text-xs text-red-600">jumlah semua hari</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SummaryCards;
