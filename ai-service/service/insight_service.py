from service.data_fetcher import (
    fetch_bahan_baku,
    fetch_barang,
    fetch_kewajiban,
    fetch_modal_utama,
    fetch_pengeluaran,
    fetch_settings,
    fetch_transactions,
    get_period,
)
from service.analyzer import build_ringkasan_payload


def build_ringkasan(start: str | None = None, end: str | None = None) -> dict:
    start_date, end_date = get_period(start, end)

    transactions = fetch_transactions(start_date, end_date)
    pengeluaran = fetch_pengeluaran(start_date, end_date)
    settings = fetch_settings() or {}
    modal = fetch_modal_utama() or {}
    barang = fetch_barang()
    bahan_baku = fetch_bahan_baku()
    kewajiban = fetch_kewajiban()

    return build_ringkasan_payload(
        start=start_date,
        end=end_date,
        transactions=transactions,
        pengeluaran=pengeluaran,
        settings=settings,
        modal=modal,
        barang=barang,
        bahan_baku=bahan_baku,
        kewajiban=kewajiban,
    )
