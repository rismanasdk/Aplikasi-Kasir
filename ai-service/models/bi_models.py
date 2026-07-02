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

