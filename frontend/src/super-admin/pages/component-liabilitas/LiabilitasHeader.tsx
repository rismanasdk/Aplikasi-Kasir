import { clsx } from './utils';

interface LiabilitasHeaderProps {
  showForm: boolean;
  onToggleForm: () => void;
}

export default function LiabilitasHeader({ showForm, onToggleForm }: LiabilitasHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Liabilitas</h1>
          <p className="mt-1 text-sm text-slate-500">Kelola kewajiban dan utang perusahaan.</p>
        </div>
        <button
          type="button"
          onClick={onToggleForm}
          className={clsx(
            'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium transition-all shadow-sm',
            showForm
              ? 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
          )}
        >
          <span className={clsx('transition-transform', showForm && 'rotate-45')}>+</span>
          {showForm ? 'Tutup Form' : 'Tambah Liabilitas'}
        </button>
      </div>
    </div>
  );
}
