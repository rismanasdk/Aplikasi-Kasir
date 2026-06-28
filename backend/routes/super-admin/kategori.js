import express from "express";
import {
  tambahKategori,
  getSemuaKategori,
  hapusKategori,
  editKategori,
} from "../../controllers/admin/kategoricontroller.js";

const router = express.Router();

router.get("/", getSemuaKategori);
router.post("/", tambahKategori);
router.delete("/:id", hapusKategori);
router.put("/:id", editKategori);

export default router;
