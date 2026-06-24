// controllers/super-admin/dashboardcontroller.js
// Re-export admin dashboard controller - super-admin memiliki akses lengkap
export {
  getDashboardOmzet,
  getTransaksi,
  getTopBarang,
  getLaporanPenjualan,
  getBreakdownMetodePembayaran,
  getLatestTransaksi,
  updateBestSellerCategory
} from "../admin/dashboardcontroller.js";
