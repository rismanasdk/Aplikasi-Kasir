import Transaksi from "../../models/datatransaksi.js";
import mongoose from "mongoose";

export const getStatusTransaksi = async (req, res) => {
  try {
    const { order_id } = req.params;

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized, silakan login dulu" });
    }

    let filter = { order_id };
    const normalizedRole = String(req.user.role || "").toLowerCase();

    if (normalizedRole === "kasir") {
      filter.kasir_id = req.user.username || req.user.id;
    } else if (normalizedRole === "user") {
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
        return res.status(400).json({ message: "User ID tidak valid" });
      }
      filter.user_id = new mongoose.Types.ObjectId(req.user.id);
    } else if (!["admin", "manager", "manajer"].includes(normalizedRole)) {
      return res.status(403).json({ message: "Role Anda tidak diizinkan melihat status transaksi ini" });
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
