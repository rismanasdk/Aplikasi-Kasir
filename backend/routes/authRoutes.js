import express from "express";
import { login, logout } from "../auth/Login.js";
import { register } from "../auth/Register.js";
import { buildAuthMePayload } from "../auth/authContract.js";
import verifyToken from "../middleware/verifyToken.js";
import User from "../models/user.js";
import Role from "../models/role.js";
import Branch from "../models/branch.js";
import userAuth from "../middleware/user.js";

const router = express.Router();

router.post("/login", login);
router.post("/register", register);
router.post("/logout", userAuth, logout);

// ✅ Tambahkan ini:
router.get("/me", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User tidak ditemukan" });

    const role = user.role_id ? await Role.findById(user.role_id) : null;
    const branch = user.branch_id ? await Branch.findById(user.branch_id) : null;

    res.json(buildAuthMePayload(user, role, branch));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
