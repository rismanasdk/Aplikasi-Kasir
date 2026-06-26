import type { KategoriSummary, RingkasanLiabilitas } from './types';
import { fmt } from './utils';

interface SummaryCardsProps {
  ringkasan: RingkasanLiabilitas;
  perKategori: KategoriSummary[];
}

export default function SummaryCards({ ringkasan, perKategori }: SummaryCardsProps) {
  return (
    <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
      <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Kewajiban</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" /></svg>
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{fmt(ringkasan.total_kewajiban)}</p>
      </div>
      <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Data Aktif</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{ringkasan.jumlah_data}</p>
      </div>
      <div className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kategori</p>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-500">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
          </div>
        </div>
        <p className="mt-3 text-2xl font-bold tabular-nums text-slate-900">{perKategori.length}</p>
      </div>
    </div>
  );
}
