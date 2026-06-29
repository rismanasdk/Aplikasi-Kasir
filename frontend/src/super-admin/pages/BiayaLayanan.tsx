// src/admin/biaya/biaya-layanan/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import SweetAlert from '../../components/SweetAlert';
import LoadingSpinner from '../../components/LoadingSpinner';
import Tabs from './components-biayalayanan/tabs';
import BiayaOperasional from './components-biayalayanan/biaya-operasional';
import BiayaLanjutan from './components-biayalayanan/biaya-lanjutan';
import BiayaService from './components-biayalayanan/biaya-service';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

const ApiKey = import.meta.env.VITE_API_KEY;

const BiayaLayanan: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('operasional');
  const [taxRate, setTaxRate] = useState<number>(0);
  const [globalDiscount, setGlobalDiscount] = useState<number>(0);
  const [serviceCharge, setServiceCharge] = useState<number>(0);
  const [lowStockAlert, setLowStockAlert] = useState<number>(0);
  const [kasWarning, setkasWarning] = useState<number>(0);
  const [refreshTrigger, setRefreshTrigger] = useState<number>(0);

  const BASE_API_URL = `${API_URL}/api/admin/settings`;
  const API_KEY = `${ApiKey}`;
  const [totalBiayaOperasional, setTotalBiayaOperasional] = useState<number>(0);

  // Fungsi untuk mendapatkan token dari localStorage
  const getToken = () => {
    return getStoredToken();
  };

  const fetchSettings = useCallback(async () => {
    try {
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }

      const response = await fetch(BASE_API_URL, { headers });
      
      if (!response.ok) {
        throw new Error('Gagal mengambil data pengaturan');
      }

      const data = await response.json();
      console.log('>>> Data pengaturan diterima dari server:', data)
      
      if (data) {
        if (typeof data.taxRate === 'number') setTaxRate(data.taxRate);
        if (typeof data.globalDiscount === 'number') setGlobalDiscount(data.globalDiscount);
        if (typeof data.serviceCharge === 'number') setServiceCharge(data.serviceCharge);
        if (typeof data.lowStockAlert === 'number') setLowStockAlert(data.lowStockAlert);
        if (typeof data.kasWarning === 'number') setkasWarning(data.kasWarning);
      }
    } catch (error) {
      SweetAlert.error('Gagal memuat data pengaturan');
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [BASE_API_URL, API_KEY]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      // Update state sesuai dengan nama field
      if (name === 'taxRate') setTaxRate(checked ? 1 : 0);
      else if (name === 'globalDiscount') setGlobalDiscount(checked ? 1 : 0);
      else if (name === 'serviceCharge') setServiceCharge(checked ? 1 : 0);
      else if (name === 'lowStockAlert') setLowStockAlert(checked ? 1 : 0);
      else if (name === 'kasWarning') setkasWarning(checked ? 1: 0);
    } else {
      // Update state sesuai dengan nama field
      if (name === 'taxRate') setTaxRate(parseFloat(value) || 0);
      else if (name === 'globalDiscount') setGlobalDiscount(parseFloat(value) || 0);
      else if (name === 'serviceCharge') setServiceCharge(parseFloat(value) || 0);
      else if (name === 'lowStockAlert') setLowStockAlert(parseFloat(value) || 0);
      else if (name === 'kasWarning') setkasWarning(parseFloat(value) || 0);
    }
  };

  // BiayaOperasional component manages its own CRUD; parent no longer needs
  // to directly save biaya operasional. We keep `refreshTrigger` and
  // `setRefreshTrigger` for child refresh coordination.
const handleSaveSettings = async () => {
  try {
    setSaving(true);
    SweetAlert.loading('Menyimpan pengaturan...');
    
    const token = getToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      headers['x-api-key'] = API_KEY;
    }

    console.log('>>> Menyimpan pengaturan. Nilai lowStockAlert yang akan dikirim:', lowStockAlert);
    
    // Simpan pajak
    const taxResponse = await fetch(`${BASE_API_URL}/tax`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ taxRate })
    });
    
    if (!taxResponse.ok) {
      const errorData = await taxResponse.json();
      console.error('Server error:', errorData);
      throw new Error(errorData.message || 'Gagal menyimpan pajak');
    }
    
    // Simpan diskon global
    const discountResponse = await fetch(`${BASE_API_URL}/discount`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ globalDiscount })
    });
    
    if (!discountResponse.ok) {
      const errorData = await discountResponse.json();
      console.error('Server error:', errorData);
      throw new Error(errorData.message || 'Gagal menyimpan diskon global');
    }
    
    // Simpan peringatan stok rendah
    const stockResponse = await fetch(`${BASE_API_URL}/general`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ lowStockAlert })
    });
    
    const responseData = await stockResponse.json();
    console.log('>>> Respons dari server untuk /general:', responseData);

    if (!stockResponse.ok) {
      const errorData = await stockResponse.json();
      console.error('Server error:', errorData);
      throw new Error(errorData.message || 'Gagal menyimpan peringatan stok rendah');
    }

    const alertkasWarning = await fetch(`${BASE_API_URL}/general`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ kasWarning })
    })

    if (!alertkasWarning.ok) {
      const errorData = await alertkasWarning.json();
      console.error('Server error:', errorData);
      throw new Error(errorData.message || 'Gagal menyimpan Peringatan Kas');
    }
    
    SweetAlert.close();
    
    // Periksa apakah backend berhasil memperbarui barang
    if (responseData.updatedItems !== undefined) {
      if (responseData.updatedItems > 0) {
        SweetAlert.success(`Pengaturan berhasil disimpan. Stok minimal untuk ${responseData.updatedItems} barang telah diperbarui.`);
      } else {
        SweetAlert.warning('Pengaturan berhasil disimpan, tetapi tidak ada barang yang diperbarui.');
      }
    } else {
      SweetAlert.success('Pengaturan berhasil disimpan');
    }
    
    // Refresh data setelah penyimpanan berhasil
    fetchSettings();
    setRefreshTrigger((p) => p + 1);
  } catch (error) {
    SweetAlert.close();
    SweetAlert.error(error instanceof Error ? error.message : 'Gagal menyimpan pengaturan');
    console.error(error);
  } finally {
    setSaving(false);
  }
};

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="p-6">
      
      
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <div className="p-6">
          {activeTab === 'operasional' && (
            <BiayaOperasional refreshTrigger={refreshTrigger} onTotalChange={setTotalBiayaOperasional} />
          )}
          
          {activeTab === 'layanan' && (
            <BiayaLanjutan 
              taxRate={taxRate}
              globalDiscount={globalDiscount}
              serviceCharge={serviceCharge}
              lowStockAlert={lowStockAlert}
              kasWarning={kasWarning}
              totalBiayaOperasional={totalBiayaOperasional}
              onInputChange={handleInputChange}
            />
          )}
          
          {activeTab === 'service' && (
            <BiayaService refreshTrigger={refreshTrigger} />
          )}
        </div>

        {/* Tombol simpan untuk tab layanan */}
        {activeTab === 'layanan' && (
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default BiayaLayanan;
