import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { formatRupiah } from '../formatRupiah';

interface OmzetData {
  hari_ini: number;
  minggu_ini: number;
  bulan_ini: number;
}

export const exportOmzetToPdf = (omzetData: OmzetData | null) => {
  if (!omzetData) return;

  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(18);
  doc.text('Laporan Omzet', 14, 15);
  doc.setFontSize(12);
  doc.text(`Tanggal: ${new Date().toLocaleDateString('id-ID')}`, 14, 25);

  // Data untuk tabel - hanya Periode dan Omzet
  const data = [
    ['Periode', 'Omzet'],
    ['Hari Ini', formatRupiah(omzetData.hari_ini)],
    ['Minggu Ini', formatRupiah(omzetData.minggu_ini)],
    ['Bulan Ini', formatRupiah(omzetData.bulan_ini)]
  ];

  // Membuat tabel dengan autoTable
  autoTable(doc, {
    head: [data[0]],
    body: data.slice(1),
    startY: 35,
    theme: 'grid',
    headStyles: { fillColor: [59, 130, 246] },
    styles: { fontSize: 10 },
    columnStyles: {
      0: { cellWidth: 20 }, // Lebar kolom Periode
      1: { cellWidth: 'auto' } // Lebar kolom Omzet menyesuaikan konten
    }
  });

  // Menyimpan file
  doc.save(`laporan_omzet_${new Date().toISOString().split('T')[0]}.pdf`);
};