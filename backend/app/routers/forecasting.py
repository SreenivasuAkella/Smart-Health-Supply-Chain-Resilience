from fastapi import APIRouter
from typing import Optional
from ..services.forecasting import get_outbreak_predictions

router = APIRouter(tags=["Predictive Outbreak & Stockout Engine"])

@router.get("/api/forecasting/outbreak-risk")
@router.get("/api/forecasting/outbreaks")
@router.get("/api/forecasting/predict")
def fetch_outbreak_predictions(facility_id: Optional[str] = None):
    return get_outbreak_predictions()
