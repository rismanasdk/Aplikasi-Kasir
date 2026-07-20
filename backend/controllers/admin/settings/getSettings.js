import Settings from "../../../models/settings.js";
import { buildBranchFilter } from "../../../utils/rbacHelper.js";

const hasPaymentMethods = (settings) => {
  return Array.isArray(settings?.payment_methods) && settings.payment_methods.length > 0;
};

const findPaymentMethodSettings = async () => {
  const globalSettings = await Settings.findOne({
    "payment_methods.0": { $exists: true },
    $or: [
      { branch_id: null },
      { branch_id: { $exists: false } },
    ],
  }).sort({ updatedAt: -1 });

  if (globalSettings) {
    return globalSettings;
  }

  return Settings.findOne({
    "payment_methods.0": { $exists: true },
  }).sort({ updatedAt: -1 });
};

export const getSettings = async (req, res) => {
  try {
    const filter = buildBranchFilter(req.user);
    // console.log("User:", req.user?.role, req.user?.branch_id);
    // console.log("Filter used:", filter);
    let settings = await Settings.findOne(filter);
    // console.log("Settings found _id:", settings?._id, "payment_methods count:", settings?.payment_methods?.length);
    if (!settings) {
      settings = await Settings.create({ branch_id: req.user?.branch_id });
    }
    if ((settings.serviceCharge === undefined || settings.serviceCharge === null) && typeof settings.calculatedServiceCharge === "number") {
      settings.serviceCharge = settings.calculatedServiceCharge;
      await settings.save();
    }

    if (!hasPaymentMethods(settings)) {
      const paymentMethodSettings = await findPaymentMethodSettings();
      if (hasPaymentMethods(paymentMethodSettings)) {
        const payload = settings.toObject();
        payload.payment_methods = paymentMethodSettings.payment_methods;
        return res.json(payload);
      }
    }

    res.json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
