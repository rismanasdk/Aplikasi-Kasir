# ai-service/api/insight_mingguan.py
"""3. Insight Mingguan"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import InsightResponse, InsightData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/insight/mingguan", tags=["3. Insight Mingguan"])


@router.get("", response_model=InsightResponse)
async def get_insight_mingguan():
    try:
        s, e = df.get_range_minggu_ini()
        s_lalu = s - timedelta(days=7)
        e_lalu = s - timedelta(seconds=1)

        trx = df.fetch_transaksi_selesai(s, e)
        trx_lalu = df.fetch_transaksi_selesai(s_lalu, e_lalu)

        df_item = az._to_df_transaksi(trx)
        df_trx = az._to_df_transaksi_level(trx)
        df_item_lalu = az._to_df_transaksi(trx_lalu)

        label = f"{s.strftime('%d %b')} - {e.strftime('%d %b %Y')}"
        result = az.analisis_insight(df_item, df_trx, df_item_lalu, "mingguan", label)
        return InsightResponse(data=InsightData(**result))
    except Exception as ex:
        return InsightResponse(success=False, message=str(ex), data=None)