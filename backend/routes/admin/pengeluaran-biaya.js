
import express from "express";
import { createPengeluaran, listPengeluaran, deletePengeluaran } from "../../controllers/admin/pengeluarancontroller.js";

const router = express.Router();

router.post("/", createPengeluaran);
router.get("/", listPengeluaran);
router.delete("/:id", deletePengeluaran);

export default router;
