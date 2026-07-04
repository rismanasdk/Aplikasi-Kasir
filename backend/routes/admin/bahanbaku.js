import express from "express";
import multer from "multer";
import {
  getAllBahanBaku,
  createBahanBaku,
  updateBahanBaku,
  deleteBahanBaku,
  updateBahanBakuStatus,
} from "../../controllers/admin/bahanbakumanager.js";
import { requirePermission } from "../../middleware/authorization.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";
import verifyToken from "../../middleware/verifyToken.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// All routes require authentication and stock access
router.use(verifyToken);
router.use(requirePermission(PERMISSIONS.STOCK_VIEW));

router.get("/", getAllBahanBaku);
router.post("/", requirePermission(PERMISSIONS.STOCK_ADJUST), upload.single("gambar"), createBahanBaku);
router.put("/:id", requirePermission(PERMISSIONS.STOCK_ADJUST), upload.single("gambar"), updateBahanBaku);
router.delete("/:id", requirePermission(PERMISSIONS.STOCK_ADJUST), deleteBahanBaku);
router.put("/:id/status", requirePermission(PERMISSIONS.STOCK_ADJUST), updateBahanBakuStatus);

export default router;  