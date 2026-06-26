import React, { useCallback, useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  AlertTriangle,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  RefreshCw,
  Scale,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import LoadingSpinner from '../../components/LoadingSpinner';

const API_KEY = import.meta.env.VITE_API_KEY;

interface NeracaItem {
  nama: string;
  total: number;
}

interface NeracaResponse {
  tanggal: string;
  aset: {
    lancar: NeracaItem[];
    tetap: NeracaItem[];
    total_aset_lancar: number;
    total_aset_tetap: number;
    total_aset: number;
  };
  liabilitas: {
    detail: NeracaItem[];
    total_liabilitas: number;
  };
  ekuitas: {
    detail: NeracaItem[];
    total_ekuitas: number;
  };
  kontrol: {
    total_liabilitas_dan_ekuitas: number;
    selisih: number;
  };
  catatan?: string[];
}

type ExportType = 'pdf' | 'excel';

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount || 0);

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

const formatFilenameDate = (value: string) => new Date(value).toISOString().slice(0, 10);

const percent = (value: number, total: number) => {
  if (!total) return 0;
  return Math.max(0, Math.min(100, (value / total) * 100));
};

const clsx = (...classes: (string | false | null | undefined)[]) => classes.filter(Boolean).join(' ');

const exportNeracaPdf = (data: NeracaResponse) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const isBalanced = Math.abs(data.kontrol.selisih) < 1;

  doc.setFontSize(18);
  doc.text('Laporan Neraca', pageWidth / 2, 18, { align: 'center' });
  doc.setFontSize(10);
  doc.text(`Snapshot per ${formatDate(data.tanggal)}`, pageWidth / 2, 26, { align: 'center' });

  autoTable(doc, {
    startY: 36,
    head: [['Ringkasan', 'Nominal']],
    body: [
      ['Total Aset', formatCurrency(data.aset.total_aset)],
      ['Total Liabilitas', formatCurrency(data.liabilitas.total_liabilitas)],
      ['Total Ekuitas', formatCurrency(data.ekuitas.total_ekuitas)],
      ['Liabilitas + Ekuitas', formatCurrency(data.kontrol.total_liabilitas_dan_ekuitas)],
      ['Selisih', formatCurrency(data.kontrol.selisih)],
      ['Status', isBalanced ? 'Balance' : 'Perlu dicek'],
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
    styles: { fontSize: 9 },
    columnStyles: { 1: { halign: 'right' } },
  });

  let y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || 80) + 10;

  const tables = [
    { title: 'Aset Lancar', rows: data.aset.lancar, totalLabel: 'Total Aset Lancar', total: data.aset.total_aset_lancar },
    { title: 'Aset Tetap', rows: data.aset.tetap, totalLabel: 'Total Aset Tetap', total: data.aset.total_aset_tetap },
    { title: 'Liabilitas', rows: data.liabilitas.detail, totalLabel: 'Total Liabilitas', total: data.liabilitas.total_liabilitas },
    { title: 'Ekuitas', rows: data.ekuitas.detail, totalLabel: 'Total Ekuitas', total: data.ekuitas.total_ekuitas },
  ];

  tables.forEach(section => {
    autoTable(doc, {
      startY: y,
      head: [[section.title, 'Nominal']],
      body: [
        ...(section.rows.length ? section.rows : [{ nama: 'Belum ada data', total: 0 }]).map(item => [
          item.nama,
          formatCurrency(item.total),
        ]),
        [section.totalLabel, formatCurrency(section.total)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [15, 23, 42] },
      styles: { fontSize: 9 },
      columnStyles: { 1: { halign: 'right' } },
    });
    y = ((doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY || y) + 8;
  });

  doc.save(`Neraca_${formatFilenameDate(data.tanggal)}.pdf`);
};

const exportNeracaExcel = (data: NeracaResponse) => {
  const workbook = XLSX.utils.book_new();
  const isBalanced = Math.abs(data.kontrol.selisih) < 1;

  const summarySheet = XLSX.utils.aoa_to_sheet([
    ['LAPORAN NERACA'],
    ['Snapshot', formatDate(data.tanggal)],
    [],
    ['Ringkasan', 'Nominal'],
    ['Total Aset', data.aset.total_aset],
    ['Total Liabilitas', data.liabilitas.total_liabilitas],
    ['Total Ekuitas', data.ekuitas.total_ekuitas],
    ['Liabilitas + Ekuitas', data.kontrol.total_liabilitas_dan_ekuitas],
    ['Selisih', data.kontrol.selisih],
    ['Status', isBalanced ? 'Balance' : 'Perlu dicek'],
  ]);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Ringkasan');

  const detailRows = [
    ['Kategori', 'Nama', 'Nominal'],
    ...data.aset.lancar.map(item => ['Aset Lancar', item.nama, item.total]),
    ...data.aset.tetap.map(item => ['Aset Tetap', item.nama, item.total]),
    ...data.liabilitas.detail.map(item => ['Liabilitas', item.nama, item.total]),
    ...data.ekuitas.detail.map(item => ['Ekuitas', item.nama, item.total]),
    [],
    ['Total', 'Aset Lancar', data.aset.total_aset_lancar],
    ['Total', 'Aset Tetap', data.aset.total_aset_tetap],
    ['Total', 'Aset', data.aset.total_aset],
    ['Total', 'Liabilitas', data.liabilitas.total_liabilitas],
    ['Total', 'Ekuitas', data.ekuitas.total_ekuitas],
  ];
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(detailRows), 'Detail Neraca');

  if (data.catatan?.length) {
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([['Catatan'], ...data.catatan.map(item => [item])]), 'Catatan');
  }

  XLSX.writeFile(workbook, `Neraca_${formatFilenameDate(data.tanggal)}.xlsx`);
};

const Neraca: React.FC = () => {
  const [data, setData] = useState<NeracaResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState<ExportType | null>(null);

  const getHeaders = useCallback((): HeadersInit => {
    const token = getStoredToken();
    return {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  }, []);

  const fetchNeraca = useCallback(async () => {
    try {
      setRefreshing(true);
      setError(null);

      const response = await fetch(`${API_URL}/api/super-admin/laporan/neraca`, {
        headers: getHeaders(),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => null);
        throw new Error(errorJson?.message || 'Gagal mengambil laporan neraca');
      }

      const json: NeracaResponse = await response.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [getHeaders]);

  useEffect(() => {
    fetchNeraca();
  }, [fetchNeraca]);

  const composition = useMemo(() => {
    if (!data) return [];
    return [
      { label: 'Aset Lancar', value: data.aset.total_aset_lancar, color: 'bg-emerald-500' },
      { label: 'Aset Tetap', value: data.aset.total_aset_tetap, color: 'bg-sky-500' },
      { label: 'Liabilitas', value: data.liabilitas.total_liabilitas, color: 'bg-rose-500' },
      { label: 'Ekuitas', value: data.ekuitas.total_ekuitas, color: 'bg-indigo-500' },
    ];
  }, [data]);

  const handleExport = (type: ExportType) => {
    if (!data) return;

    setExporting(type);
    try {
      if (type === 'pdf') exportNeracaPdf(data);
      else exportNeracaExcel(data);
    } finally {
      setExporting(null);
    }
  };

  const renderRows = (items: NeracaItem[], totalBase: number) => (
    <div className="space-y-3">
      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-500">
          Belum ada data
        </div>
      ) : (
        items.map((item, index) => (
          <div key={`${item.nama}-${index}`} className="rounded-lg border border-slate-100 bg-white px-3 py-2.5">
            <div className="flex items-start justify-between gap-4">
              <span className="text-sm font-medium text-slate-700">{item.nama}</span>
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-slate-900">{formatCurrency(item.total)}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full rounded-full bg-slate-400" style={{ width: `${percent(item.total, totalBase)}%` }} />
            </div>
          </div>
        ))
      )}
    </div>
  );

  const renderSection = (
    title: string,
    subtitle: string,
    totalLabel: string,
    total: number,
    items: NeracaItem[],
    accent: string,
    totalBg: string
  ) => (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={clsx('h-2.5 w-2.5 rounded-full', accent)} />
      </div>
      {renderRows(items, Math.max(total, 1))}
      <div className={clsx(
        'mt-auto flex items-center justify-between rounded-lg px-3 py-3',
      totalBg
      )}>
  <span className="text-sm font-semibold text-white">{totalLabel}</span>
  <span className="text-sm font-bold tabular-nums text-white">{formatCurrency(total)}</span>
</div>
    </section>
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <LoadingSpinner />
      </div>
    );
  }

  const isBalanced = data ? Math.abs(data.kontrol.selisih) < 1 : false;
  const equityRatio = data ? percent(data.ekuitas.total_ekuitas, Math.max(data.aset.total_aset, 1)) : 0;
  const liabilityRatio = data ? percent(data.liabilitas.total_liabilitas, Math.max(data.aset.total_aset, 1)) : 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
              <Scale className="h-3.5 w-3.5" />
              Laporan posisi keuangan
            </div>
            <h1 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Neraca</h1>
            <p className="mt-1 text-sm text-slate-500">
              {data ? `Snapshot per ${formatDate(data.tanggal)}` : 'Ringkasan aset, liabilitas, dan ekuitas'}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={fetchNeraca}
              disabled={refreshing}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={clsx('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              disabled={!data || exporting === 'pdf'}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileText className="h-4 w-4" />
              PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport('excel')}
              disabled={!data || exporting === 'excel'}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {data && (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Aset</p>
                  <Wallet className="h-4 w-4 text-emerald-500" />
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{formatCurrency(data.aset.total_aset)}</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Liabilitas</p>
                  <BarChart3 className="h-4 w-4 text-rose-500" />
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{formatCurrency(data.liabilitas.total_liabilitas)}</p>
                <p className="mt-1 text-xs text-slate-500">{liabilityRatio.toFixed(1)}% dari aset</p>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ekuitas</p>
                  <TrendingUp className="h-4 w-4 text-indigo-500" />
                </div>
                <p className="mt-3 text-2xl font-bold tabular-nums text-slate-950">{formatCurrency(data.ekuitas.total_ekuitas)}</p>
                <p className="mt-1 text-xs text-slate-500">{equityRatio.toFixed(1)}% dari aset</p>
              </div>
              <div className={clsx('rounded-xl border p-5 shadow-sm', isBalanced ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50')}>
                <div className="flex items-center justify-between">
                  <p className={clsx('text-xs font-semibold uppercase tracking-wider', isBalanced ? 'text-emerald-600' : 'text-amber-700')}>Kontrol</p>
                  {isBalanced ? <Scale className="h-4 w-4 text-emerald-600" /> : <AlertTriangle className="h-4 w-4 text-amber-600" />}
                </div>
                <p className={clsx('mt-3 text-xl font-bold', isBalanced ? 'text-emerald-800' : 'text-amber-800')}>
                  {isBalanced ? 'Balance' : 'Perlu Dicek'}
                </p>
                <p className="mt-1 text-xs tabular-nums text-slate-600">Selisih {formatCurrency(data.kontrol.selisih)}</p>
              </div>
            </div>

            <div className="mb-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Komposisi Neraca</h2>
                  <p className="text-xs text-slate-500">Perbandingan nominal utama pada snapshot saat ini.</p>
                </div>
                <Download className="hidden h-4 w-4 text-slate-400 sm:block" />
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                {composition.map(item => (
                  <div key={item.label}>
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-500">{item.label}</span>
                      <span className="text-xs font-semibold tabular-nums text-slate-700">{formatCurrency(item.value)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div className={clsx('h-full rounded-full', item.color)} style={{ width: `${percent(item.value, data.aset.total_aset || item.value)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm xl:col-span-1">
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-base font-semibold text-slate-900">Aset</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Aset lancar dan aset tetap.</p>
                  </div>
                  <div className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </div>
                <div className="space-y-5">
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Aset Lancar</h3>
                    {renderRows(data.aset.lancar, Math.max(data.aset.total_aset_lancar, 1))}
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
                      <span>Total Aset Lancar</span>
                      <span className="tabular-nums">{formatCurrency(data.aset.total_aset_lancar)}</span>
                    </div>
                  </div>
                  <div>
                    <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">Aset Tetap</h3>
                    {renderRows(data.aset.tetap, Math.max(data.aset.total_aset_tetap, 1))}
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-800">
                      <span>Total Aset Tetap</span>
                      <span className="tabular-nums">{formatCurrency(data.aset.total_aset_tetap)}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-auto flex items-center justify-between rounded-lg bg-emerald-500 px-3 py-3 text-white">
                  <span className="text-sm font-semibold">Total Aset</span>
                  <span className="text-sm font-bold tabular-nums">{formatCurrency(data.aset.total_aset)}</span>
                </div>
              </section>

              {renderSection(
                'Liabilitas',
                'Kewajiban yang masih tercatat.',
                'Total Liabilitas',
                data.liabilitas.total_liabilitas,
                data.liabilitas.detail,
                'bg-rose-500',
                'bg-rose-500'
              )}

              {renderSection(
                'Ekuitas',
                'Modal dan akumulasi ekuitas.',
                'Total Ekuitas',
                data.ekuitas.total_ekuitas,
                data.ekuitas.detail,
                'bg-indigo-500',
                'bg-indigo-500'
              )}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-semibold text-slate-900">Kontrol Balance</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-3">
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Total Aset</p>
                  <p className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(data.aset.total_aset)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Liabilitas + Ekuitas</p>
                  <p className="mt-1 font-semibold tabular-nums text-slate-900">{formatCurrency(data.kontrol.total_liabilitas_dan_ekuitas)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 px-4 py-3">
                  <p className="text-xs font-medium text-slate-500">Selisih</p>
                  <p className={clsx('mt-1 font-semibold tabular-nums', isBalanced ? 'text-emerald-700' : 'text-amber-700')}>
                    {formatCurrency(data.kontrol.selisih)}
                  </p>
                </div>
              </div>
            </div>

            {data.catatan && data.catatan.length > 0 && (
              <div className="mt-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-3 text-base font-semibold text-slate-900">Catatan</h2>
                <ul className="space-y-2 text-sm text-slate-600">
                  {data.catatan.map((item, index) => (
                    <li key={`${item}-${index}`} className="flex gap-2">
                      <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400" />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Neraca;
