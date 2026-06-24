import React, { useState, useEffect, useCallback } from 'react';
import { getSocket } from '../../utils/socket';
import SweetAlert from '../../components/SweetAlert';
import LoadingSpinner from '../../components/LoadingSpinner';

// Import components
import Tabs from './components-settings/Tabs';
import GeneralSettings from './components-settings/GeneralSettings';
import ReceiptSettings from './components-settings/ReceiptSettings';
import PaymentSettings from './components-settings/PaymentSettings';
// import BiayaOperasionalSettings from './components/biaya-operasional';
// import AdvancedSettings from './components/AdvancedSettings';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
const ApiKey = import.meta.env.VITE_API_KEY;
// Import interface with type-only import
// import type { BiayaOperasionalData } from './components/biaya-operasional';

interface PaymentChannel {
  name: string;
  _id: string;
  logo?: string;
  isActive: boolean;
}

interface PaymentMethod {
  method: string;
  channels: PaymentChannel[];
  _id: string;
  isActive: boolean;
}

interface FormData {
  storeName: string;
  storeAddress: string;
  storePhone: string;
  storeLogo: string;
  receiptHeader: string;
  receiptFooter: string;
  taxRate: number;
  globalDiscount: number;
  serviceCharge: number;
  lowStockAlert: number;
  currency: string;
  dateFormat: string;
  language: string;
  showBarcode: boolean;
  showCashierName: boolean;
  paymentMethods: string[];
  payment_methods: PaymentMethod[];
}

const SettingsPage: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<string>('general');
  const [storeLogoFile, setStoreLogoFile] = useState<File | null>(null);
  const [channelLogoFiles, setChannelLogoFiles] = useState<Record<string, File>>({});
  const [defaultProfilePictureFile, setDefaultProfilePictureFile] = useState<File | null>(null);
  const [defaultProfilePictureUrl, setDefaultProfilePictureUrl] = useState<string>('');
  const [formData, setFormData] = useState<FormData>({
    storeName: '',
    storeAddress: '',
    storePhone: '',
    storeLogo: '',
    receiptHeader: '',
    receiptFooter: '',
    taxRate: 0,
    globalDiscount: 0,
    serviceCharge: 0,
    lowStockAlert: 0,
    currency: 'IDR',
    dateFormat: 'DD/MM/YYYY',
    language: 'eng',
    showBarcode: false,
    showCashierName: true,
    paymentMethods: [],
    payment_methods: [],
  });

  const BASE_API_URL = `${API_URL}/api/admin/settings`;
  // const BIAYA_OPERASIONAL_API_URL = `${ipbe}/api/admin/biaya-operasional`;
  const API_KEY = `${ApiKey}`; // Ganti dengan API key yang sesuai

  // Fungsi untuk mendapatkan token dari localStorage
  const getToken = () => {
    return getStoredToken();
  };

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
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
      
      setFormData({
        storeName: data.storeName,
        storeAddress: data.storeAddress,
        storePhone: data.storePhone,
        storeLogo: data.storeLogo,
        receiptHeader: data.receiptHeader,
        receiptFooter: data.receiptFooter,
        taxRate: data.taxRate,
        globalDiscount: data.globalDiscount,
        serviceCharge: data.serviceCharge,
        lowStockAlert: data.lowStockAlert,
        currency: data.currency,
        dateFormat: data.dateFormat,
        language: data.language,
        showBarcode: data.showBarcode,
        showCashierName: data.showCashierName,
        paymentMethods: data.paymentMethods,
        payment_methods: data.payment_methods,
      });

      setDefaultProfilePictureUrl(data.defaultProfilePicture || '');
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

  // Real-time: dengarkan update settings dari server via Socket.IO
 useEffect(() => {
  try {
    const socket = getSocket();

    const handleSettingsUpdated = (plainSettings: Record<string, unknown>) => {
      // helper safe accessors
      const getNum = (k: string, fallback: number) => {
        const v = plainSettings[k];
        return typeof v === 'number' ? v : fallback;
      };
      const getBool = (k: string, fallback: boolean) => {
        const v = plainSettings[k];
        return typeof v === 'boolean' ? v : fallback;
      };
      const getStr = (k: string, fallback: string) => {
        const v = plainSettings[k];
        return typeof v === 'string' ? v : fallback;
      };
      const getArray = (k: string) => {
        const v = plainSettings[k];
        return Array.isArray(v) ? v : null;
      };

      // Hanya update fields yang relevan agar tidak menimpa input pengguna yang sedang diedit
      setFormData(prev => {
        const incomingPM = getArray('payment_methods');
        const pmFinal: PaymentMethod[] = Array.isArray(incomingPM)
          ? (incomingPM as unknown as PaymentMethod[])
          : prev.payment_methods;

        return {
          ...prev,
          taxRate: getNum('taxRate', prev.taxRate),
          globalDiscount: getNum('globalDiscount', prev.globalDiscount),
          serviceCharge: getNum('serviceCharge', prev.serviceCharge),
          receiptHeader: getStr('receiptHeader', prev.receiptHeader),
          receiptFooter: getStr('receiptFooter', prev.receiptFooter),
          showBarcode: getBool('showBarcode', prev.showBarcode),
          showCashierName: getBool('showCashierName', prev.showCashierName),
          storeName: getStr('storeName', prev.storeName),
          storeAddress: getStr('storeAddress', prev.storeAddress),
          storePhone: getStr('storePhone', prev.storePhone),
          storeLogo: getStr('storeLogo', prev.storeLogo),
          payment_methods: pmFinal,
          // Tambahkan lowStockAlert ke dalam update
          lowStockAlert: getNum('lowStockAlert', prev.lowStockAlert),
        };
      });

      const dp = plainSettings['defaultProfilePicture'];
      if (typeof dp === 'string' && dp.length) {
        setDefaultProfilePictureUrl(dp);
      }
    };

    socket.on('settings:updated', handleSettingsUpdated);

    return () => {
      socket.off('settings:updated', handleSettingsUpdated);
    };
  } catch (e) {
    // jika socket belum tersedia atau running pada SSR, abaikan
    console.warn('Socket init failed in SettingsPage:', (e as Error).message);
  }
}, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData({
        ...formData,
        [name]: checked
      });
    } else if (name === 'taxRate' || name === 'globalDiscount' || name === 'serviceCharge' || name === 'lowStockAlert') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };

  const handleLogoChange = (logoUrl: string, file?: File) => {
    setFormData({
      ...formData,
      storeLogo: logoUrl
    });
    
    if (file) {
      setStoreLogoFile(file);
    } else {
      setStoreLogoFile(null);
    }
  };

  const handleChannelLogoChange = (methodId: string, channelId: string, logoUrl: string, file?: File) => {
    const updatedPaymentMethods = formData.payment_methods.map(pm => {
      if (pm._id === methodId) {
        const updatedChannels = pm.channels.map(channel => {
          if (channel._id === channelId) {
            return { ...channel, logo: logoUrl };
          }
          return channel;
        });
        return { ...pm, channels: updatedChannels };
      }
      return pm;
    });
    
    setFormData({
      ...formData,
      payment_methods: updatedPaymentMethods
    });
    
    if (file) {
      const key = `${methodId}-${channelId}`;
      setChannelLogoFiles(prev => ({
        ...prev,
        [key]: file
      }));
    } else {
      const key = `${methodId}-${channelId}`;
      setChannelLogoFiles(prev => {
        const newFiles = { ...prev };
        delete newFiles[key];
        return newFiles;
      });
    }
  };

  const handlePaymentMethodChange = (method: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        paymentMethods: [...formData.paymentMethods, method]
      });
    } else {
      setFormData({
        ...formData,
        paymentMethods: formData.paymentMethods.filter(m => m !== method)
      });
    }
  };

  const handleTogglePaymentMethod = async (methodName: string, isActive: boolean) => {
    try {
      SweetAlert.loading('Mengubah status metode pembayaran...');
      
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }
      
      const response = await fetch(`${BASE_API_URL}/payment-methods/toggle`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ methodName, isActive })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Gagal mengubah status metode pembayaran');
      }
      
      SweetAlert.close();
      SweetAlert.success('Status metode pembayaran berhasil diubah');
      fetchSettings();
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal mengubah status metode pembayaran');
      console.error(error);
    }
  };

  const handleToggleChannelStatus = async (methodName: string, channelName: string, isActive: boolean) => {
    try {
      SweetAlert.loading('Mengubah status channel...');
      
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }
      
      const response = await fetch(`${BASE_API_URL}/payment-methods/channel-toggle`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ methodName, channelName, isActive })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Gagal mengubah status channel');
      }
      
      SweetAlert.close();
      SweetAlert.success('Status channel berhasil diubah');
      fetchSettings();
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal mengubah status channel');
      console.error(error);
    }
  };

  const handleUpdateChannelName = async (methodId: string, channelId: string, newName: string) => {
    try {
      SweetAlert.loading('Mengubah nama channel...');
      
      const paymentMethod = formData.payment_methods.find(pm => pm._id === methodId);
      if (!paymentMethod) {
        throw new Error('Metode pembayaran tidak ditemukan');
      }
      
      const channel = paymentMethod.channels.find(c => c._id === channelId);
      if (!channel) {
        throw new Error('Channel tidak ditemukan');
      }
      
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }
      
      const response = await fetch(`${BASE_API_URL}/payment-methods/channel-name`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ 
          methodName: paymentMethod.method, 
          oldChannelName: channel.name, 
          newChannelName: newName 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Gagal mengubah nama channel');
      }
      
      SweetAlert.close();
      SweetAlert.success('Nama channel berhasil diubah');
      fetchSettings();
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal mengubah nama channel');
      console.error(error);
    }
  };

  const handleAddPaymentMethod = async (methodName: string, channels: { name: string }[] = []) => {
    try {
      SweetAlert.loading('Menambah metode pembayaran...');
      
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }
      
      const response = await fetch(`${BASE_API_URL}/payment-methods/add`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          method: methodName,
          channels: channels.length > 0 ? channels : []
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Gagal menambah metode pembayaran');
      }
      
      SweetAlert.close();
      SweetAlert.success('Metode pembayaran berhasil ditambahkan');
      fetchSettings();
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal menambah metode pembayaran');
      console.error(error);
    }
  };

  const handleAddChannelToMethod = async (methodName: string, channelName: string, logoFile?: File) => {
    try {
      SweetAlert.loading('Menambah channel...');
      
      const token = getToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }
      
      const response = await fetch(`${BASE_API_URL}/payment-methods/add-channel`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ 
          methodName, 
          channelName 
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.message || 'Gagal menambah channel');
      }
      
      if (logoFile) {
        const formData = new FormData();
        formData.append('methodName', methodName);
        formData.append('channelName', channelName);
        formData.append('logo', logoFile);
        
        const uploadHeaders: Record<string, string> = {};
        
        if (token) {
          uploadHeaders['Authorization'] = `Bearer ${token}`;
          uploadHeaders['x-api-key'] = API_KEY;
        }
        
        const logoResponse = await fetch(`${BASE_API_URL}/payment-methods/channel-logo`, {
          method: 'PUT',
          headers: uploadHeaders,
          body: formData
        });
        
        if (!logoResponse.ok) {
          const errorData = await logoResponse.json();
          console.error('Server error uploading logo:', errorData);
        }
      }
      
      SweetAlert.close();
      SweetAlert.success('Channel berhasil ditambahkan');
      fetchSettings();
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal menambah channel');
      console.error(error);
    }
  };

  const handleDeleteChannel = async (methodName: string, channelName: string) => {
    try {
      const result = await SweetAlert.fire({
        title: 'Apakah Anda yakin?',
        text: `Channel "${channelName}" akan dihapus dari metode "${methodName}"`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus!',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        SweetAlert.loading('Menghapus channel...');
        
        const token = getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-api-key'] = API_KEY;
        }
        
        const response = await fetch(`${BASE_API_URL}/payment-methods/channel`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ 
            methodName, 
            channelName 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          throw new Error(errorData.message || 'Gagal menghapus channel');
        }
        
        SweetAlert.close();
        SweetAlert.success('Channel berhasil dihapus');
        fetchSettings();
      }
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal menghapus channel');
      console.error(error);
    }
  };

  const handleDeletePaymentMethod = async (methodName: string) => {
    try {
      const result = await SweetAlert.fire({
        title: 'Apakah Anda yakin?',
        text: `Metode pembayaran "${methodName}" akan dihapus beserta semua channel-nya`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#d33',
        cancelButtonColor: '#3085d6',
        confirmButtonText: 'Ya, hapus!',
        cancelButtonText: 'Batal'
      });

      if (result.isConfirmed) {
        SweetAlert.loading('Menghapus metode pembayaran...');
        
        const token = getToken();
        const headers: Record<string, string> = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
          headers['x-api-key'] = API_KEY;
        }
        
        const response = await fetch(`${BASE_API_URL}/payment-delete/method`, {
          method: 'DELETE',
          headers,
          body: JSON.stringify({ 
            methodName 
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('Server error:', errorData);
          throw new Error(errorData.message || 'Gagal menghapus metode pembayaran');
        }
        
        SweetAlert.close();
        SweetAlert.success('Metode pembayaran berhasil dihapus');
        fetchSettings();
      }
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal menghapus metode pembayaran');
      console.error(error);
    }
  };

  const handleDefaultProfilePictureChange = (file: File) => {
    setDefaultProfilePictureFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      setDefaultProfilePictureUrl(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const uploadDefaultProfilePicture = async () => {
    if (!defaultProfilePictureFile) return;

    try {
      SweetAlert.loading('Mengupload gambar profil default...');
      const formData = new FormData();
      formData.append('profilePicture', defaultProfilePictureFile);

      const token = getToken();
      const headers: Record<string, string> = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['x-api-key'] = API_KEY;
      }

      const response = await fetch(`${BASE_API_URL}/default`, {
        method: 'PUT',
        headers,
        body: formData
      });

      if (!response.ok) {
        throw new Error('Gagal mengupload gambar profil default');
      }

      SweetAlert.close();
      SweetAlert.success('Gambar profil default berhasil diupload');
      setDefaultProfilePictureFile(null);
      fetchSettings();
    } catch (error) {
      SweetAlert.close();
      SweetAlert.error(error instanceof Error ? error.message : 'Gagal mengupload gambar profil default');
      console.error(error);
    }
  };

  // const handleSaveBiayaOperasional = async (data: BiayaOperasionalData) => {
  //   try {
  //     setSaving(true);
  //     SweetAlert.loading('Menyimpan biaya operasional...');
      
  //     const token = getToken();
  //     const headers: Record<string, string> = {
  //       'Content-Type': 'application/json'
  //     };
      
  //     if (token) {
  //       headers['Authorization'] = `Bearer ${token}`;
  //       headers['x-api-key'] = API_KEY;
  //     }
      
  //     const response = await fetch(BIAYA_OPERASIONAL_API_URL, {
  //       method: 'POST',
  //       headers,
  //       body: JSON.stringify(data)
  //     });
      
  //     if (!response.ok) {
  //       const errorData = await response.json();
  //       console.error('Server error:', errorData);
  //       throw new Error(errorData.message || 'Gagal menyimpan biaya operasional');
  //     }
      
  //     SweetAlert.close();
  //     SweetAlert.success('Biaya operasional berhasil disimpan');
  //   } catch (error) {
  //     SweetAlert.close();
  //     SweetAlert.error(error instanceof Error ? error.message : 'Gagal menyimpan biaya operasional');
  //     console.error(error);
  //   } finally {
  //     setSaving(false);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Jika tab aktif adalah biaya-operasional, tidak perlu menjalankan handleSubmit utama
    if (activeTab === 'biaya-operasional') {
      return;
    }
    
    try {
      setSaving(true);
      SweetAlert.loading('Menyimpan pengaturan...');
      
      // Validate numeric fields
      if (isNaN(formData.taxRate) || isNaN(formData.globalDiscount) || isNaN(formData.serviceCharge)) {
        throw new Error('Nilai pajak, diskon, atau biaya layanan tidak valid');
      }
      
      // Create payloads with proper validation
      const taxPayload = { 
        taxRate: typeof formData.taxRate === 'number' ? formData.taxRate : parseFloat(formData.taxRate) || 0 
      };
      const discountPayload = { 
        globalDiscount: typeof formData.globalDiscount === 'number' ? formData.globalDiscount : parseFloat(formData.globalDiscount) || 0 
      };
      const serviceChargePayload = { 
        serviceCharge: typeof formData.serviceCharge === 'number' ? formData.serviceCharge : parseFloat(formData.serviceCharge) || 0 
      };
      const receiptPayload = { 
        receiptHeader: formData.receiptHeader,
        receiptFooter: formData.receiptFooter
      };
      
      const storeFormData = new FormData();
      storeFormData.append('storeName', formData.storeName);
      storeFormData.append('storeAddress', formData.storeAddress);
      storeFormData.append('storePhone', formData.storePhone);
      
      if (storeLogoFile) {
        storeFormData.append('storeLogo', storeLogoFile);
      } else if (formData.storeLogo) {
        storeFormData.append('storeLogo', formData.storeLogo);
      }
      
      const generalPayload = {
        currency: formData.currency,
        dateFormat: formData.dateFormat,
        language: formData.language,
        lowStockAlert: formData.lowStockAlert,
        showBarcode: formData.showBarcode,
        showCashierName: formData.showCashierName
      };
      
      const requestUrls = [
        `${BASE_API_URL}/tax`,
        `${BASE_API_URL}/discount`,
        `${BASE_API_URL}/service-charge`,
        `${BASE_API_URL}/receipt`,
        `${BASE_API_URL}/payment-methods`,
        `${BASE_API_URL}/store`,
        `${BASE_API_URL}/general`
      ];
      
      const channelLogoFormData = new FormData();
      let hasChannelLogos = false;
      
      Object.entries(channelLogoFiles).forEach(([key, file]) => {
        if (file) {
          const [methodId, channelId] = key.split('-');
          
          const paymentMethod = formData.payment_methods.find(pm => pm._id === methodId);
          if (paymentMethod) {
            const channel = paymentMethod.channels.find(c => c._id === channelId);
            if (channel) {
              channelLogoFormData.append('methodName', paymentMethod.method);
              channelLogoFormData.append('channelName', channel.name);
              channelLogoFormData.append('logo', file);
              hasChannelLogos = true;
            }
          }
        }
      });
      
      const token = getToken();
      
      const requests = [
        fetch(requestUrls[0], {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': API_KEY
          },
          body: JSON.stringify(taxPayload)
        }),
        fetch(requestUrls[1], {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': API_KEY
          },
          body: JSON.stringify(discountPayload)
        }),
        fetch(requestUrls[2], {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': API_KEY
          },
          body: JSON.stringify(serviceChargePayload)
        }),
        fetch(requestUrls[3], {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': API_KEY
          },
          body: JSON.stringify(receiptPayload)
        }),
        fetch(requestUrls[5], {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'x-api-key': API_KEY
          },
          body: storeFormData
        }),
        fetch(requestUrls[6], {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
            'x-api-key': API_KEY
          },
          body: JSON.stringify(generalPayload)
        })
      ];
      
      if (hasChannelLogos) {
        requests.push(
          fetch(`${BASE_API_URL}/payment-methods/channel-logo`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'x-api-key': API_KEY
            },
            body: channelLogoFormData
          })
        );
      }
      
      const responses = await Promise.all(requests);
      
      const errors = [];
      for (let i = 0; i < responses.length; i++) {
        if (!responses[i].ok) {
          try {
            const contentType = responses[i].headers.get('content-type');
            if (contentType && contentType.includes('application/json')) {
              const errorData = await responses[i].json();
              errors.push({
                url: requestUrls[i] || `${BASE_API_URL}/payment-methods/channel-logo`,
                status: responses[i].status,
                message: errorData.message || 'Unknown error'
              });
            } else {
              const errorText = await responses[i].text();
              errors.push({
                url: requestUrls[i] || `${BASE_API_URL}/payment-methods/channel-logo`,
                status: responses[i].status,
                message: errorText.substring(0, 100) || 'Unknown error'
              });
            }
          } catch {
            errors.push({
              url: requestUrls[i] || `${BASE_API_URL}/payment-methods/channel-logo`,
              status: responses[i].status,
              message: 'Failed to parse error response'
            });
          }
        }
      }
      
      if (errors.length > 0) {
        console.error('Errors:', errors);
        throw new Error(`${errors.length} pengaturan gagal disimpan: ${errors.map(e => e.message).join(', ')}`);
      }
      
      SweetAlert.close();
      SweetAlert.success('Semua pengaturan berhasil disimpan');
      fetchSettings();
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
      <h1 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <Tabs activeTab={activeTab} setActiveTab={setActiveTab} />
        
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            {activeTab === 'general' && (
              <GeneralSettings 
                formData={formData} 
                handleInputChange={handleInputChange}
                handleLogoChange={handleLogoChange}
                defaultProfilePictureUrl={defaultProfilePictureUrl}
                onDefaultProfilePictureChange={handleDefaultProfilePictureChange}
                onUploadDefaultProfilePicture={uploadDefaultProfilePicture}
              />
            )}
            
            {activeTab === 'receipt' && (
              <ReceiptSettings 
                formData={formData} 
                handleInputChange={handleInputChange} 
              />
            )}
            
            {activeTab === 'payment' && (
              <PaymentSettings 
                formData={formData} 
                handlePaymentMethodChange={handlePaymentMethodChange}
                handleChannelLogoChange={handleChannelLogoChange}
                onTogglePaymentMethod={handleTogglePaymentMethod}
                onUpdateChannelName={handleUpdateChannelName}
                onAddPaymentMethod={handleAddPaymentMethod}
                onAddChannelToMethod={handleAddChannelToMethod}
                onDeleteChannel={handleDeleteChannel}
                onToggleChannelStatus={handleToggleChannelStatus}
                onDeletePaymentMethod={handleDeletePaymentMethod}
              />
            )}
            
            {/* {activeTab === 'biaya-operasional' && (
              <BiayaOperasionalSettings 
                onSaveBiayaOperasional={handleSaveBiayaOperasional}
                saving={saving}
              />
            )}
             */}
            {/* {activeTab === 'advanced' && (
              <AdvancedSettings 
                formData={formData} 
                handleInputChange={handleInputChange} 
              />
            )} */}
          </div>

          {/* Hanya tampilkan tombol simpan jika bukan tab biaya-operasional */}
          {activeTab !== 'biaya-operasional' && (
            <div className="bg-gray-50 px-6 py-3 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50"
              >
                {saving ? 'Menyimpan...' : 'Simpan Pengaturan'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};

export default SettingsPage;
