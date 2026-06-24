// controllers/super-admin/laporancontroller.js
// Re-export admin laporan controller - super-admin memiliki akses lengkap laporan keuangan
export {
  getAllLaporan,
  getLaporanByPeriode,
  getRingkasanPenjualan,
  getRekapMetodePembayaran,
  getLaba,
  getDaftarBulanLaporan,
  getLaporanById,
  getDetailLaba,
  getRekapMetodePembayaranRealtime
} from "../admin/laporancontroller.js";
