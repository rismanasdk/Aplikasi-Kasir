import express from "express";
import multer from "multer";
import {
  getAllBarang,
  createBarang,
  updateBarang,
  deleteBarang,
  decrementStock,
  updateBarangStatus,
} from "../controllers/databarangControllers.js";
import verifyToken from "../middleware/verifyToken.js";
import { requirePermission } from "../middleware/authorization.js";
import { PERMISSIONS } from "../../shared/permissionRegistry.js";

const upload = multer({ dest: "uploads/" });
const router = express.Router();

// Middleware untuk handle FormData pada PUT request
const handleFormData = upload.any();

router.get("/", getAllBarang);
router.post("/", verifyToken, requirePermission(PERMISSIONS.PRODUCT_CREATE), upload.single("gambar"), createBarang);
router.put("/:id", verifyToken, requirePermission(PERMISSIONS.PRODUCT_UPDATE), handleFormData, updateBarang);
router.post("/:id/update", verifyToken, requirePermission(PERMISSIONS.PRODUCT_UPDATE), handleFormData, updateBarang);
router.put("/:id/status", verifyToken, requirePermission(PERMISSIONS.PRODUCT_UPDATE), updateBarangStatus);
router.delete("/:id", verifyToken, requirePermission(PERMISSIONS.PRODUCT_DELETE), deleteBarang);
router.post("/:id/decrement", verifyToken, requirePermission(PERMISSIONS.STOCK_ADJUST), decrementStock);

export default router;
