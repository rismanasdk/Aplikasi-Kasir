from fastapi import APIRouter, HTTPException

from models.bi_models import RingkasanRequest, RingkasanResponse, CashflowRequest, CashflowResponse
from services.bi_service import BusinessIntelligenceService

router = APIRouter(prefix="/api/v1/bi", tags=["business-intelligence"])
service = BusinessIntelligenceService()


@router.post("/ringkasan", response_model=RingkasanResponse)
async def analyze_ringkasan(payload: RingkasanRequest) -> RingkasanResponse:
    try:
        return await service.analyze_ringkasan(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive handling
        raise HTTPException(status_code=500, detail="Internal server error") from exc


@router.post("/cashflow", response_model=CashflowResponse)
async def analyze_cashflow(payload: CashflowRequest) -> CashflowResponse:
    try:
        return await service.analyze_cashflow(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive handling
        raise HTTPException(status_code=500, detail="Internal server error") from exc
