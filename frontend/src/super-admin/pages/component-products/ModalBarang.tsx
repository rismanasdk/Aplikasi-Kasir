// src/admin/stok-barang/ModalBarang.tsx
import React, { useState, useEffect, useRef } from "react";

export interface BahanBakuItem {
  nama_produk: string;
  total_porsi: number;
  modal_per_porsi: number;
  bahan: Array<{
    nama: string;
    harga: number;
    jumlah: number;
  }>;
}

export interface BahanBakuFormData {
  nama_produk: string;
  bahan: Array<{
    nama: string;
    harga: number;
    jumlah: number;
  }>;
}

export interface BarangFormData {
  kode: string;
  nama: string;
  kategori: string;
  hargaBeli: string;
  hargaJual: string;
  stok: string;
  gambarUrl: string;
  gambar: File | null;
  useDiscount: boolean;
  bahanBaku?: BahanBakuFormData[];
  margin?: number;
}

interface ModalBarangProps {
  visible: boolean;
  isEditing: boolean;
  formData: BarangFormData;
  onInputChange: (field: keyof BarangFormData, value: string | File | null | boolean | BahanBakuFormData[] | number) => void;
  onSubmit: (e: React.FormEvent) => void;
  onClose: () => void;
  loading: boolean;
  kategoriOptions: string[];
  bahanBakuList: BahanBakuItem[];
  onGenerateCode: () => void;
  globalDiscount?: number
}

const ModalBarang: React.FC<ModalBarangProps> = ({
  visible,
  isEditing,
  formData,
  onInputChange,
  onSubmit,
  onClose,
  loading,
  kategoriOptions,
  onGenerateCode,
  globalDiscount = 0
}) => {
  const [useBahanBaku, setUseBahanBaku] = useState(false);
  const [isNamaReadOnly, setIsNamaReadOnly] = useState(false);
  const [isStokReadOnly, setIsStokReadOnly] = useState(false); // Tambahkan kembali state ini
  const [isHargaBeliReadOnly, setIsHargaBeliReadOnly] = useState(false);
  const [isHargaJualReadOnly, setIsHargaJualReadOnly] = useState(false);
  
  // Gunakan ref untuk menyimpan nilai formData terbaru tanpa menyebabkan re-render
  const formDataRef = useRef(formData);
  formDataRef.current = formData;

  // Gunakan margin dari formData, bukan state lokal
  const margin = formData?.margin || 30;

  useEffect(() => {
    // Reset semua state readonly saat modal dibuka
    if (visible) {
      // Jika sedang edit dan ada data bahan baku, set readonly yang sesuai
      if (isEditing && formDataRef.current && formDataRef.current.bahanBaku && formDataRef.current.bahanBaku.length > 0) {
        setUseBahanBaku(true);
        setIsNamaReadOnly(true);
        setIsStokReadOnly(true); // Tambahkan kembali
        setIsHargaBeliReadOnly(true);
        setIsHargaJualReadOnly(true);
      } else {
        // Jika modal baru dibuka atau tidak ada bahan baku, reset semua
        setUseBahanBaku(false);
        setIsNamaReadOnly(false);
        setIsStokReadOnly(false); // Tambahkan kembali
        setIsHargaBeliReadOnly(false);
        setIsHargaJualReadOnly(false);
      }
    }
  }, [visible, isEditing]); // Hanya depend pada visible dan isEditing

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onInputChange("gambar", e.target.files[0]);
    }
  };

  const handleMarginChange = (value: string) => {
    const marginValue = parseFloat(value);
    if (!isNaN(marginValue)) {
      // Update margin di formData
      onInputChange("margin", marginValue);
      
      if (formData?.hargaBeli && !isNaN(parseFloat(formData.hargaBeli))) {
        const beli = parseFloat(formData.hargaBeli);
        const jual = beli + (beli * (marginValue / 100));
        onInputChange("hargaJual", Math.round(jual).toString());
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Perbaikan: Pastikan bahanBaku dikirim saat update
    if (isEditing && formData.bahanBaku && formData.bahanBaku.length > 0) {
      // Jika menggunakan bahan baku, pastikan data bahan baku dikirim
    }
    
    onSubmit(e);
  };

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      {/* Modal dengan ukuran yang lebih besar dan scroll */}
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center flex-shrink-0">
          <h3 className="text-xl font-bold text-gray-800">
            {isEditing ? "Edit Barang" : "Tambah Barang Baru"}
          </h3>
          <button 
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Konten dengan scroll */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Layout 2 kolom untuk menghemat ruang */}
            <div className="grid grid-cols-2 gap-4">
              {/* Kode Barang - Selalu bisa diisi */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kode Barang
                </label>
                <div className="flex">
                  <input
                    type="text"
                    value={formData?.kode || ""}
                    onChange={(e) => onInputChange("kode", e.target.value)}
                    className="flex-1 px-3 py-2.5 text-sm border border-gray-300 rounded-l-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                    placeholder="Kode"
                    required
                  />
                  <button
                    type="button"
                    onClick={onGenerateCode}
                    className="px-3 py-2.5 bg-blue-100 text-blue-700 rounded-r-lg hover:bg-blue-200 transition-colors text-sm border border-blue-200"
                    title="Generate kode acak"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Nama Barang - Readonly jika menggunakan bahan baku */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nama Barang
                  {useBahanBaku && (
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Read Only
                    </span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData?.nama || ""}
                    onChange={(e) => onInputChange("nama", e.target.value)}
                    className={`w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                      isNamaReadOnly ? 'bg-gray-200 cursor-not-allowed text-gray-600' : 'bg-white'
                    }`}
                    placeholder="Nama barang"
                    required
                    readOnly={isNamaReadOnly}
                  />
                </div>
              </div>

              {/* Kategori - Selalu putih */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kategori
                </label>
                <select
                  value={formData?.kategori || ""}
                  onChange={(e) => onInputChange("kategori", e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white text-center"
                  required
                >
                  <option value="" className="text-center">-- Pilih Kategori --</option>
                  {kategoriOptions.map((kategori) => (
                    <option key={kategori} value={kategori} className="text-left">
                      {kategori}
                    </option>
                  ))}
                </select>
              </div>

              {/* Stok - Readonly jika menggunakan bahan baku */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Stok
                  {useBahanBaku && (
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Read Only
                    </span>
                  )}
                </label>
                <input
                  type="number"
                  value={formData?.stok || ""}
                  onChange={(e) => onInputChange("stok", e.target.value)}
                  className={`w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                    isStokReadOnly ? 'bg-gray-200 cursor-not-allowed text-gray-600' : 'bg-white'
                  }`}
                  placeholder="0"
                  min="0"
                  required
                  readOnly={isStokReadOnly}
                />
              </div>
            </div>


            {/* Section: Harga - Layout 3 kolom */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Informasi Harga</h4>
              <div className="grid grid-cols-3 gap-4">
                {/* Harga Beli - Readonly jika menggunakan bahan baku */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga Beli
                  {useBahanBaku && (
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Read Only
                    </span>
                  )}
                </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">Rp</span>
                    <input
                      type="number"
                      value={formData?.hargaBeli || ""}
                      onChange={(e) => onInputChange("hargaBeli", e.target.value)}
                      className={`w-full pl-8 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                        isHargaBeliReadOnly ? 'bg-gray-200 cursor-not-allowed text-gray-600' : 'bg-white'
                      }`}
                      placeholder="0"
                      min="0"
                      required
                      readOnly={isHargaBeliReadOnly}
                    />
                  </div>
                </div>

                {/* Margin - Selalu bisa diisi */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Margin (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={margin}
                      onChange={(e) => handleMarginChange(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent bg-white"
                      placeholder="30"
                      min="0"
                      step="0.1"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500 text-sm">%</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <button
                      type="button"
                      onClick={() => handleMarginChange("10")}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      10%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarginChange("20")}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      20%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarginChange("30")}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      30%
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarginChange("35")}
                      className="text-xs px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium rounded transition-colors"
                      title="Default margin untuk produk dari chef"
                    >
                      35% (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMarginChange("50")}
                      className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                    >
                      50%
                    </button>
                  </div>
                </div>

                {/* Harga Jual - Readonly jika menggunakan bahan baku */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                  Harga Jual
                  {useBahanBaku && (
                    <span className="ml-2 text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
                      <svg className="w-3 h-3 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Read Only
                    </span>
                  )}
                </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500 text-sm">Rp</span>
                    <input
                      type="number"
                      value={formData?.hargaJual || ""}
                      onChange={(e) => onInputChange("hargaJual", e.target.value)}
                      className={`w-full pl-8 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-transparent ${
                        isHargaJualReadOnly ? 'bg-gray-200 cursor-not-allowed text-gray-600' : 'bg-white'
                      }`}
                      placeholder="0"
                      min="0"
                      required
                      readOnly={isHargaJualReadOnly}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Diskon - Selalu bisa diisi */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="useDiscount"
                    checked={!!formData?.useDiscount}
                    onChange={(e) => onInputChange("useDiscount", e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="useDiscount" className="text-sm font-medium text-gray-700">
                    Aktifkan diskon untuk barang ini
                  </label>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`text-sm font-medium px-2 py-1 rounded transition-colors ${
                    formData?.useDiscount 
                      ? 'text-green-700 bg-green-100 border border-green-200' 
                      : 'text-blue-700 bg-blue-100 border border-blue-200'
                  }`}>
                    {globalDiscount}% diskon
                  </div>
                  {formData?.useDiscount && (
                    <div className="text-xs text-green-600 flex items-center font-medium">
                      <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Aktif
                    </div>
                  )}
                </div>
              </div>
              
              {/* Pratinjau Harga Diskon */}
              {formData?.useDiscount && formData?.hargaJual && !isNaN(parseFloat(formData.hargaJual)) && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Harga Jual:</span>
                    <span className="text-sm font-medium text-gray-800">Rp {parseFloat(formData.hargaJual).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600">Diskon ({globalDiscount}%):</span>
                    <span className="text-sm font-medium text-red-600">- Rp {Math.round(parseFloat(formData.hargaJual) * (globalDiscount / 100)).toLocaleString("id-ID")}</span>
                  </div>
                  <div className="border-t border-green-300 mt-2 pt-2 flex justify-between items-center">
                    <span className="text-sm font-semibold text-gray-700">Harga Akhir (estimasi):</span>
                    <span className="text-base font-bold text-green-700">Rp {Math.round(parseFloat(formData.hargaJual) * (1 - globalDiscount / 100)).toLocaleString("id-ID")}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Section: Gambar Barang - Selalu bisa diisi */}
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Gambar Barang
              </label>
              <div className="flex items-start space-x-4">
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="hidden"
                    id="gambar-upload"
                  />
                  <label
                    htmlFor="gambar-upload"
                    className="block w-full px-4 py-6 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer text-center bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex flex-col items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      <span className="text-sm font-medium text-gray-700">
                        {formData?.gambar ? formData.gambar.name : "Pilih gambar"}
                      </span>
                    </div>
                  </label>
                </div>
                
                {formData?.gambar && (
                  <div className="flex-shrink-0">
                    <div className="relative group">
                      <img
                        src={URL.createObjectURL(formData.gambar)}
                        alt="Preview"
                        className="h-20 w-20 object-cover rounded-lg border border-gray-200 shadow-sm"
                      />
                      <button
                        type="button"
                        onClick={() => onInputChange("gambar", null)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </form>
        </div>
        
        {/* Footer - Tombol Aksi */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-1 focus:ring-gray-300"
          >
            Batal
          </button>
          <button
            type="submit"
            onClick={handleSubmit}
            className="px-4 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {loading ? "Menyimpan..." : isEditing ? "Update" : "Simpan"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ModalBarang;
