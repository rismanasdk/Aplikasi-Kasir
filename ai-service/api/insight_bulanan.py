# ai-service/api/insight_bulanan.py
"""4. Insight Bulanan"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import InsightResponse, InsightData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/insight/bulanan", tags=["4. Insight Bulanan"])


@router.get("", response_model=InsightResponse)
async def get_insight_bulanan():
    try:
        s, e = df.get_range_bulan_ini()

        # Bulan lalu
        s_lalu, e_lalu = df.get_range_periode_lalu(bulan=1)

        trx = df.fetch_transaksi_selesai(s, e)
        trx_lalu = df.fetch_transaksi_selesai(s_lalu, e_lalu)

        df_item = az._to_df_transaksi(trx)
        df_trx = az._to_df_transaksi_level(trx)
        df_item_lalu = az._to_df_transaksi(trx_lalu)

        label = s.strftime("%B %Y")
        result = az.analisis_insight(df_item, df_trx, df_item_lalu, "bulanan", label)
        return InsightResponse(data=InsightData(**result))
    except Exception as ex:
        return InsightResponse(success=False, message=str(ex), data=None)