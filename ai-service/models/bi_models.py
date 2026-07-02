from typing import List

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


class PersediaanResponse(BaseModel):
    status: str
    score: int = Field(..., ge=0, le=100)
    insight: List[str]
    warning: List[str]
    rekomendasi: List[str]
    narasi: str

