import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';
import { defaultMonthRange } from './utils/dateUtils';

const BI_BASE = `${API_URL}/api/super-admin/laporan`;
const AI_BASE = `${API_URL}/api/bi`;

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

  const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
  const res = await fetch(`${BI_BASE}${endpoint}${qs}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
    },
  });

  const payload = await res.json().catch(() => null);

  if (!res.ok) {
    const message = payload?.message || payload?.error || 'Gagal mengambil data ringkasan.';
    throw new Error(message);
  }

  return payload;
}

export const getRingkasan = (start?: string, end?: string) => {
  const fallback = defaultMonthRange();
  return biFetch('/ringkasan', {
    start: start ?? fallback.start,
    end: end ?? fallback.end,
  });
};

export const generateAiRingkasan = async (payload: {
  ringkasan: {
    total_pendapatan: number;
    total_hpp: number;
    total_laba_kotor: number;
    total_biaya_operasional: number;
    total_laba_bersih: number;
    total_barang_terjual: number;
    target: number;
  };
}) => {
  const res = await fetch(`${AI_BASE}/ringkasan`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(getStoredToken() ? { Authorization: `Bearer ${getStoredToken()}` } : {}),
    },
    body: JSON.stringify(payload),
  });

  const responsePayload = await res.json().catch(() => null);

  if (!res.ok) {
    const detail = responsePayload?.detail;
    const detailMessage = Array.isArray(detail)
      ? detail.map((item: any) => item?.msg || JSON.stringify(item)).join(' | ')
      : typeof detail === 'string'
      ? detail
      : undefined;
    const message =
      responsePayload?.message ||
      responsePayload?.error ||
      detailMessage ||
      'Gagal menghasilkan ringkasan AI.';
    throw new Error(message);
  }

  return responsePayload;
};