import Kewajiban from "../../models/kewajiban.js";
import BahanBaku from "../../models/bahanbaku.js";
import ModalUtama from "../../models/modalutama.js";

const VALID_KATEGORI = new Set([
  "utang_supplier",
  "pinjaman",
  "pajak_terutang",
  "gaji_terutang",
  "sewa_terutang",
  "lainnya",
]);

const VALID_SUMBER = new Set(["manual", "pembelian_bahan_baku", "operasional", "lainnya"]);

const toDateOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const getDateMatch = ({ start, end }) => {
  const match = {};
  if (start || end) {
    match.tanggal = {};
    if (start) match.tanggal.$gte = new Date(String(start) + "T00:00:00.000Z");
    if (end) match.tanggal.$lte = new Date(String(end) + "T23:59:59.999Z");
  }
  return match;
};

export const createKewajiban = async (req, res) => {
  try {
    const {
      kategori = "lainnya",
      nama,
      pihak,
      jumlah,
      jumlah_awal,
      tanggal,
      jatuh_tempo,
      sumber,
      bahan_baku_id,
      keterangan,
    } = req.body;

    const nominal = Number(jumlah_awal ?? jumlah);

    if (!VALID_KATEGORI.has(kategori)) {
      return res.status(400).json({ message: "Kategori kewajiban tidak valid." });
    }

    if (!nama || !String(nama).trim()) {
      return res.status(400).json({ message: "Nama kewajiban wajib diisi." });
    }

    if (!Number.isFinite(nominal) || nominal <= 0) {
      return res.status(400).json({ message: "Jumlah kewajiban harus lebih dari 0." });
    }

    if (sumber && !VALID_SUMBER.has(sumber)) {
      return res.status(400).json({ message: "Sumber kewajiban tidak valid." });
    }

    let bahanBaku = null;
    if (bahan_baku_id) {
      bahanBaku = await BahanBaku.findById(bahan_baku_id);
      if (!bahanBaku) {
        return res.status(404).json({ message: "Bahan baku terkait tidak ditemukan." });
      }
    }

    const doc = new Kewajiban({
      kategori,
      nama: String(nama).trim(),
      pihak: pihak ? String(pihak).trim() : "",
      jumlah_awal: nominal,
      sisa_jumlah: nominal,
      tanggal: toDateOrNull(tanggal) || new Date(),
      jatuh_tempo: toDateOrNull(jatuh_tempo),
      sumber: sumber || (bahanBaku ? "pembelian_bahan_baku" : "manual"),
      bahan_baku_id: bahanBaku?._id || null,
      keterangan: keterangan ? String(keterangan).trim() : "",
    });

    await doc.save();
    await doc.populate("bahan_baku_id", "nama total_harga total_stok modal_per_porsi");

    return res.status(201).json({
      message: "Kewajiban berhasil dibuat.",
      data: doc,
    });
  } catch (error) {
    console.error("Gagal membuat kewajiban:", error);
    return res.status(500).json({ message: "Gagal membuat kewajiban", error: error.message });
  }
};

export const listKewajiban = async (req, res) => {
  try {
    const { status, kategori, start, end } = req.query;
    const match = getDateMatch({ start, end });

    if (status) match.status = status;
    if (kategori) match.kategori = kategori;

    const data = await Kewajiban.find(match)
      .sort({ status: 1, jatuh_tempo: 1, tanggal: -1 })
      .populate("bahan_baku_id", "nama total_harga total_stok modal_per_porsi");

    return res.json(data);
  } catch (error) {
    console.error("Gagal mengambil kewajiban:", error);
    return res.status(500).json({ message: "Gagal mengambil kewajiban", error: error.message });
  }
};

export const getKewajibanById = async (req, res) => {
  try {
    const doc = await Kewajiban.findById(req.params.id).populate(
      "bahan_baku_id",
      "nama total_harga total_stok modal_per_porsi"
    );

    if (!doc) return res.status(404).json({ message: "Kewajiban tidak ditemukan." });

    return res.json(doc);
  } catch (error) {
    console.error("Gagal mengambil detail kewajiban:", error);
    return res.status(500).json({ message: "Gagal mengambil detail kewajiban", error: error.message });
  }
};

export const updateKewajiban = async (req, res) => {
  try {
    const doc = await Kewajiban.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Kewajiban tidak ditemukan." });
    if (doc.status === "lunas") {
      return res.status(400).json({ message: "Kewajiban yang sudah lunas tidak dapat diubah." });
    }

    const {
      kategori,
      nama,
      pihak,
      jumlah_awal,
      tanggal,
      jatuh_tempo,
      sumber,
      bahan_baku_id,
      keterangan,
      status,
    } = req.body;

    if (kategori !== undefined) {
      if (!VALID_KATEGORI.has(kategori)) {
        return res.status(400).json({ message: "Kategori kewajiban tidak valid." });
      }
      doc.kategori = kategori;
    }

    if (sumber !== undefined) {
      if (!VALID_SUMBER.has(sumber)) {
        return res.status(400).json({ message: "Sumber kewajiban tidak valid." });
      }
      doc.sumber = sumber;
    }

    if (nama !== undefined) {
      if (!String(nama).trim()) return res.status(400).json({ message: "Nama kewajiban wajib diisi." });
      doc.nama = String(nama).trim();
    }

    if (pihak !== undefined) doc.pihak = pihak ? String(pihak).trim() : "";
    if (keterangan !== undefined) doc.keterangan = keterangan ? String(keterangan).trim() : "";
    if (tanggal !== undefined) doc.tanggal = toDateOrNull(tanggal) || doc.tanggal;
    if (jatuh_tempo !== undefined) doc.jatuh_tempo = toDateOrNull(jatuh_tempo);

    if (bahan_baku_id !== undefined) {
      if (bahan_baku_id) {
        const bahanBaku = await BahanBaku.findById(bahan_baku_id);
        if (!bahanBaku) return res.status(404).json({ message: "Bahan baku terkait tidak ditemukan." });
        doc.bahan_baku_id = bahanBaku._id;
        if (!sumber) doc.sumber = "pembelian_bahan_baku";
      } else {
        doc.bahan_baku_id = null;
      }
    }

    if (jumlah_awal !== undefined) {
      const nominalBaru = Number(jumlah_awal);
      if (!Number.isFinite(nominalBaru) || nominalBaru <= 0) {
        return res.status(400).json({ message: "Jumlah awal harus lebih dari 0." });
      }

      const totalDibayar = (doc.pembayaran || []).reduce((sum, item) => sum + (Number(item.jumlah) || 0), 0);
      if (nominalBaru < totalDibayar) {
        return res.status(400).json({
          message: `Jumlah awal tidak boleh lebih kecil dari total pembayaran (${totalDibayar}).`,
        });
      }

      doc.jumlah_awal = nominalBaru;
      doc.sisa_jumlah = nominalBaru - totalDibayar;
    }

    if (status === "dibatalkan") {
      doc.status = "dibatalkan";
    }

    await doc.save();
    await doc.populate("bahan_baku_id", "nama total_harga total_stok modal_per_porsi");

    return res.json({ message: "Kewajiban berhasil diperbarui.", data: doc });
  } catch (error) {
    console.error("Gagal memperbarui kewajiban:", error);
    return res.status(500).json({ message: "Gagal memperbarui kewajiban", error: error.message });
  }
};

export const bayarKewajiban = async (req, res) => {
  try {
    const { jumlah, tanggal, metode_pembayaran, keterangan } = req.body;
    const nominal = Number(jumlah);

    if (!Number.isFinite(nominal) || nominal <= 0) {
      return res.status(400).json({ message: "Jumlah pembayaran harus lebih dari 0." });
    }

    const doc = await Kewajiban.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Kewajiban tidak ditemukan." });
    if (doc.status === "lunas") return res.status(400).json({ message: "Kewajiban sudah lunas." });
    if (doc.status === "dibatalkan") return res.status(400).json({ message: "Kewajiban sudah dibatalkan." });
    if (nominal > doc.sisa_jumlah) {
      return res.status(400).json({ message: `Pembayaran melebihi sisa kewajiban (${doc.sisa_jumlah}).` });
    }

    const modal = await ModalUtama.findOne();
    if (!modal) return res.status(400).json({ message: "Modal utama belum dibuat." });
    if ((modal.saldo_kas || 0) < nominal) {
      return res.status(400).json({
        message: `Saldo kas tidak cukup. Saldo kas: ${modal.saldo_kas || 0}, dibutuhkan: ${nominal}.`,
      });
    }

    modal.saldo_kas = (modal.saldo_kas || 0) - nominal;
    modal.riwayat.push({
      keterangan: keterangan || `Pembayaran kewajiban: ${doc.nama}`,
      tipe: "pengeluaran",
      jumlah: nominal,
      saldo_setelah: modal.saldo_kas,
    });

    doc.sisa_jumlah = Math.max(0, (doc.sisa_jumlah || 0) - nominal);
    doc.pembayaran.push({
      tanggal: toDateOrNull(tanggal) || new Date(),
      jumlah: nominal,
      metode_pembayaran: metode_pembayaran || "kas",
      keterangan: keterangan || "",
      saldo_setelah: doc.sisa_jumlah,
    });

    await modal.save();
    await doc.save();
    await doc.populate("bahan_baku_id", "nama total_harga total_stok modal_per_porsi");

    return res.json({
      message: "Pembayaran kewajiban berhasil diproses.",
      data: doc,
      modal,
    });
  } catch (error) {
    console.error("Gagal membayar kewajiban:", error);
    return res.status(500).json({ message: "Gagal membayar kewajiban", error: error.message });
  }
};

export const deleteKewajiban = async (req, res) => {
  try {
    const doc = await Kewajiban.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: "Kewajiban tidak ditemukan." });
    if ((doc.pembayaran || []).length > 0) {
      return res.status(400).json({ message: "Kewajiban yang sudah memiliki pembayaran tidak dapat dihapus." });
    }

    await Kewajiban.deleteOne({ _id: doc._id });
    return res.json({ message: "Kewajiban berhasil dihapus." });
  } catch (error) {
    console.error("Gagal menghapus kewajiban:", error);
    return res.status(500).json({ message: "Gagal menghapus kewajiban", error: error.message });
  }
};

export const getRingkasanKewajiban = async (req, res) => {
  try {
    const aktifMatch = { status: { $in: ["belum_lunas", "sebagian"] } };

    const [summary, byKategori, jatuhTempo] = await Promise.all([
      Kewajiban.aggregate([
        { $match: aktifMatch },
        {
          $group: {
            _id: null,
            total_kewajiban: { $sum: "$sisa_jumlah" },
            jumlah_data: { $sum: 1 },
          },
        },
      ]),
      Kewajiban.aggregate([
        { $match: aktifMatch },
        { $group: { _id: "$kategori", total: { $sum: "$sisa_jumlah" }, jumlah_data: { $sum: 1 } } },
        { $project: { kategori: "$_id", total: 1, jumlah_data: 1, _id: 0 } },
        { $sort: { kategori: 1 } },
      ]),
      Kewajiban.find({
        ...aktifMatch,
        jatuh_tempo: { $ne: null },
      })
        .sort({ jatuh_tempo: 1 })
        .limit(5)
        .select("kategori nama pihak sisa_jumlah jatuh_tempo status"),
    ]);

    return res.json({
      ringkasan: summary[0] || { total_kewajiban: 0, jumlah_data: 0 },
      per_kategori: byKategori,
      jatuh_tempo_terdekat: jatuhTempo,
    });
  } catch (error) {
    console.error("Gagal mengambil ringkasan kewajiban:", error);
    return res.status(500).json({ message: "Gagal mengambil ringkasan kewajiban", error: error.message });
  }
};
