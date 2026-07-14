import { useState, useEffect, useRef } from "react";
import AppRouter from "./router";
import type { Barang } from "./admin/stok-barang";
import { initializeSocket } from './utils/socket';
import { API_URL } from "./config/api";
import { getStoredToken, getStoredAuth } from "./auth/storage";
import { useAuth } from './auth/hooks/useAuth';
import { resolveBarangFetchMode } from './utils/barangFetchConfig';

const API_KEY = import.meta.env.VITE_API_KEY;

// Inisialisasi socket ketika aplikasi dimulai
initializeSocket();

interface BarangAPI {
  _id: string;
  kode_barang: string;
  nama_barang: string;
  kategori: string;
  harga_beli: number;
  harga_jual: number;
  hargaFinal: number;
  stok: number;
  stok_awal: number;
  stok_minimal?: number;
  gambar_url?: string;
  status?: string;
}

const STOK_BARANG_URL = `${API_URL}/api/barang`;

function App() {
  const [dataBarang, setDataBarang] = useState<Barang[]>([]);
  const auth = useAuth();
  const lastFetchRoleRef = useRef<string | null>(null);
  const fetchErroredRef = useRef<boolean>(false);

  const fetchBarang = async () => {
    try {
      const token = getStoredToken();
      const storedAuth = getStoredAuth<{ role?: { code?: string }; user?: { role?: string } }>();
      const roleCode = (
        auth?.role?.code ||
        auth?.user?.role ||
        storedAuth?.role?.code ||
        storedAuth?.user?.role ||
        ''
      )?.toLowerCase();

      const mode = resolveBarangFetchMode({ token, roleCode });

      // Avoid re-fetching repeatedly for the same role if it previously errored
      if (fetchErroredRef.current && lastFetchRoleRef.current === roleCode) {
        return;
      }

      if (mode === 'public') {
        const res = await fetch(`${STOK_BARANG_URL}?includePending=false`, {
          headers: {
            ...(API_KEY ? { "x-api-key": API_KEY } : {}),
          },
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        const data: BarangAPI[] = await res.json();
        const mapped: Barang[] = data.map((item) => ({
          _id: item._id,
          kode: item.kode_barang,
          nama: item.nama_barang,
          kategori: item.kategori,
          hargaBeli: item.harga_beli,
          hargaJual: item.harga_jual,
          hargaFinal: item.hargaFinal,
          stok: item.stok,
          stok_awal: item.stok_awal,
          stokMinimal: item.stok_minimal || 5,
          gambarUrl: item.gambar_url,
          status: item.stok <= 0 ? "habis" : item.stok <= (item.stok_minimal || 5) ? "hampir habis" : "aman",
          statusBarang: item.status || "pending"
        }));

        fetchErroredRef.current = false;
        lastFetchRoleRef.current = roleCode;
        setDataBarang(mapped);
        return;
      }

      console.debug('App.fetchBarang:', { tokenExists: !!token, roleCode, authReady: auth?.isLoading === false });

      const headers: Record<string, string> = {
        Authorization: `Bearer ${token}`,
        ...(API_KEY ? { "x-api-key": API_KEY } : {}),
      };

      const res = await fetch(STOK_BARANG_URL, { headers });
      if (!res.ok) {
        if (res.status === 403) {
          // mark that this role cannot access barang to avoid repeated retries
          fetchErroredRef.current = true;
          lastFetchRoleRef.current = roleCode;
        }
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      const data: BarangAPI[] = await res.json();

      const mapped: Barang[] = data.map((item) => ({
        _id: item._id,
        kode: item.kode_barang,
        nama: item.nama_barang,
        kategori: item.kategori,
        hargaBeli: item.harga_beli,
        hargaJual: item.harga_jual,
        hargaFinal: item.hargaFinal,
        stok: item.stok,
        stok_awal: item.stok_awal,
        stokMinimal: item.stok_minimal || 5,
        gambarUrl: item.gambar_url,
        status: item.stok <= 0 ? "habis" : item.stok <= (item.stok_minimal || 5) ? "hampir habis" : "aman",
        statusBarang: item.status || "pending"
      }));

      // success
      fetchErroredRef.current = false;
      lastFetchRoleRef.current = roleCode;
      setDataBarang(mapped);
    } catch (error) {
      console.error("Gagal mengambil data barang:", error);
    }
  };

  useEffect(() => {
    let mounted = true;

    const run = async () => {
      if (auth.isLoading) return; // wait until auth finished bootstrapping
      if (!mounted) return;
      await fetchBarang();
    };

    run();

    return () => {
      mounted = false;
    };
  }, [auth.isLoading, auth.isAuthenticated]);

  return (
    <div>
      {/* Render router tanpa auth */}
      <AppRouter dataBarang={dataBarang} setDataBarang={setDataBarang} />
    </div>
  );
}

export default App;
