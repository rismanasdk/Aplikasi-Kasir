import Transaksi from "../../models/datatransaksi.js";
import Barang from "../../models/databarang.js";
import { processCompletedTransaction } from "../transaksi/helpers/transactionLifecycleHelper.js";
/**
 * Ambil semua pesanan berdasarkan status
 * Contoh: GET /status?status=pending
 */
/**
 * Update status pesanan
 * Contoh: PUT /status/:id  { "status": "selesai" }
 */

export const getAllPesanan = async (req, res) => {
  try {
    const pesanan = await Transaksi.find().sort({ createdAt: -1 }).limit(10);
    res.json(pesanan);
  } catch (error) {
    console.error("Error getAllPesanan:", error);
    res.status(500).json({ message: error.message });
  }
};

export const updateStatusPesanan = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatus = ["pending", "diproses", "selesai", "dibatalkan"];
    if (!allowedStatus.includes(status)) {
      return res.status(400).json({
        message: `Status tidak valid. Pilih salah satu dari: ${allowedStatus.join(", ")}`
      });
    }

    const updateObj = { status };
    if (status === 'selesai') {
      updateObj.tanggal_transaksi = new Date();
    }

    const pesanan = await Transaksi.findByIdAndUpdate(
      id,
      updateObj,
      { new: true }
    );

    if (!pesanan) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }

    if (status === "selesai") {
      await processCompletedTransaction(pesanan);
    }

    res.json({ message: "Status pesanan berhasil diperbarui", pesanan });
  } catch (error) {
    console.error("Error updateStatusPesanan:", error);
    res.status(500).json({ message: error.message });
  }
};

export const approvePesanan = async (req, res) => {
  try {
    const { id } = req.params;

    const pesanan = await Transaksi.findById(id);
    if (!pesanan) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }

    if (pesanan.status !== "pending") {
      return res.status(400).json({ message: "Hanya pesanan pending yang bisa di-ACC" });
    }

    // Update jadi selesai dan set tanggal_transaksi jika belum ada
    pesanan.status = "selesai";
    if (!pesanan.tanggal_transaksi) {
      pesanan.tanggal_transaksi = new Date();
    }
    await pesanan.save();

    await processCompletedTransaction(pesanan);

    res.json({ message: "Pesanan berhasil di-ACC", pesanan });
  } catch (error) {
    console.error("Error approvePesanan:", error);
    res.status(500).json({ message: error.message });
  }
};

/**
 * Batalkan pesanan (stok dikembalikan)
 */
export const cancelPesanan = async (req, res) => {
  try {
    const { id } = req.params;

    const pesanan = await Transaksi.findById(id);
    if (!pesanan) {
      return res.status(404).json({ message: "Pesanan tidak ditemukan" });
    }

    if (pesanan.status === "selesai") {
      return res.status(400).json({ message: "Pesanan yang sudah selesai tidak bisa dibatalkan" });
    }

    // Kembalikan stok
    for (const item of pesanan.barang_dibeli) {
      const barang = await Barang.findOne({ kode_barang: item.kode_barang });
      if (barang) {
        barang.stok += item.jumlah;
        await barang.save();
      }
    }

    pesanan.status = "dibatalkan";
    await pesanan.save();

    res.json({ message: "Pesanan berhasil dibatalkan & stok dikembalikan", pesanan });
  } catch (error) {
    console.error("Error cancelPesanan:", error);
    res.status(500).json({ message: error.message });
  }
};
