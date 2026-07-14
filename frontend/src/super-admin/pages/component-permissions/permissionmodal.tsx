// src/admin/permission/component-permissions/permissionmodal.tsx
import React, { useState, useEffect } from 'react';
import type { PermissionItem, PermissionFormData } from '../permissions';

interface PermissionModalProps {
  showModal: boolean;
  editingPermission: PermissionItem | null;
  preSelectedModul: string | null;
  modulOptions: string[];
  onClose: () => void;
  onSubmit: (formData: PermissionFormData) => void;
}

const initialForm: PermissionFormData = {
  code: '',
  nama: '',
  deskripsi: '',
  modul: '',
};

const PermissionModal: React.FC<PermissionModalProps> = ({
  showModal,
  editingPermission,
  preSelectedModul,
  modulOptions,
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState<PermissionFormData>(initialForm);
  const [errors, setErrors] = useState<Partial<Record<keyof PermissionFormData, string>>>({});

  useEffect(() => {
    if (editingPermission) {
      setFormData({
        code: editingPermission.code || '',
        nama: editingPermission.nama || '',
        deskripsi: editingPermission.deskripsi || '',
        modul: editingPermission.modul || '',
      });
    } else {
      setFormData({ ...initialForm, modul: preSelectedModul || '' });
    }
    setErrors({});
  }, [editingPermission, preSelectedModul, showModal]);

  if (!showModal) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Auto-fill modul dari code
    if (name === 'code' && value.includes('.')) {
      const extracted = value.split('.')[0].trim();
      if (extracted) setFormData((prev) => ({ ...prev, modul: extracted }));
    }
  };

  const validate = () => {
    const e: Partial<Record<keyof PermissionFormData, string>> = {};
    if (!formData.code.trim()) e.code = 'Code wajib diisi';
    else if (!/^[a-z0-9_]+\.[a-z0-9_]+$/.test(formData.code.trim())) e.code = 'Format: modul.aksi (contoh: dashboard.view)';
    if (!formData.nama.trim()) e.nama = 'Nama wajib diisi';
    if (!formData.modul.trim()) e.modul = 'Modul wajib diisi';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  const isEditing = !!editingPermission;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-800">{isEditing ? 'Edit Permission' : 'Tambah Permission'}</h2>
          <button onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors" aria-label="Tutup">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Code */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Code <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.code ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="contoh: transaction.create"
            />
            {errors.code && <p className="mt-1 text-xs text-red-500">{errors.code}</p>}
          </div>

          {/* Nama */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nama <span className="text-red-500">*</span></label>
            <input
              type="text"
              name="nama"
              value={formData.nama}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.nama ? 'border-red-400' : 'border-gray-300'}`}
              placeholder="contoh: Buat Transaksi"
            />
            {errors.nama && <p className="mt-1 text-xs text-red-500">{errors.nama}</p>}
          </div>

          {/* Modul */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Modul <span className="text-red-500">*</span></label>
            <select
              name="modul"
              value={formData.modul}
              onChange={handleChange}
              className={`w-full rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.modul ? 'border-red-400' : 'border-gray-300'}`}
            >
              <option value="">-- Pilih Modul --</option>
              {modulOptions.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
            {errors.modul && <p className="mt-1 text-xs text-red-500">{errors.modul}</p>}
            <p className="mt-1 text-[11px] text-gray-400">Otomatis terisi dari bagian pertama code</p>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
            <textarea
              name="deskripsi"
              value={formData.deskripsi}
              onChange={handleChange}
              rows={2}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Deskripsi singkat (opsional)"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
            <button type="button" onClick={onClose} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">Batal</button>
            <button type="submit" className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors">{isEditing ? 'Update' : 'Simpan'}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PermissionModal;