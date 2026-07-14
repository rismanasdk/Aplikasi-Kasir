import BiayaLayanan from "../../models/biayalayanan.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

// ✅ GET all
export const getAllBiayaLayanan = async (req, res) => {
  try {
    const data = await BiayaLayanan.find(buildBranchFilter(req.user));
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ GET by ID
export const getBiayaLayananById = async (req, res) => {
  try {
    const data = await BiayaLayanan.findOne({ _id: req.params.id, ...buildBranchFilter(req.user) });
    if (!data) return res.status(404).json({ message: "Data tidak ditemukan" });
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ✅ CREATE
export const createBiayaLayanan = async (req, res) => {
  try {
    validateAndInjectBranch(req, true);
    const { nama, persen, deskripsi } = req.body;
    const newData = new BiayaLayanan({ nama, persen, deskripsi, branch_id: req.body.branch_id || req.user?.branch_id || null });
    await newData.save();
    res.status(201).json(newData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ✅ UPDATE
export const updateBiayaLayanan = async (req, res) => {
  try {
    validateAndInjectBranch(req, true);
    const { id } = req.params;
    const updatedData = await BiayaLayanan.findOneAndUpdate({ _id: id, ...buildBranchFilter(req.user) }, { ...req.body, branch_id: req.body.branch_id || req.user?.branch_id || null }, {
      new: true,
    });
    if (!updatedData)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    res.status(200).json(updatedData);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
};

// ✅ DELETE
export const deleteBiayaLayanan = async (req, res) => {
  try {
    const deletedData = await BiayaLayanan.findOneAndDelete({ _id: req.params.id, ...buildBranchFilter(req.user) });
    if (!deletedData)
      return res.status(404).json({ message: "Data tidak ditemukan" });
    res.status(200).json({ message: "Berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
