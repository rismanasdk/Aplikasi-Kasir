// src/admin/settings/components/ReceiptSettings.tsx
import React from 'react';

interface PaymentChannel {
  name: string;
  _id: string;
  logo?: string;
}

interface PaymentMethod {
  method: string;
  channels: PaymentChannel[];
  _id: string;
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

interface ReceiptSettingsProps {
  formData: FormData;
  handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
}

const ReceiptSettings: React.FC<ReceiptSettingsProps> = ({ formData, handleInputChange }) => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Header Struk</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Header</label>
          <textarea
            name="receiptHeader"
            value={formData.receiptHeader}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Nama Toko\nAlamat\nTelepon"
          ></textarea>
          <p className="mt-1 text-sm text-gray-500">Gunakan \n untuk baris baru</p>
        </div>
      </div>

      <div>
        <h2 className="text-lg font-medium text-gray-900 mb-4">Footer Struk</h2>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Footer</label>
          <textarea
            name="receiptFooter"
            value={formData.receiptFooter}
            onChange={handleInputChange}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Terima kasih atas kunjungan Anda!"
          ></textarea>
          <p className="mt-1 text-sm text-gray-500">Gunakan \n untuk baris baru</p>
        </div>
      </div>
    </div>
  );
};

export default ReceiptSettings;