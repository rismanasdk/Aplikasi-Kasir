import { useEffect, useState } from 'react';
import axios from 'axios';

import AsetTetapSection from './component-asset-tetap/Assettetapsection';

import { API_URL } from './../../config/api';
import { getStoredToken } from './../../auth/storage';
import type { ModalUtama } from './utils-modal/types';

const API_KEY = import.meta.env.VITE_API_KEY;

export default function SuperAdminAsetTetap() {
  const [modalData, setModalData] = useState<ModalUtama | null>(null);

  const getAuthHeaders = () => {
    const token = getStoredToken();

    return {
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      const response = await axios.get<ModalUtama>(
        `${API_URL}/api/admin/modal-utama`,
        {
          headers: getAuthHeaders(),
        }
      );

      setModalData(response.data);
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleString('id-ID');

  const formatNumberWithDots = (value: string) => {
    const numericValue = value.replace(/\D/g, '');

    return numericValue.replace(
      /\B(?=(\d{3})+(?!\d))/g,
      '.'
    );
  };

  const parseFormattedNumber = (value: string) => {
    const numericString = value.replace(/\D/g, '');

    return numericString
      ? parseInt(numericString, 10)
      : 0;
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <AsetTetapSection
        modalData={modalData}
        onModalDataChange={setModalData}
        getAuthHeaders={getAuthHeaders}
        formatCurrency={formatCurrency}
        formatDate={formatDate}
        formatNumberWithDots={formatNumberWithDots}
        parseFormattedNumber={parseFormattedNumber}
      />
    </div>
  );
}
