import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

const BI_BASE = `${API_URL}/api/bi`;

async function biFetch(
  endpoint: string,
  params?: Record<string, string | undefined>
) {
  const searchParams = new URLSearchParams();

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) {
        searchParams.append(key, value);
      }
    }
  }

  const qs = searchParams.toString()
    ? `?${searchParams.toString()}`
    : "";

  const res = await fetch(`${BI_BASE}${endpoint}${qs}`, {
    headers: {
      "Content-Type": "application/json",
      ...(getStoredToken()
        ? { Authorization: `Bearer ${getStoredToken()}` }
        : {}),
    },
  });

  return res.json();
}

export const getRingkasan = (start?: string, end?: string) =>
  biFetch('/ringkasan', { start, end });

export const getInsightHarian = (tanggal?: string) =>
  biFetch('/insight/harian', { tanggal });

export const getInsightMingguan = () =>
  biFetch('/insight/mingguan');

export const getInsightBulanan = () =>
  biFetch('/insight/bulanan');

export const getAnalisisPenurunan = (start?: string, end?: string) =>
  biFetch('/analisis-penurunan', { start, end });

export const getCashFlow = (start?: string, end?: string) =>
  biFetch('/cashflow', { start, end });

export const getAnalisisPengeluaran = (start?: string, end?: string) =>
  biFetch('/pengeluaran', { start, end });

export const getAnomali = (start?: string, end?: string) =>
  biFetch('/anomali', { start, end });

export const getRisikoCashFlow = () =>
  biFetch('/risiko-cashflow');

export const getRekomendasi = () =>
  biFetch('/rekomendasi');