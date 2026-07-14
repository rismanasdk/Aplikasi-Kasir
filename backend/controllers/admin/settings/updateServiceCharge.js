import Settings from "../../../models/settings.js";
import Barang from "../../../models/databarang.js";
import PengeluaranBiaya from "../../../models/pengeluaranbiaya.js";
import { updateAllBarangHargaFinal } from "../settings/utils/calculateHarga.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../../utils/rbacHelper.js";

const DEFAULT_TARGET_OMZET_BULANAN = 15000000;
const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

export const updateServiceCharge = async (req, res) => {
  try {
    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    let settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      settings = await Settings.create({ branch_id: req.user.branch_id });
    }

    // 🔹 Hitung total pengeluaran operasional untuk bulan berjalan dari collection pengeluaran_biaya
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999);
    const agg = await PengeluaranBiaya.aggregate([
      { $match: { ...buildBranchFilter(req.user), tanggal: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$jumlah" } } }
    ]);
    const totalBiayaOperasional = agg && agg[0] ? agg[0].total : 0;

    if (req.body?.targetOmzetBulanan !== undefined) {
      settings.targetOmzetBulanan = Number(req.body.targetOmzetBulanan) || 0;
    } else if (settings.targetOmzetBulanan === undefined || settings.targetOmzetBulanan === null) {
      settings.targetOmzetBulanan = DEFAULT_TARGET_OMZET_BULANAN;
    }

    const targetOmzetBulanan = Number(settings.targetOmzetBulanan) || 0;

    // 🔹 Hitung service charge dari target omzet bulanan
    let calculatedServiceCharge = 0;
    if (targetOmzetBulanan > 0) {
      calculatedServiceCharge = roundToTwoDecimals((totalBiayaOperasional / targetOmzetBulanan) * 100);
    }

    // 🔹 Update settings
    settings.calculatedServiceCharge = calculatedServiceCharge;
    settings.serviceCharge = calculatedServiceCharge;
    console.log("SERVICE CHARGE RECALC");
    console.log({
      totalBiayaOperasional,
      targetOmzetBulanan,
      serviceCharge: calculatedServiceCharge
    });
    await settings.save();
    
    // 🔹 Update semua barang menggunakan fungsi utilitas
    await updateAllBarangHargaFinal(Barang, settings);

    res.json({
      message: "Service charge berhasil diperbarui!",
      settings,
      detail: {
        totalBiayaOperasional,
        targetOmzetBulanan,
        serviceCharge: calculatedServiceCharge
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
