from fastapi import APIRouter
from ..services.cold_chain import get_live_telemetry_stream

router = APIRouter(prefix="/api/telemetry", tags=["Cold Chain IoT Telemetry"])

@router.get("/live-stream")
def get_telemetry():
    return get_live_telemetry_stream()
