import Roles from "../../models/role.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

// ✅ Ambil semua data modal utama
export const getAllRoles = async (req, res) => {
  try {
    const roles = await Roles.find();
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
