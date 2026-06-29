import { useState, useEffect, useRef, useCallback } from 'react';
import io, { Socket } from 'socket.io-client';
import { API_URL } from '../../config/api';
import { getStoredToken } from '../../auth/storage';

const API_KEY = import.meta.env.VITE_API_KEY;
const STORAGE_KEY = 'kas-notifications-read';
const KAS_NOTIF_ID = 'kas-low-warning';
const POLL_INTERVAL_MS = 60_000;
const DEBOUNCE_MS = 300;

const SETTINGS_API_URL = `${API_URL}/api/common/settings`;
const MODAL_API_URL = `${API_URL}/api/super-admin/modal-utama`;

const SOCKET_EVENTS = [
  'modal:updated', 'modal:tambah', 'modal:prive',
  'modal:created', 'kas:updated', 'settings:updated'
] as const;

interface ModalUtamaResponse {
  saldo_kas?: number;
  saldoKas?: number;
  saldo?: number;
  sisa_modal?: number;
  sisaModal?: number;
  updatedAt?: string;
  riwayat?: Array<{ tanggal?: string }>;
}

export interface KasNotification {
  id: string;
  saldo: number;
  kasWarning: number;
  type: 'warning';
  updatedAt: string;
}

function extractSaldo(modal: ModalUtamaResponse | null): number {
  if (!modal) return 0;
  return modal.saldo_kas ?? modal.saldoKas ?? modal.saldo 
         ?? modal.sisa_modal ?? modal.sisaModal ?? 0;
}

function extractUpdatedAt(modal: ModalUtamaResponse | null): string {
  if (!modal) return new Date().toISOString();
  if (modal.updatedAt) return modal.updatedAt;
  
  if (modal.riwayat?.length) {
    const sorted = [...modal.riwayat]
      .filter(r => r.tanggal)
      .sort((a, b) => new Date(b.tanggal!).getTime() - new Date(a.tanggal!).getTime());
    return sorted[0]?.tanggal || new Date().toISOString();
  }
  
  return new Date().toISOString();
}

export function useKasNotifications() {
  const [notification, setNotification] = useState<KasNotification | null>(null);
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
  const prevSaldoRef = useRef<number | null>(null);
  const prevThresholdRef = useRef<number>(0);
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

  const fetchSettings = useCallback(async (): Promise<number> => {
    try {
      const res = await fetch(SETTINGS_API_URL, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      return data?.kasWarning ?? data?.kas_warning 
             ?? data?.settings?.kasWarning ?? data?.settings?.kas_warning ?? 0;
    } catch (err) {
      console.log('fetchSettings failed:', err);
      return 0;
    }
  }, [getAuthHeaders]);

  const fetchModal = useCallback(async () => {
    try {
      const res = await fetch(MODAL_API_URL, { headers: getAuthHeaders() });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      
      const data = await res.json();
      const modalObj = data?.modal ?? data?.data ?? data?.modalUtama ?? data;
      
      return {
        saldo: extractSaldo(modalObj),
        updatedAt: extractUpdatedAt(modalObj),
      };
    } catch (err) {
      console.log('fetchModal failed:', err);
      return null;
    }
  }, [getAuthHeaders]);

  function evaluate(saldo: number, kasWarning: number, updatedAt: string) {
    const wasAbove = prevSaldoRef.current !== null 
                     && prevSaldoRef.current > prevThresholdRef.current;
    const isBelow = kasWarning > 0 && saldo <= kasWarning;

    if (isBelow) {
      if (wasAbove) {
        setReadIds(prev => {
          const next = new Set(prev);
          next.delete(KAS_NOTIF_ID);
          return next;
        });
      }
      setNotification({ id: KAS_NOTIF_ID, saldo, kasWarning, type: 'warning', updatedAt });
    } else {
      setNotification(null);
    }

    prevSaldoRef.current = saldo;
    prevThresholdRef.current = kasWarning;
  }

  const refresh = useCallback(async () => {
    if (cancelledRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const [kasWarning, modal] = await Promise.all([fetchSettings(), fetchModal()]);
      
      if (cancelledRef.current) return;
      
      if (modal) {
        evaluate(modal.saldo, kasWarning, modal.updatedAt);
      }
    } catch (err) {
      if (!cancelledRef.current) {
        setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi');
      }
    } finally {
      if (!cancelledRef.current) {
        setLoading(false);
      }
    }
  }, [fetchSettings, fetchModal]);

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

  const unreadCount = notification && !readIds.has(notification.id) ? 1 : 0;
  const notifications: KasNotification[] = notification ? [notification] : [];

  const markAsRead = useCallback(() => {
    setReadIds(prev => new Set(prev).add(KAS_NOTIF_ID));
  }, []);

  const clearReadHistory = useCallback(() => {
    setReadIds(new Set());
  }, []);

  return {
    notifications,
    unreadCount,
    loading,
    error, // ✅ Tambah error
    readIds,
    markAsRead,
    markAllAsRead: markAsRead,
    clearReadHistory,
    refresh,
  };
}