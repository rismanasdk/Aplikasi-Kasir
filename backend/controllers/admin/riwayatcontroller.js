import Transaksi from "../../models/datatransaksi.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

// 🔹 Ambil semua transaksi
export const getAllTransaksi = async (req, res) => {
  try {
    const transaksi = await Transaksi.find(buildBranchFilter(req.user))
      .populate("kasir_id", "nama_lengkap username")
      .sort({ createdAt: -1 });

    res.json(transaksi);
  } catch (error) {
    console.error("Error getAllTransaksi:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Update transaksi berdasarkan ID
export const updateTransaksi = async (req, res) => {
  try {
    const { id } = req.params;
    const dataUpdate = req.body; // boleh update total_harga, barang_dibeli, dll.

    const transaksi = await Transaksi.findByIdAndUpdate(id, dataUpdate, {
      new: true, // return data baru setelah update
      runValidators: true, // validasi sesuai schema
    }).populate("kasir_id", "nama_lengkap username");

    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    res.json({ message: "Transaksi berhasil diperbarui", transaksi });
  } catch (error) {
    console.error("Error updateTransaksi:", error);
    res.status(500).json({ message: error.message });
  }
};

// 🔹 Hapus transaksi
export const deleteTransaksi = async (req, res) => {
  try {
    const { id } = req.params;

    const transaksi = await Transaksi.findByIdAndDelete(id);

    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    res.json({ message: "Transaksi berhasil dihapus" });
  } catch (error) {
    console.error("Error deleteTransaksi:", error);
    res.status(500).json({ message: error.message });
  }
};
