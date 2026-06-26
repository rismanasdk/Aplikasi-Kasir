import type React from 'react';
import { Package, Wallet, X } from 'lucide-react';

interface TambahModalFormProps {
  formData: {
    jumlah: string;
    keterangan: string;
  };
  withdrawFormData: {
    jumlah: string;
    keterangan: string;
  };
  submitLoading: boolean;
  submitSuccess: boolean;
  submitError: string | null;
  withdrawLoading: boolean;
  withdrawSuccess: boolean;
  withdrawError: string | null;
  isWithdrawModalOpen: boolean;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onWithdrawInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  onWithdrawSubmit: (e: React.FormEvent) => void;
  onOpenWithdrawModal: () => void;
  onCloseWithdrawModal: () => void;
}

export default function TambahModalForm({
  formData,
  withdrawFormData,
  submitLoading,
  submitSuccess,
  submitError,
  withdrawLoading,
  withdrawSuccess,
  withdrawError,
  isWithdrawModalOpen,
  onInputChange,
  onWithdrawInputChange,
  onSubmit,
  onWithdrawSubmit,
  onOpenWithdrawModal,
  onCloseWithdrawModal,
}: TambahModalFormProps) {
  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
      <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 flex items-center">
          <Package className="h-5 w-5 mr-2 text-gray-600" />
          Tambah Modal
        </h2>
        <p className="text-sm text-gray-600 mt-1">Tambahkan modal baru ke sistem</p>
      </div>
      <div className="p-6">
        {submitSuccess && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            Modal Berhasil Ditambahkan!
          </div>
        )}

        {submitError && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {submitError}
          </div>
        )}

        <form onSubmit={onSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-gray-700 mb-2" htmlFor="jumlah">
                Nominal Modal (Rp)
              </label>
              <input
                type="text"
                id="jumlah"
                name="jumlah"
                value={formData.jumlah}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Masukan Nominal Modal"
                required
                inputMode="numeric"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="block text-gray-700 mb-2" htmlFor="keterangan">
                Keterangan
              </label>
              <input
                type="text"
                id="keterangan"
                name="keterangan"
                value={formData.keterangan}
                onChange={onInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Masukan Keterangan Modal"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition duration-300 disabled:opacity-50"
          >
            {submitLoading ? 'Menyimpan...' : 'Tambah Modal'}
          </button>
          <button
            type="button"
            onClick={onOpenWithdrawModal}
            className="ml-3 inline-flex items-center gap-2 bg-amber-600 hover:bg-amber-700 text-white font-medium py-2 px-4 rounded-md transition duration-300"
          >
            <Wallet className="h-4 w-4" />
            Ambil Modal
          </button>
        </form>
      </div>

      {isWithdrawModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-md rounded-lg bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Ambil Modal</h3>
                <p className="text-sm text-gray-500">Nominal akan mengurangi kas dan tercatat otomatis.</p>
              </div>
              <button
                type="button"
                onClick={onCloseWithdrawModal}
                className="rounded-md p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-700"
                aria-label="Tutup modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={onWithdrawSubmit} className="p-5">
              {withdrawSuccess && (
                <div className="mb-4 rounded bg-green-100 p-3 text-green-700">
                  Modal berhasil diambil.
                </div>
              )}

              {withdrawError && (
                <div className="mb-4 rounded bg-red-100 p-3 text-red-700">
                  {withdrawError}
                </div>
              )}

              <div className="mb-4">
                <label className="mb-2 block text-gray-700" htmlFor="withdraw-jumlah">
                  Nominal Pengambilan (Rp)
                </label>
                <input
                  type="text"
                  id="withdraw-jumlah"
                  name="jumlah"
                  value={withdrawFormData.jumlah}
                  onChange={onWithdrawInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Masukan Nominal Pengambilan"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                />
              </div>

              <div className="mb-5">
                <label className="mb-2 block text-gray-700" htmlFor="withdraw-keterangan">
                  Keterangan
                </label>
                <input
                  type="text"
                  id="withdraw-keterangan"
                  name="keterangan"
                  value={withdrawFormData.keterangan}
                  onChange={onWithdrawInputChange}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-500"
                  placeholder="Contoh: Pengambilan owner"
                  required
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={onCloseWithdrawModal}
                  className="rounded-md border border-gray-300 px-4 py-2 font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={withdrawLoading}
                  className="rounded-md bg-amber-600 px-4 py-2 font-medium text-white transition hover:bg-amber-700 disabled:opacity-50"
                >
                  {withdrawLoading ? 'Memproses...' : 'Ambil Modal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
