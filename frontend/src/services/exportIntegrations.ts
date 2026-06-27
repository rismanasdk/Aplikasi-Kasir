/**
 * exportIntegrations.ts
 * ───────────────────────────────────────────────────────────────────────────
 * High-level export wrappers yang menghubungkan data dari halaman
 * dengan professionalExport.ts.
 *
 * File ini HANYA berisi:
 *   1. fetchStoreInfo() — ambil info toko dari API backend
 *   2. Re-export 4 fungsi PDF dan 4 fungsi Excel dari professionalExport.ts
 *      agar semua halaman tetap bisa import dari file ini tanpa perubahan.
 *
 * Semua logika export (layout, tabel, signature, QR, footer) ada di
 * professionalExport.ts. Jangan duplikasi di sini.
 * ───────────────────────────────────────────────────────────────────────────
 */

import { API_URL } from '../config/api';
import { getStoredToken } from '../auth/storage';
import { getStoreInfo, refreshStoreInfoFromAPI } from './professionalExport';
import type { StoreInfo } from './professionalExport';

// ── Re-export semua yang dibutuhkan halaman ──────────────
// Halaman yang sudah import dari exportIntegrations tidak perlu diubah.
export type { PageOrientation, StoreInfo } from './professionalExport';
export {
  // Neraca
  exportNeracaPDF,
  exportNeracaExcel,
  exportNeracaProfesional,        // alias lama
  exportNeracaExcelProfesional,   // alias lama

  // Laporan Keuangan
  exportLaporanKeuanganPDF,
  exportLaporanKeuanganExcel,
  exportLaporanKeuanganProfesional,       // alias lama
  exportLaporanKeuanganExcelProfesional,  // alias lama

  // Cash Flow
  exportCashFlowPDF,
  exportCashFlowExcel,
  exportCashFlowProfesional,       // alias lama
  exportCashFlowExcelProfesional,  // alias lama

  // Rekap Penjualan
  exportRekapPenjualanPDF,
  exportRekapPenjualanExcel,
  exportRekapPenjualanProfesional,       // alias lama
  exportRekapPenjualanExcelProfesional,  // alias lama

  // Utilities
  formatRupiah,
  formatDateLong,
  formatDateShort,
  generateVerificationQRData,
  getStoreInfo,
  getLocalStoreInfo,
  DEFAULT_STORE_INFO,
} from './professionalExport';

// ═══════════════════════════════════════════════════════════
// FETCH STORE INFO DARI API
// ═══════════════════════════════════════════════════════════

const API_KEY = import.meta.env.VITE_API_KEY;

function getHeaders(): HeadersInit {
  const token = getStoredToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
  };
}

/**
 * Ambil store info dari API backend, lalu simpan ke cache lokal
 * sehingga export berikutnya langsung pakai cache tanpa fetch ulang.
 *
 * Panggil fungsi ini sekali di app bootstrap (misalnya di App.tsx):
 *
 *   import { initStoreInfo } from './services/exportIntegrations';
 *   useEffect(() => { initStoreInfo(); }, []);
 */
export async function initStoreInfo(): Promise<StoreInfo> {
  return refreshStoreInfoFromAPI(async () => {
    const res = await fetch(`${API_URL}/api/super-admin/settings`, {
      headers: getHeaders(),
    });
    if (!res.ok) return null;
    const settings = await res.json();
    return getStoreInfo(settings);
  });
}

/**
 * Fetch store info dari API (untuk kebutuhan satu kali saja).
 * Lebih baik pakai initStoreInfo() di bootstrap agar cache terisi,
 * lalu fungsi export akan otomatis pakai cache.
 */
export async function fetchStoreInfo(): Promise<StoreInfo> {
  return initStoreInfo();
}
