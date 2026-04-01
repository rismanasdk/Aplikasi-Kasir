// src/admin/bahan-baku/Data-Satuan/SatuanTabs.tsx
import React, { useEffect, useState, useCallback } from 'react';
import SatuanTable from './SatuanTable';
import TambahSatuanForm from './TambahSatuanForm';
import EditSatuanForm from './EditSatuanForm';
import SweetAlert from '../../../../components/SweetAlert';
import { API_URL } from '../../../../config/api';
import { getStoredToken } from '../../../../auth/storage';
const API_KEY = import.meta.env.VITE_API_KEY;

export interface DataSatuanItem {
  _id: string;
  nama: string;
  kode: string;
  tipe: string;
  deskripsi?: string;
  isActive?: boolean;
}

interface SatuanTabsProps {
  showAddForm: boolean;
  setShowAddForm: React.Dispatch<React.SetStateAction<boolean>>;
}

const SatuanTabs: React.FC<SatuanTabsProps> = ({ showAddForm, setShowAddForm }) => {
  const [data, setData] = useState<DataSatuanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<DataSatuanItem | null>(null);

  const getAuthHeaders = (json = false): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }
    return {
      ...(json ? { 'Content-Type': 'application/json' } : {}),
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/admin/data-satuan`, { headers: getAuthHeaders() });
      const json = await res.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error('fetch data satuan', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div>
      {showAddForm && <TambahSatuanForm onClose={() => { setShowAddForm(false); fetchData(); }} />}
      {editing && <EditSatuanForm item={editing} onClose={() => { setEditing(null); fetchData(); }} />}
      <SatuanTable
        loading={loading}
        data={data}
        onEdit={(item) => setEditing(item)}
        onDelete={async (id: string) => {
          try {
            const result = await SweetAlert.confirmDelete();
            if (!result.isConfirmed) return;
            await SweetAlert.loading('Menghapus satuan...');
            const res = await fetch(`${API_URL}/api/admin/data-satuan/${id}`, {
              method: 'DELETE',
              headers: getAuthHeaders(),
            });
            SweetAlert.close();
            if (!res.ok) {
              await SweetAlert.error('Gagal menghapus');
              return;
            }
            await SweetAlert.success('Satuan berhasil dihapus');
            fetchData();
          } catch (err) {
            console.error(err);
            SweetAlert.close();
            await SweetAlert.error('Gagal menghapus');
          }
        }}
        onToggleStatus={async (id: string, newStatus: boolean) => {
          try {
            const res = await fetch(`${API_URL}/api/admin/data-satuan/${id}`, {
              method: 'PUT',
              headers: getAuthHeaders(true),
              body: JSON.stringify({ isActive: newStatus })
            });
            if (!res.ok) throw new Error('Gagal memperbarui status');
            fetchData();
          } catch (err) {
            console.error(err);
            alert('Gagal memperbarui status');
          }
        }}
      />
    </div>
  );
};

export default SatuanTabs;
