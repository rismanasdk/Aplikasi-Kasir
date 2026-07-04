import Transaksi from "../../models/datatransaksi.js";
import Barang from "../../models/databarang.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

// Ringkasan Dashboard Manager
export const getDashboard = async (req, res) => {
  try {
    // Hitung untuk periode bulan ini (sesuai permintaan admin-dashboard)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    // Ambil transaksi selesai pada bulan ini
    const transaksiSelesai = await Transaksi.find({
      status: "selesai",
      tanggal_transaksi: { $gte: startOfMonth, $lte: endOfMonth },
      ...buildBranchFilter(req.user)
    });

    // Ringkasan penjualan (jumlah transaksi selesai bulan ini)
    const totalTransaksi = transaksiSelesai.length;

    // Omset penjualan bulan ini
    const totalOmset = transaksiSelesai.reduce((sum, trx) => sum + (trx.total_harga || 0), 0);

    // Hitung barang terlaris untuk bulan ini
    const barangCounter = {};
    transaksiSelesai.forEach(trx => {
      if (!Array.isArray(trx.barang_dibeli)) return;
      trx.barang_dibeli.forEach(item => {
        const nama = item.nama_barang || item.nama || 'Unknown';
        if (!barangCounter[nama]) {
          barangCounter[nama] = 0;
        }
        barangCounter[nama] += Number(item.jumlah) || 0;
      });
    });

    // Ambil 5 barang teratas
    const barangTerlaris = Object.entries(barangCounter)
      .map(([nama_barang, jumlah]) => ({ nama_barang, jumlah }))
      .sort((a, b) => b.jumlah - a.jumlah)
      .slice(0, 5);

    res.json({
      ringkasan_penjualan: totalTransaksi,
      omset_penjualan: totalOmset,
      barang_terlaris: barangTerlaris
    });
  } catch (error) {
    console.error("Error getDashboard:", error);
    res.status(500).json({ message: error.message });
  }
};

export const getTopBarang = async (req, res) => {
  try {
    const { bulan } = req.query; // Opsional: 'bulan_ini' atau 'kumulatif' (default: bulan_ini)

    let transaksiSelesai;

    if (bulan === 'kumulatif') {
      transaksiSelesai = await Transaksi.find({ status: "selesai", ...buildBranchFilter(req.user) });
    } else {
      // Default: bulan ini
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      transaksiSelesai = await Transaksi.find({
        status: "selesai",
        tanggal_transaksi: { $gte: startOfMonth, $lte: endOfMonth },
        ...buildBranchFilter(req.user)
      });
    }

    // Aggregate per product using accounting fields from transaksi
    const barangMap = {};

    transaksiSelesai.forEach(trx => {
      if (!Array.isArray(trx.barang_dibeli)) return;
      trx.barang_dibeli.forEach(item => {
        const key = item.kode_barang || item.nama_barang || item._id || String(item.nama || item.kode || '');

        if (!barangMap[key]) {
          barangMap[key] = {
            kode_barang: item.kode_barang || key,
            nama_barang: item.nama_barang || item.nama || 'Unknown',
            qty: 0,
            pendapatan: 0,
            modal: 0,
            harga_jual_ref: item.harga_satuan || 0
          };
        }

        const qty = Number(item.jumlah) || 0;
        const hargaFinal = Number(item.harga_satuan) || 0; // harga_final
        const hpp = Number(item.harga_beli) || 0; // hpp per porsi

        barangMap[key].qty += qty;
        barangMap[key].pendapatan += hargaFinal * qty;
        barangMap[key].modal += hpp * qty;
      });
    });

    const barangTerlaris = Object.values(barangMap)
      .map(item => ({
        kode_barang: item.kode_barang,
        nama_barang: item.nama_barang,
        jumlah_terjual: item.qty,
        harga_jual: item.harga_jual_ref,
        pendapatan: item.pendapatan,
        laba_kotor: item.pendapatan - item.modal
      }))
      .sort((a, b) => b.pendapatan - a.pendapatan)
      .slice(0, 5);

    res.json({
      barang_terlaris: barangTerlaris,
      mode: bulan === 'kumulatif' ? 'kumulatif' : 'bulan_ini'
    });
  } catch (error) {
    console.error("Error getTopBarang:", error);
    res.status(500).json({ message: error.message });
  }
};