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

    while True:
        if await request.is_disconnected():
            break

        try:
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

            # 3. Stockout Alerts — rotate through Critical Deficit PHCs
            critical_phcs = [
                f for f in facilities
                if f.get("status") == "Critical Deficit" and f.get("type") == "Primary Health Centre"
            ]
            if critical_phcs:
                cycle_idx = int(datetime.utcnow().timestamp() / 3.5) % max(1, len(critical_phcs))
                alert_fac = critical_phcs[cycle_idx % len(critical_phcs)]
                stockout_payload = {
                    "facility_id": alert_fac.get("id"),
                    "facility_name": alert_fac.get("name"),
                    "district": alert_fac.get("district"),
                    "state": alert_fac.get("state"),
                    "medicine_days_of_supply": alert_fac.get("medicine_days_of_supply"),
                    "status": alert_fac.get("status"),
                    "dataSource": alert_fac.get("dataSource"),
                    "alert_type": "STOCKOUT_IMMINENT",
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
                yield f"event: stockout_alert\ndata: {json.dumps(stockout_payload)}\n\n"

                # M3: Auto-trigger cross-district reallocation for the most critical PHC every 35s
                auto_trigger_slot = int(datetime.utcnow().timestamp() / 35)
                if auto_trigger_slot % 2 == 0 and critical_phcs:
                    try:
                        from ..services.reallocation import generate_reallocation_plan
                        from ..services.medicine_data_service import get_active_essential_medicines
                        top_phc = critical_phcs[0]
                        drugs = get_active_essential_medicines()
                        if drugs:
                            plan_response = generate_reallocation_plan(
                                target_facility_id=top_phc["id"],
                                medicine_id=drugs[0]["id"],
                                required_quantity=25
                            )
                            plan = plan_response.get("data", plan_response) if isinstance(plan_response, dict) else {}
                            if plan.get("selected_donor"):
                                reallocation_event = {
                                    "dispatch_id": plan.get("dispatch_id"),
                                    "target_facility": plan.get("target_facility", {}).get("name"),
                                    "donor_facility": plan.get("selected_donor", {}).get("facility_name"),
                                    "medicine": plan.get("medicine_details", {}).get("name"),
                                    "distance_km": plan.get("selected_donor", {}).get("distance_km"),
                                    "eta_minutes": plan.get("selected_donor", {}).get("estimated_transit_minutes"),
                                    "auto_triggered": True,
                                    "timestamp": datetime.utcnow().isoformat() + "Z"
                                }
                                yield f"event: reallocation\ndata: {json.dumps(reallocation_event)}\n\n"
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
