export type StatusKewajiban = 'belum_lunas' | 'sebagian' | 'lunas' | 'dibatalkan';

export interface Kewajiban {
  _id: string;
  kategori: string;
  nama: string;
  pihak?: string;
  jumlah_awal: number;
  sisa_jumlah: number;
  tanggal: string;
  jatuh_tempo?: string | null;
  status: StatusKewajiban;
  sumber?: string;
  keterangan?: string;
}

export interface LiabilitasFormData {
  kategori: string;
  nama: string;
  pihak: string;
  jumlah: string;
  tanggal: string;
  jatuh_tempo: string;
  keterangan: string;
}

export interface RingkasanLiabilitas {
  total_kewajiban: number;
  jumlah_data: number;
}

export interface KategoriSummary {
  kategori: string;
  total: number;
  jumlah_data: number;
}

export type SortField = 'nama' | 'kategori' | 'pihak' | 'jumlah_awal' | 'sisa_jumlah' | 'tanggal' | 'jatuh_tempo' | 'status';
export type SortDir = 'asc' | 'desc';
export type ToastVariant = 'success' | 'error';

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}
