import express from "express";
import {
  getModalUtama,
  createModalUtama,
  tambahBahanBaku,
  tambahBiayaOperasional,
  tambahModalBaru,
  editBahanBaku,
  hapusBahanBaku,
  hapusBahanDariProduk,
  ambilPrive
} from "../../controllers/super-admin/modalutamacontroller.js";

const router = express.Router();

router.get("/", getModalUtama);
router.post("/", createModalUtama);
router.post("/bahan-baku", tambahBahanBaku);
router.put("/bahan-baku/:id_produk", editBahanBaku);
router.delete("/bahan-baku/:id_produk", hapusBahanBaku);
router.delete("/bahan-baku/:id_produk/bahan/:id_bahan", hapusBahanDariProduk);
router.post("/biaya-operasional", tambahBiayaOperasional);
router.post("/tambah-modal", tambahModalBaru);
router.post("/prive", ambilPrive);

export default router;
