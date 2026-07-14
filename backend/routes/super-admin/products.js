import express from "express";
import multer from "multer";
import {
    getAllBarang,
    createBarang,
    updateBarang,
    deleteBarang,
    createProduction,
    getAllProductions,
    publishBarang,
    getSalesStats
} from "../../controllers/super-admin/productscontroller.js";
import { updateBarangStatus } from "../../controllers/databarangControllers.js";
import { requirePermission } from "../../middleware/authorization.js";
import { PERMISSIONS } from "../../../shared/permissionRegistry.js";
import verifyToken from "../../middleware/verifyToken.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // temporary folder

router.use(verifyToken);
router.use(requirePermission(PERMISSIONS.PRODUCT_READ));

router.get("/sales-stats", requirePermission(PERMISSIONS.REPORT_VIEW), getSalesStats);

router.get("/", getAllBarang);
router.post("/", requirePermission(PERMISSIONS.PRODUCT_CREATE), upload.single("gambar"), createBarang);
router.put("/:id", requirePermission(PERMISSIONS.PRODUCT_UPDATE), upload.single("gambar"), updateBarang);
router.delete("/:id", requirePermission(PERMISSIONS.PRODUCT_DELETE), deleteBarang);

// Production routes
router.post("/production", requirePermission(PERMISSIONS.PRODUCT_CREATE), createProduction);
router.get("/productions", requirePermission(PERMISSIONS.PRODUCT_READ), getAllProductions);
router.get("/productions-test", requirePermission(PERMISSIONS.PRODUCT_READ), getAllProductions);

// Publish barang route
router.post("/publish-barang", requirePermission(PERMISSIONS.PRODUCT_UPDATE), publishBarang);

// Update status route
router.put("/:id/status", requirePermission(PERMISSIONS.PRODUCT_UPDATE), updateBarangStatus);

export default router;
