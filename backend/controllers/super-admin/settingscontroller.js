// controllers/super-admin/settingscontroller.js
// Re-export admin settings controller - super-admin punya akses penuh konfigurasi sistem
export {
  getSettings,
  updateTax,
  updateGlobalDiscount,
  updateReceipt,
  updatePaymentMethods,
  updateServiceCharge,
  updateStoreInfo,
  updateGeneralSettings,
  getRekomendasiTargetOmzet,
  addPaymentMethod,
  addChannelToMethod,
  updateChannelName,
  togglePaymentMethod,
  updateChannelLogo,
  deleteChannelFromMethod,
  deletePaymentMethod,
  toggleChannelStatus,
  updateUserProfilePicture,
  updateDefaultProfilePicture
} from "../admin/settingscontroller.js";
