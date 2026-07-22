import { useCallback, useEffect, useState } from 'react';
import { getProduk, generateAiProduk } from '../biApi';
import { StatCard, NarasiBox, Skeleton, EmptyState } from './SharedComponents';
import { currentMonthValue, monthToRange } from '../utils/dateUtils';
import { ShoppingCart, SparklesIcon } from 'lucide-react';

type ProdukApiResponse = {
  data?: any;
};

type AiProdukResponse = {
  status?: string;
  score?: number;
  insight?: string[];
  warning?: string[];
  rekomendasi?: string[];
  narasi?: string;
};

function formatMonthDisplay(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function ProdukAnalysis() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window === 'undefined') return currentMonthValue();
    return window.localStorage.getItem('bi-selected-month-produk') || currentMonthValue();
  });

  const [data, setData] = useState<ProdukApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiProdukResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = useCallback(async (monthValue: string) => {
    setLoading(true);
    setError(null);
    setAiSummary(null);
    setAiError(null);

    try {
      const { start, end } = monthToRange(monthValue);
      const payload = await getProduk(start, end);
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat data produk.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateAiAnalysis = useCallback(async () => {
    if (!data?.data) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const payload = await generateAiProduk({ produk: data.data });
      setAiSummary(payload);
    } catch (err) {
      setAiSummary(null);
      setAiError(err instanceof Error ? err.message : 'Gagal menghasilkan analisis produk.');
    } finally {
      setAiLoading(false);
    }
  }, [data?.data]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('bi-selected-month-produk', selectedMonth);
    void loadData(selectedMonth);
  }, [loadData, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* HEADER - SUDAH DIPERBAIKI SESUAI REFERENSI */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-6 shadow-xl">
        {/* Background pattern sama seperti referensi */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        
        <div className="relative z-10">
          {/* Flex Utama: Kolom di Mobile, Baris di Desktop */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            
            {/* Kiri: Icon + Judul + Bulan (Dibungkus rapi) */}
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <ShoppingCart className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Analisis Produk</h2>
                <p className="mt-0.5 text-sm text-white">
                  {formatMonthDisplay(selectedMonth)}
                </p>
              </div>
            </div>

            {/* Kanan: Tombol AI + Input Bulan */}
            <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:w-auto">
              <button
                type="button"
                onClick={() => void handleGenerateAiAnalysis()}
                disabled={aiLoading || !data?.data}
                className="group w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-xl border border-blue-500 bg-blue-500 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-blue-500/50 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SparklesIcon className={`h-4 w-4 ${aiLoading ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                <span>{aiLoading ? 'Menganalisis...' : 'Analisis AI'}</span>
              </button>
              
              <div className="relative w-full sm:w-auto">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  /* Class input sudah dibenahi, bukan class tombol lagi */
                  className="w-full rounded-xl border border-slate-600 bg-slate-800/50 py-2.5 pl-10 pr-3 text-sm text-slate-200 backdrop-blur-sm transition-colors hover:border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
                />
              </div>
            </div>

          </div>
        </div>
      </div>

      {loading && <div className="rounded-2xl border bg-white p-6"><Skeleton rows={6} /></div>}

      {!loading && error && <div className="rounded-2xl border p-6"><NarasiBox text={error} type="danger" /></div>}

      {!loading && data?.data && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Produk" value={String(data.data.total_produk)} />
            <StatCard label="Item Terjual" value={String(data.data.total_produk_terjual)} />
            <StatCard label="Produk Stagnan" value={String(data.data.produk_stagnan)} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-4">
              <h3 className="font-semibold mb-2">Top Selling</h3>
              <ul className="space-y-2">
                {data.data.top_selling.map((p: any) => (
                  <li key={p.kode_barang} className="flex justify-between">
                    <div>{p.nama_barang} <span className="text-xs text-slate-500">({p.kategori})</span></div>
                    <div className="text-sm font-medium">{p.jumlah_terjual} pcs</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border p-4">
              <h3 className="font-semibold mb-2">Bottom Selling</h3>
              <ul className="space-y-2">
                {data.data.bottom_selling.map((p: any) => (
                  <li key={p.kode_barang} className="flex justify-between">
                    <div>{p.nama_barang} <span className="text-xs text-slate-500">({p.kategori})</span></div>
                    <div className="text-sm font-medium">{p.jumlah_terjual} pcs</div>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border p-4">
            <h3 className="font-semibold mb-2">Narasi AI</h3>
            {aiLoading && <Skeleton rows={3} />}
            {aiError && <NarasiBox text={aiError} type="danger" />}
            {aiSummary && <NarasiBox text={aiSummary.narasi || ''} type="info" />}
          </div>
        </div>
      )}

      {!loading && !data?.data && <EmptyState message="Belum ada data produk untuk periode ini." />}
    </div>
  );
}