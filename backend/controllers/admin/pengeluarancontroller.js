import PengeluaranBiaya from "../../models/pengeluaranbiaya.js";
import BiayaOperasional from "../../models/biayaoperasional.js";
import ModalUtama from "../../models/modalutama.js";
import HppHarian from "../../models/hpptotal.js";
import { updateAllBarangHargaFinal } from "./biayaoperasionalcontroller.js";

// POST /api/admin/pengeluaran-biaya
export const createPengeluaran = async (req, res) => {
  try {
    const { kategoriId, jumlah, tanggal, keterangan } = req.body;

    if (!kategoriId) return res.status(400).json({ message: "kategoriId wajib diisi" });
    if (!jumlah || Number(jumlah) <= 0) return res.status(400).json({ message: "jumlah harus > 0" });
    if (!tanggal) return res.status(400).json({ message: "tanggal wajib diisi" });

    // verify kategori exists
    const kategori = await BiayaOperasional.findById(kategoriId);
    if (!kategori) return res.status(404).json({ message: "Kategori tidak ditemukan" });

    // verify ModalUtama exists and saldo_kas cukup
    const modal = await ModalUtama.findOne();
    if (!modal) return res.status(400).json({ message: "Modal utama belum dibuat. Tidak dapat membuat pengeluaran." });
    if ((modal.saldo_kas || 0) < Number(jumlah)) {
      return res.status(400).json({ message: `Saldo kas tidak cukup. Saldo kas: ${modal.saldo_kas || 0}, dibutuhkan: ${jumlah}.` });
    }

    const doc = new PengeluaranBiaya({
      kategoriId,
      jumlah: Number(jumlah),
      tanggal: new Date(tanggal),
      keterangan: keterangan || null,
    });

    // Save pengeluaran and deduct kas atomically-ish
    await doc.save();
    modal.saldo_kas = (modal.saldo_kas || 0) - Number(jumlah);
    modal.riwayat.push({
      keterangan: keterangan || `Pengeluaran operasional (${kategori?.nama || kategoriId})`,
      tipe: "pengeluaran",
      jumlah: Number(jumlah),
      saldo_setelah: modal.saldo_kas,
    });
    await modal.save();
    await updateAllBarangHargaFinal();

    // Update HppHarian.total_beban untuk tanggal pengeluaran (gunakan string YYYY-MM-DD)
    try {
      const tanggalStr = new Date(tanggal).toISOString().slice(0, 10);
      let hppDoc = await HppHarian.findOne({ tanggal: tanggalStr });
      if (!hppDoc) {
        hppDoc = new HppHarian({
          tanggal: tanggalStr,
          produk: [],
          total_hpp: 0,
          total_pendapatan: 0,
          total_laba_kotor: 0,
          total_beban: Number(jumlah) || 0,
          laba_bersih: (0) - (Number(jumlah) || 0)
        });
      } else {
        hppDoc.total_beban = (hppDoc.total_beban || 0) + Number(jumlah);
        // recalc laba_bersih = total_pendapatan - total_hpp - total_beban
        hppDoc.laba_bersih = (hppDoc.total_pendapatan || 0) - (hppDoc.total_hpp || 0) - (hppDoc.total_beban || 0);
      }
      await hppDoc.save();
    } catch (e) {
      console.warn('Gagal update HppHarian saat createPengeluaran:', e.message || e);
    }

    res.json({ message: "Pengeluaran berhasil dibuat", data: doc });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal membuat pengeluaran", error: err.message });
  }
};

// GET /api/admin/pengeluaran-biaya?start=YYYY-MM-DD&end=YYYY-MM-DD
export const listPengeluaran = async (req, res) => {
  try {
    const { start, end } = req.query;
    const match = {};
    if (start || end) {
      match.tanggal = {};
      if (start) match.tanggal.$gte = new Date(start);
      if (end) {
        const d = new Date(end);
        d.setHours(23, 59, 59, 999);
        match.tanggal.$lte = d;
      }
    }

    const data = await PengeluaranBiaya.find(match).sort({ tanggal: -1 }).populate("kategoriId");
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal mengambil data pengeluaran", error: err.message });
  }
};

// DELETE /api/admin/pengeluaran-biaya/:id
export const deletePengeluaran = async (req, res) => {
  try {
    const { id } = req.params;
    const doc = await PengeluaranBiaya.findById(id);
    if (!doc) return res.status(404).json({ message: "Pengeluaran tidak ditemukan" });

    const jumlah = Number(doc.jumlah || 0);
    const tanggalStr = doc.tanggal ? new Date(doc.tanggal).toISOString().slice(0, 10) : null;

    // Hapus dokumen pengeluaran
    await PengeluaranBiaya.deleteOne({ _id: id });
    await updateAllBarangHargaFinal();

    // Kembalikan saldo kas pada ModalUtama
    try {
      const modal = await ModalUtama.findOne();
      if (modal) {
        modal.saldo_kas = (modal.saldo_kas || 0) + jumlah;
        modal.riwayat.push({
          keterangan: `Pembatalan pengeluaran (${doc.keterangan || doc.kategoriId})`,
          tipe: "pembatalan_pengeluaran",
          jumlah: jumlah,
          saldo_setelah: modal.saldo_kas,
        });
        await modal.save();
      }
    } catch (e) {
      console.warn('Gagal mengembalikan saldo kas saat deletePengeluaran:', e.message || e);
    }

    // Kurangi total_beban pada HppHarian untuk tanggal tersebut
    try {
      if (tanggalStr) {
        const hppDoc = await HppHarian.findOne({ tanggal: tanggalStr });
        if (hppDoc) {
          hppDoc.total_beban = Math.max(0, (hppDoc.total_beban || 0) - jumlah);
          hppDoc.laba_bersih = (hppDoc.total_pendapatan || 0) - (hppDoc.total_hpp || 0) - (hppDoc.total_beban || 0);
          await hppDoc.save();
        }
      }
    } catch (e) {
      console.warn('Gagal update HppHarian saat deletePengeluaran:', e.message || e);
    }

    res.json({ message: "Pengeluaran berhasil dihapus" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Gagal menghapus pengeluaran", error: err.message });
  }
};
