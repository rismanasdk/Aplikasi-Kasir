import { useCallback, useEffect, useState } from 'react';
import { generateAiCashflow, getCashflow } from '../biApi';
import { StatCard, NarasiBox, Skeleton, EmptyState } from './SharedComponents';
import { rp } from './biUiHelpers';
import { currentMonthValue, monthToRange } from '../utils/dateUtils';

type CashflowResponse = {
  data?: {
    kas: number;
    total_modal: number;
    sisa_modal: number;
    kas_masuk: number;
    kas_keluar: number;
    arus_kas_bersih: number;
    daily_breakdown?: Array<{
      date: string;
      kas_masuk: number;
      kas_keluar: number;
      profit: number;
    }>;
  };
};

type AiCashflowResponse = {
  status?: string;
  score?: number;
  insight?: string[];
  warning?: string[];
  rekomendasi?: string[];
  narasi?: string;
};

const hasMeaningfulData = (cashflow: CashflowResponse['data']) => {
  if (!cashflow) return false;
  return Boolean(cashflow.kas || cashflow.kas_masuk || cashflow.kas_keluar);
};

// Icon components
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

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3.05h16.94a2 2 0 0 0 1.71-3.05L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function CashIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  );
}

function formatMonthDisplay(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function CashflowAnalysis() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window === 'undefined') {
      return currentMonthValue();
    }
    return window.localStorage.getItem('bi-selected-month-cashflow') || currentMonthValue();
  });
  const [data, setData] = useState<CashflowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiCashflowResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = useCallback(async (monthValue: string) => {
    setLoading(true);
    setError(null);
    setAiSummary(null);
    setAiError(null);

    try {
      const { start, end } = monthToRange(monthValue);
      const payload = await getCashflow(start, end);
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat data cashflow.');
    } finally {
      setLoading(false);
    }
  }, []);

  const normalizeNumber = (value: unknown) => {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  };

  const handleGenerateAiAnalysis = useCallback(async () => {
    if (!data?.data) {
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const payload = await generateAiCashflow({
        cashflow: {
          kas: normalizeNumber(data.data.kas),
          total_modal: normalizeNumber(data.data.total_modal),
          sisa_modal: normalizeNumber(data.data.sisa_modal),
          kas_masuk: normalizeNumber(data.data.kas_masuk),
          kas_keluar: normalizeNumber(data.data.kas_keluar),
          arus_kas_bersih: normalizeNumber(data.data.arus_kas_bersih),
        },
      });

      setAiSummary(payload);
    } catch (err) {
      setAiSummary(null);
      setAiError(err instanceof Error ? err.message : 'Gagal menghasilkan analisis cashflow.');
    } finally {
      setAiLoading(false);
    }
  }, [data?.data]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bi-selected-month-cashflow', selectedMonth);
    }
    void loadData(selectedMonth);
  }, [loadData, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500 to-emerald-400 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <CashIcon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Analisis Cashflow</h2>
                <p className="mt-0.5 text-sm text-white">
                  {formatMonthDisplay(selectedMonth)}
                </p>
              </div>
            </div>
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

      {!loading && !error && (!data?.data || !hasMeaningfulData(data.data)) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <EmptyState message="Belum ada data cashflow untuk periode ini." />
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

      {!loading && !error && data?.data && hasMeaningfulData(data.data) && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <CashflowContent cashflow={data.data} />

          {aiLoading && (
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                  <SparklesIcon className="h-4 w-4 text-violet-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Menganalisis Cashflow...</h3>
                  <p className="text-xs text-slate-500">AI sedang memproses data arus kas Anda</p>
                </div>
              </div>
              <Skeleton rows={4} />
            </div>
          )}

          {!aiLoading && aiError && (
            <div className="rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/50 to-orange-50/50 p-6 shadow-sm">
              <NarasiBox text={aiError} type="danger" />
            </div>
          )}

          {!aiLoading && aiSummary && (
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white via-violet-50/30 to-purple-50/30 p-6 shadow-sm">
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-md shadow-violet-200">
                  <SparklesIcon className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Analisis AI Cashflow</h3>
                  <p className="text-xs text-slate-500">Penilaian kesehatan arus kas untuk periode ini</p>
                </div>
              </div>

              <div className="space-y-5">
                {aiSummary.status && aiSummary.score !== undefined && (
                  <div className={`rounded-xl border-2 p-4 ${
                    aiSummary.status === 'sehat'
                      ? 'border-emerald-200 bg-gradient-to-r from-emerald-50 to-teal-50'
                      : aiSummary.status === 'waspada'
                      ? 'border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50'
                      : 'border-red-200 bg-gradient-to-r from-red-50 to-rose-50'
                  }`}>
                    <div className="mb-2 flex items-center justify-between">
                      <h4 className={`text-sm font-semibold ${
                        aiSummary.status === 'sehat'
                          ? 'text-emerald-900'
                          : aiSummary.status === 'waspada'
                          ? 'text-amber-900'
                          : 'text-red-900'
                      }`}>
                        {aiSummary.status === 'sehat' ? '✓ Sehat' : aiSummary.status === 'waspada' ? '⚠ Waspada' : '✗ Kritis'}
                      </h4>
                      <span className={`text-lg font-bold ${
                        aiSummary.status === 'sehat'
                          ? 'text-emerald-600'
                          : aiSummary.status === 'waspada'
                          ? 'text-amber-600'
                          : 'text-red-600'
                      }`}>
                        {aiSummary.score}/100
                      </span>
                    </div>
                  </div>
                )}

                {aiSummary.warning && aiSummary.warning.length > 0 && (
                  <div className="rounded-xl border border-red-100 bg-red-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <AlertIcon className="h-4 w-4 text-red-600" />
                      <h4 className="text-sm font-semibold text-red-900">Peringatan</h4>
                    </div>
                    <ul className="space-y-2">
                      {aiSummary.warning.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-red-800">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.insight && aiSummary.insight.length > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <LightbulbIcon className="h-4 w-4 text-blue-600" />
                      <h4 className="text-sm font-semibold text-blue-900">Insight</h4>
                    </div>
                    <ul className="space-y-2">
                      {aiSummary.insight.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-blue-800">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.rekomendasi && aiSummary.rekomendasi.length > 0 && (
                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
                    <div className="mb-3 flex items-center gap-2">
                      <CheckCircleIcon className="h-4 w-4 text-emerald-600" />
                      <h4 className="text-sm font-semibold text-emerald-900">Rekomendasi</h4>
                    </div>
                    <ul className="space-y-2">
                      {aiSummary.rekomendasi.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-emerald-800">
                          <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-emerald-400" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.narasi && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">Narasi</h4>
                    <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{aiSummary.narasi}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CashflowContent({ cashflow }: { cashflow: NonNullable<CashflowResponse['data']> }) {
  const kas = Number(cashflow.kas ?? 0);
  const totalModal = Number(cashflow.total_modal ?? 0);
  const sisaModal = Number(cashflow.sisa_modal ?? 0);
  const kasMasuk = Number(cashflow.kas_masuk ?? 0);
  const kasKeluar = Number(cashflow.kas_keluar ?? 0);
  const arusKasBersih = Number(cashflow.arus_kas_bersih ?? 0);

  const kasHealth = kas > 0 ? 'good' : kas === 0 ? 'warning' : 'critical';
  const cashflowHealth = arusKasBersih >= 0 ? 'positive' : 'negative';

  const insightText = `Periode ini mencatat kas masuk ${rp(kasMasuk)} dan kas keluar ${rp(kasKeluar)}. Saldo kas saat ini adalah ${rp(kas)}.`;

  return (
    <div className="space-y-5">
      <NarasiBox text={insightText} type="info" />

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Saldo Kas" value={rp(kas)} color={kasHealth === 'good' ? 'green' : kasHealth === 'warning' ? 'amber' : 'red'} />
        <StatCard label="Kas Masuk" value={rp(kasMasuk)} color="blue" />
        <StatCard label="Kas Keluar" value={rp(kasKeluar)} color="orange" />
        <StatCard label="Arus Kas Bersih" value={rp(arusKasBersih)} color={cashflowHealth === 'positive' ? 'green' : 'red'} />
      </div>

      {/* Modal Information */}
      {totalModal > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-indigo-600 shadow-sm shadow-purple-200">
                <CashIcon className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Modal Utama</h3>
            </div>
            <p className="text-2xl font-bold text-slate-900">{rp(totalModal)}</p>
            <p className="mt-2 text-xs text-slate-500">Total modal disetor</p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 shadow-sm shadow-indigo-200">
                <CashIcon className="h-4 w-4 text-white" />
              </div>
              <h3 className="text-sm font-semibold text-slate-800">Sisa Modal</h3>
            </div>
            <p className="text-2xl font-bold text-slate-900">{rp(sisaModal)}</p>
            <p className="mt-2 text-xs text-slate-500">Modal dikurangi prive</p>
          </div>
        </div>
      )}
    </div>
  );
}
