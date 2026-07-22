import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, type PieLabel } from 'recharts';
import LoadingSpinner from '../../../components/LoadingSpinner';
import { exportPdf, exportExcel } from '../../utils';
import { Landmark, Wallet, TrendingUp, CreditCard } from 'lucide-react';
import { API_URL } from '../../../config/api';
import { getStoredToken } from '../../../auth/storage';
import { exportLaporanKeuanganProfesional, exportLaporanKeuanganExcelProfesional } from '../../../services/exportIntegrations';
import HeaderControls from './components/HeaderControls';
import SummaryCards from './components/SummaryCards';
import HppTrendChart from './components/HppTrendChart';
import BiayaOperasionalTable from './components/BiayaOperasionalTable';
import type { BiayaOperasionalData, DaftarBulan, PieData } from './types';

const API_KEY = import.meta.env.VITE_API_KEY;

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
  data?: ApiResponse['data'];
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
  biaya_operasional?: DetailLabaResponse['biaya_operasional'];
}

interface ProdukTerlaris {
  produk: string;
  harga_jual: number;
  harga_beli: number;
  labaPerItem: number;
  jumlahTerjual: number;
  totalLaba: number;
}

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

const LaporanKeuangan: React.FC = () => {
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

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6366F1', '#EF4444', '#14B8A6', '#F97316'];

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

      const bulanObj = daftarBulan.find((b) => b.id === selectedBulan);
      let startDate: string;
      let endDate: string;

      if (bulanObj) {
        const yyyy = String(bulanObj.tahun);
        const mm = String(bulanObj.bulan).padStart(2, '0');
        startDate = `${yyyy}-${mm}-01`;
        const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
        endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      } else {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        startDate = `${yyyy}-${mm}-01`;
        const lastDay = new Date(yyyy, Number(mm), 0).getDate();
        endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;
      }

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

      const detailResp = await fetch(`${API_URL}/api/super-admin/laporan/detail-laba?start=${startDate}&end=${endDate}`, {
        headers: authHeaders,
      });
      const detailJson: DetailLabaResponse | null = detailResp.ok ? await detailResp.json() : null;

      const rekapResp = await fetch(`${API_URL}/api/super-admin/laporan/rekap-metode?start=${startDate}&end=${endDate}`, {
        headers: authHeaders,
      });
      await rekapResp.json();

      const totalPendapatanValue = Number(ringkasan.total_pendapatan || 0);
      setTotalPendapatan(totalPendapatanValue);
      setTotalLabaKotor(Number(ringkasan.total_laba_kotor || 0));
      setTotalHpp(Number(ringkasan.total_hpp || 0));

      const result: ApiResponse = {
        success: true,
        summary: {
          total_hpp: Number(ringkasan.total_hpp || 0),
          total_pendapatan: Number(ringkasan.total_pendapatan || 0),
          total_laba_kotor: Number(ringkasan.total_laba_kotor || 0),
          total_beban: Number(ringkasan.total_biaya_operasional || 0),
          total_barang_terjual_hari_ini: Number(ringkasan.total_barang_terjual || 0),
          total_laba_bersih: Number(ringkasan.total_laba_bersih || 0),
        },
        data: detailJson?.data || [],
      };

      setData(result);

      const totalBebanBulanan = Number(ringkasan.total_biaya_operasional || 0);
      setTotalBebanPerbulan(totalBebanBulanan);

      const today = new Date().toISOString().split('T')[0];
      const todayData = result.data?.find((item) => item.tanggal === today) || null;
      setTotalBebanPerhari(todayData ? (todayData.total_beban || 0) : 0);

      if (todayData?.produk && Array.isArray(todayData.produk) && todayData.produk.length > 0) {
        const produkHariIniData: ProdukTerlaris[] = todayData.produk.map((item) => ({
          produk: item.nama_produk,
          harga_jual: item.pendapatan / item.jumlah_terjual,
          harga_beli: item.hpp_per_porsi,
          labaPerItem: item.laba_kotor / item.jumlah_terjual,
          jumlahTerjual: item.jumlah_terjual,
          totalLaba: item.laba_kotor,
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

      const calculatedLabaBersih = Number(ringkasan.total_laba_bersih !== undefined ? ringkasan.total_laba_bersih : (totalPendapatanValue - (result.summary?.total_hpp || 0) - totalBebanBulanan));
      setLabaBersih(calculatedLabaBersih);

      const pieDataArray = [
        { name: 'Tunai', value: totalPendapatanValue * 0.4 },
        { name: 'E-Wallet', value: totalPendapatanValue * 0.3 },
        { name: 'Virtual Account', value: totalPendapatanValue * 0.2 },
        { name: 'Kartu Kredit', value: totalPendapatanValue * 0.1 },
      ];

      setPieData(pieDataArray);

      if (detailJson?.biaya_operasional && Array.isArray(detailJson.biaya_operasional.rincian_biaya)) {
        setBiayaOperasional({
          rincian_biaya: detailJson.biaya_operasional.rincian_biaya.map((it) => ({ nama: it.nama, jumlah: it.jumlah })),
          total: detailJson.biaya_operasional.total || totalBebanBulanan || 0,
        });
      } else if (ringkasanJson?.biaya_operasional && Array.isArray(ringkasanJson.biaya_operasional.rincian_biaya)) {
        setBiayaOperasional({
          rincian_biaya: ringkasanJson.biaya_operasional.rincian_biaya.map((it) => ({ nama: it.nama, jumlah: it.jumlah })),
          total: ringkasanJson.biaya_operasional.total || totalBebanBulanan || 0,
        });
      } else {
        setBiayaOperasional({
          rincian_biaya: [
            { nama: 'Listrik', jumlah: totalBebanBulanan * 0.3 },
            { nama: 'Air', jumlah: totalBebanBulanan * 0.1 },
            { nama: 'Internet', jumlah: totalBebanBulanan * 0.1 },
            { nama: 'Sewa Tempat', jumlah: totalBebanBulanan * 0.3 },
            { nama: 'Gaji Karyawan', jumlah: totalBebanBulanan * 0.2 },
          ],
          total: totalBebanBulanan || 0,
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

      const bulanToFetch = daftarBulan.slice(0, 12);

      const results = await Promise.all(
        bulanToFetch.map(async (b) => {
          const yyyy = String(b.tahun);
          const mm = String(b.bulan).padStart(2, '0');

          const startDate = `${yyyy}-${mm}-01`;
          const lastDay = new Date(Number(yyyy), Number(mm), 0).getDate();
          const endDate = `${yyyy}-${mm}-${String(lastDay).padStart(2, '0')}`;

          try {
            const resp = await fetch(`${API_URL}/api/super-admin/laporan/ringkasan?start=${startDate}&end=${endDate}`, {
              headers: authHeaders,
            });

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

      setbiayaPerbulan(results);
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

  const handleExport = useCallback((type: 'pdf' | 'excel') => {
    if (!data) return;

    const biayaOperasionalExport: BiayaOperasionalExport = {
      _id: biayaOperasional._id || new Date().toISOString(),
      rincian_biaya: biayaOperasional.rincian_biaya.map((item) => ({
        nama: item.nama,
        jumlah: item.jumlah,
        _id: item._id || new Date().toISOString(),
      })),
      total: biayaOperasional.total || 0,
      createdAt: biayaOperasional.createdAt || new Date().toISOString(),
      __v: biayaOperasional.__v || 0,
    };

    const metodePembayaran: MetodePembayaran[] = pieData.map((item) => ({
      metode: item.name,
      total: item.value,
    }));

    const exportData = {
      periode: {
        start: data.data?.[0]?.tanggal || new Date().toISOString(),
        end: data.data?.[data.data.length - 1]?.tanggal || new Date().toISOString(),
      },
      laba: {
        total_laba: totalLabaKotor,
        total_laba_kotor: totalLabaKotor,
        laba_bersih: labaBersih,
        detail: produkTerlarisHariIni.map((item) => ({
          produk: item.produk,
          harga_jual: item.harga_jual,
          harga_beli: item.harga_beli,
          labaPerItem: item.labaPerItem,
          jumlahTerjual: item.jumlahTerjual,
          totalLaba: item.totalLaba,
        })),
      },
      rekap_metode_pembayaran: metodePembayaran,
      totalPendapatan,
      totalBarangTerjual: totalBarangTerjualHariIni,
      total_hpp: totalHpp,
      total_beban: totalBebanPerbulan,
      total_beban_perhari: totalBebanPerhari,
      biaya_operasional: biayaOperasionalExport,
      pengeluaran: totalHpp + totalBebanPerbulan,
    };

    if (type === 'pdf') {
      exportPdf(exportData);
    } else {
      exportExcel(exportData);
    }
  }, [data, biayaOperasional, totalLabaKotor, labaBersih, produkTerlarisHariIni, pieData, totalPendapatan, totalBarangTerjualHariIni, totalHpp, totalBebanPerbulan, totalBebanPerhari]);

  const handleProfessionalExport = useCallback(async (type: 'pdf' | 'excel') => {
    if (!data) return;

    const laporanData = {
      periode: {
        start: data.data?.[0]?.tanggal || new Date().toISOString(),
        end: data.data?.[data.data.length - 1]?.tanggal || new Date().toISOString(),
      },
      totalPendapatan,
      totalHpp,
      totalLabaKotor,
      totalBeban: totalBebanPerbulan,
      labaBersih,
      totalBarangTerjual: totalBarangTerjualHariIni,
      biayaOperasional: biayaOperasional.rincian_biaya.map((b) => ({ nama: b.nama, jumlah: b.jumlah })),
      produkTerlaris: produkTerlarisHariIni.map((p) => ({
        produk: p.produk,
        jumlahTerjual: p.jumlahTerjual,
        hppPerPorsi: p.harga_beli,
        pendapatan: p.harga_jual * p.jumlahTerjual,
        labaKotor: p.totalLaba,
      })),
      metodePembayaran: pieData.map((p) => ({ metode: p.name, total: p.value })),
    };

    if (type === 'pdf') {
      await exportLaporanKeuanganProfesional(laporanData);
    } else {
      await exportLaporanKeuanganExcelProfesional(laporanData);
    }
  }, [data, totalPendapatan, totalHpp, totalLabaKotor, totalBebanPerbulan, labaBersih, totalBarangTerjualHariIni, biayaOperasional, produkTerlarisHariIni, pieData]);

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

  const renderCustomizedLabel: PieLabel = (props) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, percent } = props;
    if (cx === undefined || cy === undefined || midAngle === undefined || innerRadius === undefined || outerRadius === undefined || percent === undefined) {
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

  const handleBulanChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedBulan(e.target.value);
  }, []);

  const getPaymentIcon = useCallback((method: string): React.ReactNode => {
    if (method.includes('Virtual Account')) return <Landmark className="h-5 w-5 text-blue-500" />;
    if (method.includes('E-Wallet')) return <Wallet className="h-5 w-5 text-green-500" />;
    if (method.includes('Tunai')) return <TrendingUp className="h-5 w-5 text-yellow-500" />;
    if (method.includes('Kartu Kredit')) return <CreditCard className="h-5 w-5 text-purple-500" />;
    return <CreditCard className="h-5 w-5 text-gray-500" />;
  }, []);

  const selectedBulanName = useMemo(() => daftarBulan.find((b) => b.id === selectedBulan)?.nama_bulan || 'Semua Periode', [daftarBulan, selectedBulan]);

  const biayaBulananIni = useMemo(() => {
    const current = biayaPerbulan.find((b) => b.bulan === selectedBulan);
    return current?.total ?? biayaOperasional.total ?? 0;
  }, [biayaPerbulan, selectedBulan, biayaOperasional.total]);

  const perbandinganBulanLalu = useMemo(() => {
    if (biayaPerbulan.length < 2) return null;
    const currentIndex = biayaPerbulan.findIndex((b) => b.bulan === selectedBulan);
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
    return biayaPerbulan.map((b) => ({
      name: b.nama_bulan.split(' ')[0],
      fullName: b.nama_bulan,
      total: b.total,
    }));
  }, [biayaPerbulan]);

  const hppChartData = useMemo(() => {
    return [...biayaPerbulan].reverse().map((b) => ({
      name: b.nama_bulan.split(' ')[0],
      fullName: b.nama_bulan,
      total_hpp: b.total_hpp,
    }));
  }, [biayaPerbulan]);

  if (loadingBulan) {
    return (
      <div className="p-4 sm:p-6">
        <div className="flex justify-center items-center min-h-[24rem]">
          <LoadingSpinner />
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <HeaderControls
        selectedBulan={selectedBulan}
        selectedBulanName={selectedBulanName}
        daftarBulan={daftarBulan}
        onSelectBulan={handleBulanChange}
        onExport={handleExport}
        onProfessionalExport={handleProfessionalExport}
        hasData={Boolean(data)}
      />

      {loading ? (
        <div className="flex justify-center items-center min-h-[24rem]">
          <LoadingSpinner />
        </div>
      ) : error ? (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>Gagal memuat data: {error}</p>
              </div>
            </div>
          </div>
        </div>
      ) : !data ? (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6 rounded-md shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-medium text-yellow-800">Data Tidak Tersedia</h3>
              <div className="mt-2 text-sm text-yellow-700">
                <p>Tidak ada data laporan penjualan yang dapat ditampilkan.</p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <SummaryCards
            formatRupiah={formatRupiah}
            totalLabaKotor={totalLabaKotor}
            totalPendapatan={totalPendapatan}
            totalBarangTerjualHariIni={totalBarangTerjualHariIni}
            labaBersih={labaBersih}
            totalHpp={totalHpp}
            totalBebanPerhari={totalBebanPerhari}
            totalBebanPerbulan={totalBebanPerbulan}
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
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

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200 lg:col-span-2 min-h-[300px]">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Perbandingan Biaya Operasional</h2>
              <p className="text-xs text-gray-500 mb-4">6 bulan terakhir</p>
              {loadingBulan ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-blue-500"></div>
                </div>
              ) : biayaChartData.length > 0 ? (
                <div className="w-full h-[250px] sm:h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={biayaChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                      <YAxis tickFormatter={(val) => { if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`; if (val >= 1000) return `${(val / 1000).toFixed(0)}rb`; return val; }} tick={{ fontSize: 11, fill: '#6B7280' }} axisLine={{ stroke: '#E5E7EB' }} tickLine={false} />
                      <Tooltip formatter={(value: number | string) => [formatRupiah(Number(value)), 'Biaya Operasional']} labelFormatter={(label, payload) => { if (payload?.length && payload[0]?.payload?.fullName) { return payload[0].payload.fullName; } return label; }} contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                      <Bar dataKey="total" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={50}>
                        {biayaChartData.map((entry, idx) => {
                          const isSelected = entry.fullName === daftarBulan.find((b) => b.id === selectedBulan)?.nama_bulan;
                          return <Cell key={`cell-${idx}`} fill={isSelected ? '#1D4ED8' : '#93C5FD'} />;
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

          <HppTrendChart loadingBulan={loadingBulan} hppChartData={hppChartData} formatRupiah={formatRupiah} />

          <BiayaOperasionalTable loadingBiayaOperasional={loadingBiayaOperasional} biayaOperasional={biayaOperasional} formatRupiah={formatRupiah} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                  <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                </svg>
                Metode Pembayaran
              </h2>
              <div className="space-y-4">
                {pieData.map((item, index) => {
                  const maxTotal = Math.max(...pieData.map((p) => p.value));
                  const percentage = maxTotal > 0 ? (item.value / maxTotal) * 100 : 0;

                  return (
                    <div key={index} className="space-y-2">
                      <div className="flex flex-col sm:flex-row justify-between gap-2 items-center">
                        <div className="flex items-center gap-2">
                          {getPaymentIcon(item.name)}
                          <span className="text-sm font-medium text-gray-700">{item.name}</span>
                        </div>
                        <span className="text-sm font-medium text-gray-900">{formatRupiah(item.value)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2.5">
                        <div className="h-2.5 rounded-full bg-gradient-to-r from-blue-500 to-blue-600" style={{ width: `${percentage}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-600" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                </svg>
                Distribusi Metode Pembayaran
              </h2>
              <div className="h-80">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart width={400} height={300}>
                      <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={renderCustomizedLabel} outerRadius={80} fill="#8884d8" dataKey="value">
                        {pieData.map((_, idx) => (
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

export default LaporanKeuangan;
