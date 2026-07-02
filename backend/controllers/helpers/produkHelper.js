import Barang from "../../models/databarang.js";
import Transaksi from "../../models/datatransaksi.js";

/**
 * calculateProdukStats
 * Single source of truth for BI Produk statistics.
 * Strategy:
 * 1. Read the complete product catalog from DataBarang.
 * 2. Aggregate transactions in the requested period for sales metrics.
 * 3. Merge both in memory so every product appears, including zero-sales products.
 */
export const calculateProdukStats = async (startDate, endDate) => {
  const semuaProdukDb = await Barang.find().lean();

  const transaksiAgg = await Transaksi.aggregate([
    {
      $match: {
        tanggal_transaksi: { $gte: startDate, $lte: endDate },
        status: "selesai",
      },
    },
    { $unwind: "$barang_dibeli" },
    {
      $group: {
        _id: "$barang_dibeli.kode_barang",
        total_jumlah: { $sum: "$barang_dibeli.jumlah" },
        total_omzet: { $sum: "$barang_dibeli.subtotal" },
        last_sold_date: { $max: "$tanggal_transaksi" },
      },
    },
  ]).allowDiskUse(true);

  const transaksiMap = new Map();
  transaksiAgg.forEach((item) => {
    if (item && item._id) {
      transaksiMap.set(item._id, item);
    }
  });

  const semuaProduk = semuaProdukDb.map((produk) => {
    const kodeBarang = produk.kode_barang || String(produk._id);
    const transaksiItem = transaksiMap.get(kodeBarang) || null;

    const jumlahTerjual = transaksiItem ? Number(transaksiItem.total_jumlah || 0) : 0;
    const omzet = transaksiItem ? Number(transaksiItem.total_omzet || 0) : 0;
    const lastSoldDate = transaksiItem && transaksiItem.last_sold_date ? new Date(transaksiItem.last_sold_date) : null;

    return {
      kode_barang: kodeBarang,
      nama_barang: produk.nama_barang || "",
      kategori: produk.kategori || null,
      stok: typeof produk.stok === "number" ? produk.stok : Number(produk.stok || 0),
      stok_minimal: typeof produk.stok_minimal === "number" ? produk.stok_minimal : Number(produk.stok_minimal || 0),
      harga_beli: typeof produk.harga_beli === "number" ? produk.harga_beli : Number(produk.harga_beli || 0),
      harga_jual: typeof produk.harga_jual === "number" ? produk.harga_jual : Number(produk.harga_jual || 0),
      hargaFinal: typeof produk.hargaFinal === "number" ? produk.hargaFinal : Number(produk.hargaFinal || 0),
      jumlah_terjual: jumlahTerjual,
      omzet,
      last_sold_date: lastSoldDate ? lastSoldDate.toISOString().split('T')[0] : null,
    };
  });

  const totalProduk = semuaProduk.length;
  const produkAktif = semuaProduk.filter((item) => item.jumlah_terjual > 0).length;
  const produkStagnan = semuaProduk.filter((item) => item.jumlah_terjual === 0).length;
  const totalProdukTerjual = semuaProduk.reduce((sum, item) => sum + item.jumlah_terjual, 0);
  const totalOmzet = semuaProduk.reduce((sum, item) => sum + item.omzet, 0);

  // Helper to ensure numeric values are safe
  const ensureNumber = (val) => {
    const num = Number(val || 0);
    return Number.isFinite(num) ? num : 0;
  };

  const sortedByJumlahDesc = [...semuaProduk].sort((a, b) => b.jumlah_terjual - a.jumlah_terjual);
  const sortedByJumlahAsc = [...semuaProduk].sort((a, b) => a.jumlah_terjual - b.jumlah_terjual);

  const topSelling = sortedByJumlahDesc.slice(0, 5).map((item) => ({
    kode_barang: item.kode_barang,
    nama_barang: item.nama_barang,
    kategori: item.kategori,
    stok: ensureNumber(item.stok),
    jumlah_terjual: ensureNumber(item.jumlah_terjual),
    omzet: ensureNumber(item.omzet),
    kontribusi_persen: ensureNumber(totalOmzet > 0 ? (item.omzet / totalOmzet) * 100 : 0),
    last_sold_date: item.last_sold_date,
  }));

  const bottomSelling = sortedByJumlahAsc.slice(0, 5).map((item) => ({
    kode_barang: item.kode_barang,
    nama_barang: item.nama_barang,
    kategori: item.kategori,
    stok: ensureNumber(item.stok),
    jumlah_terjual: ensureNumber(item.jumlah_terjual),
    omzet: ensureNumber(item.omzet),
    kontribusi_persen: ensureNumber(totalOmzet > 0 ? (item.omzet / totalOmzet) * 100 : 0),
    last_sold_date: item.last_sold_date,
  }));

  const stagnanProduk = semuaProduk.filter((item) => item.jumlah_terjual === 0).map((item) => ({
    kode_barang: item.kode_barang,
    nama_barang: item.nama_barang,
    kategori: item.kategori,
    stok: ensureNumber(item.stok),
    jumlah_terjual: ensureNumber(item.jumlah_terjual),
    omzet: ensureNumber(item.omzet),
    kontribusi_persen: ensureNumber(totalOmzet > 0 ? (item.omzet / totalOmzet) * 100 : 0),
    last_sold_date: item.last_sold_date,
  }));

  return {
    total_produk: ensureNumber(totalProduk),
    produk_aktif: ensureNumber(produkAktif),
    produk_stagnan: ensureNumber(produkStagnan),
    total_produk_terjual: ensureNumber(totalProdukTerjual),
    total_omzet: ensureNumber(totalOmzet),
    top_selling: topSelling,
    bottom_selling: bottomSelling,
    stagnan_produk: stagnanProduk,
    semua_produk: semuaProduk.map((item) => ({
      kode_barang: item.kode_barang,
      nama_barang: item.nama_barang,
      kategori: item.kategori,
      stok: ensureNumber(item.stok),
      stok_minimal: ensureNumber(item.stok_minimal),
      harga_beli: ensureNumber(item.harga_beli),
      harga_jual: ensureNumber(item.harga_jual),
      hargaFinal: ensureNumber(item.hargaFinal),
      jumlah_terjual: ensureNumber(item.jumlah_terjual),
      omzet: ensureNumber(item.omzet),
      kontribusi_persen: ensureNumber(totalOmzet > 0 ? (item.omzet / totalOmzet) * 100 : 0),
      last_sold_date: item.last_sold_date,
    })),
  };
};

export default {
  calculateProdukStats,
};
