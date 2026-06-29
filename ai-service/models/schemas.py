# ai-service/models/schemas.py
"""
Pydantic response models untuk semua endpoint BI.
Digunakan untuk validasi output API agar konsisten.
"""
from pydantic import BaseModel
from typing import Any


# ============================================================
#  Utility / Shared
# ============================================================
class BaseResponse(BaseModel):
    success: bool = True
    message: str = ""


class PeriodeRequest(BaseModel):
    """Query param periode."""
    start: str | None = None   # YYYY-MM-DD
    end: str | None = None     # YYYY-MM-DD


# ============================================================
#  1. Ringkasan Bisnis Otomatis
# ============================================================
class ProdukLabaItem(BaseModel):
    nama_produk: str
    kode_barang: str = ""
    jumlah_terjual: int = 0
    pendapatan: float = 0
    hpp: float = 0
    laba_kotor: float = 0
    margin_persen: float = 0.0


class RingkasanData(BaseModel):
    periode: str
    total_pendapatan: float = 0
    total_hpp: float = 0
    total_laba_kotor: float = 0
    total_pengeluaran: float = 0
    total_laba_bersih: float = 0
    total_transaksi: int = 0
    rata_rata_transaksi: float = 0
    laba_bersih_margin_persen: float = 0.0
    target_omzet: float = 0
    pencapaian_target_persen: float = 0.0
    pertumbuhan_vs_periode_lalu_persen: float = 0.0
    top_produk: list[ProdukLabaItem] = []
    bottom_produk: list[ProdukLabaItem] = []
    metode_pembayaran: list[dict[str, Any]] = []
    insight_text: str = ""


class RingkasanResponse(BaseResponse):
    data: RingkasanData | None = None


# ============================================================
#  2-4. Insight Harian / Mingguan / Bulanan
# ============================================================
class InsightHighlight(BaseModel):
    label: str
    value: str
    trend: str  # "naik" | "turun" | "stabil"
    persen: float = 0.0
    deskripsi: str = ""


class JamRamaiItem(BaseModel):
    jam: int
    jumlah_transaksi: int
    total_omzet: float


class ProdukTrendingItem(BaseModel):
    nama_produk: str
    jumlah_terjual: int
    pendapatan: float


class InsightData(BaseModel):
    tipe: str  # "harian" | "mingguan" | "bulanan"
    periode_label: str
    highlight: list[InsightHighlight] = []
    jam_ramai: list[JamRamaiItem] = []
    produk_terlaris: list[ProdukTrendingItem] = []
    produk_naik: list[ProdukTrendingItem] = []
    produk_turun: list[ProdukTrendingItem] = []
    metode_populer: list[dict[str, Any]] = []
    ringkasan_narasi: str = ""
    rekomendasi_cepat: list[str] = []


class InsightResponse(BaseResponse):
    data: InsightData | None = None


# ============================================================
#  5. Analisis Penyebab Penjualan Turun
# ============================================================
class FaktorPenurunan(BaseModel):
    faktor: str
    deskripsi: str
    dampak: str  # "tinggi" | "sedang" | "rendah"
    nilai: float = 0.0
    detail: Any = None


class PerbandinganProduk(BaseModel):
    nama_produk: str
    periode_lalu_qty: int = 0
    periode_ini_qty: int = 0
    perubahan_persen: float = 0.0


class AnalisisPenurunanData(BaseModel):
    terdeteksi: bool = False
    penurunan_total_persen: float = 0.0
    faktor_utama: list[FaktorPenurunan] = []
    perbandingan_per_produk: list[PerbandinganProduk] = []
    perbandingan_per_kategori: list[dict[str, Any]] = []
    narasi: str = ""
    saran: list[str] = []


class AnalisisPenurunanResponse(BaseResponse):
    data: AnalisisPenurunanData | None = None


# ============================================================
#  6. Analisis Cash Flow
# ============================================================
class CashFlowHarianItem(BaseModel):
    tanggal: str
    pemasukan: float = 0
    pengeluaran: float = 0
    net_cash_flow: float = 0
    saldo_kumulatif: float = 0


class CashFlowData(BaseModel):
    periode: str
    total_pemasukan: float = 0
    total_pengeluaran: float = 0
    net_cash_flow: float = 0
    rata_pemasukan_harian: float = 0
    rata_pengeluaran_harian: float = 0
    saldo_kas_terkini: float = 0
    detail_harian: list[CashFlowHarianItem] = []
    trend: str = ""  # "positif" | "negatif" | "stabil"
    narasi: str = ""


class CashFlowResponse(BaseResponse):
    data: CashFlowData | None = None


# ============================================================
#  7. Analisis Pengeluaran
# ============================================================
class PengeluaranKategoriItem(BaseModel):
    kategori: str
    total: float = 0
    persen_dari_total: float = 0.0
    jumlah_transaksi: int = 0
    rata_per_transaksi: float = 0.0


class TrendPengeluaranItem(BaseModel):
    periode: str
    total: float = 0


class AnalisisPengeluaranData(BaseModel):
    periode: str
    total_pengeluaran: float = 0
    rasio_pengeluaran_pendapatan: float = 0.0
    breakdown_per_kategori: list[PengeluaranKategoriItem] = []
    trend_mingguan: list[TrendPengeluaranItem] = []
    pengeluaran_terbesar: list[dict[str, Any]] = []
    perbandingan_vs_periode_lalu: dict[str, Any] = {}
    narasi: str = ""
    saran: list[str] = []


class AnalisisPengeluaranResponse(BaseResponse):
    data: AnalisisPengeluaranData | None = None


# ============================================================
#  8. Deteksi Anomali Transaksi
# ============================================================
class AnomaliItem(BaseModel):
    nomor_transaksi: str
    tanggal: str
    total_harga: float
    jumlah_item: int
    jenis_anomali: str
    skor_anomali: float
    alasan: str


class StatistikNormal(BaseModel):
    rata_rata_harga: float = 0
    std_harga: float = 0
    rata_rata_item: float = 0
    std_item: float = 0
    median_harga: float = 0
    q1_harga: float = 0
    q3_harga: float = 0


class AnomaliData(BaseModel):
    periode: str
    total_diperiksa: int = 0
    jumlah_anomali: int = 0
    tingkat_anomali_persen: float = 0.0
    statistik_normal: StatistikNormal = StatistikNormal()
    anomali_terdeteksi: list[AnomaliItem] = []
    jam_tidak_wajar: list[dict[str, Any]] = []
    narasi: str = ""


class AnomaliResponse(BaseResponse):
    data: AnomaliData | None = None


# ============================================================
#  9. Deteksi Risiko Cash Flow
# ============================================================
class RisikoItem(BaseModel):
    tipe_risiko: str
    tingkat: str  # "tinggi" | "sedang" | "rendah"
    deskripsi: str
    nilai: float = 0.0
    saran: str = ""


class RisikoCashFlowData(BaseModel):
    saldo_kas_terkini: float = 0
    cash_runway_hari: float = 0.0
    avg_pengeluaran_harian: float = 0.0
    avg_pemasukan_harian: float = 0.0
    kewajiban_jatuh_tempo_30hari: list[dict[str, Any]] = []
    daftar_risiko: list[RisikoItem] = []
    skor_risiko: float = 0.0  # 0-100, semakin tinggi semakin berisiko
    status_keseluruhan: str = ""  # "aman" | "waspada" | "bahaya"
    narasi: str = ""


class RisikoCashFlowResponse(BaseResponse):
    data: RisikoCashFlowData | None = None


# ============================================================
#  10. Rekomendasi Bisnis Otomatis
# ============================================================
class RekomendasiItem(BaseModel):
    kategori: str  # "stok" | "produk" | "pengeluaran" | "harga" | "operasional" | "umum"
    prioritas: str  # "tinggi" | "sedang" | "rendah"
    judul: str
    deskripsi: str
    aksi: str
    dampak_potensial: str = ""


class RekomendasiData(BaseModel):
    total_rekomendasi: int = 0
    rekomendasi: list[RekomendasiItem] = []
    ringkasan: str = ""


class RekomendasiResponse(BaseResponse):
    data: RekomendasiData | None = None