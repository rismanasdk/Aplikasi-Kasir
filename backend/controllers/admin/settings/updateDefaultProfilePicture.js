import Settings from "../../../models/settings.js";
import cloudinary from "../../../config/cloudinary.js";
import streamifier from "streamifier";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";


export const updateDefaultProfilePicture = async (req, res) => {
  try {
    const permissionCodes = Array.isArray(req.user?.permissions) ? req.user.permissions : [];
    if (!permissionCodes.includes(PERMISSIONS.USER_UPDATE)) {
      return res.status(403).json({ message: "Hanya admin yang bisa mengubah default profile picture" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "File foto belum diunggah" });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "default_profiles" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    const settings = await Settings.findOneAndUpdate(
      {},
      { defaultProfilePicture: uploadResult.secure_url },
      { new: true, upsert: true }
    );

    res.json({ 
      message: "Default Profile Picture berhasil diperbarui", 
      settings 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
