import Transaksi from "./../../models/datatransaksi.js";
import mongoose from "mongoose";

export const getAllTransaksi = async (req, res) => {
  try {
    console.log("User dari JWT:", req.user);

    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: "Unauthorized, silakan login dulu" });
    }

    let filter = {};
    const normalizedRole = String(req.user.role || "").toLowerCase();

    if (normalizedRole === "kasir") {
      filter.kasir_id = req.user.username || req.user.id;
    } else if (normalizedRole === "user") {
      if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
        return res.status(400).json({ message: "User ID tidak valid" });
      }
      filter.user_id = new mongoose.Types.ObjectId(req.user.id);
    } else if (!["admin", "manager", "manajer"].includes(normalizedRole)) {
      return res.status(403).json({ message: "Role Anda tidak diizinkan melihat daftar transaksi" });
    }

    // Ambil page dari query ?page=1,2,3...
    const page = parseInt(req.query.page) || 1;
    const limit = 10; // jumlah data per halaman
    const skip = (page - 1) * limit;

    const totalData = await Transaksi.countDocuments(filter);

    const transaksi = await Transaksi.find(filter)
      .populate({
        path: "kasir_id",
        select: "nama_lengkap ProfilePicture",
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    console.log("Jumlah transaksi ditemukan:", totalData);

    res.json({
      currentPage: page,
      totalPages: Math.ceil(totalData / limit),
      totalData,
      data: transaksi,
    });
  } catch (error) {
    console.error("Error getAllTransaksi:", error);
    res.status(500).json({ message: error.message });
  }
};
