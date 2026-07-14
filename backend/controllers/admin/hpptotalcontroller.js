import ModalUtama from "../../models/modalutama.js";
import HppHarian from "../../models/hpptotal.js";
import Transaksi from "../../models/datatransaksi.js";
import BiayaLayanan from "../../models/biayalayanan.js";
import BiayaOperasional from "../../models/biayaoperasional.js";
import PengeluaranBiaya from "../../models/pengeluaranbiaya.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

// =======================================================
// OTOMATIS UPDATE HPP HARIAN SAAT ADA TRANSAKSI
// =======================================================
export const getHppHarian = async (req, res) => {
  try {
    const { tanggal, startDate, endDate } = req.query;

    let hppData;

    // --- KASUS 1: Ambil data untuk tanggal spesifik ---
    if (tanggal) {
      hppData = await HppHarian.findOne({ tanggal, ...buildBranchFilter(req.user) });
    } 
    
    // --- KASUS 2: Ambil data untuk rentang tanggal ---
    else if (startDate && endDate) {
      hppData = await HppHarian.find({
        ...buildBranchFilter(req.user),
        tanggal: {
          $gte: startDate,
          $lte: endDate,
        },
      }).sort({ tanggal: -1 });
    } 
    
    // --- KASUS 3: Ambil SEMUA DATA jika tidak ada query sama sekali ---
    else if (!tanggal && !startDate && !endDate) {
      hppData = await HppHarian.find(buildBranchFilter(req.user)).sort({ tanggal: -1 });
    }

    res.json({
      success: true,
      data: hppData,
    });

  } catch (err) {
    console.error("Error saat mengambil data HPP:", err);
    res.status(500).json({ 
      message: "Gagal mengambil data HPP", 
      error: err.message 
    });
  }
};

export const getHppSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const filter = { ...buildBranchFilter(req.user) };
    if (startDate && endDate) {
      filter.tanggal = { $gte: startDate, $lte: endDate };
    }

    const data = await HppHarian.find(filter).sort({ tanggal: 1 });

    if (!data.length) {
      return res.json({
        success: true,
        summary: {
          total_hpp: 0,
          total_pendapatan: 0,
          total_laba_kotor: 0,
          total_beban: 0,
          total_laba_bersih: 0
        },
        data: []
      });
    }

    // Ambil biaya
    const biayaLayanan = await BiayaLayanan.findOne(buildBranchFilter(req.user));
    const persenLayanan = biayaLayanan?.persen || 0;

    // Hitung pengeluaran operasional per-hari pada rentang yang diminta
    // Gunakan startDate/endDate jika tersedia, jika tidak gunakan rentang dari data (dokumen HppHarian)
    let matchRange = {};
    if (startDate && endDate) {
      matchRange.tanggal = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (data.length) {
      const firstDate = new Date(data[0].tanggal + 'T00:00:00');
      const lastDate = new Date(data[data.length - 1].tanggal + 'T23:59:59');
      matchRange.tanggal = { $gte: firstDate, $lte: lastDate };
    }

    const pengeluaranAgg = await PengeluaranBiaya.aggregate([
      { $match: matchRange },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$tanggal" } }, total: { $sum: "$jumlah" } } }
    ]);

    const pengeluaranMap = {};
    pengeluaranAgg.forEach(p => {
      pengeluaranMap[p._id] = p.total;
    });

    // total pengeluaran (sum only days that have pengeluaran)
    const totalPengeluaranDalamRentang = Object.values(pengeluaranMap).reduce((s, v) => s + (v || 0), 0);

    // Hitung pengeluaran per kategori (rincian biaya operasional)
    const pengeluaranByKategori = await PengeluaranBiaya.aggregate([
      { $match: matchRange },
      { $group: { _id: "$kategoriId", total: { $sum: "$jumlah" } } },
      { $lookup: { from: "BiayaOperasional", localField: "_id", foreignField: "_id", as: "kategori" } },
      { $unwind: { path: "$kategori", preserveNullAndEmptyArrays: true } },
      { $project: { kategoriId: "$_id", nama: "$kategori.nama", total: 1 } }
    ]);

    const biayaOperasionalDetail = pengeluaranByKategori.map(p => ({
      nama: p.nama || 'Lain-lain',
      jumlah: p.total || 0
    }));

    // Akumulasi harian
    let totalPendapatan = 0;
    let totalHpp = 0;
    let totalLabaKotor = 0;

    // isi total_beban per HppHarian doc berdasarkan pengeluaran hari itu (jika ada)
    data.forEach(d => {
      totalPendapatan += d.total_pendapatan || 0;
      totalHpp += d.total_hpp || 0;
      totalLabaKotor += d.total_laba_kotor || 0;

      // HppHarian.tanggal disimpan sebagai 'YYYY-MM-DD' string
      const tanggalStr = String(d.tanggal);
      d.total_beban = pengeluaranMap[tanggalStr] || 0;
    });

    // Hitung total barang terjual hari ini: prefer dari dokumen HppHarian, fallback ke agregasi Transaksi
    const todayString = new Date().toISOString().slice(0, 10);
    let totalBarangTerjualHariIni = 0;
    const todayDoc = data.find(d => String(d.tanggal) === todayString);
    if (todayDoc && Array.isArray(todayDoc.produk)) {
      totalBarangTerjualHariIni = todayDoc.produk.reduce((s, p) => s + (p.jumlah_terjual || 0), 0);
    } else {
      // fallback: agregasi dari collection Transaksi untuk hari ini
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      try {
        const transaksiToday = await Transaksi.find({ status: "selesai", tanggal_transaksi: { $gte: startOfDay, $lte: endOfDay } });
        totalBarangTerjualHariIni = transaksiToday.reduce((sum, trx) => {
          if (!Array.isArray(trx.barang_dibeli)) return sum;
          return sum + trx.barang_dibeli.reduce((s2, it) => s2 + (Number(it.jumlah) || 0), 0);
        }, 0);
      } catch (e) {
        console.warn('Gagal agregasi Transaksi untuk menghitung total barang terjual hari ini:', e);
        totalBarangTerjualHariIni = 0;
      }
    }

    // Hitung beban bulanan: jumlahkan hanya hari-hari yang memiliki pengeluaran
    const totalBiayaLayanan = (persenLayanan / 100) * totalPendapatan;

    const totalBebanHarian = data.reduce((s, doc) => s + (doc.total_beban > 0 ? doc.total_beban : 0), 0);

    // summary total_beban tetap memasukkan biaya layanan supaya kompatibel dengan sebelumnya
    const totalBebanForSummary = totalBiayaLayanan + totalBebanHarian;

    const labaBersih = totalPendapatan - totalHpp - totalBebanForSummary;

    res.json({
      success: true,
      summary: {
        total_hpp: totalHpp,
        total_pendapatan: totalPendapatan,
        total_laba_kotor: totalLabaKotor,
        total_beban: totalBebanForSummary,
        total_laba_bersih: labaBersih,
        total_barang_terjual_hari_ini: totalBarangTerjualHariIni
      },
      biaya_operasional: {
        rincian_biaya: biayaOperasionalDetail,
        total: totalPengeluaranDalamRentang
      },
      data
    });

  } catch (err) {
    console.error("Error summary HPP:", err);
    res.status(500).json({ message: err.message });
  }
};


export const addTransaksiToHpp = async (req, res) => {
  try {
    // Keep backward-compatible HTTP handler: delegate to helper
    const { nama_produk, jumlah_terjual } = req.body;
    const hppHarian = await upsertHppForSale(nama_produk, jumlah_terjual);
    return res.json({ success: true, data: hppHarian });

  } catch (err) {
    console.error("Error addTransaksiToHpp:", err);
    res.status(500).json({ message: err.message });
  }
};

// Reset total_beban for a given month (YYYY-MM). Recomputes laba_bersih per day.
export const resetMonthlyBeban = async (req, res) => {
  try {
    const { month } = req.body; // expected format: 'YYYY-MM'
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return res.status(400).json({ success: false, message: "Invalid month format. Use 'YYYY-MM'" });
    }

    const regex = new RegExp(`^${month}`);
    const docs = await HppHarian.find({ ...buildBranchFilter(req.user), tanggal: { $regex: regex } });

    if (!docs || !docs.length) {
      return res.json({ success: true, updated: 0, message: "No HppHarian documents found for this month" });
    }

    const ops = docs.map(doc => {
      // compute total_laba_kotor if not present
      const totalLabaKotor = typeof doc.total_laba_kotor === 'number'
        ? doc.total_laba_kotor
        : (Array.isArray(doc.produk) ? doc.produk.reduce((s, p) => s + (p.laba_kotor || 0), 0) : 0);

      doc.total_beban = 0;
      doc.laba_bersih = totalLabaKotor - doc.total_beban;
      return doc.save();
    });

    await Promise.all(ops);

    return res.json({ success: true, updated: docs.length });
  } catch (err) {
    console.error('Error resetMonthlyBeban:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// Helper: update HPP harian given product name and sold quantity
export const upsertHppForSale = async (nama_produk, jumlah_terjual) => {
  try {
    const today = new Date().toISOString().slice(0, 10);

    const modalUtama = await ModalUtama.findOne(buildBranchFilter(req.user));
    if (!modalUtama) {
      throw new Error("Data modal utama tidak ditemukan");
    }

    // Cari produk di modal utama
    const produkData = modalUtama.bahan_baku.find(
      p => p.nama_produk.toLowerCase().trim() === String(nama_produk).toLowerCase().trim()
    );

    if (!produkData) {
      throw new Error(`Produk ${nama_produk} tidak ditemukan.`);
    }

    const jumlah = Number(jumlah_terjual) || 0;
    const hpp_per_porsi = produkData.modal_per_porsi || 0;
    const harga_jual = produkData.harga_jual || 0;

    const hpp_total = hpp_per_porsi * jumlah;
    const pendapatan = harga_jual * jumlah;
    const laba_kotor = pendapatan - hpp_total;

    // Ambil dokumen harian
    let hppHarian = await HppHarian.findOne({ tanggal: today, ...buildBranchFilter(req.user) });

    if (!hppHarian) {
      hppHarian = new HppHarian({
        tanggal: today,
        branch_id: req.user?.branch_id || null,
        produk: [],
        total_hpp: 0,
        total_pendapatan: 0,
        total_laba_kotor: 0
      });
    }

    // Update atau tambah item produk
    const index = hppHarian.produk.findIndex(
      p => p.nama_produk.toLowerCase().trim() === String(nama_produk).toLowerCase().trim()
    );

    if (index !== -1) {
      hppHarian.produk[index].jumlah_terjual = (hppHarian.produk[index].jumlah_terjual || 0) + jumlah;
      hppHarian.produk[index].hpp_total = (hppHarian.produk[index].hpp_total || 0) + hpp_total;
      hppHarian.produk[index].pendapatan = (hppHarian.produk[index].pendapatan || 0) + pendapatan;
      hppHarian.produk[index].laba_kotor = (hppHarian.produk[index].laba_kotor || 0) + laba_kotor;
    } else {
      hppHarian.produk.push({
        nama_produk,
        jumlah_terjual: jumlah,
        hpp_per_porsi,
        hpp_total,
        pendapatan,
        laba_kotor
      });
    }

    // Update total harian (TANPA BEBAN!)
    hppHarian.total_hpp = (hppHarian.total_hpp || 0) + hpp_total;
    hppHarian.total_pendapatan = (hppHarian.total_pendapatan || 0) + pendapatan;
    hppHarian.total_laba_kotor = (hppHarian.total_laba_kotor || 0) + laba_kotor;

    await hppHarian.save();

    return hppHarian;
  } catch (err) {
    console.error("Error upsertHppForSale:", err);
    throw err;
  }
};
