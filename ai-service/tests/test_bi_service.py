import pytest

from services.bi_service import BusinessIntelligenceService
from models.bi_models import KeuanganRequest, RingkasanRequest, PersediaanRequest


class FakeAIClient:
    def __init__(self, responses):
        self._responses = list(responses)

    async def generate(self, prompt: str) -> str:
        if not self._responses:
            return '{"status":"Sehat","insight":[],"rekomendasi":[],"narasi":"fallback"}'
        return self._responses.pop(0)


@pytest.mark.asyncio
async def test_fallback_when_ai_returns_non_json():
    service = BusinessIntelligenceService(ai_client=FakeAIClient(["not json"]))
    payload = RingkasanRequest(ringkasan={
        "total_pendapatan": 1000,
        "total_hpp": 200,
        "total_laba_kotor": 800,
        "total_biaya_operasional": 100,
        "total_laba_bersih": 700,
        "total_barang_terjual": 10,
        "target": 900,
    })

    result = await service.analyze_ringkasan(payload)

    assert result.status
    assert isinstance(result.insight, list)
    assert isinstance(result.rekomendasi, list)
    assert isinstance(result.narasi, str)


@pytest.mark.asyncio
async def test_keuangan_falls_back_when_ai_client_errors():
    class FailingAIClient:
        async def generate(self, prompt: str) -> str:
            raise RuntimeError("quota exceeded")

    service = BusinessIntelligenceService(ai_client=FailingAIClient())
    payload = KeuanganRequest(keuangan={
        "pendapatan": 20000000,
        "hpp": 12000000,
        "pengeluaran_operasional": 3000000,
        "target_omzet": 25000000,
    })

    result = await service.analyze_keuangan(payload)

    assert result.status
    assert isinstance(result.insight, list)
    assert isinstance(result.rekomendasi, list)
    assert isinstance(result.narasi, str)
    assert "keuangan" in result.narasi.lower()


@pytest.mark.asyncio
async def test_persediaan_falls_back_when_ai_client_errors():
    class FailingAIClient:
        async def generate(self, prompt: str) -> str:
            raise RuntimeError("quota exceeded")

    service = BusinessIntelligenceService(ai_client=FailingAIClient())
    payload = PersediaanRequest(persediaan={
        "total_produk": 1,
        "total_stok": 5,
        "nilai_persediaan": 10000,
        "produk_habis": [],
        "produk_hampir_habis": [],
        "fast_moving": [],
        "slow_moving": [],
        "semua_produk": [
            {
                "kode_barang": "A",
                "nama_barang": "Item A",
                "kategori": "Test",
                "stok": 5,
                "stok_minimal": 2,
                "harga_beli": 2000,
                "harga_jual": 3000,
                "nilai_stok": 10000,
                "jumlah_terjual": 4,
                "omzet": 12000,
                "last_sold_date": "2026-07-02",
                "hari_sejak_terjual": 0,
                "kontribusi_persen": 100,
            }
        ],
    })

    result = await service.analyze_persediaan(payload)

    assert result.status
    assert isinstance(result.insight, list)
    assert isinstance(result.rekomendasi, list)
    assert isinstance(result.narasi, str)
    assert "data stok" in result.narasi.lower()
    assert "layanan ai" in result.narasi.lower()
