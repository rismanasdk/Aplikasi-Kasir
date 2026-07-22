import { useCallback, useEffect, useMemo, useState } from 'react';
import { generateAiAnomaly, getForecast, getKeuangan, getPersediaan } from '../biApi';
import { StatCard, NarasiBox, Skeleton, EmptyState } from './SharedComponents';
import { currentMonthValue, monthToRange } from '../utils/dateUtils';
import { rp } from './biUiHelpers';
import { SearchAlert } from 'lucide-react';

type ForecastSummary = {
  histori?: Array<{ tanggal: string; total_penjualan: number }>;
  produk?: Array<{ nama: string; total_qty_terjual: number; stok_sekarang?: number }>;
};

type KeuanganSummary = {
  keuangan?: {
    pendapatan: number;
    hpp: number;
    pengeluaran_operasional: number;
    target_omzet: number;
  };
};

type PersediaanSummary = {
  total_stok?: number;
  nilai_persediaan?: number;
};

type AiAnomalyResponse = {
  status?: string;
  insight?: string[];
  rekomendasi?: string[];
  narasi?: string;
};

const hasMeaningfulData = (forecast: ForecastSummary | null, keuangan: KeuanganSummary | null, persediaan: PersediaanSummary | null) => {
  return Boolean(
    forecast?.histori?.length &&
    forecast.produk?.length &&
    keuangan?.keuangan &&
    persediaan?.total_stok !== undefined
  );
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

const safeNumber = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  return 0;
};

const sumProductQty = (produk?: Array<{ nama: string; total_qty_terjual: number }>) => {
  return (produk || []).reduce((sum, item) => sum + safeNumber(item.total_qty_terjual), 0);
};

const joinProdukChanges = (current: Array<{ nama: string; current_qty: number }>, previous: Array<{ nama: string; previous_qty: number }>) => {
  const map = new Map<string, { nama: string; current_qty: number; previous_qty: number }>();

  for (const item of current) {
    map.set(item.nama, { nama: item.nama, current_qty: item.current_qty, previous_qty: 0 });
  }

  for (const item of previous) {
    const existing = map.get(item.nama);
    if (existing) {
      existing.previous_qty = item.previous_qty;
    } else {
      map.set(item.nama, { nama: item.nama, current_qty: 0, previous_qty: item.previous_qty });
    }
  }

  return Array.from(map.values()).sort((a, b) => Math.abs(b.current_qty - b.previous_qty) - Math.abs(a.current_qty - a.previous_qty)).slice(0, 10);
};

export default function AnomalyDetection() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window === 'undefined') {
      return currentMonthValue();
    }
    return window.localStorage.getItem('bi-selected-month-anomaly') || currentMonthValue();
  });
  const [dataCurrent, setDataCurrent] = useState<{ forecast: ForecastSummary; keuangan: KeuanganSummary; persediaan: PersediaanSummary } | null>(null);
  const [dataPrevious, setDataPrevious] = useState<{ forecast: ForecastSummary; keuangan: KeuanganSummary; persediaan: PersediaanSummary } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiAnomalyResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const previousMonthValue = useMemo(() => {
    const [year, month] = selectedMonth.split('-').map(Number);
    const date = new Date(year, month - 2, 1);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }, [selectedMonth]);

  const loadData = useCallback(async (monthValue: string) => {
    setLoading(true);
    setError(null);
    setAiSummary(null);
    setAiError(null);

    try {
      const { start, end } = monthToRange(monthValue);
      const currentForecastPromise = getForecast(start, end);
      const currentKeuanganPromise = getKeuangan(start, end);
      const currentPersediaanPromise = getPersediaan(start, end);
      const previousMonth = new Date(new Date(`${monthValue}-01`).setMonth(new Date(`${monthValue}-01`).getMonth() - 1));
      const prevMonthValue = `${previousMonth.getFullYear()}-${String(previousMonth.getMonth() + 1).padStart(2, '0')}`;
      const { start: prevStart, end: prevEnd } = monthToRange(prevMonthValue);
      const prevForecastPromise = getForecast(prevStart, prevEnd);
      const prevKeuanganPromise = getKeuangan(prevStart, prevEnd);
      const prevPersediaanPromise = getPersediaan(prevStart, prevEnd);

      const [forecastCurrent, keuanganCurrent, persediaanCurrent, forecastPrev, keuanganPrev, persediaanPrev] = await Promise.all([
        currentForecastPromise,
        currentKeuanganPromise,
        currentPersediaanPromise,
        prevForecastPromise,
        prevKeuanganPromise,
        prevPersediaanPromise,
      ]);

      setDataCurrent({ forecast: forecastCurrent.data || forecastCurrent, keuangan: keuanganCurrent, persediaan: persediaanCurrent.data || persediaanCurrent });
      setDataPrevious({ forecast: forecastPrev.data || forecastPrev, keuangan: keuanganPrev, persediaan: persediaanPrev.data || persediaanPrev });
    } catch (err) {
      setDataCurrent(null);
      setDataPrevious(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat data anomaly.');
    } finally {
      setLoading(false);
    }
  }, []);

  const getTotalPenjualan = (forecast: ForecastSummary | null) => {
    return (forecast?.histori || []).reduce((sum, item) => sum + safeNumber(item.total_penjualan), 0);
  };

  const buildPayload = useCallback(() => {
    if (!dataCurrent || !dataPrevious) {
      return null;
    }

    const currentKeuangan = dataCurrent.keuangan.keuangan;
    const previousKeuangan = dataPrevious.keuangan.keuangan;

    const currentForecast = dataCurrent.forecast || null;
    const previousForecast = dataPrevious.forecast || null;

    const currentProductQty = (currentForecast?.produk || []).map((item) => ({ nama: item.nama, current_qty: safeNumber(item.total_qty_terjual) }));
    const previousProductQty = (previousForecast?.produk || []).map((item) => ({ nama: item.nama, previous_qty: safeNumber(item.total_qty_terjual) }));

    return {
      current: {
        pendapatan: safeNumber(currentKeuangan?.pendapatan),
        hpp: safeNumber(currentKeuangan?.hpp),
        pengeluaran: safeNumber(currentKeuangan?.pengeluaran_operasional),
        laba_bersih: safeNumber(currentKeuangan?.pendapatan) - safeNumber(currentKeuangan?.hpp) - safeNumber(currentKeuangan?.pengeluaran_operasional),
        margin: safeNumber(currentKeuangan?.pendapatan) ? ((safeNumber(currentKeuangan?.pendapatan) - safeNumber(currentKeuangan?.hpp) - safeNumber(currentKeuangan?.pengeluaran_operasional)) / safeNumber(currentKeuangan?.pendapatan)) * 100 : 0,
        produk_terjual: sumProductQty(currentForecast?.produk),
        persediaan: safeNumber(dataCurrent.persediaan.total_stok),
        forecast: safeNumber(getTotalPenjualan(currentForecast)),
        realisasi: safeNumber(getTotalPenjualan(currentForecast)),
      },
      previous: {
        pendapatan: safeNumber(previousKeuangan?.pendapatan),
        hpp: safeNumber(previousKeuangan?.hpp),
        pengeluaran: safeNumber(previousKeuangan?.pengeluaran_operasional),
        laba_bersih: safeNumber(previousKeuangan?.pendapatan) - safeNumber(previousKeuangan?.hpp) - safeNumber(previousKeuangan?.pengeluaran_operasional),
        margin: safeNumber(previousKeuangan?.pendapatan) ? ((safeNumber(previousKeuangan?.pendapatan) - safeNumber(previousKeuangan?.hpp) - safeNumber(previousKeuangan?.pengeluaran_operasional)) / safeNumber(previousKeuangan?.pendapatan)) * 100 : 0,
        produk_terjual: sumProductQty(previousForecast?.produk),
        persediaan: safeNumber(dataPrevious.persediaan.total_stok),
        forecast: safeNumber(getTotalPenjualan(previousForecast)),
        realisasi: safeNumber(getTotalPenjualan(previousForecast)),
      },
      produk: joinProdukChanges(currentProductQty, previousProductQty),
    };
  }, [dataCurrent, dataPrevious]);

  const handleGenerateAiAnalysis = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) {
      return;
    }

    setAiLoading(true);
    setAiError(null);

    try {
      const response = await generateAiAnomaly(payload);
      setAiSummary(response);
    } catch (err) {
      setAiSummary(null);
      setAiError(err instanceof Error ? err.message : 'Gagal menghasilkan analisis anomaly.');
    } finally {
      setAiLoading(false);
    }
  }, [buildPayload]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem('bi-selected-month-anomaly', selectedMonth);
    }
    void loadData(selectedMonth);
  }, [loadData, selectedMonth]);

  const payload = buildPayload();

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 p-6 shadow-xl text-white">
        <div className="relative z-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
                <SearchAlert className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Anomaly Detection</h2>
                <p className="mt-0.5 text-sm text-slate-200">{formatMonthDisplay(selectedMonth)} vs. {formatMonthDisplay(previousMonthValue)}</p>
              </div>
            </div>
            <div className="flex flex-col gap-3 w-full sm:flex-row sm:items-center sm:w-auto">
              <button
                type="button"
                onClick={() => void handleGenerateAiAnalysis()}
                disabled={aiLoading || !payload}
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

      {!loading && !error && !hasMeaningfulData(dataCurrent?.forecast || null, dataCurrent?.keuangan || null, dataCurrent?.persediaan || null) && (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-8 shadow-sm">
          <EmptyState message="Belum ada cukup data untuk mendeteksi anomali dalam periode ini." />
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

      {!loading && !error && hasMeaningfulData(dataCurrent?.forecast || null, dataCurrent?.keuangan || null, dataCurrent?.persediaan || null) && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Pendapatan Bulanan" value={rp(safeNumber(dataCurrent?.keuangan.keuangan?.pendapatan))} sub="Periode saat ini" color="purple" />
            <StatCard label="Margin Keuntungan" value={`${(safeNumber(dataCurrent?.keuangan.keuangan?.pendapatan) ? Math.round(((safeNumber(dataCurrent?.keuangan.keuangan?.pendapatan) - safeNumber(dataCurrent?.keuangan.keuangan?.hpp) - safeNumber(dataCurrent?.keuangan.keuangan?.pengeluaran_operasional)) / safeNumber(dataCurrent?.keuangan.keuangan?.pendapatan)) * 100) : 0)}%`} sub="Periode saat ini" color="blue" />
            <StatCard label="Total Stok" value={rp(safeNumber(dataCurrent?.persediaan.total_stok))} sub="Periode saat ini" color="orange" />
            <StatCard label="Produk Terjual" value={rp(sumProductQty(dataCurrent?.forecast.produk))} sub="Periode saat ini" color="emerald" />
          </div>

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
              {aiSummary.status && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-slate-900">Status Anomali</h3>
                    <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ${
                      aiSummary.status === 'Anomali Terdeteksi'
                        ? 'bg-red-100 text-red-800'
                        : aiSummary.status === 'Perlu Dipantau'
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {aiSummary.status}
                    </span>
                  </div>
                </div>
              )}

              {aiSummary.insight && aiSummary.insight.length > 0 && (
                <div className="rounded-2xl border border-blue-100 bg-gradient-to-br from-blue-50 to-cyan-50 p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Temuan Anomali</h3>
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

              {aiSummary.rekomendasi && aiSummary.rekomendasi.length > 0 && (
                <div className="rounded-2xl border border-green-100 bg-gradient-to-br from-green-50 to-emerald-50 p-6 shadow-sm">
                  <h3 className="mb-4 text-lg font-semibold text-slate-900">Rekomendasi Deteksi</h3>
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

              {aiSummary.narasi && <NarasiBox text={aiSummary.narasi} type="info" />}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
