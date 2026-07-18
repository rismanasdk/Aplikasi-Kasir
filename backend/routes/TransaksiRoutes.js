import express from "express";
import verifyToken from "../middleware/verifyToken.js";
import { 
  getAllTransaksi,
  createTransaksi, 
  deleteTransaksiById,
  deleteTransaksiByNomor,
  updateStatusTransaksi,
  midtransCallback,
  getStatusTransaksi,
  cancelTransaksi,
  getStatusTransaksiPublic,
  getAllTransaksiPublic,
} from "../controllers/datatransaksiController.js";
import { PERMISSIONS } from "../shared/permissionRegistry.js";
import requirePermission from "../middleware/requirePermission.js";
// import apiMiddleware from "../middleware/api.js";

const router = express.Router();

router.use(verifyToken);

// ===================== 🔒 Protected (harus login: kasir/admin) =====================
router.get("/", requirePermission(PERMISSIONS.TRANSACTION_READ), getAllTransaksi); // lihat transaksi (admin: semua, kasir: hanya miliknya)
router.get("/status/:order_id", requirePermission(PERMISSIONS.TRANSACTION_READ), getStatusTransaksi); // cek status transaksi (kasir/admin)
router.post("/", requirePermission(PERMISSIONS.TRANSACTION_CREATE), createTransaksi);                   // tambah transaksi
router.delete("/:id", requirePermission(PERMISSIONS.TRANSACTION_DELETE), deleteTransaksiById);          // hapus pakai _id
router.delete("/nomor/:nomor_transaksi", requirePermission(PERMISSIONS.TRANSACTION_DELETE), deleteTransaksiByNomor); // hapus pakai nomor_transaksi
router.put("/:id", requirePermission(PERMISSIONS.TRANSACTION_UPDATE), updateStatusTransaksi);           // update status manual
router.put("/cancel/:id", requirePermission(PERMISSIONS.TRANSACTION_UPDATE), cancelTransaksi);          // batalkan transaksi

// ===================== 🌍 Public (pembeli, tidak perlu login) =====================
router.get("/public/all", getAllTransaksiPublic);        // semua transaksi (hanya field terbatas)
router.get("/public/status/:order_id", getStatusTransaksiPublic); // cek status transaksi pembeli

// ===================== 🔔 Midtrans Callback =====================
router.post("/midtrans-callback", midtransCallback, (req, res) => {
  console.log("Callback masuk jam:", new Date().toISOString());
  console.log("Body:", JSON.stringify(req.body, null, 2));
  res.json({ received: true });
});

export default router;
