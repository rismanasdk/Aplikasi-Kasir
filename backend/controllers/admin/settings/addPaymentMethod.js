import Settings from "../../../models/settings.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../../utils/rbacHelper.js";

export const addPaymentMethod = async (req, res) => {
  try {
    const { method, channels } = req.body;

    if (!method) {
      return res.status(400).json({ message: "Nama method wajib diisi" });
    }

    validateAndInjectBranch(req, true);
    let settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      settings = await Settings.create({
        payment_methods: [{ method, channels: channels || [] }],
        branch_id: req.body.branch_id || req.user?.branch_id || null,
      });
    } else {
      // cek kalau sudah ada method dengan nama sama
      const exists = settings.payment_methods.some(m => m.method === method);
      if (exists) {
        return res.status(400).json({ message: `Method ${method} sudah ada` });
      }

      settings.payment_methods.push({
        method,
        channels: channels || [],
      });
      await settings.save();
    }

    res.json({
      message: `Metode pembayaran ${method} berhasil ditambahkan!`,
      settings,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};