import { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

const API_KEY = import.meta.env.VITE_API_KEY;
const STORAGE_KEY = 'stock-notifications-read';

export type NotificationType = 'low' | 'out';

export interface StockNotification {
  id: string;          // = barang._id
  nama: string;
  kode: string;
  stok: number;
  stokMinimal: number;
  type: NotificationType;
  updatedAt: string;   // ISO string — terakhir kali status berubah
}

interface BarangAPI {
  _id: string;
  kode_barang: string;
  nama_barang: string;
  stok: number;
  stok_minimal?: number;
  updatedAt?: string;
  status_stok?: string;
}

/**
 * Hook untuk menghitung & memantau notifikasi stok.
 *
 * Strategi:
 *  1. Fetch sekali semua barang dari /api/super-admin/stok-barang
 *  2. Listen socket events supaya real-time:
 *     - barang:created  -> tambah item baru
 *     - barang:updated  -> update item
 *     - stockUpdated    -> update stok saja
 *     - barang:deleted  -> hapus item
 *  3. Simpan "read" state di localStorage supaya unread count
 *     nggak hilang pas refresh.
 */
export function useStockNotifications(defaultLowStockAlert = 5) {
  const [notifications, setNotifications] = useState<StockNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return new Set();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set();
    }
  });
  const socketRef = useRef<Socket | null>(null);
  // Cache barang mentah supaya pas socket event masuk, kita bisa
  // recompute notifikasi dari data terbaru tanpa harus fetch ulang.
  const barangCacheRef = useRef<Map<string, BarangAPI>>(new Map());

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = getStoredToken();
    if (!token) {
      throw new Error('Sesi login tidak ditemukan. Silakan login ulang.');
    }
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  }, []);

  /** Recompute notifikasi dari cache barang yang ada di memori. */
  const recompute = useCallback(() => {
    const items = Array.from(barangCacheRef.current.values());
    const next: StockNotification[] = [];

    for (const item of items) {
      const stok = item.stok ?? 0;
      const threshold = item.stok_minimal ?? defaultLowStockAlert;

      // Hanya muncul di notifikasi kalau stok <= threshold
      if (stok <= threshold) {
        next.push({
          id: item._id,
          nama: item.nama_barang,
          kode: item.kode_barang,
          stok,
          stokMinimal: threshold,
          type: stok === 0 ? 'out' : 'low',
          updatedAt: item.updatedAt ?? new Date().toISOString(),
        });
      }
    }

    // Urut: habis stok dulu, lalu stok paling sedikit, lalu terbaru
    next.sort((a, b) => {
      if (a.type === 'out' && b.type !== 'out') return -1;
      if (a.type !== 'out' && b.type === 'out') return 1;
      if (a.stok !== b.stok) return a.stok - b.stok;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });

    setNotifications(next);
  }, [defaultLowStockAlert]);

  /** Fetch awal semua barang. */
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/super-admin/stok-barang`, {
        headers: getAuthHeaders(),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BarangAPI[] = await res.json();

      const map = new Map<string, BarangAPI>();
      data.forEach((item) => map.set(item._id, item));
      barangCacheRef.current = map;
      recompute();
    } catch (err) {
      console.error('[useStockNotifications] gagal fetch barang:', err);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, recompute]);

  /** Upser satu barang ke cache, lalu recompute. */
  const upsertBarang = useCallback(
    (b: BarangAPI) => {
      barangCacheRef.current.set(b._id, b);
      recompute();
    },
    [recompute],
  );

  /** Hapus barang dari cache, lalu recompute. */
  const removeBarang = useCallback(
    (id: string) => {
      barangCacheRef.current.delete(id);
      // Bersihin juga dari readIds supaya nggak bocor memory
      setReadIds((prev) => {
        if (!prev.has(id)) return prev;
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      recompute();
    },
    [recompute],
  );

  /** Update stok saja (untuk event stockUpdated). */
  const updateStok = useCallback(
    (payload: { id: string; stok: number; status?: string }) => {
      const existing = barangCacheRef.current.get(payload.id);
      if (!existing) return;
      barangCacheRef.current.set(payload.id, {
        ...existing,
        stok: payload.stok,
        updatedAt: new Date().toISOString(),
      });
      recompute();
    },
    [recompute],
  );

  // === Persist readIds ke localStorage tiap kali berubah ===
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(readIds)));
    } catch {
      // ignore quota error
    }
  }, [readIds]);

  // === Initial fetch + socket setup ===
  useEffect(() => {
    fetchAll();

    socketRef.current = io(`${API_URL}`);

    socketRef.current.on('barang:created', (b: BarangAPI) => upsertBarang(b));
    socketRef.current.on('barang:updated', (b: BarangAPI) => upsertBarang(b));
    socketRef.current.on('stockUpdated', (p: { id: string; stok: number; status?: string }) =>
      updateStok(p),
    );
    socketRef.current.on('barang:deleted', (p: { id: string }) => removeBarang(p.id));

    // Saat settings.lowStockAlert berubah, fetch ulang supaya threshold
    // baru dari server (stok_minimal) ikut dipakai.
    socketRef.current.on('settings:updated', () => fetchAll());

    return () => {
      socketRef.current?.off('barang:created');
      socketRef.current?.off('barang:updated');
      socketRef.current?.off('stockUpdated');
      socketRef.current?.off('barang:deleted');
      socketRef.current?.off('settings:updated');
      socketRef.current?.disconnect();
      socketRef.current = null;
    };
  }, [fetchAll, upsertBarang, updateStok, removeBarang]);

  // === Public API ===
  const unreadCount = notifications.filter((n) => !readIds.has(n.id)).length;

  const markAsRead = useCallback((id: string) => {
    setReadIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds((prev) => {
      const next = new Set(prev);
      notifications.forEach((n) => next.add(n.id));
      return next;
    });
  }, [notifications]);

  const clearReadHistory = useCallback(() => {
    setReadIds(new Set());
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    readIds,
    markAsRead,
    markAllAsRead,
    clearReadHistory,
    refresh: fetchAll,
  };
}
