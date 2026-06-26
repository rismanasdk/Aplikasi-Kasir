import type React from 'react';
import { INPUT_BASE, KATEGORI_OPTIONS } from './constants';
import type { LiabilitasFormData } from './types';
import { clsx, fmtInput } from './utils';
import Field from './Field';

interface LiabilitasFormProps {
  formData: LiabilitasFormData;
  saving: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel: () => void;
}

export default function LiabilitasForm({ formData, saving, onChange, onSubmit, onCancel }: LiabilitasFormProps) {
  return (
    <form onSubmit={onSubmit} className="form-enter mb-8 rounded-xl border border-indigo-200 bg-white p-6 shadow-sm ring-1 ring-indigo-100">
      <div className="flex items-center gap-3 mb-5">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
        </div>
        <h2 className="text-base font-semibold text-slate-800">Data Liabilitas Baru</h2>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Kategori">
          <select name="kategori" value={formData.kategori} onChange={onChange} className={INPUT_BASE}>
            {KATEGORI_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Field>
        <Field label="Nama Kewajiban" required>
          <input name="nama" value={formData.nama} onChange={onChange} placeholder="Contoh: Utang bahan baku" className={INPUT_BASE} required />
        </Field>
        <Field label="Pihak Terkait">
          <input name="pihak" value={formData.pihak} onChange={onChange} placeholder="Nama supplier / pihak" className={INPUT_BASE} />
        </Field>
        <Field label="Jumlah" required>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 pointer-events-none">Rp</span>
            <input
              name="jumlah"
              value={fmtInput(formData.jumlah)}
              onChange={onChange}
              placeholder="0"
              inputMode="numeric"
              className={clsx(INPUT_BASE, 'pl-10 tabular-nums font-medium')}
              required
            />
          </div>
        </Field>
        <Field label="Tanggal" required>
          <input name="tanggal" value={formData.tanggal} onChange={onChange} type="date" className={INPUT_BASE} required />
        </Field>
        <Field label="Jatuh Tempo">
          <input name="jatuh_tempo" value={formData.jatuh_tempo} onChange={onChange} type="date" className={INPUT_BASE} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Keterangan">
          <textarea name="keterangan" value={formData.keterangan} onChange={onChange} placeholder="Opsional" className={INPUT_BASE} rows={2} />
        </Field>
      </div>
      <div className="mt-5 flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-indigo-700 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
          {saving ? 'Menyimpan...' : 'Simpan'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
