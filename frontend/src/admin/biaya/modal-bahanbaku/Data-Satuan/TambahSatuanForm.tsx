// src/admin/bahan-baku/Data-Satuan/TambahSatuanForm.tsx
import React, { useState, useEffect } from 'react';
import GroupedSelect from './GroupedSelect';
import { API_URL } from '../../../../config/api';
const API_KEY = import.meta.env.VITE_API_KEY;

interface Props {
  onClose: () => void;
}

// Data master untuk satuan
const satuanGroups = [
  { key: 'volume', label: 'Volume', options: [{ label: 'Liter', value: 'L' }, { label: 'Mililiter', value: 'ML' }] },
  { key: 'berat', label: 'Berat', options: [{ label: 'Kilogram', value: 'KG' }, { label: 'Gram', value: 'GR' }] },
  { key: 'jumlah', label: 'Jumlah', options: [{ label: 'Pieces', value: 'PCS' }, { label: 'Pack', value: 'PACK' }] },
];

const TambahSatuanForm: React.FC<Props> = ({ onClose }) => {
  const [nama, setNama] = useState('');
  const [kode, setKode] = useState('');
  const [tipe, setTipe] = useState(''); // Tipe default
  const [deskripsi, setDeskripsi] = useState('');
  const [selectedSatuan, setSelectedSatuan] = useState<{ option: { label: string; value: string } | null; group: string }>({ option: null, group: 'jumlah' });

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

  // Efek untuk mengisi nama, kode, dan tipe secara otomatis saat selection berubah
  useEffect(() => {
    if (selectedSatuan.option) {
      setNama(selectedSatuan.option.label);
      setKode(selectedSatuan.option.value);
      setTipe(selectedSatuan.group);
    } else {
      setNama('');
      setKode('');
      setTipe('');
    }
  }, [selectedSatuan]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Validasi sederhana
    if (!nama || !kode || !tipe) {
      alert('Mohon pilih satuan terlebih dahulu.');
      return;
    }
    try {
      const res = await fetch(`${API_URL}/api/admin/data-satuan`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ nama, kode, tipe, deskripsi })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Gagal menambah');
      }
      onClose();
    } catch (err) {
      console.error(err);
      alert((err as Error).message || 'Gagal menambah data');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div className="bg-white rounded-lg p-6 shadow-lg z-10 w-full max-w-2xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-medium mb-4">Tambah Satuan Baru</h3>
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Field Nama diganti dengan GroupedSelect */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Pilih Nama Satuan</label>
              <GroupedSelect
                groups={satuanGroups}
                value={selectedSatuan.option}
                onChange={(opt, groupKey) => setSelectedSatuan({ option: opt, group: groupKey || 'jumlah' })}
                placeholder="Pilih satuan (mis. Kilogram, Liter, Pieces)"
              />
            </div>

            {/* Field Kode tetap ada untuk bisa di-override manual */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kode Satuan</label>
              <input className="w-full border p-2 rounded bg-gray-100 capitalize" value={kode}readOnly />
            </div>

            {/* Field Tipe dibuat read-only */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe</label>
              <input type="text" className="w-full border p-2 rounded bg-gray-100 capitalize" value={tipe} readOnly />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi (Opsional)</label>
              <input className="w-full border p-2 rounded" value={deskripsi} onChange={e => setDeskripsi(e.target.value)} />
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors">Batal</button>
            <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TambahSatuanForm;
