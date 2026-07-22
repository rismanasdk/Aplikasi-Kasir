export interface DaftarBulan {
  id: string;
  nama_bulan: string;
  bulan: number;
  tahun: number;
  createdAt: string;
}

export interface BiayaOperasionalItem {
  nama: string;
  jumlah: number;
  _id?: string;
}

export interface BiayaOperasionalData {
  _id?: string;
  rincian_biaya: BiayaOperasionalItem[];
  total: number;
  createdAt?: string;
  __v?: number;
}

export interface PieData {
  name: string;
  value: number;
  [key: string]: unknown;
}
