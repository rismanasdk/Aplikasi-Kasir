import bcrypt from "bcrypt";
import User from "../../models/user.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

// Ambil semua user
export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { ...buildBranchFilter(req.user), ...(role ? { role } : {}) };
    const users = await User.find(filter).select("-password");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data", error: err.message });
  }
};

// Tambah user
export const addUser = async (req, res) => {
  try {
    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    const payload = { ...req.body, branch_id: req.user.branch_id };
    if (!["admin", "manajer", "kasir", "chef", "user", "security"].includes(payload.role)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }
    const newUser = new User(payload);
    await newUser.save();
    res.json({ message: "User berhasil ditambahkan!" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Hapus user berdasarkan ID
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedUser = await User.findOneAndDelete({ _id: id, ...buildBranchFilter(req.user) });

    if (!deletedUser) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    res.json({ message: "User berhasil dihapus!" });
  } catch (err) {
    res.status(500).json({ message: "Gagal menghapus user", error: err.message });
  }
};

// Perbarui user
export const updateUser = async (req, res) => {
  try {
    // Kalau password kosong, jangan update password
    if (!req.body.password) {
      delete req.body.password;
    } else {
      // Kalau password ada, hash dulu
      const salt = await bcrypt.genSalt(10);
      req.body.password = await bcrypt.hash(req.body.password, salt);
    }

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    const user = await User.findOneAndUpdate({ _id: req.params.id, ...buildBranchFilter(req.user) }, { ...req.body, branch_id: req.user.branch_id }, { new: true });

    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json({ message: "User berhasil diperbarui!", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
