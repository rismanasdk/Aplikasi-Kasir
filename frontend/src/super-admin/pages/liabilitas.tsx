import type React from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import LoadingSpinner from '../../components/LoadingSpinner';
import AnimationStyles from './component-liabilitas/AnimationStyles';
import DeleteModal from './component-liabilitas/DeleteModal';
import FilterBar from './component-liabilitas/FilterBar';
import KategoriBreakdown from './component-liabilitas/KategoriBreakdown';
import LiabilitasForm from './component-liabilitas/LiabilitasForm';
import LiabilitasHeader from './component-liabilitas/LiabilitasHeader';
import LiabilitasTable from './component-liabilitas/LiabilitasTable';
import PaymentModal from './component-liabilitas/PaymentModal';
import SummaryCards from './component-liabilitas/SummaryCards';
import TableFooter from './component-liabilitas/TableFooter';
import ToastItem from './component-liabilitas/ToastItem';
import { INITIAL_FORM } from './component-liabilitas/constants';
import type {
  Kewajiban,
  LiabilitasFormData,
  SortDir,
  SortField,
  StatusKewajiban,
  Toast,
  ToastVariant,
} from './component-liabilitas/types';
import { normalizeKewajiban, makeId } from './component-liabilitas/utils';

const API_KEY = import.meta.env.VITE_API_KEY;

export default function Liabilitas() {
  const [data, setData] = useState<Kewajiban[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState<LiabilitasFormData>(INITIAL_FORM);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<StatusKewajiban | ''>('');
  const [filterKategori, setFilterKategori] = useState('');
  const [sortField, setSortField] = useState<SortField>('tanggal');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const [paymentTarget, setPaymentTarget] = useState<Kewajiban | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Kewajiban | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const ringkasan = useMemo(() => {
    const active = data.filter(d => d.status !== 'dibatalkan');
    return {
      total_kewajiban: active.reduce((s, d) => s + d.jumlah_awal, 0),
      jumlah_data: active.length,
    };
  }, [data]);

  const perKategori = useMemo(() => {
    const active = data.filter(d => d.status !== 'dibatalkan');
    const catMap = new Map<string, { kategori: string; total: number; jumlah_data: number }>();

    active.forEach(d => {
      const e = catMap.get(d.kategori) || { kategori: d.kategori, total: 0, jumlah_data: 0 };
      e.total += d.jumlah_awal;
      e.jumlah_data += 1;
      catMap.set(d.kategori, e);
    });

    return Array.from(catMap.values());
  }, [data]);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = makeId('toast');
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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/super-admin/kewajiban`, { headers: getHeaders() });
      if (!res.ok) throw new Error('Gagal mengambil data liabilitas');
      const json = await res.json();
      const items: unknown[] = Array.isArray(json) ? json : Array.isArray(json?.data) ? json.data : [];
      setData(items.map(item => normalizeKewajiban(item)).filter((item): item is Kewajiban => Boolean(item)));
    } catch {
      addToast('Gagal memuat data liabilitas', 'error');
    } finally {
      setLoading(false);
    }
  }, [getHeaders, addToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
      let va: string | number;
      let vb: string | number;

      switch (sortField) {
        case 'nama':
          va = a.nama.toLowerCase();
          vb = b.nama.toLowerCase();
          break;
        case 'kategori':
          va = a.kategori.toLowerCase();
          vb = b.kategori.toLowerCase();
          break;
        case 'pihak':
          va = (a.pihak ?? '').toLowerCase();
          vb = (b.pihak ?? '').toLowerCase();
          break;
        case 'jumlah_awal':
          va = a.jumlah_awal;
          vb = b.jumlah_awal;
          break;
        case 'sisa_jumlah':
          va = a.sisa_jumlah;
          vb = b.sisa_jumlah;
          break;
        case 'tanggal':
          va = a.tanggal;
          vb = b.tanggal;
          break;
        case 'jatuh_tempo':
          va = a.jatuh_tempo ?? '';
          vb = b.jatuh_tempo ?? '';
          break;
        case 'status':
          va = a.status;
          vb = b.status;
          break;
        default:
          va = a.tanggal;
          vb = b.tanggal;
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'jumlah') {
      setFormData(prev => ({ ...prev, jumlah: value.replace(/\D/g, '') }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const jumlahNum = Number(formData.jumlah);

    if (!formData.nama.trim() || jumlahNum <= 0) {
      addToast('Nama dan jumlah wajib diisi', 'error');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(`${API_URL}/api/super-admin/kewajiban`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({
          kategori: formData.kategori,
          nama: formData.nama,
          pihak: formData.pihak || null,
          jumlah: jumlahNum,
          tanggal: formData.tanggal,
          jatuh_tempo: formData.jatuh_tempo || null,
          keterangan: formData.keterangan || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message || 'Gagal menyimpan liabilitas');
      }

      let newItem: Kewajiban;
      try {
        const json = await res.json();
        const normalized = normalizeKewajiban(json?.data ?? json, formData);
        if (!normalized) throw new Error('Response liabilitas tidak valid');
        newItem = normalized;
      } catch {
        newItem = {
          _id: makeId('local'),
          kategori: formData.kategori,
          nama: formData.nama,
          pihak: formData.pihak || undefined,
          jumlah_awal: jumlahNum,
          sisa_jumlah: jumlahNum,
          tanggal: formData.tanggal,
          jatuh_tempo: formData.jatuh_tempo || null,
          status: 'belum_lunas',
        };
      }

      setData(prev => [newItem, ...prev]);
      setFormData(INITIAL_FORM);
      setShowForm(false);
      setNewlyAddedId(newItem._id);
      setTimeout(() => setNewlyAddedId(null), 3000);
      addToast('Liabilitas berhasil ditambahkan', 'success');
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

      setData(prev => prev.map(d => {
        if (d._id !== paymentTarget._id) return d;
        const newSisa = Math.max(0, d.sisa_jumlah - jumlah);
        const newStatus: StatusKewajiban = newSisa <= 0 ? 'lunas' : 'sebagian';
        return { ...d, sisa_jumlah: newSisa, status: newStatus };
      }));

      addToast('Pembayaran berhasil dicatat', 'success');
      setPaymentTarget(null);
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

      setData(prev => prev.filter(d => d._id !== deleteTarget._id));
      addToast('Liabilitas berhasil dihapus', 'success');
      setDeleteTarget(null);
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Terjadi kesalahan', 'error');
    } finally {
      setSaving(false);
    }
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }

    setSortField(field);
    setSortDir('asc');
  };

  const cancelForm = () => {
    setFormData(INITIAL_FORM);
    setShowForm(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <AnimationStyles />

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <LiabilitasHeader showForm={showForm} onToggleForm={() => setShowForm(f => !f)} />
        <SummaryCards ringkasan={ringkasan} perKategori={perKategori} />
        <KategoriBreakdown perKategori={perKategori} ringkasan={ringkasan} />

        {showForm && (
          <LiabilitasForm
            formData={formData}
            saving={saving}
            onChange={handleChange}
            onSubmit={handleSubmit}
            onCancel={cancelForm}
          />
        )}

        <FilterBar
          search={search}
          filterStatus={filterStatus}
          filterKategori={filterKategori}
          activeFilters={activeFilters}
          onSearchChange={setSearch}
          onFilterStatusChange={setFilterStatus}
          onFilterKategoriChange={setFilterKategori}
          onClearFilters={clearFilters}
        />

        <LiabilitasTable
          data={data}
          filteredData={filteredData}
          sortField={sortField}
          sortDir={sortDir}
          newlyAddedId={newlyAddedId}
          saving={saving}
          onSort={toggleSort}
          onPay={setPaymentTarget}
          onDelete={setDeleteTarget}
          onClearFilters={clearFilters}
        />

        <TableFooter dataLength={data.length} filteredData={filteredData} />
        <div className="h-8" />
      </div>

      {paymentTarget && (
        <PaymentModal item={paymentTarget} onConfirm={handlePay} onCancel={() => setPaymentTarget(null)} loading={saving} />
      )}
      {deleteTarget && (
        <DeleteModal item={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={saving} />
      )}

      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2 w-80">
          {toasts.map(t => <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />)}
        </div>
      )}
    </div>
  );
}
