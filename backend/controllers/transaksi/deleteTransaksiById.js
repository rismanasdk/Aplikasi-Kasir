import Transaksi from "../../models/datatransaksi.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

export const deleteTransaksiById = async (req, res) => {
  try {
    const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const canDeleteAllTransactions = permissionCodes.includes(PERMISSIONS.TRANSACTION_DELETE);

    if (!canDeleteAllTransactions) {
      return res.status(403).json({ message: "Anda tidak diizinkan menghapus transaksi" });
    }

    const branchFilter = buildBranchFilter(req.user);
    const transaksi = await Transaksi.findOne({ _id: req.params.id, ...branchFilter });
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
    res.json({ message: "Transaksi berhasil dihapus (pakai _id)!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
