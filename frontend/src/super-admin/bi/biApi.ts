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
    const message = (payload as { message?: string; error?: string } | null)?.message || (payload as { message?: string; error?: string } | null)?.error || 'Gagal mengambil data ringkasan.';
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
    const detail = (responsePayload as { detail?: unknown } | null)?.detail;
    const detailMessage = Array.isArray(detail)
      ? detail.map((item: unknown) => {
          const msg = typeof item === 'object' && item !== null && 'msg' in item ? (item as { msg?: string }).msg : undefined;
          return msg || JSON.stringify(item);
        }).join(' | ')
      : typeof detail === 'string'
      ? detail
      : undefined;
    const message =
      (responsePayload as { message?: string; error?: string } | null)?.message ||
      (responsePayload as { message?: string; error?: string } | null)?.error ||
      detailMessage ||
      'Gagal menghasilkan ringkasan AI.';
    throw new Error(message);
  }

  return responsePayload;
};

export const getCashflow = (start?: string, end?: string) => {
  const fallback = defaultMonthRange();
  return biFetch('/cashflow', {
    startDate: start ?? fallback.start,
    endDate: end ?? fallback.end,
  });
};

export const getProduk = (start?: string, end?: string) => {
  const fallback = defaultMonthRange();
  return biFetch('/produk', {
    start: start ?? fallback.start,
    end: end ?? fallback.end,
  });
};

export const getPersediaan = (start?: string, end?: string) => {
  const fallback = defaultMonthRange();
  return biFetch('/persediaan', {
    start: start ?? fallback.start,
    end: end ?? fallback.end,
  });
};

export const getKeuangan = (start?: string, end?: string) => {
  const fallback = defaultMonthRange();
  return biFetch('/keuangan', {
    start: start ?? fallback.start,
    end: end ?? fallback.end,
  });
};

export const generateAiProduk = async (payload: { produk: Record<string, unknown> }) => {
  const res = await fetch(`${AI_BASE}/produk`, {
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
    const detail = (responsePayload as { detail?: unknown } | null)?.detail;
    const detailMessage = Array.isArray(detail)
      ? detail.map((item: unknown) => {
          const msg = typeof item === 'object' && item !== null && 'msg' in item ? (item as { msg?: string }).msg : undefined;
          return msg || JSON.stringify(item);
        }).join(' | ')
      : typeof detail === 'string'
      ? detail
      : undefined;
    const message =
      (responsePayload as { message?: string; error?: string } | null)?.message ||
      (responsePayload as { message?: string; error?: string } | null)?.error ||
      detailMessage ||
      'Gagal menghasilkan analisis produk.';
    throw new Error(message);
  }

  return responsePayload;
};

export const generateAiPersediaan = async (payload: { persediaan: Record<string, unknown> }) => {
  const res = await fetch(`${AI_BASE}/persediaan`, {
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
    const detail = (responsePayload as { detail?: unknown } | null)?.detail;
    const detailMessage = Array.isArray(detail)
      ? detail.map((item: unknown) => {
          const msg = typeof item === 'object' && item !== null && 'msg' in item ? (item as { msg?: string }).msg : undefined;
          return msg || JSON.stringify(item);
        }).join(' | ')
      : typeof detail === 'string'
      ? detail
      : undefined;
    const message =
      (responsePayload as { message?: string; error?: string } | null)?.message ||
      (responsePayload as { message?: string; error?: string } | null)?.error ||
      detailMessage ||
      'Gagal menghasilkan analisis persediaan.';
    throw new Error(message);
  }

  return responsePayload;
};

export const generateAiCashflow = async (payload: {
  cashflow: {
    kas: number;
    total_modal: number;
    sisa_modal: number;
    kas_masuk: number;
    kas_keluar: number;
    arus_kas_bersih: number;
  };
}) => {
  const res = await fetch(`${AI_BASE}/cashflow`, {
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
    const detail = (responsePayload as { detail?: unknown } | null)?.detail;
    const detailMessage = Array.isArray(detail)
      ? detail.map((item: unknown) => {
          const msg = typeof item === 'object' && item !== null && 'msg' in item ? (item as { msg?: string }).msg : undefined;
          return msg || JSON.stringify(item);
        }).join(' | ')
      : typeof detail === 'string'
      ? detail
      : undefined;
    const message =
      (responsePayload as { message?: string; error?: string } | null)?.message ||
      (responsePayload as { message?: string; error?: string } | null)?.error ||
      detailMessage ||
      'Gagal menghasilkan analisis cashflow.';
    throw new Error(message);
  }

  return responsePayload;
};

export const generateAiKeuangan = async (payload: {
  keuangan: {
    pendapatan: number;
    hpp: number;
    pengeluaran_operasional: number;
    target_omzet: number;
  };
}) => {
  const res = await fetch(`${AI_BASE}/keuangan`, {
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
    const detail = (responsePayload as { detail?: unknown } | null)?.detail;
    const detailMessage = Array.isArray(detail)
      ? detail.map((item: unknown) => {
          const msg = typeof item === 'object' && item !== null && 'msg' in item ? (item as { msg?: string }).msg : undefined;
          return msg || JSON.stringify(item);
        }).join(' | ')
      : typeof detail === 'string'
      ? detail
      : undefined;
    const message =
      (responsePayload as { message?: string; error?: string } | null)?.message ||
      (responsePayload as { message?: string; error?: string } | null)?.error ||
      detailMessage ||
      'Gagal menghasilkan analisis keuangan.';
    throw new Error(message);
  }

  return responsePayload;
};