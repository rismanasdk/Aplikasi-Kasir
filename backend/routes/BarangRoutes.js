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
import authorize from "../middleware/authorize.js";

const upload = multer({ dest: "uploads/" });
const router = express.Router();

// Middleware untuk handle FormData pada PUT request
const handleFormData = upload.any();

router.get("/", getAllBarang);
router.post("/", verifyToken, authorize(["admin"]), upload.single("gambar"), createBarang);
router.put("/:id", verifyToken, authorize(["admin"]), handleFormData, updateBarang);
router.post("/:id/update", verifyToken, authorize(["admin"]), handleFormData, updateBarang);
router.put("/:id/status", verifyToken, authorize(["admin"]), updateBarangStatus);
router.delete("/:id", verifyToken, authorize(["admin"]), deleteBarang);
router.post("/:id/decrement", verifyToken, authorize(["admin", "kasir"]), decrementStock);

export default router;
