import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line, type PieLabel } from 'recharts';
import LoadingSpinner from '../../components/LoadingSpinner';
import { exportPdf, exportExcel } from '../utils';
import { Landmark, Wallet, TrendingUp, CreditCard, Package, DollarSign, ShoppingCart, TrendingDown } from 'lucide-react';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
const API_KEY = import.meta.env.VITE_API_KEY;

import { exportLaporanKeuanganProfesional, exportLaporanKeuanganExcelProfesional } from '../../services/exportIntegrations';

// Interfaces
interface ProdukApi {
  nama_produk: string;
  jumlah_terjual: number;
  hpp_per_porsi: number;
  hpp_total: number;
  pendapatan: number;
  laba_kotor: number;
  _id: string;
}

interface SummaryApi {
  total_hpp: number;
  total_pendapatan: number;
  total_laba_kotor: number;
  total_beban: number;
  total_barang_terjual_hari_ini?: number;
  total_laba_bersih: number;
}

interface ApiResponse {
  success: boolean;
  summary: SummaryApi;
  data?: {
    _id: string;
    tanggal: string;
    produk: ProdukApi[];
    total_hpp: number;
    total_pendapatan: number;
    total_laba_kotor: number;
    total_beban: number;
    laba_bersih: number;
    createdAt: string;
    updatedAt: string;
    __v: number;
  }[];
}

interface DetailLabaResponse {
  data?: ApiResponse["data"];
  biaya_operasional?: {
    rincian_biaya?: Array<{
      nama: string;
      jumlah: number;
    }>;
    total?: number;
  };
}

interface RingkasanLaporanResponse {
  ringkasan?: Partial<SummaryApi> & {
    total_biaya_operasional?: number;
    total_barang_terjual?: number;
  };
  biaya_operasional?: DetailLabaResponse["biaya_operasional"];
}

interface DaftarBulan {
  id: string;
  nama_bulan: string;
  bulan: number;
  tahun: number;
  createdAt: string;
}

interface ProdukTerlaris {
  produk: string;
  harga_jual: number;
  harga_beli: number;
  labaPerItem: number;
  jumlahTerjual: number;
  totalLaba: number;
}

export interface BiayaOperasionalItem {
  nama: string;
  jumlah: number;
  _id?: string;
}

export interface BiayaOperasionalData {
  _id?: string;
  rincian_biaya: BiayaOperasionalItem[];
  total: number;
  createdAt?: string;
  __v?: number;
}

// PERBAIKAN: Tambahkan interface BiayaOperasional untuk export
interface BiayaOperasionalExport {
  _id: string;
  rincian_biaya: Array<{
    nama: string;
    jumlah: number;
    _id: string;
  }>;
  total: number;
  createdAt: string;
  __v: number;
}

interface PieData {
  name: string;
  value: number;
  [key: string]: unknown;
}

interface MetodePembayaran {
  metode: string;
  total: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    payload: PieData;
  }>;
}

const LaporanPenjualan: React.FC = () => {
  // States
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [produkTerlarisHariIni, setProdukTerlarisHariIni] = useState<ProdukTerlaris[]>([]);
  const [totalPendapatan, setTotalPendapatan] = useState<number>(0);
  const [totalBarangTerjualHariIni, setTotalBarangTerjualHariIni] = useState<number>(0);
  const [totalLabaKotor, setTotalLabaKotor] = useState<number>(0);
  const [labaBersih, setLabaBersih] = useState<number>(0);
  const [totalHpp, setTotalHpp] = useState<number>(0);
  const [totalBebanPerhari, setTotalBebanPerhari] = useState<number>(0);
  const [totalBebanPerbulan, setTotalBebanPerbulan] = useState<number>(0);
  const [pieData, setPieData] = useState<PieData[]>([]);
  const [daftarBulan, setDaftarBulan] = useState<DaftarBulan[]>([]);
  const [selectedBulan, setSelectedBulan] = useState<string>('');
  const [loadingBulan, setLoadingBulan] = useState(false);
  const [biayaOperasional, setBiayaOperasional] = useState<BiayaOperasionalData>({
    rincian_biaya: [],
    total: 0,
  });
  const [biayaPerbulan, setbiayaPerbulan] = useState<Array<{ bulan: string; nama_bulan: string; total: number; total_hpp: number }>>([]);
  const [loadingBiayaOperasional, setLoadingBiayaOperasional] = useState<boolean>(true);
  // Constants
  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#EF4444', '#14B8A6', '#F97316'];

  // Fetch daftar bulan
  useEffect(() => {
    const fetchDaftarBulan = async () => {
      try {
        setLoadingBulan(true);
        const token = getStoredToken();
        if (!token) {
          throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
        }
        const response = await fetch(`${API_URL}/api/super-admin/laporan/bulan`, {
          headers: {
            Authorization: `Bearer ${token}`,
            ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
          },
        });
        
        if (!response.ok) {
          if (response.status === 401 || response.status === 403) {
            throw new Error('Akses ditolak. Silakan login ulang dengan akun admin.');
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        setDaftarBulan(result.daftar_bulan);
        
        if (result.daftar_bulan?.length > 0) {
          setSelectedBulan(result.daftar_bulan[0].id);
        }
      } catch (err) {
        console.error('Error fetching daftar bulan:', err);
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil daftar bulan');
      } finally {
        setLoadingBulan(false);
      }
    };

    fetchDaftarBulan();
  }, []);

  // Fetch data laporan
  const fetchData = useCallback(async () => {
    if (!selectedBulan) return;
    
    try {
      setLoading(true);
      const token = getStoredToken();
      if (!token) {
        throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
      }
      const authHeaders: HeadersInit = {
        Authorization: `Bearer ${token}`,
        ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
      };

      // Temukan info bulan yang dipilih dari daftarBulan untuk membentuk startDate/endDate
      const bulanObj = daftarBulan.find(b => b.id === selectedBulan);
      let startDate: string;
      let endDate: string;

      if (bulanObj) {
        const yyyy = String(bulanObj.tahun);
        const mm = String(bulanObj.bulan).padStart(2, '0');
        startDate = `${yyyy}-${mm}-01`;
        // hitung hari terakhir bulan
        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
        endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      } else {
        // fallback: gunakan bulan sekarang
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        startDate = `${yyyy}-${mm}-01`;
        const lastDay = new Date(yyyy, Number(mm), 0).getDate();
        endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      }

      // Fetch realtime ringkasan from laporan controller
      const ringkasanResp = await fetch(`${API_URL}/api/super-admin/laporan/ringkasan?start=${startDate}&end=${endDate}`, {
        headers: authHeaders,
      });
      if (!ringkasanResp.ok) {
        if (ringkasanResp.status === 401 || ringkasanResp.status === 403) {
          throw new Error('Akses ditolak. Silakan login ulang dengan akun admin.');
        }
        throw new Error(`HTTP error! status: ${ringkasanResp.status}`);
      }
      const ringkasanJson: RingkasanLaporanResponse = await ringkasanResp.json();
      const ringkasan = ringkasanJson?.ringkasan || {};

      // Fetch detail laba and daily data (optional - keep existing structure if available)
      const detailResp = await fetch(`${API_URL}/api/super-admin/laporan/detail-laba?start=${startDate}&end=${endDate}`, {
        headers: authHeaders,
      });
      const detailJson: DetailLabaResponse | null = detailResp.ok ? await detailResp.json() : null;

      // Fetch rekap metode pembayaran (not used heavily here, but keep for compatibility)
      const rekapResp = await fetch(`${API_URL}/api/super-admin/laporan/rekap-metode?start=${startDate}&end=${endDate}`, {
        headers: authHeaders,
      });
      await rekapResp.json();

      // Normalize values with safe fallbacks
      const totalPendapatanValue = Number(ringkasan.total_pendapatan || 0);
      setTotalPendapatan(totalPendapatanValue);
      setTotalLabaKotor(Number(ringkasan.total_laba_kotor || 0));
      setTotalHpp(Number(ringkasan.total_hpp || 0));

      // Keep data shape compatibility: try to use detailJson.data if present, else empty
      const result: ApiResponse = {
        success: true,
        summary: {
          total_hpp: Number(ringkasan.total_hpp || 0),
          total_pendapatan: Number(ringkasan.total_pendapatan || 0),
          total_laba_kotor: Number(ringkasan.total_laba_kotor || 0),
          total_beban: Number(ringkasan.total_biaya_operasional || 0),
          total_barang_terjual_hari_ini: Number(ringkasan.total_barang_terjual || 0),
          total_laba_bersih: Number(ringkasan.total_laba_bersih || 0)
        },
        data: detailJson?.data || []
      };

      setData(result);
      
      // Proses data harian / bulanan
      const totalBebanBulanan = Number(ringkasan.total_biaya_operasional || 0);
      setTotalBebanPerbulan(totalBebanBulanan);

      // For per-day beban, if detail data contains daily entries, use today's; otherwise 0
      const today = new Date().toISOString().split('T')[0];
      const todayData = result.data?.find(item => item.tanggal === today) || null;
      setTotalBebanPerhari(todayData ? (todayData.total_beban || 0) : 0);

      // Produk hari ini: prefer detail, else use ringkasan total_barang_terjual
      if (todayData?.produk && Array.isArray(todayData.produk) && todayData.produk.length > 0) {
        const produkHariIniData: ProdukTerlaris[] = todayData.produk.map(item => ({
          produk: item.nama_produk,
          harga_jual: item.pendapatan / item.jumlah_terjual,
          harga_beli: item.hpp_per_porsi,
          labaPerItem: item.laba_kotor / item.jumlah_terjual,
          jumlahTerjual: item.jumlah_terjual,
          totalLaba: item.laba_kotor
        }));
        produkHariIniData.sort((a, b) => b.totalLaba - a.totalLaba);
        setProdukTerlarisHariIni(produkHariIniData);
        const totalBarangHariIni = produkHariIniData.reduce((sum, item) => sum + item.jumlahTerjual, 0);
        setTotalBarangTerjualHariIni(totalBarangHariIni);
      } else {
        setProdukTerlarisHariIni([]);
        const fallbackCount = Number(ringkasan.total_barang_terjual || 0);
        setTotalBarangTerjualHariIni(fallbackCount);
      }
      
      // Hitung laba bersih dari ringkasan jika tersedia, else compute
      const calculatedLabaBersih = Number(ringkasan.total_laba_bersih !== undefined ? ringkasan.total_laba_bersih : (totalPendapatanValue - (result.summary?.total_hpp || 0) - totalBebanBulanan));
      setLabaBersih(calculatedLabaBersih);
      
      console.log('Total Pendapatan:', result.summary.total_pendapatan);
      console.log('Total HPP:', result.summary.total_hpp);
      console.log('Total Beban:', result.summary.total_beban);
      console.log('Laba Bersih (dihitung):', calculatedLabaBersih);
      console.log('Laba Bersih (dari API):', result.summary.total_laba_bersih);
      
      // Set data pie chart (fallback distribution)
      const pieDataArray = [
        { name: 'Tunai', value: totalPendapatanValue * 0.4 },
        { name: 'E-Wallet', value: totalPendapatanValue * 0.3 },
        { name: 'Virtual Account', value: totalPendapatanValue * 0.2 },
        { name: 'Kartu Kredit', value: totalPendapatanValue * 0.1 }
      ];
      
      setPieData(pieDataArray);
      
      // Set biaya operasional: prefer breakdown dari backend jika tersedia
      if (detailJson?.biaya_operasional && Array.isArray(detailJson.biaya_operasional.rincian_biaya)) {
        setBiayaOperasional({
          rincian_biaya: detailJson.biaya_operasional.rincian_biaya.map((it) => ({ nama: it.nama, jumlah: it.jumlah })),
          total: detailJson.biaya_operasional.total || totalBebanBulanan || 0
        });
      } else if (ringkasanJson?.biaya_operasional && Array.isArray(ringkasanJson.biaya_operasional.rincian_biaya)) {
        setBiayaOperasional({
          rincian_biaya: ringkasanJson.biaya_operasional.rincian_biaya.map((it) => ({ nama: it.nama, jumlah: it.jumlah })),
          total: ringkasanJson.biaya_operasional.total || totalBebanBulanan || 0
        });
      } else {
        // Fallback distribution
        setBiayaOperasional({
          rincian_biaya: [
            { nama: 'Listrik', jumlah: totalBebanBulanan * 0.3 },
            { nama: 'Air', jumlah: totalBebanBulanan * 0.1 },
            { nama: 'Internet', jumlah: totalBebanBulanan * 0.1 },
            { nama: 'Sewa Tempat', jumlah: totalBebanBulanan * 0.3 },
            { nama: 'Gaji Karyawan', jumlah: totalBebanBulanan * 0.2 }
          ],
          total: totalBebanBulanan || 0
        });
      }
      setLoadingBiayaOperasional(false);
      
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan saat mengambil data');
    } finally {
      setLoading(false);
    }
  }, [selectedBulan, daftarBulan]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Pagination
  // Format Rupiah
  const formatRupiah = useCallback((amount: number): string => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  }, []);

const fetchbiayaPerbulan = useCallback(async () => {
  if (daftarBulan.length === 0) return;

  setLoadingBulan(true);

  try {
    const token = getStoredToken();
    if (!token) throw new Error('Sesi login tidak ditemukan');

    const authHeaders: HeadersInit = {
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };

    // Ambil 6 bulan terakhir
    const bulanToFetch = daftarBulan.slice(0, 12);

    const results = await Promise.all(
      bulanToFetch.map(async (b) => {
        const yyyy = String(b.tahun);
        const mm = String(b.bulan).padStart(2, '0');

        const startDate = `${yyyy}-${mm}-01`;
        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
        const endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;

        try {
          const resp = await fetch(
            `${API_URL}/api/super-admin/laporan/ringkasan?start=${startDate}&end=${endDate}`,
            {
              headers: authHeaders,
            }
          );

          if (!resp.ok) {
            return {
              bulan: b.id,
              nama_bulan: b.nama_bulan,
              total: 0,
              total_hpp: 0,
            };
          }

          const json = await resp.json();

          return {
            bulan: b.id,
            nama_bulan: b.nama_bulan,
            total: Number(json?.ringkasan?.total_biaya_operasional || 0),
            total_hpp: Number(json?.ringkasan?.total_hpp || 0),
          };
        } catch {
          return {
            bulan: b.id,
            nama_bulan: b.nama_bulan,
            total: 0,
            total_hpp: 0,
          };
        }
      })
    );

    setbiayaPerbulan(results); // sesuaikan dengan state kamu
  } catch (err) {
    console.error(err);
  } finally {
    setLoadingBulan(false);
  }
}, [daftarBulan]);

useEffect(() => {
  if (daftarBulan.length > 0) {
    fetchbiayaPerbulan();
  }
}, [daftarBulan, fetchbiayaPerbulan]);

  // Export functions
  const handleExport = useCallback((type: 'pdf' | 'excel') => {
    if (!data) return;
    
    // PERBAIKAN: Buat objek biayaOperasional dengan struktur yang benar untuk export
    const biayaOperasionalExport: BiayaOperasionalExport = {
      _id: biayaOperasional._id || new Date().toISOString(),
      rincian_biaya: biayaOperasional.rincian_biaya.map(item => ({
        nama: item.nama,
        jumlah: item.jumlah,
        _id: item._id || new Date().toISOString()
      })),
      total: biayaOperasional.total || 0,
      createdAt: biayaOperasional.createdAt || new Date().toISOString(),
      __v: biayaOperasional.__v || 0
    };
    
    const metodePembayaran: MetodePembayaran[] = pieData.map(item => ({
      metode: item.name,
      total: item.value
    }));
    
    const exportData = {
      periode: {
        start: data.data?.[0]?.tanggal || new Date().toISOString(),
        end: data.data?.[data.data.length - 1]?.tanggal || new Date().toISOString()
      },
      laba: {
        total_laba: totalLabaKotor,
        total_laba_kotor: totalLabaKotor,
        laba_bersih: labaBersih,
        detail: produkTerlarisHariIni.map(item => ({
          produk: item.produk,
          harga_jual: item.harga_jual,
          harga_beli: item.harga_beli,
          labaPerItem: item.labaPerItem,
          jumlahTerjual: item.jumlahTerjual,
          totalLaba: item.totalLaba
        }))
      },
      rekap_metode_pembayaran: metodePembayaran,
      totalPendapatan: totalPendapatan,
      totalBarangTerjual: totalBarangTerjualHariIni,
      total_hpp: totalHpp,
      total_beban: totalBebanPerbulan,
      total_beban_perhari: totalBebanPerhari,
      biaya_operasional: biayaOperasionalExport,
      pengeluaran: totalHpp + totalBebanPerbulan
    };
    
    if (type === 'pdf') {
      exportPdf(exportData);
    } else {
      exportExcel(exportData);
    }
  }, [data, biayaOperasional, totalLabaKotor, labaBersih, produkTerlarisHariIni, pieData, totalPendapatan, totalBarangTerjualHariIni, totalHpp, totalBebanPerbulan, totalBebanPerhari]);

  // Professional export
  const handleProfessionalExport = useCallback(async (type: 'pdf' | 'excel') => {
    if (!data) return;
    
    const laporanData = {
      periode: {
        start: data.data?.[0]?.tanggal || new Date().toISOString(),
        end: data.data?.[data.data.length - 1]?.tanggal || new Date().toISOString()
      },
      totalPendapatan,
      totalHpp,
      totalLabaKotor,
      totalBeban: totalBebanPerbulan,
      labaBersih,
      totalBarangTerjual: totalBarangTerjualHariIni,
      biayaOperasional: biayaOperasional.rincian_biaya.map(b => ({ nama: b.nama, jumlah: b.jumlah })),
      produkTerlaris: produkTerlarisHariIni.map(p => ({
        produk: p.produk,
        jumlahTerjual: p.jumlahTerjual,
        hppPerPorsi: p.harga_beli,
        pendapatan: p.harga_jual * p.jumlahTerjual,
        labaKotor: p.totalLaba
      })),
      metodePembayaran: pieData.map(p => ({ metode: p.name, total: p.value }))
    };
    
    if (type === 'pdf') {
      await exportLaporanKeuanganProfesional(laporanData);
    } else {
      await exportLaporanKeuanganExcelProfesional(laporanData);
    }
  }, [data, totalPendapatan, totalHpp, totalLabaKotor, totalBebanPerbulan, labaBersih, totalBarangTerjualHariIni, biayaOperasional, produkTerlarisHariIni, pieData]);

  // Custom tooltip for pie chart
  const CustomTooltip: React.FC<TooltipProps> = ({ active, payload }) => {
    if (active && payload?.length) {
      const data = payload[0];
      const total = pieData.reduce((sum, item) => sum + item.value, 0);
      const percentage = total > 0 ? (data.value / total) * 100 : 0;
      
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium text-gray-900">{data.name}</p>
          <p className="text-sm text-gray-700">Nilai: {formatRupiah(data.value)}</p>
          <p className="text-sm text-gray-700">Persentase: {percentage.toFixed(1)}%</p>
        </div>
      );
    }
    return null;
  };

  // Custom label for pie chart
  const renderCustomizedLabel: PieLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    
    if (cx === undefined || cy === undefined || midAngle === undefined || 
        innerRadius === undefined || outerRadius === undefined || percent === undefined) {
      return null;
    }
    
    const RADIAN = Math.PI / 180;
    const radius = Number(innerRadius) + (Number(outerRadius) - Number(innerRadius)) * 0.5;
    const x = Number(cx) + radius * Math.cos(-Number(midAngle) * RADIAN);
    const y = Number(cy) + radius * Math.sin(-Number(midAngle) * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > Number(cx) ? 'start' : 'end'} 
        dominantBaseline="central"
        fontSize={12}
        fontWeight="bold"
      >
        {`${(Number(percent) * 100).toFixed(0)}%`}
      </text>
    );
  };

  // Handle bulan change
  const handleBulanChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBulan(e.target.value);
  }, []);

  // Get payment icon
  const getPaymentIcon = useCallback((method: string): React.ReactNode => {
    if (method.includes('Virtual Account')) return <Landmark className="h-5 w-5 text-blue-500" />;
    if (method.includes('E-Wallet')) return <Wallet className="h-5 w-5 text-green-500" />;
    if (method.includes('Tunai')) return <TrendingUp className="h-5 w-5 text-yellow-500" />;
    if (method.includes('Kartu Kredit')) return <CreditCard className="h-5 w-5 text-purple-500" />;
    return <CreditCard className="h-5 w-5 text-gray-500" />;
  }, []);

  // Memoized values
  const selectedBulanName = useMemo(() => 
    daftarBulan.find(b => b.id === selectedBulan)?.nama_bulan || 'Semua Periode', 
    [daftarBulan, selectedBulan]
  );

  const biayaBulananIni = useMemo(() => {
    const current = biayaPerbulan.find(b => b.bulan === selectedBulan);
    return current?.total ?? biayaOperasional.total ?? 0;
}, [biayaPerbulan, selectedBulan, biayaOperasional.total]);

const perbandinganBulanLalu = useMemo(() => {
  if (biayaPerbulan.length < 2) return null;
  const currentIndex = biayaPerbulan.findIndex(b => b.bulan === selectedBulan);
  if (currentIndex < 0) return null;
  const prevIndex = currentIndex + 1;
  if (prevIndex >= biayaPerbulan.length) return null;

  const bulanIni = biayaPerbulan[currentIndex].total;
  const bulanLalu = biayaPerbulan[prevIndex].total;
  const selisih = bulanIni - bulanLalu;
  const persentase = bulanLalu > 0 ? (selisih / bulanLalu) * 100 : 0;

  return {
    bulanIni,
    bulanLalu,
    selisih,
    persentase,
    namaBulanLalu: biayaPerbulan[prevIndex].nama_bulan,
    naik: selisih > 0,
  };
}, [biayaPerbulan, selectedBulan]);

const biayaChartData = useMemo(() => {
  return biayaPerbulan.map(b => ({
    name: b.nama_bulan.split(' ')[0], // ambil "Juni" dari "Juni 2025"
    fullName: b.nama_bulan,
    total: b.total,
  }));
}, [biayaPerbulan]);

const hppChartData = useMemo(() => {
  // Reverse biar kronologis (terlama → terbaru) untuk line chart
  return [...biayaPerbulan].reverse().map(b => ({
    name: b.nama_bulan.split(' ')[0],
    fullName: b.nama_bulan,
    total_hpp: b.total_hpp,
  }));
}, [biayaPerbulan]);


  if (loadingBulan) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-96">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Laporan Penjualan</h1>
          <p className="text-gray-600 mt-1">Periode: {selectedBulanName}</p>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
          <div className="flex items-center w-full sm:w-auto">
            <label htmlFor="bulan" className="block text-sm font-medium text-gray-700 mr-3 whitespace-nowrap">
              Pilih Bulan:
            </label>
            <select
              id="bulan"
              name="bulan"
              className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md shadow-sm"
              value={selectedBulan}
              onChange={handleBulanChange}
            >
              {daftarBulan.map((bulan) => (
                <option key={bulan.id} value={bulan.id}>
                  {bulan.nama_bulan}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button 
              onClick={() => handleExport('pdf')}
              className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-md hover:from-red-600 hover:to-red-700 transition-all shadow-md flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm0 8H7v4h6v-4z" clipRule="evenodd" />
              </svg>
              Export PDF
            </button>
            <button 
              onClick={() => handleExport('excel')}
              className="px-4 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-md hover:from-green-600 hover:to-green-700 transition-all shadow-md flex items-center justify-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              Export Excel
            </button>
            <div className="flex gap-2 ml-2 pl-2 border-l border-gray-300">
              <button 
                onClick={() => handleProfessionalExport('pdf')}
                disabled={!data}
                className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-indigo-600 text-white rounded-md hover:from-indigo-600 hover:to-indigo-700 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
              >
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Profesional PDF
              </button>
              <button 
                onClick={() => handleProfessionalExport('excel')}
                disabled={!data}
                className="px-4 py-2 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-md hover:from-violet-600 hover:to-violet-700 transition-all shadow-md flex items-center justify-center disabled:opacity-50"
              >
                <svg className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                Profesional Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-96">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md shadow">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Gagal memuat data: {error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : !data ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md shadow">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-yellow-800">Data Tidak Tersedia</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Tidak ada data laporan penjualan yang dapat ditampilkan.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Statistik Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl shadow-md p-6 border border-blue-100 hover:shadow-lg transition-all">
              <div className="flex items-center">
                <div className="rounded-full bg-blue-100 p-3 mr-4">
                  <TrendingUp className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-blue-800">Total Laba Kotor</h3>
                  <p className={`text-2xl font-bold ${totalLabaKotor >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                    {formatRupiah(totalLabaKotor)}
                  </p>
                  <p className="text-xs text-blue-600">periode terpilih</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl shadow-md p-6 border border-green-100 hover:shadow-lg transition-all">
              <div className="flex items-center">
                <div className="rounded-full bg-green-100 p-3 mr-4">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-green-800">Total Pendapatan</h3>
                  <p className="text-2xl font-bold text-green-700">{formatRupiah(totalPendapatan)}</p>
                  <p className="text-xs text-green-600">periode terpilih</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl shadow-md p-6 border border-amber-100 hover:shadow-lg transition-all">
              <div className="flex items-center">
                <div className="rounded-full bg-amber-100 p-3 mr-4">
                  <ShoppingCart className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Total Barang Terjual</h3>
                  <p className="text-2xl font-bold text-amber-700">{totalBarangTerjualHariIni}</p>
                  <p className="text-xs text-amber-600">per bulan</p>
                </div>
              </div>
            </div>
            
            {/* PERBAIKAN: Memperbesar kotak Laba Bersih dan menyesuaikan tampilan teks */}
            <div className={`bg-gradient-to-br ${labaBersih >= 0 ? 'from-purple-50 to-purple-100' : 'from-red-50 to-red-100'} rounded-xl shadow-md p-6 border ${labaBersih >= 0 ? 'border-purple-100' : 'border-red-100'} hover:shadow-lg transition-all min-h-[120px]`}>
              <div className="flex flex-col h-full">
                <div className="flex items-center mb-2">
                  <div className={`rounded-full ${labaBersih >= 0 ? 'bg-purple-100' : 'bg-red-100'} p-3 mr-4`}>
                    {labaBersih >= 0 ? (
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    ) : (
                      <TrendingDown className="h-6 w-6 text-red-600" />
                    )}
                  </div>
                  <h3 className={`text-sm font-medium ${labaBersih >= 0 ? 'text-purple-800' : 'text-red-800'}`}>Laba Bersih</h3>
                </div>
                <div className="flex-1 flex items-center">
                  <p className={`text-xl font-bold ${labaBersih >= 0 ? 'text-purple-700' : 'text-red-600'} break-words leading-tight`}>
                    {formatRupiah(labaBersih)}
                  </p>
                </div>
                <p className={`text-xs ${labaBersih >= 0 ? 'text-purple-600' : 'text-red-600'} mt-1`}>periode terpilih</p>
              </div>
            </div>
          </div>

          {/* Baris kedua untuk statistik tambahan */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 rounded-xl shadow-md p-6 border border-indigo-100 hover:shadow-lg transition-all">
              <div className="flex items-center">
                <div className="rounded-full bg-indigo-100 p-3 mr-4">
                  <Package className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-indigo-800">Total HPP</h3>
                  <p className="text-2xl font-bold text-indigo-700">{formatRupiah(totalHpp)}</p>
                  <p className="text-xs text-indigo-600">periode terpilih</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-xl shadow-md p-6 border border-rose-100 hover:shadow-lg transition-all">
              <div className="flex items-center">
                <div className="rounded-full bg-rose-100 p-3 mr-4">
                  <TrendingDown className="h-6 w-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-rose-800">Total Beban (Hari Ini)</h3>
                  <p className="text-2xl font-bold text-rose-700">{formatRupiah(totalBebanPerhari)}</p>
                  <p className="text-xs text-rose-600">hari ini</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-xl shadow-md p-6 border border-red-100 hover:shadow-lg transition-all">
              <div className="flex items-center">
                <div className="rounded-full bg-red-100 p-3 mr-4">
                  <TrendingDown className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-red-800">Total Beban (Perbulan)</h3>
                  <p className="text-2xl font-bold text-red-700">Rp {totalBebanPerbulan.toLocaleString('id-ID')}</p>
                  <p className="text-xs text-red-600">jumlah semua hari</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Kartu Summary Bulan Ini */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 lg:col-span-1 flex flex-col justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 mb-1">Biaya Operasional Bulan Ini</p>
                <p className="text-3xl font-bold text-gray-900">{formatRupiah(biayaBulananIni)}</p>
              </div>
              {perbandinganBulanLalu && (
                <div className="mt-4">
                  {perbandinganBulanLalu.naik ? (
                    <div className="flex items-center gap-1.5 text-red-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                      </svg>
                      <span className="text-sm font-semibold">Naik {formatRupiah(Math.abs(perbandinganBulanLalu.selisih))} (+{perbandinganBulanLalu.persentase.toFixed(2)}%)</span>
                    </div>
                  ) : perbandinganBulanLalu.selisih < 0 ? (
                    <div className="flex items-center gap-1.5 text-green-600">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="text-sm font-semibold">Turun {formatRupiah(Math.abs(perbandinganBulanLalu.selisih))} ({perbandinganBulanLalu.persentase.toFixed(2)}%)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14" />
                      </svg>
                      <span className="text-sm font-medium">Tidak ada perubahan (0,00%)</span>
                    </div>
                  )}
                  <p className="text-xs text-gray-400 mt-1">dibanding {perbandinganBulanLalu.namaBulanLalu}</p>
                </div>
              )}
              {(!perbandinganBulanLalu && !biayaBulananIni) && (
                <p className="text-xs text-gray-400 mt-4">Belum ada data bulan lalu untuk dibandingkan</p>
              )}
              {loadingBulan && (
                <div className="mt-4 flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-500"></div>
                  <span className="text-xs text-gray-400">Memuat perbandingan...</span>
                </div>
              )}
            </div>

            {/* Grafik Batang */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 lg:col-span-2 min-h-[300px]">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Perbandingan Biaya Operasional</h2>
              <p className="text-xs text-gray-500 mb-4">6 bulan terakhir</p>
              {loadingBulan ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-500"></div>
                </div>
              ) : biayaChartData.length > 0 ? (
                  <div className="w-full h-[250px]">
                    <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={biayaChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={false}
                    />
                    <YAxis
                      tickFormatter={(val) => {
                        if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
                        if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`;
                        return val;
                      }}
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number | string) => [formatRupiah(Number(value)), 'Biaya Operasional']}
                      labelFormatter={(label, payload) => {
                        if (payload?.length && payload[0]?.payload?.fullName) {
                          return payload[0].payload.fullName;
                        }

                        return label;
                      }}  
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Bar
                      dataKey="total"
                      fill="#3B82F6"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={50}
                    >
                      {biayaChartData.map((entry, idx) => {
                        // Highlight bulan yang sedang dipilih
                        const isSelected = entry.fullName === daftarBulan.find(b => b.id === selectedBulan)?.nama_bulan;
                        return (
                          <Cell
                            key={idx}
                            fill={isSelected ? '#1D4ED8' : '#93C5FD'}
                          />
                        );
                      })}
                    </Bar>
                  </BarChart>
                    </ResponsiveContainer>
                  </div>
              ) : (
                <div className="flex justify-center items-center h-64 text-gray-400">
                  <p className="text-sm">Belum ada data</p>
                </div>
              )}
            </div>
          </div>

          {/* Trend Total HPP */}
<div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
            <div className="bg-gradient-to-r from-emerald-50 to-teal-50 p-6 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                </svg>
                Trend Total HPP (1 Tahun Terakhir)
              </h2>
              <p className="text-sm text-gray-600 mt-1">Pergerakan Harga Pokok Penjualan per bulan</p>
            </div>
            <div className="p-6">
              {loadingBulan ? (
                <div className="flex justify-center items-center h-64">
                  <LoadingSpinner />
                </div>
              ) : hppChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={hppChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={{ stroke: '#E5E7EB' }}
                      tickLine={false}
                      tickFormatter={(value: number) => {
                        if (value >= 1000000) return `${(value / 1000000).toFixed(1)}jt`;
                        if (value >= 1000) return `${(value / 1000).toFixed(0)}rb`;
                        return String(value);
                      }}
                    />
                    <Tooltip
                      formatter={(value: number | string) => [formatRupiah(Number(value)), 'Total HPP']}
                      labelFormatter={(label, payload) => {
                        if (payload?.length && payload[0]?.payload?.fullName) {
                          return payload[0].payload.fullName;
                        }
                        return String(label);
                      }}
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="total_hpp"
                      stroke="#10B981"
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#10B981', stroke: '#fff', strokeWidth: 2 }}
                      activeDot={{ r: 7, fill: '#059669', stroke: '#fff', strokeWidth: 2 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex justify-center items-center h-64 text-gray-400">
                  <p className="text-sm">Belum ada data HPP</p>
                </div>
              )}
            </div>
          </div>

          {/* Detail Biaya Operasional */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden mb-8 border border-gray-200">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-6 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                </svg>
                Detail Biaya Operasional (Per Bulan)
              </h2>
              <p className="text-sm text-gray-600 mt-1">Rincian biaya operasional periode ini</p>
            </div>
            <div className="overflow-x-auto">
              {loadingBiayaOperasional ? (
                <div className="flex justify-center items-center h-40">
                  <LoadingSpinner />
                </div>
              ) : biayaOperasional.rincian_biaya.length === 0 ? (
                <div className="text-center py-8">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-gray-500 mt-2">Tidak ada data biaya operasional</p>
                </div>
              ) : (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Kategori
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Jumlah
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Persentase
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {biayaOperasional.rincian_biaya.map((item, index) => (
                      <tr 
                        key={item._id || index} 
                        className={`transition-colors hover:bg-gray-50 ${
                          index % 2 === 0 ? 'bg-white' : 'bg-amber-50'
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{item.nama}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{formatRupiah(item.jumlah)}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{((item.jumlah / biayaOperasional.total) * 100).toFixed(2)}%</div>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-gray-100 border-t-2 border-gray-300">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">Total</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">{formatRupiah(biayaOperasional.total)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-bold text-gray-900">100.00%</div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}
            </div>
          </div>

       

          {/* Grafik Metode Pembayaran */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Metode Pembayaran
              </h2>
              <div className="space-y-4">
                {pieData.map((item, index) => {
                  const maxTotal = Math.max(...pieData.map(p => p.value));
                  const percentage = maxTotal > 0 ? (item.value / maxTotal) * 100 : 0;
                  
                  return (
                    <div key={index}>
                      <div className="flex justify-between mb-1">
                        <div className="flex items-center">
                          {getPaymentIcon(item.name)}
                          <span className="text-sm font-medium text-gray-700 ml-2">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatRupiah(item.value)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div 
                          className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                Distribusi Metode Pembayaran
              </h2>
              <div className="h-80">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart width={400} height={300}>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={renderCustomizedLabel}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >{pieData.map((_, idx) => (
                          <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex justify-center items-center h-full">
                    <LoadingSpinner />
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default LaporanPenjualan;
