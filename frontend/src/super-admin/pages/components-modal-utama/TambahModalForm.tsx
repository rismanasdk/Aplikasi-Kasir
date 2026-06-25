import type React from 'react';
import { Package } from 'lucide-react';

interface TambahModalFormProps {
  formData: {
    jumlah: string;
    keterangan: string;
  };
  submitLoading: boolean;
  submitSuccess: boolean;
  submitError: string | null;
  onInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export default function TambahModalForm({
  formData,
  submitLoading,
  submitSuccess,
  submitError,
  onInputChange,
  onSubmit,
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
        </form>
      </div>
    </div>
  );
}
