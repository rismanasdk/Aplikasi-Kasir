// // src/admin/settings/components/biaya-operasional.tsx
// import React, { useState, useEffect, useCallback } from 'react';
// import SweetAlert from '../../../components/SweetAlert';
// import LoadingSpinner from '../../../components/LoadingSpinner';
// const ipbe = import.meta.env.VITE_IPBE;
// const ApiKey = import.meta.env.VITE_API_KEY;

// export interface BiayaOperasionalItem {
//   nama: string;
//   jumlah: number;
//   _id?: string;
// }

// export interface BiayaOperasionalData {
//   _id?: string;
//   rincian_biaya: BiayaOperasionalItem[];
//   total: number;
//   createdAt?: string;
//   __v?: number;
// }

// interface BiayaOperasionalSettingsProps {
//   onSaveBiayaOperasional: (data: BiayaOperasionalData) => Promise<void>;
//   saving: boolean;
// }

// const BiayaOperasionalSettings: React.FC<BiayaOperasionalSettingsProps> = ({ 
//   onSaveBiayaOperasional, 
//   saving 
// }) => {
//   const [loading, setLoading] = useState<boolean>(true);
//   const [deletingItem, setDeletingItem] = useState<boolean>(false);
//   const [showAddModal, setShowAddModal] = useState<boolean>(false);
//   const [newItemName, setNewItemName] = useState<string>('');
//   const [newItemAmount, setNewItemAmount] = useState<number>(0);
//   const [biayaData, setBiayaData] = useState<BiayaOperasionalData>({
//     rincian_biaya: [],
//     total: 0,
//   });

//   const BASE_API_URL = `${ipbe}/api/admin/biaya-operasional`;
//   const API_KEY = `${ApiKey}`;

//   // Fungsi untuk mendapatkan token dari localStorage
//   const getToken = () => {
//     return localStorage.getItem('token');
//   };

//   const fetchBiayaOperasional = useCallback(async () => {
//     try {
//       setLoading(true);
//       const token = getToken();
//       const headers: Record<string, string> = {
//         'Content-Type': 'application/json'
//       };
      
//       if (token) {
//         headers['Authorization'] = `Bearer ${token}`;
//         headers['x-api-key'] = API_KEY;
//       }

//       const response = await fetch(BASE_API_URL, { headers });
      
//       if (!response.ok) {
//         throw new Error('Gagal mengambil data biaya operasional');
//       }
      
//       const data = await response.json();
      
//       // Pastikan rincian_biaya selalu array
//       if (data && data.rincian_biaya && Array.isArray(data.rincian_biaya)) {
//         setBiayaData(data);
//       } else {
//         // Jika tidak ada data atau rincian_biaya bukan array, inisialisasi dengan array kosong
//         setBiayaData({
//           rincian_biaya: [],
//           total: 0,
//         });
//       }
//     } catch (error) {
//       SweetAlert.error('Gagal memuat data biaya operasional');
//       console.error(error);
//       // Inisialisasi dengan array kosong jika terjadi error
//       setBiayaData({
//         rincian_biaya: [],
//         total: 0,
//       });
//     } finally {
//       setLoading(false);
//     }
//   }, [BASE_API_URL, API_KEY]);

//   useEffect(() => {
//     fetchBiayaOperasional();
//   }, [fetchBiayaOperasional]);

//   const handleBiayaChange = (index: number, value: number) => {
//     setBiayaData(prev => {
//       // Pastikan rincian_biaya ada dan merupakan array
//       const rincianBiaya = prev.rincian_biaya || [];
//       const updatedRincian = [...rincianBiaya];
      
//       if (updatedRincian[index]) {
//         updatedRincian[index] = {
//           ...updatedRincian[index],
//           jumlah: value
//         };
//       }
      
//       // Hitung total otomatis
//       const total = updatedRincian.reduce((sum, item) => sum + (item.jumlah || 0), 0);
      
//       return {
//         ...prev,
//         rincian_biaya: updatedRincian,
//         total
//       };
//     });
//   };

//   const handleItemNameChange = (index: number, value: string) => {
//     setBiayaData(prev => {
//       // Pastikan rincian_biaya ada dan merupakan array
//       const rincianBiaya = prev.rincian_biaya || [];
//       const updatedRincian = [...rincianBiaya];
      
//       if (updatedRincian[index]) {
//         updatedRincian[index] = {
//           ...updatedRincian[index],
//           nama: value
//         };
//       }
      
//       return {
//         ...prev,
//         rincian_biaya: updatedRincian
//       };
//     });
//   };

//   const handleAddItem = () => {
//     if (!newItemName.trim()) {
//       SweetAlert.error('Nama biaya tidak boleh kosong');
//       return;
//     }

//     if (newItemAmount <= 0) {
//       SweetAlert.error('Jumlah biaya harus lebih dari 0');
//       return;
//     }

//     const newItem: BiayaOperasionalItem = {
//       nama: newItemName,
//       jumlah: newItemAmount
//     };

//     setBiayaData(prev => {
//       // Pastikan rincian_biaya ada dan merupakan array
//       const rincianBiaya = prev.rincian_biaya || [];
      
//       return {
//         ...prev,
//         rincian_biaya: [...rincianBiaya, newItem]
//       };
//     });

//     // Reset form dan tutup modal
//     setNewItemName('');
//     setNewItemAmount(0);
//     setShowAddModal(false);
//   };

//   const handleRemoveItem = async (itemId: string) => {
//     const result = await SweetAlert.fire({
//       title: 'Apakah Anda yakin?',
//       text: 'Biaya akan dihapus',
//       icon: 'warning',
//       showCancelButton: true,
//       confirmButtonColor: '#d33',
//       cancelButtonColor: '#3085d6',
//       confirmButtonText: 'Ya, hapus!',
//       cancelButtonText: 'Batal'
//     });

//     if (result.isConfirmed) {
//       try {
//         setDeletingItem(true);
//         SweetAlert.loading('Menghapus biaya...');
        
//         // Kirim request DELETE ke endpoint item
//         const token = getToken();
//         const headers: Record<string, string> = {
//           'Content-Type': 'application/json'
//         };
        
//         if (token) {
//           headers['Authorization'] = `Bearer ${token}`;
//           headers['x-api-key'] = API_KEY;
//         }

//         const response = await fetch(`${BASE_API_URL}/${itemId}`, {
//           method: 'DELETE',
//           headers
//         });
        
//         if (!response.ok) {
//           const errorData = await response.json();
//           console.error('Server error:', errorData);
//           throw new Error(errorData.message || 'Gagal menghapus biaya');
//         }
        
//         // Update state dengan menghapus item yang dihapus
//         setBiayaData(prev => {
//           const rincianBiaya = prev.rincian_biaya || [];
//           const updatedRincian = rincianBiaya.filter(item => item._id !== itemId);
//           const total = updatedRincian.reduce((sum, item) => sum + (item.jumlah || 0), 0);
          
//           return {
//             ...prev,
//             rincian_biaya: updatedRincian,
//             total
//           };
//         });
        
//         SweetAlert.close();
//         SweetAlert.success('Biaya berhasil dihapus');
//       } catch (error) {
//         SweetAlert.close();
//         SweetAlert.error(error instanceof Error ? error.message : 'Gagal menghapus biaya');
//         console.error(error);
//       } finally {
//         setDeletingItem(false);
//       }
//     }
//   };

//   const handleSubmitBiaya = async (e: React.FormEvent) => {
//     e.preventDefault();
    
//     // Pastikan rincian_biaya ada dan merupakan array
//     const rincianBiaya = biayaData.rincian_biaya || [];
    
//     // Siapkan data untuk dikirim ke server
//     const dataToSend: BiayaOperasionalData = {
//       ...biayaData,
//       rincian_biaya: rincianBiaya.map(item => {
//         // Jika item memiliki _id, kirim dengan _id
//         // Jika tidak, kirim tanpa _id (untuk item baru)
//         if (item._id) {
//           return {
//             nama: item.nama,
//             jumlah: item.jumlah,
//             _id: item._id
//           };
//         } else {
//           return {
//             nama: item.nama,
//             jumlah: item.jumlah
//           };
//         }
//       })
//     };
    
//     await onSaveBiayaOperasional(dataToSend);
//   };

//   if (loading) {
//     return <LoadingSpinner />;
//   }

//   // Pastikan rincian_biaya selalu array sebelum melakukan map
//   const rincianBiaya = biayaData.rincian_biaya || [];

//   return (
//     <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
//       {/* Header Section */}
//       <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
//         <div>
//           <h2 className="text-2xl font-bold text-gray-800">Biaya Operasional</h2>
//           <p className="text-gray-600 mt-1">Kelola rincian biaya operasional perusahaan</p>
//         </div>
        
//         {/* Action Buttons */}
//         <div className="flex items-center space-x-3 mt-4 sm:mt-0">
//           <button
//             type="button"
//             onClick={() => setShowAddModal(true)}
//             className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors duration-200 flex items-center"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M10 5a1 1 0 011 1v3h3a1 1 0 110 2h-3v3a1 1 0 11-2 0v-3H6a1 1 0 110-2h3V6a1 1 0 011-1z" clipRule="evenodd" />
//             </svg>
//             Tambah Biaya
//           </button>
//         </div>
//       </div>

//       {/* Modal Tambah Biaya */}
//       {showAddModal && (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
//           <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
//             <div className="p-6">
//               <div className="flex items-center justify-between mb-4">
//                 <h3 className="text-lg font-semibold text-gray-800">Tambah Biaya Baru</h3>
//                 <button
//                   type="button"
//                   onClick={() => {
//                     setShowAddModal(false);
//                     setNewItemName('');
//                     setNewItemAmount(0);
//                   }}
//                   className="text-gray-400 hover:text-gray-600 transition-colors duration-200"
//                 >
//                   <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                     <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
//                   </svg>
//                 </button>
//               </div>
              
//               <div className="space-y-4">
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Nama Biaya
//                   </label>
//                   <input
//                     type="text"
//                     value={newItemName}
//                     onChange={(e) => setNewItemName(e.target.value)}
//                     placeholder="Masukkan nama biaya..."
//                     className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
//                     autoFocus
//                   />
//                 </div>
                
//                 <div>
//                   <label className="block text-sm font-medium text-gray-700 mb-2">
//                     Jumlah Biaya
//                   </label>
//                   <div className="relative">
//                     <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                       <span className="text-gray-500 sm:text-sm">Rp</span>
//                     </div>
//                     <input
//                       type="number"
//                       value={newItemAmount}
//                       onChange={(e) => setNewItemAmount(parseFloat(e.target.value) || 0)}
//                       className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
//                       min="0"
//                       step="1000"
//                       placeholder="0"
//                     />
//                   </div>
//                 </div>
                
//                 <div className="flex space-x-3 pt-4">
//                   <button
//                     type="button"
//                     onClick={() => {
//                       setShowAddModal(false);
//                       setNewItemName('');
//                       setNewItemAmount(0);
//                     }}
//                     className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors duration-200"
//                   >
//                     Batal
//                   </button>
//                   <button
//                     type="button"
//                     onClick={handleAddItem}
//                     className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors duration-200"
//                   >
//                     Tambah
//                   </button>
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Content Section */}
//       {rincianBiaya.length === 0 ? (
//         <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 rounded-lg mb-6">
//           <div className="flex items-start">
//             <div className="flex-shrink-0">
//               <svg className="h-6 w-6 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
//                 <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
//               </svg>
//             </div>
//             <div className="ml-4">
//               <h3 className="text-lg font-medium text-yellow-800">Belum ada data biaya operasional</h3>
//               <p className="text-yellow-700 mt-2">
//                 Silakan tambahkan biaya operasional menggunakan tombol "Tambah Biaya" di atas.
//               </p>
//             </div>
//           </div>
//         </div>
//       ) : (
//         <div className="space-y-6">
//           {/* Items Grid */}
//           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
//             {rincianBiaya.map((item, index) => (
//               <div key={item._id || index} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow duration-200 bg-white relative group">
//                 {/* Delete Button */}
//                 {item._id && (
//                   <button
//                     type="button"
//                     onClick={() => handleRemoveItem(item._id!)}
//                     disabled={deletingItem}
//                     className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200 opacity-0 group-hover:opacity-100"
//                     title="Hapus biaya"
//                   >
//                     <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
//                       <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
//                     </svg>
//                   </button>
//                 )}
                
//                 <div className="space-y-3">
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">Nama Biaya</label>
//                     <input
//                       type="text"
//                       value={item.nama || ''}
//                       onChange={(e) => handleItemNameChange(index, e.target.value)}
//                       className="block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
//                       placeholder="Nama biaya operasional"
//                     />
//                   </div>
                  
//                   <div>
//                     <label className="block text-sm font-medium text-gray-700 mb-1">Jumlah Biaya</label>
//                     <div className="relative">
//                       <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                         <span className="text-gray-500 sm:text-sm">Rp</span>
//                       </div>
//                       <input
//                         type="number"
//                         value={item.jumlah || 0}
//                         onChange={(e) => handleBiayaChange(index, parseFloat(e.target.value) || 0)}
//                         className="pl-10 block w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-3 border"
//                         min="0"
//                         step="1000"
//                       />
//                     </div>
//                   </div>
//                 </div>
//               </div>
//             ))}
//           </div>

//           {/* Total Section */}
//           <div className="bg-gray-50 rounded-lg p-6 border border-gray-200">
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
//               <div>
//                 <h3 className="text-lg font-semibold text-gray-800">Total Biaya Operasional</h3>
//                 <p className="text-gray-600 text-sm mt-1">Total dari semua biaya operasional</p>
//               </div>
//               <div className="mt-4 sm:mt-0">
//                 <div className="relative">
//                   <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
//                     <span className="text-gray-500 sm:text-sm font-medium">Rp</span>
//                   </div>
//                   <input
//                     type="text"
//                     value={biayaData.total?.toLocaleString('id-ID') || '0'}
//                     readOnly
//                     className="pl-10 block w-full sm:w-64 text-right text-lg font-bold text-gray-900 bg-white rounded-lg border-gray-300 shadow-sm sm:text-sm p-3 border"
//                   />
//                 </div>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Bottom Action Buttons */}
//       <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mt-8 pt-6 border-t border-gray-200">
//         <div className="text-sm text-gray-500 mb-4 sm:mb-0">
//           {rincianBiaya.length > 0 && (
//             <p>{rincianBiaya.length} biaya operasional</p>
//           )}
//         </div>
        
//         <div className="flex space-x-3">
//           <button
//             type="button"
//             onClick={handleSubmitBiaya}
//             disabled={saving}
//             className="flex-1 sm:flex-none px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center"
//           >
//             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
//               <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
//             </svg>
//             {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BiayaOperasionalSettings;