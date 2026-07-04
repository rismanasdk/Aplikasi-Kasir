import Settings from "../../../models/settings.js";
import { buildBranchFilter } from "../../../utils/rbacHelper.js";

export const deletePaymentMethod = async (req, res) => {
  try {
    const { methodName } = req.body;

    if (!methodName) {
      return res.status(400).json({
        message: "methodName wajib diisi",
      });
    }

    // Ambil data settings dari database
    const settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      return res.status(404).json({ message: "Settings tidak ditemukan" });
    }

    // Cari index method berdasarkan nama
    const methodIndex = settings.payment_methods.findIndex(
      (m) => m.method === methodName
    );

    if (methodIndex === -1) {
      return res
        .status(404)
        .json({ message: `Metode pembayaran ${methodName} tidak ditemukan` });
    }

    // Hapus method dari array  
    settings.payment_methods.splice(methodIndex, 1);

    // Simpan perubahan
    await settings.save();

    res.json({
      message: `Metode pembayaran ${methodName} berhasil dihapus`,
      settings,
    });
  } catch (error) {
    console.error("deletePaymentMethod error:", error);
    res.status(500).json({ message: error.message });
  }
};
