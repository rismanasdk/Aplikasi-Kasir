import express from "express";
import passport from "../config/passportGoogle.js";
import jwt from "jsonwebtoken";

const router = express.Router();
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

function buildAuthToken(user) {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      username: user.username,
      nama_lengkap: user.nama_lengkap,
      email: user.email,
      profilePicture: user.profilePicture,
    },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );
}

// Step 1: Redirect ke Google
router.get("/", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/callback",
  passport.authenticate("google", { failureRedirect: "/login-failed" }),
  (req, res) => {
    const redirectUrl = `${FRONTEND_URL}/login-success?oauth=success`;
    res.redirect(redirectUrl);
  }
);

router.get("/session-token", (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Session login Google tidak ditemukan" });
  }

  const token = buildAuthToken(req.user);
  return res.json({ token });
});

router.get("/login-failed", (req, res) => {
  res.status(401).json({ message: "Login Google gagal" });
});

export default router;
