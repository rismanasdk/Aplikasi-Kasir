import express from "express";
import { getSettings } from "../controllers/admin/settingscontroller.js";
import { getAllBiayaLayanan } from "../controllers/admin/biayalayanancontroller.js";

const router = express.Router();

// Read-only endpoints shared across roles
router.get("/settings", getSettings);
router.get("/biaya-layanan", getAllBiayaLayanan);

export default router;
