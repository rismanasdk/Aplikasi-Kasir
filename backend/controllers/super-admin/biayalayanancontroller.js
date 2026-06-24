// controllers/super-admin/biayalayanancontroller.js
// Re-export admin biayalayanan controller - super-admin punya akses penuh konfigurasi biaya layanan
export {
  getAllBiayaLayanan,
  getBiayaLayananById,
  createBiayaLayanan,
  updateBiayaLayanan,
  deleteBiayaLayanan
} from "../admin/biayalayanancontroller.js";
