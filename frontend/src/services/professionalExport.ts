import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

// ═══════════════════════════════════════════════════════════
// SECTION 1 — TYPES
// ═══════════════════════════════════════════════════════════

export type PageOrientation = 'portrait' | 'landscape';

export interface StoreInfo {
  name: string;
  logo?: string; // base64 data URL or http URL
}

export interface ExportOptions {
  title: string;
  subtitle?: string;
  orientation?: PageOrientation;
  showWatermark?: boolean;
  watermarkText?: string;
  showSignature?: boolean;
  signatureLabel?: string;
  signatureName?: string;
  showQR?: boolean;
  qrData?: string;
  periode?: string;
  tanggalCetak?: Date;
  filename?: string;
  footerNotes?: string[];
  /** Paksa semua konten muat dalam 1 halaman (font & spacing lebih kecil) */
  fitSinglePage?: boolean;
}

export interface TableSection {
  title?: string;
  headers: string[];
  rows: (string | number)[][];
  footerRows?: (string | number)[][];
  /** Kolom yang harus di-format sebagai Rupiah (0-indexed) */
  currencyColumns?: number[];
  /** Index baris (0-based) yang merupakan judul sub-section (bold, background khusus) */
  sectionRowIndices?: number[];
  /** Index baris (0-based) yang merupakan baris total (bold) */
  totalRowIndices?: number[];
}

// ─── Report Data Interfaces ─────────────────────────────

export interface NeracaItem {
  nama: string;
  total: number;
}

export interface NeracaData {
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

export interface LaporanKeuanganData {
  periode: { start: string; end: string };
  totalPendapatan: number;
  totalHpp: number;
  totalLabaKotor: number;
  totalBeban: number;
  labaBersih: number;
  totalBarangTerjual: number;
  biayaOperasional: { nama: string; jumlah: number }[];
  produkTerlaris: {
    produk: string;
    jumlahTerjual: number;
    hppPerPorsi: number;
    pendapatan: number;
    labaKotor: number;
  }[];
  metodePembayaran: { metode: string; total: number }[];
}

export interface CashFlowData {
  periode: { start: string; end: string };
  totalPemasukan: number;
  totalPengeluaran: number;
  saldoAwal?: number;
  saldoAkhir: number;
  ringkasanHarian: {
    tanggal: string;
    pemasukan: number;
    pengeluaran: number;
    saldo: number;
  }[];
  kategoriPemasukan?: { kategori: string; total: number }[];
  kategoriPengeluaran?: { kategori: string; total: number }[];
}

export interface RekapPenjualanData {
  periode: { start: string; end: string };
  totalPenjualan: number;
  totalTransaksi: number;
  totalItemTerjual: number;
  rataRataPerTransaksi: number;
  penjualanPerHari: {
    tanggal: string;
    jumlahTransaksi: number;
    totalPenjualan: number;
    itemTerjual: number;
  }[];
  produkTerlaris: {
    produk: string;
    jumlahTerjual: number;
    total: number;
  }[];
  metodePembayaran: { metode: string; total: number }[];
}

// ═══════════════════════════════════════════════════════════
// SECTION 2 — FORMAT HELPERS
// ═══════════════════════════════════════════════════════════

export function formatRupiah(amount: number): string {
  const value = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('id-ID').format(Number.isFinite(value) ? value : 0);
}

export function formatDateLong(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function formatDateShort(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('id-ID', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

function formatPeriode(start?: string, end?: string): string {
  if (start && end) {
    return `${formatDateShort(start)} - ${formatDateShort(end)}`;
  }
  if (start) return formatDateShort(start);
  if (end) return formatDateShort(end);
  return '';
}

// ═══════════════════════════════════════════════════════════
// SECTION 3 — STORE INFO HELPER
// ═══════════════════════════════════════════════════════════

const STORE_INFO_CACHE_KEY = '__professionalExport_storeInfo__';
const STORE_INFO_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface CachedStoreInfo {
  data: StoreInfo;
  timestamp: number;
}

function getCachedStoreInfo(): StoreInfo | null {
  try {
    const raw = localStorage.getItem(STORE_INFO_CACHE_KEY);
    if (!raw) return null;
    const parsed: CachedStoreInfo = JSON.parse(raw);
    if (Date.now() - parsed.timestamp > STORE_INFO_CACHE_TTL) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

function setCachedStoreInfo(info: StoreInfo): void {
  try {
    const payload: CachedStoreInfo = { data: info, timestamp: Date.now() };
    localStorage.setItem(STORE_INFO_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota errors
  }
}

/**
 * Default store info (fallback jika API/localStorage tidak tersedia).
 */
export const DEFAULT_STORE_INFO: StoreInfo = {
  name: 'Aplikasi Kasir',
  logo: '',
};

/**
 * Konversi SettingsData (bebas bentuk) menjadi StoreInfo.
 * Compatible dengan berbagai struktur settings.
 */
export function getStoreInfo(settings: any): StoreInfo {
  if (!settings) return { ...DEFAULT_STORE_INFO };
  return {
    name: settings.storeName || settings.name || 'Aplikasi Kasir',
    logo: settings.storeLogo || settings.logo || '',
  };
}

/**
 * Ambil store info dari cache lokal atau dari localStorage settings.
 * Versi frontend-only — tidak melakukan HTTP call.
 *
 * Panggil `refreshStoreInfoFromAPI()` sekali di app bootstrap
 * untuk mengisi cache dari backend.
 */
export function getLocalStoreInfo(): StoreInfo {
  const cached = getCachedStoreInfo();
  if (cached) return cached;

  // Coba baca dari localStorage (berbagai key umum)
  try {
    const keys = ['settings', 'storeSettings', 'appSettings', 'store_info'];
    for (const k of keys) {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      if (parsed && (parsed.storeName || parsed.name)) {
        const info = getStoreInfo(parsed);
        setCachedStoreInfo(info);
        return info;
      }
    }
  } catch {
    // ignore parse errors
  }

  return { ...DEFAULT_STORE_INFO };
}

/**
 * Refresh store info dari API. Panggil di app bootstrap.
 * Frontend-only boleh skip; cache akan pakai default.
 */
export async function refreshStoreInfoFromAPI(
  fetcher: () => Promise<StoreInfo | null>
): Promise<StoreInfo> {
  try {
    const info = await fetcher();
    if (info) {
      setCachedStoreInfo(info);
      return info;
    }
  } catch (err) {
    console.warn('[professionalExport] refreshStoreInfoFromAPI failed:', err);
  }
  return getLocalStoreInfo();
}

// ═══════════════════════════════════════════════════════════
// SECTION 4 — QR CODE GENERATION
// ═══════════════════════════════════════════════════════════

let qrcodeModule: typeof import('qrcode') | null = null;

async function loadQRCode(): Promise<typeof import('qrcode') | null> {
  if (qrcodeModule) return qrcodeModule;
  try {
    qrcodeModule = await import('qrcode');
    return qrcodeModule;
  } catch (err) {
    console.warn('[professionalExport] qrcode module not available:', err);
    return null;
  }
}

async function generateQRDataURL(text: string): Promise<string> {
  const qrcode = await loadQRCode();
  if (!qrcode) return '';
  try {
    return await qrcode.toDataURL(text, {
      width: 160,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: { dark: '#1e293b', light: '#ffffff' },
    });
  } catch (err) {
    console.warn('[professionalExport] generateQRDataURL failed:', err);
    return '';
  }
}

/**
 * Generate payload QR untuk verifikasi laporan offline.
 * Berisi: type, title, periode, store, total, tanggal, hash.
 */
export function generateVerificationQRData(options: {
  title: string;
  periode: string;
  storeName: string;
  total?: number;
  date: string;
  extra?: Record<string, unknown>;
}): string {
  const { title, periode, storeName, total = 0, date, extra = {} } = options;
  const rawString = `${title}|${periode}|${storeName}|${total}|${date}`;

  // Hash sederhana berbasis base64 + timestamp (offline, tidak butuh crypto API)
  let hash: string;
  try {
    hash = btoa(unescape(encodeURIComponent(rawString)));
  } catch {
    hash = rawString.split('').reduce((acc, ch) => {
      return ((acc << 5) - acc + ch.charCodeAt(0)) | 0;
    }, 0).toString(36);
  }

  const payload = {
    type: 'LAPORAN_KEUANGAN',
    title,
    periode,
    store: storeName,
    total,
    tanggal: date,
    hash,
    ...extra,
  };

  return JSON.stringify(payload);
}

// ═══════════════════════════════════════════════════════════
// SECTION 5 — PDF DRAWING PRIMITIVES
// ═══════════════════════════════════════════════════════════

// Color palette
const COLORS = {
  primary: [30, 41, 59] as [number, number, number],      // slate-800
  primaryLight: [241, 245, 249] as [number, number, number], // slate-100
  accent: [79, 70, 229] as [number, number, number],      // indigo-600
  textMuted: [120, 120, 120] as [number, number, number],
  textDark: [15, 23, 42] as [number, number, number],     // slate-900
  watermark: [230, 230, 235] as [number, number, number],
  border: [200, 200, 200] as [number, number, number],
  signatureLine: [100, 100, 100] as [number, number, number],
};

interface PdfContext {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  margin: number;
}

// ─── Logo & Store Header ─────────────────────────────────

async function drawStoreHeader(
  ctx: PdfContext,
  storeInfo: StoreInfo,
  options: ExportOptions,
  startY: number
): Promise<number> {
  const { doc, pageWidth, margin } = ctx;
  const compact = !!options.fitSinglePage;

  let y = startY;

  const hasLogo = !!storeInfo.logo;
  const logoSize = compact ? 10 : 15;
  let logoHeight = 0;

  // ─────────────────────────────────────────────
  // Logo
  // ─────────────────────────────────────────────
  if (hasLogo) {
    try {
      doc.addImage(storeInfo.logo!, 'PNG', margin, y, logoSize, logoSize);
      logoHeight = logoSize;
    } catch (err) {
      console.warn('[professionalExport] logo render failed:', err);
    }
  }

  const textX = hasLogo ? margin + logoSize + 4 : margin;
  const maxTextWidth =
    pageWidth - 2 * margin - (hasLogo ? logoSize + 4 : 0);

  // ─────────────────────────────────────────────
  // Nama Toko
  // ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 10 : 13);
  doc.setTextColor(...COLORS.textDark);

  const nameLines = doc.splitTextToSize(
    storeInfo.name || 'Aplikasi Kasir',
    maxTextWidth
  );

  doc.text(nameLines, textX, y + (compact ? 4.5 : 5.5));

  // ─────────────────────────────────────────────
  // Informasi Toko
  // ─────────────────────────────────────────────
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(compact ? 6.8 : 8.5);
  doc.setTextColor(...COLORS.textMuted);

  const infoParts: string[] = [];

  const infoText = infoParts.join('  •  ');

  if (infoText) {
    const infoLines = doc.splitTextToSize(infoText, maxTextWidth);

    doc.text(
      infoLines,
      textX,
      y + (compact ? 8.5 : 10.5)
    );
  }

  // Space setelah logo/header
  y += Math.max(logoHeight, compact ? 11 : 16);

  // ─────────────────────────────────────────────
  // Judul
  // ─────────────────────────────────────────────
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(compact ? 11 : 13);
  doc.setTextColor(...COLORS.textDark);

  const titleLines = doc.splitTextToSize(
    options.title.toUpperCase(),
    pageWidth - margin * 2
  );

  doc.text(
    titleLines,
    pageWidth / 2,
    y + 3,
    {
      align: 'center',
    }
  );

  y += titleLines.length * (compact ? 3.8 : 4.8);

  // ─────────────────────────────────────────────
  // Subtitle
  // ─────────────────────────────────────────────
  if (options.subtitle) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(compact ? 7.5 : 9);
    doc.setTextColor(...COLORS.textMuted);

    const subLines = doc.splitTextToSize(
      options.subtitle,
      pageWidth - margin * 2
    );

    doc.text(
      subLines,
      pageWidth / 2,
      y,
      {
        align: 'center',
      }
    );

    y += subLines.length * (compact ? 3 : 4);
  }

  // ─────────────────────────────────────────────
  // Periode
  // ─────────────────────────────────────────────
  if (options.periode) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(compact ? 6.8 : 8);
    doc.setTextColor(...COLORS.textMuted);

    doc.text(
      `Periode: ${options.periode}`,
      pageWidth / 2,
      y,
      {
        align: 'center',
      }
    );

    y += compact ? 2.8 : 4;
  }

  // ─────────────────────────────────────────────
  // Divider
  // ─────────────────────────────────────────────
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.35);

  doc.line(
    margin,
    y,
    pageWidth - margin,
    y
  );

  y += compact ? 2.5 : 4;

  doc.setTextColor(0, 0, 0);

  return y;
}

// ─── Watermark ───────────────────────────────────────────

function drawWatermark(
  ctx: PdfContext,
  text: string
): void {
  const { doc, pageWidth, pageHeight } = ctx;

  doc.saveGraphicsState();
  try {
    // Set fill color sangat pudar
    doc.setTextColor(...COLORS.watermark);
    doc.setFontSize(48);
    doc.setFont('helvetica', 'bold');

    // jsPDF 2.5+ mendukung option `angle`
    doc.text(text, pageWidth / 2, pageHeight / 2, {
      align: 'center',
      baseline: 'middle',
      angle: 35,
    });
  } finally {
    doc.restoreGraphicsState();
    doc.setTextColor(0, 0, 0);
  }
}

// ─── Footer (page number + print date) ───────────────────

function drawFooter(
  ctx: PdfContext,
  printDate: Date
): void {
  const { doc, pageWidth, pageHeight, margin } = ctx;
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer line
    doc.setDrawColor(...COLORS.border);
    doc.setLineWidth(0.3);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    // Print date (kiri)
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`Dicetak: ${formatDateShort(printDate)}`, margin, pageHeight - 9);

    // Page number (kanan)
    doc.text(
      `Halaman ${i} dari ${pageCount}`,
      pageWidth - margin,
      pageHeight - 9,
      { align: 'right' }
    );

    // Center: store name
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.textMuted);
    doc.text('Dokumen ini diterbitkan oleh sistem kasir', pageWidth / 2, pageHeight - 9, {
      align: 'center',
    });
  }

  doc.setTextColor(0, 0, 0);
}

// ─── Signature Block ─────────────────────────────────────

interface SignaturePayload {
  /** Label jabatan, mis. 'Pemilik', 'Pimpinan', 'Manajer' */
  label: string;
  /** Nama pemilik / penandatangan */
  ownerName: string;
  /** Nama toko (ditampilkan sebagai baris tambahan) */
  storeName: string;
  /** Optional: NIP / ID penandatangan */
  ownerId?: string;
}

function drawSignature(
  ctx: PdfContext,
  payload: SignaturePayload,
  startY: number,
  compact = false
): number {
  const { doc, pageWidth, margin } = ctx;
  const blockWidth = 65;
  const signatureX = pageWidth - margin - blockWidth;
  let y = startY;

  // Header: "Hormat kami,"
  doc.setFontSize(compact ? 8 : 10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textDark);
  doc.text('Hormat kami,', signatureX, y);
  y += compact ? 3 : 4;

  // Tempat tinggal / kota + tanggal (opsional)
  doc.setFontSize(compact ? 6 : 8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    `${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`,
    signatureX,
    y
  );
  y += compact ? 10 : 18; // ruang untuk tanda tangan basah

  // Garis tanda tangan
  doc.setDrawColor(...COLORS.signatureLine);
  doc.setLineWidth(0.3);
  doc.line(signatureX, y, signatureX + blockWidth, y);
  y += compact ? 3 : 5;

  // Nama pemilik (bold, ukuran sedang)
  const displayName = (payload.ownerName || '').trim() || '(Nama Pemilik)';
  doc.setFontSize(compact ? 8 : 10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textDark);
  const nameLines = doc.splitTextToSize(displayName, blockWidth);
  doc.text(nameLines, signatureX + blockWidth / 2, y, { align: 'center' });
  y += nameLines.length * (compact ? 3 : 4) + 1;

  // Optional: ID pemilik (NIP / KTP)
  if (payload.ownerId) {
    doc.setFontSize(6);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.textMuted);
    doc.text(`ID: ${payload.ownerId}`, signatureX + blockWidth / 2, y, { align: 'center' });
    y += compact ? 3 : 4;
  }

  // Label jabatan (italic muted)
  doc.setFontSize(compact ? 6 : 8);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(...COLORS.textMuted);
  doc.text(
    (payload.label || 'Pemilik').toUpperCase(),
    signatureX + blockWidth / 2,
    y,
    { align: 'center' }
  );
  y += compact ? 3 : 4;

  // Nama toko (italic kecil)
  if (payload.storeName) {
    doc.setFontSize(6);
    doc.setTextColor(...COLORS.textMuted);
    const storeLines = doc.splitTextToSize(payload.storeName, blockWidth);
    doc.text(storeLines, signatureX + blockWidth / 2, y, { align: 'center' });
    y += storeLines.length * 2.5;
  }

  doc.setTextColor(0, 0, 0);
  return y + (compact ? 1 : 4);
}

// ─── QR Code Block ───────────────────────────────────────

async function drawQR(
  ctx: PdfContext,
  data: string,
  startY: number,
  compact = false
): Promise<number> {
  const { doc, margin } = ctx;
  const qrDataURL = await generateQRDataURL(data);
  if (!qrDataURL) return startY;

  const qrSize = compact ? 20 : 32;
  let y = startY;

  try {
    doc.addImage(qrDataURL, 'PNG', margin, y, qrSize, qrSize);
  } catch (err) {
    console.warn('[professionalExport] QR image render failed:', err);
    return y;
  }

  // Label di samping QR
  doc.setFontSize(compact ? 7 : 8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.textDark);
  doc.text('Scan untuk verifikasi', margin + qrSize + 3, y + (compact ? 4 : 6));

  doc.setFontSize(compact ? 5.5 : 7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.textMuted);
  doc.text('QR berisi metadata laporan', margin + qrSize + 3, y + (compact ? 8 : 11));
  doc.text('untuk keaslian dokumen.', margin + qrSize + 3, y + (compact ? 11 : 15));
  doc.setTextColor(0, 0, 0);

  return y + qrSize + (compact ? 3 : 6);
}

// ─── Cell Value Formatter ────────────────────────────────

function formatCellValue(
  value: string | number,
  isCurrency: boolean
): string {
  if (typeof value === 'number') {
    return isCurrency ? formatRupiah(value) : formatNumber(value);
  }
  return String(value ?? '');
}

// ═══════════════════════════════════════════════════════════
// SECTION 6 — MAIN PDF EXPORT
// ═══════════════════════════════════════════════════════════

/**
 * Export multiple table sections menjadi satu PDF profesional.
 */
export async function exportProfessionalPDF(
  storeInfo: StoreInfo,
  sections: TableSection[],
  options: ExportOptions
): Promise<void> {
  const orientation = options.orientation || 'portrait';
  const doc = new jsPDF({
    orientation: orientation === 'landscape' ? 'l' : 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const compact = !!options.fitSinglePage;
  const margin = compact ? 12 : 20;
  const ctx: PdfContext = { doc, pageWidth, pageHeight, margin };
  const printDate = options.tanggalCetak || new Date();

  // Watermark pada halaman pertama
  if (options.showWatermark && options.watermarkText) {
    drawWatermark(ctx, options.watermarkText);
  }

  // Store header (logo + info + title + periode)
  let y = compact ? 8 : 14;
  y = await drawStoreHeader(ctx, storeInfo, options, y);

  // Iterasi setiap section
  for (const section of sections) {
    // Dalam mode compact, JANGAN pernah buat halaman baru
    const needsNewPage = !compact && y > pageHeight - 60;
    if (needsNewPage) {
      doc.addPage();
      y = 20;
      if (options.showWatermark && options.watermarkText) {
        drawWatermark(ctx, options.watermarkText);
      }
    }

    // Section title
    if (section.title) {
      doc.setFontSize(compact ? 9 : 12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...COLORS.textDark);
      doc.text(section.title, margin, y);
      y += compact ? 2.5 : 5;
    }

    // Format body & footer
    const currencyCols = new Set(section.currencyColumns ?? []);
    const detectCurrency = (colIdx: number) => currencyCols.has(colIdx) ||
      // Auto-detect: kolom bernama "jumlah", "total", "nominal", "pendapatan", dll.
      /jumlah|total|nominal|pendapatan|pengeluaran|pemasukan|saldo|laba|hpp|biaya/i
        .test(section.headers[colIdx] || '');

    const body: string[][] = section.rows.map(row =>
      row.map((cell, idx) => formatCellValue(cell, detectCurrency(idx)))
    );

    const footerRows: string[][] | undefined = section.footerRows?.map(row =>
      row.map((cell, idx) => formatCellValue(cell, detectCurrency(idx)))
    );

    const sectionRowSet = new Set(section.sectionRowIndices ?? []);
    const totalRowSet = new Set(section.totalRowIndices ?? []);
    const hasSpecialRows = sectionRowSet.size > 0 || totalRowSet.size > 0;

    autoTable(doc, {
      startY: y,
      head: [section.headers],
      body,
      foot: footerRows,
      theme: 'grid',
      headStyles: {
        fillColor: COLORS.primary,
        textColor: 255,
        fontStyle: 'bold',
        fontSize: compact ? 7 : 9,
        halign: 'left',
        cellPadding: compact ? 1.5 : 2,
      },
      bodyStyles: {
        fontSize: compact ? 6.5 : 8,
        cellPadding: compact ? 1.2 : 2,
        textColor: COLORS.textDark,
      },
      footStyles: {
        fillColor: COLORS.primaryLight,
        textColor: COLORS.primary,
        fontStyle: 'bold',
        fontSize: compact ? 7 : 9,
        cellPadding: compact ? 1.5 : 2,
      },
      alternateRowStyles: hasSpecialRows
        ? undefined
        : { fillColor: [248, 250, 252] },
      margin: { top: 10, bottom: compact ? 8 : 20, left: margin, right: margin },
      didParseCell: hasSpecialRows ? (data) => {
        if (data.section === 'body') {
          const rowIdx = data.row.index;
          if (sectionRowSet.has(rowIdx)) {
            // Section header row: bold + background gelap
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [30, 41, 59];
            data.cell.styles.textColor = 255;
            data.cell.styles.fontSize = (compact ? 7 : 9);
          } else if (totalRowSet.has(rowIdx)) {
            // Total row: bold + background terang
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.fillColor = [241, 245, 249];
            data.cell.styles.textColor = COLORS.primary;
            data.cell.styles.fontSize = (compact ? 6.5 : 8);
          }
        }
      } : undefined,
      didDrawPage: () => {
        if (options.showWatermark && options.watermarkText) {
          drawWatermark(ctx, options.watermarkText);
        }
      },
    });

    const finalY = (doc.lastAutoTable?.finalY) as number | undefined;
    y = (finalY ?? y + 20) + (compact ? 2 : 6);
  }

  // QR Code (di kiri bawah)
  if (options.showQR && options.qrData) {
    if (!compact && y > pageHeight - 60) {
      doc.addPage();
      y = 20;
    }
    y = await drawQR(ctx, options.qrData, y, compact);
  }

  // Footer notes tambahan
  if (options.footerNotes?.length) {
    if (!compact && y > pageHeight - 50) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(compact ? 6 : 8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(...COLORS.textMuted);
    for (const note of options.footerNotes) {
      const lines = doc.splitTextToSize(note, pageWidth - 2 * margin);
      doc.text(lines, margin, y);
      y += lines.length * (compact ? 3 : 4);
    }
    doc.setTextColor(0, 0, 0);
    y += compact ? 2 : 4;
  }

  // Signature (di kanan bawah)
  // Prioritas nama: signatureName eksplisit > storeInfo.owner > fallback placeholder

  // Footer pada semua halaman (page number + tanggal cetak)
  drawFooter(ctx, printDate);

  // Save
  const filename = options.filename ||
    `Laporan_${printDate.toISOString().split('T')[0]}.pdf`;
  doc.save(filename);
}

// ═══════════════════════════════════════════════════════════
// SECTION 7 — MAIN EXCEL EXPORT
// ═══════════════════════════════════════════════════════════

/**
 * Export multiple sections menjadi satu workbook Excel profesional.
 */
export function exportProfessionalExcel(
  storeInfo: StoreInfo,
  sections: TableSection[],
  options: ExportOptions
): void {
  const workbook = XLSX.utils.book_new();
  const printDate = options.tanggalCetak || new Date();

  // ─── Sheet 1: Info Toko ───
  const infoRows: (string | number)[][] = [
    [storeInfo.name || 'Aplikasi Kasir'],
    [''],
    [options.title.toUpperCase()],
  ];
  if (options.subtitle) infoRows.push([options.subtitle]);
  if (options.periode) infoRows.push([`Periode: ${options.periode}`]);
  infoRows.push([`Tanggal Cetak: ${formatDateLong(printDate)}`]);
  infoRows.push([`Dicetak oleh: Sistem Kasir`]);
  infoRows.push(['']);

  const infoSheet = XLSX.utils.aoa_to_sheet(infoRows);
  infoSheet['!cols'] = [{ wch: 40 }];
  infoSheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 5 } }];
  XLSX.utils.book_append_sheet(workbook, infoSheet, 'Info');

  // ─── Sheets 2..n: Data per section ───
  const usedNames = new Set<string>(['Info']);
  const uniqueSheetName = (name: string): string => {
    let base = (name || 'Data').slice(0, 28).replace(/[\\/?*[\]:]/g, '');
    let candidate = base;
    let suffix = 1;
    while (usedNames.has(candidate)) {
      candidate = `${base.slice(0, 27)}${suffix++}`;
    }
    usedNames.add(candidate);
    return candidate;
  };

  for (const section of sections) {
    const sheetName = uniqueSheetName(section.title || 'Data');
    const sheetData: (string | number)[][] = [];

    // Header
    sheetData.push(section.headers);

    // Body rows
    for (const row of section.rows) {
      sheetData.push(row);
    }

    // Footer rows
    if (section.footerRows?.length) {
      sheetData.push([]);
      for (const footer of section.footerRows) {
        sheetData.push(footer);
      }
    }

    const sheet = XLSX.utils.aoa_to_sheet(sheetData);

    // Column widths
    const colWidths = section.headers.map((h, idx) => {
      const maxCellLen = Math.max(
        h.length,
        ...section.rows.map(r => {
          const v = r[idx];
          return typeof v === 'number' ? String(v).length : (v?.toString().length ?? 0);
        })
      );
      return { wch: Math.min(Math.max(maxCellLen + 2, 12), 40) };
    });
    sheet['!cols'] = colWidths;

    // Freeze header row
    sheet['!freeze'] = { ySplit: 1 };

    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  // Save
  const filename = options.filename ||
    `Laporan_${printDate.toISOString().split('T')[0]}.xlsx`;
  XLSX.writeFile(workbook, filename);
}

// ═══════════════════════════════════════════════════════════
// SECTION 8 — HIGH-LEVEL EXPORT WRAPPERS (4 LAPORAN)
// ═══════════════════════════════════════════════════════════

interface ExportWrapperOptions {
  orientation?: PageOrientation;
  storeInfo?: StoreInfo;
}

function resolveStoreInfo(custom?: StoreInfo): StoreInfo {
  return custom || getLocalStoreInfo();
}

// ─── 1. NERACA ───────────────────────────────────────────

export async function exportNeracaPDF(
  data: NeracaData,
  opts: ExportWrapperOptions = {}
): Promise<void> {
  const storeInfo = resolveStoreInfo(opts.storeInfo);
  const formattedDate = formatDateLong(data.tanggal);
  const isBalanced = Math.abs(data.kontrol.selisih) < 1;

  // ─── SINGLE FLOW: semua section digabung jadi 1 tabel ───
  const mergedRows: (string | number)[][] = [];
  const sectionRowIdxs: number[] = [];
  const totalRowIdxs: number[] = [];

  const addSection = (label: string, items: NeracaItem[], totalLabel: string, totalValue: number) => {
    sectionRowIdxs.push(mergedRows.length);
    mergedRows.push([label, '', '']);
    for (const item of items) {
      mergedRows.push(['', item.nama, item.total]);
    }
    totalRowIdxs.push(mergedRows.length);
    mergedRows.push(['', totalLabel, totalValue]);
  };

  addSection('ASET LANCAR', data.aset.lancar, 'Total Aset Lancar', data.aset.total_aset_lancar);
  addSection('ASET TETAP', data.aset.tetap, 'Total Aset Tetap', data.aset.total_aset_tetap);
  addSection('LIABILITAS', data.liabilitas.detail, 'Total Liabilitas', data.liabilitas.total_liabilitas);
  addSection('EKUITAS', data.ekuitas.detail, 'Total Ekuitas', data.ekuitas.total_ekuitas);

  const sections: TableSection[] = [
    {
      headers: ['Kategori', 'Keterangan', 'Jumlah'],
      rows: mergedRows,
      sectionRowIndices: sectionRowIdxs,
      totalRowIndices: totalRowIdxs,
      currencyColumns: [2],
      footerRows: [
        ['TOTAL ASET', '', data.aset.total_aset],
        ['TOTAL LIABILITAS + EKUITAS', '', data.kontrol.total_liabilitas_dan_ekuitas],
        ['SELISIH', '', data.kontrol.selisih],
        ['STATUS', '', isBalanced ? 'BALANCE ✓' : 'PERLU DICEK'],
      ],
    },
  ];

  const qrData = generateVerificationQRData({
    title: 'Laporan Neraca',
    periode: `per ${formattedDate}`,
    storeName: storeInfo.name,
    total: data.aset.total_aset,
    date: data.tanggal,
  });

  await exportProfessionalPDF(storeInfo, sections, {
    title: 'Laporan Neraca',
    subtitle: `Posisi Keuangan per ${formattedDate}`,
    orientation: opts.orientation || 'portrait',
    fitSinglePage: true,
    showWatermark: false,
    watermarkText: 'LAPORAN RESMI',
    showSignature: true,
    signatureLabel: 'Pemilik / Pimpinan',
    showQR: true,
    qrData,
    footerNotes: data.catatan,
    filename: `Neraca_${data.tanggal.slice(0, 10)}.pdf`,
  });
}

export function exportNeracaExcel(
  data: NeracaData,
  opts: ExportWrapperOptions = {}
): void {
  const storeInfo = resolveStoreInfo(opts.storeInfo);
  const formattedDate = formatDateLong(data.tanggal);
  const isBalanced = Math.abs(data.kontrol.selisih) < 1;

  const sections: TableSection[] = [
    {
      title: 'Ringkasan',
      headers: ['Komponen', 'Jumlah'],
      rows: [
        ['Total Aset', data.aset.total_aset],
        ['Total Aset Lancar', data.aset.total_aset_lancar],
        ['Total Aset Tetap', data.aset.total_aset_tetap],
        ['Total Liabilitas', data.liabilitas.total_liabilitas],
        ['Total Ekuitas', data.ekuitas.total_ekuitas],
        ['Liabilitas + Ekuitas', data.kontrol.total_liabilitas_dan_ekuitas],
        ['Selisih', data.kontrol.selisih],
        ['Status', isBalanced ? 'BALANCE' : 'PERLU DICEK'],
      ],
      currencyColumns: [1],
    },
    {
      title: 'Aset Lancar',
      headers: ['Nama', 'Jumlah'],
      rows: data.aset.lancar.map(i => [i.nama, i.total]),
      footerRows: [['Total Aset Lancar', data.aset.total_aset_lancar]],
      currencyColumns: [1],
    },
    {
      title: 'Aset Tetap',
      headers: ['Nama', 'Jumlah'],
      rows: data.aset.tetap.map(i => [i.nama, i.total]),
      footerRows: [['Total Aset Tetap', data.aset.total_aset_tetap]],
      currencyColumns: [1],
    },
    {
      title: 'Liabilitas',
      headers: ['Kategori', 'Jumlah'],
      rows: data.liabilitas.detail.map(i => [i.nama, i.total]),
      footerRows: [['Total Liabilitas', data.liabilitas.total_liabilitas]],
      currencyColumns: [1],
    },
    {
      title: 'Ekuitas',
      headers: ['Komponen', 'Jumlah'],
      rows: data.ekuitas.detail.map(i => [i.nama, i.total]),
      footerRows: [['Total Ekuitas', data.ekuitas.total_ekuitas]],
      currencyColumns: [1],
    },
  ];

  exportProfessionalExcel(storeInfo, sections, {
    title: 'Laporan Neraca',
    subtitle: `Posisi Keuangan per ${formattedDate}`,
    filename: `Neraca_${data.tanggal.slice(0, 10)}.xlsx`,
  });
}

// ─── 2. LAPORAN KEUANGAN (Laba Rugi) ─────────────────────

export async function exportLaporanKeuanganPDF(
  data: LaporanKeuanganData,
  opts: ExportWrapperOptions = {}
): Promise<void> {
  const storeInfo = resolveStoreInfo(opts.storeInfo);
  const periodeStr = formatPeriode(data.periode.start, data.periode.end);
  const totalBiaya = data.biayaOperasional.reduce((s, b) => s + b.jumlah, 0);

  const sections: TableSection[] = [
    {
      title: 'Ringkasan Keuangan',
      headers: ['Komponen', 'Jumlah'],
      rows: [
        ['Total Pendapatan', data.totalPendapatan],
        ['Total HPP', data.totalHpp],
        ['Laba Kotor', data.totalLabaKotor],
        ['Total Beban Operasional', data.totalBeban],
        ['Laba Bersih', data.labaBersih],
        ['Total Barang Terjual', data.totalBarangTerjual],
      ],
      currencyColumns: [1],
    },
    {
      title: 'Rincian Biaya Operasional',
      headers: ['Kategori', 'Jumlah'],
      rows: data.biayaOperasional.map(b => [b.nama, b.jumlah]),
      footerRows: [['Total Biaya Operasional', totalBiaya]],
      currencyColumns: [1],
    },
    {
      title: 'Produk Terlaris',
      headers: ['Produk', 'Terjual', 'HPP/Porsi', 'Pendapatan', 'Laba Kotor'],
      rows: data.produkTerlaris.map(p => [
        p.produk,
        p.jumlahTerjual,
        p.hppPerPorsi,
        p.pendapatan,
        p.labaKotor,
      ]),
      currencyColumns: [2, 3, 4],
    },
    {
      title: 'Metode Pembayaran',
      headers: ['Metode', 'Total'],
      rows: data.metodePembayaran.map(m => [m.metode, m.total]),
      currencyColumns: [1],
    },
  ];

  const qrData = generateVerificationQRData({
    title: 'Laporan Laba Rugi',
    periode: periodeStr,
    storeName: storeInfo.name,
    total: data.labaBersih,
    date: new Date().toISOString(),
  });

  await exportProfessionalPDF(storeInfo, sections, {
    title: 'Laporan Keuangan',
    subtitle: 'Laba Rugi & Penjualan',
    periode: periodeStr,
    orientation: opts.orientation || 'portrait',
    showWatermark: false,
    watermarkText: 'LAPORAN RESMI',
    showSignature: true,
    signatureLabel: 'Pemilik / Pimpinan',
    showQR: true,
    qrData,
    filename: `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.pdf`,
  });
}

export function exportLaporanKeuanganExcel(
  data: LaporanKeuanganData,
  opts: ExportWrapperOptions = {}
): void {
  const storeInfo = resolveStoreInfo(opts.storeInfo);
  const periodeStr = formatPeriode(data.periode.start, data.periode.end);
  const totalBiaya = data.biayaOperasional.reduce((s, b) => s + b.jumlah, 0);

  const sections: TableSection[] = [
    {
      title: 'Ringkasan',
      headers: ['Komponen', 'Jumlah'],
      rows: [
        ['Total Pendapatan', data.totalPendapatan],
        ['Total HPP', data.totalHpp],
        ['Laba Kotor', data.totalLabaKotor],
        ['Total Beban Operasional', data.totalBeban],
        ['Laba Bersih', data.labaBersih],
        ['Total Barang Terjual', data.totalBarangTerjual],
      ],
      currencyColumns: [1],
    },
    {
      title: 'Biaya Operasional',
      headers: ['Kategori', 'Jumlah'],
      rows: data.biayaOperasional.map(b => [b.nama, b.jumlah]),
      footerRows: [['Total Biaya Operasional', totalBiaya]],
      currencyColumns: [1],
    },
    {
      title: 'Produk Terlaris',
      headers: ['Produk', 'Terjual', 'HPP/Porsi', 'Pendapatan', 'Laba Kotor'],
      rows: data.produkTerlaris.map(p => [
        p.produk,
        p.jumlahTerjual,
        p.hppPerPorsi,
        p.pendapatan,
        p.labaKotor,
      ]),
      currencyColumns: [2, 3, 4],
    },
    {
      title: 'Metode Pembayaran',
      headers: ['Metode', 'Total'],
      rows: data.metodePembayaran.map(m => [m.metode, m.total]),
      currencyColumns: [1],
    },
  ];

  exportProfessionalExcel(storeInfo, sections, {
    title: 'Laporan Keuangan',
    subtitle: 'Laba Rugi & Penjualan',
    periode: periodeStr,
    filename: `Laporan_Keuangan_${new Date().toISOString().split('T')[0]}.xlsx`,
  });
}

// ─── 3. CASH FLOW ────────────────────────────────────────

export async function exportCashFlowPDF(
  data: CashFlowData,
  opts: ExportWrapperOptions = {}
): Promise<void> {
  const storeInfo = resolveStoreInfo(opts.storeInfo);
  const periodeStr = formatPeriode(data.periode.start, data.periode.end);

  const sections: TableSection[] = [
    {
      title: 'Ringkasan Arus Kas',
      headers: ['Komponen', 'Jumlah'],
      rows: [
        ...(data.saldoAwal !== undefined ? [['Saldo Awal', data.saldoAwal] as (string | number)[]] : []),
        ['Total Pemasukan', data.totalPemasukan],
        ['Total Pengeluaran', data.totalPengeluaran],
        ['Saldo Akhir', data.saldoAkhir],
      ],
      currencyColumns: [1],
    },
  ];

  if (data.kategoriPemasukan?.length) {
    sections.push({
      title: 'Kategori Pemasukan',
      headers: ['Kategori', 'Total'],
      rows: data.kategoriPemasukan.map(k => [k.kategori, k.total]),
      currencyColumns: [1],
    });
  }

  if (data.kategoriPengeluaran?.length) {
    sections.push({
      title: 'Kategori Pengeluaran',
      headers: ['Kategori', 'Total'],
      rows: data.kategoriPengeluaran.map(k => [k.kategori, k.total]),
      currencyColumns: [1],
    });
  }

  sections.push({
    title: 'Rincian Harian',
    headers: ['Tanggal', 'Pemasukan', 'Pengeluaran', 'Saldo'],
    rows: data.ringkasanHarian.map(h => [
      formatDateShort(h.tanggal),
      h.pemasukan,
      h.pengeluaran,
      h.saldo,
    ]),
    currencyColumns: [1, 2, 3],
  });

  const qrData = generateVerificationQRData({
    title: 'Laporan Arus Kas',
    periode: periodeStr,
    storeName: storeInfo.name,
    total: data.saldoAkhir,
    date: new Date().toISOString(),
  });

  await exportProfessionalPDF(storeInfo, sections, {
    title: 'Laporan Arus Kas (Cash Flow)',
    subtitle: 'Pemasukan & Pengeluaran',
    periode: periodeStr,
    orientation: opts.orientation || 'portrait',
    showWatermark: false,
    watermarkText: 'LAPORAN RESMI',
    showSignature: true,
    signatureLabel: 'Pemilik / Pimpinan',
    showQR: true,
    qrData,
    filename: `Cash_Flow_${new Date().toISOString().split('T')[0]}.pdf`,
  });
}

export function exportCashFlowExcel(
  data: CashFlowData,
  opts: ExportWrapperOptions = {}
): void {
  const storeInfo = resolveStoreInfo(opts.storeInfo);
  const periodeStr = formatPeriode(data.periode.start, data.periode.end);

  const sections: TableSection[] = [
    {
      title: 'Ringkasan',
      headers: ['Komponen', 'Jumlah'],
      rows: [
        ...(data.saldoAwal !== undefined ? [['Saldo Awal', data.saldoAwal] as (string | number)[]] : []),
        ['Total Pemasukan', data.totalPemasukan],
        ['Total Pengeluaran', data.totalPengeluaran],
        ['Saldo Akhir', data.saldoAkhir],
      ],
      currencyColumns: [1],
    },
    {
      title: 'Rincian Harian',
      headers: ['Tanggal', 'Pemasukan', 'Pengeluaran', 'Saldo'],
      rows: data.ringkasanHarian.map(h => [
        formatDateShort(h.tanggal),
        h.pemasukan,
        h.pengeluaran,
        h.saldo,
      ]),
      currencyColumns: [1, 2, 3],
    },
  ];

  if (data.kategoriPemasukan?.length) {
    sections.push({
      title: 'Kategori Pemasukan',
      headers: ['Kategori', 'Total'],
      rows: data.kategoriPemasukan.map(k => [k.kategori, k.total]),
      currencyColumns: [1],
    });
  }

  if (data.kategoriPengeluaran?.length) {
    sections.push({
      title: 'Kategori Pengeluaran',
      headers: ['Kategori', 'Total'],
      rows: data.kategoriPengeluaran.map(k => [k.kategori, k.total]),
      currencyColumns: [1],
    });
  }

  exportProfessionalExcel(storeInfo, sections, {
    title: 'Laporan Arus Kas (Cash Flow)',
    subtitle: 'Pemasukan & Pengeluaran',
    periode: periodeStr,
    filename: `Cash_Flow_${new Date().toISOString().split('T')[0]}.xlsx`,
  });
}

// ─── 4. REKAP PENJUALAN ──────────────────────────────────

export async function exportRekapPenjualanPDF(
  data: RekapPenjualanData,
  opts: ExportWrapperOptions = {}
): Promise<void> {
  const storeInfo = resolveStoreInfo(opts.storeInfo);
  const periodeStr = formatPeriode(data.periode.start, data.periode.end);

  const sections: TableSection[] = [
    {
      title: 'Ringkasan Penjualan',
      headers: ['Komponen', 'Nilai'],
      rows: [
        ['Total Penjualan', data.totalPenjualan],
        ['Total Transaksi', data.totalTransaksi],
        ['Total Item Terjual', data.totalItemTerjual],
        ['Rata-rata per Transaksi', data.rataRataPerTransaksi],
      ],
      currencyColumns: [1],
    },
    {
      title: 'Penjualan per Hari',
      headers: ['Tanggal', 'Transaksi', 'Penjualan', 'Item Terjual'],
      rows: data.penjualanPerHari.map(h => [
        formatDateShort(h.tanggal),
        h.jumlahTransaksi,
        h.totalPenjualan,
        h.itemTerjual,
      ]),
      currencyColumns: [2],
    },
    {
      title: 'Produk Terlaris',
      headers: ['Produk', 'Terjual', 'Total'],
      rows: data.produkTerlaris.map(p => [p.produk, p.jumlahTerjual, p.total]),
      currencyColumns: [2],
    },
    {
      title: 'Metode Pembayaran',
      headers: ['Metode', 'Total'],
      rows: data.metodePembayaran.map(m => [m.metode, m.total]),
      currencyColumns: [1],
    },
  ];

  const qrData = generateVerificationQRData({
    title: 'Rekap Penjualan',
    periode: periodeStr,
    storeName: storeInfo.name,
    total: data.totalPenjualan,
    date: new Date().toISOString(),
  });

  await exportProfessionalPDF(storeInfo, sections, {
    title: 'Rekap Penjualan',
    subtitle: 'Ringkasan Transaksi Penjualan',
    periode: periodeStr,
    orientation: opts.orientation || 'portrait',
    showWatermark: false,
    watermarkText: 'LAPORAN RESMI',
    showSignature: true,
    signatureLabel: 'Pemilik / Pimpinan',
    showQR: true,
    qrData,
    filename: `Rekap_Penjualan_${new Date().toISOString().split('T')[0]}.pdf`,
  });
}

export function exportRekapPenjualanExcel(
  data: RekapPenjualanData,
  opts: ExportWrapperOptions = {}
): void {
  const storeInfo = resolveStoreInfo(opts.storeInfo);
  const periodeStr = formatPeriode(data.periode.start, data.periode.end);

  const sections: TableSection[] = [
    {
      title: 'Ringkasan',
      headers: ['Komponen', 'Nilai'],
      rows: [
        ['Total Penjualan', data.totalPenjualan],
        ['Total Transaksi', data.totalTransaksi],
        ['Total Item Terjual', data.totalItemTerjual],
        ['Rata-rata per Transaksi', data.rataRataPerTransaksi],
      ],
      currencyColumns: [1],
    },
    {
      title: 'Penjualan per Hari',
      headers: ['Tanggal', 'Transaksi', 'Penjualan', 'Item Terjual'],
      rows: data.penjualanPerHari.map(h => [
        formatDateShort(h.tanggal),
        h.jumlahTransaksi,
        h.totalPenjualan,
        h.itemTerjual,
      ]),
      currencyColumns: [2],
    },
    {
      title: 'Produk Terlaris',
      headers: ['Produk', 'Terjual', 'Total'],
      rows: data.produkTerlaris.map(p => [p.produk, p.jumlahTerjual, p.total]),
      currencyColumns: [2],
    },
    {
      title: 'Metode Pembayaran',
      headers: ['Metode', 'Total'],
      rows: data.metodePembayaran.map(m => [m.metode, m.total]),
      currencyColumns: [1],
    },
  ];

  exportProfessionalExcel(storeInfo, sections, {
    title: 'Rekap Penjualan',
    subtitle: 'Ringkasan Transaksi Penjualan',
    periode: periodeStr,
    filename: `Rekap_Penjualan_${new Date().toISOString().split('T')[0]}.xlsx`,
  });
}

// ═══════════════════════════════════════════════════════════
// SECTION 9 — BACKWARD-COMPATIBLE ALIASES
// ═══════════════════════════════════════════════════════════

/**
 * Alias kompatibel dengan kode lama yang memakai penamaan `Profesional`.
 */
export const exportNeracaProfesional = exportNeracaPDF;
export const exportNeracaExcelProfesional = exportNeracaExcel;
export const exportLaporanKeuanganProfesional = exportLaporanKeuanganPDF;
export const exportLaporanKeuanganExcelProfesional = exportLaporanKeuanganExcel;
export const exportCashFlowProfesional = exportCashFlowPDF;
export const exportCashFlowExcelProfesional = exportCashFlowExcel;
export const exportRekapPenjualanProfesional = exportRekapPenjualanPDF;
export const exportRekapPenjualanExcelProfesional = exportRekapPenjualanExcel;

// ═══════════════════════════════════════════════════════════
// END OF FILEEEEEE
// ═══════════════════════════════════════════════════════════
