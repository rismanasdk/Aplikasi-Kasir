import express from "express";
import { getDashboardOmzet, getTransaksi, getTopBarang, getLaporanPenjualan, getBreakdownMetodePembayaran, getLatestTransaksi, updateBestSellerCategory} from "../../controllers/super-admin/dashboardcontroller.js";

const router = express.Router();

// Super-admin dashboard dengan akses penuh laporan keuangan
router.get("/omzet", getDashboardOmzet);
router.get("/status-pesanan", getTransaksi);
router.get("/top-barang", getTopBarang);
router.get("/laporan-penjualan/:jenis", getLaporanPenjualan);
router.get("/breakdown-pembayaran", getBreakdownMetodePembayaran);
router.get("/transaksi/terakhir", getLatestTransaksi);
router.post("/update-best-seller", updateBestSellerCategory);

export default router;
