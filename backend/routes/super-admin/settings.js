import express from "express";
import upload from "../../middleware/upload.js";
import { 
  getSettings, 
  updateTax, 
  updateGlobalDiscount, 
  updateReceipt, 
  updatePaymentMethods,  
  updateServiceCharge,
  addPaymentMethod,
  addChannelToMethod,
  updateChannelName,
  updateGeneralSettings,
  togglePaymentMethod,
  updateChannelLogo,
  deleteChannelFromMethod,
  deletePaymentMethod,
  toggleChannelStatus,
} from "../../controllers/super-admin/settingscontroller.js";

const router = express.Router();

// GET -> ambil semua pengaturan
router.get("/", getSettings);

// Super-admin can configure: Tax, Discount, Service Charge, Payment Methods, Receipt
router.put("/tax", updateTax);
router.put("/discount", updateGlobalDiscount);
router.put("/service-charge", updateServiceCharge);
router.put("/receipt", updateReceipt);
router.put("/payment-methods", updatePaymentMethods);
router.put("/payment-methods/toggle", togglePaymentMethod);
router.post("/payment-methods/add", addPaymentMethod);
router.delete("/payment-delete/method", deletePaymentMethod);
router.post("/payment-methods/add-channel", addChannelToMethod);
router.put("/payment-methods/channel-logo", upload.single("logo"), updateChannelLogo);
router.patch("/payment-methods/channel-toggle", toggleChannelStatus);
router.delete("/payment-methods/channel", deleteChannelFromMethod);
router.put("/payment-methods/channel-name", updateChannelName);
router.put("/general", updateGeneralSettings);

export default router;
