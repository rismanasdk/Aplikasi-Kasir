// src/admin/bahan-baku/Data-Satuan/EditSatuanForm.tsx
import React, { useState, useEffect } from 'react';
import type { DataSatuanItem } from './SatuanTabs';
import GroupedSelect from './GroupedSelect';
import { API_URL } from '../../../../config/api';
const API_KEY = import.meta.env.VITE_API_KEY;

interface Props {
  item: DataSatuanItem;
  onClose: () => void;
}

// Gunakan data master yang sama
const satuanGroups = [
  { key: 'volume', label: 'Volume', options: [{ label: 'Liter', value: 'L' }, { label: 'Mililiter', value: 'ML' }] },
  { key: 'berat', label: 'Berat', options: [{ label: 'Kilogram', value: 'KG' }, { label: 'Gram', value: 'GR' }] },
  { key: 'jumlah', label: 'Jumlah', options: [{ label: 'Pieces', value: 'PCS' }, { label: 'Pack', value: 'PACK' }] },
];

const EditSatuanForm: React.FC<Props> = ({ item, onClose }) => {
  const [nama, setNama] = useState(item.nama);
  const [kode, setKode] = useState(item.kode);
  const [tipe, setTipe] = useState(item.tipe);
  const [deskripsi, setDeskripsi] = useState(item.deskripsi || '');
  const [isActive, setIsActive] = useState(!!item.isActive);
  
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };
  
  // Temukan opsi awal berdasarkan data item
  const findInitialOption = () => {
    for (const group of satuanGroups) {
      const found = group.options.find(o => o.value === item.kode);
      if (found) {
        return { option: found, group: group.key };
      }
    }
    // Jika tidak ditemukan, kembalikan null dan tipe default
    return { option: null, group: item.tipe };
  };

  const [selectedSatuan, setSelectedSatuan] = useState(findInitialOption());

  // Efek untuk mengisi field saat selection berubah
  useEffect(() => {
    if (selectedSatuan.option) {
      setNama(selectedSatuan.option.label);
      setKode(selectedSatuan.option.value);
      setTipe(selectedSatuan.group);
    }
  }, [selectedSatuan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/api/admin/data-satuan/${item._id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nama, kode, tipe, deskripsi, isActive })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal update');
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Gagal update data');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-lg p-6 shadow-lg z-10 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium mb-4">Edit Satuan</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Nama Satuan</label>
              <GroupedSelect
                groups={satuanGroups}
                value={selectedSatuan.option}
                onChange={(opt, groupKey) => setSelectedSatuan({ option: opt, group: groupKey || 'jumlah' })}
                placeholder="Pilih satuan (mis. Kilogram, Liter, Pieces)"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode Satuan</label>
              <input className="w-full border p-2 rounded bg-gray-100" value={kode} readOnly />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
              <input type="text" className="w-full border p-2 rounded bg-gray-100 capitalize" value={tipe} readOnly />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Opsional)</label>
              <input className="w-full border p-2 rounded" value={deskripsi} onChange={e => setDeskripsi(e.target.value)} />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} className="rounded" />
              <span className="text-sm font-medium text-gray-700">Aktif</span>
            </label>

            <div className="flex gap-2">
              <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors">Batal</button>
              <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Update</button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSatuanForm;
