import express from "express";
import {
  getAllBiayaLayanan,
  getBiayaLayananById,
  createBiayaLayanan,
  updateBiayaLayanan,
  deleteBiayaLayanan,
} from "../../controllers/super-admin/biayalayanancontroller.js";

const router = express.Router();

// Super-admin full CRUD untuk biaya layanan configuration
router.get("/", getAllBiayaLayanan);
router.get("/:id", getBiayaLayananById);
router.post("/", createBiayaLayanan);
router.put("/:id", updateBiayaLayanan);
router.delete("/:id", deleteBiayaLayanan);

export default router;
