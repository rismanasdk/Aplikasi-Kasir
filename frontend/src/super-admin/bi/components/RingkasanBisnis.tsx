import { useCallback, useEffect, useState } from 'react';
import { generateAiRingkasan, getRingkasan } from '../biApi';
import { BISection, StatCard, NarasiBox, Skeleton, EmptyState } from './SharedComponents';
import { rp } from './biUiHelpers';
import { currentMonthValue, monthToRange } from '../utils/dateUtils';

type RingkasanResponse = {
  ringkasan?: {
    total_pendapatan?: number;
    total_hpp?: number;
    total_laba_kotor?: number;
    total_biaya_operasional?: number;
    total_laba_bersih?: number;
    total_barang_terjual?: number;
    target?: number;
  };
};

type AiRingkasanResponse = {
  status?: string;
  insight?: string[];
  rekomendasi?: string[];
  narasi?: string;
};

const hasMeaningfulData = (ringkasan: RingkasanResponse['ringkasan']) => {
  if (!ringkasan) return false;

  return Boolean(
    ringkasan.total_pendapatan ||
      ringkasan.total_laba_bersih ||
      ringkasan.total_barang_terjual ||
      ringkasan.target
  );
};

// Icon components untuk mempercantik tampilan
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

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
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

function TargetIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
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

function formatMonthDisplay(value: string): string {
  const [year, month] = value.split('-');
  const date = new Date(Number(year), Number(month) - 1);
  return date.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
}

export default function RingkasanBisnis() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window === 'undefined') {
      return currentMonthValue();
    }

    return window.localStorage.getItem('bi-selected-month') || currentMonthValue();
  });
  const [data, setData] = useState<RingkasanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiRingkasanResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = useCallback(async (monthValue: string) => {
    setLoading(true);
    setError(null);
    setAiSummary(null);
    setAiError(null);

    try {
      const { start, end } = monthToRange(monthValue);
      const payload = await getRingkasan(start, end);
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat ringkasan bisnis.');
    } finally {
      setLoading(false);
    }
  }, []);

  const normalizeNumber = (value: unknown) => {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  };

  const handleGenerateAiSummary = useCallback(async () => {
    if (!data?.ringkasan) {
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const payload = await generateAiRingkasan({
        ringkasan: {
          total_pendapatan: normalizeNumber(data.ringkasan.total_pendapatan),
          total_hpp: normalizeNumber(data.ringkasan.total_hpp),
          total_laba_kotor: normalizeNumber(data.ringkasan.total_laba_kotor),
          total_biaya_operasional: normalizeNumber(data.ringkasan.total_biaya_operasional),
          total_laba_bersih: normalizeNumber(data.ringkasan.total_laba_bersih),
          total_barang_terjual: normalizeNumber(data.ringkasan.total_barang_terjual),
          target: normalizeNumber(data.ringkasan.target),
        },
      });

      setAiSummary(payload);
    } catch (err) {
      setAiSummary(null);
      setAiError(err instanceof Error ? err.message : 'Gagal menghasilkan ringkasan AI.');
    } finally {
      setAiLoading(false);
    }
  }, [data?.ringkasan]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bi-selected-month', selectedMonth);
    }

    void loadData(selectedMonth);
  }, [loadData, selectedMonth]);

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 shadow-xl">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <ChartIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Ringkasan Bisnis</h2>
                <p className="mt-0.5 text-sm text-slate-400">
                  {formatMonthDisplay(selectedMonth)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => void handleGenerateAiSummary()}
                disabled={aiLoading || !data?.ringkasan}
                className="group inline-flex items-center gap-2 rounded-xl border border-violet-500/30 bg-violet-500/10 px-4 py-2.5 text-sm font-medium text-violet-300 backdrop-blur-sm transition-all hover:border-violet-500/50 hover:bg-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <SparklesIcon className={`h-4 w-4 ${aiLoading ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                <span>{aiLoading ? 'Menganalisis...' : 'Analisis AI'}</span>
              </button>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 pointer-events-none" />
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded-xl border border-slate-600 bg-slate-800/50 py-2.5 pl-10 pr-3 text-sm text-slate-200 backdrop-blur-sm transition-colors hover:border-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 [&::-webkit-calendar-picker-indicator]:opacity-60 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:invert"
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

      {!loading && !error && (!data?.ringkasan || !hasMeaningfulData(data.ringkasan)) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <EmptyState message="Belum ada data ringkasan bisnis untuk periode ini." />
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

      {!loading && !error && data?.ringkasan && hasMeaningfulData(data.ringkasan) && (
        <div className="space-y-5 animate-in fade-in duration-300">
          <RingkasanContent ringkasan={data.ringkasan} />

          {aiLoading && (
            <div className="rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 to-purple-50/50 p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-100">
                  <SparklesIcon className="h-4 w-4 text-violet-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">Menganalisis Data...</h3>
                  <p className="text-xs text-slate-500">AI sedang memproses ringkasan bisnis Anda</p>
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
                  <h3 className="text-base font-semibold text-slate-800">Analisis AI</h3>
                  <p className="text-xs text-slate-500">Ringkasan intelijen buatan untuk periode ini</p>
                </div>
              </div>
              
              <div className="space-y-5">
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

function RingkasanContent({ ringkasan }: { ringkasan: NonNullable<RingkasanResponse['ringkasan']> }) {
  const target = Number(ringkasan.target ?? 0);
  const pendapatan = Number(ringkasan.total_pendapatan ?? 0);
  const labaBersih = Number(ringkasan.total_laba_bersih ?? 0);
  const hpp = Number(ringkasan.total_hpp ?? 0);
  const biayaOperasional = Number(ringkasan.total_biaya_operasional ?? 0);
  const transaksi = Number(ringkasan.total_barang_terjual ?? 0);
  const labaKotor = Number(ringkasan.total_laba_kotor ?? 0);
  const pencapaianTarget = target > 0 ? Math.min((pendapatan / target) * 100, 100) : 0;
  const marginBersih = pendapatan > 0 ? (labaBersih / pendapatan) * 100 : 0;
  const marginKotor = pendapatan > 0 ? (labaKotor / pendapatan) * 100 : 0;

  const insightText = pendapatan > 0
    ? `Periode ini mencatat pendapatan ${rp(pendapatan)} dengan laba bersih ${rp(labaBersih)}.`
    : 'Belum ada transaksi selesai pada periode ini.';

  const getProgressColor = (pencapaian: number) => {
    if (pencapaian >= 100) return 'from-emerald-400 to-emerald-600';
    if (pencapaian >= 60) return 'from-blue-400 to-blue-600';
    return 'from-amber-400 to-amber-600';
  };

  const getProgressBg = (pencapaian: number) => {
    if (pencapaian >= 100) return 'bg-emerald-100';
    if (pencapaian >= 60) return 'bg-blue-100';
    return 'bg-amber-100';
  };

  const getProgressShadow = (pencapaian: number) => {
    if (pencapaian >= 100) return 'shadow-emerald-200';
    if (pencapaian >= 60) return 'shadow-blue-200';
    return 'shadow-amber-200';
  };

  return (
    <div className="space-y-5">
      <NarasiBox text={insightText} type="info" />

      {/* Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Pendapatan" value={rp(pendapatan)} color="blue" />
        <StatCard label="Laba Bersih" value={rp(labaBersih)} color={labaBersih >= 0 ? 'green' : 'red'} />
        <StatCard label="Transaksi" value={`${transaksi}`} sub="Jumlah item terjual" color="purple" />
        <StatCard label="Target Omzet" value={rp(target)} sub={`Pencapaian ${pencapaianTarget.toFixed(1)}%`} color="amber" />
      </div>

      {/* Detail Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Pencapaian Target */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 shadow-sm shadow-blue-200">
              <TargetIcon className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Pencapaian Target</h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="mb-2 flex justify-between items-end">
                <span className="text-sm text-slate-600">Target Omzet</span>
                <span className="text-2xl font-bold text-slate-900">{pencapaianTarget.toFixed(1)}%</span>
              </div>
              <div className={`w-full ${getProgressBg(pencapaianTarget)} rounded-full h-3 overflow-hidden`}>
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${getProgressColor(pencapaianTarget)} shadow-sm ${getProgressShadow(pencapaianTarget)} transition-all duration-700 ease-out`}
                  style={{ width: `${Math.min(pencapaianTarget, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Target</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{rp(target)}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Margin Bersih</p>
                <p className="mt-0.5 text-sm font-semibold text-slate-800">{marginBersih.toFixed(1)}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Komposisi Operasional */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 shadow-sm shadow-violet-200">
              <ChartIcon className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold text-slate-800">Komposisi Operasional</h3>
          </div>

          <div className="space-y-3">
            {/* HPP */}
            <div className="group rounded-xl bg-slate-50 p-3.5 transition-colors hover:bg-slate-100/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                  <span className="text-sm text-slate-600">HPP</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{rp(hpp)}</span>
              </div>
              {pendapatan > 0 && (
                <p className="mt-1 ml-5 text-xs text-slate-400">{((hpp / pendapatan) * 100).toFixed(1)}% dari pendapatan</p>
              )}
            </div>

            {/* Biaya Operasional */}
            <div className="group rounded-xl bg-slate-50 p-3.5 transition-colors hover:bg-slate-100/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                  <span className="text-sm text-slate-600">Biaya Operasional</span>
                </div>
                <span className="text-sm font-semibold text-slate-800">{rp(biayaOperasional)}</span>
              </div>
              {pendapatan > 0 && (
                <p className="mt-1 ml-5 text-xs text-slate-400">{((biayaOperasional / pendapatan) * 100).toFixed(1)}% dari pendapatan</p>
              )}
            </div>

            {/* Laba Kotor */}
            <div className="group rounded-xl bg-emerald-50 p-3.5 transition-colors hover:bg-emerald-100/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span className="text-sm font-medium text-emerald-800">Laba Kotor</span>
                </div>
                <span className="text-sm font-bold text-emerald-700">{rp(labaKotor)}</span>
              </div>
              {pendapatan > 0 && (
                <p className="mt-1 ml-5 text-xs text-emerald-600/70">Margin: {marginKotor.toFixed(1)}%</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}