import Settings from "../../../models/settings.js";
import { buildBranchFilter } from "../../../utils/rbacHelper.js";

export const toggleChannelStatus = async (req, res) => {
  try {
    const { methodName, channelName, isActive } = req.body;

    if (!methodName || !channelName || typeof isActive !== "boolean") {
      return res.status(400).json({
        message: "methodName, channelName, dan isActive (true/false) wajib diisi",
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

    const channel = method.channels.find((c) => c.name === channelName);
    if (!channel) {
      return res
        .status(404)
        .json({ message: `Channel ${channelName} tidak ditemukan di ${methodName}` });
    }

    // Update status aktif
    channel.isActive = isActive;
    await settings.save();

    res.json({
      message: `Channel ${channelName} pada metode ${methodName} berhasil ${
        isActive ? "diaktifkan" : "dinonaktifkan"
      }`,
      settings,
    });
  } catch (error) {
    console.error("toggleChannelStatus error:", error);
    res.status(500).json({ message: error.message });
  }
};