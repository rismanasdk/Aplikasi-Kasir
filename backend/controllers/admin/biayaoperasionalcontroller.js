import db from "../../config/firebaseAdmin.js";
import { io } from "../../server.js";
import BiayaOperasional from "../../models/biayaoperasional.js"; // kategori
import PengeluaranBiaya from "../../models/pengeluaranbiaya.js";
import Barang from "../../models/databarang.js";
import Settings from "../../models/settings.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

const roundToTwoDecimals = (value) => Math.round(value * 100) / 100;

// --- KATEGORI (MASTER) CRUD ---
export const getCategories = async (req, res) => {
  try {
    const list = await BiayaOperasional.find(buildBranchFilter(req.user)).sort({ createdAt: -1 });
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: "Gagal mengambil kategori", error: err.message });
  }
};

export const createCategory = async (req, res) => {
  try {
    validateAndInjectBranch(req, true);
    const { nama, isActive } = req.body;
    if (!nama || !nama.trim()) return res.status(400).json({ message: "Nama wajib diisi" });

    const newCat = new BiayaOperasional({ nama: nama.trim(), isActive: isActive !== false, branch_id: req.body.branch_id || req.user?.branch_id || null });
    await newCat.save();
    res.json({ message: "Kategori berhasil dibuat", data: newCat });
  } catch (err) {
    res.status(500).json({ message: "Gagal membuat kategori", error: err.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
    validateAndInjectBranch(req, true);
    const { id } = req.params;
    const { nama, isActive } = req.body;
    const updated = await BiayaOperasional.findOneAndUpdate({ _id: id, ...buildBranchFilter(req.user) }, { nama, isActive, branch_id: req.body.branch_id || req.user?.branch_id || null }, { new: true });
    res.json({ message: "Kategori diperbarui", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Gagal memperbarui kategori", error: err.message });
  }
};

export const softDeleteCategory = async (req, res) => {
  try {
    validateAndInjectBranch(req, true);
    const { id } = req.params;
    const updated = await BiayaOperasional.findOneAndUpdate({ _id: id, ...buildBranchFilter(req.user) }, { isActive: false, branch_id: req.body.branch_id || req.user?.branch_id || null }, { new: true });
    res.json({ message: "Kategori dinonaktifkan", data: updated });
  } catch (err) {
    res.status(500).json({ message: "Gagal menonaktifkan kategori", error: err.message });
  }
};

// --- Service charge & hargaFinal update: compute total pengeluaran from pengeluaran_biaya (monthly)
export const updateAllBarangHargaFinal = async () => {
  const settings = (await Settings.findOne()) || (await Settings.create({}));
  const taxRate = settings?.taxRate ?? 0;
  const globalDiscount = settings?.globalDiscount ?? 0;

  // Compute total pengeluaran operasional for current month using aggregation
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const agg = await PengeluaranBiaya.aggregate([
    { $match: { tanggal: { $gte: startOfMonth, $lte: endOfMonth } } },
    { $group: { _id: null, total: { $sum: "$jumlah" } } }
  ]);

  const totalBiayaOperasional = (agg && agg[0] && agg[0].total) ? agg[0].total : 0;

  const allBarang = await Barang.find();

  const targetOmzetBulanan = Number(settings.targetOmzetBulanan) || 0;

  // Hitung service charge dari target omzet bulanan
  let calculatedServiceCharge = 0;
  if (targetOmzetBulanan > 0) {
    calculatedServiceCharge = roundToTwoDecimals((totalBiayaOperasional / targetOmzetBulanan) * 100);
  }

  settings.calculatedServiceCharge = calculatedServiceCharge;
  settings.serviceCharge = calculatedServiceCharge;
  await settings.save();

  // Push to firebase and notify via socket
  try {
    if (db) {
      const plainSettings = {
        calculatedServiceCharge: settings.calculatedServiceCharge,
        serviceCharge: settings.serviceCharge,
        targetOmzetBulanan: settings.targetOmzetBulanan,
        taxRate: settings.taxRate || 0,
        globalDiscount: settings.globalDiscount || 0,
      };
      await db.ref(`/settings`).set(plainSettings);
      io.emit("settings:updated", plainSettings);
    }
  } catch (e) {
    console.warn("⚠️ Gagal push settings ke Firebase RTDB:", e.message);
  }

  // Update hargaFinal semua barang
  const activeServiceCharge = settings.serviceCharge || 0;
  let totalUpdated = 0;
  for (const barang of allBarang) {
    const hargaJual = Number(barang.harga_jual) || 0;
    const hargaSetelahDiskon = hargaJual - (hargaJual * globalDiscount) / 100;
    const hargaSetelahPajak = hargaSetelahDiskon + (hargaSetelahDiskon * taxRate) / 100;
    const hargaFinal = hargaSetelahPajak + (hargaSetelahPajak * activeServiceCharge) / 100;

    barang.hargaFinal = Math.round(hargaFinal);

    if (db) {
      try {
        const id = barang._id.toString();
        await db.ref(`/barang/${id}`).update({ harga_final: Math.round(hargaFinal) });
      } catch (e) {
        console.warn(`⚠️ Gagal update harga di Firebase untuk barang ${barang._id}:`, e.message);
      }
    }

    io.emit("barang:updated", barang);
    await barang.save();
    totalUpdated++;
  }
  console.log(`✅ Berhasil update ${totalUpdated} barang`);
};

// backward-compatible alias for routes that might expect getBiaya
export const getBiaya = getCategories;
