// routes/admin/laporan.js
import express from "express";
import {
    getAllLaporan,
    getLaporanByPeriode,
    getRingkasanPenjualan,
    getRekapMetodePembayaran,
    getLaba,
    getDaftarBulanLaporan,
    getLaporanById,
    getDetailLaba,
    getRekapMetodePembayaranRealtime
} from "../../controllers/admin/laporancontroller.js";

const router = express.Router();

// Ambil semua pesanan terbaru (10 terakhir)
router.get("/", getAllLaporan);

// Update status pesanan (manual update bebas)
router.get("/periode", getLaporanByPeriode);

// Admin ACC pesanan (pending -> selesai)
router.get("/ringkasan", getRingkasanPenjualan);

router.get("/bulan", getDaftarBulanLaporan);
router.get("/metode-pembayaran", getRekapMetodePembayaran);
router.get("/rekap-metode", getRekapMetodePembayaranRealtime);
router.get("/laba", getLaba);
router.get("/detail-laba", getDetailLaba);
router.get("/:id", getLaporanById);
// Admin batalkan pesanan

export default router;