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
