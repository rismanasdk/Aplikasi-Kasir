import {Schema, model} from "mongoose";

const settingsSchema = new Schema({
  storeName: { type: String, default: "Aplikasi Kasir" },
  storeLogo: { type: String},
  storeAddress: { type: String, default: "" },
  storePhone: { type: String, default: "" },
  taxRate: { type: Number, default: 0 },
  globalDiscount: { type: Number, default: 0 },
  serviceCharge: { type: Number, default: 0 },
  calculatedServiceCharge: { type: Number, default: 0 }, // Service charge dari biaya operasional
  targetOmzetBulanan: { type: Number, default: 15000000 },
  receiptHeader: { type: String, default: "Aplikasi Kasir" },
  receiptFooter: { type: String, default: "Terima kasih telah berbelanja!" },
  showBarcode: { type: Boolean, default: false },
  showCashierName: { type: Boolean, default: true },
  defaultProfilePicture: {
  type: String,
  default: "https://t3.ftcdn.net/jpg/05/87/76/66/360_F_587766653_PkBNyGx7mQh9l1XXPtCAq1lBgOsLl6xH.jpg"
},


  payment_methods: [
  {
    method: { type: String, required: true },
    isActive: { type: Boolean, default: true },
    logo: { type: String },
    channels: [
      {
        name: { type: String, required: true },
        logo: { type: String },
        isActive: { type: Boolean, default: true }
      }
    ]
  }
],


  lowStockAlert: { type: Number, default: 10 },
  currency: { type: String, default: "IDR" },
  dateFormat: { type: String, default: "DD/MM/YYYY" },
  language: { type: String, default: "id" }

}, { timestamps: true });

export default model("Settings", settingsSchema);
