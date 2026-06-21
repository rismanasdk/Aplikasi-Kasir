import React, { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, TrendingDown, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react';
import MainLayout from "../layout";
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

const API_KEY = import.meta.env.VITE_API_KEY;

interface CashFlowSummary {
  totalTransactions: number;
  completedCount: number;
  canceledCount: number;
  pendingCount: number;
  totalRevenue: number;
  totalCost: number;
  profit: number;
  successRate: number;
  paymentMethods: Record<string, { count: number; amount: number; percentage: number }>;
}

interface Transaction {
  _id: string;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  status: string;
  metode_pembayaran: string;
  total_harga: number;
  kasir_id: string;
  itemCount: number;
}

const ITEMS_PER_PAGE = 7;

const CashFlowReport: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [summary, setSummary] = useState<CashFlowSummary | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const token = getStoredToken();

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(API_KEY ? { "x-api-key": API_KEY } : {}),
  };

  const fetchCashFlow = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(
        `${API_URL}/api/kasir/analytics/daily-cash-flow?date=${selectedDate}`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        setSummary(data.data.summary);
        setTransactions(data.data.recentTransactions);
        setCurrentPage(1); // Reset ke halaman pertama saat data baru dimuat
      } else {
        setError('Failed to load cash flow report');
      }
    } catch (err) {
      console.error('Error fetching cash flow:', err);
      setError('Error loading cash flow data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCashFlow();
  }, [selectedDate]);

  // Kalkulasi pagination
  const totalPages = Math.ceil(transactions.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedTransactions = transactions.slice(startIndex, endIndex);

  const handlePrevPage = () => setCurrentPage((prev) => Math.max(prev - 1, 1));
  const handleNextPage = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages));

  if (loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Daily Cash Flow Report</h1>
            <p className="text-gray-600 mt-2">Monitor your daily transactions and revenue</p>
          </div>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Error Alert */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        )}

        {summary && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      Rp{(summary.totalRevenue || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="bg-green-100 p-3 rounded-full">
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Profit</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      Rp{(summary.profit || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="bg-blue-100 p-3 rounded-full">
                    <DollarSign className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Transactions</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {summary.totalTransactions}
                    </p>
                    <p className="text-xs text-green-600 mt-2">
                      Success: {summary.completedCount} ({summary.successRate.toFixed(1)}%)
                    </p>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-full">
                    <ShoppingCart className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm">Total Cost</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      Rp{(summary.totalCost || 0).toLocaleString('id-ID')}
                    </p>
                  </div>
                  <div className="bg-red-100 p-3 rounded-full">
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Payment Methods Breakdown</h2>
              <div className="space-y-3">
                {Object.entries(summary.paymentMethods).map(([method, data]) => (
                  <div key={method} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{method}</p>
                      <p className="text-sm text-gray-600">{data.count} transactions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        Rp{data.amount.toLocaleString('id-ID')}
                      </p>
                      <p className="text-sm text-gray-600">{data.percentage.toFixed(1)}%</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transaction Status Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-700">Completed</p>
                <p className="text-2xl font-bold text-green-900 mt-2">{summary.completedCount}</p>
              </div>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-700">Pending</p>
                <p className="text-2xl font-bold text-yellow-900 mt-2">{summary.pendingCount}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-sm text-red-700">Canceled</p>
                <p className="text-2xl font-bold text-red-900 mt-2">{summary.canceledCount}</p>
              </div>
            </div>

            {/* Recent Transactions Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="p-6 border-b flex justify-between items-center">
                <h2 className="text-lg font-bold text-gray-900">Recent Transactions</h2>
                {transactions.length > 0 && (
                  <p className="text-sm text-gray-500">
                    Menampilkan {startIndex + 1}–{Math.min(endIndex, transactions.length)} dari {transactions.length} transaksi
                  </p>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">No. Transaksi</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Time</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payment</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Amount</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
                      <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Items</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {paginatedTransactions.length > 0 ? (
                      paginatedTransactions.map((t) => (
                        <tr key={t._id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-sm font-mono text-gray-900">{t.nomor_transaksi}</td>
                          <td className="px-6 py-3 text-sm text-gray-600">
                            {new Date(t.tanggal_transaksi).toLocaleTimeString('id-ID')}
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">{t.metode_pembayaran}</td>
                          <td className="px-6 py-3 text-sm font-semibold text-gray-900">
                            Rp{t.total_harga.toLocaleString('id-ID')}
                          </td>
                          <td className="px-6 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              t.status === 'selesai'
                                ? 'bg-green-100 text-green-700'
                                : t.status === 'pending'
                                ? 'bg-yellow-100 text-yellow-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {t.status}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-sm text-gray-600">{t.itemCount} items</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                          No transactions found for this date
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls */}
              {transactions.length > ITEMS_PER_PAGE && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 mt-6">
                  <div className="text-sm text-gray-600">
                    Menampilkan <span className="font-semibold text-gray-900">{startIndex + 1}-{Math.min(endIndex, transactions.length)}</span> dari{' '}
                    <span className="font-semibold text-gray-900">{transactions.length}</span> transaksi
                  </div>
                          
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handlePrevPage}
                      disabled={currentPage === 1}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
                      }`}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Sebelumnya</span>
                    </button>
                      
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                    
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={`w-9 h-9 rounded-lg font-medium text-sm transition-all ${
                              currentPage === pageNum
                                ? 'bg-gradient-to-r from-orange-500 to-yellow-400 text-white shadow-md scale-105'
                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>
                  
                    <button
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-orange-50 text-orange-600 hover:bg-orange-100 hover:scale-105'
                      }`}
                    >
                      <span className="hidden sm:inline">Selanjutnya</span>
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MainLayout>
  );
};

export default CashFlowReport;