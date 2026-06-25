import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ModalUtama } from './types';

interface ExportPdfData {
  modalData: ModalUtama | null;
  startDate?: string;
  endDate?: string;
}

// Extend jsPDF interface to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: {
      finalY: number;
    };
  }
}

export const exportToPDF = ({ modalData, startDate, endDate }: ExportPdfData) => {
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

  // Buat PDF
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Header
  doc.setFontSize(18);
  doc.text('LAPORAN KEUANGAN', pageWidth / 2, 20, { align: 'center' });
  
  doc.setFontSize(12);
  doc.text(
    `Periode: ${startDate && endDate ? `${startDate} - ${endDate}` : 'Hari Ini'}`, 
    pageWidth / 2, 
    30, 
    { align: 'center' }
  );
  
  // Analisis Keuangan
  const totalPemasukan = filteredRiwayat
    .filter(item => item.tipe === 'pemasukan')
    .reduce((sum, item) => sum + item.jumlah, 0);

  const totalPengeluaran = filteredRiwayat
    .filter(item => item.tipe === 'pengeluaran')
    .reduce((sum, item) => sum + item.jumlah, 0);
  
  // Tampilkan Total Pemasukan dan Pengeluaran di atas
  doc.setFontSize(14);
  doc.text('RINGKASAN KEUANGAN', 14, 50);
  
  doc.setFontSize(12);
  doc.text(`Total Pemasukan: Rp ${totalPemasukan.toLocaleString('id-ID')}`, 14, 60);
  doc.text(`Total Pengeluaran: Rp ${totalPengeluaran.toLocaleString('id-ID')}`, 14, 70);
  doc.text(`Sisa Modal: Rp ${modalData.sisa_modal.toLocaleString('id-ID')}`, 14, 80);
  doc.text(`Jumlah Transaksi: ${filteredRiwayat.length}`, 14, 90);
  
  // Tabel Riwayat Transaksi
  doc.setFontSize(14);
  doc.text('RIWAYAT TRANSAKSI', 14, 110);
  
  const tableData = filteredRiwayat.map(item => [
    new Date(item.tanggal).toLocaleDateString('id-ID'),
    item.keterangan,
    item.tipe,
    `Rp ${item.jumlah.toLocaleString('id-ID')}`,
    `Rp ${item.saldo_setelah.toLocaleString('id-ID')}`
  ]);
  
  // Use autoTable with proper options
  autoTable(doc, {
    head: [['Tanggal', 'Keterangan', 'Tipe', 'Jumlah', 'Saldo Setelah']],
    body: tableData,
    startY: 120,
    theme: 'striped',
    headStyles: { 
      fillColor: [41, 128, 185],
      fontStyle: 'bold'
    },
    styles: {
      font: 'helvetica',
      fontSize: 10
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245]
    }
  });
  
  // Get final Y position safely using type assertion
  let finalY = 130;
  const docWithAutoTable = doc as jsPDF & { lastAutoTable?: { finalY: number } };
  if (docWithAutoTable.lastAutoTable?.finalY) {
    finalY = docWithAutoTable.lastAutoTable.finalY + 10;
  }
  
  // Analisis Tambahan
  doc.setFontSize(14);
  doc.text('ANALISIS TAMBAHAN', 14, finalY);
  
  doc.setFontSize(12);
  doc.text(`Selisih: Rp ${(totalPemasukan - totalPengeluaran).toLocaleString('id-ID')}`, 14, finalY + 10);
  
  // Generate filename dengan tanggal
  const today = new Date().toISOString().split('T')[0];
  const filename = `Laporan_Keuangan_${today}.pdf`;
  
  // Save PDF
  doc.save(filename);
};
