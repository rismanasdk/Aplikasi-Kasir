from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, HTTPException
from models.ml_models import ForecastDaysRequest, MLForecastResponse, ForecastItem
from ml.predictor import ModelPredictor

router = APIRouter(prefix="/api/v1/ml", tags=["machine-learning"])


@router.post("/forecast", response_model=MLForecastResponse)
async def predict_sales_forecast(payload: ForecastDaysRequest) -> MLForecastResponse:
    if payload.days <= 0:
        raise HTTPException(status_code=422, detail="days harus lebih besar dari 0")

    try:
        predictor = ModelPredictor(model_filename="forecast_sales.joblib")
    except FileNotFoundError as exc:
        raise HTTPException(status_code=500, detail="Model forecast_sales.joblib tidak tersedia") from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Gagal memuat model") from exc

    try:
        predictions, confidence, _ = predictor.predict_future(payload.days)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail="Gagal melakukan prediksi") from exc

    today = datetime.now(timezone.utc).date()
    response_items = [
        ForecastItem(
            date=(today + timedelta(days=i + 1)).isoformat(),
            predicted_sales=float(value),
        )
        for i, value in enumerate(predictions)
    ]

    return MLForecastResponse(
        status="success",
        model_name=predictor.model_filename,
        prediction=response_items,
        confidence=confidence,
        generated_at=datetime.now(timezone.utc),
    )
