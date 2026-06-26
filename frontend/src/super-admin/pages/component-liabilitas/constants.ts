import type { LiabilitasFormData, StatusKewajiban } from './types';

export const INITIAL_FORM: LiabilitasFormData = {
  kategori: 'utang_supplier',
  nama: '',
  pihak: '',
  jumlah: '',
  tanggal: new Date().toISOString().slice(0, 10),
  jatuh_tempo: '',
  keterangan: '',
};

export const KATEGORI_OPTIONS = [
  { value: 'utang_supplier', label: 'Utang Supplier' },
  { value: 'pinjaman', label: 'Pinjaman' },
  { value: 'pajak_terutang', label: 'Pajak Terutang' },
  { value: 'gaji_terutang', label: 'Gaji Terutang' },
  { value: 'sewa_terutang', label: 'Sewa Terutang' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

export const STATUS_CONFIG: Record<StatusKewajiban, { label: string; dot: string; bg: string; text: string }> = {
  belum_lunas: { label: 'Belum Lunas', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  sebagian: { label: 'Sebagian', dot: 'bg-blue-400', bg: 'bg-blue-50', text: 'text-blue-700' },
  lunas: { label: 'Lunas', dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  dibatalkan: { label: 'Dibatalkan', dot: 'bg-gray-400', bg: 'bg-gray-100', text: 'text-gray-500 line-through' },
};

export const STATUS_FILTER_OPTIONS: Array<{ value: StatusKewajiban | ''; label: string }> = [
  { value: '', label: 'Semua Status' },
  { value: 'belum_lunas', label: 'Belum Lunas' },
  { value: 'sebagian', label: 'Sebagian' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'dibatalkan', label: 'Dibatalkan' },
];

export const BAR_COLORS = ['bg-indigo-500', 'bg-blue-500', 'bg-violet-500', 'bg-cyan-500', 'bg-sky-500', 'bg-slate-400'];

export const INPUT_BASE =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none';
