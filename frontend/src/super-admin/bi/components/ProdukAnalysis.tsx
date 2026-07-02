import { useCallback, useEffect, useState } from 'react';
import { getProduk, generateAiProduk } from '../biApi';
import { StatCard, NarasiBox, Skeleton, EmptyState } from './SharedComponents';
import { currentMonthValue, monthToRange } from '../utils/dateUtils';

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
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 p-6 shadow-xl">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Business Intelligence - Produk</h2>
            <p className="mt-0.5 text-sm text-white">Analisis performa produk dan rekomendasi</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => void handleGenerateAiAnalysis()} disabled={aiLoading || !data?.data} className="rounded-xl bg-white/10 px-4 py-2 text-white">{aiLoading ? 'Menganalisis...' : 'Analisis AI'}</button>
            <input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="rounded-xl border px-3 py-2" />
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
