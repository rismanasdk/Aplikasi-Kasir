import Kategori from "../../models/kategori.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

// ✅ Tambah kategori baru
export const tambahKategori = async (req, res) => {
  try {
    const { nama, deskripsi } = req.body;

    if (!nama) {
      return res.status(400).json({ message: "Nama kategori wajib diisi" });
    }

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    const cekKategori = await Kategori.findOne({ nama, ...buildBranchFilter(req.user) });
    if (cekKategori) {
      return res.status(400).json({ message: "Kategori sudah ada" });
    }

    const kategoriBaru = new Kategori({ nama, deskripsi, branch_id: req.user?.branch_id });
    await kategoriBaru.save();

    res.status(201).json({
      message: "Kategori berhasil ditambahkan",
      data: kategoriBaru,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Ambil semua kategori
export const getSemuaKategori = async (req, res) => {
  try {
    const kategori = await Kategori.find(buildBranchFilter(req.user)).sort({ createdAt: -1 });
    res.json(kategori);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Hapus kategori
export const hapusKategori = async (req, res) => {
  try {
    const { id } = req.params;
    await Kategori.findOneAndDelete({ _id: id, ...buildBranchFilter(req.user) });
    res.json({ message: "Kategori berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Edit kategori
export const editKategori = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, deskripsi } = req.body;

    const kategori = await Kategori.findOneAndUpdate(
      { _id: id, ...buildBranchFilter(req.user) },
      { nama, deskripsi },
      { new: true }
    );

    res.json({
      message: "Kategori berhasil diperbarui",
      data: kategori,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
