import Transaksi from "../../models/datatransaksi.js";

export const deleteTransaksiById = async (req, res) => {
  try {
    const normalizedRole = String(req.user?.role || "").toLowerCase();
    if (!["admin", "kasir"].includes(normalizedRole)) {
      return res.status(403).json({ message: "Role Anda tidak diizinkan menghapus transaksi" });
    }

    const transaksi = await Transaksi.findById(req.params.id);
    if (!transaksi) {
      return res.status(404).json({ message: "Transaksi tidak ditemukan" });
    }

    if (normalizedRole === "kasir") {
      const kasirKey = req.user.username || req.user.id;
      if (transaksi.kasir_id !== kasirKey) {
        return res.status(403).json({ message: "Anda tidak bisa menghapus transaksi milik kasir lain" });
      }
    }

    await transaksi.deleteOne();
    res.json({ message: "Transaksi berhasil dihapus (pakai _id)!" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
