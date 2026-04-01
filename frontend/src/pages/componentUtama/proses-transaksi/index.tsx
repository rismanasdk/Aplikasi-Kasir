import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { Variants } from "framer-motion";
import { 
  AlertCircle, 
  Loader2
} from "lucide-react";
import SweetAlert from "../../../components/SweetAlert";

import Header from "./components/Header";
import TimerCountdown from "./components/TimerCountdown";
import PaymentInfo from "./components/PaymentInfo";
import PurchaseDetails from "./components/PurchaseDetails";
import VirtualAccountPayment from "./components/PaymentMethodDetails/VirtualAccountPayment";
import QRISPayment from "./components/PaymentMethodDetails/QRISPayment";
import CashPayment from "./components/PaymentMethodDetails/CashPayment";
import FooterActions from "./components/FooterActions";
import { API_URL } from '../../../config/api';
import { getStoredToken } from '../../../auth/storage';


interface BarangDibeli {
  kode_barang: string;
  nama_barang: string;
  jumlah: number;
  harga_satuan: number;
  harga_beli: number;
  subtotal: number;
  _id: string;
  gambar_url?: string;
}

interface TransactionResponse {
  _id: string;
  order_id: string;
  nomor_transaksi: string;
  tanggal_transaksi: string;
  barang_dibeli: BarangDibeli[];
  total_harga: number;
  hargaFinal?: number;
  metode_pembayaran: string;
  status: string;
  kasir_id?: string;
  kasir_nama?: string;
  kasir_username?: string;
  createdAt: string;
  updatedAt: string;
  no_va?: string;
}

interface MidtransData {
  transaction_id?: string;
  order_id: string;
  gross_amount: string;
  payment_type: string;
  transaction_status: string;
  qr_string?: string;
  permata_va_number?: string;
  va_number?: string;
  actions?: Array<{
    name: string;
    method: string;
    url: string;
  }>;
}

interface ProsesTransaksiModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaksi: TransactionResponse | null;
  midtrans: MidtransData | null;
  expiryTime?: string;
  token?: string;
  onTransactionSuccess?: (transactionData: TransactionResponse) => void;
}

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

const ProsesTransaksiModal: React.FC<ProsesTransaksiModalProps> = ({
  isOpen,
  onClose,
  transaksi,
  midtrans,
  expiryTime,
  token,
  onTransactionSuccess
}) => {
  const [isPaymentSuccess, setIsPaymentSuccess] = useState<boolean>(false);
  const [isExpired, setIsExpired] = useState<boolean>(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState<boolean>(false);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [timeLeft, setTimeLeft] = useState<number>(300);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [qrCodeLoading, setQrCodeLoading] = useState<boolean>(true);
  const [qrCodeError, setQrCodeError] = useState<boolean>(false);
  const [paymentType, setPaymentType] = useState<'va' | 'qris' | 'tunai' | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [autoRefreshCount, setAutoRefreshCount] = useState<number>(0);
  const [currentTransaction, setCurrentTransaction] = useState<TransactionResponse | null>(null);
  const [hasTriggeredSuccess, setHasTriggeredSuccess] = useState<boolean>(false);
  const [hasCheckedStatus, setHasCheckedStatus] = useState<boolean>(false);
  
  const [barangDibeli, setBarangDibeli] = useState<BarangDibeli[]>([]);
  const [noVa, setNoVa] = useState<string>("");
  
  const [kasirData, setKasirData] = useState<{
    kasir_id?: string;
    kasir_nama?: string;
    kasir_username?: string;
  }>({});
  
  useEffect(() => {
    if (transaksi) {
      setCurrentTransaction(transaksi);
      if (transaksi.barang_dibeli) {
        setBarangDibeli(transaksi.barang_dibeli);
      }
      if (transaksi.no_va) {
        setNoVa(transaksi.no_va);
      }
      
      setKasirData({
        kasir_id: transaksi.kasir_id,
        kasir_nama: transaksi.kasir_nama,
        kasir_username: transaksi.kasir_username
      });
    }
  }, [transaksi]);
  
  const getStorageKey = useCallback((suffix: string) => {
    const orderId = transaksi?.order_id || midtrans?.order_id || token;
    return `transaksi_${orderId}_${suffix}`;
  }, [transaksi, midtrans, token]);

  const clearTransactionStorage = useCallback(() => {
    const orderId = transaksi?.order_id || midtrans?.order_id || token;
    if (orderId) {
      const storageKey = `transaksi_${orderId}_`;
      localStorage.removeItem(`${storageKey}success`);
      localStorage.removeItem(`${storageKey}expired`);
      localStorage.removeItem(`${storageKey}timeLeft`);
      localStorage.removeItem('transactionStatus');
    }
  }, [transaksi, midtrans, token]);

  const checkTransactionStatus = useCallback(async (orderId: string, isManualCheck = false) => {
    if (hasCheckedStatus && !isManualCheck) {
      
      return;
    }
    
    setIsCheckingStatus(true);
    try {
      
      
      const baseUrl = `${API_URL}`;
      const tokenLocal = getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`;
      
      const url = `${baseUrl}/api/transaksi/public/status/${orderId}`;
     
      
      const response = await fetch(url, { headers });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      
      if (!data) {
        
        throw new Error("Data transaksi tidak valid");
      }
      
      const normalizedData = {
        ...data,
        barang_dibeli: data.barang_dibeli || barangDibeli,
        total_harga: data.total_harga || 0,
        tanggal_transaksi: data.tanggal_transaksi || data.createdAt || new Date().toISOString(),
        nomor_transaksi: data.nomor_transaksi || data.order_id || '-',
        no_va: data.no_va || noVa,
        kasir_id: data.kasir_id || kasirData.kasir_id,
        kasir_nama: data.kasir_nama || kasirData.kasir_nama,
        kasir_username: data.kasir_username || kasirData.kasir_username,
      };
      
      setCurrentTransaction(normalizedData);
      setHasCheckedStatus(true);
      
      if (data.status === 'selesai') {
        
        setIsPaymentSuccess(true);
        
        await SweetAlert.fire({
          title: 'Pembayaran Berhasil!',
          html: `
            <div class="text-left">
              <p>Terima kasih, pembayaran Anda telah berhasil diproses.</p>
              <p class="mt-2"><strong>Nomor Transaksi:</strong> ${normalizedData.nomor_transaksi}</p>
              <p><strong>Total Pembayaran:</strong> Rp ${normalizedData.total_harga.toLocaleString('id-ID')}</p>
            </div>
          `,
          icon: 'success',
          confirmButtonText: 'Lihat Struk',
          confirmButtonColor: '#10B981',
          timer: 3000,
          timerProgressBar: true
        });
        
        if (!hasTriggeredSuccess && onTransactionSuccess) {
          setHasTriggeredSuccess(true);
          onTransactionSuccess(normalizedData);
        }
        
        setTimeout(() => {
          onClose(); 
        }, 1000);
      } else if (data.status === 'pending') {
        
        setHasTriggeredSuccess(false);
        
        await SweetAlert.fire({
          title: 'Menunggu Pembayaran',
          html: `
            <div class="text-left">
              <p>Kami belum menerima konfirmasi pembayaran Anda.</p>
              <p class="mt-2">Jika Anda sudah melakukan pembayaran, silakan tunggu beberapa saat dan cek kembali statusnya.</p>
              <p class="mt-2 text-sm text-gray-600">Status akan diperbarui otomatis dalam <strong>15 detik</strong>.</p>
              ${isManualCheck ? '<p class="mt-2 text-sm text-amber-600">Anda telah melakukan pengecekan manual. Silakan tunggu beberapa saat.</p>' : ''}
            </div>
          `,
          icon: 'info',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        });
      } else if (data.status === 'expire') {
        
        setIsExpired(true);
        clearTransactionStorage();
        
        await SweetAlert.fire({
          title: 'Pembayaran Kadaluarsa',
          html: `
            <div class="text-left">
              <p>Waktu pembayaran telah habis.</p>
              <p class="mt-2">Silakan lakukan transaksi kembali untuk mendapatkan kode pembayaran baru.</p>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#F59E0B'
        });
      } else if (data.status === 'deny' || data.status === 'cancel') {
        
        await SweetAlert.fire({
          title: 'Pembayaran Gagal',
          html: `
            <div class="text-left">
              <p>Pembayaran Anda gagal atau dibatalkan.</p>
              <p class="mt-2">Silakan coba lagi atau gunakan metode pembayaran lain.</p>
            </div>
          `,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#EF4444'
        });
      } else {
        
        await SweetAlert.fire({
          title: 'Status Pembayaran',
          html: `
            <div class="text-left">
              <p>Status pembayaran saat ini: <strong class="text-blue-600">${data.status}</strong></p>
              <p class="mt-2 text-sm text-gray-600">Jika Anda sudah melakukan pembayaran, silakan tunggu beberapa saat dan cek kembali statusnya.</p>
            </div>
          `,
          icon: 'info',
          confirmButtonText: 'OK',
          confirmButtonColor: '#3B82F6'
        });
      }
    } catch (error) {
      console.error("Error saat mengecek status transaksi:", error);
      await SweetAlert.fire({
        title: 'Error',
        html: `
          <div class="text-left">
            <p>Terjadi kesalahan saat mengecek status pembayaran.</p>
            <p class="mt-2 text-sm text-gray-600">Silakan coba lagi beberapa saat.</p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setIsCheckingStatus(false);
    }
  }, [onTransactionSuccess, onClose, hasTriggeredSuccess, barangDibeli, noVa, kasirData, hasCheckedStatus, clearTransactionStorage]);

  useEffect(() => {
    if (isPaymentSuccess) return;
    
    if (currentTransaction?.metode_pembayaran?.toLowerCase().includes('tunai')) {
      setIsPaymentSuccess(true);
      if (onTransactionSuccess && !hasTriggeredSuccess) {
        setHasTriggeredSuccess(true);
        onTransactionSuccess(currentTransaction);
      }
      return;
    }

    const extractSearch = (): string => {
      if (window.location.search && window.location.search.length > 1) return window.location.search;
      if (window.location.hash && window.location.hash.includes('?')) {
        return window.location.hash.slice(window.location.hash.indexOf('?'));
      }
      try {
        const u = new URL(window.location.href);
        return u.search || '';
      } catch (err) {
        console.warn('Failed to parse window.location.href', err);
        return '';
      }
    };

    const raw = extractSearch();
    const qp = new URLSearchParams(raw.startsWith('?') ? raw.slice(1) : raw);

    const orderId = qp.get('order_id') ?? qp.get('orderId');

    
    if (orderId) {
      checkTransactionStatus(orderId);
    }
    
    if (currentTransaction?.status === 'selesai') {
      
      setIsPaymentSuccess(true);
      if (onTransactionSuccess && !hasTriggeredSuccess) {
        setHasTriggeredSuccess(true);
        onTransactionSuccess(currentTransaction);
      }
      setTimeout(() => {
        onClose(); 
      }, 1000);
    }
  }, [token, currentTransaction, onTransactionSuccess, checkTransactionStatus, onClose, hasTriggeredSuccess, isPaymentSuccess]);

  useEffect(() => {
    if (!currentTransaction || !midtrans || isInitialized) return;
    
    const orderId = currentTransaction?.order_id || midtrans?.order_id;
    if (!orderId) return;
    
    const expiredKey = getStorageKey('expired');
    const isExpiredStored = localStorage.getItem(expiredKey) === 'true';
    
    if (isExpiredStored) {
      setIsExpired(true);
      setIsInitialized(true);
      return;
    }
    
    const successKey = getStorageKey('success');
    const isSuccessStored = localStorage.getItem(successKey) === 'true';
    
    if (isSuccessStored) {
      setIsPaymentSuccess(true);
      setIsInitialized(true);
      return;
    }
    
    let remainingTime = 300;
    
    if (expiryTime) {
      const expiryDate = new Date(expiryTime);
      const now = new Date();
      const diffInSeconds = Math.floor((expiryDate.getTime() - now.getTime()) / 1000);
      
      if (diffInSeconds <= 0) {
        localStorage.setItem(expiredKey, 'true');
        setIsExpired(true);
        setIsInitialized(true);
        return;
      }
      
      remainingTime = Math.min(diffInSeconds, 300);
    } else {
      const timeKey = getStorageKey('timeLeft');
      const storedTime = localStorage.getItem(timeKey);
      
      if (storedTime) {
        const parsedTime = parseInt(storedTime, 10);
        if (!isNaN(parsedTime) && parsedTime > 0) {
          remainingTime = parsedTime;
        }
      }
    }
    
    setTimeLeft(remainingTime);
    setIsInitialized(true);
  }, [currentTransaction, midtrans, expiryTime, token, isInitialized, getStorageKey]);

  useEffect(() => {
    if (!isInitialized || isExpired || isPaymentSuccess) return;
    
    if (timeLeft <= 0) {
      const expiredKey = getStorageKey('expired');
      localStorage.setItem(expiredKey, 'true');
      setIsExpired(true);
      return;
    }
    
    const timeKey = getStorageKey('timeLeft');
    localStorage.setItem(timeKey, timeLeft.toString());
    
    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [timeLeft, isInitialized, isExpired, isPaymentSuccess, getStorageKey]);

  useEffect(() => {
    if (isPaymentSuccess || isExpired) {
      const orderId = currentTransaction?.order_id || midtrans?.order_id || token;
      if (!orderId) return;
      
      if (isPaymentSuccess) {
        const successKey = getStorageKey('success');
        localStorage.setItem(successKey, 'true');
      }
      
      const timeKey = getStorageKey('timeLeft');
      localStorage.removeItem(timeKey);
    }
  }, [isPaymentSuccess, isExpired, currentTransaction, midtrans, token, getStorageKey]);

  useEffect(() => {
    if (paymentType === 'va' && !isPaymentSuccess && !isExpired && timeLeft > 0) {
      const interval = setInterval(() => {
        if (autoRefreshCount < 20) {
          const orderId = currentTransaction?.order_id || midtrans?.order_id || token;
          if (orderId) {
            checkTransactionStatus(orderId).then(() => {
              setAutoRefreshCount(prev => prev + 1);
            });
          }
        }
      }, 15000);
      
      return () => clearInterval(interval);
    }
  }, [paymentType, isPaymentSuccess, isExpired, timeLeft, autoRefreshCount, currentTransaction, midtrans, token, checkTransactionStatus]);

  useEffect(() => {
    setAutoRefreshCount(0);
  }, [paymentType]);

  useEffect(() => {
    
    if (currentTransaction && midtrans) {
      if (currentTransaction.metode_pembayaran?.includes('Virtual Account') || midtrans.payment_type === 'bank_transfer') {
        setPaymentType('va');
      } else if (currentTransaction.metode_pembayaran?.includes('QRIS') || 
                currentTransaction.metode_pembayaran?.includes('E-Wallet') || 
                midtrans.payment_type === 'qris' || 
                ['gopay', 'shopeepay', 'dana', 'ovo', 'linkaja'].includes(midtrans.payment_type || '')) {
        setPaymentType('qris');
      } else if (currentTransaction.metode_pembayaran?.includes('Tunai') || midtrans.payment_type === 'cstore') {
        setPaymentType('tunai');
      }
    }
  }, [token, currentTransaction, midtrans]);

  useEffect(() => {
    if (paymentType === 'qris') {
      setQrCodeLoading(true);
      setQrCodeError(false);
      
      if (midtrans && midtrans.actions && midtrans.actions.length > 0) {
        const qrAction = midtrans.actions.find(action => action.name === "generate-qr-code-v2") || 
                        midtrans.actions.find(action => action.name === "generate-qr-code");
        
        if (qrAction) {
          setQrCodeUrl(qrAction.url);
          setQrCodeLoading(false);
        } else {
          setQrCodeLoading(false);
          setQrCodeError(true);
        }
      } else {
        setQrCodeLoading(false);
        setQrCodeError(true);
      }
    } else {
      setQrCodeLoading(false);
    }
  }, [midtrans, paymentType]);

  const cancelTransaction = async (transactionId: string) => {
    setIsCancelling(true);
    try {
      
      
      const baseUrl = `${API_URL}`;
      const tokenLocal = getStoredToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      if (tokenLocal) headers['Authorization'] = `Bearer ${tokenLocal}`;
      
      const url = `${baseUrl}/api/transaksi/cancel/${transactionId}`;
      
      
      const response = await fetch(url, {
        method: 'PUT',
        headers
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log("Respons pembatalan berhasil:", data);
      
      clearTransactionStorage();
      
      await SweetAlert.fire({
        title: 'Pembatalan Berhasil',
        html: `
          <div class="text-left">
            <p>Transaksi telah berhasil dibatalkan.</p>
            <p class="mt-2">Anda akan diarahkan kembali ke halaman transaksi.</p>
          </div>
        `,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#10B981',
        timer: 2000,
        timerProgressBar: true
      });
      
      window.location.href = "/";
    } catch (error) {
      console.error("Error saat membatalkan transaksi:", error);
      
      await SweetAlert.fire({
        title: 'Pembatalan Gagal',
        html: `
          <div class="text-left">
            <p>Terjadi kesalahan saat membatalkan transaksi.</p>
            <p class="mt-2 text-sm text-gray-600">Silakan coba lagi atau hubungi admin.</p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#EF4444'
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handlePaymentWithMidtrans = async () => {
    
    
    const orderId = currentTransaction?.order_id || midtrans?.order_id || token;
    console.log('Checking status for orderId:', { 
      fromTransaksi: currentTransaction?.order_id, 
      fromMidtrans: midtrans?.order_id, 
      token 
    });

    if (orderId) {
      await checkTransactionStatus(orderId, true);
    } else {
      
      await SweetAlert.fire({
        title: 'Error',
        html: `
          <div class="text-left">
            <p>Order ID tidak ditemukan.</p>
            <p class="mt-2 text-sm text-gray-600">Silakan coba lagi atau hubungi admin.</p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#EF4444'
      });
    }
  };

  const handlePaymentCancel = async () => {
    
    
    const transactionId = currentTransaction?._id;
    if (transactionId) {
      const result = await SweetAlert.fire({
        title: 'Konfirmasi Pembatalan',
        html: `
          <div class="text-left">
            <p>Apakah Anda yakin ingin membatalkan transaksi ini?</p>
            <p class="mt-2 text-sm text-gray-600">Tindakan ini tidak dapat dibatalkan.</p>
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        cancelButtonColor: '#6B7280',
        confirmButtonText: 'Ya, Batalkan',
        cancelButtonText: 'Tidak'
      });
      
      if (result.isConfirmed) {
        await cancelTransaction(transactionId);
      } else {
        onClose();
      }
    } else {
      
      await SweetAlert.fire({
        title: 'Error',
        html: `
          <div class="text-left">
            <p>ID transaksi tidak ditemukan.</p>
            <p class="mt-2 text-sm text-gray-600">Silakan coba lagi atau hubungi admin.</p>
          </div>
        `,
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#EF4444'
      });
      
      onClose();
    }
  };

  useEffect(() => {
    if (isExpired) {
      if (isInitialized) {
        clearTransactionStorage();
        
        SweetAlert.fire({
          title: 'Pembayaran Kadaluarsa',
          html: `
            <div class="text-left">
              <p>Waktu pembayaran telah habis.</p>
              <p class="mt-2">Silakan lakukan transaksi kembali untuk mendapatkan kode pembayaran baru.</p>
            </div>
          `,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#F59E0B'
        });
      }
    }
  }, [isExpired, isInitialized, clearTransactionStorage]);

  useEffect(() => {
    if (isPaymentSuccess) {
      // Disable any payment processing
    }
  }, [isPaymentSuccess]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            variants={backdropVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
          />
            
          <motion.div
            className="fixed inset-0 flex items-center justify-center z-[60] p-4"
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div 
              className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <Header 
                onClose={onClose} 
                paymentType={paymentType} 
                metodePembayaran={currentTransaction?.metode_pembayaran}
                
              />

              {!isExpired && !isPaymentSuccess && paymentType !== 'tunai' && (
                <TimerCountdown timeLeft={timeLeft} />
              )}

              <div className="flex-1 overflow-y-auto p-6">
                {isExpired ? (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                    <div className="flex justify-center mb-4">
                      <div className="bg-red-100 p-3 rounded-full">
                        <AlertCircle className="w-10 h-10 text-red-500" />
                      </div>
                    </div>
                    <h3 className="text-xl font-bold text-red-800 mb-2">Pembayaran Kadaluarsa</h3>
                    <p className="text-red-600 mb-4">Waktu pembayaran telah habis</p>
                    <button
                      onClick={handlePaymentCancel}
                      disabled={isCancelling}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-gray-400 flex items-center justify-center mx-auto"
                    >
                      {isCancelling ? (
                        <>
                          <Loader2 className="animate-spin mr-2 h-4 w-4" />
                          Membatalkan...
                        </>
                      ) : (
                        "Kembali ke Halaman Transaksi"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <PaymentInfo
                      nomorTransaksi={currentTransaction?.nomor_transaksi}
                      tanggalTransaksi={currentTransaction?.tanggal_transaksi}
                      metodePembayaran={currentTransaction?.metode_pembayaran}
                      hargaFinal={currentTransaction?.total_harga}
                    />

                    <PurchaseDetails barangDibeli={barangDibeli} />

                    {paymentType === 'va' && currentTransaction && midtrans && (
                      <VirtualAccountPayment
                        metodePembayaran={currentTransaction.metode_pembayaran}
                        totalHarga={currentTransaction.total_harga}
                        noVa={noVa}
                        permataVaNumber={midtrans.permata_va_number}
                        vaNumber={midtrans.va_number}
                        status={currentTransaction.status}
                      />
                    )}
                    
                    {paymentType === 'qris' && (
                      <QRISPayment
                        metodePembayaran={currentTransaction?.metode_pembayaran}
                        totalHarga={currentTransaction?.total_harga}
                        qrCodeUrl={qrCodeUrl}
                        qrCodeLoading={qrCodeLoading}
                        qrCodeError={qrCodeError}
                      />
                    )}
                    
                    {paymentType === 'tunai' && (
                      <CashPayment
                        metodePembayaran={currentTransaction?.metode_pembayaran}
                        totalHarga={currentTransaction?.total_harga}
                      />
                    )}
                  </div>
                )}
              </div>

              <FooterActions
                isCancelling={isCancelling}
                isCheckingStatus={isCheckingStatus}
                isExpired={isExpired}
                onPaymentCancel={handlePaymentCancel}
                onPaymentWithMidtrans={handlePaymentWithMidtrans}
                paymentType={paymentType}
                transactionStatus={currentTransaction?.status}
              />
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProsesTransaksiModal;
