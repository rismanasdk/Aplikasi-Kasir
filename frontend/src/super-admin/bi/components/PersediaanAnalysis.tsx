import { useCallback, useEffect, useState } from 'react';
import { getPersediaan, generateAiPersediaan } from '../biApi';
import { StatCard, NarasiBox, Skeleton, EmptyState } from './SharedComponents';
import { currentMonthValue, monthToRange } from '../utils/dateUtils';
import { rp } from './biUiHelpers';

type PersediaanApiResponse = {
  data?: any;
};

type AiPersediaanResponse = {
  status?: string;
  score?: number;
  insight?: string[];
  warning?: string[];
  rekomendasi?: string[];
  narasi?: string;
};

export default function PersediaanAnalysis() {
  const [selectedMonth, setSelectedMonth] = useState(() => {
    if (typeof window === 'undefined') return currentMonthValue();
    return window.localStorage.getItem('bi-selected-month-persediaan') || currentMonthValue();
  });

  const [data, setData] = useState<PersediaanApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<AiPersediaanResponse | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const loadData = useCallback(async (monthValue: string) => {
    setLoading(true);
    setError(null);
    setAiSummary(null);
    setAiError(null);

    try {
      const { start, end } = monthToRange(monthValue);
      const payload = await getPersediaan(start, end);
      setData(payload);
    } catch (err) {
      setData(null);
      setError(err instanceof Error ? err.message : 'Gagal memuat data persediaan.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGenerateAiAnalysis = useCallback(async () => {
    if (!data?.data) return;
    setAiLoading(true);
    setAiError(null);

    try {
      const payload = await generateAiPersediaan({ persediaan: data.data });
      setAiSummary(payload);
    } catch (err) {
      setAiSummary(null);
      setAiError(err instanceof Error ? err.message : 'Gagal menghasilkan analisis persediaan.');
    } finally {
      setAiLoading(false);
    }
  }, [data?.data]);

  useEffect(() => {
    if (typeof window !== 'undefined') window.localStorage.setItem('bi-selected-month-persediaan', selectedMonth);
    void loadData(selectedMonth);
  }, [loadData, selectedMonth]);

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 p-6 shadow-xl">
        <div className="relative z-10 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">Business Intelligence - Persediaan</h2>
            <p className="mt-0.5 text-sm text-white">Analisis stok, item habis, dan klasifikasi pergerakan produk</p>
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
            <StatCard label="Total Produk" value={String(data.data.total_produk)} color="blue" />
            <StatCard label="Total Stok" value={String(data.data.total_stok)} color="green" />
            <StatCard label="Nilai Persediaan" value={rp(data.data.nilai_persediaan)} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-4 bg-white">
              <h3 className="font-semibold mb-2">Produk Habis</h3>
              <ul className="space-y-2">
                {data.data.produk_habis?.length ? data.data.produk_habis.map((p: any) => (
                  <li key={p.kode_barang} className="flex justify-between text-sm">
                    <span>{p.nama_barang}</span>
                    <span className="font-medium text-red-600">stok 0</span>
                  </li>
                )) : <li className="text-sm text-slate-500">Tidak ada produk yang habis.</li>}
              </ul>
            </div>

            <div className="rounded-2xl border p-4 bg-white">
              <h3 className="font-semibold mb-2">Produk Hampir Habis</h3>
              <ul className="space-y-2">
                {data.data.produk_hampir_habis?.length ? data.data.produk_hampir_habis.map((p: any) => (
                  <li key={p.kode_barang} className="flex justify-between text-sm">
                    <span>{p.nama_barang}</span>
                    <span className="font-medium text-amber-600">stok {p.stok}</span>
                  </li>
                )) : <li className="text-sm text-slate-500">Tidak ada produk yang hampir habis.</li>}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-2xl border p-4 bg-white">
              <h3 className="font-semibold mb-2">Fast Moving</h3>
              <ul className="space-y-2">
                {data.data.fast_moving?.length ? data.data.fast_moving.map((p: any) => (
                  <li key={p.kode_barang} className="flex justify-between text-sm">
                    <span>{p.nama_barang}</span>
                    <span className="font-medium text-emerald-600">{p.jumlah_terjual} terjual</span>
                  </li>
                )) : <li className="text-sm text-slate-500">Tidak ada produk fast moving.</li>}
              </ul>
            </div>

            <div className="rounded-2xl border p-4 bg-white">
              <h3 className="font-semibold mb-2">Slow Moving</h3>
              <ul className="space-y-2">
                {data.data.slow_moving?.length ? data.data.slow_moving.map((p: any) => (
                  <li key={p.kode_barang} className="flex justify-between text-sm">
                    <span>{p.nama_barang}</span>
                    <span className="font-medium text-slate-600">{p.jumlah_terjual} terjual</span>
                  </li>
                )) : <li className="text-sm text-slate-500">Tidak ada produk slow moving.</li>}
              </ul>
            </div>
          </div>

          <div className="rounded-2xl border p-4 bg-white">
            <h3 className="font-semibold mb-2">Analisis AI Persediaan</h3>
            {aiLoading && <Skeleton rows={3} />}
            {aiError && <NarasiBox text={aiError} type="danger" />}
            {aiSummary && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-50 p-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Status</p>
                    <p className="text-sm text-slate-600">{aiSummary.status || 'Tidak ada status'}</p>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-700">
                    Score {aiSummary.score ?? 0}/100
                  </div>
                </div>

                {aiSummary.warning && aiSummary.warning.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">Peringatan</h4>
                    <ul className="space-y-2">
                      {aiSummary.warning.map((item, index) => (
                        <li key={`${item}-${index}`} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.insight && aiSummary.insight.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">Insight</h4>
                    <ul className="space-y-2">
                      {aiSummary.insight.map((item, index) => (
                        <li key={`${item}-${index}`} className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.rekomendasi && aiSummary.rekomendasi.length > 0 && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">Rekomendasi</h4>
                    <ul className="space-y-2">
                      {aiSummary.rekomendasi.map((item, index) => (
                        <li key={`${item}-${index}`} className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {aiSummary.narasi && (
                  <div>
                    <h4 className="mb-2 text-sm font-semibold text-slate-700">Narasi</h4>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{aiSummary.narasi}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {!loading && !data?.data && <EmptyState message="Belum ada data persediaan untuk periode ini." />}
    </div>
  );
}
