import Settings from "../../../models/settings.js";
import { buildBranchFilter } from "../../../utils/rbacHelper.js";

export const addChannelToMethod = async (req, res) => {
  try {
    const { methodName, channelName } = req.body;

    if (!methodName || !channelName) {
      return res.status(400).json({ message: "methodName & channelName wajib diisi" });
    }

    const settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      return res.status(404).json({ message: "Settings tidak ditemukan" });
    }

    const method = settings.payment_methods.find(m => m.method === methodName);
    if (!method) {
      return res.status(404).json({ message: `Method ${methodName} tidak ditemukan` });
    }

    // cek duplikat channel
    if (method.channels.some(c => c.name === channelName)) {
      return res.status(400).json({ message: `Channel ${channelName} sudah ada di ${methodName}` });
    }

    method.channels.push({ name: channelName });
    await settings.save();

    res.json({
      message: `Channel ${channelName} berhasil ditambahkan ke ${methodName}`,
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};