import Settings from "../../../models/settings.js";
import { buildBranchFilter, validateAndInjectBranch } from "../../../utils/rbacHelper.js";

export const updateReceipt = async (req, res) => {
  try {
    const { receiptHeader, receiptFooter, showBarcode, showCashierName } =
      req.body;

    const branchValidation = validateAndInjectBranch(req, true);
    if (!branchValidation.isValid) {
      return res.status(403).json({ message: branchValidation.error || "Branch tidak valid" });
    }

    let settings = await Settings.findOne(buildBranchFilter(req.user));
    if (!settings) {
      settings = await Settings.create({
        receiptHeader,
        receiptFooter,
        showBarcode,
        showCashierName,
        branch_id: req.user.branch_id,
      });
    } else {
      if (receiptHeader !== undefined) settings.receiptHeader = receiptHeader;
      if (receiptFooter !== undefined) settings.receiptFooter = receiptFooter;
      if (showBarcode !== undefined) settings.showBarcode = showBarcode;
      if (showCashierName !== undefined)
        settings.showCashierName = showCashierName;
      await settings.save();
    }

    res.json({ message: "Struk berhasil diperbarui!", settings });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};