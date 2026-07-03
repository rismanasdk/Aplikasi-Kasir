import Transaksi from "../../models/datatransaksi.js";
import DataBarang from "../../models/databarang.js";

/**
 * GET /api/super-admin/laporan/forecast
 * Query params: start (YYYY-MM-DD), end (YYYY-MM-DD)
 */
export const getForecastSummary = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({
        message: "start and end query parameters are required (YYYY-MM-DD)",
      });
    }

    const startDate = new Date(start);
    const endDate = new Date(end);
    endDate.setHours(23, 59, 59, 999);

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Get transaction history for the date range
    const transaksiBulk = await Transaksi.find({
      status: "selesai",
      tanggal_transaksi: { $gte: startDate, $lte: endDate },
    }).lean();

    // Group by date to create daily sales history
    const historyByDate = {};
    transaksiBulk.forEach((transaksi) => {
      const dateStr = new Date(transaksi.tanggal_transaksi)
        .toISOString()
        .split("T")[0];
      if (!historyByDate[dateStr]) {
        historyByDate[dateStr] = 0;
      }
      historyByDate[dateStr] += transaksi.total_harga || 0;
    });

    const histori = Object.entries(historyByDate).map(([tanggal, total_penjualan]) => ({
      tanggal,
      total_penjualan,
    }));

    // Get all products and calculate their total quantities sold in the period
    const allProduk = await DataBarang.find().lean();

    const produkStats = allProduk.map((barang) => {
      let totalQtySold = 0;
      transaksiBulk.forEach((transaksi) => {
        if (transaksi.barang_dibeli && Array.isArray(transaksi.barang_dibeli)) {
          transaksi.barang_dibeli.forEach((item) => {
            if (item.kode_barang === barang.kode_barang) {
              totalQtySold += parseFloat(item.jumlah) || 0;
            }
          });
        }
      });

      return {
        nama: barang.nama_barang || barang.name || "",
        total_qty_terjual: totalQtySold,
        stok_sekarang: barang.stok || 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: {
        histori,
        produk: produkStats,
      },
    });
  } catch (error) {
    console.error("Error getForecastSummary:", error);
    return res.status(500).json({
      success: false,
      message: "Gagal mengambil data forecast",
      error: error.message,
    });
  }
};

export default { getForecastSummary };
