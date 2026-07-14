import Settings from "../../../models/settings.js";
import cloudinary from "../../../config/cloudinary.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../../utils/rbacHelper.js";

export const updatePaymentMethods = async (req, res) => {
  try {
    const { payment_methods } = req.body;

    let methods = JSON.parse(payment_methods);

    if (req.file) {
      const uploadResult = await cloudinary.uploader.upload(req.file.path, {
        folder: "payment_methods",
      });

      fs.unlinkSync(req.file.path);

      const { methodName, channelName } = req.body;

      methods = methods.map(m => {
        if (m.method === methodName) {
          m.channels = m.channels.map(c =>
            c.name === channelName
              ? { ...c, logo: uploadResult.secure_url }
              : c
          );
        }
        return m;
      });
    }

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    let settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      settings = await Settings.create({ payment_methods: methods, branch_id: req.user.branch_id });
    } else {
      settings.payment_methods = methods;
      await settings.save();
    }

    res.json({ message: "Metode pembayaran berhasil diperbarui!", settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
