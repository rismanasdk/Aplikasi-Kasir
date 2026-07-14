import Settings from "../../../models/settings.js";
import { buildBranchFilter } from "../../../utils/rbacHelper.js";

export const togglePaymentMethod = async (req, res) => {
  try {
    const { methodName, isActive } = req.body;

    if (!methodName || typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "methodName dan isActive (true/false) wajib diisi",
      });
    }

    const settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      return res.status(404).json({ message: "Settings tidak ditemukan" });
    }

    const method = settings.payment_methods.find(
      (m) => m.method === methodName
    );
    if (!method) {
      return res
        .status(404)
        .json({ message: `Metode pembayaran ${methodName} tidak ditemukan` });
    }

    // Update status aktif
    method.isActive = isActive;
    await settings.save();

    res.json({
      message: `Metode pembayaran ${methodName} berhasil ${
        isActive ? "diaktifkan" : "dinonaktifkan"
      }`,
      settings,
    });
  } catch (error) {
    console.error("togglePaymentMethod error:", error);
    res.status(500).json({ message: error.message });
  }
};