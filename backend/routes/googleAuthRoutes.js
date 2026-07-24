import express from "express";
import passport from "../config/passportGoogle.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const FRONTEND_URL = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");

function buildAuthToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      email: user.email,
      profilePicture: user.profilePicture,
      status: user.status,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// Step 1: Redirect ke Google
router.get("/", passport.authenticate("google", { scope: ["profile", "email"] }));

// Step 2: Callback — langsung generate token dan kirim ke frontend via URL
router.get(
  "/callback",
  passport.authenticate("google", { failureRedirect: `${FRONTEND_URL}/#/login?error=google_failed` }),
  (req, res) => {
    try {
      const token = buildAuthToken(req.user);
      // Token dikirim langsung via hash route untuk static SPA hosting fallback
      res.redirect(`${FRONTEND_URL}/#/login-success?token=${encodeURIComponent(token)}`);
    } catch (err) {
      console.error("Error building token:", err);
      res.redirect(`${FRONTEND_URL}/#/login?error=token_failed`);
    }
  }
);

router.get("/login-failed", (req, res) => {
  res.status(401).json({ message: "Login Google gagal" });
});

export default router;