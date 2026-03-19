import { useState, useEffect } from "react";
import AppRouter from "./router";
import type { Barang } from "./admin/stok-barang";
import { initializeSocket } from './utils/socket';
import { API_URL } from "./config/api";
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

  const fetchBarang = async () => {
    try {
      const res = await fetch(STOK_BARANG_URL);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
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

      setDataBarang(mapped);
    } catch (error) {
      console.error("Gagal mengambil data barang:", error);
    }
  };

  useEffect(() => {
    fetchBarang();
  }, []);

  return (
    <div>
      {/* Render router tanpa auth */}
      <AppRouter dataBarang={dataBarang} setDataBarang={setDataBarang} />
    </div>
  );
}

export default App;
