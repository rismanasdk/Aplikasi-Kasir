import { BAR_COLORS } from './constants';
import type { KategoriSummary, RingkasanLiabilitas } from './types';
import { clsx, fmt, kategoriLabel } from './utils';

interface KategoriBreakdownProps {
  perKategori: KategoriSummary[];
  ringkasan: RingkasanLiabilitas;
}

export default function KategoriBreakdown({ perKategori, ringkasan }: KategoriBreakdownProps) {
  if (perKategori.length === 0) return null;

  return (
    <div className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">Rincian per Kategori</h2>
      <div className="space-y-4">
        {perKategori.map((item, idx) => {
          const pct = ringkasan.total_kewajiban > 0 ? (item.total / ringkasan.total_kewajiban) * 100 : 0;
          return (
            <div key={item.kategori}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-sm font-medium text-slate-700">{kategoriLabel(item.kategori)}</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-semibold tabular-nums text-slate-900">{fmt(item.total)}</span>
                  <span className="text-xs text-slate-400">({item.jumlah_data} data)</span>
                </div>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={clsx('h-full rounded-full transition-all duration-700', BAR_COLORS[idx % BAR_COLORS.length])}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
