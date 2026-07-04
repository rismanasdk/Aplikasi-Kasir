import Transaksi from "../../models/datatransaksi.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";

export const deleteTransaksiByNomor = async (req, res) => {
  try {
    const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const canDeleteAllTransactions = permissionCodes.includes(PERMISSIONS.TRANSACTION_DELETE);

    if (!canDeleteAllTransactions) {
      return res.status(403).json({ message: "Anda tidak diizinkan menghapus transaksi" });
    }

    const transaksi = await Transaksi.findOne({ nomor_transaksi: req.params.nomor_transaksi });
    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    // Allow only if user has permission OR owns the transaction
    const isOwner =
      transaksi.kasir_id === (req.user.username || req.user.id) ||
      String(transaksi.user_id) === String(req.user.id);

    if (!canDeleteAllTransactions && !isOwner) {
      return res.status(403).json({ message: "Anda tidak diizinkan menghapus transaksi ini" });
    }

    await transaksi.deleteOne();
    res.json({ message: "Transaksi berhasil dihapus (pakai nomor_transaksi)!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
