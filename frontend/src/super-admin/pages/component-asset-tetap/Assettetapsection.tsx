import { useState } from 'react';
import axios from 'axios';
import { Building2, Trash2, Wallet, Layers, TrendingUp, Calculator } from 'lucide-react';
import { API_URL } from '../../../config/api';
import type { AddModalResponse, ModalUtama } from '../utils-modal/types';

interface AsetTetapSectionProps {
  modalData: ModalUtama | null;
  onModalDataChange: (modalData: ModalUtama) => void;
  getAuthHeaders: () => Record<string, string>;
  formatCurrency: (amount: number) => string;
  formatDate: (dateString: string) => string;
  formatNumberWithDots: (value: string) => string;
  parseFormattedNumber: (value: string) => number;
}

const getErrorMessage = (err: unknown, fallback: string) => {
  if (typeof err === 'object' && err !== null && 'response' in err) {
    const axiosLikeError = err as { response?: { data?: { message?: string } }; message?: string };
    return axiosLikeError.response?.data?.message || axiosLikeError.message || fallback;
  }

  return err instanceof Error ? err.message : fallback;
};

export default function AsetTetapSection({
  modalData,
  onModalDataChange,
  getAuthHeaders,
  formatCurrency,
  formatDate,
  formatNumberWithDots,
  parseFormattedNumber,
}: AsetTetapSectionProps) {
  const [assetFormData, setAssetFormData] = useState({
    nama: '',
    nilai: '',
    tanggal_pembelian: new Date().toISOString().split('T')[0],
    keterangan: '',
  });
  const [assetSubmitLoading, setAssetSubmitLoading] = useState(false);
  const [assetSubmitSuccess, setAssetSubmitSuccess] = useState(false);
  const [assetSubmitError, setAssetSubmitError] = useState<string | null>(null);

  const handleAssetInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'nilai') {
      setAssetFormData(prev => ({ ...prev, [name]: formatNumberWithDots(value) }));
      return;
    }

    setAssetFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAssetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAssetSubmitLoading(true);
    setAssetSubmitSuccess(false);
    setAssetSubmitError(null);

    try {
      const response = await axios.post<AddModalResponse>(
        `${API_URL}/api/admin/modal-utama/aset-tetap`,
        {
          nama: assetFormData.nama,
          nilai: parseFormattedNumber(assetFormData.nilai),
          tanggal_pembelian: assetFormData.tanggal_pembelian,
          keterangan: assetFormData.keterangan,
        },
        {
          headers: getAuthHeaders(),
        }
      );

      onModalDataChange(response.data.modal);
      setAssetSubmitSuccess(true);
      setAssetFormData({
        nama: '',
        nilai: '',
        tanggal_pembelian: new Date().toISOString().split('T')[0],
        keterangan: '',
      });
    } catch (err) {
      setAssetSubmitError(getErrorMessage(err, 'Gagal menambah aset tetap'));
      console.error(err);
    } finally {
      setAssetSubmitLoading(false);
    }
  };

  const handleDeleteAsset = async (assetId: string) => {
    const confirmed = window.confirm('Hapus aset tetap ini dan kembalikan nilainya ke saldo kas?');
    if (!confirmed) return;

    try {
      const response = await axios.delete<AddModalResponse>(
        `${API_URL}/api/admin/modal-utama/aset-tetap/${assetId}`,
        {
          headers: getAuthHeaders(),
        }
      );

      onModalDataChange(response.data.modal);
    } catch (err) {
      setAssetSubmitError(getErrorMessage(err, 'Gagal menghapus aset tetap'));
      console.error(err);
    }
  };

  // Hitung statistik aset
  const asetList = modalData?.aset_tetap || [];
  const totalNilaiAset = asetList.reduce((sum, aset) => sum + aset.nilai, 0);
  const jumlahAset = asetList.length;
  const rataRataNilai = jumlahAset > 0 ? totalNilaiAset / jumlahAset : 0;
  const asetTerbesar = jumlahAset > 0 ? Math.max(...asetList.map(a => a.nilai)) : 0;

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
      <div className="bg-gradient-to-r from-slate-50 to-gray-100 p-6 border-b border-gray-200">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 flex items-center">
              Aset Tetap
            </h2>
            <p className="text-sm text-gray-600 mt-1">Pembelian aset tetap akan mengurangi saldo kas</p>
          </div>
        </div>
      </div>

      <div className="p-6">
        {assetSubmitSuccess && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-center">
            <span className="mr-2">✓</span>
            Aset tetap berhasil disimpan.
          </div>
        )}

        {assetSubmitError && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-center">
            <span className="mr-2">✕</span>
            {assetSubmitError}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
            <div className="flex items-center">
              <div className="rounded-full bg-slate-200 p-2 mr-3">
                <Wallet className="h-5 w-5 text-slate-600" />
              </div>
              <div>
                <p className="text-xs text-slate-600 font-medium">Total Nilai Aset</p>
                <p className="text-lg font-bold text-slate-700 truncate">{formatCurrency(totalNilaiAset)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
            <div className="flex items-center">
              <div className="rounded-full bg-blue-200 p-2 mr-3">
                <Layers className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-blue-700 font-medium">Jumlah Aset</p>
                <p className="text-lg font-bold text-blue-700">{jumlahAset} unit</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg p-4 border border-amber-200">
            <div className="flex items-center">
              <div className="rounded-full bg-amber-200 p-2 mr-3">
                <TrendingUp className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-amber-700 font-medium">Aset Terbesar</p>
                <p className="text-lg font-bold text-amber-700 truncate">{formatCurrency(asetTerbesar)}</p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border border-purple-200">
            <div className="flex items-center">
              <div className="rounded-full bg-purple-200 p-2 mr-3">
                <Calculator className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-purple-700 font-medium">Rata-rata Nilai</p>
                <p className="text-lg font-bold text-purple-700 truncate">{formatCurrency(rataRataNilai)}</p>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleAssetSubmit} className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="asset-nama">
                Nama Aset
              </label>
              <input
                type="text"
                id="asset-nama"
                name="nama"
                value={assetFormData.nama}
                onChange={handleAssetInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Contoh: Mesin kopi"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="asset-nilai">
                Nilai Aset (Rp)
              </label>
              <input
                type="text"
                id="asset-nilai"
                name="nilai"
                value={assetFormData.nilai}
                onChange={handleAssetInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Masukan nilai aset"
                required
                inputMode="numeric"
                autoComplete="off"
              />
              {assetFormData.nilai && (
                <p className="mt-1 text-xs text-gray-500">
                  Setara dengan:{' '}
                  <span className="font-medium text-slate-600">
                    {formatCurrency(parseFormattedNumber(assetFormData.nilai))}
                  </span>
                </p>
              )}
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="asset-tanggal">
                Tanggal Pembelian
              </label>
              <input
                type="date"
                id="asset-tanggal"
                name="tanggal_pembelian"
                value={assetFormData.tanggal_pembelian}
                onChange={handleAssetInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                required
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="asset-keterangan">
                Keterangan
              </label>
              <input
                type="text"
                id="asset-keterangan"
                name="keterangan"
                value={assetFormData.keterangan}
                onChange={handleAssetInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-500"
                placeholder="Opsional"
              />
            </div>
          </div>

         <button
            type="submit"
            disabled={assetSubmitLoading}
            className="w-full sm:w-auto flex items-center justify-center bg-slate-700 hover:bg-slate-800 text-white font-medium py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
            >
            {assetSubmitLoading ? (
              <>
                <span className="mr-2 animate-spin">●</span>
                Menyimpan...
              </>
            ) : (
              <>
                <Building2 className="h-4 w-4 mr-2" />
                Tambah Aset Tetap
              </>
            )}
          </button>
        </form>

        {asetList.length > 0 ? (
          <div className="overflow-x-auto border border-gray-200 rounded-lg">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tanggal</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Keterangan</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {asetList.map((aset, index) => (
                  <tr 
                    key={aset._id} 
                    className={`${index % 2 === 0 ? 'bg-white' : 'bg-amber-50'} hover:bg-amber-100 transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <div className="flex items-center">
                        {aset.nama}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(aset.tanggal_pembelian)}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{aset.keterangan || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-slate-700 text-right">{formatCurrency(aset.nilai)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        type="button"
                        onClick={() => handleDeleteAsset(aset._id)}
                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                        
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gradient-to-r from-slate-50 to-gray-100">
                <tr>
                  <td colSpan={3} className="px-6 py-4 text-sm font-bold text-gray-700 uppercase tracking-wider">
                    Total Nilai Aset Tetap ({jumlahAset} unit)
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-base font-bold text-slate-800 text-right">
                    {formatCurrency(totalNilaiAset)}
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            <Building2 className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Belum ada aset tetap</p>
            <p className="text-sm text-gray-400 mt-1">Tambahkan aset tetap menggunakan form di atas</p>
          </div>
        )}
      </div>
    </div>
  );
}