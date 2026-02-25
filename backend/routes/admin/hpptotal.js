import express from "express";
import { addTransaksiToHpp, getHppHarian, getHppSummary, resetMonthlyBeban } from "../../controllers/admin/hpptotalcontroller.js";
import authorize from "../../middleware/authorize.js";

const router = express.Router();

// otomatis insert per transaksi
router.get("/", getHppHarian)
router.get("/summary", getHppSummary )
router.post("/hpp/tambah-transaksi", addTransaksiToHpp);
// Reset monthly total_beban for HppHarian documents (admin only)
router.post("/reset-month", authorize(["admin"]), resetMonthlyBeban);

export default router;
