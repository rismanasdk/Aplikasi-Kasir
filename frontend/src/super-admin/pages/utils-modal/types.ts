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

export interface AsetTetap {
  _id: string;
  nama: string;
  nilai: number;
  tanggal_pembelian: string;
  keterangan?: string;
}

export interface Riwayat {
  _id: string;
  keterangan: string;
  tipe: 'pemasukan' | 'pengeluaran' | 'prive';
  jumlah: number;
  saldo_setelah: number;
  tanggal: string;
}

export interface ModalUtama {
  _id: string;
  total_modal: number;
  bahan_baku: BahanBaku[];
  biaya_operasional: BiayaOperasional[];
  aset_tetap?: AsetTetap[];
  total_aset_tetap?: number;
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
