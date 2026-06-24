// // src/admin/settings/components/AdvancedSettings.tsx
// import React from 'react';

// interface PaymentChannel {
//   name: string;
//   _id: string;
//   logo?: string;
// }

// interface PaymentMethod {
//   method: string;
//   channels: PaymentChannel[];
//   _id: string;
// }

// interface FormData {
//   storeName: string;
//   storeAddress: string;
//   storePhone: string;
//   storeLogo: string;
//   receiptHeader: string;
//   receiptFooter: string;
//   taxRate: number;
//   globalDiscount: number;
//   serviceCharge: number;
//   lowStockAlert: number;
//   currency: string;
//   dateFormat: string;
//   language: string;
//   showBarcode: boolean;
//   showCashierName: boolean;
//   paymentMethods: string[];
//   payment_methods: PaymentMethod[];
// }

// interface AdvancedSettingsProps {
//   formData: FormData;
//   handleInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
// }

// const AdvancedSettings: React.FC<AdvancedSettingsProps> = ({ formData, handleInputChange }) => {
//   return (
//     <div className="space-y-6">
//       <div>
//         <h2 className="text-lg font-medium text-gray-900 mb-4">Pengaturan Harga</h2>
//         <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Pajak (%)</label>
//             <input
//               type="number"
//               name="taxRate"
//               value={formData.taxRate}
//               onChange={handleInputChange}
//               min="0"
//               max="100"
//               step="0.1"
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-1">Diskon Global (%)</label>
//             <input
//               type="number"
//               name="globalDiscount"
//               value={formData.globalDiscount}
//               onChange={handleInputChange}
//               min="0"
//               max="100"
//               step="0.1"
//               className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//          <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">Biaya Layanan (%)</label>
//           <div className="relative">
//             <input
//               type="number"
//               name="serviceCharge"
//               value={formData.serviceCharge}
//               onChange={handleInputChange}
//               readOnly
//               min="0"
//               max="100"
//               step="0.01"
//               className="pl-4 block w-full rounded-md border-gray-300 bg-gray-100 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
//             />
//             <p className="mt-1 text-sm text-gray-500">Nilai ini dihitung otomatis dari total biaya operasional</p>  
//           </div>
//         </div>

//         </div>
//       </div>

//      <div>
//         <h2 className="text-lg font-medium text-gray-900 mb-4">Pengaturan Inventaris</h2>
//         <div>
//           <label className="block text-sm font-medium text-gray-700 mb-1">Peringatan Stok Rendah</label>
//           <div className="flex items-center space-x-2">
//             <input
//               type="number"
//               name="lowStockAlert"
//               value={formData.lowStockAlert}
//               onChange={handleInputChange} // Hanya memanggil handleInputChange tanpa update langsung ke server
//               min="0"
//               className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
//             />
//           </div>
//           <p className="mt-1 text-sm text-gray-500">Notifikasi akan muncul ketika stok barang mencapai angka ini</p>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default AdvancedSettings;