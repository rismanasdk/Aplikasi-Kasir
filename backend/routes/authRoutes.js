import express from "express";
import { login, logout } from "../auth/Login.js";
import { register } from "../auth/Register.js";
// import apiMiddleware from "../middleware/api.js";
import verifyToken from "../middleware/verifyToken.js";
import User from "../models/user.js";
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
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
