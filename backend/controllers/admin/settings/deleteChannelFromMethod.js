import Settings from "../../../models/settings.js";
import { buildBranchFilter } from "../../../utils/rbacHelper.js";

export const deleteChannelFromMethod = async (req, res) => {
  try {
    const { methodName, channelName } = req.body;

    if (!methodName || !channelName) {
      return res.status(400).json({
        message: "methodName dan channelName wajib diisi",
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

    const channelIndex = method.channels.findIndex(
      (c) => c.name === channelName
    );
    if (channelIndex === -1) {
      return res
        .status(404)
        .json({ message: `Channel ${channelName} tidak ditemukan di ${methodName}` });
    }

    // Hapus channel dari daftar
    method.channels.splice(channelIndex, 1);
    await settings.save();

    res.json({
      message: `Channel ${channelName} berhasil dihapus dari ${methodName}`,
      settings,
    });
  } catch (error) {
    console.error("deleteChannelFromMethod error:", error);
    res.status(500).json({ message: error.message });
  }
};