import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import connectDB from "./database/db.js";
import barangRoutes from "./routes/BarangRoutes.js";
import transaksiRoutes from "./routes/TransaksiRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import updateProfile from "./routes/profile.js"
import usersRoutes from "./routes/userRoutes.js";
import cartRoutes from "./routes/cart.js"
import dashboardRoutes from "./routes/manager/dashboard.js";
import riwayatRoutes from "./routes/manager/riwayat.js";
import stokBarang from "./routes/manager/stokbarang.js";
import laporanManagerRoutes from "./routes/manager/laporan.js";
import biayaoperasional from "./routes/manager/biayaoperasional.js";
import managerSettingsRoutes from "./routes/manager/settings.js";
import adminSettingsRoutes from "./routes/admin/settings.js";
import adminDashboardRoutes from "./routes/admin/dashboard.js";
import adminStatusPesanan from "./routes/admin/status.js";
import adminKategori from "./routes/admin/kategori.js"
import adminRiwayat from "./routes/admin/riwayat.js";
import adminStok from "./routes/admin/stok.js";
import adminLaporan from "./routes/admin/laporan.js";
import adminUsers from "./routes/admin/user.js";
import adminbiayaoperasional from "./routes/admin/biayaoperasional.js";
import adminbiayalayanan from "./routes/admin/biayalayanan.js"
import adminmodalutama from "./routes/admin/modalutama.js"
import adminhpptotal from "./routes/admin/hpptotal.js"
import adminBahanBaku from "./routes/admin/bahanbaku.js";
import adminDataSatuan from "./routes/admin/datasatuanRoutes.js";
import adminPengeluaranBiaya from "./routes/admin/pengeluaran-biaya.js";
import adminKewajiban from "./routes/admin/kewajiban.js";
import superAdminDashboardRoutes from "./routes/super-admin/dashboard.js";
import superAdminLaporanRoutes from "./routes/super-admin/laporan.js";
import superAdminSettingsRoutes from "./routes/super-admin/settings.js";
import superAdminUsersRoutes from "./routes/super-admin/user.js";
import superAdminBiayaLayananRoutes from "./routes/super-admin/biayalayanan.js";
import superAdminModalUtamaRoutes from "./routes/super-admin/modalutama.js";
import superAdminKewajiban from "./routes/super-admin/kewajiban.js";
import chefRoutes from "./routes/chef/chef.js";
import kasirAnalyticsRoutes from "./routes/kasir/analyticsRoutes.js";
import securityRoutes from "./routes/security/securityRoutes.js";
import commonRoutes from "./routes/common.js";
import userAuth from "./middleware/user.js";
import session from "express-session";
import helmet from "helmet";
import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import jwt from "jsonwebtoken";
import passport from "./config/passportGoogle.js";
import googleAuthRoutes from "./routes/googleAuthRoutes.js";
import { debugTokenLogger } from "./middleware/debugTokenLogger.js";
import verifyToken from "./middleware/verifyToken.js";
import authorize from "./middleware/authorize.js";
import { requestLogger } from "./middleware/requestLogger.js";
import BlockedIP from "./models/blockedIP.js";


const app = express();
const port = process.env.PORT || 5000;

// Parse allowed origins dari environment atau gunakan default
const configuredOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

// Regex untuk match local network IPs lebih fleksibel
const isLocalNetworkOrigin = (origin) => {
  if (!origin) return true;
  
  // Check direct match
  if (configuredOrigins.includes(origin)) return true;
  
  // Match any local/private IP
  return /^https?:\/\/(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(origin);
};

const corsOptions = {
  origin(origin, callback) {
    if (isLocalNetworkOrigin(origin)) {
      return callback(null, true);
    }
    console.warn(`CORS rejected origin: ${origin}`);
    return callback(new Error("Origin not allowed by CORS"));
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.set('trust proxy', 1); 
app.use(helmet()); 
app.disable("x-powered-by");

const parsePositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const RATE_LIMIT_MODE = (process.env.RATE_LIMIT_MODE || process.env.MODE || "ON").toUpperCase();
const RATE_LIMIT_WINDOW_MS = parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const RATE_LIMIT_MAX = parsePositiveInt(process.env.RATE_LIMIT_MAX, 600);

const getRateLimitKey = (req) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (token) {
    const decoded = jwt.decode(token);
    if (decoded && typeof decoded === "object") {
      const userId = decoded.id || decoded._id || decoded.sub || decoded.username;
      if (userId) {
        return `user:${userId}`;
      }
    }
  }

  return `ip:${ipKeyGenerator(req.ip)}`;
};

if (RATE_LIMIT_MODE === "OFF") {
  console.warn("[RATE LIMIT] Disabled by MODE=OFF/RATE_LIMIT_MODE=OFF");
} else {
  const limiter = rateLimit({
    windowMs: RATE_LIMIT_WINDOW_MS,
    max: RATE_LIMIT_MAX,
    keyGenerator: getRateLimitKey,
    skip: (req) => req.method === "OPTIONS",
    message: {
      message: "Terlalu banyak request. Tunggu sebentar lalu coba lagi.",
    },
    handler: (req, res, _next, options) => {
      const retryAfter = Math.ceil(RATE_LIMIT_WINDOW_MS / 1000);
      return res.status(options.statusCode).json({
        message: options.message.message,
        retryAfter,
      });
    },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use("/api/", limiter);
}

const trapRoutes = [
  "/.env", 
  "/wp-admin", 
  "/.git", 
  "/phpmyadmin", 
  "/nice%20ports%2C/Tri%6Eity.txt%2ebak"
];

app.use((req, res, next) => {
  if (trapRoutes.includes(req.originalUrl)) {
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    console.log(`\x1b[41m\x1b[37m[!!!] HONEYPOT TRIGGERED BY IP: ${clientIP}\x1b[0m`);
    console.log(`\x1b[31m[Target Path]: ${req.originalUrl}\x1b[0m`);
    
    // Auto-block the IP for 1 hour
    (async () => {
      try {
        const auto_unblock_at = new Date(Date.now() + 1 * 60 * 1000); // 1 minutes from now
        const existingBlock = await BlockedIP.findOne({ ip_address: clientIP });
        
        if (existingBlock) {
          // Update existing block
          existingBlock.status = "active";
          existingBlock.block_type = "automatic";
          existingBlock.reason = "Honeypot trap triggered";
          existingBlock.auto_unblock_at = auto_unblock_at;
          existingBlock.duration_hours = 1;
          await existingBlock.save();
        } else {
          // Create new block
          await BlockedIP.create({
            ip_address: clientIP,
            reason: "Honeypot trap triggered",
            blocked_by: "system",
            block_type: "automatic",
            duration_hours: 1,
            auto_unblock_at,
            status: "active"
          });
        }
        console.log(`\x1b[43m\x1b[37m[AUTO-BLOCKED] IP ${clientIP} blocked for 1 hour\x1b[0m`);
      } catch (error) {
        console.error("Error auto-blocking honeypot IP:", error);
      }
    })();
    
    setTimeout(() => {
      return res.status(418).json({ 
        status: "error", 
        message: "Stop scanning, I see you!",
        detected_ip: clientIP,
        auto_blocked: true,
        unblock_time: "1 hour"
      });
    }, 3000); 
    return;
  }
  next();
});

const sessionSecret = process.env.SESSION_SECRET;
if (!sessionSecret) {
  throw new Error("SESSION_SECRET is required");
}

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());
if (process.env.ENABLE_DEBUG_TOKEN_LOGGER === "true") {
  app.use(debugTokenLogger);
}

app.use(express.json());

// Add request logging middleware
app.use(requestLogger);

// Middleware untuk check blocked IP
app.use(async (req, res, next) => {
  try {
    const clientIP = req.ip || req.connection.remoteAddress || "unknown";
    const blockedIP = await BlockedIP.findOne({ ip_address: clientIP, status: "active" });
    
    if (blockedIP) {
      console.log(`\x1b[41m\x1b[37m[BLOCKED] Access denied for IP: ${clientIP}\x1b[0m`);
      return res.status(403).json({ 
        status: "error", 
        message: "Your IP address has been blocked. Please contact administrator.",
        blocked_ip: clientIP 
      });
    }
    next();
  } catch (error) {
    console.error("Error checking blocked IP:", error);
    next(); // Continue even if there's an error
  }
});

// pelanggan, kasir
app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/barang", barangRoutes);
app.use("/api/transaksi", userAuth, transaksiRoutes);
app.use("/api/update-profile", updateProfile);
app.use("/api/users/history", userAuth, usersRoutes);
app.use("/api/cart", cartRoutes)
app.use("/api/kasir/analytics", kasirAnalyticsRoutes);
app.use("/auth", authRoutes);

// manager
app.use("/api/manager/dashboard", verifyToken, authorize(["manajer", "manager", "admin"]), dashboardRoutes);
app.use("/api/manager/riwayat", verifyToken, authorize(["manajer", "manager", "admin"]), riwayatRoutes);
app.use("/api/manager/stok-barang", verifyToken, authorize(["manajer", "manager", "admin"]), stokBarang);
app.use("/api/manager/laporan", verifyToken, authorize(["manajer", "manager", "admin"]), laporanManagerRoutes);
app.use("/api/manager/biaya-operasional", verifyToken, authorize(["manajer", "manager", "admin"]), biayaoperasional);
app.use("/api/manager/settings", verifyToken, authorize(["manajer", "manager", "admin"]), managerSettingsRoutes);
app.use("/api/common", verifyToken, authorize(["admin", "manajer", "manager", "kasir", "chef", "user", "security"]), commonRoutes);

// admin
app.use("/api/admin/dashboard", verifyToken, authorize(["admin"]), adminDashboardRoutes);
app.use("/api/admin/status-pesanan", verifyToken, authorize(["admin"]), adminStatusPesanan);
app.use("/api/admin/riwayat", verifyToken, authorize(["admin"]), adminRiwayat);
app.use("/api/admin/stok-barang", adminStok);
app.use("/api/admin/kategori", verifyToken, authorize(["admin"]), adminKategori)
app.use("/api/admin/laporan", verifyToken, authorize(["admin", "manajer", "manager"]), adminLaporan);
app.use("/api/admin/users", verifyToken, authorize(["super-admin"]), adminUsers);
app.use("/api/admin/settings", verifyToken, authorize(["super-admin"]), adminSettingsRoutes);
app.use("/api/admin/biaya-operasional", verifyToken, authorize(["admin"]), adminbiayaoperasional);
app.use("/api/admin/biaya-layanan", verifyToken, authorize(["super-admin"]), adminbiayalayanan)
app.use("/api/admin/modal-utama", verifyToken, authorize(["super-admin"]), adminmodalutama)
app.use("/api/admin/hpp-total", verifyToken, authorize(["admin"]), adminhpptotal)
app.use("/api/admin/bahan-baku", adminBahanBaku)
app.use("/api/admin/data-satuan", verifyToken, authorize(["admin"]), adminDataSatuan)
app.use("/api/admin/pengeluaran-biaya", verifyToken, authorize(["admin"]), adminPengeluaranBiaya);
app.use("/api/admin/kewajiban", verifyToken, authorize(["admin"]), adminKewajiban);

// super-admin
app.use("/api/super-admin/dashboard", verifyToken, authorize(["super-admin"]), superAdminDashboardRoutes);
app.use("/api/super-admin/laporan", verifyToken, authorize(["super-admin"]), superAdminLaporanRoutes);
app.use("/api/super-admin/settings", verifyToken, authorize(["super-admin"]), superAdminSettingsRoutes);
app.use("/api/super-admin/users", verifyToken, authorize(["super-admin"]), superAdminUsersRoutes);
app.use("/api/super-admin/biaya-layanan", verifyToken, authorize(["super-admin"]), superAdminBiayaLayananRoutes);
app.use("/api/super-admin/modal-utama", verifyToken, authorize(["super-admin"]), superAdminModalUtamaRoutes);
app.use("/api/super-admin/biaya-operasional", verifyToken, authorize(["super-admin"]), adminbiayaoperasional);
app.use("/api/super-admin/pengeluaran-biaya", verifyToken, authorize(["super-admin"]), adminPengeluaranBiaya);
app.use("/api/super-admin/kewajiban", verifyToken, authorize(["super-admin"]), superAdminKewajiban);


// chef
app.use("/api/chef", chefRoutes);

// security
app.use("/api/security", securityRoutes);

app.get("/", (req, res) => {
  res.json({ message: "Welcome To API" });
});

app.use((err, req, res, next) => {
  console.error(" Error:", err.stack);
  res.status(500).json({ message: "Terjadi kesalahan pada server" });
});

const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: (origin, callback) => {
      if (isLocalNetworkOrigin(origin)) {
        return callback(null, true);
      }
      console.warn(`Socket.IO CORS rejected origin: ${origin}`);
      return callback(new Error("Socket.IO CORS blocked"));
    },
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true
  },
});

io.on("connection", (socket) => {
  console.log("Client terhubung:", socket.id);

  socket.on("disconnect", () => {
    console.log("Client terputus:", socket.id);
  });
});

export { io };

// Auto-unblock function
const performAutoUnblock = async () => {
  try {
    const now = new Date();
    const expiredBlocks = await BlockedIP.find({
      status: "active",
      auto_unblock_at: { $lte: now }
    });

    for (const block of expiredBlocks) {
      block.status = "inactive";
      await block.save();
      console.log(`\x1b[42m\x1b[37m[AUTO-UNBLOCKED] IP ${block.ip_address} auto-unblocked\x1b[0m`);
    }
  } catch (error) {
    console.error("Error in auto-unblock scheduler:", error);
  }
};

// Run auto-unblock immediately on startup
performAutoUnblock();

// Auto-unblock scheduler - check every minute
setInterval(performAutoUnblock, 1 * 60 * 1000); // Every 1 minute

const startServer = async () => {
  await connectDB();

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
};

startServer();
