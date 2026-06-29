# ai-service/api/ringkasan.py
"""1. Ringkasan Bisnis Otomatis"""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import RingkasanResponse, RingkasanData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/ringkasan", tags=["1. Ringkasan Bisnis"])


@router.get("", response_model=RingkasanResponse)
async def get_ringkasan(
    start: str = Query(None, description="YYYY-MM-DD"),
    end: str = Query(None, description="YYYY-MM-DD"),
):
    try:
        settings = df.fetch_settings()
        target = float(settings.get("targetOmzetBulanan", 0))

        # Default: bulan ini
        if start and end:
            s = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=TZ)
            e = datetime.strptime(end, "%Y-%m-%d").replace(tzinfo=TZ, hour=23, minute=59, second=59)
        else:
            s, e = df.get_range_bulan_ini()

        # Periode lalu untuk perbandingan
        days_this = (e - s).days + 1
        s_lalu = s - __import__("datetime").timedelta(days=days_this)
        e_lalu = s - __import__("datetime").timedelta(seconds=1)

        trx = df.fetch_transaksi_selesai(s, e)
        trx_lalu = df.fetch_transaksi_selesai(s_lalu, e_lalu)
        pengeluaran = df.fetch_pengeluaran(s, e)
        total_pengeluaran = sum(float(p.get("jumlah", 0)) for p in pengeluaran)

        df_item = az._to_df_transaksi(trx)
        df_trx = az._to_df_transaksi_level(trx)
        df_item_lalu = az._to_df_transaksi(trx_lalu)
        total_pendapatan_lalu = float(df_item_lalu["subtotal"].sum()) if not df_item_lalu.empty else 0

        result = az.analisis_ringkasan(df_item, df_trx, total_pengeluaran, target, total_pendapatan_lalu)
        result["periode"] = f"{s.strftime('%d %b')} - {e.strftime('%d %b %Y')}"

        return RingkasanResponse(data=RingkasanData(**result))
    except Exception as ex:
        return RingkasanResponse(success=False, message=str(ex), data=None)