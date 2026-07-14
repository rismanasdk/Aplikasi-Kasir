import bcrypt from "bcrypt";
import User from "../../models/user.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

// Ambil semua user
export const getUsers = async (req, res) => {
  try {
    const { role } = req.query;
    const filter = { ...buildBranchFilter(req.user), ...(role ? { role } : {}) };
    const users = await User.find(filter)
      .select("-password")
      .populate("branch_id", "nama");
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil data", error: err.message });
  }
};

const VALID_ROLES = ["admin", "manajer", "kasir", "chef", "user", "security", "super-admin"];
const BRANCH_ROLES = ["admin", "manajer", "kasir", "chef", "security", "super-admin"];

// Tambah user
export const addUser = async (req, res) => {
  try {
    const role = String(req.body.role || "user").trim().toLowerCase();
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }

    if (role === "user") {
      if (req.body.branch_id) {
        return res.status(400).json({ message: "Role user tidak boleh memiliki branch_id" });
      }
    } else {
      const branchValidation = validateAndInjectBranch(req, true);
      if (!branchValidation.isValid) {
        return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
      }
    }

    const payload = { ...req.body, role };
    if (role === "user") {
      delete payload.branch_id;
      payload.branch_id = null;
    } else {
      payload.branch_id = req.user.branch_id || payload.branch_id || null;
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
    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    const existingUser = await User.findOne({ _id: req.params.id, ...buildBranchFilter(req.user) });
    if (!existingUser) {
      return res.status(404).json({ message: "User tidak ditemukan" });
    }

    const role = req.body.role ? String(req.body.role).trim().toLowerCase() : String(existingUser.role).toLowerCase();
    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({ message: "Role tidak valid" });
    }

    if (role === "user" && Object.prototype.hasOwnProperty.call(req.body, "branch_id")) {
      return res.status(400).json({ message: "Role user tidak boleh memiliki branch_id" });
    }

    const updateData = { ...req.body, role };
    if (!updateData.password) {
      delete updateData.password;
    } else {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(updateData.password, salt);
    }

    if (role === "user") {
      updateData.branch_id = null;
    } else {
      updateData.branch_id = req.user.branch_id || existingUser.branch_id || null;
    }

    const user = await User.findByIdAndUpdate(existingUser._id, updateData, { new: true });

    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });
    res.json({ message: "User berhasil diperbarui!", user });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
