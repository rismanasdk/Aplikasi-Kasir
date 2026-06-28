import * as XLSX from 'xlsx';
import { formatRupiah } from '../formatRupiah';

interface OmzetData {
  hari_ini: number;
  minggu_ini: number;
  bulan_ini: number;
}

export const exportOmzetToExcel = (omzetData: OmzetData | null) => {
  if (!omzetData) return;

 const data = [
  ['Periode', 'Omzet'],
  ['Hari Ini', formatRupiah(omzetData.hari_ini)],
  ['Minggu Ini', formatRupiah(omzetData.minggu_ini)],
  ['Bulan Ini', formatRupiah(omzetData.bulan_ini)]
];

  // Membuat worksheet
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Membuat workbook
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Laporan Omzet');

  // Menyimpan file
  XLSX.writeFile(wb, `laporan_omzet_${new Date().toISOString().split('T')[0]}.xlsx`);
};