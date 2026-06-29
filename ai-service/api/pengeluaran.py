# ai-service/api/pengeluaran.py
"""7. Analisis Pengeluaran"""
from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import AnalisisPengeluaranResponse, AnalisisPengeluaranData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/pengeluaran", tags=["7. Analisis Pengeluaran"])


@router.get("", response_model=AnalisisPengeluaranResponse)
async def get_analisis_pengeluaran(
    start: str = Query(None, description="YYYY-MM-DD"),
    end: str = Query(None, description="YYYY-MM-DD"),
):
    try:
        if start and end:
            s = datetime.strptime(start, "%Y-%m-%d").replace(tzinfo=TZ)
            e = datetime.strptime(end, "%Y-%m-%d").replace(tzinfo=TZ, hour=23, minute=59, second=59)
        else:
            s, e = df.get_range_bulan_ini()

        # Periode lalu untuk perbandingan
        import datetime as dt_module
        days = (e - s).days + 1
        s_lalu = s - dt_module.timedelta(days=days)
        e_lalu = s - dt_module.timedelta(seconds=1)

        pengeluaran = df.fetch_pengeluaran(s, e)
        pengeluaran_lalu = df.fetch_pengeluaran(s_lalu, e_lalu)

        # Ambil total pendapatan untuk rasio
        trx = df.fetch_transaksi_selesai(s, e)
        df_trx = az._to_df_transaksi_level(trx)
        total_pendapatan = float(df_trx["total_harga"].sum()) if not df_trx.empty else 0

        result = az.analisis_pengeluaran(pengeluaran, total_pendapatan, pengeluaran_lalu)
        result["periode"] = f"{s.strftime('%d %b')} - {e.strftime('%d %b %Y')}"

        return AnalisisPengeluaranResponse(data=AnalisisPengeluaranData(**result))
    except Exception as ex:
        return AnalisisPengeluaranResponse(success=False, message=str(ex), data=None)