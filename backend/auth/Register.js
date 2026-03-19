import User from "../models/user.js";

export const register = async (req, res) => {
  try {
    const { nama_lengkap, username, password } = req.body;

    if (!nama_lengkap || !username || !password) {
      return res.status(400).json({ message: "Nama lengkap, username, dan password wajib diisi" });
    }

    if (String(password).length < 6) {
      return res.status(400).json({ message: "Password minimal 6 karakter" });
    }

    const existingUser = await User.findOne({ username: String(username).trim() });
    if (existingUser) {
      return res.status(409).json({ message: "Username sudah digunakan" });
    }

    const safeRole = "user";
    const newUser = new User({
      nama_lengkap: String(nama_lengkap).trim(),
      username: String(username).trim(),
      password,
      role: safeRole,
    });
    await newUser.save();

    res.status(201).json({ message: "User berhasil didaftarkan!" });
  } catch (err) {
    res.status(500).json({ message: "Error register user", error: err.message });
  }
};
