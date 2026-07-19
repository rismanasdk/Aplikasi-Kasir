// src/kasir/components/TransactionModal.tsx
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { API_URL } from '../../config/api';
import { getStoredToken } from "../../auth/storage";

import { 
  ShoppingCart, 
  Trash2, 
  CreditCard, 
  Wallet, 
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
  // Printer,
  // Home,
  FileText,
  QrCode
} from "lucide-react";
import SweetAlert from "../../components/SweetAlert";
import ProsesTransaksiModal from "./proses-transaksi";

// Interface definitions
interface PaymentChannel {
  method: string;
  channels: { name: string; logo?: string; _id: string; isActive: boolean }[];
  _id: string;
  isActive: boolean;
}

interface SettingsResponse {
  payment_methods: PaymentChannel[];
  kasir_aktif?: boolean;
}

interface CartItem {
  _id: string;
  nama: string;
  hargaFinal: number;
  quantity: number;
  jumlah: number;
  stok: number;
  gambarUrl?: string;
  hargaBeli?: number;
}

interface BarangDibeli {
  kode_barang: string;
  nama_barang: string;
  jumlah: number;
  harga_satuan: number;
  harga_beli: number;
  subtotal: number;
  _id: string;
}

interface TransactionResponse {
  _id: string;
  order_id: string;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  barang_dibeli: BarangDibeli[];
  total_harga: number;
  metode_pembayaran: string;
  status: string;
  kasir_id?: string;
  kasir_username?: string;
  kasir_nama?: string;
  createdAt: string;
  updatedAt: string;
  no_va?: string;
}

interface MidtransData {
  transaction_id: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_status: string;
  va_numbers?: Array<{
    bank: string;
    va_number: string;
  }>;
}

interface SettingsReceipt {
  receiptHeader?: string;
  receiptFooter?: string;
}

interface BiayaLayananItem {
  persen: number;
}

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  total: number;
  onTransactionSuccess: (transactionData?: TransactionResponse) => void;
  onRemoveItem?: (productId: string) => Promise<void> | void;
  transactionSuccess?: boolean;
  transactionData?: TransactionResponse;
  onOpenProsesTransaksi?: (data: {
    transaksi: TransactionResponse | null;
    midtrans: MidtransData | null;
    expiryTime?: string;
    token?: string;
  }) => void;
} 

// Animation variants
const backdropVariants: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
};

const modalVariants: Variants = {
  hidden: { opacity: 0, scale: 0.9, y: 20 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.3,
      ease: "easeOut" as const
    }
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    y: 20,
    transition: {
      duration: 0.2,
      ease: "easeIn" as const
    }
  }
};

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  total,
  onTransactionSuccess,
  onRemoveItem,
  transactionSuccess = false,
  transactionData = null,
  onOpenProsesTransaksi
}) => {
  // State
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<PaymentChannel[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<string>("");
  const [selectedChannel, setSelectedChannel] = useState<string>("");
  const [selectedChannelObject, setSelectedChannelObject] = useState<{ name: string; logo?: string; _id: string } | null>(null);
  const [removingItem, setRemovingItem] = useState<string | null>(null);
  const [kasirAktif, setKasirAktif] = useState<boolean>(true);
  const [receiptSettings, setReceiptSettings] = useState<SettingsReceipt>({});
  const [isFirstMount, setIsFirstMount] = useState(true);
  const [totalBiayaLayanan, setTotalBiayaLayanan] = useState(0); // State untuk total biaya layanan
  
  // State for process transaction modal
  const [isProsesTransaksiOpen, setIsProsesTransaksiOpen] = useState(false);
  const [prosesTransaksiData, setProsesTransaksiData] = useState<{
    transaksi: TransactionResponse | null;
    midtrans: MidtransData | null;
    expiryTime?: string;
    token?: string;
  }>({
    transaksi: null,
    midtrans: null
  });

  const isCashPayment = selectedMethod.toLowerCase() === 'tunai' || selectedMethod.toLowerCase() === 'va';

  const fetchSettings = async (): Promise<SettingsResponse & SettingsReceipt> => {
    const token = getStoredToken();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (token) headers.Authorization = `Bearer ${token}`;

    const res = await fetch(`${API_URL}/api/common/settings`, { headers });

    if (!res.ok) {
      throw new Error(`Settings request failed with status ${res.status}`);
    }

    return res.json();
  };

  // Fetch payment methods and receipt settings
  useEffect(() => {
    const fetchPaymentMethods = async () => {
      try {
        const data = await fetchSettings();
        console.log("Raw settings response:", data);
        console.log("payment_methods:", data.payment_methods);
        
        if (data.kasir_aktif === false) {
          setKasirAktif(false);
        }
        
        const activePaymentMethods = (data.payment_methods || []).filter(method => method.isActive);
        const methodsWithActiveChannels = activePaymentMethods.map(method => {
          const activeChannels = (method.channels || []).filter(channel => channel.isActive);
          return { ...method, channels: activeChannels };
        });
        
        setPaymentMethods(methodsWithActiveChannels);
        
        if (methodsWithActiveChannels.length > 0) {
          setSelectedMethod(methodsWithActiveChannels[0].method);
        }
      } catch (err) {
        console.error("Failed to fetch payment methods:", err);
        setErrorMessage("Failed to load payment methods. Please refresh page.");
      }
    };
    
    const fetchReceiptSettings = async () => {
      try {
        const data = await fetchSettings();
        setReceiptSettings(data);
      } catch (err) {
        console.error("Failed to fetch receipt settings:", err);
      }
    };

    // Fungsi untuk mengambil total biaya layanan
    const fetchTotalBiayaLayanan = async () => {
      try {
        const token = getStoredToken();
        const response = await fetch(`${API_URL}/api/common/biaya-layanan`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data: BiayaLayananItem[] = await response.json();
          // Hitung total persentase dari semua biaya layanan
          const total = data.reduce((sum: number, item: BiayaLayananItem) => sum + item.persen, 0);
          setTotalBiayaLayanan(total);
        }
      } catch (error) {
        console.error("Error fetching biaya layanan:", error);
      }
    };
    
    if (isOpen && !transactionSuccess) {
      fetchPaymentMethods();
      fetchReceiptSettings();
      fetchTotalBiayaLayanan(); // Ambil data biaya layanan
    }
    
    // Set isFirstMount ke false setelah mount pertama
    if (isFirstMount) {
      setIsFirstMount(false);
    }
  }, [isOpen, transactionSuccess, isFirstMount]);

  // Handle remove item from cart
  const handleRemoveItem = async (itemId: string) => {
    if (!onRemoveItem) {
      // fallback: if parent didn't provide remove handler, keep old behavior
      setRemovingItem(itemId);
      await new Promise(resolve => setTimeout(resolve, 300));
      onTransactionSuccess();
      setRemovingItem(null);
      return;
    }

    setRemovingItem(itemId);
    try {
      await new Promise(resolve => setTimeout(resolve, 300));
      await onRemoveItem(itemId);
    } catch (err) {
      console.error('Failed to remove item from transaction modal:', err);
    } finally {
      setRemovingItem(null);
    }
  };

  // Handle process transaction
  const handleProsesTransaksi = async () => {
    if (!kasirAktif) {
      await SweetAlert.fire({
        title: 'Cashier Inactive',
        text: 'Sorry, cashier is currently inactive. Please contact admin.',
        icon: 'warning',
        confirmButtonText: 'OK',
        confirmButtonColor: '#f59e0b'
      });
      return;
    }

    if (cartItems.length === 0) {
      setErrorMessage("Cart is empty! Please add items first.");
      return;
    }

    const invalidStock = cartItems.filter(
      (item) => isNaN(item.quantity) || item.quantity <= 0 || item.quantity > item.stok
    );
    if (invalidStock.length > 0) {
      setErrorMessage(
        invalidStock.map((i) => `${i.nama}: qty ${i.quantity} > stock ${i.stok}`).join("\n")
      );
      return;
    }

    const isPaymentMethodActive = paymentMethods.some(
      method => method.method === selectedMethod && method.isActive
    );
    
    if (!isPaymentMethodActive) {
      setErrorMessage("Selected payment method is not available");
      return;
    }

    let paymentMethod = selectedMethod;
    if (selectedChannelObject && !isCashPayment) {
      if (selectedMethod === "Virtual Account" || selectedMethod === "E-Wallet") {
        paymentMethod += ` (${selectedChannelObject.name})`;
      }
    }

    // FIXED: Removed the extra 'barang_id' field that was causing the 400 error
    const barangDibeli = cartItems.map((item) => ({
      kode_barang: item._id,
      nama_barang: item.nama,
      jumlah: item.quantity,
      harga_satuan: item.hargaFinal,
      harga_beli: item.hargaBeli || 0,
      subtotal: item.quantity * item.hargaFinal,
    }));

    // Get kasir_id from localStorage
    const storedKasir = localStorage.getItem('kasir');
    let kasirId: string | null = null;
    try {
      const parsed = storedKasir ? JSON.parse(storedKasir) : null;
      kasirId = parsed?._id || parsed?.id || null;

      console.log("Kasir ID to be used:", kasirId);
    } catch (err) {
      console.error("Error getting kasir ID:", err);
      kasirId = null;
    }

    // Hitung total dengan biaya layanan
    const totalWithBiayaLayanan = total + Math.round(total * totalBiayaLayanan / 100);

    const bodyData: Record<string, unknown> = {
      barang_dibeli: barangDibeli,
      total_harga: totalWithBiayaLayanan,
      metode_pembayaran: paymentMethod,
      status: "pending",
    };

    if (kasirId) {
      bodyData.kasir_id = kasirId;
    }

    setLoading(true);
    setErrorMessage("");
    
    try {
      SweetAlert.loading("Processing transaction...");
      
      const token = getStoredToken();
      
      // Log the request data for debugging
      console.log("Sending transaction data:", JSON.stringify(bodyData, null, 2));
      
      const res = await fetch(`${API_URL}/api/transaksi`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bodyData),
      });

      let responseData: {
        message: string;
        transaksi: TransactionResponse;
        midtrans: MidtransData;
        error?: string;
      };
      try {
        responseData = await res.json();
      } catch (_err) {
        console.error("Failed to parse response JSON:", _err);
        throw new Error("Server returned invalid response");
      }
      
      if (!res.ok) {
        SweetAlert.close();
        console.error("Server response:", responseData);
        const errorMsg = responseData.message || responseData.error || "Failed to save transaction";
        
        throw new Error(errorMsg);
      }

      localStorage.removeItem('cartItems');
      localStorage.removeItem('cartTotal');

      SweetAlert.close();
      
      // Save transaction data to localStorage with stage 'payment'
      const transactionDataToSave = {
        cartItems: cartItems,
        total: total,
        totalWithBiayaLayanan: totalWithBiayaLayanan,
        transactionData: responseData.transaksi,
        midtransData: responseData.midtrans,
        expiryTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        token: responseData.transaksi.order_id,
        paymentMethod: paymentMethod
      };

      localStorage.setItem('transactionStatus', JSON.stringify({
        status: 'pending',
        stage: 'payment',
        data: transactionDataToSave,
        timestamp: new Date().toISOString()
      }));
      
      // Check payment method
      if (isCashPayment) {
        // For cash payment, show receipt directly
        onTransactionSuccess(responseData.transaksi);
      } else if (selectedMethod.toLowerCase().includes('virtual account') || selectedMethod.toLowerCase().includes('e-wallet')) {
        // For Virtual Account and E-Wallet, open process transaction modal
        const data = {
          transaksi: responseData.transaksi,
          midtrans: responseData.midtrans,
          expiryTime: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
          token: responseData.transaksi.order_id
        };
        
        setProsesTransaksiData(data);
        
        // Call callback to open ProsesTransaksiModal from Dashboard
        if (onOpenProsesTransaksi) {
          onOpenProsesTransaksi(data);
        } else {
          setIsProsesTransaksiOpen(true);
        }
      } else {
        // For other non-cash methods, complete directly
        onTransactionSuccess(responseData.transaksi);
      }
    } catch (err: unknown) {
      SweetAlert.close();
      const error = err instanceof Error ? err.message : "Transaction error occurred";
      
      // CUSTOMIZE ERROR MESSAGE HERE
      let displayError = error;
      if (error === "Gagal membuat transaksi") {
        displayError = "Tidak ada kasir yang aktif saat ini";
      }
      
      setErrorMessage(displayError);
     
      await SweetAlert.error(displayError);
    } finally {
      setLoading(false);
    }
  };

  // Handle close modal
  const handleCloseModal = () => {
    // Hapus status transaksi dari localStorage saat modal ditutup
    localStorage.removeItem('transactionStatus');
    onClose();
  };

  // Helper functions
  const getChannelKey = (channel: { name: string; logo?: string; _id: string }): string => {
    return channel._id || channel.name;
  };

  const handleChannelSelect = (channel: { name: string; logo?: string; _id: string }) => {
    setSelectedChannel(channel.name);
    setSelectedChannelObject(channel);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method.toLowerCase()) {
      case 'virtual account':
        return <CreditCard className="w-5 h-5" />;
      case 'e-wallet':
        return <Wallet className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  // const handlePrintReceipt = () => {
  //   window.print();
  // };

  const formatCurrency = (value: number | undefined | null): string => {
    if (!value || isNaN(value)) return "Rp 0";
    return `Rp ${value.toLocaleString("id-ID")}`;
  };

  const formatDate = (dateString: string | Date | undefined | null) => {
    if (!dateString) return "-";
    
    let date: Date;
    
    if (typeof dateString === 'string') {
      // Handle MongoDB date format: {"$date": "2025-10-08T05:04:28.704Z"}
      try {
        const parsed = JSON.parse(dateString);
        if (parsed && parsed.$date) {
          date = new Date(parsed.$date);
        } else {
          date = new Date(dateString);
        }
      } catch {
        date = new Date(dateString);
      }
    } else {
      date = new Date(dateString);
    }
    
    if (isNaN(date.getTime())) return "Invalid Date";
    
    return date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to get cashier name from various sources
  const getKasirName = (): string => {
    // 1. Check if there's cashier data in transactionData
    if (transactionData) {
      // Prioritize kasir_nama if available
      if (transactionData.kasir_nama) {
        return transactionData.kasir_nama;
      }
      
      // If not available, use kasir_username
      if (transactionData.kasir_username) {
        return transactionData.kasir_username;
      }
      
      // If neither is available, use kasir_id
      if (transactionData.kasir_id) {
        return transactionData.kasir_id;
      }
    }
    
    // 2. Try to get cashier data from localStorage
    try {
      const storedKasir = localStorage.getItem('kasir');
      if (storedKasir) {
        const parsed = JSON.parse(storedKasir);
        return parsed?.nama || parsed?.username || parsed?._id || "-";
      }
    } catch (err) {
      console.error("Error getting cashier data from localStorage:", err);
    }
    
    // 3. If all fails, return "-"
    return "-";
  };

  // Function to calculate unit price from subtotal and quantity
  const calculateHargaSatuan = (item: BarangDibeli): number => {
    if (item.harga_satuan && item.harga_satuan > 0) {
      return item.harga_satuan;
    }
    
    // Calculate unit price from subtotal and quantity
    if (item.subtotal && item.jumlah && item.jumlah > 0) {
      return item.subtotal / item.jumlah;
    }
    
    return 0;
  };

  // Function to calculate subtotal from transaction data
  const calculateSubtotalFromItems = (items: BarangDibeli[]): number => {
    return items.reduce((sum, item) => sum + (item.subtotal || 0), 0);
  };

  // Function to calculate service charge from total and percentage
  const calculateBiayaLayanan = (total: number, percentage: number): number => {
    return Math.round(total * percentage / 100);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Modal Proses Transaksi */}
          <ProsesTransaksiModal
            isOpen={isProsesTransaksiOpen}
            onClose={() => {
              setIsProsesTransaksiOpen(false);
              // Hapus status transaksi dari localStorage saat modal ditutup
              localStorage.removeItem('transactionStatus');
            }}
            transaksi={prosesTransaksiData.transaksi}
            midtrans={prosesTransaksiData.midtrans}
            expiryTime={prosesTransaksiData.expiryTime}
            token={prosesTransaksiData.token}
            onTransactionSuccess={(data) => {
              if (data) {
                onTransactionSuccess(data);
              }
            }}
          />
          
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            onClick={handleCloseModal}
          />
              
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-50 p-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div 
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(event) => event.stopPropagation()}
            >
              {transactionSuccess && transactionData ? (
                // Receipt view after successful transaction
                <div className="flex-1 overflow-y-auto">
                  <div className="bg-gradient-to-r from-green-600 to-emerald-600 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                          <FileText className="w-6 h-6" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold">Struk Pesanan</h1>
                          <p className="text-green-100 text-sm">Detail pesanan Anda</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleCloseModal}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="max-w-md mx-auto bg-white shadow-lg rounded-lg p-6 print:w-full print:shadow-none print:mt-0">
                      {/* Wrapper untuk struk dengan tinggi tetap dan scroll */}
                      <div className="flex flex-col" style={{ minHeight: '500px' }}>
                        {/* Header struk - tetap di atas */}
                        <div className="flex-shrink-0">
                          {receiptSettings.receiptHeader && (
                            <pre className="text-center font-bold mb-4 whitespace-pre-line">
                              {receiptSettings.receiptHeader}
                            </pre>
                          )}

                          <h2 className="text-xl font-bold text-center mb-2">STRUK PEMBELIAN</h2>
                          <p className="text-center text-sm text-gray-600 mb-4">
                            #{transactionData.order_id || transactionData._id || "-"}
                          </p>

                          <div className="border-t border-b py-2 mb-4 text-sm">
                            <p>
                              <span className="font-semibold">Tanggal:</span>{" "}
                              {formatDate(transactionData.tanggal_transaksi || transactionData.createdAt)}
                            </p>
                            <p>
                              <span className="font-semibold">Metode:</span>{" "}
                              {transactionData.metode_pembayaran || "-"}
                            </p>
                            <p>
                              <span className="font-semibold">Kasir:</span>{" "}
                              {getKasirName()}
                            </p>
                            <p>
                              <span className="font-semibold">Status:</span>{" "}
                              <span className="px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                Selesai
                              </span>
                            </p>
                          </div>
                        </div>

                        {/* Area item struk - dapat di-scroll jika terlalu banyak */}
                        <div className="flex-grow overflow-y-auto max-h-60 mb-4">
                          <table className="w-full text-sm">
                            <thead className="sticky top-0 bg-white">
                              <tr>
                                <th className="text-left py-1">Item</th>
                                <th className="text-center py-1">Qty</th>
                                <th className="text-right py-1">Harga</th>
                                <th className="text-right py-1">Subtotal</th>
                              </tr>
                            </thead>
                            <tbody>
                              {transactionData.barang_dibeli && transactionData.barang_dibeli.length > 0 ? (
                                transactionData.barang_dibeli.map((item: BarangDibeli, idx: number) => (
                                  <tr key={idx}>
                                    <td className="py-1">{item.nama_barang}</td>
                                    <td className="py-1 text-center">{item.jumlah}</td>
                                    <td className="py-1 text-right">
                                      {formatCurrency(calculateHargaSatuan(item))}
                                    </td>
                                    <td className="py-1 text-right">
                                      {formatCurrency(item.subtotal)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td colSpan={4} className="py-2 text-gray-500">
                                    tidak ada data yang di beli
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>

                        {/* Total dan footer struk - tetap di bawah */}
                        <div className="flex-shrink-0">
                          {/* Garis pembatas di atas subtotal */}
                          <div className="border-t border-gray-300 my-3"></div>
                          
                          <div className="flex justify-between items-center text-sm mb-2">
                            <span>Subtotal</span>
                            <span>{formatCurrency(calculateSubtotalFromItems(transactionData.barang_dibeli))}</span>
                          </div>

                          {totalBiayaLayanan > 0 && (
                            <div className="flex justify-between items-center text-sm mb-2">
                              <span>Biaya Layanan ({totalBiayaLayanan}%)</span>
                              <span>{formatCurrency(calculateBiayaLayanan(calculateSubtotalFromItems(transactionData.barang_dibeli), totalBiayaLayanan))}</span>
                            </div>
                          )}

                          <div className="flex justify-between items-center text-lg font-bold mb-6">
                            <span>Total Pembayaran</span>
                            <span className="text-green-600">
                              {formatCurrency(
                                calculateSubtotalFromItems(transactionData.barang_dibeli) + 
                                calculateBiayaLayanan(calculateSubtotalFromItems(transactionData.barang_dibeli), totalBiayaLayanan)
                              )}
                            </span>
                          </div>

                          {/* RECEIPT FOOTER */}
                          {receiptSettings.receiptFooter && (
                            <pre className="text-center text-sm text-gray-600 mt-4 whitespace-pre-line">
                              {receiptSettings.receiptFooter}
                            </pre>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-3 mt-6 print:hidden">
                        <button
                          onClick={handleCloseModal}
                          className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 flex items-center justify-center gap-2"
                        >
                          {/* <Home className="w-4 h-4" /> */}
                          Tutup
                        </button>
                        {/* <button
                          onClick={handlePrintReceipt}
                          className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                          <Printer className="w-4 h-4" />
                          Cetak
                        </button> */}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                // Transaction form view
                <>
                  <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 text-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="p-3 bg-white/20 rounded-2xl backdrop-blur-sm">
                          <ShoppingCart className="w-6 h-6" />
                        </div>
                        <div>
                          <h1 className="text-2xl font-bold">Process Transaction</h1>
                          <p className="text-amber-100 text-sm">Complete your payment</p>
                        </div>
                      </div>
                      <button 
                        onClick={handleCloseModal}
                        className="p-2 rounded-full hover:bg-white/20 transition-colors"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6">
                    {cartItems.length === 0 ? (
                      <div className="text-center py-10">
                        <div className="text-5xl mb-4">🛒</div>
                        <h3 className="text-xl font-bold text-gray-700 mb-2">Empty Cart</h3>
                        <p className="text-gray-500 mb-6">Add products to start a transaction</p>
                        {/* <button
                          onClick={handleCloseModal}
                          className="px-6 py-2 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors"
                        >
                          Back to Home
                        </button> */}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {errorMessage && (
                          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg">
                            <div className="flex items-center">
                              <AlertCircle className="w-5 h-5 text-red-500 mr-3" />
                              <div className="text-red-700 whitespace-pre-line">{errorMessage}</div>
                            </div>
                          </div>
                        )}

                        <div>
                          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                            <ShoppingCart className="w-5 h-5 mr-2 text-amber-500" />
                            Shopping List
                          </h2>
                          <div className="bg-gray-50 rounded-xl p-1 max-h-60 overflow-y-auto">
                            {cartItems.map((item) => (
                              <div
                                key={item._id}
                                className={`bg-white rounded-lg p-3 mb-2 shadow-sm border border-gray-100 transition-all duration-300 ${
                                  removingItem === item._id ? 'opacity-50 scale-95' : 'hover:shadow-md'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <div className="flex-shrink-0">
                                    {item.gambarUrl ? (
                                      <img 
                                        src={item.gambarUrl} 
                                        alt={item.nama}
                                        className="w-12 h-12 object-cover rounded-lg shadow-sm"
                                      />
                                    ) : (
                                      <div className="w-12 h-12 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg flex items-center justify-center">
                                        <ShoppingCart className="w-5 h-5 text-gray-400" />
                                      </div>
                                    )}
                                  </div>
                                  
                                  <div className="flex-grow">
                                    <h3 className="font-medium text-gray-800 text-sm">{item.nama}</h3>
                                    <div className="flex items-center space-x-3 mt-1 text-xs text-gray-600">
                                      <span>Qty: {item.quantity}</span>
                                      <span>•</span>
                                      <span>Rp {item.hargaFinal.toLocaleString("id-ID")}</span>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center space-x-3">
                                    <div className="text-right">
                                      <p className="font-bold text-gray-800 text-sm">
                                        Rp {(item.quantity * item.hargaFinal).toLocaleString("id-ID")}
                                      </p>
                                    </div>
                                    <button
                                      onClick={() => handleRemoveItem(item._id)}
                                      disabled={removingItem === item._id}
                                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors duration-200 disabled:opacity-50"
                                      title="Remove from cart"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div>
                          <h2 className="text-lg font-bold text-gray-800 mb-3 flex items-center">
                            <CreditCard className="w-5 h-5 mr-2 text-amber-500" />
                            Payment Method
                          </h2>
                          
                          {paymentMethods.length === 0 ? (
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-center">
                              <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                              <p className="text-yellow-700 font-medium text-sm">
                                No payment methods available.
                              </p>
                              <p className="text-yellow-600 text-xs mt-1">
                                Please contact admin to activate payment methods.
                              </p>
                            </div>
                          ) : (
                            <div className="space-y-4">
                              <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                  Select Payment Method
                                </label>
                                <select
                                  value={selectedMethod}
                                  onChange={(e) => {
                                    setSelectedMethod(e.target.value);
                                    setSelectedChannel("");
                                    setSelectedChannelObject(null);
                                  }}
                                  className="w-full p-3 border border-gray-200 rounded-lg focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all duration-200 appearance-none bg-white"
                                >
                                  {paymentMethods.map((m) => (
                                    <option key={m._id} value={m.method}>
                                      {m.method}
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {paymentMethods.find((m) => m.method === selectedMethod)?.channels.length && !isCashPayment ? (
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                  <label className="block text-sm font-semibold text-gray-700 mb-3">
                                    Select Payment Channel
                                  </label>
                                  <div className="grid grid-cols-2 gap-2">
                                    {paymentMethods
                                      .find((m) => m.method === selectedMethod)
                                      ?.channels.map((ch) => {
                                        const channelKey = getChannelKey(ch);
                                        const isSelected = selectedChannel === ch.name;
                                        
                                        return (
                                          <button
                                            key={channelKey}
                                            onClick={() => handleChannelSelect(ch)}
                                            className={`p-3 rounded-lg border transition-all duration-200 flex items-center space-x-2 ${
                                              isSelected
                                                ? (selectedMethod.toLowerCase().includes('e-wallet') 
                                                    ? "border-purple-500 bg-purple-50 shadow-sm" 
                                                    : "border-amber-500 bg-amber-50 shadow-sm")
                                                : "border-gray-200 bg-gray-50 hover:border-gray-300"
                                            }`}
                                          >
                                            {ch.logo ? (
                                              <img 
                                                src={ch.logo} 
                                                alt={ch.name}
                                                className="w-6 h-6 object-contain"
                                              />
                                            ) : (
                                              getPaymentMethodIcon(selectedMethod)
                                            )}
                                            <span className={`text-sm font-medium ${
                                              isSelected 
                                                ? (selectedMethod.toLowerCase().includes('e-wallet') 
                                                    ? "text-purple-700" 
                                                    : "text-amber-700")
                                                : "text-gray-700"
                                            }`}>
                                              {ch.name}
                                            </span>
                                            {isSelected && (
                                              <CheckCircle className={`w-4 h-4 ml-auto ${
                                                selectedMethod.toLowerCase().includes('e-wallet') 
                                                  ? "text-purple-500" 
                                                  : "text-amber-500"
                                              }`} />
                                            )}
                                          </button>
                                        );
                                      })}
                                  </div>
                                  
                                  {selectedChannel && (
                                    <div className={`mt-3 p-2 rounded-lg border ${
                                      selectedMethod.toLowerCase().includes('e-wallet') 
                                        ? "bg-purple-50 border-purple-200" 
                                        : "bg-amber-50 border-amber-200"
                                    }`}>
                                      <p className={`text-xs font-medium ${
                                        selectedMethod.toLowerCase().includes('e-wallet') 
                                          ? "text-purple-700" 
                                          : "text-amber-700"
                                      }`}>
                                        ✅ Payment via <strong>{selectedChannel}</strong>
                                        {selectedMethod.toLowerCase().includes('e-wallet') && (
                                          <span> using <QrCode className="inline w-3 h-3 mx-1" /> QRIS</span>
                                        )}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              ) : isCashPayment ? (
                                <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                                  <div className="flex items-center space-x-2">
                                    <Wallet className="w-5 h-5 text-amber-500" />
                                    <p className="text-amber-700 font-medium text-sm">
                                      ✅ Cash payment selected
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <div className="bg-gray-50 rounded-xl p-4 text-center">
                                  <p className="text-gray-600 text-sm">
                                    No channels available for this payment method.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-sm text-gray-600">Subtotal</span>
                            <span className="text-sm font-medium">{formatCurrency(total)}</span>
                          </div>
                          {totalBiayaLayanan > 0 && (
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-sm text-gray-600">Biaya Layanan ({totalBiayaLayanan}%)</span>
                              <span className="text-sm font-medium">{formatCurrency(calculateBiayaLayanan(total, totalBiayaLayanan))}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center">
                            <span className="text-lg font-semibold">Total Pembayaran</span>
                            <span className="text-xl font-bold text-green-600">
                              {formatCurrency(total + calculateBiayaLayanan(total, totalBiayaLayanan))}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="border-t border-gray-200 p-4 bg-gray-50">
                    <div className="flex justify-end space-x-3">
                      <button
                        onClick={handleCloseModal}
                        className="px-5 py-2.5 bg-white text-gray-700 rounded-lg font-medium border border-gray-300 hover:bg-gray-100 transition-colors"
                      >
                        Cancel
                      </button>
                      
                      <button
                        onClick={handleProsesTransaksi}
                        disabled={loading || cartItems.length === 0 || paymentMethods.length === 0 || (!isCashPayment && !selectedChannel)}
                        className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg font-medium shadow hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center space-x-2"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Processing...</span>
                          </>
                        ) : (
                          <>
                            <CreditCard className="w-4 h-4" />
                            <span>Process Transaction</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default TransactionModal;
