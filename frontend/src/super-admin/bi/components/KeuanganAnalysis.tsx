import { useCallback, useEffect, useState } from 'react';
import { generateAiKeuangan, getKeuangan } from '../biApi';
import { StatCard, NarasiBox, Skeleton, EmptyState } from './SharedComponents';
import { rp } from './biUiHelpers';
import { currentMonthValue, monthToRange } from '../utils/dateUtils';

type KeuanganResponse = {
  keuangan?: {
    pendapatan: number;
    hpp: number;
    pengeluaran_operasional: number;
    target_omzet: number;
  };
};

type AiKeuanganResponse = {
  status?: string;
  insight?: string[];
  rekomendasi?: string[];
  narasi?: string;
};

const hasMeaningfulData = (keuangan: KeuanganResponse['keuangan']) => {
  if (!keuangan) return false;
  return Boolean(keuangan.pendapatan || keuangan.hpp || keuangan.pengeluaran_operasional);
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

function TrendingUpIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function formatMonthDisplay(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function KeuanganAnalysis() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window === 'undefined') {
      return currentMonthValue();
    }
    return window.localStorage.getItem('bi-selected-month-keuangan') || currentMonthValue();
  });
  const [data, setData] = useState<KeuanganResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiKeuanganResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = useCallback(async (monthValue: string) => {
    setLoading(true);
    setError(null);
    setAiSummary(null);
    setAiError(null);

    try {
      const { start, end } = monthToRange(monthValue);
      const payload = await getKeuangan(start, end);
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat data keuangan.');
    } finally {
      setLoading(false);
    }
  }, []);

  const normalizeNumber = (value: unknown) => {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  };

  const handleGenerateAiAnalysis = useCallback(async () => {
    if (!data?.keuangan) {
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const payload = await generateAiKeuangan({
        keuangan: {
          pendapatan: normalizeNumber(data.keuangan.pendapatan),
          hpp: normalizeNumber(data.keuangan.hpp),
          pengeluaran_operasional: normalizeNumber(data.keuangan.pengeluaran_operasional),
          target_omzet: normalizeNumber(data.keuangan.target_omzet),
        },
      });

      setAiSummary(payload);
    } catch (err) {
      setAiSummary(null);
      setAiError(err instanceof Error ? err.message : 'Gagal menghasilkan analisis keuangan.');
    } finally {
      setAiLoading(false);
    }
  }, [data?.keuangan]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bi-selected-month-keuangan', selectedMonth);
    }
    void loadData(selectedMonth);
  }, [loadData, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <TrendingUpIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Analisis Keuangan</h2>
                <p className="mt-0.5 text-sm text-white">
                  {formatMonthDisplay(selectedMonth)}
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:w-auto">
              <button
                type="button"
                onClick={() => void handleGenerateAiAnalysis()}
                disabled={aiLoading || !data?.keuangan}
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

      {!loading && !error && (!data?.keuangan || !hasMeaningfulData(data.keuangan)) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <EmptyState message="Belum ada data keuangan untuk periode ini." />
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

      {!loading && !error && data?.keuangan && hasMeaningfulData(data.keuangan) && (
        <div className="space-y-5 animate-in fade-in duration-300">
          {/* Financial Metrics Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Pendapatan"
              value={rp(data.keuangan.pendapatan)}
              icon="📈"
              className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200"
            />
            <StatCard
              label="HPP"
              value={rp(data.keuangan.hpp)}
              icon="📦"
              className="bg-gradient-to-br from-orange-50 to-amber-50 border-orange-200"
            />
            <StatCard
              label="Laba Kotor"
              value={rp(data.keuangan.pendapatan - data.keuangan.hpp)}
              icon="💰"
              className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200"
            />
            <StatCard
              label="Pengeluaran Operasional"
              value={rp(data.keuangan.pengeluaran_operasional)}
              icon="💸"
              className="bg-gradient-to-br from-red-50 to-pink-50 border-red-200"
            />
          </div>

          {/* AI Analysis */}
          {aiLoading && (
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-6 shadow-sm">
              <Skeleton rows={4} />
            </div>
          )}

          {!aiLoading && aiError && (
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 to-orange-50 p-6 shadow-sm">
              <NarasiBox text={aiError} type="danger" />
            </div>
          )}

          {!aiLoading && aiSummary && (
            <div className="space-y-4 animate-in fade-in duration-500">
              {/* Status */}
              {aiSummary.status && (
                <div className={`rounded-xl border-2 p-4 ${
                  aiSummary.status === 'Sehat'
                    ? 'border-green-300 bg-green-50'
                    : aiSummary.status === 'Perlu Perhatian'
                    ? 'border-amber-300 bg-amber-50'
                    : 'border-red-300 bg-red-50'
                }`}>
                  <div className="font-semibold text-gray-800">Status: {aiSummary.status}</div>
                </div>
              )}

              {/* Insights */}
              {aiSummary.insight && aiSummary.insight.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h3 className="mb-3 font-semibold text-gray-800">Insight Keuangan</h3>
                  <ul className="space-y-2">
                    {aiSummary.insight.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-sm text-gray-700">
                        <span className="text-lg">💡</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Rekomendasi */}
              {aiSummary.rekomendasi && aiSummary.rekomendasi.length > 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 shadow-sm">
                  <h3 className="mb-3 font-semibold text-gray-800">Rekomendasi</h3>
                  <ul className="space-y-2">
                    {aiSummary.rekomendasi.map((item, idx) => (
                      <li key={idx} className="flex gap-3 text-sm text-gray-700">
                        <span className="font-bold text-blue-600">{idx + 1}.</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Narasi */}
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
