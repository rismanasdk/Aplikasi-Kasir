import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { API_URL } from './../../config/api';
import LoadingSpinner from './../../components/LoadingSpinner';
import { exportToExcel, exportToPDF } from './utils-modal';
import type { AddModalResponse, ModalUtama } from './utils-modal/types';
import { getStoredToken } from './../../auth/storage';
import ModalSummaryCards from './components-modal-utama/ModalSummaryCards';
import RiwayatTable from './components-modal-utama/RiwayatTable';
import TambahModalForm from './components-modal-utama/TambahModalForm';

const API_KEY = import.meta.env.VITE_API_KEY;
const ITEMS_PER_PAGE = 10;

const PenjualanPage: React.FC = () => {
  const [modalData, setModalData] = useState<ModalUtama | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    jumlah: '',
    keterangan: '',
  });
  const [withdrawFormData, setWithdrawFormData] = useState({
    jumlah: '',
    keterangan: '',
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [withdrawLoading, setWithdrawLoading] = useState(false);
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('semua');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const getAuthHeaders = () => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang dengan akun admin.');
    }

    return {
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  };

  useEffect(() => {
    const fetchModalData = async () => {
      try {
        const response = await axios.get<ModalUtama>(`${API_URL}/api/admin/modal-utama`, {
          headers: getAuthHeaders(),
        });
        setModalData(response.data);
      } catch (err) {
        setError('Gagal memuat data modal');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchModalData();
  }, []);

  useEffect(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    setStartDate(todayStr);
    setEndDate(todayStr);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterType, startDate, endDate]);

  const formatNumberWithDots = (value: string): string => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) return '';

    const cleanValue = numericValue.replace(/^0+(?=\d)/, '');
    return cleanValue.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  };

  const parseFormattedNumber = (value: string): number => {
    const numericString = value.replace(/\D/g, '');
    return numericString ? parseInt(numericString, 10) : 0;
  };

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return 'Tanggal tidak valid';
      }

      return date.toLocaleString('id-ID', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Tanggal tidak valid';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'jumlah') {
      setFormData(prev => ({ ...prev, [name]: formatNumberWithDots(value) }));
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleWithdrawInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'jumlah') {
      setWithdrawFormData(prev => ({ ...prev, [name]: formatNumberWithDots(value) }));
      return;
    }

    setWithdrawFormData(prev => ({ ...prev, [name]: value }));
  };

  const openWithdrawModal = () => {
    setWithdrawSuccess(false);
    setWithdrawError(null);
    setIsWithdrawModalOpen(true);
  };

  const closeWithdrawModal = () => {
    if (withdrawLoading) return;
    setIsWithdrawModalOpen(false);
    setWithdrawSuccess(false);
    setWithdrawError(null);
    setWithdrawFormData({ jumlah: '', keterangan: '' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitLoading(true);
    setSubmitSuccess(false);
    setSubmitError(null);

    try {
      const response = await axios.post<AddModalResponse>(
        `${API_URL}/api/admin/modal-utama/tambah-modal`,
        {
          jumlah: parseFormattedNumber(formData.jumlah),
          keterangan: formData.keterangan,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      setModalData(response.data.modal);
      setSubmitSuccess(true);
      setFormData({ jumlah: '', keterangan: '' });
    } catch (err) {
      setSubmitError('Gagal menambah penjualan');
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawLoading(true);
    setWithdrawSuccess(false);
    setWithdrawError(null);

    try {
      const response = await axios.post<AddModalResponse>(
        `${API_URL}/api/admin/modal-utama/prive`,
        {
          jumlah: parseFormattedNumber(withdrawFormData.jumlah),
          keterangan: withdrawFormData.keterangan,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      setModalData(response.data.modal);
      setWithdrawSuccess(true);
      setWithdrawFormData({ jumlah: '', keterangan: '' });
      setIsWithdrawModalOpen(false);
    } catch (err) {
      const responseError = err as { response?: { data?: { message?: string } } };
      const message = responseError.response?.data?.message || 'Gagal mengambil modal';
      setWithdrawError(message);
      console.error(err);
    } finally {
      setWithdrawLoading(false);
    }
  };

  const filteredRiwayat = modalData
    ? modalData.riwayat
        .filter(item => {
          const matchesSearch = searchTerm === ''
            || item.keterangan.toLowerCase().includes(searchTerm.toLowerCase())
            || formatDate(item.tanggal).toLowerCase().includes(searchTerm.toLowerCase());

          const matchesType = filterType === 'semua' || item.tipe === filterType;
          let matchesDate = true;

          if (startDate && endDate) {
            const itemDate = new Date(item.tanggal);
            const start = new Date(startDate);
            const end = new Date(endDate);
            end.setDate(end.getDate() + 1);
            matchesDate = itemDate >= start && itemDate < end;
          }

          return matchesSearch && matchesType && matchesDate;
        })
        .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime())
    : [];

  const indexOfLastItem = currentPage * ITEMS_PER_PAGE;
  const indexOfFirstItem = indexOfLastItem - ITEMS_PER_PAGE;
  const currentItems = filteredRiwayat.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRiwayat.length / ITEMS_PER_PAGE);
  const totalPemasukan = filteredRiwayat
    .filter(item => item.tipe === 'pemasukan')
    .reduce((sum, item) => sum + item.jumlah, 0);
  const totalPengeluaran = filteredRiwayat
    .filter(item => item.tipe === 'pengeluaran' || item.tipe === 'prive')
    .reduce((sum, item) => sum + item.jumlah, 0);

  // ✅ Pagination handlers — sebelumnya gak ada
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  const nextPage = () => setCurrentPage(prev => Math.min(prev + 1, totalPages));
  const prevPage = () => setCurrentPage(prev => Math.max(prev - 1, 1));

  const handleExportExcel = () => {
    exportToExcel({ modalData, startDate, endDate });
  };

  const handleExportPDF = () => {
    exportToPDF({ modalData, startDate, endDate });
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Halaman Penjualan</h1>
          <p className="text-gray-600 mt-1">Kelola modal dan pantau transaksi keuangan</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all shadow-md flex items-center justify-center"
          >
            Export PDF
          </button>
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center justify-center"
          >
            Export Excel
          </button>
        </div>
      </div>

      <ModalSummaryCards
        modalData={modalData}
        totalPemasukan={totalPemasukan}
        totalPengeluaran={totalPengeluaran}
        formatCurrency={formatCurrency}
      />

      <TambahModalForm
        formData={formData}
        withdrawFormData={withdrawFormData}
        submitLoading={submitLoading}
        submitSuccess={submitSuccess}
        submitError={submitError}
        withdrawLoading={withdrawLoading}
        withdrawSuccess={withdrawSuccess}
        withdrawError={withdrawError}
        isWithdrawModalOpen={isWithdrawModalOpen}
        onInputChange={handleInputChange}
        onWithdrawInputChange={handleWithdrawInputChange}
        onSubmit={handleSubmit}
        onWithdrawSubmit={handleWithdrawSubmit}
        onOpenWithdrawModal={openWithdrawModal}
        onCloseWithdrawModal={closeWithdrawModal}
      />

      {/* ✅ Hanya render RiwayatTable — filter sudah include di dalamnya */}
      <RiwayatTable
        modalData={modalData}
        currentItems={currentItems}
        currentPage={currentPage}
        totalPages={totalPages}
        indexOfFirstItem={indexOfFirstItem}
        indexOfLastItem={indexOfLastItem}
        totalItems={filteredRiwayat.length}
        searchTerm={searchTerm}
        filterType={filterType}
        startDate={startDate}
        endDate={endDate}
        onSearchChange={setSearchTerm}
        onFilterTypeChange={setFilterType}
        onStartDateChange={setStartDate}
        onEndDateChange={setEndDate}
        formatDate={formatDate}
        formatCurrency={formatCurrency}
        onPrevPage={prevPage}
        onNextPage={nextPage}
        onPaginate={paginate}
      />
    </div>
  );
};

export default PenjualanPage;
