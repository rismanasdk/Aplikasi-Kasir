# ai-service/api/analisis_penurunan.py
"""5. Analisis Penyebab Penjualan Turun"""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import AnalisisPenurunanResponse, AnalisisPenurunanData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/analisis-penurunan", tags=["5. Analisis Penurunan Penjualan"])


@router.get("", response_model=AnalisisPenurunanResponse)
async def get_analisis_penurunan(
    start: str = Query(None, description="YYYY-MM-DD periode ini"),
    end: str = Query(None, description="YYYY-MM-DD periode ini"),
):
    try:
        # Default: bulan ini vs bulan lalu
        if start and end:
            s = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=TZ)
            e = datetime.strptime(end, "%Y-%m-%d").replace(tzinfo=TZ, hour=23, minute=59, second=59)
        else:
            s, e = df.get_range_bulan_ini()

        # Periode sebelumnya (same length)
        import datetime as dt_module
        days = (e - s).days + 1
        s_lalu = s - dt_module.timedelta(days=days)
        e_lalu = s - dt_module.timedelta(seconds=1)

        trx = df.fetch_transaksi_selesai(s, e)
        trx_lalu = df.fetch_transaksi_selesai(s_lalu, e_lalu)

        df_item = az._to_df_transaksi(trx)
        df_trx = az._to_df_transaksi_level(trx)
        df_item_lalu = az._to_df_transaksi(trx_lalu)
        df_trx_lalu = az._to_df_transaksi_level(trx_lalu)

        result = az.analisis_penurunan(df_item, df_item_lalu, df_trx, df_trx_lalu)
        return AnalisisPenurunanResponse(data=AnalisisPenurunanData(**result))
    except Exception as ex:
        return AnalisisPenurunanResponse(success=False, message=str(ex), data=None)