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
    telemetry, bed occupancy, inventory alerts, stockout alerts, and auto-reallocation events.
    """
    yield f"event: connected\ndata: {json.dumps({'status': 'CONNECTED', 'timestamp': datetime.utcnow().isoformat() + 'Z'})}\n\n"

    last_stockout_alert_time = 0.0
    last_reallocation_time = 0.0
    ALERT_COOLDOWN_SECONDS = 90.0
    REALLOCATION_COOLDOWN_SECONDS = 300.0

    while True:
        if await request.is_disconnected():
            break

        try:
            now_ts = datetime.utcnow().timestamp()

            # 1. Cold-Chain IoT Telemetry
            telemetry = get_live_telemetry_stream()
            telemetry_payload = {
                "active_sensors_count": telemetry.get("active_sensors_count", 6),
                "critical_excursions": telemetry.get("critical_excursions", 0),
                "sensors": telemetry.get("sensors", []),
                "alerts": telemetry.get("alerts", []),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            yield f"event: telemetry\ndata: {json.dumps(telemetry_payload)}\n\n"

            # 2. Bed & Staff Telemetry Heartbeat
            facilities = get_active_public_facilities()
            total_beds = sum(f.get("bedCapacity", 0) for f in facilities) or 300
            occupied_beds = sum(f.get("bedsOccupied", 0) for f in facilities) or 210
            doctors_duty = sum(f.get("doctorsOnDuty", 0) for f in facilities) or 12
            doctors_total = sum(f.get("doctorsTotal", 0) for f in facilities) or 15
            avg_duty_adherence = round(
                sum(f.get("duty_adherence_pct", 70) for f in facilities) / max(1, len(facilities)), 1
            )

            stats_payload = {
                "totalBeds": total_beds,
                "occupiedBeds": occupied_beds,
                "occupancyPct": round((occupied_beds / max(1, total_beds)) * 100, 1),
                "doctorsOnDuty": doctors_duty,
                "doctorsTotal": doctors_total,
                "avgDutyAdherencePct": avg_duty_adherence,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            yield f"event: stats\ndata: {json.dumps(stats_payload)}\n\n"

            # 3. Stockout Alerts — rate-limited to avoid notification spamming
            critical_phcs = [
                f for f in facilities
                if f.get("status") == "Critical Deficit" and f.get("type") == "Primary Health Centre"
            ]
            if critical_phcs and (now_ts - last_stockout_alert_time >= ALERT_COOLDOWN_SECONDS):
                cycle_idx = int(now_ts / ALERT_COOLDOWN_SECONDS) % len(critical_phcs)
                alert_fac = critical_phcs[cycle_idx]

                # Identify the specific medication with low stock at this facility
                medicines = generate_public_modeled_inventory({}, facilities)
                target_med = None
                for med in medicines:
                    stock = med.get("inventoryByFacility", {}).get(alert_fac.get("id"), 0)
                    if stock <= 5:
                        target_med = med
                        break
                if not target_med and medicines:
                    target_med = medicines[0]

                stockout_payload = {
                    "facility_id": alert_fac.get("id"),
                    "facility_name": alert_fac.get("name"),
                    "district": alert_fac.get("district"),
                    "state": alert_fac.get("state"),
                    "medicine_id": target_med.get("id") if target_med else "MED-ASV-001",
                    "medicine_name": target_med.get("name") if target_med else "Anti-Snake Venom (ASV)",
                    "medicine_days_of_supply": alert_fac.get("medicine_days_of_supply"),
                    "status": alert_fac.get("status"),
                    "dataSource": alert_fac.get("dataSource"),
                    "alert_type": "STOCKOUT_IMMINENT",
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
                yield f"event: stockout_alert\ndata: {json.dumps(stockout_payload)}\n\n"
                last_stockout_alert_time = now_ts

                # Auto-trigger reallocation at most once every 5 minutes
                if (now_ts - last_reallocation_time >= REALLOCATION_COOLDOWN_SECONDS):
                    try:
                        from ..services.ai_agents_service import run_auto_relocation_pipeline
                        plan = run_auto_relocation_pipeline(
                            target_facility_id=alert_fac.get("id"),
                            medicine_id=target_med.get("id") if target_med else None,
                            auto_triggered=True
                        )
                        if plan and plan.get("selected_donor"):
                            yield f"event: reallocation\ndata: {json.dumps(plan)}\n\n"
                            last_reallocation_time = now_ts
                    except Exception:
                        pass

            # 4. Heartbeat ping
            yield f"event: ping\ndata: {json.dumps({'ping': 'alive', 'time': datetime.utcnow().isoformat() + 'Z'})}\n\n"

        except Exception as e:
            yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

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
