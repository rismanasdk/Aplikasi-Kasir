// src/admin/stok-barang/BarangTable.tsx
import React from "react";
import type { Barang } from ".";
import type { BahanBakuItem } from "./ModalBarang";
import { Edit, Trash2, Package } from "lucide-react";
import { API_URL } from '../../config/api';

const safeValue = <T,>(value: T | null | undefined, fallback: T): T => {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'number' && isNaN(value)) return fallback;
  return value;
};

const formatNumber = (value: number | string | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "0";
  
  const num = typeof value === "string" ? parseFloat(value) : value;
  return isNaN(num) ? "0" : num.toLocaleString("id-ID");
};

const formatCurrency = (value: number | string | null | undefined): string => {
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  if (numValue === null || numValue === undefined || isNaN(numValue as number)) return "Rp 0";
  
  return `Rp ${formatNumber(numValue)}`;
};

// Fungsi untuk mendapatkan warna progress bar
const getProgressBarColor = (stok: number, stokMinimal: number = 5) => {
  if (stok <= 0) return "bg-red-500";
  if (stok <= stokMinimal) return "bg-yellow-500";
  return "bg-green-500";
};

// Fungsi untuk menghitung lebar progress bar
const getProgressBarWidth = (stok: number, stokAwal?: number) => {
  const referenceStock = stokAwal || 50;
  return `${Math.min(100, (stok / referenceStock) * 100)}%`;
};

interface BarangTableProps {
  data: Barang[];
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdateStatus: (id: string, status: string) => void;
  bahanBakuList?: BahanBakuItem[];
}

const BarangTable: React.FC<BarangTableProps> = ({ 
  data, 
  onEdit, 
  onDelete,
  onUpdateStatus,
  bahanBakuList = []
}) => {
  if (!data) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
        <div className="w-full text-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-3"></div>
          <p className="text-gray-500 text-sm">Memuat data barang...</p>
        </div>
      </div>
    );
  }

  const getImageUrl = (gambarUrl?: string): string | null => {
    if (!gambarUrl) return null;
    if (gambarUrl.startsWith('http://') || gambarUrl.startsWith('https://')) {
      return gambarUrl;
    }
    return `${API_URL}${gambarUrl.startsWith('/') ? '' : '/'}${gambarUrl}`;
  };

  const getBahanBakuInfo = (barang: Barang): BahanBakuItem | null => {
    if (barang.bahanBaku && barang.bahanBaku.length > 0) {
      return {
        nama_produk: barang.nama,
        total_porsi: barang.bahanBaku.reduce((sum, produk) => 
          sum + (produk.bahan?.reduce((bahanSum, bahan) => bahanSum + (bahan.jumlah || 0), 0) || 0), 0
        ),
        modal_per_porsi: barang.hargaBeli || 0,
        bahan: barang.bahanBaku.flatMap(produk => produk.bahan || [])
      };
    }
    if (bahanBakuList.length === 0) return null;
    
    const matchingBahan = bahanBakuList.find(item => 
      item.nama_produk.toLowerCase() === barang.nama.toLowerCase()
    );
    
    return matchingBahan || null;
  };

  const getMarginColor = (margin?: number): string => {
    if (!margin) return "text-gray-600";
    if (margin < 20) return "text-red-600";
    if (margin < 30) return "text-yellow-600";
    if (margin < 50) return "text-green-600";
    return "text-blue-600";
  };

  const getMarginBadge = (margin?: number): string => {
    if (!margin) return "bg-gray-100 text-gray-600";
    if (margin < 20) return "bg-red-100 text-red-700";
    if (margin < 30) return "bg-yellow-100 text-yellow-700";
    if (margin < 50) return "bg-green-100 text-green-700";
    return "bg-blue-100 text-blue-700";
  };

  const getMarginLabel = (margin?: number): string => {
    if (!margin) return '-';
    return margin < 20 ? 'Rendah' : margin < 30 ? 'Normal' : margin < 50 ? 'Bagus' : 'Tinggi';
  };

  const getRowAccent = (item: Barang): string => {
    if (item.status === "habis") return "border-l-red-500 bg-red-50/70";
    if (item.status === "hampir habis") return "border-l-yellow-500 bg-yellow-50/70";
    if (item.status === "aman") return "border-l-green-500 bg-green-50/70";
    return "border-l-gray-200";
  };

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-12 text-center">
          <div className="flex flex-col items-center justify-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
              <Package className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500 font-medium">Tidak ada data barang</p>
            <p className="text-gray-400 text-sm mt-1">Data barang akan muncul di sini</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* ===== CARD LIST — tampil di mobile & tablet ===== */}
      <div className="md:hidden space-y-3">
        {data.map((item, index) => {
          const imageUrl = getImageUrl(item.gambarUrl);
          const progressBarColor = getProgressBarColor(item.stok, item.stokMinimal || 5);
          const progressBarWidth = getProgressBarWidth(item.stok, item.stok_awal);

          return (
            <div
              key={item._id || `card-${index}-${Date.now()}`}
              className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 p-4 ${getRowAccent(item)}`}
            >
              {/* Header: gambar + nama + kode */}
              <div className="flex items-start gap-3 mb-3">
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={item.nama || "gambar barang"}
                    className="w-14 h-14 object-cover rounded-lg border border-gray-200 shadow-sm flex-shrink-0"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = "https://via.placeholder.com/48?text=No+Img";
                      target.classList.add("object-contain", "p-1", "bg-gray-100");
                    }}
                    loading="lazy"
                  />
                ) : (
                  <div className="w-14 h-14 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center flex-shrink-0">
                    <span className="text-gray-400 text-[10px] text-center">No Image</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-gray-900 truncate" title={item.nama || "-"}>
                    {safeValue(item.nama, "-")}
                  </div>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs font-mono font-medium text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-200">
                      {safeValue(item.kode, "-")}
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                      {safeValue(item.kategori, "-")}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => item._id && onUpdateStatus(item._id, item.statusBarang === "publish" ? "pending" : "publish")}
                  className={`flex-shrink-0 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                    item.statusBarang === "publish"
                      ? "bg-green-100 text-green-800 border border-green-300"
                      : "bg-orange-100 text-orange-800 border border-orange-300"
                  }`}
                >
                  {item.statusBarang === "publish" ? "Published" : "Pending"}
                </button>
              </div>

              {/* Info harga */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-gray-500 mb-0.5">Harga Beli</div>
                  <div className="text-xs font-medium text-gray-700">{formatCurrency(safeValue(item.hargaBeli, 0))}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-gray-500 mb-0.5">Margin</div>
                  <div className={`text-xs font-semibold ${getMarginColor(item.margin)}`}>
                    {item.margin !== undefined ? `${item.margin}%` : '-'}
                  </div>
                  {item.margin !== undefined && (
                    <div className={`text-[9px] px-1.5 py-0.5 rounded-full inline-block mt-0.5 ${getMarginBadge(item.margin)}`}>
                      {getMarginLabel(item.margin)}
                    </div>
                  )}
                </div>
                <div className="bg-gray-50 rounded-lg p-2">
                  <div className="text-[10px] text-gray-500 mb-0.5">Harga Jual</div>
                  <div className="text-xs font-medium text-gray-700">{formatCurrency(safeValue(item.hargaJual, 0))}</div>
                </div>
              </div>

              {/* Harga final + stok */}
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-semibold text-green-700 bg-green-50 px-2.5 py-1.5 rounded-lg border border-green-200">
                  Final: {formatCurrency(safeValue(item.hargaFinal, 0))}
                </div>
                <div className="text-right flex-1 ml-3 max-w-[45%]">
                  <div className="flex items-center justify-end gap-1 mb-1">
                    <span className="text-xs text-gray-500">Stok:</span>
                    <span className="text-sm font-semibold text-gray-900">{safeValue(item.stok, 0)}</span>
                  </div>
                  {item.stok !== undefined && (
                    <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-500 ${progressBarColor}`}
                        style={{ width: progressBarWidth }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>

              {/* Aksi */}
              <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
                <button
                  onClick={() => item._id && onEdit(item._id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-all duration-200"
                  disabled={!item._id}
                >
                  <Edit className="w-4 h-4" />
                  Edit
                </button>
                <button
                  onClick={() => item._id && onDelete(item._id)}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-200 transition-all duration-200"
                  disabled={!item._id}
                >
                  <Trash2 className="w-4 h-4" />
                  Hapus
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* ===== TABEL — tampil dari md ke atas ===== */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50/80 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Gambar
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Kode
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Nama Barang
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Kategori
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Harga Beli
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Margin
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Harga Jual
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Harga Final
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Stok
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Status Barang
                </th>
                <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider border-b border-gray-200">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {data.map((item, index) => {
                const imageUrl = getImageUrl(item.gambarUrl);
                const stokAvail = item.status === "aman";
                const isLowStock = item.status === "hampir habis";
                const isOutOfStock = item.status === "habis";
                let rowClasses = 'transition-all duration-200 hover:bg-blue-50/70';
                if (isOutOfStock) {
                  rowClasses += ' bg-red-50/70 border-l-[4px] border-l-red-500 !border-l-red-500';
                } else if (isLowStock) {
                  rowClasses += ' bg-yellow-50/70 border-l-[4px] border-l-yellow-500 !border-l-yellow-500';
                } else if (stokAvail){
                  rowClasses += ' bg-green-50/70 border-l-[4px] border-l-green-500 !border-l-green-500';
                }
                const bahanBakuInfo = getBahanBakuInfo(item);                
                const progressBarColor = getProgressBarColor(item.stok, item.stokMinimal || 5);
                const progressBarWidth = getProgressBarWidth(item.stok, item.stok_awal);
                
                return (
                  <tr 
                    key={item._id || `row-${index}-${Date.now()}`}
                    className={rowClasses} 
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex justify-center">
                        {imageUrl ? (
                          <div className="relative group">
                            <img
                              src={imageUrl}
                              alt={item.nama || "gambar barang"}
                              className="w-12 h-12 object-cover rounded-lg border border-gray-200 shadow-sm group-hover:shadow-md transition-all"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.src = "https://via.placeholder.com/48?text=No+Img";
                                target.classList.add("object-contain", "p-1", "bg-gray-100");
                              }}
                              loading="lazy"
                            />
                            <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-all"></div>
                          </div>
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-lg border border-gray-200 flex items-center justify-center shadow-sm">
                            <span className="text-gray-400 text-xs">No Image</span>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-mono font-medium text-gray-900 bg-gray-50 px-2 py-1 rounded border border-gray-200 inline-block">
                        {safeValue(item.kode, "-")}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-medium text-gray-900 truncate" title={item.nama || "-"}>
                          {safeValue(item.nama, "-")}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {safeValue(item.kategori, "-")}
                      </span>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 font-medium">
                        {formatCurrency(safeValue(item.hargaBeli, 0))}
                      </div>
                      {bahanBakuInfo && (
                        <div className="text-xs text-green-600 mt-1">
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col">
                        <div className={`text-sm font-medium text-center ${getMarginColor(item.margin)}`}>
                          {item.margin !== undefined ? `${item.margin}%` : '-'}
                        </div>
                        {item.margin && (
                          <div className={`text-xs px-2 py-0.5 rounded-full inline-block mt-1 ${getMarginBadge(item.margin)}`}>
                            {getMarginLabel(item.margin)}
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-600 font-medium">
                        {formatCurrency(safeValue(item.hargaJual, 0))}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-semibold text-green-700 bg-green-50 px-2 py-1 rounded border border-green-200">
                        {formatCurrency(safeValue(item.hargaFinal, 0))}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-col space-y-1">
                        <div className="text-sm font-medium text-gray-900 text-center">
                          {safeValue(item.stok, 0)}
                        </div>
                        <div className="text-xs text-gray-500 text-center">
                        </div>
                        {item.stok !== undefined && (
                          <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className={`h-1.5 rounded-full transition-all duration-500 ${progressBarColor}`}
                              style={{ width: progressBarWidth }}
                            ></div>
                          </div>
                        )}
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <button
                          onClick={() => item._id && onUpdateStatus(item._id, item.statusBarang === "publish" ? "pending" : "publish")}
                          className={`inline-flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                            item.statusBarang === "publish"
                              ? "bg-green-100 text-green-800 hover:bg-green-200 border border-green-300"
                              : "bg-orange-100 text-orange-800 hover:bg-orange-200 border border-orange-300"
                          }`}
                          title={item.statusBarang === "publish" ? "Ubah ke Pending" : "Publish Barang"}
                        >
                          {item.statusBarang === "publish" ? "Published" : "Pending"}
                        </button>
                      </div>
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => item._id && onEdit(item._id)}
                          className="inline-flex items-center justify-center w-8 h-8 text-blue-600 hover:text-white hover:bg-blue-600 rounded-lg border border-blue-200 hover:border-blue-600 transition-all duration-200"
                          title="Edit barang"
                          disabled={!item._id}
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => item._id && onDelete(item._id)}
                          className="inline-flex items-center justify-center w-8 h-8 text-red-600 hover:text-white hover:bg-red-600 rounded-lg border border-red-200 hover:border-red-600 transition-all duration-200"
                          title="Hapus barang"
                          disabled={!item._id}
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
    </>
  );
};

export default BarangTable;