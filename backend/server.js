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
import superAdminProductsRoutes from "./routes/super-admin/products.js";
import superAdminKategoriRouter from "./routes/super-admin/kategori.js";
import superAdminBranchRouter from "./routes/super-admin/branch.js"
import superAdminPermissionRouter from "./routes/super-admin/permission.js"
import superAdminSetRolesRouter from "./routes/super-admin/setroles.js"
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
import { requireAuth, requirePermission } from "./middleware/authorization.js";
import { PERMISSIONS } from "./shared/permissionRegistry.js";
import { syncPermissionsFromRegistry } from "./utils/permissionUtils.js";
import { requestLogger } from "./middleware/requestLogger.js";
import BlockedIP from "./models/blockedIP.js";
import aiBiRoutes from "./routes/aiBiRoutes.js";

const app = express();
const port = process.env.PORT || 5000;

// Parse allowed origins dari environment atau gunakan default
const configuredOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || "http://localhost:5173,http://127.0.0.1:5173")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);
  console.log("Configured Origins:", configuredOrigins);
  console.log("Origin:", origin);
  console.log("Includes?", configuredOrigins.includes(origin));
// Regex untuk match local network IPs lebih fleksibel
const isLocalNetworkOrigin = (origin) => {
  if (!origin) return true;

  const normalizedOrigin = origin.replace(/\/$/, "");

  console.log("Configured:", configuredOrigins);
  console.log("Incoming:", normalizedOrigin);

  if (configuredOrigins.includes(normalizedOrigin)) {
    return true;
  }

  return /^https?:\/\/(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.)/.test(normalizedOrigin);
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

// ai-service (BI) — proxy ke Python FastAPI
app.use("/api/bi", aiBiRoutes);

// pelanggan, kasir
app.use("/api/auth/google", googleAuthRoutes);
app.use("/api/barang", barangRoutes);
app.use("/api/transaksi", verifyToken, transaksiRoutes);
app.use("/api/update-profile", updateProfile);
app.use("/api/users/history", userAuth, usersRoutes);
app.use("/api/cart", cartRoutes)
app.use("/api/kasir/analytics", kasirAnalyticsRoutes);
app.use("/auth", authRoutes);

// manager
app.use("/api/manager/dashboard", verifyToken, requirePermission(PERMISSIONS.DASHBOARD_VIEW), dashboardRoutes);
app.use("/api/manager/riwayat", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), riwayatRoutes);
app.use("/api/manager/stok-barang", verifyToken, requirePermission(PERMISSIONS.STOCK_VIEW), stokBarang);
app.use("/api/manager/laporan", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), laporanManagerRoutes);
app.use("/api/manager/biaya-operasional", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), biayaoperasional);
app.use("/api/manager/settings", verifyToken, requirePermission(PERMISSIONS.BRANCH_VIEW), managerSettingsRoutes);
app.use("/api/common", verifyToken, requireAuth, commonRoutes);

// admin
app.use("/api/admin/dashboard", verifyToken, requirePermission(PERMISSIONS.DASHBOARD_VIEW), adminDashboardRoutes);
app.use("/api/admin/status-pesanan", verifyToken, requirePermission(PERMISSIONS.TRANSACTION_READ), adminStatusPesanan);
app.use("/api/admin/riwayat", verifyToken, requirePermission(PERMISSIONS.TRANSACTION_READ), adminRiwayat);
app.use("/api/admin/stok-barang", verifyToken, requirePermission(PERMISSIONS.STOCK_VIEW), adminStok);
app.use("/api/admin/kategori", verifyToken, requirePermission(PERMISSIONS.PRODUCT_READ), adminKategori)
app.use("/api/admin/laporan", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminLaporan);
app.use("/api/admin/users", verifyToken, requirePermission(PERMISSIONS.USER_VIEW), adminUsers);
app.use("/api/admin/settings", verifyToken, requirePermission(PERMISSIONS.PERMISSION_MANAGE), adminSettingsRoutes);
app.use("/api/admin/biaya-operasional", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminbiayaoperasional);
app.use("/api/admin/biaya-layanan", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminbiayalayanan)
app.use("/api/admin/modal-utama", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminmodalutama)
app.use("/api/admin/hpp-total", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminhpptotal)
app.use("/api/admin/bahan-baku", verifyToken, requirePermission(PERMISSIONS.STOCK_VIEW), adminBahanBaku)
app.use("/api/admin/data-satuan", verifyToken, requirePermission(PERMISSIONS.PRODUCT_READ), adminDataSatuan)
app.use("/api/admin/pengeluaran-biaya", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminPengeluaranBiaya);
app.use("/api/admin/kewajiban", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminKewajiban);

// super-admin
app.use("/api/super-admin/dashboard", verifyToken, requirePermission(PERMISSIONS.DASHBOARD_VIEW), superAdminDashboardRoutes);
app.use("/api/super-admin/laporan", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), superAdminLaporanRoutes);
app.use("/api/super-admin/settings", verifyToken, requirePermission(PERMISSIONS.PERMISSION_MANAGE), superAdminSettingsRoutes);
app.use("/api/super-admin/users", verifyToken, requirePermission(PERMISSIONS.USER_VIEW), superAdminUsersRoutes);
app.use("/api/super-admin/biaya-layanan", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), superAdminBiayaLayananRoutes);
app.use("/api/super-admin/modal-utama", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), superAdminModalUtamaRoutes);
app.use("/api/super-admin/biaya-operasional", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminbiayaoperasional);
app.use("/api/super-admin/pengeluaran-biaya", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), adminPengeluaranBiaya);
app.use("/api/super-admin/kewajiban", verifyToken, requirePermission(PERMISSIONS.REPORT_VIEW), superAdminKewajiban);
app.use("/api/super-admin/stok-barang", verifyToken, requirePermission(PERMISSIONS.STOCK_VIEW), superAdminProductsRoutes);
app.use("/api/super-admin/kategori", verifyToken, requirePermission(PERMISSIONS.PRODUCT_READ), superAdminKategoriRouter);
app.use("/api/super-admin/cabang", verifyToken, requirePermission(PERMISSIONS.BRANCH_VIEW), superAdminBranchRouter)
app.use("/api/super-admin/permission", verifyToken, requirePermission(PERMISSIONS.BRANCH_VIEW), superAdminPermissionRouter)
app.use("/api/super-admin/setroles", verifyToken, requirePermission(PERMISSIONS.BRANCH_VIEW), superAdminSetRolesRouter)

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

  try {
    const result = await syncPermissionsFromRegistry();
    console.log(
      `Permission registry sync complete: ${result.synced} definitions synced, ${result.hidden} removed/hidden permissions.`
    );
  } catch (error) {
    console.error("Permission registry sync gagal:", error);
    process.exit(1);
  }

  httpServer.listen(port, "0.0.0.0", () => {
    console.log(`Server running at http://0.0.0.0:${port}`);
  });
};

startServer();
