import User from "../models/user.js";
import Branch from "../models/branch.js";
import { getRoleByCode } from "../utils/roleHelper.js";

const ROLE_INPUT_MAP = {
  admin: { legacyRole: "admin", roleCode: "admin" },
  manager: { legacyRole: "manajer", roleCode: "manager" },
  manajer: { legacyRole: "manajer", roleCode: "manager" },
  kasir: { legacyRole: "kasir", roleCode: "kasir" },
  chef: { legacyRole: "chef", roleCode: "chef" },
  security: { legacyRole: "security", roleCode: "security" },
  user: { legacyRole: "user", roleCode: null },
};

const getOrCreateDefaultBranch = async () => {
  const branch = await Branch.findOneAndUpdate(
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

  return branch;
};

export const register = async (req, res) => {
  try {
    const { nama_lengkap, username, password, role } = req.body;

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

    const requestedRole = String(role || "kasir").trim().toLowerCase();
    const roleConfig = ROLE_INPUT_MAP[requestedRole] || ROLE_INPUT_MAP.kasir;
    const defaultBranch = await getOrCreateDefaultBranch();
    const rbacRole = roleConfig.roleCode ? await getRoleByCode(roleConfig.roleCode) : null;

    const newUser = new User({
      nama_lengkap: String(nama_lengkap).trim(),
      username: String(username).trim(),
      password,
      role: roleConfig.legacyRole,
      role_id: rbacRole?._id || null,
      branch_id: roleConfig.legacyRole === "user" ? null : defaultBranch._id,
    });
    await newUser.save();

    res.status(201).json({ message: "User berhasil didaftarkan!" });
  } catch (err) {
    res.status(500).json({ message: "Error register user", error: err.message });
  }
};
