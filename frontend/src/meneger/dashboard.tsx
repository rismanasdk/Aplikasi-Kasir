import MenegerLayout from "./layout";
import { useState, useEffect } from "react";
import LoadingSpinner from "../components/LoadingSpinner";
import { API_URL } from '../config/api';
import { getAuthHeaders as getStoredAuthHeaders } from "../auth/storage";

import {
  DollarSign,
  ShoppingCart,
  BarChart3,
  Star,
  Award,
  Calendar,
  TrendingUp,
  Package
} from "lucide-react";

interface BarangTerlaris {
  nama_barang: string;
  jumlah: number;
  nama?: string;
  jumlah_terjual?: number;
  kode_barang?: string;
  gambar_url?: string;
}

interface DashboardData {
  ringkasan_penjualan: number;
  omset_penjualan: number;
  barang_terlaris: BarangTerlaris[];
}

interface StokBarang {
  _id: string;
  kode_barang: string;
  nama_barang: string;
  gambar_url?: string;
}

interface TopBarangApiItem {
  nama_barang?: string;
  nama?: string;
  jumlah?: number;
  jumlah_terjual?: number;
  kode_barang?: string;
  gambar_url?: string;
}

const MenegerDashboard = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const dashboardUrl = `${API_URL}/api/manager/dashboard`;
        const dashboardResponse = await fetch(dashboardUrl, {
          headers: getStoredAuthHeaders(),
        });

        if (!dashboardResponse.ok) {
          throw new Error(`HTTP error! status: ${dashboardResponse.status}`);
        }

        const dashboardData = await dashboardResponse.json();

        // Also fetch top products using the more detailed aggregation endpoint
        const topUrl = `${API_URL}/api/manager/dashboard/top`;
        const topResponse = await fetch(topUrl, {
          headers: getStoredAuthHeaders(),
        });
        let topData: { barang_terlaris?: TopBarangApiItem[] } | null = null;
        if (topResponse.ok) {
          try {
            topData = await topResponse.json();
          } catch (e) {
            console.warn("Failed parsing top products response:", e);
            topData = null;
          }
        }

        const stokUrl = `${API_URL}/api/manager/stok-barang`;
        const stokResponse = await fetch(stokUrl, {
          headers: getStoredAuthHeaders(),
        });

        if (stokResponse.ok) {
          const stokData: StokBarang[] = await stokResponse.json();

          // Buat peta untuk pencarian cepat berdasarkan kode_barang
          const stokMap: Record<string, StokBarang> = {};
          stokData.forEach((item: StokBarang) => {
            if (item.kode_barang) {
              stokMap[item.kode_barang] = item;
            }
          });

          // Buat peta untuk pencarian berdasarkan nama_barang (normalisasi nama)
          const stokNameMap: Record<string, StokBarang> = {};
          stokData.forEach((item: StokBarang) => {
            const normalizedName = item.nama_barang.toLowerCase().trim();
            stokNameMap[normalizedName] = item;
          });

          // Prefer aggregated top products when available (more detailed from /top)
          const sourceTop = (topData && Array.isArray(topData.barang_terlaris)) ? topData.barang_terlaris : dashboardData.barang_terlaris;

          const barangTerlarisWithImages = sourceTop.map((barang: BarangTerlaris | TopBarangApiItem) => {
            let gambarUrl = barang.gambar_url;
            let kodeBarang = barang.kode_barang;

            // Coba cari berdasarkan kode_barang jika ada
            if (kodeBarang && stokMap[kodeBarang]) {
              const stokItem = stokMap[kodeBarang];
              if (!gambarUrl && stokItem.gambar_url) {
                gambarUrl = stokItem.gambar_url;
              }
            } else {
              // Jika tidak ada kode_barang atau tidak ditemukan, cari berdasarkan nama
              const normalizedName = (barang.nama_barang || barang.nama || "").toLowerCase().trim();
              const matchingItem = stokNameMap[normalizedName];

              if (matchingItem) {
                if (!kodeBarang) {
                  kodeBarang = matchingItem.kode_barang;
                }
                if (!gambarUrl && matchingItem.gambar_url) {
                  gambarUrl = matchingItem.gambar_url;
                }
              }
            }

            return {
              nama_barang: barang.nama_barang || barang.nama || "Unknown",
              jumlah: barang.jumlah || barang.jumlah_terjual || 0,
              kode_barang: kodeBarang,
              gambar_url: gambarUrl
            };
          });

          setData({
            ...dashboardData,
            barang_terlaris: barangTerlarisWithImages
          });
        } else {
          setData(dashboardData);
        }
      } catch (err) {
        console.error("Gagal mengambil data dashboard:", err);
        setError("Gagal memuat data dashboard. Silakan coba lagi.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const BarangImage: React.FC<{ url?: string; name: string; size?: "sm" | "md" | "lg" }> = ({
    url,
    name,
    size = "md"
  }) => {
    const [imgError, setImgError] = useState(false);

    const sizeClasses = {
      sm: "w-9 h-9 sm:w-10 sm:h-10",
      md: "w-11 h-11 sm:w-12 sm:h-12",
      lg: "w-12 h-12 sm:w-16 sm:h-16"
    };

    if (imgError || !url) {
      return (
        <div className={`${sizeClasses[size]} bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center shadow-inner flex-shrink-0`}>
          <Package className={`${size === 'lg' ? 'w-5 h-5 sm:w-6 sm:h-6' : 'w-4 h-4 sm:w-5 sm:h-5'} text-gray-400`} />
        </div>
      );
    }

    return (
      <img
        src={url}
        alt={name}
        className={`${sizeClasses[size]} object-cover rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 flex-shrink-0`}
        onError={() => setImgError(true)}
      />
    );
  };

  if (loading) {
    return (
      <MenegerLayout>
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner />
        </div>
      </MenegerLayout>
    );
  }

  const topProduct = data?.barang_terlaris[0];

  return (
    <MenegerLayout>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 sm:mb-8 gap-3 sm:gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-1 sm:mb-2">
            Dashboard Manager
          </h2>
          <p className="text-gray-600 text-sm sm:text-lg">
            Ringkasan penjualan dan performa toko
          </p>
        </div>
        <div className="flex items-center text-xs sm:text-sm text-gray-500 bg-white px-3 sm:px-4 py-2 rounded-xl shadow-sm border border-gray-100 w-full lg:w-auto">
          <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
          <span className="truncate">
            {new Date().toLocaleDateString('id-ID', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </span>
        </div>
      </div>

      {error && (
        <div className="mb-6 bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 text-red-700 px-4 sm:px-6 py-4 rounded-2xl flex items-center shadow-sm text-sm sm:text-base">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {/* Statistik Utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        {/* Total Pendapatan */}
        <div className="group bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-blue-100 transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">Total Pendapatan</p>
              <h3 className="text-base sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 truncate">
                Rp {data?.omset_penjualan?.toLocaleString("id-ID") || "0"}
              </h3>
              <div className="hidden sm:flex items-center text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full w-fit">
                <TrendingUp className="h-3 w-3 mr-1" />
                Bulan ini
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 sm:p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <DollarSign className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Total Transaksi */}
        <div className="group bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-green-100 transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">Total Transaksi</p>
              <h3 className="text-base sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 truncate">
                {data?.ringkasan_penjualan || "0"}
              </h3>
              <div className="hidden sm:flex items-center text-xs text-green-600 font-medium bg-green-50 px-2 py-1 rounded-full w-fit">
                <TrendingUp className="h-3 w-3 mr-1" />
                Bulan ini
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-2 sm:p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <ShoppingCart className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Rata-rata Transaksi */}
        <div className="group bg-white p-3 sm:p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:border-purple-100 transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">Rata-rata Transaksi</p>
              <h3 className="text-base sm:text-2xl font-bold text-gray-800 mb-1 sm:mb-2 truncate">
                Rp{" "}
                {data && data.ringkasan_penjualan && data.ringkasan_penjualan > 0
                  ? Math.round(
                      data.omset_penjualan / data.ringkasan_penjualan
                    ).toLocaleString("id-ID")
                  : "0"}
              </h3>
              <div className="hidden sm:flex items-center text-xs text-gray-600 font-medium bg-gray-50 px-2 py-1 rounded-full w-fit">
                <BarChart3 className="h-3 w-3 mr-1" />
                Per transaksi
              </div>
            </div>
            <div className="bg-gradient-to-br from-purple-500 to-purple-600 p-2 sm:p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <BarChart3 className="h-4 w-4 sm:h-6 sm:w-6 text-white" />
            </div>
          </div>
        </div>

        {/* Produk Terlaris */}
        <div className="group bg-gradient-to-br from-amber-50 to-orange-50 p-3 sm:p-6 rounded-2xl shadow-sm border border-amber-100 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
          <div className="flex items-start sm:items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-gray-600 text-xs sm:text-sm mb-1 sm:mb-2 font-medium">Produk Terlaris</p>
              <div className="flex items-center space-x-2 sm:space-x-3">
                {topProduct && (
                  <BarangImage url={topProduct.gambar_url} name={topProduct.nama_barang} size="sm" />
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm sm:text-lg font-bold text-gray-800 truncate" title={topProduct?.nama_barang}>
                    {topProduct?.nama_barang || "-"}
                  </h3>
                  <p className="text-xs sm:text-sm text-amber-600 font-medium flex items-center">
                    <Star className="h-3 w-3 sm:h-4 sm:w-4 mr-1 fill-amber-400 flex-shrink-0" />
                    <span className="truncate">{topProduct?.jumlah || "0"} terjual</span>
                  </p>
                </div>
              </div>
            </div>
            <div className="hidden sm:block bg-gradient-to-br from-amber-500 to-orange-500 p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0">
              <Award className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </div>

      {/* Daftar Produk Terlaris */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
          <h3 className="text-lg sm:text-xl font-bold text-gray-800 flex items-center">
            <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-2 rounded-lg shadow-sm mr-3 flex-shrink-0">
              <Star className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
            </div>
            Top Produk Terlaris
          </h3>
          <div className="flex items-center text-xs sm:text-sm text-gray-500 bg-gray-50 px-3 sm:px-4 py-2 rounded-xl border border-gray-100 w-full sm:w-auto">
            <Calendar className="h-4 w-4 mr-2 flex-shrink-0" />
            Periode Bulan Ini
          </div>
        </div>

        {data?.barang_terlaris && data.barang_terlaris.length > 0 ? (
          <div className="space-y-3">
            {data.barang_terlaris.map((item, idx) => (
              <div
                key={idx}
                className="group flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 p-3 sm:p-4 hover:bg-gradient-to-r hover:from-amber-50/50 hover:to-orange-50/50 rounded-xl transition-all duration-300 border border-gray-100 hover:border-amber-200 hover:shadow-md"
              >
                <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                  <div
                    className={`flex-shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-xl font-bold text-base sm:text-lg shadow-sm border ${
                      idx === 0
                        ? "bg-gradient-to-br from-amber-500 to-orange-500 text-white border-amber-600 shadow-lg transform -rotate-6"
                        : idx === 1
                        ? "bg-gradient-to-br from-gray-400 to-gray-500 text-white border-gray-600"
                        : idx === 2
                        ? "bg-gradient-to-br from-amber-700 to-orange-800 text-white border-amber-800"
                        : "bg-gradient-to-br from-blue-100 to-blue-200 text-blue-800 border-blue-200"
                    } group-hover:scale-105 transition-transform duration-300`}
                  >
                    {idx + 1}
                  </div>

                  <BarangImage url={item.gambar_url} name={item.nama_barang} size="lg" />

                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-gray-800 text-sm sm:text-lg truncate">
                      {item.nama_barang}
                    </h4>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 sm:mt-2">
                      <p className="text-xs sm:text-sm text-gray-600 flex items-center">
                        <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 flex-shrink-0" />
                        <span className="font-medium">{item.jumlah} terjual</span>
                      </p>
                      <p className="text-xs text-gray-400">
                        Kode: {item.kode_barang || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex-shrink-0 sm:ml-4 self-start sm:self-auto">
                  <div
                    className={`inline-flex items-center px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold shadow-sm border ${
                      idx === 0
                        ? "bg-gradient-to-r from-amber-500 to-orange-500 text-white border-amber-600 shadow-lg"
                        : idx === 1
                        ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white border-gray-600"
                        : idx === 2
                        ? "bg-gradient-to-r from-amber-700 to-orange-800 text-white border-amber-800"
                        : "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-200"
                    } group-hover:scale-105 transition-transform duration-300`}
                  >
                    {idx === 0 ? (
                      <span className="flex items-center">
                        <Award className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Terlaris
                      </span>
                    ) : (
                      <span>Top {idx + 1}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 sm:py-16 border-2 border-dashed border-gray-300 rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100/50">
            <div className="bg-white w-16 h-16 sm:w-20 sm:h-20 rounded-2xl shadow-sm border border-gray-200 flex items-center justify-center mx-auto mb-4">
              <Package className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
            </div>
            <p className="text-gray-500 text-base sm:text-lg font-medium mb-2">
              Tidak ada data produk terlaris
            </p>
            <p className="text-gray-400 text-xs sm:text-sm">
              Data akan muncul ketika ada penjualan produk
            </p>
          </div>
        )}
      </div>
    </MenegerLayout>
  );
};

export default MenegerDashboard;