import Transaksi from "./../../models/datatransaksi.js";
import mongoose from "mongoose";
import { PERMISSIONS } from "../../shared/permissionRegistry.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

export const getAllTransaksi = async (req, res) => {
  try {
    console.log("User dari JWT:", req.user);

    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized, silakan login dulu" });
    }

    let filter = buildBranchFilter(req.user);
    const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    const canReadAllTransactions = permissionCodes.includes(PERMISSIONS.TRANSACTION_READ);

    // If user has TRANSACTION_READ permission, they see all transactions
    // Otherwise, they only see transactions they own or are assigned to
    if (!canReadAllTransactions) {
      // Show only transactions owned by this user (as creator or as assigned kasir)
      filter.$or = [
        { user_id: req.user.id },
        { kasir_id: req.user.username || req.user.id },
      ];
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
