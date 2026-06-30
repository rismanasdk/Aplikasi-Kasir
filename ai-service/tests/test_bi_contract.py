from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from service.insight_service import build_ringkasan


def test_ringkasan_contract_has_frontend_keys():
    payload = build_ringkasan(None, None)

    assert isinstance(payload, dict)
    assert "insight" in payload
    assert "pendapatan" in payload
    assert "laba_bersih_estimasi" in payload
    assert "transaksi" in payload
    assert "target" in payload
    assert "metode_pembayaran" in payload
    assert "top_produk" in payload
    assert "bottom_produk" in payload
