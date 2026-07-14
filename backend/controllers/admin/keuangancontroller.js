import Transaksi from "../../models/datatransaksi.js";
import PengeluaranBiaya from "../../models/pengeluaranbiaya.js";
import Settings from "../../models/settings.js";
import { buildBranchFilter } from "../../utils/rbacHelper.js";

export const getKeuanganSummary = async (req, res) => {
  try {
    const { start, end } = req.query;

    if (!start || !end) {
      return res.status(400).json({ message: "Harap sertakan query params 'start' dan 'end' dalam format YYYY-MM-DD" });
    }

    const startDate = new Date(String(start) + 'T00:00:00.000Z');
    const endDate = new Date(String(end) + 'T23:59:59.999Z');

    const transaksiMatch = {
      status: "selesai",
      ...buildBranchFilter(req.user),
      tanggal_transaksi: { $gte: startDate, $lte: endDate }
    };

    const transaksiFacet = await Transaksi.aggregate([
      { $match: transaksiMatch },
      { $facet: {
          pendapatan: [ { $group: { _id: null, total_pendapatan: { $sum: "$total_harga" } } } ],
          items: [ { $unwind: { path: "$barang_dibeli", preserveNullAndEmptyArrays: true } },
                   { $group: { _id: null, total_hpp: { $sum: { $multiply: [ { $toDouble: "$barang_dibeli.harga_beli" }, { $toDouble: "$barang_dibeli.jumlah" } ] } } } }
        ]
      } }
    ]);

    const pendapatanObj = (transaksiFacet && transaksiFacet[0] && transaksiFacet[0].pendapatan && transaksiFacet[0].pendapatan[0]) || { total_pendapatan: 0 };
    const itemsObj = (transaksiFacet && transaksiFacet[0] && transaksiFacet[0].items && transaksiFacet[0].items[0]) || { total_hpp: 0 };

    const total_pendapatan = Number(pendapatanObj.total_pendapatan || 0);
    const total_hpp = Number(itemsObj.total_hpp || 0);

    const pengeluaranAgg = await PengeluaranBiaya.aggregate([
      { $match: { ...buildBranchFilter(req.user), tanggal: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: null, total_pengeluaran: { $sum: "$jumlah" } } }
    ]);
    const total_pengeluaran = (pengeluaranAgg && pengeluaranAgg[0] && pengeluaranAgg[0].total_pengeluaran) ? Number(pengeluaranAgg[0].total_pengeluaran) : 0;

    const settingsDoc = await Settings.findOne(buildBranchFilter(req.user));
    const target_omzet = settingsDoc?.targetOmzetBulanan ?? 0;

    return res.json({
      keuangan: {
        pendapatan: total_pendapatan,
        hpp: total_hpp,
        pengeluaran_operasional: total_pengeluaran,
        target_omzet: target_omzet,
      }
    });
  } catch (error) {
    console.error('Error getKeuanganSummary:', error);
    return res.status(500).json({ message: error.message });
  }
};
