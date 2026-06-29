import { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

const API_KEY = import.meta.env.VITE_API_KEY;
const STORAGE_KEY = 'liabilitas-notifications-read';
const POLL_INTERVAL_MS = 60_000;
const DEBOUNCE_MS = 300;

const KEWAJIBAN_API_URL = `${API_URL}/api/super-admin/kewajiban`;

const SOCKET_EVENTS = [
  'kewajiban:created',
  'kewajiban:updated', 
  'kewajiban:deleted',
  'kewajiban:paid',
  'kewajiban:cancel'
] as const;

interface KewajibanAPIResponse {
  _id: string;
  nama: string;
  jumlah_awal: number;
  sisa_jumlah?: number;
  tanggal: string;
  jatuh_tempo?: string;
  status: string;
  updatedAt?: string;
}

export interface LiabilitasNotification {
  id: string;
  nama: string;
  sisa_jumlah: number;
  jatuh_tempo: string;
  type: 'today' | 'tomorrow';
  updatedAt: string;
}

// ✅ FIX: Pakai toLocaleDateString (bukan toLocaleString) agar hasilnya murni "YYYY-MM-DD" tanpa jam
const toLocalDateStr = (date: Date | string): string => {
  return new Date(date).toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
};

const getDateStr = (offsetDays: number = 0): string => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Jakarta' });
};

function normalizeNotifications(items: KewajibanAPIResponse[]): LiabilitasNotification[] {
  const todayStr = getDateStr(0);
  const tomorrowStr = getDateStr(1);

  return items
    .filter(item => {
      if (item.status === 'lunas' || item.status === 'dibatalkan') return false;
      if (!item.jatuh_tempo) return false;
      
      const itemDateStr = toLocalDateStr(item.jatuh_tempo);
      
      return itemDateStr === todayStr || itemDateStr === tomorrowStr;
    })
    .map(item => {
      const itemDateStr = toLocalDateStr(item.jatuh_tempo!);
      return {
        id: item._id,
        nama: item.nama,
        sisa_jumlah: item.sisa_jumlah ?? item.jumlah_awal,
        jatuh_tempo: item.jatuh_tempo!,
        type: (itemDateStr === todayStr ? 'today' : 'tomorrow') as 'today' | 'tomorrow',
        updatedAt: item.updatedAt || item.tanggal,
      };
    });
}

export function useLiabilitasNotifications() {
  const [notifications, setNotifications] = useState<LiabilitasNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [readIds, setReadIds] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const socketRef = useRef<Socket | null>(null);
  const cancelledRef = useRef(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getAuthHeaders = useCallback((): HeadersInit => {
    const token = getStoredToken();
    if (!token) throw new Error('Sesi login tidak ditemukan');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(API_KEY ? { 'x-api-key': API_KEY } : {}),
    };
  }, []);

  const fetchKewajiban = useCallback(async (): Promise<LiabilitasNotification[]> => {
    try {
      const res = await fetch(KEWAJIBAN_API_URL, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const json = await res.json();
      const items: KewajibanAPIResponse[] = Array.isArray(json) 
        ? json 
        : Array.isArray(json?.data) 
          ? json.data 
          : [];
          
      return normalizeNotifications(items);
    } catch (err) {
      console.log('fetchKewajiban failed:', err);
      throw err;
    }
  }, [getAuthHeaders]);

  const refresh = useCallback(async () => {
    if (cancelledRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const dueItems = await fetchKewajiban();
      
      if (cancelledRef.current) return;
      
      setNotifications(dueItems);
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi liabilitas');
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [fetchKewajiban]);

  const debouncedRefresh = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(refresh, DEBOUNCE_MS);
  }, [refresh]);

  // Persist readIds
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(readIds)));
    } catch { /* quota error */ }
  }, [readIds]);

  // Main effect
  useEffect(() => {
    cancelledRef.current = false;
    refresh();

    const token = getStoredToken();
    socketRef.current = io(API_URL, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
    });

    SOCKET_EVENTS.forEach(evt => {
      socketRef.current?.on(evt, debouncedRefresh);
    });

    const pollInterval = setInterval(debouncedRefresh, POLL_INTERVAL_MS);

    return () => {
      cancelledRef.current = true;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      SOCKET_EVENTS.forEach(evt => socketRef.current?.off(evt));
      socketRef.current?.disconnect();
      socketRef.current = null;
      clearInterval(pollInterval);
    };
  }, [refresh, debouncedRefresh]);

  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length;

  const markAsRead = useCallback((id: string) => {
    setReadIds(prev => new Set(prev).add(id));
  }, []);

  const markAllAsRead = useCallback(() => {
    setReadIds(prev => {
      const next = new Set(prev);
      notifications.forEach(n => next.add(n.id));
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
    error,
    readIds,
    markAsRead,
    markAllAsRead,
    clearReadHistory,
    refresh,
  };
}