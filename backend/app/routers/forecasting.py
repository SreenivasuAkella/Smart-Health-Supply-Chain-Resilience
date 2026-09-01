from fastapi import APIRouter
from ..services.forecasting import get_outbreak_predictions

router = APIRouter(prefix="/api/forecasting", tags=["Predictive Outbreak & Stockout Engine"])

@router.get("/outbreaks")
def fetch_outbreak_predictions():
    return get_outbreak_predictions()
