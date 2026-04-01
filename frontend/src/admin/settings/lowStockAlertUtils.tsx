// src/admin/settings/utils/lowStockAlertUtils.ts
import { getSocket } from '../../utils/socket';
import SweetAlert from '../../components/SweetAlert';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

const BASE_API_URL = `${API_URL}/api/admin/settings`;
const API_KEY = import.meta.env.VITE_API_KEY;

// Fungsi untuk mendapatkan token dari localStorage
const getToken = () => {
  return getStoredToken();
};

export const updateLowStockAlert = async (value: number) => {
  try {
    SweetAlert.loading('Memperbarui peringatan stok rendah...');
    
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-api-key'] = API_KEY;
    }
    
    const response = await fetch(`${BASE_API_URL}/general`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ lowStockAlert: value })
    });
    
    if (!response.ok) {
      throw new Error('Gagal memperbarui peringatan stok rendah');
    }
    
    SweetAlert.close();
    SweetAlert.success('Peringatan stok rendah berhasil diperbarui');
    
    // Emit event ke socket untuk update real-time
    try {
      const socket = getSocket();
      socket.emit('settings:updated', { lowStockAlert: value });
    } catch (e) {
      console.warn('Socket init failed:', (e as Error).message);
    }
    
    return true;
  } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal memperbarui peringatan stok rendah');
      console.error(error);
      return false;
    }
  };
