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
  (req, res, next) => {
    console.log(`[${new Date().toISOString()}] Callback hit, code:`, req.query.code?.slice(0, 15));
    next();
  },
  (req, res, next) => {
    passport.authenticate("google", (err, user, info) => {
      if (err) {
        console.error("Google OAuth detail error:", err.oauthError?.data || err.message);
        return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
      }
      if (!user) return res.redirect(`${FRONTEND_URL}/login?error=google_failed`);
      req.user = user;
      next();
    })(req, res, next);
  },
  (req, res) => {
    const token = buildAuthToken(req.user);
    res.redirect(`${FRONTEND_URL}/login-success?token=${encodeURIComponent(token)}`);
  }
);

router.get("/login-failed", (req, res) => {
  res.status(401).json({ message: "Login Google gagal" });
});

export default router;