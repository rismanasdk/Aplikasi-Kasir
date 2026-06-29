# ai-service/api/cashflow.py
"""6. Analisis Cash Flow"""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import CashFlowResponse, CashFlowData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/cashflow", tags=["6. Analisis Cash Flow"])


@router.get("", response_model=CashFlowResponse)
async def get_cashflow(
    start: str = Query(None, description="YYYY-MM-DD"),
    end: str = Query(None, description="YYYY-MM-DD"),
):
    try:
        if start and end:
            s = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=TZ)
            e = datetime.strptime(end, "%Y-%m-%d").replace(tzinfo=TZ, hour=23, minute=59, second=59)
        else:
            s, e = df.get_range_bulan_ini()

        trx = df.fetch_transaksi_selesai(s, e)
        pengeluaran = df.fetch_pengeluaran(s, e)
        riwayat = df.fetch_riwayat_modal(s, e)
        modal = df.fetch_modal_utama()
        saldo_kas = float(modal.get("saldo_kas", 0)) if modal else 0

        df_trx = az._to_df_transaksi_level(trx)
        result = az.analisis_cashflow(df_trx, pengeluaran, riwayat, saldo_kas)
        result["periode"] = f"{s.strftime('%d %b')} - {e.strftime('%d %b %Y')}"

        return CashFlowResponse(data=CashFlowData(**result))
    except Exception as ex:
        return CashFlowResponse(success=False, message=str(ex), data=None)