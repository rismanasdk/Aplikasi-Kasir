import express from "express";
import {
  bayarKewajiban,
  createKewajiban,
  deleteKewajiban,
  getKewajibanById,
  getRingkasanKewajiban,
  listKewajiban,
  updateKewajiban,
} from "../../controllers/admin/kewajibancontroller.js";

const router = express.Router();

router.get("/", listKewajiban);
router.get("/ringkasan", getRingkasanKewajiban);
router.get("/:id", getKewajibanById);
router.post("/", createKewajiban);
router.put("/:id", updateKewajiban);
router.post("/:id/bayar", bayarKewajiban);
router.delete("/:id", deleteKewajiban);

export default router;
