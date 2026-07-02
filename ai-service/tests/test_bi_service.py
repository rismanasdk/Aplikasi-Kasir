import pytest

from services.bi_service import BusinessIntelligenceService
from models.bi_models import RingkasanRequest


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
