import { calculateProdukStats } from './produkHelper.js';

const ensureNumber = (value) => {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num : 0;
};

const buildProdukItem = (item, totalOmzet) => {
  const stok = ensureNumber(item.stok);
  const stokMinimal = ensureNumber(item.stok_minimal ?? item.minimum_stok ?? 0);
  const hargaBeli = ensureNumber(item.harga_beli ?? 0);
  const hargaJual = ensureNumber(item.harga_jual ?? 0);
  const nilaiStok = hargaBeli * stok;

  return {
    kode_barang: item.kode_barang,
    nama_barang: item.nama_barang || '',
    kategori: item.kategori ?? null,
    stok,
    stok_minimal: stokMinimal,
    harga_beli: hargaBeli,
    harga_jual: hargaJual,
    nilai_stok: ensureNumber(nilaiStok),
    jumlah_terjual: ensureNumber(item.jumlah_terjual),
    omzet: ensureNumber(item.omzet),
    last_sold_date: item.last_sold_date ?? null,
    hari_sejak_terjual: item.hari_sejak_terjual ?? null,
    kontribusi_persen: ensureNumber(totalOmzet > 0 ? (ensureNumber(item.omzet) / totalOmzet) * 100 : 0),
  };
};


export const buildPersediaanSummary = (produkPayload) => {
  const semuaProduk = Array.isArray(produkPayload?.semua_produk)
    ? produkPayload.semua_produk
    : [];
    
  const normalizedProduk = semuaProduk.map((item) => ({
    ...item,
    stok: ensureNumber(item.stok),
    stok_minimal: ensureNumber(item.stok_minimal ?? item.minimum_stok ?? 0),
    jumlah_terjual: ensureNumber(item.jumlah_terjual),
    omzet: ensureNumber(item.omzet),
  }));

  const totalOmzet = normalizedProduk.reduce((sum, item) => sum + item.omzet, 0);
  const normalizedWithMetrics = normalizedProduk.map((item) => buildProdukItem(item, totalOmzet));

  const totalStok = normalizedWithMetrics.reduce((sum, item) => sum + item.stok, 0);
  const nilaiPersediaan = normalizedWithMetrics.reduce((sum, item) => sum + item.nilai_stok, 0);

  const produkHabis = normalizedWithMetrics
    .filter((item) => item.stok <= 0)
    .sort((a, b) => a.nama_barang.localeCompare(b.nama_barang));

  const produkHampirHabis = normalizedWithMetrics
    .filter((item) => item.stok > 0 && item.stok <= (item.stok_minimal > 0 ? item.stok_minimal : 1))
    .sort((a, b) => a.stok - b.stok);

  const averageJumlahTerjual = normalizedWithMetrics.length > 0
    ? normalizedWithMetrics.reduce((sum, item) => sum + item.jumlah_terjual, 0) / normalizedWithMetrics.length
    : 0;

  const sortedByJumlahDesc = [...normalizedWithMetrics].sort((a, b) => b.jumlah_terjual - a.jumlah_terjual);
  const topCutoff = sortedByJumlahDesc[Math.max(0, Math.ceil(sortedByJumlahDesc.length * 0.2) - 1)]?.jumlah_terjual ?? 0;
  const fastMoving = normalizedWithMetrics
    .filter((item) => item.jumlah_terjual > averageJumlahTerjual || item.jumlah_terjual >= topCutoff)
    .sort((a, b) => b.jumlah_terjual - a.jumlah_terjual);

  const sortedByJumlahAsc = [...normalizedWithMetrics].sort((a, b) => a.jumlah_terjual - b.jumlah_terjual);
  const bottomCutoff = sortedByJumlahAsc[Math.max(0, Math.ceil(sortedByJumlahAsc.length * 0.2) - 1)]?.jumlah_terjual ?? 0;
  const slowMoving = normalizedWithMetrics
    .filter((item) => item.jumlah_terjual < averageJumlahTerjual || item.jumlah_terjual <= bottomCutoff)
    .sort((a, b) => a.jumlah_terjual - b.jumlah_terjual);

  return {
    total_produk: ensureNumber(produkPayload?.total_produk ?? normalizedWithMetrics.length),
    total_stok: ensureNumber(totalStok),
    nilai_persediaan: ensureNumber(nilaiPersediaan),
    produk_habis: produkHabis,
    produk_hampir_habis: produkHampirHabis,
    fast_moving: fastMoving,
    slow_moving: slowMoving,
    semua_produk: normalizedWithMetrics,
  };
};

export const calculatePersediaanStats = async (startDate, endDate) => {
  const produkStats = await calculateProdukStats(startDate, endDate);
  return buildPersediaanSummary(produkStats);
};

export default {
  buildPersediaanSummary,
  calculatePersediaanStats,
};
