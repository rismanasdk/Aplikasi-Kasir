# ai-service/api/rekomendasi.py
"""10. Rekomendasi Bisnis Otomatis"""
from datetime import datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import Query, APIRouter
from service import data_fetcher as df
from service import analyzer as az
from models.schemas import RekomendasiResponse, RekomendasiData

TZ = ZoneInfo("Asia/Jakarta")
router = APIRouter(prefix="/rekomendasi", tags=["10. Rekomendasi Bisnis"])


@router.get("", response_model=RekomendasiResponse)
async def get_rekomendasi():
    try:
        # Ambil data bulan ini
        s, e = df.get_range_bulan_ini()

        trx = df.fetch_transaksi_selesai(s, e)
        pengeluaran = df.fetch_pengeluaran(s, e)
        barang = df.fetch_barang_all()
        modal = df.fetch_modal_utama()
        kewajiban = df.fetch_kewajiban_aktif()

        df_item = az._to_df_transaksi(trx)
        df_trx = az._to_df_transaksi_level(trx)
        total_pengeluaran = sum(float(p.get("jumlah", 0)) for p in pengeluaran)
        total_pendapatan = float(df_trx["total_harga"].sum()) if not df_trx.empty else 0
        saldo_kas = float(modal.get("saldo_kas", 0)) if modal else 0

        result = az.generate_rekomendasi(
            df_item, df_trx, barang, saldo_kas,
            total_pengeluaran, total_pendapatan, kewajiban,
        )
        return RekomendasiResponse(data=RekomendasiData(**result))
    except Exception as ex:
        return RekomendasiResponse(success=False, message=str(ex), data=None)