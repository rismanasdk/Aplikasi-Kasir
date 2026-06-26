import { KATEGORI_OPTIONS } from './constants';
import type { Kewajiban, LiabilitasFormData, StatusKewajiban } from './types';

export const fmt = (n: number) => {
  const formatted = new Intl.NumberFormat('id-ID').format(n || 0);
  return `Rp ${formatted}`;
};

export const fmtInput = (raw: string) => {
  const digits = raw.replace(/\D/g, '');
  return digits ? new Intl.NumberFormat('id-ID').format(Number(digits)) : '';
};

export const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const kategoriLabel = (v: string) => KATEGORI_OPTIONS.find(o => o.value === v)?.label ?? v;

export const clsx = (...classes: (string | false | undefined | null)[]) => classes.filter(Boolean).join(' ');

export const makeId = (prefix = 'id') => {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const VALID_STATUS = new Set<StatusKewajiban>(['belum_lunas', 'sebagian', 'lunas', 'dibatalkan']);

export const normalizeKewajiban = (value: unknown, fallback?: LiabilitasFormData): Kewajiban | null => {
  if (!value || typeof value !== 'object') return null;

  const source = value as Partial<Kewajiban> & { id?: string };
  const jumlahAwal = Number(source.jumlah_awal ?? fallback?.jumlah ?? 0);
  const sisaJumlah = Number(source.sisa_jumlah ?? jumlahAwal);
  const status = VALID_STATUS.has(source.status as StatusKewajiban)
    ? (source.status as StatusKewajiban)
    : 'belum_lunas';

  return {
    _id: String(source._id ?? source.id ?? makeId('local')),
    kategori: String(source.kategori ?? fallback?.kategori ?? 'lainnya'),
    nama: String(source.nama ?? fallback?.nama ?? ''),
    pihak: source.pihak ?? fallback?.pihak ?? undefined,
    jumlah_awal: Number.isFinite(jumlahAwal) ? jumlahAwal : 0,
    sisa_jumlah: Number.isFinite(sisaJumlah) ? sisaJumlah : 0,
    tanggal: String(source.tanggal ?? fallback?.tanggal ?? new Date().toISOString()),
    jatuh_tempo: source.jatuh_tempo ?? fallback?.jatuh_tempo ?? null,
    status,
    sumber: source.sumber,
    keterangan: source.keterangan ?? fallback?.keterangan ?? undefined,
  };
};
