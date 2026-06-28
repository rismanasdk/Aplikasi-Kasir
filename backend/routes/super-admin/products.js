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
import authorize from "../../middleware/authorize.js";
import verifyToken from "../../middleware/verifyToken.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" }); // temporary folder

router.use(verifyToken);
router.use(authorize(["super-admin"]));

router.get("/sales-stats", getSalesStats);

router.get("/", getAllBarang);
router.post("/", upload.single("gambar"), createBarang);
router.put("/:id", upload.single("gambar"), updateBarang);
router.delete("/:id", deleteBarang);

// Production routes
router.post("/production", createProduction);
router.get("/productions", getAllProductions);
router.get("/productions-test", getAllProductions);

// Publish barang route
router.post("/publish-barang", publishBarang);

// Update status route
router.put("/:id/status", updateBarangStatus);

export default router;
