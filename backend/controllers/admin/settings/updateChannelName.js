import Settings from "../../../models/settings.js";
import { buildBranchFilter } from "../../../utils/rbacHelper.js";

export const updateChannelName = async (req, res) => {
  try {
    const { methodName, oldChannelName, newChannelName } = req.body;

    if (!methodName || !oldChannelName || !newChannelName) {
      return res.status(400).json({ message: "methodName, oldChannelName, dan newChannelName wajib diisi" });
    }

    const settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      return res.status(404).json({ message: "Settings tidak ditemukan" });
    }

    const method = settings.payment_methods.find(m => m.method === methodName);
    if (!method) {
      return res.status(404).json({ message: `Metode ${methodName} tidak ditemukan` });
    }

    const channel = method.channels.find(c => c.name === oldChannelName);
    if (!channel) {
      return res.status(404).json({ message: `Channel ${oldChannelName} tidak ditemukan` });
    }

    // Update nama
    channel.name = newChannelName;
    await settings.save();

    res.json({
      message: `Channel ${oldChannelName} berhasil diubah menjadi ${newChannelName}`,
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};