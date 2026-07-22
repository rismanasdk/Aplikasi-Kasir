import { useCallback, useEffect, useState } from 'react';
import { generateAiForecast, getForecast } from '../biApi';
import { StatCard, NarasiBox, Skeleton, EmptyState } from './SharedComponents';
import { currentMonthValue, monthToRange } from '../utils/dateUtils';
import { TrendingUpDown } from 'lucide-react';


type ForecastData = {
  histori: Array<{ tanggal: string; total_penjualan: number }>;
  produk: Array<{ nama: string; total_qty_terjual: number; stok_sekarang?: number }>;
};

type AiForecastResponse = {
  status?: string;
  insight?: string[];
  rekomendasi?: string[];
  narasi?: string;
};

const hasMeaningfulData = (data: ForecastData | null) => {
  if (!data) return false;
  return Boolean(data.histori && data.histori.length > 0);
};

function SparklesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3z" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
    </svg>
  );
}

function formatMonthDisplay(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function ForecastAnalysis() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window === 'undefined') {
      return currentMonthValue();
    }
    return window.localStorage.getItem('bi-selected-month-forecast') || currentMonthValue();
  });
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiForecastResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = useCallback(async (monthValue: string) => {
    setLoading(true);
    setError(null);
    setAiSummary(null);
    setAiError(null);

    try {
      const { start, end } = monthToRange(monthValue);
      const payload = await getForecast(start, end);
      setData(payload.data || payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat data forecast.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateAiAnalysis = useCallback(async () => {
    if (!data) {
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const payload = await generateAiForecast({
        histori: data.histori || [],
        produk: data.produk || [],
      });

      setAiSummary(payload);
    } catch (err) {
      setAiSummary(null);
      setAiError(err instanceof Error ? err.message : 'Gagal menghasilkan analisis forecast.');
    } finally {
      setAiLoading(false);
    }
  }, [data]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bi-selected-month-forecast', selectedMonth);
    }
    void loadData(selectedMonth);
  }, [loadData, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <TrendingUpDown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Forecast Penjualan</h2>
                <p className="mt-0.5 text-sm text-white">
                  {formatMonthDisplay(selectedMonth)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:w-auto">
              <button
                type="button"
                onClick={() => void handleGenerateAiAnalysis()}
                disabled={aiLoading || !data}
                className="group w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-xl border border-blue-500 bg-blue-500 px-4 py-2.5 text-sm font-medium text-white backdrop-blur-sm transition-all hover:border-blue-500/50 hover:bg-blue-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SparklesIcon className={`h-4 w-4 ${aiLoading ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                <span>{aiLoading ? 'Menganalisis...' : 'Analisis AI'}</span>
              </button>
              <div className="relative">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="group w-full sm:w-auto justify-center inline-flex items-center gap-2 rounded-xl border border-slate-600 bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-slate-200 backdrop-blur-sm transition-colors hover:border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <Skeleton rows={6} />
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-orange-50 p-6 shadow-sm">
          <NarasiBox text={error} type="danger" />
          <button
            type="button"
            onClick={() => void loadData(selectedMonth)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all hover:bg-red-700 hover:shadow-md active:scale-[0.98]"
          >
            <RefreshIcon className="h-4 w-4" />
            Coba Lagi
          </button>
        </div>
      )}

      {!loading && !error && !hasMeaningfulData(data) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <EmptyState message="Belum ada data forecast untuk periode ini." />
          <button
            type="button"
            onClick={() => void loadData(selectedMonth)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-600 shadow-sm transition-all hover:bg-slate-50 hover:shadow-md active:scale-[0.98]"
          >
            <RefreshIcon className="h-4 w-4" />
            Refresh
          </button>
        </div>
      )}

      {!loading && !error && hasMeaningfulData(data) && (
        <div className="space-y-6">
          {/* Data Summary */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <StatCard
              label="Total Histori Hari"
              value={data?.histori?.length?.toString() || '0'}
              sub="Hari dalam periode"
            />
            <StatCard
              label="Total Produk Terpantau"
              value={data?.produk?.length?.toString() || '0'}
              sub="Produk dengan riwayat"
            />
          </div>

          {/* AI Summary */}
          {aiLoading && (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
              <Skeleton rows={4} />
            </div>
          )}

          {!aiLoading && aiError && (
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-orange-50 p-6 shadow-sm">
              <NarasiBox text={aiError} type="danger" />
            </div>
          )}

          {!aiLoading && !aiError && aiSummary && (
            <div className="space-y-4">
              {/* Status Badge */}
              {aiSummary.status && (
                <div className="rounded-2xl border border-purple-100 bg-gradient-to-br from-purple-50 to-pink-50 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Status Forecast</h3>
                    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                      aiSummary.status === 'Optimis'
                        ? 'bg-green-100 text-green-800'
                        : aiSummary.status === 'Waspada'
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {aiSummary.status}
                    </span>
                  </div>
                </div>
              )}

              {/* Insights */}
              {aiSummary.insight && aiSummary.insight.length > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Temuan Utama</h3>
                  <ul className="space-y-3">
                    {aiSummary.insight.map((insight, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700">
                        <span className="mt-1 inline-flex h-2 w-2 flex-shrink-0 rounded-full bg-blue-500" />
                        <span>{insight}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {aiSummary.rekomendasi && aiSummary.rekomendasi.length > 0 && (
                <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Rekomendasi Aksi</h3>
                  <ol className="space-y-3">
                    {aiSummary.rekomendasi.map((rec, idx) => (
                      <li key={idx} className="flex gap-3 text-slate-700">
                        <span className="font-semibold text-green-600">{idx + 1}.</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Narrative */}
              {aiSummary.narasi && (
                <NarasiBox text={aiSummary.narasi} type="info" />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
