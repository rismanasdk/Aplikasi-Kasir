# ai-service/api/risiko_cashflow.py
"""9. Deteksi Risiko Cash Flow"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import RisikoCashFlowResponse, RisikoCashFlowData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/risiko-cashflow", tags=["9. Risiko Cash Flow"])


@router.get("", response_model=RisikoCashFlowResponse)
async def get_risiko_cashflow():
    try:
        # Ambil data 30 hari terakhir untuk hitung rata-rata harian
        s = datetime.now(TZ) - timedelta(days=30)
        e = datetime.now(TZ)

        trx = df.fetch_transaksi_selesai(s, e)
        pengeluaran = df.fetch_pengeluaran(s, e)

        df_trx = az._to_df_transaksi_level(trx)
        total_pemasukan = float(df_trx["total_harga"].sum()) if not df_trx.empty else 0
        total_pengeluaran = sum(float(p.get("jumlah", 0)) for p in pengeluaran)
        days = max((e - s).days, 1)

        avg_masuk = total_pemasukan / days
        avg_keluar = total_pengeluaran / days

        modal = df.fetch_modal_utama()
        saldo_kas = float(modal.get("saldo_kas", 0)) if modal else 0

        kewajiban = df.fetch_kewajiban_jatuh_tempo(30)

        result = az.deteksi_risiko_cashflow(saldo_kas, avg_keluar, avg_masuk, kewajiban)
        return RisikoCashFlowResponse(data=RisikoCashFlowData(**result))
    except Exception as ex:
        return RisikoCashFlowResponse(success=False, message=str(ex), data=None)