import Settings from "../../../models/settings.js";
import cloudinary from "../../../config/cloudinary.js";
import streamifier from "streamifier";
import { buildBranchFilter } from "../../../utils/rbacHelper.js";

export const updateChannelLogo = async (req, res) => {
  try {
    const { methodName, channelName } = req.body;

    if (!methodName) {
      return res.status(400).json({ message: "methodName wajib diisi" });
    }
    if (!req.file) {
      return res.status(400).json({ message: "File logo belum diupload" });
    }

    // 🔹 Upload ke Cloudinary pakai buffer
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "payment_methods" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    // Cari settings
    const settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      return res.status(404).json({ message: "Settings tidak ditemukan" });
    }

    // Cari method
    const method = settings.payment_methods.find(m => m.method === methodName);
    if (!method) {
      return res.status(404).json({ message: `Metode ${methodName} tidak ditemukan` });
    }

    if (methodName === "QRIS") {
      method.logo = uploadResult.secure_url;
    } else {
      if (!channelName) {
        return res.status(400).json({ message: "channelName wajib diisi untuk method selain QRIS" });
      }

      const channel = method.channels.find(c => c.name === channelName);
      if (!channel) {
        return res.status(404).json({ message: `Channel ${channelName} tidak ditemukan` });
      }

      channel.logo = uploadResult.secure_url;
    }

    await settings.save();

    res.json({
      message:
        methodName === "QRIS"
          ? `Logo untuk ${methodName} berhasil diperbarui`
          : `Logo untuk ${channelName} berhasil diperbarui`,
      settings,
    });
  } catch (error) {
    console.error("updateChannelLogo error:", error);
    res.status(500).json({ message: error.message });
  }
};