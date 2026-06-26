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
    getRekapMetodePembayaranRealtime,
    getNeraca
} from "../../controllers/super-admin/laporancontroller.js";

const router = express.Router();

// Super-admin dapat akses penuh laporan keuangan lengkap
router.get("/", getAllLaporan);
router.get("/periode", getLaporanByPeriode);
router.get("/ringkasan", getRingkasanPenjualan);
router.get("/bulan", getDaftarBulanLaporan);
router.get("/metode-pembayaran", getRekapMetodePembayaran);
router.get("/rekap-metode", getRekapMetodePembayaranRealtime);
router.get("/laba", getLaba);
router.get("/detail-laba", getDetailLaba);
router.get("/neraca", getNeraca);
router.get("/:id", getLaporanById);

export default router;
