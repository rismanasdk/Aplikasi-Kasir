import User from "../models/user.js";
import jwt from "jsonwebtoken";

export const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) {
      res.status(404).json({ message: "User tidak ditemukan" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(400).json({ message: "Password salah" });
      return;
    }

    user.status = "aktif";
    await user.save();

    const token = jwt.sign(
      {
        user_id: user._id,
        username: user.username,
        branch_id: user.branch_id || null,
        role_id: user.role_id || null,
        role_version: user.role_id ? user.role_id.toString() : null,
        permission_version: user.role_id ? user.role_id.toString() : null,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      message: "Login berhasil",
      token,
      user: {
        id: user._id,
        nama_lengkap: user.nama_lengkap,
        username: user.username,
        role: user.role,
        profilePicture: user.profilePicture,
        status: user.status,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const logout = async (req, res) => {
  try {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized, silakan login dulu" });
      return;
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      res.status(404).json({ message: "User tidak ditemukan" });
      return;
    }

    user.status = "nonaktif";
    await user.save();

    res.json({ message: "Logout berhasil, status user dinonaktifkan" });
  } catch (err) {
    console.error("Error saat logout:", err.message);
    res.status(500).json({ message: err.message });
  }
};