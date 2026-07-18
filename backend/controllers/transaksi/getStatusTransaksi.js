import Transaksi from "../../models/datatransaksi.js";
import mongoose from "mongoose";
import { PERMISSIONS } from "../../shared/permissionRegistry.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

export const getStatusTransaksi = async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized, silakan login dulu" });
    }

    let filter = { order_id, ...buildBranchFilter(req.user) };
    const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const canReadAllTransactions = permissionCodes.includes(PERMISSIONS.TRANSACTION_READ);

    if (!canReadAllTransactions) {
      // Show only transactions owned by this user
      filter.$or = [
        { user_id: req.user.id },
        { kasir_id: req.user.username || req.user.id },
      ];
    }

    console.log("Filter query:", filter);

    const transaksi = await Transaksi.findOne(filter);

    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan!" });
    }

    res.json({
      order_id: transaksi.order_id,
      status: transaksi.status,
      metode_pembayaran: transaksi.metode_pembayaran,
      total_harga: transaksi.total_harga,
      no_va: transaksi.no_va || null,
    });
  } catch (err) {
    console.error("Error getStatusTransaksi:", err);
    res.status(500).json({ message: err.message });
  }
};
