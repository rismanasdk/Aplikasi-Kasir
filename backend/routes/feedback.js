import express from "express";
import nodemailer from "nodemailer";

const router = express.Router();

const FEEDBACK_TO_EMAIL = process.env.FEEDBACK_TO_EMAIL || "rismanh158@gmail.com";

const escapeHtml = (value) => {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
};

const createTransporter = () => {
  if (process.env.SMTP_SERVICE) {
    return nodemailer.createTransport({
      service: process.env.SMTP_SERVICE,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

router.post("/", async (req, res) => {
  try {
    const username = String(req.body?.username || req.user?.username || "").trim();
    const saran = String(req.body?.saran || "").trim();

    if (username.length < 2) {
      return res.status(400).json({ message: "Username tidak valid" });
    }

    if (saran.length < 10) {
      return res.status(400).json({ message: "Saran minimal 10 karakter" });
    }

    if (saran.length > 2000) {
      return res.status(400).json({ message: "Saran maksimal 2000 karakter" });
    }

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || (!process.env.SMTP_SERVICE && !process.env.SMTP_HOST)) {
      return res.status(500).json({ message: "Konfigurasi email server belum lengkap" });
    }

    const fromEmail = process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER;
    const transporter = createTransporter();
    const safeUsername = escapeHtml(username);
    const safeSaran = escapeHtml(saran).replace(/\n/g, "<br />");

    await transporter.sendMail({
      from: `"KasirPlus Feedback" <${fromEmail}>`,
      to: FEEDBACK_TO_EMAIL,
      subject: "Saran Baru dari User KasirPlus",
      text: [
        "Ada saran baru dari halaman user KasirPlus.",
        "",
        `Username: ${username}`,
        "",
        "Saran:",
        saran,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2 style="margin:0 0 12px;color:#f59e0b">Saran Baru KasirPlus</h2>
          <p>Ada saran baru dari halaman user KasirPlus.</p>
          <p><strong>Username:</strong> ${safeUsername}</p>
          <div style="margin-top:16px;padding:14px;border-left:4px solid #f59e0b;background:#fffbeb">
            ${safeSaran}
          </div>
        </div>
      `,
    });

    return res.json({ message: "Saran berhasil dikirim" });
  } catch (error) {
    console.error("Gagal mengirim saran:", error);
    return res.status(500).json({ message: "Gagal mengirim saran. Silakan coba lagi nanti." });
  }
});

export default router;
