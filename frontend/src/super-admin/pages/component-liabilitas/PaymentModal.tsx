import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { Kewajiban } from './types';
import { INPUT_BASE } from './constants';
import { clsx, fmt } from './utils';

interface PaymentModalProps {
  item: Kewajiban;
  onConfirm: (jumlah: number) => void;
  onCancel: () => void;
  loading: boolean;
}

export default function PaymentModal({ item, onConfirm, onCancel, loading }: PaymentModalProps) {
  const [raw, setRaw] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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
        className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 animate-[scaleIn_0.2s_ease-out]"
      >
        <button type="button" onClick={onCancel} className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 transition-colors">✕</button>

        <h3 className="text-lg font-semibold text-slate-800">Pembayaran</h3>
        <p className="mt-1 text-sm text-slate-500">{item.nama} — {item.pihak || '-'}</p>

        <div className="mt-4 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Sisa kewajiban</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 tabular-nums">{fmt(item.sisa_jumlah)}</p>
        </div>

        <div className="mt-5">
          <label className="mb-1.5 block text-xs font-medium text-slate-500">Jumlah bayar</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">Rp</span>
            <input
              ref={inputRef}
              value={display}
              onChange={e => setRaw(e.target.value.replace(/\D/g, ''))}
              placeholder="0"
              className={clsx(INPUT_BASE, 'pl-10 tabular-nums text-lg font-semibold', !isValid && raw !== '' && 'border-rose-300 focus:border-rose-400 focus:ring-rose-100')}
            />
          </div>
          {raw !== '' && !isValid && (
            <p className="mt-1.5 text-xs text-rose-500">
              {numeric <= 0 ? 'Masukkan jumlah lebih dari 0' : 'Tidak boleh melebihi sisa kewajiban'}
            </p>
          )}
        </div>

        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
          <button type="submit" disabled={!isValid || loading} className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Memproses...
              </span>
            ) : 'Konfirmasi'}
          </button>
        </div>
      </form>
    </div>
  );
}
