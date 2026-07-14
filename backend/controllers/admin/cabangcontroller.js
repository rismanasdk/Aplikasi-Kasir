import Branch from "../../models/branch.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../utils/rbacHelper.js";

export const tambahBranch = async (req, res) => {
  try {
    const { nama, alamat, telepon, status, keterangan } = req.body;

    if (!nama) {
      return res.status(400).json({ message: "Nama Cabang wajib diisi" });
    }

    if (!alamat) {
        return res.status(400).json({ message: "Alamat wajib diisi"});
    }

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    const cekBranch = await Branch.findOne({ nama, ...buildBranchFilter(req.user) });
    if (cekBranch) {
      return res.status(400).json({ message: "Branch sudah ada" });
    }

    const branchBaru = new Branch({ nama, alamat, telepon, status, keterangan, branch_id: req.user?.branch_id });
    await branchBaru.save();

    res.status(201).json({
      message: "Cabang berhasil ditambahkan",
      data: branchBaru,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const getSemuaBranch = async (req, res) => {
  try {
    const branch = await Branch.find(buildBranchFilter(req.user)).sort({ createdAt: -1 });
    res.json(branch);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const hapusBranch = async (req, res) => {
  try {
    const { id } = req.params;
    await Branch.findOneAndDelete({ _id: id, ...buildBranchFilter(req.user) });
    res.json({ message: "Cabang berhasil dihapus" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const editBranch = async (req, res) => {
  try {
    const { id } = req.params;
    const { nama, alamat, telepon, status, keterangan } = req.body;

    const branch = await Branch.findOneAndUpdate(
      { _id: id, ...buildBranchFilter(req.user) },
      { nama, alamat, telepon, status, keterangan },
      { new: true }
    );

    res.json({
      message: "Cabang berhasil diperbarui",
      data: branch,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
