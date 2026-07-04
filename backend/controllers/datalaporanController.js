import Laporan from "../models/datalaporan.js";
import Transaksi from "../models/datatransaksi.js";
import { buildBranchFilter, validateAndInjectBranch } from "../utils/rbacHelper.js";

// Ambil semua Laporan
export const getAllLaporan = async (req, res) => {
  try {
    const laporan = await Laporan.find(buildBranchFilter(req.user));
    res.json(laporan);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Tambah Laporan
export const createLaporan = async (req, res) => {
  try {
    const validation = validateAndInjectBranch(req, true);
    if (!validation.isValid) {
      return res.status(403).json({ message: validation.error || "Branch tidak valid" });
    }

    const laporan = new Laporan(req.body);
    await laporan.save();
    res.status(201).json({ message: "Laporan berhasil ditambahkan!", laporan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Update Laporan
export const updateLaporan = async (req, res) => {
  try {
    const branchFilter = buildBranchFilter(req.user);
    const laporan = await Laporan.findOneAndUpdate({ _id: req.params.id, ...branchFilter }, req.body, { new: true });
    if (!laporan) return res.status(404).json({ message: "Laporan tidak ditemukan" });
    res.json({ message: "Laporan berhasil diperbarui!", laporan });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Hapus Laporan
export const deleteLaporan = async (req, res) => {
  try {
    const branchFilter = buildBranchFilter(req.user);
    const laporan = await Laporan.findOneAndDelete({ _id: req.params.id, ...branchFilter });
    if (!laporan) return res.status(404).json({ message: "Laporan tidak ditemukan" });
    res.json({ message: "Laporan berhasil dihapus!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



// Fungsi untuk update laporan ketika ada transaksi selesai
export const updateLaporanDenganTransaksi = async (trx) => {
  const tanggal = trx.tanggal_transaksi ? new Date(trx.tanggal_transaksi) : new Date();
  const startOfMonth = new Date(tanggal.getFullYear(), tanggal.getMonth(), 1, 0, 0, 0);
  const endOfMonth = new Date(tanggal.getFullYear(), tanggal.getMonth() + 1, 0, 23, 59, 59);

  // Cari laporan bulan transaksi ini (rentang)
  let laporan = await Laporan.findOne({
    branch_id: trx.branch_id,
    "periode.start": { $lte: tanggal },
    "periode.end": { $gte: tanggal }
  });

  // Kalau belum ada, bikin baru untuk bulan ini
  if (!laporan) {
    laporan = new Laporan({
      branch_id: trx.branch_id,
      laporan_penjualan: { harian: [], mingguan: [], bulanan: [] },
      periode: { start: startOfMonth, end: endOfMonth },
      laba: { total_laba: 0, detail: [] },
      pengeluaran: 0,
      rekap_metode_pembayaran: []
    });
  }

  // === Update harian (idempotent) ===
  const tglStr = tanggal.toISOString().split("T")[0];
  let harian = laporan.laporan_penjualan.harian.find(h => {
    if (!h) return false;
    if (h.tanggal instanceof Date) return h.tanggal.toISOString().split("T")[0] === tglStr;
    return String(h.tanggal) === tglStr;
  });

  // Pastikan transaksi belum ada di laporan harian untuk menghindari double count
  const alreadyRecorded = harian && Array.isArray(harian.transaksi) && harian.transaksi.some(t => t && (t.order_id === trx.order_id || t.nomor_transaksi === trx.nomor_transaksi));
  if (alreadyRecorded) {
    return; // sudah ter-record, tidak perlu update ulang
  }

  if (!harian) {
    laporan.laporan_penjualan.harian.push({
      tanggal: tglStr,
      transaksi: [{ nomor_transaksi: trx.nomor_transaksi, order_id: trx.order_id, total_harga: trx.total_harga, barang_dibeli: trx.barang_dibeli, tanggal_transaksi: tanggal }],
      total_harian: trx.total_harga
    });
  } else {
    harian.transaksi = harian.transaksi || [];
    harian.transaksi.push({ nomor_transaksi: trx.nomor_transaksi, order_id: trx.order_id, total_harga: trx.total_harga, barang_dibeli: trx.barang_dibeli, tanggal_transaksi: tanggal });
    harian.total_harian = (harian.total_harian || 0) + trx.total_harga;
  }

  // === Update mingguan ===
  const weekNumber = Math.ceil((tanggal.getDate()) / 7);
  let mingguan = laporan.laporan_penjualan.mingguan.find(m => m.minggu_ke === weekNumber);

  if (!mingguan) {
    laporan.laporan_penjualan.mingguan.push({
      minggu_ke: weekNumber,
      jumlah_transaksi: 1,
      total_penjualan: trx.total_harga
    });
  } else {
    mingguan.jumlah_transaksi += 1;
    mingguan.total_penjualan += trx.total_harga;
  }

  // === Update bulanan ===
  const bulanKey = `${tanggal.getFullYear()}-${String(tanggal.getMonth() + 1).padStart(2, '0')}`;
  let bulanan = laporan.laporan_penjualan.bulanan.find(b => b.bulan === bulanKey);

  if (!bulanan) {
    laporan.laporan_penjualan.bulanan.push({
      bulan: bulanKey,
      jumlah_transaksi: 1,
      total_penjualan: trx.total_harga
    });
  } else {
    bulanan.jumlah_transaksi += 1;
    bulanan.total_penjualan += trx.total_harga;
  }

  // === Update rekap metode pembayaran ===
  let metode = laporan.rekap_metode_pembayaran.find(m => m.metode === trx.metode_pembayaran);
  if (!metode) {
    laporan.rekap_metode_pembayaran.push({
      metode: trx.metode_pembayaran,
      total: trx.total_harga
    });
  } else {
    metode.total += trx.total_harga;
  }

  // Update detail laba snapshots (immutable economics). Do not store derived profit values.
  laporan.laba.detail = laporan.laba.detail || [];
  if (Array.isArray(trx.barang_dibeli)) {
    const Barang = (await import('../models/databarang.js')).default;
    for (const item of trx.barang_dibeli) {
      const jumlah = item.jumlah || 1;

      let master = null;
      try {
        master = await Barang.findOne({
          $or: [
            (item.kode_barang ? { kode_barang: item.kode_barang } : null),
            (item.nama_barang ? { nama_barang: item.nama_barang } : null)
          ].filter(Boolean)
        }).lean();
      } catch (e) {
        master = null;
      }

      const harga_produk = master?.harga_jual ?? item.harga_satuan ?? 0;
      const hpp = master?.harga_beli ?? (typeof item.harga_beli === 'number' ? item.harga_beli : 0);
      const harga_final = master?.hargaFinal ?? (typeof item.harga_final === 'number' ? item.harga_final : (typeof item.subtotal === 'number' && jumlah > 0 ? item.subtotal / jumlah : harga_produk));

      const subtotal_produk = harga_produk * jumlah;
      const subtotal_final = (typeof item.subtotal === 'number') ? item.subtotal : harga_final * jumlah;

      laporan.laba.detail.push({
        kode_barang: item.kode_barang,
        produk: item.nama_barang,
        hpp,
        harga_produk,
        harga_final,
        jumlah,
        subtotal_produk,
        subtotal_final
      });
    }
  }

  await laporan.save();
};
