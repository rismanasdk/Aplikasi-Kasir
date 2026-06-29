# ai-service/api/anomali.py
"""8. Deteksi Anomali Transaksi"""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import AnomaliResponse, AnomaliData
import config

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/anomali", tags=["8. Deteksi Anomali"])


@router.get("", response_model=AnomaliResponse)
async def get_anomali(
    start: str = Query(None, description="YYYY-MM-DD"),
    end: str = Query(None, description="YYYY-MM-DD"),
):
    try:
        if start and end:
            s = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=TZ)
            e = datetime.strptime(end, "%Y-%m-%d").replace(tzinfo=TZ, hour=23, minute=59, second=59)
        else:
            # Default: 30 hari terakhir
            s = datetime.now(TZ) - __import__("datetime").timedelta(days=30)
            e = datetime.now(TZ)

        trx = df.fetch_transaksi(s, e)  # Semua status untuk deteksi
        df_trx = az._to_df_transaksi_level(trx)

        result = az.deteksi_anomali(df_trx, threshold_z=config.ANOMALI_ZSCORE_THRESHOLD)
        result["periode"] = f"{s.strftime('%d %b')} - {e.strftime('%d %b %Y')}"

        return AnomaliResponse(data=AnomaliData(**result))
    except Exception as ex:
        return AnomaliResponse(success=False, message=str(ex), data=None)