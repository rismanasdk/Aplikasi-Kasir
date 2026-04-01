// src/admin/bahan-baku/components/BahanBakuTable.tsx
import React, { useState, useEffect } from 'react';
import type { ProdukBahan } from '../index';
import { Edit, Trash2 } from 'lucide-react'; // Mengganti Pencil dengan Edit
import { API_URL } from '../../../../config/api';
import { getAuthHeaders as getStoredAuthHeaders } from '../../../../auth/storage';

interface BahanBakuTableProps {
  bahanBaku: ProdukBahan[];
  setEditingProduk: (produk: ProdukBahan | null) => void;
  openEditBahanForm: (produkIndex: number, bahanIndex: number) => void;
  showDeleteConfirmation: (type: 'produk' | 'bahan', produkIndex: number, bahanIndex?: number) => Promise<void>;
}

interface DataSatuan {
  _id?: string;
  nama: string;
  kode: string;
  tipe?: string;
  deskripsi?: string;
  isActive?: boolean;
}

const BahanBakuTable: React.FC<BahanBakuTableProps> = ({ 
  bahanBaku, 
  setEditingProduk, 
  openEditBahanForm, 
  showDeleteConfirmation 
}) => {
  const getAuthHeaders = (): HeadersInit => {
    return getStoredAuthHeaders();
  };

  const [selectedProduk, setSelectedProduk] = useState<ProdukBahan | null>(null);
  const [satuanMap, setSatuanMap] = useState<Record<string, string>>({});

  // useEffect untuk memperbarui selectedProduk ketika bahanBaku berubah
  useEffect(() => {
    if (selectedProduk) {
      const updatedProduk = bahanBaku.find(p => 
        p._id === selectedProduk._id || p.nama_produk === selectedProduk.nama_produk
      );
      if (updatedProduk) {
        setSelectedProduk(updatedProduk);
      }
    }
  }, [bahanBaku, selectedProduk]);

  useEffect(() => {
    const fetchSatuan = async () => {
      try {
        const res = await fetch(`${API_URL}/api/admin/data-satuan`, {
          headers: getAuthHeaders(),
        });
        if (!res.ok) return;
        const json = await res.json();
        if (Array.isArray(json)) {
          const data = json as DataSatuan[];
          const map: Record<string, string> = {};
          data.forEach(s => { map[s.kode] = s.nama; });
          setSatuanMap(map);
        }
      } catch (err) {
        console.error('fetch satuan map', err);
      }
    };
    fetchSatuan();
  }, []);

  const openModal = (produk: ProdukBahan) => {
    setSelectedProduk(produk);
  };

  const closeModal = () => {
    setSelectedProduk(null);
  };

  return (
    <>
      {/* Card Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {bahanBaku.length > 0 ? (
          bahanBaku.map((produk) => (
            <div 
              key={produk._id || produk.nama_produk} 
              className="bg-white rounded-xl shadow-md overflow-hidden border border-gray-200 transition-all duration-300 hover:shadow-lg cursor-pointer"
              onClick={() => openModal(produk)}
            >
              {/* Card Header */}
              <div className="p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold text-gray-800">{produk.nama_produk}</h3>
                  <div className="flex space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingProduk({...produk});
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg border border-blue-200 hover:border-blue-600 transition-all duration-200"
                      title="Edit Produk"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        showDeleteConfirmation('produk', bahanBaku.indexOf(produk));
                      }}
                      className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                      title="Hapus Produk"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                <div className="mt-2 flex items-center text-sm text-gray-600">
                  <span>{Array.isArray(produk.bahan) ? produk.bahan.length : 0} bahan</span>
                  <span className="mx-2">•</span>
                  <span>Klik untuk detail</span>
                </div>
              </div>

              {/* Card Body - Summary Info */}
              <div className="p-5">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <p className="text-xs text-blue-600 font-medium">Total Harga Bahan</p>
                    <p className="font-semibold">Rp {produk.total_harga?.toLocaleString('id-ID') || '0'}</p>
                  </div>
                  <div className="bg-green-50 p-3 rounded-lg">
                    <p className="text-xs text-green-600 font-medium">Total Porsi</p>
                    <p className="font-semibold">{produk.total_porsi || '0'}</p>
                  </div>
                  <div className="bg-purple-50 p-3 rounded-lg col-span-2">
                    <p className="text-xs text-purple-600 font-medium">Modal per Porsi</p>
                    <p className="font-semibold">Rp {produk.modal_per_porsi?.toLocaleString('id-ID') || '0'}</p>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="bg-white rounded-xl shadow-sm p-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">Tidak ada data bahan baku</h3>
              <p className="mt-1 text-gray-500">Silakan tambahkan produk dan bahan baku terlebih dahulu.</p>
            </div>
          </div>
        )}
      </div>

      {/* Modal with Table */}
      {selectedProduk && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-xl font-bold text-gray-800">Detail Produk: {selectedProduk.nama_produk}</h3>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto max-h-[70vh]">
              {/* Summary Info */}
              <div className="grid grid-cols-3 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600 font-medium">Total Harga Bahan</p>
                  <p className="text-lg font-bold">Rp {selectedProduk.total_harga?.toLocaleString('id-ID') || '0'}</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600 font-medium">Total Porsi</p>
                  <p className="text-lg font-bold">{selectedProduk.total_porsi || '0'}</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <p className="text-sm text-purple-600 font-medium">Modal per Porsi</p>
                  <p className="text-lg font-bold">Rp {selectedProduk.modal_per_porsi?.toLocaleString('id-ID') || '0'}</p>
                </div>
              </div>

              {/* Table */}
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nama Bahan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Satuan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Harga Per Satuan
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stok
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Aksi
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(selectedProduk.bahan) && selectedProduk.bahan.map((bahan, bahanIndex) => {
                      
                      return (
                        <tr key={bahan._id || bahan.nama}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{bahan.nama}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{satuanMap[bahan.satuan] ?? bahan.satuan ?? '-'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">Rp {bahan.harga.toLocaleString('id-ID')}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{bahan.jumlah}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => openEditBahanForm(bahanBaku.indexOf(selectedProduk), bahanIndex)}
                                className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg border border-blue-200 hover:border-blue-600 transition-all duration-200"
                                title="Edit"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => showDeleteConfirmation('bahan', bahanBaku.indexOf(selectedProduk), bahanIndex)}
                                className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                                title="Hapus"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default BahanBakuTable;
