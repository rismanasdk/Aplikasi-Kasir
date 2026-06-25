import * as XLSX from 'xlsx';
import type { ModalUtama } from './types';

interface ExportExcelData {
  modalData: ModalUtama | null;
  startDate?: string;
  endDate?: string;
}

export const exportToExcel = ({ modalData, startDate, endDate }: ExportExcelData) => {
  if (!modalData) {
    alert('Data modal tidak tersedia');
    return;
  }

  // Filter riwayat berdasarkan tanggal jika diberikan
  let filteredRiwayat = [...modalData.riwayat];
  
  // Default ke hari ini jika tidak ada filter tanggal
  if (!startDate && !endDate) {
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    filteredRiwayat = filteredRiwayat.filter(item => {
      const itemDate = new Date(item.tanggal);
      const itemDateStr = itemDate.toISOString().split('T')[0];
      return itemDateStr === todayStr;
    });
  } else if (startDate && endDate) {
    filteredRiwayat = filteredRiwayat.filter(item => {
      const itemDate = new Date(item.tanggal);
      const start = new Date(startDate + 'T00:00:00');
      const end = new Date(endDate + 'T23:59:59');
      return itemDate >= start && itemDate <= end;
    });
  }

  // Hitung total pemasukan dan pengeluaran
  const totalPemasukan = filteredRiwayat
    .filter(item => item.tipe === 'pemasukan')
    .reduce((sum, item) => sum + item.jumlah, 0);

  const totalPengeluaran = filteredRiwayat
    .filter(item => item.tipe === 'pengeluaran')
    .reduce((sum, item) => sum + item.jumlah, 0);

  // Buat workbook
  const wb = XLSX.utils.book_new();

  // 1. Sheet Ringkasan Keuangan
  const summaryData = [
    ['LAPORAN KEUANGAN'],
    ['Periode', startDate && endDate ? `${startDate} - ${endDate}` : 'Hari Ini'],
    [],
    ['RINGKASAN KEUANGAN'],
    ['Total Pemasukan', totalPemasukan],
    ['Total Pengeluaran', totalPengeluaran],
    ['Sisa Modal', modalData.sisa_modal],
    ['Jumlah Transaksi', filteredRiwayat.length],
    ['Selisih', totalPemasukan - totalPengeluaran]
  ];

  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, summaryWS, 'Ringkasan');

  // 2. Sheet Riwayat Transaksi
  const riwayatData = [
    ['RIWAYAT TRANSAKSI'],
    ['Tanggal', 'Keterangan', 'Tipe', 'Jumlah', 'Saldo Setelah'],
    ...filteredRiwayat.map(item => [
      new Date(item.tanggal).toLocaleString('id-ID'),
      item.keterangan,
      item.tipe,
      item.jumlah,
      item.saldo_setelah
    ])
  ];

  const riwayatWS = XLSX.utils.aoa_to_sheet(riwayatData);
  XLSX.utils.book_append_sheet(wb, riwayatWS, 'Riwayat Transaksi');

  // 3. Sheet Analisis Detail
  const analisisData = [
    ['ANALISIS DETAIL'],
    ['Periode', startDate && endDate ? `${startDate} - ${endDate}` : 'Hari Ini'],
    [],
    ['JUMLAH TRANSAKSI PER TIPE'],
    ['Pemasukan', filteredRiwayat.filter(item => item.tipe === 'pemasukan').length],
    ['Pengeluaran', filteredRiwayat.filter(item => item.tipe === 'pengeluaran').length],
    [],
    ['TOTAL PER TIPE'],
    ['Total Pemasukan', totalPemasukan],
    ['Total Pengeluaran', totalPengeluaran],
    [],
    ['PERSENTASE'],
    ['Persentase Pemasukan', `${((totalPemasukan / (totalPemasukan + totalPengeluaran)) * 100).toFixed(2)}%`],
    ['Persentase Pengeluaran', `${((totalPengeluaran / (totalPemasukan + totalPengeluaran)) * 100).toFixed(2)}%`]
  ];

  const analisisWS = XLSX.utils.aoa_to_sheet(analisisData);
  XLSX.utils.book_append_sheet(wb, analisisWS, 'Analisis Detail');

  // Generate filename dengan tanggal
  const today = new Date().toISOString().split('T')[0];
  const filename = `Laporan_Keuangan_${today}.xlsx`;

  // Download file
  XLSX.writeFile(wb, filename);
};
