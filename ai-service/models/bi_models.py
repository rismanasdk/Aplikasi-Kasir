from typing import List, Dict, Any

from pydantic import BaseModel, Field


class RingkasanInput(BaseModel):
    total_pendapatan: float = Field(..., ge=0)
    total_hpp: float = Field(..., ge=0)
    total_laba_kotor: float = Field(..., ge=0)
    total_biaya_operasional: float = Field(..., ge=0)
    total_laba_bersih: float = Field(...)
    total_barang_terjual: int = Field(..., ge=0)
    target: float = Field(..., ge=0)


class RingkasanRequest(BaseModel):
    ringkasan: RingkasanInput


class RingkasanResponse(BaseModel):
    status: str
    insight: List[str]
    rekomendasi: List[str]
    narasi: str


class CashflowInput(BaseModel):
    kas: float = Field(..., ge=0)
    total_modal: float = Field(..., ge=0)
    sisa_modal: float = Field(...)
    kas_masuk: float = Field(..., ge=0)
    kas_keluar: float = Field(..., ge=0)
    arus_kas_bersih: float = Field(...)


class CashflowRequest(BaseModel):
    cashflow: CashflowInput


class CashflowResponse(BaseModel):
    status: str
    score: int = Field(..., ge=0, le=100)
    insight: List[str]
    warning: List[str]
    rekomendasi: List[str]
    narasi: str


class ProdukDetail(BaseModel):
    kode_barang: str
    nama_barang: str
    kategori: str | None = None
    stok: int = Field(..., ge=0)
    jumlah_terjual: int = Field(..., ge=0)
    omzet: float = Field(..., ge=0)
    kontribusi_persen: float = Field(..., ge=0)
    last_sold_date: str | None = None


class ProdukInput(BaseModel):
    total_produk: int = Field(..., ge=0)
    produk_aktif: int = Field(..., ge=0)
    produk_stagnan: int = Field(..., ge=0)
    total_produk_terjual: int = Field(..., ge=0)
    total_omzet: float = Field(..., ge=0)
    top_selling: List[ProdukDetail]
    bottom_selling: List[ProdukDetail]
    stagnan_produk: List[ProdukDetail]
    semua_produk: List[ProdukDetail]


class ProdukRequest(BaseModel):
    produk: ProdukInput


class ProdukResponse(BaseModel):
    status: str
    score: int = Field(..., ge=0, le=100)
    insight: List[str]
    warning: List[str]
    rekomendasi: List[str]
    narasi: str


class PersediaanDetail(BaseModel):
    kode_barang: str
    nama_barang: str
    kategori: str | None = None
    stok: int = Field(..., ge=0)
    stok_minimal: int = Field(..., ge=0)
    harga_beli: float = Field(..., ge=0)
    harga_jual: float = Field(..., ge=0)
    nilai_stok: float = Field(..., ge=0)
    jumlah_terjual: int = Field(..., ge=0)
    omzet: float = Field(..., ge=0)
    last_sold_date: str | None = None
    hari_sejak_terjual: int | None = None
    kontribusi_persen: float = Field(..., ge=0)


class PersediaanInput(BaseModel):
    total_produk: int = Field(..., ge=0)
    total_stok: int = Field(..., ge=0)
    nilai_persediaan: float = Field(..., ge=0)
    produk_habis: List[PersediaanDetail] = Field(default_factory=list)
    produk_hampir_habis: List[PersediaanDetail] = Field(default_factory=list)
    fast_moving: List[PersediaanDetail] = Field(default_factory=list)
    slow_moving: List[PersediaanDetail] = Field(default_factory=list)
    semua_produk: List[PersediaanDetail] = Field(default_factory=list)


class PersediaanRequest(BaseModel):
    persediaan: PersediaanInput


class KeuanganInput(BaseModel):
    pendapatan: float = Field(..., ge=0)
    hpp: float = Field(..., ge=0)
    pengeluaran_operasional: float = Field(..., ge=0)
    target_omzet: float = Field(default=0, ge=0)


class KeuanganRequest(BaseModel):
    keuangan: KeuanganInput


class ForecastProductDetail(BaseModel):
    nama: str
    total_qty_terjual: float = Field(..., ge=0)
    stok_sekarang: float | None = Field(default=None, ge=0)


class ForecastHistoryItem(BaseModel):
    tanggal: str
    total_penjualan: float = Field(..., ge=0)


class AnomalyPeriod(BaseModel):
    pendapatan: float = Field(..., ge=0)
    hpp: float = Field(..., ge=0)
    pengeluaran: float = Field(..., ge=0)
    laba_bersih: float = Field(...)
    margin: float = Field(...)
    produk_terjual: float = Field(default=0, ge=0)
    persediaan: float = Field(default=0, ge=0)
    forecast: float | None = Field(default=None, ge=0)
    realisasi: float | None = Field(default=None, ge=0)


class AnomalyProductItem(BaseModel):
    nama: str
    current_qty: float = Field(..., ge=0)
    previous_qty: float = Field(..., ge=0)


class AnomalyRequest(BaseModel):
    current: AnomalyPeriod
    previous: AnomalyPeriod
    produk: list[AnomalyProductItem] = Field(default_factory=list)


class AnomalyResponse(BaseModel):
    status: str
    insight: List[str]
    rekomendasi: List[str]
    narasi: str


class ExecutiveRequest(BaseModel):
    # Accept domain results as arbitrary objects (dicts) to allow flexibility
    ringkasan: Dict[str, Any] | None = None
    cashflow: Dict[str, Any] | None = None
    produk: Dict[str, Any] | None = None
    persediaan: Dict[str, Any] | None = None
    keuangan: Dict[str, Any] | None = None
    forecast: Dict[str, Any] | None = None
    anomaly: Dict[str, Any] | None = None


class ExecutiveResponse(BaseModel):
    status: str
    executive_summary: str
    prioritas: List[str]
    peluang: List[str]
    risiko: List[str]
    aksi_minggu_ini: List[str]
    narasi: str


class ForecastRequest(BaseModel):
    histori: list[ForecastHistoryItem]
    produk: list[ForecastProductDetail] = Field(default_factory=list)


class ForecastResponse(BaseModel):
    status: str
    insight: List[str]
    rekomendasi: List[str]
    narasi: str


class PersediaanResponse(BaseModel):
    status: str
    score: int = Field(..., ge=0, le=100)
    insight: List[str]
    warning: List[str]
    rekomendasi: List[str]
    narasi: str


class KeuanganResponse(BaseModel):
    status: str
    insight: List[str]
    rekomendasi: List[str]
    narasi: str

