/**
 * Types for application settings used in store info and export features.
 */

export interface PaymentChannel {
  name: string;
  logo?: string;
  isActive: boolean;
}

export interface PaymentMethod {
  method: string;
  isActive: boolean;
  logo?: string;
  channels: PaymentChannel[];
}

export interface SettingsData {
  _id?: string;
  storeName: string;
  storeLogo?: string;
  storeAddress: string;
  storePhone: string;
  taxRate: number;
  globalDiscount: number;
  serviceCharge: number;
  calculatedServiceCharge: number;
  targetOmzetBulanan: number;
  receiptHeader: string;
  receiptFooter: string;
  showBarcode: boolean;
  showCashierName: boolean;
  defaultProfilePicture: string;
  payment_methods: PaymentMethod[];
  lowStockAlert: number;
  currency: string;
  dateFormat: string;
  language: string;
  createdAt?: string;
  updatedAt?: string;
}
