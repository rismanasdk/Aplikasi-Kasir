import { formatRupiah } from '../formatRupiah';

interface OmzetData {
  hari_ini: number;
  minggu_ini: number;
  bulan_ini: number;
}

export const exportOmzetToCsv = (omzetData: OmzetData | null) => {
  if (!omzetData) return;
  
const data = [
  ['Periode', 'Omzet'],
  ['Hari Ini', formatRupiah(omzetData.hari_ini)],
  ['Minggu Ini', formatRupiah(omzetData.minggu_ini)],
  ['Bulan Ini', formatRupiah(omzetData.bulan_ini)]
];

  
  const csvContent = "data:text/csv;charset=utf-8," + 
    data.map(row => row.join(",")).join("\n");
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `laporan_omzet_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};