# ai-service/api/insight_harian.py
"""2. Insight Harian"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import InsightResponse, InsightData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/insight/harian", tags=["2. Insight Harian"])


@router.get("", response_model=InsightResponse)
async def get_insight_harian(
    tanggal: str = Query(None, description="YYYY-MM-DD, default hari ini"),
):
    try:
        if tanggal:
            target = datetime.strptime(tanggal, "%Y-%m-%d").replace(tzinfo=TZ)
        else:
            target = datetime.now(TZ)

        s = target.replace(hour=0, minute=0, second=0, microsecond=0)
        e = target.replace(hour=23, minute=59, second=59, microsecond=999999)

        # Kemarin untuk perbandingan
        s_lalu = s - timedelta(days=1)
        e_lalu = s - timedelta(seconds=1)

        trx = df.fetch_transaksi_selesai(s, e)
        trx_lalu = df.fetch_transaksi_selesai(s_lalu, e_lalu)

        df_item = az._to_df_transaksi(trx)
        df_trx = az._to_df_transaksi_level(trx)
        df_item_lalu = az._to_df_transaksi(trx_lalu)

        result = az.analisis_insight(df_item, df_trx, df_item_lalu, "harian", target.strftime("%d %B %Y"))
        return InsightResponse(data=InsightData(**result))
    except Exception as ex:
        return InsightResponse(success=False, message=str(ex), data=None)