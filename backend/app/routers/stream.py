import asyncio
import json
import random
from datetime import datetime
from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse
from ..services.cold_chain import get_live_telemetry_stream
from ..services.facility_data_service import get_active_public_facilities
from ..services.medicine_data_service import generate_public_modeled_inventory
from ..services.firebase_service import firebase_service

router = APIRouter(prefix="/api/stream", tags=["Server-Sent Events (SSE)"])

async def event_generator(request: Request):
    """
    Asynchronous Server-Sent Events (SSE) generator streaming real-time
    telemetry, bed occupancy, inventory alerts, and public health telemetry.
    """
    # Send initial connection confirmation
    yield f"event: connected\ndata: {json.dumps({'status': 'CONNECTED', 'timestamp': datetime.utcnow().isoformat() + 'Z'})}\n\n"

    while True:
        # Check if client disconnected
        if await request.is_disconnected():
            break

        try:
            # 1. Stream Cold-Chain IoT Telemetry
            telemetry = get_live_telemetry_stream()
            telemetry_payload = {
                "active_sensors_count": telemetry.get("active_sensors_count", 6),
                "critical_excursions": telemetry.get("critical_excursions", 0),
                "sensors": telemetry.get("sensors", []),
                "alerts": telemetry.get("alerts", []),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            yield f"event: telemetry\ndata: {json.dumps(telemetry_payload)}\n\n"

            # 2. Occasional Bed & Staff Telemetry Heartbeat (every 2 cycles)
            facilities = get_active_public_facilities()
            total_beds = sum(f.get("bedCapacity", 0) for f in facilities) or 300
            occupied_beds = sum(f.get("bedsOccupied", 0) for f in facilities) or 210
            doctors_duty = sum(f.get("doctorsOnDuty", 0) for f in facilities) or 12
            doctors_total = sum(f.get("doctorsTotal", 0) for f in facilities) or 15

            stats_payload = {
                "totalBeds": total_beds,
                "occupiedBeds": occupied_beds,
                "occupancyPct": round((occupied_beds / max(1, total_beds)) * 100, 1),
                "doctorsOnDuty": doctors_duty,
                "doctorsTotal": doctors_total,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            yield f"event: stats\ndata: {json.dumps(stats_payload)}\n\n"

            # 3. Heartbeat ping
            yield f"event: ping\ndata: {json.dumps({'ping': 'alive', 'time': datetime.utcnow().isoformat() + 'Z'})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

        # Push updates every 3.5 seconds
        await asyncio.sleep(3.5)


@router.get("/events")
async def sse_live_stream(request: Request):
    """
    Standard Server-Sent Events (SSE) HTTP endpoint for persistent live data streaming.
    Accepts browser EventSource connections.
    """
    return StreamingResponse(
        event_generator(request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
            "Access-Control-Allow-Origin": "*"
        }
    )
