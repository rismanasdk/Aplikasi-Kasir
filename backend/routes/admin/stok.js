import express from "express";
import multer from "multer";
import {
    getAllBarang,
    createBarang,
    updateBarang,
    deleteBarang,
    createProduction,
    getAllProductions,
    publishBarang
} from "../../controllers/admin/stokbarangcontroller.js";
import { updateBarangStatus } from "../../controllers/databarangControllers.js";
import { requirePermission } from "../../middleware/authorization.js";
import { PERMISSIONS } from "../../shared/permissionRegistry.js";
import verifyToken from "../../middleware/verifyToken.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // temporary folder

router.use(verifyToken);
router.use(requirePermission(PERMISSIONS.STOCK_VIEW));

router.get("/", getAllBarang);
router.post("/", requirePermission(PERMISSIONS.PRODUCT_CREATE), upload.single("gambar"), createBarang);
router.put("/:id", requirePermission(PERMISSIONS.PRODUCT_UPDATE), upload.single("gambar"), updateBarang);
router.delete("/:id", requirePermission(PERMISSIONS.PRODUCT_DELETE), deleteBarang);

// Production routes
router.post("/production", createProduction);
router.get("/productions", getAllProductions);
router.get("/productions-test", getAllProductions);

// Publish barang route
router.post("/publish-barang", publishBarang);

// Update status route
router.put("/:id/status", updateBarangStatus);

export default router;
