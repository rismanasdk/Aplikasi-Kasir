export interface BahanBaku {
  _id: string;
  nama: string;
  harga: number;
  jumlah: number;
  total: number;
}

export interface BiayaOperasional {
  _id: string;
  nama: string;
  jumlah: number;
}

export interface Riwayat {
  _id: string;
  keterangan: string;
  tipe: 'pemasukan' | 'pengeluaran';
  jumlah: number;
  saldo_setelah: number;
  tanggal: string;
}

export interface ModalUtama {
  _id: string;
  total_modal: number;
  bahan_baku: BahanBaku[];
  biaya_operasional: BiayaOperasional[];
  sisa_modal: number;
  saldo_kas: number;
  riwayat: Riwayat[];
  createdAt: string;
  updatedAt: string;
}

export interface AddModalResponse {
  message: string;
  modal: ModalUtama;
}