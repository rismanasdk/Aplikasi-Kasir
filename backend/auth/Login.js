import User from "../models/user.js";
import jwt from "jsonwebtoken";
import Branch from "../models/branch.js";
import { getRoleByCode } from "../utils/roleHelper.js";

const LEGACY_ROLE_TO_RBAC_CODE = {
  "super-admin": "super_admin",
  super_admin: "super_admin",
  admin: "admin",
  manajer: "manager",
  manager: "manager",
  kasir: "kasir",
  chef: "chef",
  security: "security",
};

const getOrCreateDefaultBranch = async () => {
  return Branch.findOneAndUpdate(
    { nama: "Pusat" },
    {
      $setOnInsert: {
        nama: "Pusat",
        alamat: "Jakarta",
        telepon: "",
        status: "aktif",
      },
    },
    { new: true, upsert: true }
  );
};

const ensureLoginRbacContext = async (user) => {
  const updates = {};

  if (String(user.role || "").toLowerCase() === "user") {
    if (user.branch_id) {
      updates.branch_id = null;
      user.branch_id = null;
    }
  } else if (!user.branch_id) {
    const defaultBranch = await getOrCreateDefaultBranch();
    user.branch_id = defaultBranch._id;
    updates.branch_id = defaultBranch._id;
  }

  if (!user.role_id) {
    const roleCode = LEGACY_ROLE_TO_RBAC_CODE[String(user.role || "").toLowerCase()];
    const rbacRole = roleCode ? await getRoleByCode(roleCode) : null;

    if (rbacRole?._id) {
      user.role_id = rbacRole._id;
      updates.role_id = rbacRole._id;
    }
  }

  if (Object.keys(updates).length) {
    await User.updateOne({ _id: user._id }, { $set: updates });
  }
};

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

    await ensureLoginRbacContext(user);

    user.status = "aktif";
    await User.updateOne({ _id: user._id }, { $set: { status: "aktif" } });

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
