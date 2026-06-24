import Settings from "../../../models/settings.js";
import Barang from "../../../models/databarang.js";
import BiayaOperasional from "../../../models/biayaoperasional.js";
import PengeluaranBiaya from "../../../models/pengeluaranbiaya.js";
import { calculateHargaFinal, updateAllBarangHargaFinal } from "../settings/utils/calculateHarga.js";

export const updateServiceCharge = async (req, res) => {
  try {
    let settings = await Settings.findOne();
    if (!settings) {
      settings = await Settings.create({});
    }

    // 🔹 Hitung total pengeluaran operasional untuk bulan berjalan dari collection pengeluaran_biaya
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23,59,59,999);
    const agg = await PengeluaranBiaya.aggregate([
      { $match: { tanggal: { $gte: startOfMonth, $lte: endOfMonth } } },
      { $group: { _id: null, total: { $sum: "$jumlah" } } }
    ]);
    const totalBiayaOperasional = agg && agg[0] ? agg[0].total : 0;

    // 🔹 Hitung total nilai barang
    const allBarang = await Barang.find();
    const totalNilaiBarang = allBarang.reduce((sum, b) => sum + (Number(b.harga_jual) || 0), 0);

    // 🔹 Hitung service charge dari biaya operasional
    let calculatedServiceCharge = 0;
    if (totalNilaiBarang > 0) {
      const estimasiPenjualanBulanan = totalNilaiBarang * 30;
      calculatedServiceCharge = (totalBiayaOperasional / estimasiPenjualanBulanan) * 100;
      
      const MAX_SERVICE_CHARGE = 100;
      calculatedServiceCharge = Math.min(
        Math.round(calculatedServiceCharge * 100) / 100,
        MAX_SERVICE_CHARGE
      );
    }

    // 🔹 Update settings
    settings.calculatedServiceCharge = calculatedServiceCharge;
    settings.serviceCharge = calculatedServiceCharge;
    console.log("SERVICE CHARGE RECALC");
    console.log({
      totalBiayaOperasional,
      totalNilaiBarang,
      calculatedServiceCharge
    });
    await settings.save();
    
    // 🔹 Update semua barang menggunakan fungsi utilitas
    await updateAllBarangHargaFinal(Barang, settings);

    res.json({
      message: "Service charge berhasil diperbarui!",
      settings,
      detail: {
        totalBiayaOperasional,
        totalNilaiBarangPerHari: totalNilaiBarang,
        estimasiPenjualanBulanan: totalNilaiBarang * 30,
        serviceCharge: `${calculatedServiceCharge}% (max 25%)`
      }
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};