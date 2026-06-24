// src/admin/dashboard/laporan-penjualan/utils/exportExcel.ts
import * as XLSX from 'xlsx';
import { formatRupiah } from '../../utils/formatRupiah';

// Interface untuk data produk terlaris
interface ProdukTerlaris {
  produk: string;
  harga_jual: number;
  harga_beli: number;
  labaPerItem: number;
  jumlahTerjual: number;
  totalLaba: number;
}

// Interface untuk data metode pembayaran
interface MetodePembayaran {
  metode: string;
  total: number;
}

// Interface untuk biaya operasional (sesuaikan dengan struktur API)
interface BiayaOperasional {
  _id: string;
  rincian_biaya: Array<{
    nama: string;
    jumlah: number;
    _id: string;
  }>;
  total: number;
  createdAt: string;
  __v: number;
}

// Interface untuk data laporan
interface LaporanData {
  periode: {
    start: string;
    end: string;
  };
  laba: {
    total_laba: number;
    detail: ProdukTerlaris[];
  };
  rekap_metode_pembayaran: MetodePembayaran[];
  totalPendapatan: number;
  totalBarangTerjual: number;
  pengeluaran: number; // Tambahkan properti ini
  biaya_operasional: BiayaOperasional;
}

// Fungsi untuk mengekspor data ke Excel
export const exportExcel = (data: LaporanData) => {
  // Buat workbook baru
  const workbook = XLSX.utils.book_new();
  
  // Buat worksheet untuk ringkasan
  const ringkasanData = [
    ['Ringkasan Laporan Penjualan'],
    [],
    ['Periode', `${new Date(data.periode.start).toLocaleDateString('id-ID')} - ${new Date(data.periode.end).toLocaleDateString('id-ID')}`],
    [],
    ['Total Laba', formatRupiah(data.laba.total_laba)],
    ['Total Pendapatan', formatRupiah(data.totalPendapatan)],
    ['Total Transaksi', data.laba.detail.length.toString()],
    ['Total Barang Terjual', data.totalBarangTerjual.toString()],
    ['Biaya Operasional', formatRupiah(data.biaya_operasional.total)]
  ];
  
  // Hitung laba kotor
  const totalHargaBeli = data.laba.detail.reduce((sum, item) => sum + item.harga_beli, 0);
  const labaKotor = data.totalPendapatan - totalHargaBeli;
  ringkasanData.push(['Laba Kotor', formatRupiah(labaKotor)]);
  
  const ringkasanSheet = XLSX.utils.aoa_to_sheet(ringkasanData);
  XLSX.utils.book_append_sheet(workbook, ringkasanSheet, 'Ringkasan');
  
  // Buat worksheet untuk biaya operasional
  const biayaOperasionalData = [
    ['Detail Biaya Operasional'],
    [],
    ['Kategori', 'Jumlah']
  ];
  
  // Tambahkan data rincian biaya
  data.biaya_operasional.rincian_biaya.forEach(item => {
    biayaOperasionalData.push([item.nama, formatRupiah(item.jumlah)]);
  });
  
  // Tambahkan baris total
  biayaOperasionalData.push(['Total', formatRupiah(data.biaya_operasional.total)]);
  
  const biayaOperasionalSheet = XLSX.utils.aoa_to_sheet(biayaOperasionalData);
  XLSX.utils.book_append_sheet(workbook, biayaOperasionalSheet, 'Biaya Operasional');
  
  // Buat worksheet untuk produk terlaris
  const produkHeader = ['Produk', 'Harga Jual', 'Harga Beli', 'Laba/Item', 'Jumlah Terjual', 'Total Laba'];
  const produkRows = data.laba.detail.map(item => [
    item.produk,
    formatRupiah(item.harga_jual),
    formatRupiah(item.harga_beli),
    formatRupiah(item.labaPerItem),
    item.jumlahTerjual.toString(),
    formatRupiah(item.totalLaba)
  ]);
  
  const produkSheet = XLSX.utils.aoa_to_sheet([produkHeader, ...produkRows]);
  XLSX.utils.book_append_sheet(workbook, produkSheet, 'Produk Terlaris');
  
  // Buat worksheet untuk metode pembayaran
  const metodeHeader = ['Metode', 'Total'];
  const metodeRows = data.rekap_metode_pembayaran.map(item => [
    item.metode,
    formatRupiah(item.total)
  ]);
  
  const metodeSheet = XLSX.utils.aoa_to_sheet([metodeHeader, ...metodeRows]);
  XLSX.utils.book_append_sheet(workbook, metodeSheet, 'Metode Pembayaran');
  
  // Simpan file
  XLSX.writeFile(workbook, `Laporan_Penjualan_${new Date().toISOString().split('T')[0]}.xlsx`);
};