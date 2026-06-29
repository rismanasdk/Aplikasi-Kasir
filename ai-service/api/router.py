# ai-service/api/router.py
"""
Central router. Menggabungkan semua sub-router BI.
"""
from fastapi import APIRouter

from api.ringkasan import router as ringkasan_router
from api.insight_harian import router as insight_harian_router
from api.insight_mingguan import router as insight_mingguan_router
from api.insight_bulanan import router as insight_bulanan_router
from api.analisis_penurunan import router as penurunan_router
from api.cashflow import router as cashflow_router
from api.pengeluaran import router as pengeluaran_router
from api.anomali import router as anomali_router
from api.risiko_cashflow import router as risiko_router
from api.rekomendasi import router as rekomendasi_router

bi_router = APIRouter()

bi_router.include_router(ringkasan_router)
bi_router.include_router(insight_harian_router)
bi_router.include_router(insight_mingguan_router)
bi_router.include_router(insight_bulanan_router)
bi_router.include_router(penurunan_router)
bi_router.include_router(cashflow_router)
bi_router.include_router(pengeluaran_router)
bi_router.include_router(anomali_router)
bi_router.include_router(risiko_router)
bi_router.include_router(rekomendasi_router)