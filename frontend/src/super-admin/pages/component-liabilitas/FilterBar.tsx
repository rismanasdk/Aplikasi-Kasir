import { INPUT_BASE, KATEGORI_OPTIONS, STATUS_FILTER_OPTIONS } from './constants';
import type { StatusKewajiban } from './types';
import { clsx } from './utils';

interface FilterBarProps {
  search: string;
  filterStatus: StatusKewajiban | '';
  filterKategori: string;
  activeFilters: number;
  onSearchChange: (value: string) => void;
  onFilterStatusChange: (value: StatusKewajiban | '') => void;
  onFilterKategoriChange: (value: string) => void;
  onClearFilters: () => void;
}

export default function FilterBar({
  search,
  filterStatus,
  filterKategori,
  activeFilters,
  onSearchChange,
  onFilterStatusChange,
  onFilterKategoriChange,
  onClearFilters,
}: FilterBarProps) {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative flex-1 max-w-sm">
        <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          placeholder="Cari nama, pihak, kategori..."
          className={clsx(INPUT_BASE, 'pl-10')}
        />
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={filterStatus}
          onChange={e => onFilterStatusChange(e.target.value as StatusKewajiban | '')}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
        >
          {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select
          value={filterKategori}
          onChange={e => onFilterKategoriChange(e.target.value)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
        >
          <option value="">Semua Kategori</option>
          {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        {activeFilters > 0 && (
          <button onClick={onClearFilters} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            Reset ({activeFilters})
          </button>
        )}
      </div>
    </div>
  );
}
