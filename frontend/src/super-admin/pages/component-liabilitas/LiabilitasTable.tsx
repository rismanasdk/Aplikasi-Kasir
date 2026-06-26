import { STATUS_CONFIG } from './constants';
import type { Kewajiban, SortDir, SortField } from './types';
import { clsx, fmt, fmtDate, kategoriLabel } from './utils';

interface LiabilitasTableProps {
  data: Kewajiban[];
  filteredData: Kewajiban[];
  sortField: SortField;
  sortDir: SortDir;
  newlyAddedId: string | null;
  saving: boolean;
  onSort: (field: SortField) => void;
  onPay: (item: Kewajiban) => void;
  onDelete: (item: Kewajiban) => void;
  onClearFilters: () => void;
}

export default function LiabilitasTable({
  data,
  filteredData,
  sortField,
  sortDir,
  newlyAddedId,
  saving,
  onSort,
  onPay,
  onDelete,
  onClearFilters,
}: LiabilitasTableProps) {
  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 opacity-25">↕</span>;
    return <span className="ml-1 text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80">
            {([
              ['nama', 'Nama', false],
              ['kategori', 'Kategori', false],
              ['pihak', 'Pihak', false],
              ['jumlah_awal', 'Jumlah Awal', true],
              ['sisa_jumlah', 'Sisa', true],
              ['jatuh_tempo', 'Jatuh Tempo', false],
              ['status', 'Status', false],
            ] as [SortField, string, boolean][]).map(([field, label, right]) => (
              <th
                key={field}
                onClick={() => onSort(field)}
                className={clsx(
                  'px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 cursor-pointer select-none hover:text-slate-700 transition-colors',
                  right && 'text-right'
                )}
              >
                {label}<SortArrow field={field} />
              </th>
            ))}
            <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {filteredData.length === 0 ? (
            <tr>
              <td colSpan={8} className="px-5 py-20 text-center">
                <div className="flex flex-col items-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 mb-3">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" /></svg>
                  </div>
                  <p className="text-sm font-medium text-slate-400">
                    {data.length === 0 ? 'Belum ada data liabilitas.' : 'Tidak ada data yang cocok dengan filter.'}
                  </p>
                  {data.length > 0 && (
                    <button onClick={onClearFilters} className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                      Hapus semua filter
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ) : (
            filteredData.map(item => {
              const progress = item.jumlah_awal > 0 ? ((item.jumlah_awal - item.sisa_jumlah) / item.jumlah_awal) * 100 : 0;
              const st = STATUS_CONFIG[item.status] ?? STATUS_CONFIG.belum_lunas;
              const isPayable = item.status !== 'lunas' && item.status !== 'dibatalkan';
              const isNew = newlyAddedId === item._id;

              const isOverdue = item.jatuh_tempo && new Date(item.jatuh_tempo) < new Date() && isPayable;
              const isNearDue = (() => {
                if (!item.jatuh_tempo || !isPayable) return false;
                const diff = (new Date(item.jatuh_tempo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                return diff >= 0 && diff <= 7;
              })();

              return (
                <tr
                  key={item._id}
                  className={clsx(
                    'transition-colors hover:bg-slate-50/80',
                    isNew && 'row-new',
                    !isNew && isOverdue && 'bg-rose-50/40'
                  )}
                >
                  <td className="px-5 py-3.5">
                    <div>
                      <span className="font-medium text-slate-800">{item.nama}</span>
                      {item.keterangan && (
                        <p className="mt-0.5 text-xs text-slate-400 truncate max-w-[200px]">{item.keterangan}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {kategoriLabel(item.kategori)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{item.pihak || '—'}</td>
                  <td className="px-5 py-3.5 text-right tabular-nums text-slate-500">{fmt(item.jumlah_awal)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-col items-end gap-1">
                      <span className="tabular-nums font-semibold text-slate-800">{fmt(item.sisa_jumlah)}</span>
                      {item.status === 'sebagian' && (
                        <div className="flex items-center gap-2">
                          <div className="h-1 w-16 overflow-hidden rounded-full bg-slate-100">
                            <div className="h-full rounded-full bg-blue-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                          </div>
                          <span className="text-[10px] tabular-nums text-slate-400">{Math.round(progress)}%</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={clsx('tabular-nums', isOverdue ? 'text-rose-600 font-medium' : isNearDue ? 'text-amber-600 font-medium' : 'text-slate-500')}>
                      {fmtDate(item.jatuh_tempo)}
                      {isOverdue && <span className="ml-1.5 inline-flex items-center rounded-full bg-rose-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-rose-600">Lewat</span>}
                      {isNearDue && <span className="ml-1.5 inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-600">Segera</span>}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', st.bg, st.text)}>
                      <span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />
                      {st.label}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {isPayable && (
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => onPay(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                          Bayar
                        </button>
                      )}
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => onDelete(item)}
                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                        title="Hapus"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
