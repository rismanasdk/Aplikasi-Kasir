import Settings from "../../../models/settings.js";
import Barang from "../../../models/databarang.js";
import { calculateHargaFinal, updateAllBarangHargaFinal } from "../settings/utils/calculateHarga.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../../utils/rbacHelper.js";

export const updateGlobalDiscount = async (req, res) => {
  try {
    const { globalDiscount } = req.body;
    if (typeof globalDiscount !== "number" || globalDiscount < 0)
      return res.status(400).json({ message: "Diskon harus berupa angka positif" });

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    let settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) settings = await Settings.create({ globalDiscount, branch_id: req.user.branch_id });
    else settings.globalDiscount = globalDiscount;

    await settings.save();

    // 🔹 Update semua barang menggunakan fungsi utilitas
    await updateAllBarangHargaFinal(Barang, settings);

    res.json({ message: "Diskon global berhasil diperbarui!", settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};