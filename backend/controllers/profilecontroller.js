import cloudinary from "../config/cloudinary.js";
import streamifier from "streamifier";
import User from "../models/user.js";
import bcrypt from "bcrypt";

export const updateUser = async (req, res) => {
  try {
    if (req.user.id.toString() !== req.params.id.toString()) {
      return res.status(403).json({ message: "Tidak bisa mengubah data user lain" });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    if (req.body.nama_lengkap) user.nama_lengkap = req.body.nama_lengkap;
    if (req.body.username) user.username = req.body.username;

    if (req.body.currentPassword && req.body.newPassword) {
      const isPasswordValid = await user.comparePassword(req.body.currentPassword);
      if (!isPasswordValid) {
        return res.status(400).json({ message: "Password saat ini salah" });
      }
      
      user.password = req.body.newPassword;
      
      console.log('Password baru akan di-hash otomatis oleh pre-save hook');
    } else if (req.body.currentPassword || req.body.newPassword) {

      return res.status(400).json({ 
        message: "Harap isi password saat ini dan password baru untuk mengubah password" 
      });
    }

    await user.save();

    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.json({ message: "User berhasil diperbarui!", user: userResponse });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(400).json({ message: error.message });
  }
};

export const updateUserProfilePicture = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id !== userId) {
      return res.status(403).json({ message: "Tidak bisa mengubah profile orang lain" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "File foto belum diunggah" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "Pengguna Tidak Ditemukan" });
    }

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

    const recentUpdates = (user.profilePictureUpdates || []).filter(
      (update) => update.updatedAt >= oneWeekAgo
    );

    if (recentUpdates.length >= 1) {
      return res.status(429).json({ 
        message: "Anda Telah Melewati Batas Maksimal, Ganti Kembali Dalam 1 Minggu" 
      });
    }
    
    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: "user_profiles" },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(stream);
    });

    user.profilePicture = uploadResult.secure_url;

    user.profilePictureUpdates = [
      ...(user.profilePictureUpdates || []),
      { updatedAt: new Date() }
    ];

    await user.save();

    const userResponse = { ...user.toObject() };
    delete userResponse.password;

    res.json({ 
      message: "Foto Profile Berhasil Diperbarui", 
      user: userResponse 
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: error.message });
  }
};

export const getUserProfilePicture = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select("profilePicture username nama_lengkap");
    if (!user) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }
    
    if (!user.profilePicture) {
      return res.status(200).json({ 
        message: "Belum ada foto profil",
        profilePicture: null 
      });
    }

    res.status(200).json({
      message: "Berhasil mengambil foto profil",
      profilePicture: user.profilePicture,
      nama_lengkap: user.nama_lengkap,
      username: user.username
    });
  } catch (error) {
    console.error('Error getting profile picture:', error);
    res.status(500).json({ message: error.message });
  }
};
