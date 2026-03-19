// src/meneger/settings/index.tsx
import { useState, useEffect } from 'react';
import ManagerLayout from "../layout";
import LoadingSpinner from "../../components/LoadingSpinner";
import SweetAlert from "../../components/SweetAlert";
import GeneralSettings from './GeneralSettings';
import ReceiptSettings from './ReceiptSettings';
import PaymentSettings from './PaymentSettings';
import { API_URL } from '../../config/api';


export interface PaymentChannel {
  name: string;
  _id: string;
  logo?: string;
}

export interface PaymentMethod {
  method: string;
  channels: PaymentChannel[];
  _id: string;
  logo?: string; // Tambahkan properti logo
}

export interface Settings {
  _id: string;
  taxRate: number;
  globalDiscount: number;
  receiptHeader: string;
  receiptFooter: string;
  paymentMethods: string[];
  payment_methods: PaymentMethod[];
  currency: string;
  dateFormat: string;
  language: string;
  lowStockAlert: number;
  serviceCharge: number;
  showBarcode: boolean;
  showCashierName: boolean;
  storeAddress: string;
  storeLogo: string;
  storeName: string;
  storePhone: string;
  __v: number;
  updatedAt: string;
}

export default function ManagerSettingsPage() {
  const getAuthHeaders = (): HeadersInit => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const [settings, setSettings] = useState<Settings>({
    _id: '',
    taxRate: 0,
    globalDiscount: 0,
    receiptHeader: '',
    receiptFooter: '',
    paymentMethods: [],
    payment_methods: [],
    currency: 'IDR',
    dateFormat: 'DD/MM/YYYY',
    language: 'eng',
    lowStockAlert: 10,
    serviceCharge: 0,
    showBarcode: false,
    showCashierName: true,
    storeAddress: '',
    storeLogo: '',
    storeName: '',
    storePhone: '',
    __v: 0,
    updatedAt: ''
  });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/api/manager/settings`, {
          headers: getAuthHeaders(),
        });
        const data = await response.json();
        setSettings(data);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching settings:', error);
        SweetAlert.error('Gagal memuat pengaturan');
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  if (loading) {
    return (
      <ManagerLayout>
        <div className="flex flex-col items-center justify-center h-96">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Memuat pengaturan...</p>
        </div>
      </ManagerLayout>
    );
  }

  return (
    <ManagerLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Pengaturan Toko</h1>
          <p className="mt-2 text-gray-600">Lihat pengaturan toko dan preferensi bisnis Anda</p>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('general')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'general' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Pengaturan Umum
            </button>
            <button
              onClick={() => setActiveTab('receipt')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'receipt' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Struk
            </button>
            <button
              onClick={() => setActiveTab('payment')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'payment' 
                ? 'border-blue-500 text-blue-600' 
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
            >
              Metode Pembayaran
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="bg-white shadow-xl rounded-lg overflow-hidden">
          {/* General Settings Tab */}
          {activeTab === 'general' && (
            <GeneralSettings 
              taxRate={settings.taxRate}
              globalDiscount={settings.globalDiscount}
            />
          )}
          
          {/* Receipt Settings Tab */}
          {activeTab === 'receipt' && (
            <ReceiptSettings 
              receiptHeader={settings.receiptHeader}
              receiptFooter={settings.receiptFooter}
            />
          )}
          
          {/* Payment Methods Tab */}
          {activeTab === 'payment' && (
            <PaymentSettings 
              payment_methods={settings.payment_methods}
            />
          )}
        </div>
      </div>
    </ManagerLayout>
  );
}
