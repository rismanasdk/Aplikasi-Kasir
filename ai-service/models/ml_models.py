from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class ForecastDaysRequest(BaseModel):
    days: int = Field(..., description="Number of future days to predict")


class ForecastItem(BaseModel):
    date: str
    predicted_sales: float


class MLForecastResponse(BaseModel):
    status: str
    model_name: str
    prediction: List[ForecastItem]
    confidence: Optional[float] = None
    generated_at: datetime
