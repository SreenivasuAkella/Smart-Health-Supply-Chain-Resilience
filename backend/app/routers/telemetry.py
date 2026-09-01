from fastapi import APIRouter
from ..services.cold_chain import get_live_telemetry_stream

router = APIRouter(tags=["Cold Chain IoT Telemetry"])

@router.get("/api/telemetry/cold-chain-stream")
@router.get("/api/telemetry/live-stream")
@router.get("/api/telemetry/stream")
def get_telemetry():
    return get_live_telemetry_stream()
