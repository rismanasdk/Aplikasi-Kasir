from fastapi import APIRouter, HTTPException, Request
import logging
import json

from models.bi_models import RingkasanRequest, RingkasanResponse, CashflowRequest, CashflowResponse
from services.bi_service import BusinessIntelligenceService
from models.bi_models import ProdukRequest, ProdukResponse
from pydantic import ValidationError

logger = logging.getLogger(__name__)
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


@router.post("/produk", response_model=ProdukResponse)
async def analyze_produk(request: Request):
    # First, manually parse and validate to get better error messages
    try:
        body = await request.json()
        logger.debug(f"Raw request body keys: {list(body.keys()) if isinstance(body, dict) else 'not a dict'}")
        
        # Try to validate
        payload = ProdukRequest(**body)
        logger.debug(f"✓ Pydantic validation passed")
        
    except ValidationError as e:
        logger.error(f"Pydantic ValidationError: {e.error_count()} errors")
        for error in e.errors():
            loc_path = " → ".join(str(x) for x in error['loc'])
            logger.error(f"  - {loc_path}: {error['msg']} (type: {error.get('type', 'unknown')})")
        raise HTTPException(status_code=422, detail=[
            {
                "loc": error["loc"],
                "msg": error["msg"],
                "type": error.get("type", "unknown")
            } for error in e.errors()
        ]) from e
    except Exception as e:
        logger.error(f"Error parsing request: {e}")
        raise HTTPException(status_code=422, detail=str(e)) from e
    
    # Now process with the validated payload
    try:
        produk_data = payload.produk
        logger.debug(f"Produk data - total: {produk_data.total_produk}, aktif: {produk_data.produk_aktif}, top_selling: {len(produk_data.top_selling)}")
        return await service.analyze_produk(payload)
    except ValueError as exc:
        logger.error(f"ValueError in analyze_produk: {exc}")
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover - defensive handling
        logger.error(f"Unexpected error in analyze_produk: {exc}", exc_info=True)
        raise HTTPException(status_code=500, detail="Internal server error") from exc
