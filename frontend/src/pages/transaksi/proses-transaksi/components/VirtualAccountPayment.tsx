// src/pages/transaksi/proses-transaksi/components/VirtualAccountPayment.tsx
import { useState } from "react";
import { API_URL } from '../../../../config/api';


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
  nomor_transaksi: string;
  tanggal_transaksi: string;
  barang_dibeli: BarangDibeli[];
  jumlah: number;
  total_harga: number;
  metode_pembayaran: string;
  status: string;
  kasir_id?: string;
  createdAt: string;
  updatedAt: string;
}

interface VirtualAccountPaymentProps {
  transaksi: TransactionResponse | null;
  onPaymentSuccess: () => void;
  onPaymentCancel: () => void;
}

const VirtualAccountPayment = ({ transaksi, onPaymentSuccess, onPaymentCancel }: VirtualAccountPaymentProps) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Extract VA type from payment method
  const getVaType = () => {
    if (!transaksi?.metode_pembayaran) return "";
    
    const match = transaksi.metode_pembayaran.match(/Virtual Account \(([^)]+)\)/);
    return match ? match[1] : "";
  };

  const vaType = getVaType();
  
  let bankName = "";
  let bankInstructions: string[] = [];
  
  switch (vaType) {
    case "mandiri_va":
      bankName = "Mandiri";
      bankInstructions = [
        "Buka aplikasi Mandiri Online atau ATM Mandiri",
        "Pilih menu Pembayaran",
        "Pilih menu Multi Payment",
        "Masukkan kode perusahaan: 70014",
        "Masukkan nomor Virtual Account: 08159688130257003871806",
        "Masukkan jumlah pembayaran: Rp " + (transaksi?.total_harga?.toLocaleString("id-ID") || "0"),
        "Konfirmasi pembayaran dan simpan bukti transaksi"
      ];
      break;
    case "bca_va":
      bankName = "BCA";
      bankInstructions = [
        "Buka aplikasi BCA Mobile atau ATM BCA",
        "Pilih menu m-Transfer atau Transfer",
        "Pilih menu BCA Virtual Account",
        "Masukkan nomor Virtual Account: 08159688130257003871806",
        "Masukkan jumlah pembayaran: Rp " + (transaksi?.total_harga?.toLocaleString("id-ID") || "0"),
        "Konfirmasi pembayaran dan simpan bukti transaksi"
      ];
      break;
    case "bni_va":
      bankName = "BNI";
      bankInstructions = [
        "Buka aplikasi BNI Mobile Banking atau ATM BNI",
        "Pilih menu Transfer",
        "Pilih menu Virtual Account Billing",
        "Masukkan nomor Virtual Account: 08159688130257003871806",
        "Masukkan jumlah pembayaran: Rp " + (transaksi?.total_harga?.toLocaleString("id-ID") || "0"),
        "Konfirmasi pembayaran dan simpan bukti transaksi"
      ];
      break;
    case "bri_va":
      bankName = "BRI";
      bankInstructions = [
        "Buka aplikasi BRImo atau ATM BRI",
        "Pilih menu Pembayaran",
        "Pilih menu BRIVA",
        "Masukkan nomor Virtual Account: 08159688130257003871806",
        "Masukkan jumlah pembayaran: Rp " + (transaksi?.total_harga?.toLocaleString("id-ID") || "0"),
        "Konfirmasi pembayaran dan simpan bukti transaksi"
      ];
      break;
    default:
      bankName = "Bank";
      bankInstructions = [
        "Buka aplikasi mobile banking atau ATM bank Anda",
        "Pilih menu Pembayaran",
        "Pilih menu Virtual Account",
        "Masukkan nomor Virtual Account: 08159688130257003871806",
        "Masukkan jumlah pembayaran: Rp " + (transaksi?.total_harga?.toLocaleString("id-ID") || "0"),
        "Konfirmasi pembayaran dan simpan bukti transaksi"
      ];
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setPaymentProof(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentProof) {
      alert("Silakan upload bukti pembayaran");
      return;
    }

    setIsLoading(true);
    
    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('payment_proof', paymentProof);
      formData.append('transaction_id', transaksi?._id || "");
      
      // Upload bukti pembayaran
      const uploadResponse = await fetch(`${API_URL}/api/transaksi/upload-proof`, {
        method: 'POST',
        body: formData,
      });
      
      if (!uploadResponse.ok) {
        throw new Error("Gagal upload bukti pembayaran");
      }
      
      // Update status transaksi di backend
      const updateResponse = await fetch(`${API_URL}/api/transaksi/${transaksi?._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          status: 'selesai',
          // Kirim data lengkap untuk memastikan update berhasil
          nomor_transaksi: transaksi?.nomor_transaksi,
          barang_dibeli: transaksi?.barang_dibeli,
          total_harga: transaksi?.total_harga,
          metode_pembayaran: transaksi?.metode_pembayaran,
          kasir_id: transaksi?.kasir_id
        }),
      });
      
      if (updateResponse.ok) {
        onPaymentSuccess();
      } else {
        console.error("Gagal update status transaksi:", await updateResponse.text());
        alert("Gagal memproses pembayaran. Silakan coba lagi.");
      }
    } catch (error) {
      console.error("Error saat memproses pembayaran:", error);
      alert("Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h2 className="text-xl font-bold text-gray-800 mb-4">Pembayaran Virtual Account {bankName}</h2>
      
      <div className="mb-6">
        <div className="bg-blue-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600">Nomor Transaksi</p>
          <p className="font-medium">{transaksi?.nomor_transaksi || "-"}</p>
        </div>
        
        <div className="bg-green-50 p-4 rounded-lg mb-4">
          <p className="text-sm text-gray-600">Total Pembayaran</p>
          <p className="font-medium text-lg">Rp {transaksi?.total_harga?.toLocaleString("id-ID") || "0"}</p>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium mb-3">Cara Pembayaran:</h3>
          <ol className="list-decimal pl-5 space-y-1">
            {bankInstructions.map((instruction, index) => (
              <li key={index}>{instruction}</li>
            ))}
          </ol>
          
          <div className="mt-4">
            <p className="text-sm text-gray-600">Nomor Virtual Account</p>
            <p className="font-medium font-mono">08159688130257003871806</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-gray-700 text-sm font-bold mb-2">
            Upload Bukti Pembayaran
          </label>
          <div className="flex items-center justify-center w-full">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg className="w-8 h-8 mb-4 text-gray-500" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 16">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"/>
                </svg>
                <p className="mb-2 text-sm text-gray-500"><span className="font-semibold">Klik untuk upload</span></p>
                <p className="text-xs text-gray-500">PNG, JPG, PDF (MAX. 5MB)</p>
              </div>
              <input 
                type="file" 
                className="hidden" 
                onChange={handleFileChange}
                accept="image/*,.pdf"
              />
            </label>
          </div>
        </div>
        
        {previewUrl && (
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Preview Bukti Pembayaran
            </label>
            <div className="border rounded-lg p-2">
              {paymentProof?.type.startsWith('image/') ? (
                <img 
                  src={previewUrl} 
                  alt="Preview bukti pembayaran" 
                  className="max-w-full h-auto max-h-60 mx-auto"
                />
              ) : (
                <div className="flex items-center justify-center h-40 bg-gray-100">
                  <p className="text-gray-500">File PDF: {paymentProof?.name}</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
          <button
            type="button"
            onClick={onPaymentCancel}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
          >
            Batal
          </button>
          <button
            type="submit"
            disabled={isLoading || !paymentProof}
            className="px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400"
          >
            {isLoading ? "Memproses..." : "Konfirmasi Pembayaran"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VirtualAccountPayment;
