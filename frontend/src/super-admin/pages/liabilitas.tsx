import React, { useCallback, useEffect, useState, useMemo, useRef } from 'react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import LoadingSpinner from '../../components/LoadingSpinner';

const API_KEY = import.meta.env.VITE_API_KEY;

/* ────────────────────────── Types ────────────────────────── */

type StatusKewajiban = 'belum_lunas' | 'sebagian' | 'lunas' | 'dibatalkan';

interface Kewajiban {
  _id: string;
  kategori: string;
  nama: string;
  pihak?: string;
  jumlah_awal: number;
  sisa_jumlah: number;
  tanggal: string;
  jatuh_tempo?: string | null;
  status: StatusKewajiban;
  sumber?: string;
  keterangan?: string;
}

interface RingkasanKewajiban {
  total_kewajiban: number;
  jumlah_data: number;
}

interface RingkasanResponse {
  ringkasan?: RingkasanKewajiban;
  per_kategori?: Array<{ kategori: string; total: number; jumlah_data: number }>;
}

interface FormData {
  kategori: string;
  nama: string;
  pihak: string;
  jumlah: string;
  tanggal: string;
  jatuh_tempo: string;
  keterangan: string;
}

type SortField = 'nama' | 'jumlah_awal' | 'sisa_jumlah' | 'tanggal' | 'jatuh_tempo' | 'status';
type SortDir = 'asc' | 'desc';
type ToastVariant = 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

/* ────────────────────────── Constants ────────────────────────── */

const INITIAL_FORM: FormData = {
  kategori: 'utang_supplier',
  nama: '',
  pihak: '',
  jumlah: '',
  tanggal: new Date().toISOString().slice(0, 10),
  jatuh_tempo: '',
  keterangan: '',
};

const KATEGORI_OPTIONS = [
  { value: 'utang_supplier', label: 'Utang Supplier' },
  { value: 'pinjaman', label: 'Pinjaman' },
  { value: 'pajak_terutang', label: 'Pajak Terutang' },
  { value: 'gaji_terutang', label: 'Gaji Terutang' },
  { value: 'sewa_terutang', label: 'Sewa Terutang' },
  { value: 'lainnya', label: 'Lainnya' },
] as const;

const STATUS_CONFIG: Record<StatusKewajiban, { label: string; dot: string; bg: string; text: string }> = {
  belum_lunas: { label: 'Belum Lunas', dot: 'bg-amber-400', bg: 'bg-amber-50', text: 'text-amber-700' },
  sebagian:     { label: 'Sebagian',    dot: 'bg-blue-400',   bg: 'bg-blue-50',   text: 'text-blue-700' },
  lunas:        { label: 'Lunas',       dot: 'bg-emerald-400', bg: 'bg-emerald-50', text: 'text-emerald-700' },
  dibatalkan:   { label: 'Dibatalkan',  dot: 'bg-gray-400',   bg: 'bg-gray-100',  text: 'text-gray-500 line-through' },
};

const STATUS_FILTER_OPTIONS: Array<{ value: StatusKewajiban | ''; label: string }> = [
  { value: '', label: 'Semua Status' },
  { value: 'belum_lunas', label: 'Belum Lunas' },
  { value: 'sebagian', label: 'Sebagian' },
  { value: 'lunas', label: 'Lunas' },
  { value: 'dibatalkan', label: 'Dibatalkan' },
];

const BAR_COLORS = ['bg-indigo-500', 'bg-blue-500', 'bg-violet-500', 'bg-cyan-500', 'bg-sky-500', 'bg-slate-400'];

/* ────────────────────────── Helpers ────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(n || 0);

const fmtDate = (d?: string | null) =>
  d ? new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const kategoriLabel = (v: string) => KATEGORI_OPTIONS.find(o => o.value === v)?.label ?? v;

const clsx = (...classes: (string | false | undefined | null)[]) => classes.filter(Boolean).join(' ');

const INPUT_BASE =
  'w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition-colors focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none';

/* ────────────────────────── Sub-components ────────────────────────── */

const ToastItem: React.FC<{ toast: Toast; onDismiss: (id: string) => void }> = ({ toast, onDismiss }) => {
  useEffect(() => {
    const t = setTimeout(() => onDismiss(toast.id), 4000);
    return () => clearTimeout(t);
  }, [toast.id, onDismiss]);

  return (
    <div
      className={clsx(
        'flex items-center gap-2 rounded-lg px-4 py-3 text-sm font-medium shadow-lg ring-1 ring-inset',
        toast.variant === 'success'
          ? 'bg-emerald-50 text-emerald-700 ring-emerald-200'
          : 'bg-rose-50 text-rose-700 ring-rose-200'
      )}
    >
      <span>{toast.variant === 'success' ? '✓' : '✕'}</span>
      <span className="flex-1">{toast.message}</span>
      <button onClick={() => onDismiss(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
};

const PaymentModal: React.FC<{
  item: Kewajiban;
  onConfirm: (jumlah: number) => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ item, onConfirm, onCancel, loading }) => {
  const [raw, setRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const display = raw === '' ? '' : new Intl.NumberFormat('id-ID').format(Number(raw.replace(/\D/g, '')) || 0);
  const numeric = Number(raw.replace(/\D/g, '')) || 0;
  const isValid = numeric > 0 && numeric <= item.sisa_jumlah;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    onConfirm(numeric);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200"
      >
        <button type="button" onClick={onCancel} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors">✕</button>

        <h3 className="text-lg font-semibold text-slate-800">Pembayaran</h3>
        <p className="mt-1 text-sm text-slate-500">{item.nama} — {item.pihak || '-'}</p>

        <div className="mt-4 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-500">Sisa kewajiban</p>
          <p className="text-xl font-bold text-slate-900 tabular-nums">{fmt(item.sisa_jumlah)}</p>
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Jumlah bayar</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400">Rp</span>
            <input
              ref={inputRef}
              value={display}
              onChange={e => setRaw(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className={clsx(INPUT_BASE, 'pl-10', !isValid && raw !== '' && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100')}
            />
          </div>
          {raw !== '' && !isValid && (
            <p className="mt-1 text-xs text-rose-500">
              {numeric <= 0 ? 'Masukkan jumlah lebih dari 0' : 'Tidak boleh melebihi sisa kewajiban'}
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={!isValid || loading} className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? 'Memproses...' : 'Konfirmasi'}
          </button>
        </div>
      </form>
    </div>
  );
};

const DeleteModal: React.FC<{
  item: Kewajiban;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}> = ({ item, onConfirm, onCancel, loading }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
    <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200">
      <h3 className="text-lg font-semibold text-slate-800">Hapus Liabilitas</h3>
      <p className="mt-2 text-sm text-slate-500">
        Yakin ingin menghapus <span className="font-medium text-slate-700">{item.nama}</span>? Tindakan ini tidak dapat dibatalkan.
      </p>
      <div className="mt-6 flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
        <button type="button" onClick={onConfirm} disabled={loading} className="flex-1 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
          {loading ? 'Menghapus...' : 'Hapus'}
        </button>
      </div>
    </div>
  </div>
);

/* ────────────────────────── Main Component ────────────────────────── */

const Liabilitas: React.FC = () => {
  /* State: data */
  const [data, setData] = useState<Kewajiban[]>([]);
  const [ringkasan, setRingkasan] = useState<RingkasanKewajiban>({ total_kewajiban: 0, jumlah_data: 0 });
  const [perKategori, setPerKategori] = useState<RingkasanResponse['per_kategori']>([]);

  /* State: UI */
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM);

  /* State: search, filter, sort */
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusKewajiban | ''>('');
  const [filterKategori, setFilterKategori] = useState('');
  const [sortField, setSortField] = useState<SortField>('tanggal');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  /* State: modals */
  const [paymentTarget, setPaymentTarget] = useState<Kewajiban | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kewajiban | null>(null);

  /* State: toast */
  const [toasts, setToasts] = useState<Toast[]>([]);

  /* ── Helpers ── */

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = crypto.randomUUID();
    setToasts(prev => [...prev, { id, message, variant }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const getHeaders = useCallback((): HeadersInit => {
    const token = getStoredToken();
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  }, []);

  /* ── Data fetching ── */

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [listRes, sumRes] = await Promise.all([
        fetch(`${API_URL}/api/super-admin/kewajiban`, { headers: getHeaders() }),
        fetch(`${API_URL}/api/super-admin/kewajiban/ringkasan`, { headers: getHeaders() }),
      ]);
      if (!listRes.ok) throw new Error('Gagal mengambil data liabilitas');
      if (!sumRes.ok) throw new Error('Gagal mengambil ringkasan');

      const listJson = await listRes.json();
      const sumJson: RingkasanResponse = await sumRes.json();

      setData(Array.isArray(listJson) ? listJson : []);
      setRingkasan(sumJson.ringkasan || { total_kewajiban: 0, jumlah_data: 0 });
      setPerKategori(sumJson.per_kategori || []);
    } catch {
      addToast('Gagal memuat data liabilitas', 'error');
    } finally {
      setLoading(false);
    }
  }, [getHeaders, addToast]);

  useEffect(() => { fetchData(); }, [fetchData]);

  /* ── Filtered & sorted data ── */

  const filteredData = useMemo(() => {
    let result = [...data];

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        d => d.nama.toLowerCase().includes(q) || (d.pihak ?? '').toLowerCase().includes(q) || d.kategori.toLowerCase().includes(q)
      );
    }

    if (filterStatus) result = result.filter(d => d.status === filterStatus);
    if (filterKategori) result = result.filter(d => d.kategori === filterKategori);

    result.sort((a, b) => {
      let va: string | number, vb: string | number;
      switch (sortField) {
        case 'nama':        va = a.nama.toLowerCase(); vb = b.nama.toLowerCase(); break;
        case 'jumlah_awal': va = a.jumlah_awal; vb = b.jumlah_awal; break;
        case 'sisa_jumlah': va = a.sisa_jumlah; vb = b.sisa_jumlah; break;
        case 'tanggal':     va = a.tanggal; vb = b.tanggal; break;
        case 'jatuh_tempo': va = a.jatuh_tempo ?? ''; vb = b.jatuh_tempo ?? ''; break;
        case 'status':      va = a.status; vb = b.status; break;
        default:            va = a.tanggal; vb = b.tanggal;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [data, search, filterStatus, filterKategori, sortField, sortDir]);

  const activeFilters = (filterStatus ? 1 : 0) + (filterKategori ? 1 : 0) + (search.trim() ? 1 : 0);

  const clearFilters = () => {
    setSearch('');
    setFilterStatus('');
    setFilterKategori('');
  };

  /* ── Handlers ── */

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/super-admin/kewajiban`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          kategori: formData.kategori,
          nama: formData.nama,
          pihak: formData.pihak || null,
          jumlah: Number(formData.jumlah),
          tanggal: formData.tanggal,
          jatuh_tempo: formData.jatuh_tempo || null,
          keterangan: formData.keterangan || null,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Gagal menyimpan liabilitas');
      }
      setFormData(INITIAL_FORM);
      setShowForm(false);
      addToast('Liabilitas berhasil ditambahkan', 'success');
      await fetchData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async (jumlah: number) => {
    if (!paymentTarget) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/super-admin/kewajiban/${paymentTarget._id}/bayar`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ jumlah, tanggal: new Date().toISOString().slice(0, 10), metode_pembayaran: 'kas' }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Gagal memproses pembayaran');
      }
      addToast('Pembayaran berhasil dicatat', 'success');
      setPaymentTarget(null);
      await fetchData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/super-admin/kewajiban/${deleteTarget._id}`, {
        method: 'DELETE',
        headers: getHeaders(),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Gagal menghapus liabilitas');
      }
      addToast('Liabilitas berhasil dihapus', 'success');
      setDeleteTarget(null);
      await fetchData();
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
  };

  const SortArrow = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <span className="ml-1 opacity-25">↕</span>;
    return <span className="ml-1 text-indigo-500">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  /* ── Render ── */

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Liabilitas</h1>
              <p className="mt-1 text-sm text-slate-500">Kelola kewajiban dan utang perusahaan.</p>
            </div>
            <button
              type="button"
              onClick={() => setShowForm(f => !f)}
              className={clsx(
                'rounded-lg px-4 py-2.5 text-sm font-medium transition-colors shadow-sm',
                showForm
                  ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                  : 'bg-indigo-600 text-white hover:bg-indigo-700'
              )}
            >
              {showForm ? 'Tutup Form' : '+ Tambah Liabilitas'}
            </button>
          </div>
        </div>

        {/* ── Summary Cards ── */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Kewajiban</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{fmt(ringkasan.total_kewajiban)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Data Aktif</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{ringkasan.jumlah_data}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kategori</p>
            <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{perKategori?.length || 0}</p>
          </div>
        </div>

        {/* ── Per-Kategori Breakdown ── */}
        {perKategori && perKategori.length > 0 && (
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
        )}

        {/* ── Form ── */}
        {showForm && (
          <form onSubmit={handleSubmit} className="mb-8 rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-base font-semibold text-slate-800">Data Liabilitas Baru</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Kategori">
                <select name="kategori" value={formData.kategori} onChange={handleChange} className={INPUT_BASE}>
                  {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </Field>
              <Field label="Nama Kewajiban" required>
                <input name="nama" value={formData.nama} onChange={handleChange} placeholder="Contoh: Utang bahan baku" className={INPUT_BASE} required />
              </Field>
              <Field label="Pihak Terkait">
                <input name="pihak" value={formData.pihak} onChange={handleChange} placeholder="Nama supplier / pihak" className={INPUT_BASE} />
              </Field>
              <Field label="Jumlah" required>
                <input name="jumlah" value={formData.jumlah} onChange={handleChange} placeholder="0" type="number" min="1" className={INPUT_BASE} required />
              </Field>
              <Field label="Tanggal" required>
                <input name="tanggal" value={formData.tanggal} onChange={handleChange} type="date" className={INPUT_BASE} required />
              </Field>
              <Field label="Jatuh Tempo">
                <input name="jatuh_tempo" value={formData.jatuh_tempo} onChange={handleChange} type="date" className={INPUT_BASE} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Keterangan">
                <textarea name="keterangan" value={formData.keterangan} onChange={handleChange} placeholder="Opsional" className={INPUT_BASE} rows={2} />
              </Field>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
              <button
                type="button"
                onClick={() => { setFormData(INITIAL_FORM); setShowForm(false); }}
                className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Batal
              </button>
            </div>
          </form>
        )}

        {/* ── Search / Filter Bar ── */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-sm">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Cari nama, pihak, kategori..."
              className={INPUT_BASE}
            />
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value as StatusKewajiban | '')}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            >
              {STATUS_FILTER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select
              value={filterKategori}
              onChange={e => setFilterKategori(e.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 focus:outline-none"
            >
              <option value="">Semua Kategori</option>
              {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {activeFilters > 0 && (
              <button onClick={clearFilters} className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors whitespace-nowrap">
                Reset filter ({activeFilters})
              </button>
            )}
          </div>
        </div>

        {/* ── Table ── */}
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                {([
                  ['nama',        'Nama',        false],
                  ['kategori',    'Kategori',    false],
                  ['pihak',       'Pihak',       false],
                  ['jumlah_awal', 'Jumlah Awal', true],
                  ['sisa_jumlah', 'Sisa',        true],
                  ['jatuh_tempo', 'Jatuh Tempo', false],
                  ['status',      'Status',      false],
                ] as [SortField, string, boolean][]).map(([field, label, right]) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
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
                    <p className="text-sm font-medium text-slate-400">
                      {data.length === 0 ? 'Belum ada data liabilitas.' : 'Tidak ada data yang cocok dengan filter.'}
                    </p>
                    {data.length > 0 && (
                      <button onClick={clearFilters} className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-700">
                        Hapus semua filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredData.map(item => {
                  const progress = item.jumlah_awal > 0 ? ((item.jumlah_awal - item.sisa_jumlah) / item.jumlah_awal) * 100 : 0;
                  const st = STATUS_CONFIG[item.status];
                  const isPayable = item.status !== 'lunas' && item.status !== 'dibatalkan';

                  const isOverdue = item.jatuh_tempo && new Date(item.jatuh_tempo) < new Date() && isPayable;
                  const isNearDue = (() => {
                    if (!item.jatuh_tempo || !isPayable) return false;
                    const diff = (new Date(item.jatuh_tempo).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24);
                    return diff >= 0 && diff <= 7;
                  })();

                  return (
                    <tr key={item._id} className={clsx('transition-colors hover:bg-slate-50/80', isOverdue && 'bg-rose-50/40')}>
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
                          {isOverdue && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-rose-500">Lewat</span>}
                          {isNearDue && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wide text-amber-500">Segera</span>}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={clsx('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', st.bg, st.text)}>
                          <span className={clsx('h-1.5 w-1.5 rounded-full', st.dot)} />
                          {st.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1">
                          {isPayable && (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setPaymentTarget(item)}
                              className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-100 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              Bayar
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => setDeleteTarget(item)}
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
                            title="Hapus"
                          >
                            ✕
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

        {/* ── Table Footer ── */}
        {filteredData.length > 0 && (
          <div className="mt-3 flex items-center justify-between px-1">
            <p className="text-xs text-slate-400">
              Menampilkan {filteredData.length} dari {data.length} data
            </p>
            <p className="text-xs text-slate-400">
              Total sisa: <span className="font-semibold text-slate-600 tabular-nums">{fmt(filteredData.reduce((s, d) => s + d.sisa_jumlah, 0))}</span>
            </p>
          </div>
        )}

        <div className="h-8" />
      </div>

      {/* ── Modals ── */}
      {paymentTarget && (
        <PaymentModal item={paymentTarget} onConfirm={handlePay} onCancel={() => setPaymentTarget(null)} loading={saving} />
      )}
      {deleteTarget && (
        <DeleteModal item={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />
      )}

      {/* ── Toasts ── */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 w-80">
          {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />)}
        </div>
      )}
    </div>
  );
};

/* ────────────────────────── Utility ────────────────────────── */

const Field: React.FC<{ label: string; required?: boolean; children: React.ReactNode }> = ({ label, required, children }) => (
  <div>
    <label className="mb-1.5 block text-xs font-medium text-slate-500">
      {label}{required && <span className="ml-0.5 text-rose-400">*</span>}
    </label>
    {children}
  </div>
);

export default Liabilitas;