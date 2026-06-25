import {  CircleDollarSign, TrendingDown, TrendingUp, Wallet } from 'lucide-react';
import type { ModalUtama } from '../utils-modal/types';

interface ModalSummaryCardsProps {
  modalData: ModalUtama | null;
  totalPemasukan: number;
  totalPengeluaran: number;
  formatCurrency: (amount: number) => string;
}

export default function ModalSummaryCards({
  modalData,
  totalPemasukan,
  totalPengeluaran,
  formatCurrency,
}: ModalSummaryCardsProps) {

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-100 hover:shadow-lg transition-all lg:col-span-2">
        <div className="flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4 flex-shrink-0">
            <CircleDollarSign className="h-6 w-6 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-blue-800">Modal Utama</h3>
            <p className="text-xl font-bold text-blue-700 truncate">
              {modalData ? formatCurrency(modalData.sisa_modal) : '-'}
            </p>
            <p className="text-xs text-blue-600">periode terpilih</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-100 hover:shadow-lg transition-all lg:col-span-2">
        <div className="flex items-center">
          <div className="rounded-full bg-blue-100 p-3 mr-4 flex-shrink-0">
            <Wallet className="h-6 w-6 text-blue-600" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-medium text-blue-800">Kas</h3>
            <p className="text-xl font-bold text-blue-700 truncate">
              {modalData ? formatCurrency(modalData.saldo_kas) : '-'}
            </p>
            <p className="text-xs text-blue-600">periode terpilih</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border border-green-100 hover:shadow-lg transition-all lg:col-span-2">
        <div className="flex items-center">
          <div className="rounded-full bg-green-100 p-3 mr-4">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-green-800">Total Pemasukan</h3>
            <p className="text-xl font-bold text-green-700">{formatCurrency(totalPemasukan)}</p>
            <p className="text-xs text-green-600">periode terpilih</p>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-md p-6 border border-amber-100 hover:shadow-lg transition-all lg:col-span-2">
        <div className="flex items-center">
          <div className="rounded-full bg-amber-100 p-3 mr-4">
            <TrendingDown className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-amber-800">Total Pengeluaran</h3>
            <p className="text-xl font-bold text-amber-700">{formatCurrency(totalPengeluaran)}</p>
            <p className="text-xs text-amber-600">periode terpilih</p>
          </div>
        </div>
      </div>
    </div>
  );
}
