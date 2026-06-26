import type { Kewajiban } from './types';
import { fmt } from './utils';

interface DeleteModalProps {
  item: Kewajiban;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export default function DeleteModal({ item, onConfirm, onCancel, loading }: DeleteModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 animate-[scaleIn_0.2s_ease-out]">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-100">
          <span className="text-rose-600 text-lg">🗑</span>
        </div>
        <h3 className="mt-4 text-lg font-semibold text-slate-800">Hapus Liabilitas</h3>
        <p className="mt-2 text-sm text-slate-500 leading-relaxed">
          Yakin ingin menghapus <span className="font-semibold text-slate-700">{item.nama}</span> senilai{' '}
          <span className="font-semibold text-slate-700">{fmt(item.jumlah_awal)}</span>? Tindakan ini tidak dapat dibatalkan.
        </p>
        <div className="mt-6 flex gap-3">
          <button type="button" onClick={onCancel} className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50">Batal</button>
          <button type="button" onClick={onConfirm} disabled={loading} className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Menghapus...
              </span>
            ) : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}
