import express from "express";
import { addTransaksiToHpp, getHppHarian, getHppSummary, resetMonthlyBeban } from "../../controllers/admin/hpptotalcontroller.js";
import { requirePermission } from "../../middleware/authorization.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";

const router = express.Router();

// otomatis insert per transaksi
router.get("/", requirePermission(PERMISSIONS.REPORT_VIEW), getHppHarian)
router.get("/summary", requirePermission(PERMISSIONS.REPORT_VIEW), getHppSummary )
router.post("/hpp/tambah-transaksi", requirePermission(PERMISSIONS.REPORT_VIEW), addTransaksiToHpp);
// Reset monthly total_beban for HppHarian documents
router.post("/reset-month", requirePermission(PERMISSIONS.REPORT_EXPORT), resetMonthlyBeban);

export default router;
