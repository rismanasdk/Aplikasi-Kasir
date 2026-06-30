from typing import Optional

from fastapi import APIRouter, Query

from service.insight_service import build_ringkasan

router = APIRouter()


@router.get("/ringkasan")
async def get_ringkasan(start: Optional[str] = Query(None), end: Optional[str] = Query(None)):
    """Hitung ringkasan BI untuk rentang tanggal yang diminta."""
    payload = build_ringkasan(start, end)
    return payload
