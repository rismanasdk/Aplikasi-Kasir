import Permission from "../../models/permission.js";
import { buildPermissionPayload } from "../../utils/permissionUtils.js";

// GET /api/super-admin/permission
export const getSemuaPermission = async (req, res) => {
  try {
    const { search, modul, mode } = req.query;
    const filter = { mode: { $ne: "hidden" } };

    if (search) {
      filter.$or = [
        { code: { $regex: search, $options: "i" } },
        { nama: { $regex: search, $options: "i" } },
        { deskripsi: { $regex: search, $options: "i" } },
      ];
    }

    if (modul) filter.modul = modul;
    if (mode && typeof mode === "string") {
      const normalizedMode = mode.trim().toLowerCase();
      if (["active", "deprecated", "hidden"].includes(normalizedMode)) {
        if (normalizedMode === "hidden") {
          filter.mode = "hidden";
        } else {
          filter.mode = normalizedMode;
        }
      }
    }

    const permissions = await Permission.find(filter).sort({ modul: 1, code: 1 });

    res.status(200).json({
      success: true,
      message: "Berhasil mengambil data permission",
      data: permissions,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// GET /api/super-admin/permission/:id
export const getPermissionById = async (req, res) => {
  try {
    const { id } = req.params;
    const permission = await Permission.findById(id);

    if (!permission) {
      return res.status(404).json({ success: false, message: "Permission tidak ditemukan" });
    }

    res.status(200).json({ success: true, data: permission });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Format ID tidak valid" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// POST /api/super-admin/permission
export const tambahPermission = async (req, res) => {
  try {
    const payload = buildPermissionPayload(req.body);
    const { code, nama, deskripsi, modul } = payload;

    if (!code || code.trim() === "") {
      return res.status(400).json({ success: false, message: "Code permission wajib diisi" });
    }

    if (!nama || nama.trim() === "") {
      return res.status(400).json({ success: false, message: "Nama permission wajib diisi" });
    }

    const cekPermission = await Permission.findOne({ code: code.trim() });
    if (cekPermission) {
      return res.status(409).json({ success: false, message: "Code permission sudah digunakan" });
    }

    const permissionBaru = new Permission({ code, nama, deskripsi, modul });
    await permissionBaru.save();

    res.status(201).json({
      success: true,
      message: "Permission berhasil ditambahkan",
      data: permissionBaru,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Code permission sudah digunakan" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// PUT /api/super-admin/permission/:id
export const editPermission = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = buildPermissionPayload(req.body);
    const { code, nama, deskripsi, modul } = payload;

    const permission = await Permission.findById(id);
    if (!permission) {
      return res.status(404).json({ success: false, message: "Permission tidak ditemukan" });
    }

    if (code !== undefined) permission.code = code;
    if (nama !== undefined) permission.nama = nama;
    if (deskripsi !== undefined) permission.deskripsi = deskripsi;
    if (modul !== undefined) permission.modul = modul;

    await permission.save();

    res.status(200).json({
      success: true,
      message: "Permission berhasil diperbarui",
      data: permission,
    });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Format ID tidak valid" });
    }
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "Code permission sudah digunakan" });
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ success: false, message: error.message });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

// DELETE /api/super-admin/permission/:id
export const hapusPermission = async (req, res) => {
  try {
    const { id } = req.params;

    const permission = await Permission.findByIdAndDelete(id);
    if (!permission) {
      return res.status(404).json({ success: false, message: "Permission tidak ditemukan" });
    }

    res.status(200).json({ success: true, message: "Permission berhasil dihapus" });
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Format ID tidak valid" });
    }
    res.status(500).json({ success: false, message: error.message });
  }
};