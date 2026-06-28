import Transaksi from "./../../models/datatransaksi.js";
import { io } from "./../../server.js";
import { processCompletedTransaction } from "./helpers/transactionLifecycleHelper.js";

export const updateStatusTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const normalizedRole = String(req.user?.role || "").toLowerCase();

    if (!["admin", "kasir"].includes(normalizedRole)) {
      return res.status(403).json({ message: "Role Anda tidak diizinkan mengubah status transaksi" });
    }

    const transaksi = await Transaksi.findById(id);

    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan!" });
    }

    if (normalizedRole === "kasir") {
      const kasirKey = req.user.username || req.user.id;
      if (transaksi.kasir_id !== kasirKey) {
        return res.status(403).json({ message: "Anda tidak bisa mengubah transaksi milik kasir lain" });
      }
    }

    transaksi.status = status;
    await transaksi.save();

    io.emit("statusUpdated", transaksi);
    io.emit("dashboard:omzet-updated", {
      transactionId: transaksi._id?.toString(),
      orderId: transaksi.order_id || transaksi.nomor_transaksi,
      status: transaksi.status,
      total_harga: transaksi.total_harga,
      tanggal_transaksi: transaksi.tanggal_transaksi,
    });

    if (status === "selesai") {
      await processCompletedTransaction(transaksi);
    }

    res.json({
      message: `Status transaksi berhasil diubah menjadi '${status}'`,
      transaksi
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
