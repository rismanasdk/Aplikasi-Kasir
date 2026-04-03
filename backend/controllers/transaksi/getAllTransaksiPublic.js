import Transaksi from "../../models/datatransaksi.js";

export const getAllTransaksiPublic = async (req, res) => {
  try {
    const transaksi = await Transaksi.find({})
      .select("order_id status metode_pembayaran tanggal_transaksi total_harga createdAt")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({
      total: transaksi.length,
      data: transaksi,
    });
  } catch (error) {
    console.error("Error getAllTransaksi:", error);
    res.status(500).json({ message: error.message });
  }
};
