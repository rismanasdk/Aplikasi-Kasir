import Transaksi from "./../../models/datatransaksi.js";
import { io } from "./../../server.js";
import { processCompletedTransaction } from "./helpers/transactionLifecycleHelper.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";

export const updateStatusTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const canUpdateAllTransactions = permissionCodes.includes(PERMISSIONS.TRANSACTION_UPDATE);

    if (!canUpdateAllTransactions) {
      return res.status(403).json({ message: "Anda tidak diizinkan mengubah status transaksi" });
    }

    const transaksi = await Transaksi.findById(id);

    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan!" });
    }

    // Allow only if user has permission OR owns the transaction
    const isOwner = 
      transaksi.kasir_id === (req.user.username || req.user.id) ||
      String(transaksi.user_id) === String(req.user.id);

    if (!canUpdateAllTransactions && !isOwner) {
      return res.status(403).json({ message: "Anda tidak diizinkan mengubah transaksi ini" });
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
